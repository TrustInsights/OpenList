# Changelog

All notable changes to OpenList are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added (distribution, 2026-11-17)

- `pnpm package` builds the extension and writes `output/artifacts/openlist-<version>.zip` through `src/tools/package-release.sh`. The tool checks the manifest version against `package.json`, the service worker file, and the zip layout. Tests: `tests/unit/tools/package-release.test.ts`.
- The manifest description (the store summary) now reads: "Open a list of URLs as tabs, or copy your open tabs as Markdown, CSV, JSON, and more. Updated by TrustInsights.ai."
- `pnpm store-images` builds the store screenshots and the small promo tile from the real built extension (`tests/e2e/store-images.spec.ts`). Sample pages use example domains. The test checks the size and that each PNG has no alpha channel.
- `docs/privacy-policy.md`, `docs/store-listing.md` (draft), and `docs/release-checklist.md`.

### Fixed (substance audit, 2026-11-16)

- Round trip (spec 6.3): a Markdown or BBCode item whose tab title holds a web address read back as two pages. `lineEntries` now takes only the link target of the exact item shapes that Copy writes (ruling 32). Title & URL and Link stay open as carry-over 12 in docs/project-decisions.md.
- Open (spec 5.3): a line that repeated an opened or skipped URL stayed in the list after Open. `remainingText` now removes it (ruling 32).
- Tests: a hostile-title round trip for the seven formats that carry URLs and have an unambiguous shape, two extractor shape tests, and three repeat-line tests.

## [1.2.0] - 2026-11-16

### Added (release, plan B task 15)

- docs/accessibility.md: the record of the manual pass (standard WCAG 2.1 AA, date, build 1.2.0, a result and a known gap for each item) and the Chrome checks of spec section 14. An agent ran keyboard only, 200% and 400% zoom by viewport emulation, the text spacing override, and forced colors by emulation. VoiceOver, a real Windows forced-colors session, real Chrome zoom, the real permission prompt, and `selectionText` newlines are recorded as NOT DONE or UNVERIFIED (needs the owner). The extension is not called WCAG 2.1 AA compliant.
- docs/store-notes.md: one justification line for each permission (`tabs`, `contextMenus`, `storage`, `offscreen`, optional `clipboardRead`, optional `clipboardWrite`) and the privacy statement of spec section 3.
- Tests: `tests/e2e/reflow.spec.ts` (8 zoom and 8 text spacing tests), `tests/e2e/forced-colors.spec.ts`, `tests/e2e/keyboard-only.spec.ts`, `tests/e2e/chrome-checks.spec.ts` (optional permissions, user gesture, command shortcut, Ctrl+Z after a paste), `tests/helpers/popup-layout.ts`, and `tests/unit/deliverables.test.ts` (scans the README sections Features, Usage, and Privacy and docs/store-notes.md for administrative terms, checks every manifest permission has a store note, and checks the accessibility record). The layout guard gains "manifest version equals package version".

### Changed (release, plan B task 15)

- Version 1.2.0 in `package.json` and `src/manifest.json`.
- README: Features, Usage (the single list, the ten formats, the shortcut, the clipboard button), Privacy (the optional clipboard read), Browser Compatibility (Chrome 110), and a History entry for 1.2.0.
- docs/prd.md marks accessibility (automated checks), extraction (popup), copy, and the shortcut as done, with the test names that prove them. Manual accessibility items stay open. docs/project-decisions.md adds ruling 31 and the Task 15 results for the open items of Task 13.
- Narrow layout rules, reduced motion, and forced colors moved from `src/popup/main.css` to the new `src/popup/adapt.css`, because `main.css` passed the 250 line limit.

### Fixed (release, plan B task 15)

- The example line under the format control was cut by an ellipsis at 320 px wide (400% zoom). At 360 px and below it wraps (`.example` in `src/popup/adapt.css`). Above 360 px the ellipsis stays, as spec 5.5 asks, and the full text stays in the page.
- A flaky end-to-end test: "keeps the popup 450 px wide and every control 44 px high" measured the controls before the clipboard button finished its move into Details (one button had height 0 in the full run). It now waits for the button in Details and names the control in a failure.
- Chrome check result: `chrome.windows.getCurrent()` in a headless service worker did not return a new focused window (the cause is not known), so the Task 13 open item 3 stays open for the owner.

### Changed (owner decision 17, option A)

- `sanitizeUrl` upgrades `http://` to `https://` for websites only. It leaves `http://` as typed for `localhost`, `127.0.0.1`, `[::1]`, and any host that ends in `.local` (new `isLocalHost` in `src/utils/urls.ts`). `urlKey` follows the same rule. A local dev server now opens instead of an error page.
- README (feature list, Security Features, History), spec section 6.1, and ruling 30 in docs/project-decisions.md say so. Open item 7 and carry-over 8 are resolved. Open item 9 (the 3 second title) stays open.
- Tests: new unit cases for each local host form and for look-alike hosts that still upgrade (`urls.test.ts`, `extract-urls.test.ts`, `clipboard.test.ts`, `open-plan.test.ts`, `tabs-source.test.ts`). The `urlKey` tests moved to `extract-urls-key.test.ts` to keep the 250 line limit. The e2e specs count tabs on `site.origin` and gain two tests: local addresses stay http, and a website upgrades to https.

### Fixed (end-to-end tests fix round, plan B task 14)

- Popup height: while Details is open, the clipboard button moves into the Details row (`App` reads the open state from the new `onToggle` prop of `DetailsPanel`). First run with Details open now measures 595.5 px (was 644 px). A new e2e test asserts it, and ruling 28 records the numbers.
- Tabs with a blocked or unsupported scheme (`file:`, `view-source:`, `data:`, `javascript:`, `devtools:`) no longer enter the list (`toTabRecord`). Unit tests cover each scheme.
- The focus ring e2e test now checks the 2 px offset and the accent color of every stop, in light and dark mode.
- Plan Global Constraint 2 and the Task 15 store-notes step list `clipboardWrite` as an optional permission.
- Owner choices still open: http versus https (spec 6.1 line 176 against Plan A), and the length of the "Open OpenList once to turn on copying." title. See open items 8 and 9 in docs/project-decisions.md.
- An earlier `npm exec pnpm@10 --version` wrote `~/.npm/_npx/a1a38f5f0f780954` and a log under `~/.npm/_logs`. Nobody removed them, because they sit outside the project root. The owner decides. Every later npx call uses the cache folder in temp/.

### Added (end-to-end tests, plan B task 14)

- tests/e2e/: fixtures (persistent Chromium context with the built extension, local http site, popup helper, tab counter, option that simulates the clipboard grant), and the specs `popup`, `copy`, `open`, `a11y`, `keyboard`, `dark-mode`, `metrics`. 38 tests pass in real Chromium (Vite 8 and CRXJS build): the service worker registers, the popup renders, the copy formats leave on the real clipboard, Open skips open URLs and stops at 20 tabs, axe finds no WCAG 2.1 A or AA violation in light, dark, default, error, Details-open, and status states, and the Tab order and the 2 px focus ring hold. No test waits on a fixed delay.
- `tests/e2e/a11y.spec.ts` replaces `a11y-smoke.spec.ts`. The axe run and the "passes is not empty" check live in its `violationsOf` helper.

### Fixed (end-to-end tests, plan B task 14)

- Copy lost the title of every http tab and wrote an https address: `urlKey` now maps http to https (ruling 26).
- A tab at a `chrome-extension://` address became a search term (ruling 27).
- The offscreen write failed in Chromium without `clipboardWrite`: the permission is optional and the one-time button asks for it with `clipboardRead` (ruling 25). 
- The popup was 614 px high with Details open: the list box is 116 px high, two gaps are 8 px, and the clipboard hint has one line. Details open now fits in 600 px after "Not now" and with access granted (ruling 28).

### Added (copy without the popup, plan B task 13)

- The command `copy-window` (suggested key Alt+Shift+C) and the toolbar menu item "Copy this window's tabs" copy the tabs of this window in the remembered format, with the popup filters. `src/background/copy-window.ts` loads the tabs, formats them, and sends the payload to an offscreen document (`src/offscreen/index.html` and `index.ts`, reason CLIPBOARD). The document closes after the write. The service worker never rejects.
- `src/background/feedback.ts`: a badge (check mark or exclamation mark, white text on `#0b57d0` or `#b3261e`) and a title with the result text. Both clear after 3000 ms. A second result restarts the timer.
- Manifest: permission `offscreen`, optional permission `clipboardRead`, `minimum_chrome_version` 110, `action.default_title`, and the `commands` entry.
- Schemas for the offscreen message and reply (`OffscreenCopyMessageSchema`, `OffscreenReplySchema`) and `CONFIG.COPY_WINDOW_MENU_ID`.
- Tests: feedback, copy-window, offscreen page, manifest, service worker listeners, and the two-item context menu.
- Build: `vite.config.ts` names the offscreen page as an input and gives zod a fixed chunk name. `.size-limit.json` now watches `zod-*.js` and `offscreen-*.js`. Knip finds the offscreen script through the vite config, so `knip.json` needs no new entry. Rulings 20 to 24 and the open items for Task 14 are in docs/project-decisions.md.

### Added

- Schemas `TabRecordSchema` and `SettingsSchema`, the ten copy formats and their three groups, the five source ids, and `getFormat` and `setFormat`, which keep the chosen format in `chrome.storage.local` (first-run format `URL`). Knip lists these three files in `ignoreFiles` (the unused-file report only), and `ignoreIssues` hides only the unused-type report for `src/schemas/tab.ts` and `src/schemas/settings.ts` (`TabRecord` and `SourceId`), so dead-function and dead-constant checks still run until the popup and the service worker import them. Remove the `ignoreFiles` and `ignoreIssues` entries from knip.json in the task that first imports these files.
- `formatTabs` and `formatExample` (src/utils/formatters.ts): the ten copy formats with escaping, group handling, and a CSV formula guard. Link and HTML table also return clipboard HTML. A tab with window id 0 (not matched by the lookup) gets an empty window field. The CSV guard also covers cells that start with a tab or carriage return. Knip lists the file in `ignoreFiles` and `ignoreIssues` until the popup imports it. Tests: tests/unit/utils/formatters.test.ts and formatters-escaping.test.ts.
- Layout guard test (tests/unit/project-layout.test.ts) that enforces the orientation folder layout, the 250-line file limit, and the purpose comment on line 1 of every guarded file.
- Bare-domain support: `example.com`, `example.com/path`, and `example.com:8080/a?b=1#c` now open as HTTPS URLs. Leading and trailing white space is trimmed.
- `markSessionStart` and lifecycle listeners that log one error and do not reject when storage fails.
- A promise queue that serializes metric writes, so two `openList` calls at the same time keep every count.
- `recordError` calls in the `openList` and context-menu catch blocks.
- Quality gates: `size-limit` (`.size-limit.json`), the `audit` script, `knip --production`, and a type check inside `build`.
- `docs/project-decisions.md`, which records the owner rulings of 2026-11-16.
- `.graphifyignore`, which keeps archived files, build output, and temporary files out of the knowledge graph.

### Changed (style guards, plan B task 12)

- The source guards in tests/unit/project-layout.test.ts now cover all of `src/` and `tests/`, including `src/popup/`, `src/components/`, and `src/hooks/`. The folder exclusion is removed. No source file needed a change. The guards for TSDoc, the explicit return type, and promise chains now read test files too (`guardedTestFiles` in tests/helpers/source-scan.ts). Two test exports had no TSDoc (`ROOT` and `test` in tests/e2e/fixtures.ts), and now have it.
- The return type guard now balances parentheses and braces, so destructured parameters and object return types are read correctly. Before, a destructured parameter hid the return type and the guard listed 11 typed files. The export finder also reads `export default function` and `export const name = (...) =>` forms. `hasExplicitReturnType` in tests/helpers/source-scan.ts is the one predicate that the guard and its proof test both call. The proof test checks sample declarations of each form.
- The file walk and export finders moved to tests/helpers/source-scan.ts, because the guard file passed the 250-line limit.

### Added (popup components, plan B task 11)

- The single-list popup. `src/components/` gains `UrlList`, `SourceSelect`, `ActionButtons`, `FormatSelect`, `StatusLine`, `DetailsPanel`, and `ClipboardPrompt`. `src/popup/App.tsx` wires `useSources`, `useFormat`, `useDetails`, and `useListActions` inside the existing `ErrorBoundary`, in the layout order of the design (h1, list and From, error, Open and Copy, Copy as and example, status, clipboard button, Details, footer).
- `src/popup/main.css` is rewritten from the tokens in `tokens.css`. `src/popup/panels.css` is new. It holds the error box, the clipboard prompt, Details, and the footer link, because the 250-line limit does not fit one file.
- Details shows "Open since" as a date and time in the user locale, or "Unknown" when the session start is not saved. It no longer shows an uptime duration.
- Tests: one file per component in `tests/unit/components/` (each with an axe scan), and `tests/unit/popup/App.test.tsx`, `App-actions.test.tsx`, and `App-panels.test.tsx`.

### Changed (popup components, plan B task 11)

- `ErrorDisplay` is now a `role="alert"` block and takes an optional `id`, so the list can point to it with `aria-describedby`.
- Open starts the Details read again after each Open. No timer runs in the popup.
- The status line shows the newest message. A source change or a result of Open or Copy replaces the earlier text.
- `ClipboardPrompt` hides "Not now" when no dismiss action is given. The copy in Details has no dismiss action.
- `knip.json` lost the 14 production entries and the `ignoreIssues` block (decision 18 in docs/project-decisions.md).

### Removed (popup components, plan B task 11)

- `StatusBar`, `MetricsGrid`, `useMetrics` (5-second polling), `useOpenUrls`, `src/utils/format.ts` (`formatDuration`, no caller left), and their tests.
- The `getCurrentTabUrls` message: the schema, the service worker handler, and their tests. The service worker now rejects it as an unknown action, and a test proves it.

### Notes (popup components, plan B task 11)

- The error box (`ErrorDisplay`, `role="alert"`) sits between the list and the buttons, as in spec section 5 item 4 and the mockup. `StatusLine` therefore takes only `message`. The plan named `StatusLine({ message, error })`.
- The empty-list error leaves the screen when the user types. `EMPTY_LIST_ERROR` in `useListActions.ts` names that error.
- In Details the clipboard button shares a row with Refresh, and the hint sits under the row, to save height.
- Height was not measured in this task. Task 14 measured it (see ruling 28).
- Press and hover movement of buttons applies only inside `@media (hover: hover) and (pointer: fine)`, and `prefers-reduced-motion` removes it.
- `Footer.tsx` needed no change: it already follows the manifest version (plan A task 11).
- `ClipboardPrompt` makes `onDismiss` optional. The copy in Details has no "Not now" button.
- The tab-order test checks the order of Details and the footer link by document position, because happy-dom does not skip the content of a closed `<details>`. Task 14 checks the real tab order in Chrome.

- The layout guard test still excludes `src/popup`, `src/components`, and `src/hooks`. A check with the exclusion removed passes every guard except the explicit return type guard. Its regex stops at the first `{`, so it misreads a destructured parameter such as `({ a, b }: Props): React.JSX.Element`. Task 12 fixed the regex, not the components (resolved in plan B task 12).
- The end-to-end specs in `tests/e2e/` still look for the old popup (`#openButton`, "Open URLs"). Task 14 rewrites them.

### Changed (Details totals, plan B task 8)

- Details totals (`tabsOpened`, `tabsFailed`, `urlsProcessed`, `lastError`) now live in `chrome.storage.local` under the key `totals`, so they survive browser restarts, updates, and reloads. The session start time lives in `chrome.storage.session` under `openSince`. Both are read through Zod schemas; corrupt data reads as zeros.
- `src/background/metrics.ts` moved to `src/utils/metrics-store.ts` with `getTotals`, `addTotals`, `recordError`, `markSessionStart`, and `getOpenSince`. `recordError` cuts a message to 300 characters so the totals stay bounded.
- `addTotals` takes the counter fields only (`tabsOpened`, `tabsFailed`, `urlsProcessed`). The plan type is `Partial<Totals>`. `lastError` changes only through `recordError`.
- `openList` now returns `opened`, the input lines that opened a tab, and calls `addTotals`.
- `useMetrics` reads `getTotals` and `getOpenSince` directly until Task 11 replaces it.
- Tests: `tests/unit/utils/metrics-store.test.ts` replaces the three metrics test files in `tests/unit/background/`. New helper `tests/helpers/chrome-storage.ts` and `tests/unit/background/open-list-opened.test.ts`.

### Removed

- The `getMetrics` message, `GetMetricsMessageSchema`, `MetricsResponseSchema`, `ExtensionMetricsSchema`, `DEFAULT_METRICS`, `batchIncrementMetrics`, and the `metrics` session key. A `getMetrics` message now gets the reply "Unknown action".

### Changed

- All tests moved to `tests/unit/` and `tests/e2e/`. Reports go to `output/`.
- The Footer reads the version from `chrome.runtime.getManifest()`. Link text and the `utm_campaign` tag follow the manifest version (1.1.0 gives `openlist_1_1_0`).
- Dependencies updated: zod 4, Vite 8, Vitest 5, happy-dom 21, Knip 6, CRXJS 3, and `@vitejs/plugin-react` 6.
- `engines.node` is `>=22`. The shared rules ask for Node 24 or later. The Node here is 22.22.3. See docs/project-decisions.md.
- README.md and docs/prd.md match the code: permissions, config names, Node and pnpm versions, and the version history.
- The legacy extension, the store assets, the old QA reports, and the zip files moved to `archived/`, `docs/store-assets/`, `output/reports/`, and `output/artifacts/`.

### Fixed

- Context-menu creation uses the callback form of the Chrome API and reads `runtime.lastError` inside the callback.
- ErrorDisplay uses unique list keys when two error details are equal.
- The blocked-protocol test runs the real URL functions, not spies.

### Removed

- Dead code from the audit: `ConfigSchema`, `METRICS_RETENTION_HOURS`, `UrlValidationResultSchema`, `incrementMetric`, `lastOperation`, `lastContextMenuCreation`, the unused service-worker state fields, the `ErrorBoundary` `fallback` prop, and the `retries` parameter of `createTab`.

### Security

- `pnpm run audit` (`pnpm audit --audit-level=high`) reports no known vulnerabilities. No advisory is open, and no `pnpm.overrides` entry exists.

### Project notes

- Task 11: the root allow-list in tests/unit/project-layout.test.ts gained `.graphifyignore`, because the plan creates that file at the root and the guard did not list it.
- Task 11: the Footer test also covers a second manifest version (2.10.3), to prove the link follows the manifest and does not hard-code 1.1.0.
- Task 11 review fixes: `graphify update .` ran and graph.json stays below the plan limit of 613 nodes (`jq ".nodes|length" graphify-out/graph.json` gives the live count). `graphify-out/` is tracked, and `.gitignore` keeps only `graphify-out/cache/` out.
- Task 11 review fixes: `qmd embed` on the shared default index cannot finish. That index holds about 6,500 pending documents (about 800 MB of text) from more than 200 collections of other projects. One run chunked for over 30 minutes with no output, and then the run was stopped. Other `qmd` runs on this machine also end with SIGABRT crash reports. `qmd embed` has no collection filter, so the OpenList documents cannot be embedded alone there. The shared index is not changed. BM25 for OpenList-docs, OpenList-docs-yaml and OpenList-output is current in the shared index.
- Task 11 review fixes (round 2): the OpenList-only index at `temp/qmd-home` (ignored by git) is now rebuilt by one project tool: `pnpm run index:qmd`, which runs `src/tools/qmd-index.sh`. The script writes the config, links the shared model folder, then runs `qmd update`, `qmd embed` and `qmd status`. Result: 29 documents, no pending documents. Query it with `HOME=$PWD/temp/qmd-home QMD_CONFIG_DIR=$PWD/temp/qmd-home/config qmd query "<concept>"`. Ruling 12 in docs/project-decisions.md is final as option (c): `temp/qmd-home` is the permanent index for this project. The lead chose it under the owner's standing instruction to keep working, and the owner may reverse it. The qmd rule is in CLAUDE.md under the heading Project notes, after the claude-setup end marker. A plain `qmd query` still reads the shared index, which has vectors for 2 of 29 OpenList documents.
- Task 11 review fixes (round 2): the `sample` tool wrote a 92 KB file to `/tmp` outside the project root. The owner gave permission, and the file is deleted. Resolved. Pass `-file temp/<name>` to diagnostic tools in future.
- Task 11 review fixes (round 4): the interim qmd rule sat inside the claude-setup managed block of CLAUDE.md. The block text is restored to the library text, and the rule moved after the end marker under the heading Project notes. Both markers are intact.
- Task 11 review fixes (round 3): the index tool moved with `git mv` from `docs/qmd-index.sh` to `src/tools/qmd-index.sh`, because orientation.md keeps source code in `src/`. `package.json`, `CLAUDE.md` and `docs/project-decisions.md` use the new path. `tests/unit/tools/qmd-index.test.ts` checks that `index:qmd` points to an existing file with a shebang and a purpose comment. The graph node count line no longer states a fixed number, so the next graph update cannot make it wrong.
- Task 11 review fixes (round 2): the last paragraph of docs/prd.md was chat boilerplate, not a requirement. It is deleted.
- Task 11 review fixes: README.md and docs/project-decisions.md name the gate as `pnpm run audit`. The bare `pnpm audit` is the built-in command, which fails on advisories of any level. The CHANGELOG entries of Tasks 2, 4, 5 and 10 moved under Unreleased. Only version headings stay at level 2.
- Task 8 and Task 9: `.size-limit.json` sets the `messages-*.js` limit to 28 kB. The plan text says 20 kB. The plan limit was not kept.
- Task 10 review fixes (round 2, dismissal): the clipboard button dismissal is saved in chrome.storage.local under the key `clipboardPromptDismissed` (src/utils/settings-store.ts: getClipboardPromptDismissed, setClipboardPromptDismissed). It uses its own key because setFormat writes the whole `settings` object. useSources reads it on mount in the same load and falls back to false when the read fails. dismissPrompt saves it, and a failed save keeps Details for the current visit. Tests: the new test in tests/unit/hooks/useSources-prompt.test.ts dismisses, unmounts, renders again on the same fake storage and expects 'details'. Four more cases cover no saved dismissal, a failed read, a failed save, and the store functions in tests/unit/utils/settings-store.test.ts. The prompt tests moved to tests/unit/hooks/useSources-prompt.test.ts because useSources.test.ts passed the 250-line limit.
- Task 10 review fixes (round 2, knip): the claim that knip exits 1 without the entries is true for `knip --production`. It is false for plain `knip`. Evidence: with an empty ignoreFiles, `knip --production` lists 14 unused files (the four hooks and ten utils and schemas files) and exits 1, while plain `knip` exits 0. The review ran only plain `knip`. The package script runs both. Removing the entries is therefore not possible before Task 11 wires the hooks into the popup. The 14 files moved from `ignoreFiles` to production `entry` patterns with the `!` suffix. Result: `knip --production` exits 0, `knip` exits 0, and neither prints a configuration hint. Task 11 handoff: remove these 14 entry lines from knip.json when App.tsx imports the hooks, then run both knip modes again. Until then, knip does not report unused exports in those 14 files.
- Task 10 review fixes (round 2, useFormat): the mount effect in src/hooks/useFormat.ts catches a failed storage read and keeps 'URL'. The new test makes chrome.storage.local.get reject once and expects 'URL'. Mutation check: changing `catch` to `finally` in the hook leaves all 5 tests green, but vitest exits 1 on the unhandled rejection, so the run catches a missing guard.
- Task 10 review fixes (round 2, tests): tests/unit/hooks/useSources.test.ts: the `.then()` chain is now an async function. A new case tests the boundary of exactly 2 clipboard URLs: source 'clipboard', notice 'Using 2 URLs from your clipboard.', option 'Clipboard (2 URLs)'.
- Task 10 review fixes (round 2, mutation check): each change below was made in the hook, the matching tests ran, and the hook was restored. (1) useListActions: ", skipped N already open" changed to ", skipped N open": fails "open() sends the batch only, removes the opened lines, and reports the skips". (2) `resumeText === text` changed to `resumeText !== text`: fails "after the first batch of 45 the label reads 'Open next 20 of 25'". (3) 'search term' changed to 'search': fails "copy() with search lines sets the skipped note" and "copy() names two skipped search terms in the plural". (4) "already open." changed to "open.": fails "open() names one open URL in the singular" and "open() when nothing opens ... 'All 6 URLs are already open.'". (5) useSources: the call to setClipboardPromptDismissed removed: fails "keeps the dismissal for the next time the popup opens". (6) useSources: the clipboard notice limited to more than 2 URLs: fails "picks 'clipboard' when the clipboard holds exactly 2 URLs". The tests can fail, and the hook code was restored after each run.
- Task 10 review fixes (dead code): src/background/context-menu.ts: createMenuItem is no longer exported. Plan B reuses it inside the same file, and `knip --production` reported it as an unused export. The direct createMenuItem tests are deleted. The initializeContextMenu tests (success, removeAll failure, retry after lastError, second failure) cover it.
- Task 10 review fixes (dead code): package.json: the `knip` script is now `knip --production && knip`. Plan mismatch: Task 8 Step 3 says to add this in "Task 10 Step 5", but Task 10 has no Step 5. Task 10 Step 3 runs `knip --production`. The script change is made here.
- Task 10 review fixes (dead code): src/utils/tabs.ts: TSDoc added to sleep. src/popup/main.css: purpose comment added on line 1. src/components/ErrorBoundary.tsx: TSDoc added to the class.
- Task 10 review fixes (dead code): tests/unit/components/ErrorBoundary.test.tsx: the logger test now spies on logger.error and asserts one call with 'ErrorBoundary caught' and the error message.
- Task 5 review fixes (TSDoc and command prefix): src/background/metrics.ts: every exported Promise<void> function now has an @returns tag (markSessionStart, setMetrics, incrementMetric, batchIncrementMetrics, recordError, setSwState).
- Task 5 review fixes (TSDoc and command prefix): Plan Global Constraints: the store path now comes from `export npm_config_store_dir=$PWD/temp/pnpm-store`. The `--store-dir` flag is removed from the command prefix, because pnpm reports "Unknown option: store-dir" when it runs with the flag.
- Task 4 review fixes (context-menu API): Failing-first evidence: the old src/background/context-menu.ts (HEAD b943aac) has no createMenuItem export and no removeAllMenuItems export. It awaits chrome.contextMenus.create without a callback. Tests (a), (b) and (c) in tests/unit/background/context-menu.test.ts therefore fail against HEAD.
- Task 4 review fixes (context-menu API): tests/setup.ts: makeCreateMock and makeRemoveAllMock have explicit return types.
- Task 4 review fixes (context-menu API): tests/setup.ts: the default runtime.lastError is now undefined, as in real Chrome. beforeEach resets it to undefined.
- Task 2 review fixes (tests layout): Added a line-1 purpose comment to every .ts and .tsx file under src and tests. The layout guard now checks this rule.
- Task 2 review fixes (tests layout): Split-out file tests/unit/schemas/metrics-response.test.ts now starts with a purpose comment.
- Task 2 review fixes (tests layout): Replaced the `.then()` chain in tests/unit/utils/tabs.test.ts with an async wrapper.
- Task 2 review fixes (tests layout): vite.config.ts changed in Task 2: Biome reordered its imports and added a blank line. No behavior change.
- Task 2 review fixes (tests layout): knip.json: `project` now covers src, tests and the root config files. Knip finds the vitest and playwright entries through its plugins, and it exits 0.
- Task 2 review fixes (tests layout): vitest.config.ts: removed the dead `src/**/*.test.*` coverage exclusions.
- Task 2 review fixes (tests layout): Gate commands: superseded by the Task 5 note below. Use `export npm_config_store_dir=$PWD/temp/pnpm-store` and call `pnpm` with no `--store-dir` flag. The `temp/.p.sh` wrapper is not the current method.
