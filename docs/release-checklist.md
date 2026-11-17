# Release checklist (version 1.2.0)

Items marked OWNER need you. An agent cannot do them.

## Before the upload

- [x] Merged into `master` on 2026-11-17 (fast-forward, commit 4f67803). The branch `feat/single-list-popup-copy-wcag` still exists on GitHub.
- [ ] Run `pnpm check` and `pnpm exec playwright test`. Both pass.
- [ ] Decide the open items in output/review/2026-11-16-status-and-open-items.md (round trip for Title & URL and Link, toolbar title time, clipboard site-like lines, right-click path). OWNER
- [ ] Manual accessibility pass in docs/accessibility.md (VoiceOver, real zoom, real forced colors, the real permission prompt). OWNER
- [ ] Approve the manifest description and the listing text in docs/store-listing.md. OWNER
- [x] New store images exist. `pnpm store-images` builds three 1280x800 screenshots and the 440x280 small tile from the real extension into `output/store-images/` (RGB PNG, no alpha; the test checks size and color type). Review them and upload them. OWNER
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
