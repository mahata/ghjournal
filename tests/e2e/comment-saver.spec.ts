import { composer, expect, test } from './fixtures';

const ISSUE_URL = 'https://github.com/acme/widgets/issues/1';
const PULL_URL = 'https://github.com/acme/widgets/pull/2';

test.describe('issue page', () => {
  test('saves a draft and restores it after a reload', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ISSUE_URL);
    const { textarea, load, save, comment } = composer(page);

    await expect(page.locator('[data-ghjournal] + [data-variant="primary"]')).toHaveText('Comment');
    await expect(page.locator('[data-ghjournal] button')).toHaveText(['Load', 'Save']);
    await expect(save).toBeDisabled();
    await expect(load).toBeDisabled();

    await textarea.fill('Draft written before lunch');
    await save.click();
    await expect(save).toHaveText('Saved ✓');
    await expect(load).toBeEnabled();
    await expect(save).toHaveText('Save');

    await page.reload();
    await expect(textarea).toHaveValue('');
    await expect(load).toBeEnabled();
    await expect(load).toHaveAttribute('title', /^Restore the comment saved on /);

    await load.click();
    await expect(textarea).toHaveValue('Draft written before lunch');
    await expect(load).toHaveText('Loaded ✓');
    // GitHub's Comment button reacts to restored text the same way as to typing.
    await expect(comment).toHaveAttribute('aria-disabled', 'false');
  });

  test('asks before overwriting a different saved draft', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ISSUE_URL);
    const { textarea, load, save } = composer(page);
    await textarea.fill('First draft');
    await save.click();
    await expect(load).toBeEnabled();

    await textarea.fill('Second draft');
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/^Overwrite the comment saved on /);
      await dialog.dismiss();
    });
    await save.click();
    await expect(save).toHaveText('Save');

    await page.reload();
    await load.click();
    await expect(textarea).toHaveValue('First draft');

    await textarea.fill('Second draft');
    page.once('dialog', (dialog) => dialog.accept());
    await save.click();
    await expect(save).toHaveText('Saved ✓');

    await page.reload();
    await load.click();
    await expect(textarea).toHaveValue('Second draft');
  });

  test('asks before replacing typed text, and the replacement can be undone', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ISSUE_URL);
    const { textarea, load, save } = composer(page);
    await textarea.fill('Saved text');
    await save.click();
    await expect(load).toBeEnabled();
    await textarea.fill('Text I am still writing');

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toBe('Replace the text in the comment box with the saved comment?');
      await dialog.dismiss();
    });
    await load.click();
    await expect(textarea).toHaveValue('Text I am still writing');

    page.once('dialog', (dialog) => dialog.accept());
    await load.click();
    await expect(textarea).toHaveValue('Saved text');

    await textarea.press('ControlOrMeta+z');
    await expect(textarea).toHaveValue('Text I am still writing');
  });

  test('keeps the saved draft after the comment is posted', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ISSUE_URL);
    const { textarea, load, save, comment } = composer(page);
    await textarea.fill('Posting this');
    await save.click();
    await expect(load).toBeEnabled();

    await comment.click();

    await expect(page.locator('.posted-comment')).toHaveText('Posting this');
    await expect(textarea).toHaveValue('');
    await expect(save).toBeDisabled();
    await expect(load).toBeEnabled();
  });

  test('follows navigation between conversations without a reload', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(ISSUE_URL);
    const { textarea, load, save } = composer(page);
    await textarea.fill('Draft for issue 1');
    await save.click();
    await expect(load).toBeEnabled();

    // Simulates GitHub's client-side navigation, which swaps the page content in place.
    const navigate = (path: string) =>
      page.evaluate((target) => {
        history.pushState(null, '', target);
        const composerRoot = document.querySelector('#react-issue-comment-composer')!;
        const fresh = composerRoot.cloneNode(true) as Element;
        fresh.querySelector('[data-ghjournal]')?.remove();
        fresh.querySelector('textarea')!.value = '';
        composerRoot.replaceWith(fresh);
      }, path);

    await navigate('/acme/widgets/issues/3');
    await expect(page.locator('[data-ghjournal]')).toHaveCount(1);
    await expect(load).toBeDisabled();

    await navigate('/acme/widgets/issues/1');
    await expect(page.locator('[data-ghjournal]')).toHaveCount(1);
    await expect(load).toBeEnabled();

    await navigate('/acme/widgets/issues');
    await expect(page.locator('[data-ghjournal]')).toHaveCount(0);
  });
});

test.describe('pull request page', () => {
  test('saves and restores without submitting the comment form', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(PULL_URL);
    const { textarea, load, save } = composer(page);

    await expect(page.locator('#partial-new-comment-form-actions > *')).toHaveText([
      'Close pull request',
      'LoadSave',
      'Comment',
    ]);
    // The edit form of the PR description is left alone.
    await expect(page.locator('form.js-comment-update [data-ghjournal]')).toHaveCount(0);

    await textarea.fill('Looks good to me');
    await save.click();
    await expect(load).toBeEnabled();
    await textarea.fill('');
    await load.click();
    await expect(textarea).toHaveValue('Looks good to me');

    await expect(page.locator('body')).not.toHaveAttribute('data-submitted-forms');
  });
});
