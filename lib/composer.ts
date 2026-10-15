/** Marks elements injected by this extension so detection never mistakes them for GitHub's own UI. */
export const OWN_UI_ATTRIBUTE = 'data-ghjournal';

export interface Composer {
  root: Element;
  textarea: HTMLTextAreaElement;
  commentButton: HTMLButtonElement;
}

// All knowledge of GitHub's markup lives in this module. Issues use a React composer;
// the PR "Conversation" tab still uses a server-rendered form with #new_comment_field.
const NEW_COMMENT_TEXTAREA = [
  'textarea[aria-labelledby="comment-composer-heading"]',
  '#react-issue-comment-composer textarea',
  '[data-testid="comment-composer"] textarea',
  'textarea#new_comment_field',
].join(', ');

// Ordered from most to least specific, so a React composer nested in a <form> wins.
const COMPOSER_ROOTS = ['[data-testid="comment-composer"]', '#react-issue-comment-composer', 'form'];

const PRIMARY_BUTTON = '[data-variant="primary"], .btn-primary, [type="submit"]';

/** Finds the new-comment composer at the bottom of an issue or PR conversation. */
export function findComposer(doc: Document): Composer | null {
  for (const textarea of doc.querySelectorAll<HTMLTextAreaElement>(NEW_COMMENT_TEXTAREA)) {
    for (const selector of COMPOSER_ROOTS) {
      const root = textarea.closest(selector);
      if (!root) continue;
      const commentButton = findCommentButton(root);
      if (commentButton) return { root, textarea, commentButton };
    }
  }
  return null;
}

function findCommentButton(root: Element): HTMLButtonElement | null {
  const candidates = [...root.querySelectorAll<HTMLButtonElement>('button')].filter(
    (button) =>
      !button.closest(`[${OWN_UI_ATTRIBUTE}], [hidden]`) &&
      normalizeText(button.textContent) === 'Comment',
  );
  return candidates.find((button) => button.matches(PRIMARY_BUTTON)) ?? candidates[0] ?? null;
}

function normalizeText(text: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}
