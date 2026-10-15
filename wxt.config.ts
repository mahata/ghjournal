import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  manifest: {
    name: 'ghjournal',
    description:
      'Save and restore draft comments on GitHub issues and pull requests.',
    permissions: ['storage'],
  },
});
