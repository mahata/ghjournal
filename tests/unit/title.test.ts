import { describe, expect, it } from 'vitest';

import { parseConversationPath, type ConversationRef } from '@/lib/route';
import { extractConversationTitle } from '@/lib/title';

const issue = parseConversationPath('/acme/widgets/issues/3') as ConversationRef;
const pull = parseConversationPath('/acme/widgets/pull/4') as ConversationRef;

describe('extractConversationTitle', () => {
  it('extracts an issue title', () => {
    expect(extractConversationTitle('Open `issue` · Issue #3 · acme/widgets', issue)).toBe('Open `issue`');
  });

  it('extracts a pull request title without the author', () => {
    expect(extractConversationTitle('Open PR by fregante · Pull Request #4 · acme/widgets', pull)).toBe(
      'Open PR',
    );
  });

  it('keeps " by " that belongs to the pull request title itself', () => {
    expect(
      extractConversationTitle(
        'Fix bug reported by Bob by dependabot[bot] · Pull Request #4 · acme/widgets',
        pull,
      ),
    ).toBe('Fix bug reported by Bob');
  });

  it('keeps middle dots that belong to the title', () => {
    expect(extractConversationTitle('Docs · API · Issue #3 · acme/widgets', issue)).toBe('Docs · API');
  });

  it('falls back to the conversation reference for unknown title formats', () => {
    expect(extractConversationTitle('GitHub', issue)).toBe('acme/widgets#3');
    expect(extractConversationTitle('Open PR · Issue #4 · acme/widgets', pull)).toBe('acme/widgets#4');
  });
});
