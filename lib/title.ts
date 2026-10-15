import type { ConversationRef } from './route';

// GitHub page titles look like "Fix crash · Issue #3 · owner/repo" and
// "Fix crash by octocat · Pull Request #4 · owner/repo". Usernames never contain
// spaces, so the last " by <login>" belongs to the PR author, not the title.
const ISSUE_TITLE = /^(.*) · Issue #\d+ · [^·]+$/s;
const PULL_TITLE = /^(.*) by \S+ · Pull Request #\d+ · [^·]+$/s;

export function extractConversationTitle(documentTitle: string, ref: ConversationRef): string {
  const pattern = ref.kind === 'issue' ? ISSUE_TITLE : PULL_TITLE;
  const title = pattern.exec(documentTitle.trim())?.[1]?.trim();
  return title || `${ref.owner}/${ref.repo}#${ref.number}`;
}
