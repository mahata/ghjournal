export type ConversationKind = 'issue' | 'pull';

export interface ConversationRef {
  owner: string;
  repo: string;
  number: number;
  kind: ConversationKind;
  /** Storage key shared by an issue and a PR with the same number, since they share one number space per repo. */
  key: string;
  url: string;
}

export const STORAGE_KEY_PREFIX = 'comment:';

// Only the PR "Conversation" tab hosts the new-comment composer, so PR subpaths like /files are excluded.
const CONVERSATION_PATH = /^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)\/?$/;

export function parseConversationPath(pathname: string): ConversationRef | null {
  const match = CONVERSATION_PATH.exec(pathname);
  if (!match) return null;

  const [, owner, repo, segment, digits] = match as unknown as [string, string, string, string, string];
  const number = Number(digits);
  if (!Number.isSafeInteger(number) || number <= 0) return null;

  return {
    owner,
    repo,
    number,
    kind: segment === 'issues' ? 'issue' : 'pull',
    key: storageKeyFor(owner, repo, number),
    url: `https://github.com/${owner}/${repo}/${segment}/${number}`,
  };
}

export function storageKeyFor(owner: string, repo: string, number: number): string {
  return `${STORAGE_KEY_PREFIX}${owner.toLowerCase()}/${repo.toLowerCase()}#${number}`;
}
