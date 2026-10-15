import { describe, expect, it } from 'vitest';

import { parseConversationPath, storageKeyFor } from '@/lib/route';

describe('parseConversationPath', () => {
  it('parses an issue page', () => {
    expect(parseConversationPath('/Acme/Widgets/issues/12')).toEqual({
      owner: 'Acme',
      repo: 'Widgets',
      number: 12,
      kind: 'issue',
      key: 'comment:acme/widgets#12',
      url: 'https://github.com/Acme/Widgets/issues/12',
    });
  });

  it('parses the conversation tab of a pull request, with or without a trailing slash', () => {
    for (const path of ['/acme/widgets/pull/7', '/acme/widgets/pull/7/']) {
      expect(parseConversationPath(path)).toMatchObject({
        kind: 'pull',
        number: 7,
        key: 'comment:acme/widgets#7',
        url: 'https://github.com/acme/widgets/pull/7',
      });
    }
  });

  it('gives an issue and a pull request with the same number the same key', () => {
    expect(parseConversationPath('/acme/widgets/issues/3')?.key).toBe(
      parseConversationPath('/acme/widgets/pull/3')?.key,
    );
  });

  it.each([
    '/',
    '/acme/widgets',
    '/acme/widgets/issues',
    '/acme/widgets/issues/new',
    '/acme/widgets/pulls',
    '/acme/widgets/pulls/2',
    '/acme/widgets/pull/2/files',
    '/acme/widgets/pull/2/commits',
    '/acme/widgets/issues/0',
    '/acme/widgets/discussions/2',
  ])('ignores %s', (path) => {
    expect(parseConversationPath(path)).toBeNull();
  });
});

describe('storageKeyFor', () => {
  it('normalizes owner and repository names to lowercase', () => {
    expect(storageKeyFor('Acme', 'Widgets', 5)).toBe('comment:acme/widgets#5');
  });
});
