import issueHtml from '../fixtures/issue.html?raw';
import pullHtml from '../fixtures/pull.html?raw';

export const ISSUE_PATH = '/acme/widgets/issues/1';
export const PULL_PATH = '/acme/widgets/pull/2';

/**
 * Replaces the current jsdom document with a fixture page and moves the URL to `path`.
 * Inline scripts are dropped so unit tests only exercise the extension's own code.
 */
export function loadFixture(fixture: 'issue' | 'pull', path = fixture === 'issue' ? ISSUE_PATH : PULL_PATH): void {
  const parsed = new DOMParser().parseFromString(fixture === 'issue' ? issueHtml : pullHtml, 'text/html');
  for (const script of parsed.querySelectorAll('script')) script.remove();
  document.title = parsed.title;
  document.body.innerHTML = parsed.body.innerHTML;
  history.replaceState(null, '', path);
}

export function typeInto(textarea: HTMLTextAreaElement, value: string): void {
  textarea.value = value;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
