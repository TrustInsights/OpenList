# Release checklist (version 1.2.0)

Items marked OWNER need you. An agent cannot do them.

## Before the upload

- [ ] Merge the branch `feat/single-list-popup-copy-wcag` into `master` (pull request: https://github.com/TrustInsights/OpenList/pull/new/feat/single-list-popup-copy-wcag). OWNER
- [ ] Run `pnpm check` and `pnpm exec playwright test`. Both pass.
- [ ] Decide the open items in output/review/2026-11-16-status-and-open-items.md (round trip for Title & URL and Link, toolbar title time, clipboard site-like lines, right-click path). OWNER
- [ ] Manual accessibility pass in docs/accessibility.md (VoiceOver, real zoom, real forced colors, the real permission prompt). OWNER
- [ ] Approve the manifest description and the listing text in docs/store-listing.md. OWNER
- [ ] Make new store images (the current ones show the old popup): at least one 1280x800 screenshot, and the 440x280 small tile.
- [ ] Host the privacy policy at a public address. GitHub address after the merge: https://github.com/TrustInsights/OpenList/blob/master/docs/privacy-policy.md

## Build the package

- [ ] `pnpm package` builds the extension and writes output/artifacts/openlist-1.2.0.zip. The script checks the version, the manifest, and the service worker.

## Upload (OWNER only)

The Chrome Web Store Developer Dashboard asks you to accept the developer agreement and may ask for a fee. Only you can review and accept those terms. Open https://chrome.google.com/webstore/devconsole, choose the OpenList item, then Package, then Upload new package.

- [ ] Fill the Privacy practices tab from docs/store-notes.md (single purpose, each permission, no remote code, data use).
- [ ] Add the privacy policy address and the new images.
- [ ] Submit for review.

## After publishing

- [ ] Tag `v1.2.0` and create a GitHub release with the zip attached.
- [ ] Install the published version in a clean Chrome profile. Check the popup, the shortcut, and the clipboard button.
- [ ] Update the store link in README.md if the address changes.
