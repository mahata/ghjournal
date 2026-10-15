import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from '@playwright/test';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'public/icon');
const sizes = [16, 32, 48, 96, 128];

const svg = await readFile(path.join(root, 'assets/icon.svg'), 'utf8');
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const size of sizes) {
    await page.setContent(
      `<style>body { margin: 0; } svg { display: block; width: ${size}px; height: ${size}px; }</style>${svg}`,
    );
    await page.locator('svg').screenshot({ path: path.join(outDir, `${size}.png`), omitBackground: true });
    console.log(`Wrote public/icon/${size}.png`);
  }
} finally {
  await browser.close();
}
