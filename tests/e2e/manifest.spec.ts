import { expect, test } from './fixtures';

test('declares the extension icon in every size', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const icons = await page.evaluate(async () => {
    const { runtime } = (globalThis as unknown as { chrome: ChromeWithRuntime }).chrome;
    return Promise.all(
      Object.entries(runtime.getManifest().icons ?? {}).map(async ([size, file]) => {
        const response = await fetch(runtime.getURL(file));
        const bitmap = await createImageBitmap(await response.blob());
        return { size: Number(size), width: bitmap.width, height: bitmap.height };
      }),
    );
  });

  expect(icons).toEqual([16, 32, 48, 96, 128].map((size) => ({ size, width: size, height: size })));
});

interface ChromeWithRuntime {
  runtime: {
    getManifest(): { icons?: Record<string, string> };
    getURL(path: string): string;
  };
}
