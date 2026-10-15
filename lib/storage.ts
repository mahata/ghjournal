import { browser } from 'wxt/browser';

import { STORAGE_KEY_PREFIX, type ConversationKind } from './route';

export interface SavedComment {
  body: string;
  /** Epoch milliseconds. */
  savedAt: number;
  url: string;
  title: string;
  kind: ConversationKind;
}

export interface SavedCommentEntry extends SavedComment {
  key: string;
}

export async function getSavedComment(key: string): Promise<SavedComment | null> {
  const items = await browser.storage.local.get(key);
  return toSavedComment(items[key]);
}

export async function setSavedComment(key: string, comment: SavedComment): Promise<void> {
  await browser.storage.local.set({ [key]: comment });
}

export async function removeSavedComment(key: string): Promise<void> {
  await browser.storage.local.remove(key);
}

/** Returns every saved comment, newest first. */
export async function listSavedComments(): Promise<SavedCommentEntry[]> {
  const items = await browser.storage.local.get(null);
  const entries: SavedCommentEntry[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;
    const comment = toSavedComment(value);
    if (comment) entries.push({ key, ...comment });
  }
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Calls `callback` whenever a saved comment is created, updated, or removed
 * (with `null` on removal). Returns a function that stops watching.
 */
export function watchSavedComments(
  callback: (key: string, comment: SavedComment | null) => void,
): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, areaName: string) => {
    if (areaName !== 'local') return;
    for (const [key, change] of Object.entries(changes)) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) callback(key, toSavedComment(change.newValue));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

function toSavedComment(value: unknown): SavedComment | null {
  if (typeof value !== 'object' || value === null) return null;
  const { body, savedAt, url, title, kind } = value as Record<string, unknown>;
  if (
    typeof body !== 'string' ||
    typeof savedAt !== 'number' ||
    typeof url !== 'string' ||
    typeof title !== 'string' ||
    (kind !== 'issue' && kind !== 'pull')
  ) {
    return null;
  }
  return { body, savedAt, url, title, kind };
}
