import { findComposer, OWN_UI_ATTRIBUTE, type Composer } from './composer';
import { formatTimestamp } from './format';
import { parseConversationPath, type ConversationRef } from './route';
import { getSavedComment, setSavedComment, watchSavedComments, type SavedComment } from './storage';
import { replaceTextareaValue } from './text-field';
import { extractConversationTitle } from './title';

export interface CommentSaverOptions {
  document?: Document;
  /** Stops the saver and removes its buttons when aborted. */
  signal?: AbortSignal;
  confirm?: (message: string) => boolean;
  now?: () => number;
  feedbackDurationMs?: number;
}

export interface CommentSaver {
  /** Re-evaluates the page right away instead of waiting for the next DOM change. */
  sync(): void;
}

type Action = 'save' | 'load';

const ACTION_ATTRIBUTE = 'data-ghj-action';
const LABELS: Record<Action, string> = { save: 'Save', load: 'Load' };

/**
 * Adds Save and Load buttons next to the Comment button of the new-comment composer
 * on issue and pull request pages, and keeps them in sync while GitHub re-renders
 * the page or navigates without a full reload.
 */
export function startCommentSaver(options: CommentSaverOptions = {}): CommentSaver {
  const doc = options.document ?? document;
  const win = doc.defaultView ?? window;
  const confirmAction = options.confirm ?? ((message: string) => win.confirm(message));
  const now = options.now ?? Date.now;
  const feedbackDurationMs = options.feedbackDurationMs ?? 1500;
  const { signal } = options;

  if (signal?.aborted) return { sync() {} };

  let current: ConversationRef | null = null;
  // `undefined` while the saved comment for `current` is still being read.
  let saved: SavedComment | null | undefined;
  let busy = false;
  let syncScheduled = false;
  const feedbackTimers = new Map<HTMLButtonElement, number>();

  function sync(): void {
    if (signal?.aborted) return;

    const next = parseConversationPath(win.location.pathname);
    if (next?.key !== current?.key) {
      current = next;
      saved = undefined;
      if (next) void refreshSaved(next.key);
    }

    const composer = current ? findComposer(doc) : null;
    const group = composer ? ensureGroup(composer) : null;
    for (const node of doc.querySelectorAll(`[${OWN_UI_ATTRIBUTE}]`)) {
      if (node !== group) node.remove();
    }
    if (group && composer) render(group, composer);
  }

  function scheduleSync(): void {
    if (syncScheduled || signal?.aborted) return;
    syncScheduled = true;
    const run = () => {
      syncScheduled = false;
      sync();
    };
    if (typeof win.requestAnimationFrame === 'function') {
      win.requestAnimationFrame(run);
    } else {
      win.setTimeout(run, 16);
    }
  }

  async function refreshSaved(key: string): Promise<void> {
    let comment: SavedComment | null = null;
    try {
      comment = await getSavedComment(key);
    } catch (error) {
      console.error('[ghjournal] Failed to read the saved comment', error);
    }
    if (current?.key !== key) return;
    saved = comment;
    scheduleSync();
  }

  function ensureGroup({ commentButton }: Composer): HTMLElement {
    const previous = commentButton.previousElementSibling;
    if (previous instanceof win.HTMLElement && previous.hasAttribute(OWN_UI_ATTRIBUTE)) {
      return previous;
    }

    const group = doc.createElement('span');
    group.className = 'ghj-actions';
    group.setAttribute(OWN_UI_ATTRIBUTE, '');
    group.append(createButton('load'), createButton('save'));
    commentButton.before(group);
    if (!providesGap(group.parentElement)) group.classList.add('ghj-actions--spaced');
    return group;
  }

  function providesGap(container: Element | null): boolean {
    if (!container) return false;
    const style = win.getComputedStyle(container);
    return /flex|grid/.test(style.display) && Number.parseFloat(style.columnGap) > 0;
  }

  function createButton(action: Action): HTMLButtonElement {
    const button = doc.createElement('button');
    // Without an explicit type, a button inside the PR comment <form> would submit it.
    button.type = 'button';
    button.className = 'ghj-button';
    button.setAttribute(ACTION_ATTRIBUTE, action);
    button.textContent = LABELS[action];
    button.addEventListener('click', () => {
      void (action === 'save' ? handleSave(button) : handleLoad(button));
    });
    return button;
  }

  function render(group: HTMLElement, composer: Composer): void {
    const saveButton = group.querySelector<HTMLButtonElement>(`[${ACTION_ATTRIBUTE}="save"]`);
    const loadButton = group.querySelector<HTMLButtonElement>(`[${ACTION_ATTRIBUTE}="load"]`);
    if (!saveButton || !loadButton) return;

    const hasText = composer.textarea.value.trim() !== '';
    setButtonState(
      saveButton,
      !hasText,
      hasText ? 'Save this comment in your browser' : 'Type a comment to save it',
    );
    setButtonState(
      loadButton,
      !saved,
      saved
        ? `Restore the comment saved on ${formatTimestamp(saved.savedAt)}`
        : 'No saved comment for this page',
    );
  }

  function setButtonState(button: HTMLButtonElement, disabled: boolean, title: string): void {
    if (button.disabled !== disabled) button.disabled = disabled;
    if (button.title !== title) button.title = title;
  }

  function resolveTarget(): { ref: ConversationRef; composer: Composer } | null {
    if (signal?.aborted) return null;
    const ref = parseConversationPath(win.location.pathname);
    const composer = ref ? findComposer(doc) : null;
    return ref && composer ? { ref, composer } : null;
  }

  async function handleSave(button: HTMLButtonElement): Promise<void> {
    const target = resolveTarget();
    if (!target || busy) return;
    const { ref, composer } = target;
    const body = composer.textarea.value;
    if (body.trim() === '') return;
    // Read the title now: GitHub may navigate to another conversation while storage is busy.
    const title = extractConversationTitle(doc.title, ref);

    busy = true;
    try {
      const existing = await getSavedComment(ref.key);
      if (
        existing &&
        existing.body !== body &&
        !confirmAction(`Overwrite the comment saved on ${formatTimestamp(existing.savedAt)}?`)
      ) {
        return;
      }
      const comment: SavedComment = { body, savedAt: now(), url: ref.url, title, kind: ref.kind };
      await setSavedComment(ref.key, comment);
      if (current?.key === ref.key) saved = comment;
      showFeedback(button, 'Saved ✓');
    } catch (error) {
      reportFailure('save', button, error);
    } finally {
      busy = false;
      scheduleSync();
    }
  }

  async function handleLoad(button: HTMLButtonElement): Promise<void> {
    const target = resolveTarget();
    if (!target || busy) return;
    const { ref } = target;

    busy = true;
    try {
      const comment = await getSavedComment(ref.key);
      if (current?.key === ref.key) saved = comment;
      if (!comment) return;

      // While storage was being read, GitHub may have navigated elsewhere or re-rendered
      // the composer, and the saver may have been stopped. Only write into the live
      // composer of the conversation the draft belongs to.
      const latest = resolveTarget();
      if (!latest || latest.ref.key !== ref.key) return;
      const { textarea } = latest.composer;
      const text = textarea.value;
      if (text !== comment.body) {
        if (
          text.trim() !== '' &&
          !confirmAction('Replace the text in the comment box with the saved comment?')
        ) {
          return;
        }
        replaceTextareaValue(textarea, comment.body);
      }
      showFeedback(button, 'Loaded ✓');
    } catch (error) {
      reportFailure('load', button, error);
    } finally {
      busy = false;
      scheduleSync();
    }
  }

  function showFeedback(button: HTMLButtonElement, text: string): void {
    const action = button.getAttribute(ACTION_ATTRIBUTE) as Action;
    button.textContent = text;
    win.clearTimeout(feedbackTimers.get(button));
    feedbackTimers.set(
      button,
      win.setTimeout(() => {
        button.textContent = LABELS[action];
        feedbackTimers.delete(button);
      }, feedbackDurationMs),
    );
  }

  function reportFailure(action: Action, button: HTMLButtonElement, error: unknown): void {
    console.error(`[ghjournal] Failed to ${action} the comment`, error);
    // Happens in tabs that were open while the extension was reloaded or updated.
    const invalidated = String(error).includes('Extension context invalidated');
    showFeedback(button, invalidated ? 'Reload page' : action === 'save' ? 'Save failed' : 'Load failed');
  }

  function isOwnNode(node: Node): boolean {
    const element = node.nodeType === 1 ? (node as Element) : node.parentElement;
    return element?.closest(`[${OWN_UI_ATTRIBUTE}]`) != null;
  }

  const observer = new win.MutationObserver((records) => {
    if (records.some((record) => !isOwnNode(record.target))) scheduleSync();
  });
  // GitHub toggles its Comment button when the text changes, which also catches
  // programmatic edits (such as quote replies) that fire no input event.
  observer.observe(doc.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-disabled', 'disabled'],
  });

  doc.addEventListener(
    'input',
    (event) => {
      if ((event.target as Element | null)?.tagName === 'TEXTAREA') scheduleSync();
    },
    { capture: true, signal },
  );

  const stopWatching = watchSavedComments((key, comment) => {
    if (current?.key !== key) return;
    saved = comment;
    scheduleSync();
  });

  signal?.addEventListener(
    'abort',
    () => {
      observer.disconnect();
      stopWatching();
      for (const timer of feedbackTimers.values()) win.clearTimeout(timer);
      for (const node of doc.querySelectorAll(`[${OWN_UI_ATTRIBUTE}]`)) node.remove();
    },
    { once: true },
  );

  sync();
  return { sync };
}
