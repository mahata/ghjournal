import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  // Every test launches its own browser profile with the extension loaded.
  fullyParallel: true,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
});
