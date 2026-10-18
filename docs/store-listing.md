# Chrome Web Store listing

This page holds the text to enter in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) for ghjournal.
Keep it consistent with [PRIVACY.md](../PRIVACY.md) and with what the extension does.
The Chrome Web Store treats any mismatch between the dashboard disclosures, the privacy policy, and the extension's behavior as a policy violation.

## Package

Build the package with `pnpm zip` and upload `.output/ghjournal-<version>-chrome.zip`.
The listing's name and summary come from `name` and `description` in the manifest (`wxt.config.ts`) and cannot be edited in the dashboard.
Every upload needs a higher `version` in `package.json` than the previous one.

## Store listing

### Description

```text
Save and restore draft comments on GitHub issues and pull requests.

ghjournal adds Load and Save buttons next to the Comment button at the bottom of GitHub issues and pull requests, so you can keep a draft and come back to it later.

- Save stores the text of the comment box in your browser. Each issue or pull request keeps one saved comment, and you are asked before a different one is overwritten.
- Load puts the saved comment back into the comment box. Its tooltip shows when the comment was saved. You are asked before other text in the comment box is replaced, and Cmd/Ctrl+Z undoes the replacement.
- Click the toolbar icon to see every saved comment, open its issue or pull request, or delete it.

Saved comments stay until you delete them; loading or posting a comment does not remove them.

Privacy: saved comments are kept in your browser's local extension storage on your device. They are not synced, and ghjournal makes no network requests. It requests only the storage permission and runs only on github.com.

Limitations:
- Only the new-comment box at the bottom of issues and of the Conversation tab of pull requests is supported. Review comments, replies in review threads, and comment edit boxes are not.
- Only github.com is supported; GitHub Enterprise Server and GHE.com are not.

ghjournal is open source: https://github.com/mahata/ghjournal
ghjournal is not affiliated with or endorsed by GitHub.
```

### Other fields

| Field | Value |
| --- | --- |
| Category | Developer Tools |
| Language | English |
| Homepage URL | https://github.com/mahata/ghjournal |
| Support URL | https://github.com/mahata/ghjournal/issues |

### Graphic assets

| Asset | Size | Required | Source |
| --- | --- | --- | --- |
| Store icon | 128×128 PNG | Yes | `public/icon/128.png` |
| Screenshots (1 to 5) | 1280×800 or 640×400 | At least one | Not in the repository yet |
| Small promo tile | 440×280 PNG or JPEG | Yes | Not in the repository yet |
| Marquee promo tile | 1400×560 PNG or JPEG | No | Not in the repository yet |

Screenshots should show the actual experience, for example:

1. The Load and Save buttons next to the Comment button on an issue.
2. The Load button's tooltip showing when the comment was saved.
3. The toolbar popup listing saved comments.

## Privacy practices

### Single purpose description

```text
Save draft comments on GitHub issues and pull requests in the browser and restore them into the comment box.
```

### Permission justifications

`storage`:

```text
Stores the comments the user saves with the Save button, together with the URL and title of the issue or pull request and the time saved, in chrome.storage.local, so that Load can restore them and the toolbar popup can list them. The data never leaves the device.
```

Host permission (`https://github.com/*`, used by the content script):

```text
The content script adds Load and Save buttons next to the Comment button on GitHub issue and pull request pages, enables them depending on whether the comment box has text and whether a comment is saved, stores the comment box text when the user clicks Save, and writes the saved comment back when the user clicks Load. It matches all of github.com because GitHub navigates between pages without full reloads, so the script must already be running when the user reaches an issue or pull request.
```

### Remote code

Select **No, I am not using remote code**.
All JavaScript is bundled into the package.

### Data usage

Check the following types of data.
Data that stays on the device must still be disclosed (see the [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)).

- **Website content**: the comment text and the title of the issue or pull request.
- **Web history**: the URL and title of the issue or pull request page and the time the comment was saved.

Leave the other types unchecked, and certify all three statements: no sale or transfer to third parties outside the approved use cases, no use or transfer unrelated to the single purpose, and no use or transfer for creditworthiness or lending.

### Privacy policy URL

```text
https://github.com/mahata/ghjournal/blob/main/PRIVACY.md
```

## Distribution

- Payments: Free
- Visibility: Public, or Unlisted if only people with the link should find it
- Regions: All regions

## Test instructions (optional)

```text
1. Sign in to github.com and open an issue or pull request you can comment on (on a pull request, use the Conversation tab).
2. Type text into the comment box at the bottom and click Save next to the Comment button.
3. Reload the page and click Load. The saved text is restored into the comment box.
4. Click the ghjournal toolbar icon to see the saved comment. Click Delete, then Confirm, to remove it.
```

## Publishing an update

1. Raise `version` in `package.json`.
2. Run `pnpm zip`.
3. In the dashboard, open the item, upload `.output/ghjournal-<version>-chrome.zip` on the **Package** tab, and click **Submit for review**.

If an update changes the data the extension handles or the permissions it uses, update [PRIVACY.md](../PRIVACY.md), this page, and the matching dashboard fields in the same release.
