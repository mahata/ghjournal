import { formatTimestamp } from './format';
import { parseConversationPath } from './route';
import { listSavedComments, removeSavedComment, type SavedCommentEntry } from './storage';

export interface PopupOptions {
  list?: () => Promise<SavedCommentEntry[]>;
  remove?: (key: string) => Promise<void>;
  /** How long the Delete button waits for the confirming second click. */
  confirmTimeoutMs?: number;
}

const PREVIEW_LENGTH = 200;

export async function renderPopup(container: HTMLElement, options: PopupOptions = {}): Promise<void> {
  const list = options.list ?? listSavedComments;
  const remove = options.remove ?? removeSavedComment;
  const confirmTimeoutMs = options.confirmTimeoutMs ?? 3000;
  const doc = container.ownerDocument;
  const win = doc.defaultView ?? window;

  const heading = element('h1', 'popup-title', 'Saved comments');
  const count = element('span', 'popup-count');
  const header = element('header', 'popup-header');
  header.append(heading, count);

  const entriesList = element('ul', 'entries');
  const emptyState = element(
    'p',
    'empty',
    'No saved comments yet. Use the Save button next to Comment on a GitHub issue or pull request.',
  );

  let entries: SavedCommentEntry[];
  try {
    entries = await list();
  } catch (error) {
    console.error('[ghjournal] Failed to list saved comments', error);
    container.replaceChildren(header, element('p', 'empty', 'Could not read saved comments.'));
    return;
  }

  for (const entry of entries) entriesList.append(renderEntry(entry));
  container.replaceChildren(header, entriesList, emptyState);
  updateCount();

  function updateCount(): void {
    const total = entriesList.children.length;
    count.textContent = String(total);
    entriesList.hidden = total === 0;
    emptyState.hidden = total !== 0;
  }

  function renderEntry(entry: SavedCommentEntry): HTMLLIElement {
    const ref = parseConversationPath(safePathname(entry.url));
    const reference = ref ? `${ref.owner}/${ref.repo}#${ref.number}` : entry.key;

    const item = element('li', 'entry');
    item.dataset.key = entry.key;

    const link = element('a', 'entry-link');
    link.href = entry.url;
    link.target = '_blank';
    link.rel = 'noreferrer';

    const time = element('time', 'entry-time', formatTimestamp(entry.savedAt));
    time.dateTime = new Date(entry.savedAt).toISOString();
    const meta = element('span', 'entry-meta');
    meta.append(
      element('span', 'entry-kind', entry.kind === 'issue' ? 'Issue' : 'PR'),
      element('span', 'entry-ref', reference),
      time,
    );

    link.append(
      element('span', 'entry-title', entry.title),
      meta,
      element('span', 'entry-preview', preview(entry.body)),
    );

    const deleteButton = element('button', 'entry-delete', 'Delete');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', `Delete the saved comment for ${reference}`);
    let resetTimer: number | undefined;

    const resetDeleteButton = () => {
      win.clearTimeout(resetTimer);
      deleteButton.classList.remove('is-confirming');
      deleteButton.textContent = 'Delete';
      deleteButton.setAttribute('aria-label', `Delete the saved comment for ${reference}`);
    };

    deleteButton.addEventListener('click', async () => {
      if (!deleteButton.classList.contains('is-confirming')) {
        deleteButton.classList.add('is-confirming');
        deleteButton.textContent = 'Confirm';
        deleteButton.setAttribute('aria-label', `Confirm deleting the saved comment for ${reference}`);
        resetTimer = win.setTimeout(resetDeleteButton, confirmTimeoutMs);
        return;
      }

      win.clearTimeout(resetTimer);
      deleteButton.disabled = true;
      try {
        await remove(entry.key);
      } catch (error) {
        console.error('[ghjournal] Failed to delete the saved comment', error);
        deleteButton.disabled = false;
        resetDeleteButton();
        return;
      }

      const next = item.nextElementSibling ?? item.previousElementSibling;
      item.remove();
      updateCount();
      next?.querySelector<HTMLElement>('.entry-delete')?.focus();
    });

    item.append(link, deleteButton);
    return item;
  }

  function element<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text?: string,
  ): HTMLElementTagNameMap[K] {
    const node = doc.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
}

function preview(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}
