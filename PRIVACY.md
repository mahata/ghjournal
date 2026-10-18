# Privacy policy

Last updated: 2026-10-18

ghjournal is a browser extension that saves and restores draft comments on GitHub issues and pull requests.
This policy describes the data it handles and what it does with that data.

## Data ghjournal stores

ghjournal stores data only when you click its **Save** button next to the **Comment** button on a GitHub issue or pull request.
For each saved comment, it stores:

- the text in the comment box,
- the URL and title of the issue or pull request, and
- the date and time you saved it.

To show and enable its **Load** and **Save** buttons, ghjournal's content script reads the page address and the comment box on `https://github.com/*` pages.
It stores nothing from them until you click **Save**.

## How the data is used

The stored data is used only to provide ghjournal's features:

- **Load** puts a saved comment back into the comment box of the issue or pull request it was saved on.
- The toolbar popup lists your saved comments with their titles, links, and save times, and lets you delete them.

## Where the data is kept

Saved comments are kept in the browser's extension storage (`chrome.storage.local`) on your device.
They are not synced to your other devices.

ghjournal makes no network requests.
It never sends your data to the developer or anyone else, and it contains no analytics, tracking, or advertising.
When you post a comment, GitHub's page sends it to GitHub as it normally does; ghjournal is not involved.

## Sharing

ghjournal does not sell, transfer, or share your data with anyone.

## Keeping and deleting your data

Saved comments are kept until you delete them; loading or posting a comment does not remove them.
To delete one, click the ghjournal toolbar icon, click **Delete** next to the comment, and then click **Confirm**.
Uninstalling ghjournal deletes all of its saved comments.

## Limited Use

ghjournal's use of the information it handles adheres to the Chrome Web Store User Data Policy, including the [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use) requirements.

## Changes to this policy

Changes to this policy are published in this file, and its history is available in the repository's commit log.

## Contact

If you have questions about this policy, open an issue at <https://github.com/mahata/ghjournal/issues>.
