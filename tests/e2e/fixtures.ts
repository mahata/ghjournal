import { readFileSync } from 'node:fs';
import path from 'node:path';

import { chromium, test as base, type BrowserContext, type Page } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '../..');
const extensionPath = path.join(root, '.output/chrome-mv3');
const issueHtml = readFileSync(path.join(root, 'tests/fixtures/issue.html'), 'utf8');
const pullHtml = readFileSync(path.join(root, 'tests/fixtures/pull.html'), 'utf8');

/** Serves fixture pages for https://github.com/acme/widgets/... so no network or login is needed. */
function fixtureFor(pathname: string): string | null {
  const issue = /^\/acme\/widgets\/issues\/(\d+)$/.exec(pathname);
  if (issue) return issueHtml.replace('Issue #1', `Issue #${issue[1]}`);
  if (pathname === '/acme/widgets/pull/2') return pullHtml;
  return null;
}

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
    });
    await context.route('https://github.com/**', async (route) => {
      const body = fixtureFor(new URL(route.request().url()).pathname);
      await route.fulfill(
        body === null
          ? { status: 404, contentType: 'text/html', body: '<title>Not Found</title><h1>Not Found</h1>' }
          : { status: 200, contentType: 'text/html', body },
      );
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const page = await context.newPage();
    // chrome://extensions exposes the management API, which reveals the unpacked extension's ID.
    await page.goto('chrome://extensions');
    const id = await page.evaluate(async () => {
      const { management } = (globalThis as unknown as { chrome: ChromeWithManagement }).chrome;
      const extensions = await management.getAll();
      return extensions.find((extension) => extension.name === 'ghjournal')?.id;
    });
    await page.close();
    if (!id) throw new Error('The ghjournal extension is not loaded. Run `pnpm build` first.');
    await use(id);
  },
});

interface ChromeWithManagement {
  management: { getAll(): Promise<{ id: string; name: string }[]> };
}

export const expect = test.expect;

export function composer(page: Page) {
  const textarea = page.locator('textarea[aria-labelledby="comment-composer-heading"], #new_comment_field');
  return {
    textarea,
    load: page.locator('[data-ghj-action="load"]'),
    save: page.locator('[data-ghj-action="save"]'),
    comment: page.getByRole('button', { name: 'Comment', exact: true }),
  };
}
