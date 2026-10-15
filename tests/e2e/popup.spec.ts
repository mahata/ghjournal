import { composer, expect, test } from './fixtures';

test('lists saved drafts, opens them, and deletes them', async ({ context, extensionId }) => {
  const issuePage = await context.newPage();
  await issuePage.goto('https://github.com/acme/widgets/issues/1');
  const issue = composer(issuePage);
  await issue.textarea.fill('Issue draft');
  await issue.save.click();
  await expect(issue.load).toBeEnabled();

  const pullPage = await context.newPage();
  await pullPage.goto('https://github.com/acme/widgets/pull/2');
  const pull = composer(pullPage);
  await pull.textarea.fill('Review draft');
  await pull.save.click();
  await expect(pull.load).toBeEnabled();

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(popup.locator('.popup-count')).toHaveText('2');
  await expect(popup.locator('.entry-title')).toHaveText(['Add retry to uploader', 'Fix flaky upload test']);
  await expect(popup.locator('.entry-ref')).toHaveText(['acme/widgets#2', 'acme/widgets#1']);
  await expect(popup.locator('.entry-kind')).toHaveText(['PR', 'Issue']);
  await expect(popup.locator('.entry-preview')).toHaveText(['Review draft', 'Issue draft']);

  const [opened] = await Promise.all([
    context.waitForEvent('page'),
    popup.locator('.entry-link').first().click(),
  ]);
  await expect(opened).toHaveURL('https://github.com/acme/widgets/pull/2');
  await opened.close();

  const issueEntry = popup.locator('.entry', { hasText: 'acme/widgets#1' });
  const deleteButton = issueEntry.locator('.entry-delete');
  await deleteButton.click();
  await expect(deleteButton).toHaveText('Confirm');
  await deleteButton.click();

  await expect(popup.locator('.entry')).toHaveCount(1);
  await expect(popup.locator('.popup-count')).toHaveText('1');
  // The open issue tab learns about the deletion right away.
  await expect(issue.load).toBeDisabled();
  await expect(pull.load).toBeEnabled();
});

test('shows an empty state without saved drafts', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(popup.locator('.popup-count')).toHaveText('0');
  await expect(popup.locator('.empty')).toBeVisible();
});
