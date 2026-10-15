import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { fakeBrowser } from 'wxt/testing/fake-browser';

import {
  getSavedComment,
  listSavedComments,
  removeSavedComment,
  setSavedComment,
  watchSavedComments,
  type SavedComment,
} from '@/lib/storage';

function comment(overrides: Partial<SavedComment> = {}): SavedComment {
  return {
    body: 'Draft',
    savedAt: 1_000,
    url: 'https://github.com/acme/widgets/issues/1',
    title: 'Fix flaky upload test',
    kind: 'issue',
    ...overrides,
  };
}

describe('saved comment storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('stores and reads a comment per key', async () => {
    await setSavedComment('comment:acme/widgets#1', comment());

    expect(await getSavedComment('comment:acme/widgets#1')).toEqual(comment());
    expect(await getSavedComment('comment:acme/widgets#2')).toBeNull();
  });

  it('ignores malformed values', async () => {
    await browser.storage.local.set({ 'comment:acme/widgets#1': { body: 42 } });

    expect(await getSavedComment('comment:acme/widgets#1')).toBeNull();
  });

  it('removes a comment', async () => {
    await setSavedComment('comment:acme/widgets#1', comment());
    await removeSavedComment('comment:acme/widgets#1');

    expect(await getSavedComment('comment:acme/widgets#1')).toBeNull();
  });

  it('lists saved comments newest first and skips unrelated keys', async () => {
    await setSavedComment('comment:acme/widgets#1', comment({ savedAt: 1_000 }));
    await setSavedComment('comment:acme/widgets#2', comment({ savedAt: 3_000, kind: 'pull' }));
    await setSavedComment('comment:acme/gadgets#9', comment({ savedAt: 2_000 }));
    await browser.storage.local.set({ settings: { theme: 'dark' }, 'comment:broken#1': 'oops' });

    const entries = await listSavedComments();

    expect(entries.map((entry) => entry.key)).toEqual([
      'comment:acme/widgets#2',
      'comment:acme/gadgets#9',
      'comment:acme/widgets#1',
    ]);
    expect(entries[0]).toMatchObject({ kind: 'pull', savedAt: 3_000 });
  });

  it('notifies watchers about saves and removals until stopped', async () => {
    const callback = vi.fn();
    const stop = watchSavedComments(callback);

    await setSavedComment('comment:acme/widgets#1', comment());
    await browser.storage.local.set({ settings: { theme: 'dark' } });
    await removeSavedComment('comment:acme/widgets#1');
    stop();
    await setSavedComment('comment:acme/widgets#1', comment());

    expect(callback.mock.calls).toEqual([
      ['comment:acme/widgets#1', comment()],
      ['comment:acme/widgets#1', null],
    ]);
  });
});
