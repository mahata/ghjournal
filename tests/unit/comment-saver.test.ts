import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { startCommentSaver } from '@/lib/comment-saver';
import { findComposer } from '@/lib/composer';
import { getSavedComment, setSavedComment, type SavedComment } from '@/lib/storage';

import { ISSUE_PATH, loadFixture, PULL_PATH, typeInto } from './helpers';

const ISSUE_KEY = 'comment:acme/widgets#1';
const PULL_KEY = 'comment:acme/widgets#2';

function savedComment(overrides: Partial<SavedComment> = {}): SavedComment {
  return {
    body: 'Saved draft',
    savedAt: Date.UTC(2026, 9, 1, 12, 0),
    url: 'https://github.com/acme/widgets/issues/1',
    title: 'Fix flaky upload test',
    kind: 'issue',
    ...overrides,
  };
}

function buttons() {
  const group = document.querySelector<HTMLElement>('[data-ghjournal]');
  return {
    group,
    load: group?.querySelector<HTMLButtonElement>('[data-ghj-action="load"]') ?? null,
    save: group?.querySelector<HTMLButtonElement>('[data-ghj-action="save"]') ?? null,
  };
}

function textarea(): HTMLTextAreaElement {
  return findComposer(document)!.textarea;
}

/** Types like a user and waits until the Save button has caught up. */
async function typeDraft(value: string): Promise<void> {
  typeInto(textarea(), value);
  await vi.waitFor(() => expect(buttons().save?.disabled).toBe(value.trim() === ''));
}

/** Lets scheduled re-renders and pending storage reads finish. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

/** Holds the next storage read until the returned function is called, like a slow disk. */
function delayNextStorageRead(): (items: Record<string, unknown>) => void {
  let release!: (items: Record<string, unknown>) => void;
  const pending = new Promise<Record<string, unknown>>((resolve) => {
    release = resolve;
  });
  vi.spyOn(browser.storage.local, 'get').mockImplementationOnce(() => pending as never);
  return release;
}

describe('startCommentSaver', () => {
  let controller: AbortController;
  let confirm: ReturnType<typeof vi.fn<(message: string) => boolean>>;
  let now: number;

  function start() {
    return startCommentSaver({
      signal: controller.signal,
      confirm,
      now: () => now,
      feedbackDurationMs: 50,
    });
  }

  beforeEach(() => {
    fakeBrowser.reset();
    controller = new AbortController();
    confirm = vi.fn<(message: string) => boolean>(() => true);
    now = Date.UTC(2026, 9, 15, 9, 30);
    document.body.innerHTML = '';
  });

  afterEach(() => {
    controller.abort();
  });

  describe('on an issue page', () => {
    beforeEach(() => {
      loadFixture('issue');
    });

    it('places Load and Save immediately before the Comment button', () => {
      start();

      const { group, load, save } = buttons();
      const commentButton = findComposer(document)!.commentButton;
      expect(group?.nextElementSibling).toBe(commentButton);
      expect([...group!.children].map((button) => button.textContent)).toEqual(['Load', 'Save']);
      expect(load?.type).toBe('button');
      expect(save?.type).toBe('button');
    });

    it('disables Save until the comment has text', async () => {
      start();
      expect(buttons().save?.disabled).toBe(true);

      typeInto(textarea(), 'Draft');
      await vi.waitFor(() => expect(buttons().save?.disabled).toBe(false));

      typeInto(textarea(), '   \n ');
      await vi.waitFor(() => expect(buttons().save?.disabled).toBe(true));
    });

    it('notices text that GitHub inserts without an input event, such as a quote reply', async () => {
      start();
      await settle();

      textarea().value = '> quoted text';
      await settle();
      expect(buttons().save?.disabled).toBe(true);

      // GitHub enables its own Comment button in response to the new text.
      findComposer(document)!.commentButton.setAttribute('aria-disabled', 'false');

      await vi.waitFor(() => expect(buttons().save?.disabled).toBe(false));
    });

    it('keeps Load disabled when nothing is saved', async () => {
      start();

      await vi.waitFor(() => expect(buttons().load?.title).toBe('No saved comment for this page'));
      expect(buttons().load?.disabled).toBe(true);
    });

    it('enables Load when a comment was saved earlier', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());

      start();

      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
      expect(buttons().load?.title).toMatch(/^Restore the comment saved on /);
    });

    it('saves the comment with page metadata and confirms with a temporary label', async () => {
      start();
      await typeDraft('My draft\n\nwith details');

      buttons().save!.click();

      await vi.waitFor(async () =>
        expect(await getSavedComment(ISSUE_KEY)).toEqual({
          body: 'My draft\n\nwith details',
          savedAt: now,
          url: 'https://github.com/acme/widgets/issues/1',
          title: 'Fix flaky upload test',
          kind: 'issue',
        }),
      );
      expect(confirm).not.toHaveBeenCalled();
      await vi.waitFor(() => expect(buttons().save?.textContent).toBe('Saved ✓'));
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
      await vi.waitFor(() => expect(buttons().save?.textContent).toBe('Save'));
    });

    it('asks before overwriting a different saved comment and keeps it when declined', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      confirm.mockReturnValue(false);
      start();
      await typeDraft('Newer draft');

      buttons().save!.click();

      await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
      expect(confirm.mock.calls[0]![0]).toMatch(/^Overwrite the comment saved on /);
      expect(await getSavedComment(ISSUE_KEY)).toEqual(savedComment());
    });

    it('overwrites a different saved comment when confirmed', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      start();
      await typeDraft('Newer draft');

      buttons().save!.click();

      await vi.waitFor(async () => expect((await getSavedComment(ISSUE_KEY))?.body).toBe('Newer draft'));
      expect(confirm).toHaveBeenCalledTimes(1);
    });

    it('re-saves identical text without asking and refreshes the timestamp', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      start();
      await typeDraft('Saved draft');

      buttons().save!.click();

      await vi.waitFor(async () => expect((await getSavedComment(ISSUE_KEY))?.savedAt).toBe(now));
      expect(confirm).not.toHaveBeenCalled();
    });

    it('restores the saved comment into an empty comment box without asking', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      start();
      const inputs = vi.fn();
      textarea().addEventListener('input', inputs);
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));

      buttons().load!.click();

      await vi.waitFor(() => expect(textarea().value).toBe('Saved draft'));
      expect(confirm).not.toHaveBeenCalled();
      expect(inputs).toHaveBeenCalled();
      await vi.waitFor(() => expect(buttons().load?.textContent).toBe('Loaded ✓'));
      // Loading never deletes the saved copy.
      expect(await getSavedComment(ISSUE_KEY)).toEqual(savedComment());
    });

    it('asks before replacing text that is already in the comment box', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      confirm.mockReturnValue(false);
      start();
      typeInto(textarea(), 'Something else');
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));

      buttons().load!.click();

      await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
      expect(confirm.mock.calls[0]![0]).toBe('Replace the text in the comment box with the saved comment?');
      expect(textarea().value).toBe('Something else');

      confirm.mockReturnValue(true);
      buttons().load!.click();

      await vi.waitFor(() => expect(textarea().value).toBe('Saved draft'));
    });

    it('treats a whitespace-only comment box as empty when loading', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      start();
      typeInto(textarea(), '  \n');
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));

      buttons().load!.click();

      await vi.waitFor(() => expect(textarea().value).toBe('Saved draft'));
      expect(confirm).not.toHaveBeenCalled();
    });

    it('saves the title of the conversation where Save was clicked if GitHub navigates meanwhile', async () => {
      start();
      await typeDraft('Draft for issue 1');
      await settle();
      const release = delayNextStorageRead();

      buttons().save!.click();
      history.pushState(null, '', '/acme/widgets/issues/3');
      document.title = 'Another issue · Issue #3 · acme/widgets';
      release({});

      await vi.waitFor(async () =>
        expect(await getSavedComment(ISSUE_KEY)).toMatchObject({
          body: 'Draft for issue 1',
          title: 'Fix flaky upload test',
          url: 'https://github.com/acme/widgets/issues/1',
        }),
      );
      expect(await getSavedComment('comment:acme/widgets#3')).toBeNull();
    });

    it('does not restore a draft into a conversation reached while storage is being read', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      start();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
      await settle();
      const release = delayNextStorageRead();

      buttons().load!.click();
      history.pushState(null, '', '/acme/widgets/issues/3');
      release({ [ISSUE_KEY]: savedComment() });
      await settle();

      expect(textarea().value).toBe('');
      expect(confirm).not.toHaveBeenCalled();
    });

    it('restores into the comment box that GitHub re-rendered while storage was being read', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      const composerRoot = document.querySelector('#react-issue-comment-composer')!;
      const pristineComposer = composerRoot.innerHTML;
      start();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
      await settle();
      const staleTextarea = textarea();
      const release = delayNextStorageRead();

      buttons().load!.click();
      composerRoot.innerHTML = pristineComposer;
      release({ [ISSUE_KEY]: savedComment() });

      await vi.waitFor(() => expect(textarea().value).toBe('Saved draft'));
      expect(textarea()).not.toBe(staleTextarea);
      expect(staleTextarea.value).toBe('');
    });

    it('stops loading when the saver is stopped while storage is being read', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      start();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
      await settle();
      const release = delayNextStorageRead();

      buttons().load!.click();
      controller.abort();
      release({ [ISSUE_KEY]: savedComment() });
      await settle();

      expect(textarea().value).toBe('');
    });

    it('follows saves and deletions made in other tabs or the popup', async () => {
      start();
      await vi.waitFor(() => expect(buttons().load?.title).toBe('No saved comment for this page'));

      await setSavedComment(ISSUE_KEY, savedComment());
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));

      await browser.storage.local.remove(ISSUE_KEY);
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(true));
    });

    it('ignores changes to other conversations', async () => {
      start();
      await vi.waitFor(() => expect(buttons().load?.title).toBe('No saved comment for this page'));

      await setSavedComment('comment:acme/widgets#99', savedComment());
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(buttons().load?.disabled).toBe(true);
    });

    it('re-adds the buttons after GitHub re-renders the footer, without duplicating them', async () => {
      const footer = document.querySelector('[data-testid="markdown-editor-footer"]')!;
      const originalFooter = footer.innerHTML;
      start();
      expect(buttons().group).not.toBeNull();

      footer.innerHTML = originalFooter;
      expect(buttons().group).toBeNull();

      await vi.waitFor(() => expect(buttons().group).not.toBeNull());
      expect(document.querySelectorAll('[data-ghjournal]')).toHaveLength(1);
      expect(buttons().group?.nextElementSibling).toBe(findComposer(document)!.commentButton);
    });

    it('updates the Load state when navigating between conversations without a reload', async () => {
      await setSavedComment(ISSUE_KEY, savedComment());
      const saver = start();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));

      history.pushState(null, '', '/acme/widgets/issues/3');
      saver.sync();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(true));

      history.pushState(null, '', ISSUE_PATH);
      saver.sync();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
    });

    it('removes the buttons when leaving conversation pages', async () => {
      const saver = start();
      expect(buttons().group).not.toBeNull();

      history.pushState(null, '', '/acme/widgets/pulls');
      saver.sync();

      expect(buttons().group).toBeNull();
    });

    it('removes the buttons and stops reacting once aborted', async () => {
      start();
      expect(buttons().group).not.toBeNull();

      controller.abort();

      expect(buttons().group).toBeNull();
      document.querySelector('main')!.append(document.createElement('div'));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(buttons().group).toBeNull();
    });

    it('shows a failure label when storage is unavailable', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(browser.storage.local, 'set').mockRejectedValue(
        new Error('Extension context invalidated.'),
      );
      start();
      await typeDraft('Draft');

      buttons().save!.click();

      await vi.waitFor(() => expect(buttons().save?.textContent).toBe('Reload page'));
    });
  });

  describe('on a pull request page', () => {
    beforeEach(() => {
      loadFixture('pull');
    });

    it('adds the buttons to the new-comment form only', () => {
      start();

      const form = document.querySelector('form.js-new-comment-form')!;
      expect(form.querySelectorAll('[data-ghjournal]')).toHaveLength(1);
      expect(document.querySelectorAll('[data-ghjournal]')).toHaveLength(1);
      expect(buttons().group?.nextElementSibling?.textContent?.trim()).toBe('Comment');
    });

    it('never submits the comment form', async () => {
      const submit = vi.fn((event: Event) => event.preventDefault());
      document.querySelector('form.js-new-comment-form')!.addEventListener('submit', submit);
      start();
      await typeDraft('Looks good');

      buttons().save!.click();
      await vi.waitFor(() => expect(buttons().load?.disabled).toBe(false));
      typeInto(textarea(), 'Changed my mind');
      buttons().load!.click();
      await vi.waitFor(() => expect(textarea().value).toBe('Looks good'));

      expect(confirm).toHaveBeenCalledTimes(1);
      expect(submit).not.toHaveBeenCalled();
    });

    it('records the pull request title without the author', async () => {
      start();
      await typeDraft('Looks good');

      buttons().save!.click();

      await vi.waitFor(async () =>
        expect(await getSavedComment(PULL_KEY)).toMatchObject({
          title: 'Add retry to uploader',
          kind: 'pull',
          url: `https://github.com${PULL_PATH}`,
        }),
      );
    });

    it('ignores the Files changed tab', () => {
      history.replaceState(null, '', `${PULL_PATH}/files`);

      start();

      expect(buttons().group).toBeNull();
    });
  });
});
