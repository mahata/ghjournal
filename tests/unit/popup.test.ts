import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import { renderPopup } from '@/lib/popup';
import { getSavedComment, setSavedComment, type SavedComment } from '@/lib/storage';

function savedComment(overrides: Partial<SavedComment> = {}): SavedComment {
  return {
    body: 'Saved draft',
    savedAt: Date.UTC(2026, 9, 1, 12, 0),
    url: 'https://github.com/Acme/Widgets/issues/1',
    title: 'Fix flaky upload test',
    kind: 'issue',
    ...overrides,
  };
}

function entries(container: HTMLElement): HTMLLIElement[] {
  return [...container.querySelectorAll<HTMLLIElement>('.entry')];
}

describe('renderPopup', () => {
  let container: HTMLElement;

  beforeEach(() => {
    fakeBrowser.reset();
    document.body.innerHTML = '<main id="app"></main>';
    container = document.querySelector('#app')!;
  });

  it('lists saved comments newest first with links to their conversations', async () => {
    await setSavedComment('comment:acme/widgets#1', savedComment());
    await setSavedComment(
      'comment:acme/widgets#2',
      savedComment({
        title: 'Add retry to uploader',
        kind: 'pull',
        url: 'https://github.com/Acme/Widgets/pull/2',
        savedAt: Date.UTC(2026, 9, 2, 12, 0),
        body: 'Looks good,\n\nbut please add a test.',
      }),
    );

    await renderPopup(container);

    const [newest, oldest] = entries(container);
    expect(container.querySelector('.popup-count')?.textContent).toBe('2');
    expect(newest?.querySelector('.entry-title')?.textContent).toBe('Add retry to uploader');
    expect(newest?.querySelector('.entry-kind')?.textContent).toBe('PR');
    expect(newest?.querySelector('.entry-ref')?.textContent).toBe('Acme/Widgets#2');
    expect(newest?.querySelector('.entry-preview')?.textContent).toBe('Looks good, but please add a test.');
    expect(newest?.querySelector('time')?.dateTime).toBe('2026-10-02T12:00:00.000Z');
    const link = newest?.querySelector<HTMLAnchorElement>('.entry-link');
    expect(link?.href).toBe('https://github.com/Acme/Widgets/pull/2');
    expect(link?.target).toBe('_blank');
    expect(oldest?.querySelector('.entry-kind')?.textContent).toBe('Issue');
    expect(container.querySelector<HTMLElement>('.empty')?.hidden).toBe(true);
  });

  it('shows an empty state when nothing is saved', async () => {
    await renderPopup(container);

    expect(entries(container)).toHaveLength(0);
    expect(container.querySelector('.popup-count')?.textContent).toBe('0');
    expect(container.querySelector<HTMLElement>('.empty')?.hidden).toBe(false);
  });

  it('truncates long previews', async () => {
    await setSavedComment('comment:acme/widgets#1', savedComment({ body: 'x'.repeat(500) }));

    await renderPopup(container);

    expect(container.querySelector('.entry-preview')?.textContent).toBe(`${'x'.repeat(200)}…`);
  });

  it('renders titles and bodies as text, not markup', async () => {
    await setSavedComment(
      'comment:acme/widgets#1',
      savedComment({ title: '<img src=x onerror="alert(1)">', body: '<script>alert(1)</script>' }),
    );

    await renderPopup(container);

    expect(container.querySelector('img, script')).toBeNull();
    expect(container.querySelector('.entry-title')?.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it('deletes an entry only after a confirming second click', async () => {
    await setSavedComment('comment:acme/widgets#1', savedComment());
    await renderPopup(container);
    const deleteButton = container.querySelector<HTMLButtonElement>('.entry-delete')!;

    deleteButton.click();

    expect(deleteButton.textContent).toBe('Confirm');
    expect(await getSavedComment('comment:acme/widgets#1')).not.toBeNull();

    deleteButton.click();

    await vi.waitFor(() => expect(entries(container)).toHaveLength(0));
    expect(await getSavedComment('comment:acme/widgets#1')).toBeNull();
    expect(container.querySelector('.popup-count')?.textContent).toBe('0');
    expect(container.querySelector<HTMLElement>('.empty')?.hidden).toBe(false);
  });

  it('cancels a pending deletion after a timeout', async () => {
    vi.useFakeTimers();
    try {
      await setSavedComment('comment:acme/widgets#1', savedComment());
      await renderPopup(container, { confirmTimeoutMs: 1000 });
      const deleteButton = container.querySelector<HTMLButtonElement>('.entry-delete')!;

      deleteButton.click();
      vi.advanceTimersByTime(1000);

      expect(deleteButton.textContent).toBe('Delete');
      expect(deleteButton.classList.contains('is-confirming')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the entry when deletion fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await setSavedComment('comment:acme/widgets#1', savedComment());
    await renderPopup(container, { remove: () => Promise.reject(new Error('quota')) });
    const deleteButton = container.querySelector<HTMLButtonElement>('.entry-delete')!;

    deleteButton.click();
    deleteButton.click();

    await vi.waitFor(() => expect(deleteButton.textContent).toBe('Delete'));
    expect(deleteButton.disabled).toBe(false);
    expect(entries(container)).toHaveLength(1);
  });
});
