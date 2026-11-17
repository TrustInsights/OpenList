# Accessibility record

Standard: WCAG 2.1 level AA.
Date of the pass: 2026-11-16.
Build: OpenList 1.2.0 (`dist/` built from this tree).

## Status

OpenList is not called compliant with WCAG 2.1 AA. The owner must do the items marked NOT DONE first. An agent cannot run VoiceOver, a real Windows forced-colors session, or a real Chrome permission prompt. Every result below says who ran it and how.

## How the agent pass ran

- Browser: Chrome for Testing 145.0.7632.6, new headless mode, macOS 27.0.1 on arm64, driven by Playwright 1.58.2.
- The popup opens as a tab, because Playwright cannot open a toolbar popup. The page, the styles, and the script are the same.
- Zoom is viewport emulation, not the Chrome zoom control. The sizes follow WCAG 1.4.10 on a 1280 by 1024 window: 200% is 640 by 512 CSS px, and 400% is 320 by 256 CSS px.
- Every check is a test in the suite, so a later change that breaks it fails the gate. The test names are in the last column.

## Results

| Item | Result | Known gap | Test |
|------|--------|-----------|------|
| Keyboard only: every control is reachable in a logical order | PASS (agent) | None found. | `a11y.spec.ts`: "Tab visits the list, From, Open, Copy, Copy as, Details, and the footer link in this order" and "the clipboard buttons sit between Copy as and Details while the prompt shows" |
| Keyboard only: Ctrl+Enter and Cmd+Enter open the list | PASS (agent) | None found. | `open.spec.ts`: Control+Enter on pasted URLs; `keyboard.spec.ts`: "Meta+Enter opens the URLs of the list" |
| Keyboard only: Enter and Space run the buttons and the Details control, and a typed letter picks a format | PASS (agent) | On macOS an arrow key only opens the native menu of a select. The test uses type-ahead, which works with the menu closed. Arrow keys on Windows are not tested. | `keyboard-only.spec.ts`: "Tab, Enter, Space, and type-ahead reach and run every control with no pointer" |
| Focus is visible | PASS (agent) | None found. | `a11y.spec.ts`: "every focused control shows a solid 2 px accent outline with a 2 px offset" (light and dark) |
| VoiceOver on macOS: labels | NOT DONE (needs the owner) | Not run. The accessibility tree exposes the names, which is not the same as VoiceOver speech. | `keyboard-only.spec.ts`: "the list and the error box expose their names, roles, and links to assistive technology" |
| VoiceOver on macOS: the status line announces the Copy and Open results | NOT DONE (needs the owner) | Not run. The status line has `role="status"`. | `App-actions.test.tsx` and `StatusLine.test.tsx` check the role and the text. |
| VoiceOver on macOS: the alert announces the empty-list error | NOT DONE (needs the owner) | Not run. The error box has `role="alert"`, and the list has `aria-invalid` and `aria-describedby`. | `keyboard-only.spec.ts`: the same test as the labels row |
| VoiceOver on macOS: a long pre-filled list read on focus | NOT DONE (needs the owner) | Not run. The list is a labelled text box with all text selected. | None. Only a human can judge the speech. |
| Browser zoom 200% (640 CSS px wide) | PASS by viewport emulation (agent) | Real Chrome zoom is not run. | `reflow.spec.ts`: "at 200% (640 px wide) the default state has no sideways scroll and no clipped text", and the same test for the Details open, error, and status message states |
| Browser zoom 400% (320 CSS px wide) | PASS by viewport emulation (agent), after one fix | Real Chrome zoom is not run. Fix: the example line was cut by an ellipsis at 320 px. It wraps at 360 px and below now (`.example` in `src/popup/adapt.css`). | `reflow.spec.ts`: the four "at 400% (320 px wide)" tests |
| Text spacing override (line height 1.5, letter spacing 0.12 em, word spacing 0.16 em) | PASS (agent) at 450 px and 320 px wide, in four states | The example line is still cut by an ellipsis at 450 px. The design sets this (spec 5.5). The full text stays in the page and in the description of the Copy as control. The page height under the override is not measured. | `reflow.spec.ts`: the eight "keeps every word visible" tests |
| Windows forced colors | PASS by emulation (agent), light and dark | A real Windows High Contrast session is NOT DONE (needs the owner on Windows). The emulation proves the border and ring rules, not every Windows theme. | `forced-colors.spec.ts`: "every control has a border and every focus stop has a 2 px ring" |

## Chrome checks of spec section 14

| Check | Result | Detail |
|-------|--------|--------|
| `clipboardRead` is accepted in `optional_permissions` | Verified (agent) | Chrome loads the build. Both clipboard permissions are optional, and neither is granted at install. Test: `chrome-checks.spec.ts`. |
| A permission request needs a user gesture | Verified (agent) | A request from the service worker is refused with a user gesture error. Only the popup button can ask. Test: `chrome-checks.spec.ts`. |
| The optional permission is accepted at the prompt, and the effect of the prompt on the popup | UNVERIFIED (needs the owner) | Playwright cannot click the Chrome prompt. Open item 6 of docs/project-decisions.md lists the steps. It is not known whether the prompt closes the popup. |
| The popup reads the clipboard after the grant with no second prompt | UNVERIFIED (needs the owner) | The end-to-end tests load a copy of the build that lists both permissions as required. That proves the code path, not the real grant. |
| The offscreen page writes the clipboard, and the permission it needs | Verified for the permission, UNVERIFIED for the real grant (agent) | Without `clipboardWrite` the write fails with "The copy command failed." With it the write works and the clipboard holds the text. The offscreen page has no focus, so `navigator.clipboard` rejects with "Document is not focused" and the copy command writes (ruling 45). Tests: `copy.spec.ts`, the two offscreen tests (ruling 25). |
| Ctrl+Z after a paste into the pre-selected list | Verified on macOS (agent) | The undo brings the pre-filled list back. The test sends Cmd+V and Cmd+Z. Windows and Linux are not run. Test: `chrome-checks.spec.ts`. |
| `selectionText` keeps the newlines of a multi-line selection | UNVERIFIED (needs the owner) | Playwright cannot open the page context menu on a real selection. Unit tests pass a multi-line string to the handler, which does not prove what Chrome sends. |
| A screen reader reads a long pre-filled list sensibly on focus | NOT DONE (needs the owner) | Same as the VoiceOver row above. |
| The suggested shortcut Alt+Shift+C is free | Partly verified (agent) | In the test Chrome, `chrome.commands.getAll()` reports the shortcut assigned to `copy-window`. The owner's Chrome, other extensions, and Windows are not checked. The user can change it at `chrome://extensions/shortcuts`. Test: `chrome-checks.spec.ts`. |
| `chrome.windows.getCurrent()` in the service worker returns the window that the user works in | UNVERIFIED (needs the owner) | After a second window opened with `focused: true`, `getCurrent()` in the headless test Chrome did not return the new window. The cause is not known. Press the shortcut with two windows open and read the clipboard. |
| A screen reader reads the toolbar title and result text | NOT DONE (needs the owner) | A badge is not announced. The title carries the result. The badge colors pass 4.5:1 (`feedback.test.ts`). |
| The popup fits Chrome's 600 px height limit | Partly verified (agent) | The page measures 600 px or less in four states as a tab (`popup.spec.ts`). The real toolbar popup is not measured. |

## Automated evidence

- axe-core (WCAG 2.1 A and AA tags) finds no violation in light and dark mode, in the default, error, Details open, and status states (`a11y.spec.ts`).
- Seven component tests and the App test (`tests/unit/components/`, `tests/unit/popup/App.test.tsx`) run a `vitest-axe` scan. The end-to-end axe runs also cover the footer link and the error box.
- The color tokens pass the contrast test: text pairs at 4.5:1 or more, borders and rings at 3:1 or more, in both themes (`tokens-contrast.test.ts`).
- Every control is 44 px high, and the popup is 450 px wide (`popup.spec.ts`).
- Automated tools find only part of the WCAG issues. They do not replace the NOT DONE items.

## What the owner must do

1. Run VoiceOver on macOS through the four VoiceOver rows above and record each result here.
2. Open the popup in Windows with a High Contrast theme and check the borders and the focus ring.
3. Zoom the real popup to 200% and 400% in Chrome.
4. Grant the optional permissions from the popup button. Record whether the popup closes. Then press Alt+Shift+C and read the clipboard.
5. Select several lines on a page, use the right-click item, and record whether all lines open.
6. Press Alt+Shift+C with two windows open, and check which window the copy reads.
