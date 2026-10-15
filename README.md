# ghjournal

A Chrome extension that saves and restores draft comments on GitHub issues and pull requests.

It adds **Load** and **Save** buttons next to the **Comment** button at the bottom of an issue or pull request conversation:

- **Save** stores the text of the comment box in the extension's local storage.
  Each issue or pull request keeps one saved comment.
  If a different comment is already saved, you are asked before it is overwritten.
- **Load** puts the saved comment back into the comment box.
  It is enabled only when the current page has a saved comment, and its tooltip shows when the comment was saved.
  If the comment box already contains other text, you are asked before it is replaced.
  The replacement can be undone with <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Z</kbd>.

Saved comments stay until you delete them; loading or posting a comment does not remove them.
Click the extension's toolbar icon to see every saved comment, open its issue or pull request, or delete it.

## Install

The extension is not published on the Chrome Web Store. Build it from source and load it unpacked:

1. Install [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/).
2. Build the extension:

   ```sh
   pnpm install
   pnpm build
   ```

3. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `.output/chrome-mv3` directory.

The build also works in other Chromium-based browsers such as Edge and Brave.

## Privacy

Saved comments are kept in `chrome.storage.local` on your device.
They are not synced to other devices and are never sent anywhere; the extension makes no network requests.
The only permission it requests is `storage`, and its content script runs only on `https://github.com/*`.

## Scope and limitations

- Only the new-comment box at the bottom of issue pages (`/{owner}/{repo}/issues/{number}`) and of the **Conversation** tab of pull requests (`/{owner}/{repo}/pull/{number}`) is supported.
  Review comments, replies in review threads, and comment edit boxes are not.
- Only github.com is supported; GitHub Enterprise Server and GHE.com are not.
- The extension finds the comment box by inspecting GitHub's page structure.
  If GitHub changes its markup, the buttons may stop appearing until the selectors in `lib/composer.ts` are updated.

## Development

| Command | Description |
| --- | --- |
| `pnpm dev` | Open Chrome with a separate profile that has the extension loaded, and rebuild on changes. Sign in to GitHub in that window to see the comment box. |
| `pnpm build` | Build the extension into `.output/chrome-mv3`. |
| `pnpm zip` | Build and package the extension as a zip file. |
| `pnpm compile` | Type-check the project. |
| `pnpm test` | Run the unit tests (Vitest with jsdom). |
| `pnpm test:e2e` | Build the extension and run the end-to-end tests (Playwright). |

Before running the end-to-end tests for the first time, install Playwright's Chromium:

```sh
pnpm exec playwright install chromium
```

The end-to-end tests load the built extension into Chromium and answer requests to `https://github.com/...` with the fixture pages in `tests/fixtures`, so they need neither network access nor a GitHub login.

### Continuous integration

The [CI workflow](.github/workflows/ci.yml) runs `pnpm compile`, `pnpm test`, and `pnpm test:e2e` on GitHub Actions for every pull request and every push to `main`.
When the end-to-end tests fail, it uploads their traces as the `playwright-test-results` artifact.
Open a trace with `pnpm exec playwright show-trace path/to/trace.zip`.

### Project layout

```
entrypoints/
  github.content/  Content script that adds the buttons on github.com
  popup/           Toolbar popup that lists and deletes saved comments
lib/
  comment-saver.ts Injects the buttons and handles Save and Load
  composer.ts      Finds GitHub's comment box (all GitHub selectors live here)
  route.ts         Parses issue and pull request URLs into storage keys
  storage.ts       Reads and writes saved comments
  text-field.ts    Writes into the comment box in an undoable way
tests/
  fixtures/        Simplified copies of GitHub's comment box markup
  unit/            Vitest tests
  e2e/             Playwright tests
```

## License

[MIT](LICENSE)
