import { beforeEach, describe, expect, it } from 'vitest';

import { findComposer, OWN_UI_ATTRIBUTE } from '@/lib/composer';

import { loadFixture } from './helpers';

describe('findComposer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('finds the React composer on an issue page', () => {
    loadFixture('issue');

    const composer = findComposer(document);

    expect(composer?.root.getAttribute('data-testid')).toBe('comment-composer');
    expect(composer?.textarea.getAttribute('aria-labelledby')).toBe('comment-composer-heading');
    expect(composer?.commentButton.getAttribute('data-variant')).toBe('primary');
    expect(composer?.commentButton.textContent?.trim()).toBe('Comment');
  });

  it('finds the new-comment form on a pull request and skips other forms', () => {
    loadFixture('pull');

    const composer = findComposer(document);

    expect(composer?.textarea.id).toBe('new_comment_field');
    expect(composer?.root.classList.contains('js-new-comment-form')).toBe(true);
    expect(composer?.commentButton.textContent?.trim()).toBe('Comment');
    expect(composer?.commentButton.name).not.toBe('comment_and_close');
  });

  it('returns null when the composer is missing, as for signed-out visitors', () => {
    document.body.innerHTML = '<main><a href="/login">Sign in to comment</a></main>';

    expect(findComposer(document)).toBeNull();
  });

  it('returns null when the composer has no Comment button', () => {
    document.body.innerHTML = `
      <form><textarea id="new_comment_field"></textarea><button type="submit">Reply</button></form>`;

    expect(findComposer(document)).toBeNull();
  });

  it('ignores hidden buttons and buttons injected by the extension', () => {
    document.body.innerHTML = `
      <div data-testid="comment-composer">
        <textarea aria-labelledby="comment-composer-heading"></textarea>
        <span ${OWN_UI_ATTRIBUTE}><button type="button">Comment</button></span>
        <div hidden><button data-variant="primary">Comment</button></div>
        <button id="real" type="button">Comment</button>
      </div>`;

    expect(findComposer(document)?.commentButton.id).toBe('real');
  });

  it('prefers the primary Comment button', () => {
    document.body.innerHTML = `
      <div data-testid="comment-composer">
        <textarea></textarea>
        <button id="secondary" type="button">Comment</button>
        <button id="primary" type="button" data-variant="primary"><span>Comment</span></button>
      </div>`;

    expect(findComposer(document)?.commentButton.id).toBe('primary');
  });
});
