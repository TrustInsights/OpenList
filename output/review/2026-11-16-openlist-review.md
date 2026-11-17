# OpenList review: orientation, Chrome rules, and Chisle lens

Date: 2026-11-16
Project root: /Users/cspenn/Documents/github/OpenList (branch master, version 1.1.0)

## Verdict

The code is in better shape than the project layout. All Tier 1 gates pass. The layout, the git rules, and the document set do not follow docs/orientation.md.

Seven items need your attention first. Items 1 to 4 are user-facing defects.

1. **Bare domains fail.** `example.com` opens no tab and reports "Invalid URL". `x.com`, `news.ycombinator.com`, and `example.com/path` open a Google search instead of the site. The tests assert the wrong behavior. (D1)
2. **The context-menu retry never runs.** `chrome.contextMenus.create` does not return a Promise or throw. A test mock hides this. (D2)
3. **Uptime and restarts show wrong values.** (D3)
4. **Two service-worker listeners can reject without a catch.** (D4)
5. **`.gitignore` hides `docs/`, `tests/`, `output/`, and `.claude/`.** New files in them never reach git. This report is in an ignored folder. (O1)
6. **`pnpm build` does not fail on a TypeScript error.** Rule 2.3 requires it. (R1)
7. **`pnpm audit` reports 54 issues.** One is a high issue in a production dependency (zod). (R3)

You answered the three rule questions on 2026-11-16 (section E). The work plan is in section F. The new copy-tabs feature is in section G. It copies tab fields only, not page text. The popup redesign and the WCAG 2.1 AA plan for the whole extension are in section H.

## Scope and method

- I read docs/orientation.md, docs/installedtools.md, docs/asd-ste.yaml, docs/rules-chrome-ext.md, docs/prd.md, README.md, and every non-test source file.
- I installed dependencies with pnpm 10 and ran the Tier 1 gates and the build.
- I applied the Chisle review lens (skill `chisle-review`: flag over-built and dead code, one finding per line).
- A second reviewer audited the repository from the rules alone. It did not see my findings. I re-checked its high and medium findings against the files and the tools. Each finding below carries a tag:
  - **[verified]** I reproduced it with a command or read the exact lines.
  - **[audit]** The second reviewer found it. I did not reproduce it.
- I did not run the Playwright end-to-end suite. It needs a browser download outside the project root.
- I did not load the extension in Chrome. Findings that depend on Chrome runtime behavior say so.

## Gate results (run on 2026-11-16)

| Gate | Command | Result |
|------|---------|--------|
| Biome | `pnpm biome check src/` | Pass. 48 files. |
| TypeScript | `pnpm tsc --noEmit` | Pass. |
| Vitest | `pnpm vitest run --coverage` | Pass. 21 files, 247 tests, 100% coverage on the measured files. |
| Knip | `pnpm knip` | Pass, but it cannot see test-only exports (R2). |
| Build | `pnpm build` | Pass. dist/ is 4 kB (service worker) plus 56 kB and 199 kB (popup). |
| Audit | `pnpm audit` | Fail. 54 issues: 4 critical, 27 high, 21 moderate, 2 low. |
| ESLint compat, size-limit | not configured | No script exists (R4). |
| Playwright | `pnpm playwright test` | Not run. |

Measured coverage excludes `src/background/index.ts`, `src/popup/index.tsx`, and `src/types/index.ts`. So the 100% figure does not cover the listener wiring in the service worker.

## A. Defects (the code does the wrong thing)

### D1. Bare domains fail or become searches (high) [verified]

Files: src/utils/urls.ts:22-27, src/utils/urls.ts:39, src/background/open-list.ts:41-48.

Evidence (I ran the real regex and the real `new URL` logic):

| Input | isProbablyUrl | sanitizeUrl | What the user sees |
|-------|---------------|-------------|--------------------|
| `example.com` | true | null | "Invalid URL: example.com" |
| `WWW.example.com` | true | null | "Invalid URL" |
| `x.com` | false | - | Google search |
| `news.ycombinator.com` | false | - | Google search |
| `example.com/path` | false | - | Google search |
| `www.example.com` | true | `https://www.example.com/` | Correct |

Cause: `sanitizeUrl` adds `https://` only when the text starts with lowercase `www.`. The domain regex needs a label of 3 or more characters, no sub-domains, and no path.
The test at src/utils/urls.test.ts:70-71 asserts that `example.com` is a URL. No test passes it through `sanitizeUrl`.
The README ("Automatically converts non-URL text into Google searches") and the PRD ("Sanitize and validate each URL") expect a working tab.

Fix:

1. In `sanitizeUrl`, add `https://` to any text with no scheme, and compare the scheme without case.
2. Replace the regex with a check that the text parses as a URL after you add the scheme, and that the host has a dot and a valid top-level label.
3. Add `openList` tests that use the real URL functions with the inputs in the table.

### D2. `contextMenus.create` is misused and a mock hides it (medium) [verified]

File: src/background/context-menu.ts:17-29.

`@types/chrome` 0.0.291 declares `removeAll(callback?): void` (index.d.ts:2017) and `create(props, callback?): number | string` (index.d.ts:2023). Its doc text says creation errors arrive in `chrome.runtime.lastError`. So `create` never throws, and the `catch` retry cannot run. A real failure also leaves an "Unchecked runtime.lastError" warning.
The tests pass because src/test/setup.ts:37-38 mocks both calls as Promises.

Fix: pass a callback and read `chrome.runtime.lastError`, or delete the retry. Make the mock match the real signature.
Unverified: whether Chrome 102 or later returns a Promise from `removeAll` at run time. Test in Chrome.

### D3. Uptime and restarts are wrong (medium) [audit; I read the code paths]

Files: src/background/metrics.ts:19, src/background/messages.ts:48, src/background/index.ts:16-22.

- `getMetrics` returns `startTime: Date.now()` when storage is empty, and it does not save the value. The uptime is about 0 on each poll until the first `openList` call. Then it means "time since first use", not worker uptime. The test at src/background/metrics.test.ts:16-28 asserts this.
- `chrome.storage.session` clears on browser restart, and `onStartup` fires only on browser start. So `restarts` is always 1. The log text "Service worker started" is wrong, because `onStartup` is not a worker start.

Fix: save `startTime` in `onInstalled` and `onStartup`. Delete `restarts`, or count it in `storage.local`.

### D4. Async listeners without a catch (medium) [audit; I read the code]

File: src/background/index.ts:9-22.

`onInstalled` and `onStartup` await `initializeContextMenu`, which its own TSDoc says can throw. The storage calls can also reject. Nothing catches them. Rule P4 says every Promise is awaited or caught.
Fix: wrap each body in try/catch, as the `onClicked` listener does at index.ts:26-31.

### D5. Context-menu path gives no feedback and no error record (medium) [verified]

- src/background/index.ts:28 sends the result only to `logger.info`. The logger prints nothing outside dev builds (src/utils/logger.ts:16, :26).
- No production code calls `chrome.action.setBadgeText`. Rule 5.5 requires it for background status. The only match is the test mock.
- `recordError` (src/background/metrics.ts:65) has no caller outside tests, so `lastError` stays null.
- The PRD (marked done) requires "user feedback on the number of URLs opened, failed, and skipped" for the context-menu path. README lines 50 and 58 promise "Error tracking and reporting".

Fix: set badge text with the counts after the context-menu `openList`. Call `recordError` in the catch blocks.

### D6. Smaller defects

- **D6a** [audit] src/popup/App.tsx:17-29: if the user types before the tab list arrives, `setUrlText` overwrites the typed text. Do not overwrite a non-empty textarea.
- **D6b** [audit] src/background/open-list.ts:35-38: lines past `MAX_TABS` (20) are dropped without notice. They do not enter `skipped` or `errors`. Count them and report them.
- **D6c** [audit] src/background/open-list.test.ts:59-60: the blocked-protocol test spies `isProbablyUrl` to true and `sanitizeUrl` to null. With the real functions, `javascript:alert(1)` is not a URL, so `openList` opens a Google search for the text. The test does not prove the block. Use the real functions.
- **D6d** [audit] src/components/ErrorDisplay.tsx:18: `key={d}` repeats if two failed lines are equal. Use an index-based key.
- **D6e** [audit] src/background/metrics.ts:49-59: `batchIncrementMetrics` is still a read-modify-write. A popup call and a context-menu call at the same time can lose a count. The comment at lines 44-46 overstates the fix.
- **D6f** [audit, unverified] src/background/index.ts:25-27: Chrome may flatten newlines in `selectionText`. A multi-line selection could then become one invalid line. Test in Chrome. The PRD requires a working list from a selection.
- **D6g** [verified] The PRD says the context menu must "Extract URLs from the selected text". The code splits on lines only. The PRD item is marked done. Either change the PRD or add extraction.

## B. Orientation compliance (docs/orientation.md)

### O1. `.gitignore` contradicts the layout [verified]

Lines 8 to 15 ignore `.claude/`, `data/`, `docs/`, `input/`, `logs/`, `output/`, `temp/`, and `tests/`. I confirmed with `git check-ignore`:

- `docs/prd.md` and `docs/orientation.md` are ignored. Only the two files in docs/reports/ are tracked.
- `.claude/hindsight-bank` is ignored. Orientation says to commit it.
- `output/review/` (this report) is ignored. 15 files in output/notes/ are tracked anyway.
- `tests/` is ignored, and it is empty.
- `.env`, `credentials.json`, `*.zip`, and `.DS_Store` are not ignored. Rule 2.2 requires secrets files in `.gitignore`.

Fix: ignore only machine-local paths. Keep the rest tracked. Run `git rm --cached` on the tracked build artifacts (O3).

### O2. Tests are not in tests/ [verified]

Unit tests sit beside the code in src/ (21 files). End-to-end tests sit in e2e/ (5 files). tests/ is empty and ignored. Orientation says "tests/ - All test files (unit, integration, e2e)". Rule P2 says unit tests go in `src/**/*.test.ts` and e2e tests in `e2e/`. The two documents conflict. See the rulings section.

### O3. Root clutter and generated files in git [verified]

| Item | Problem | Move to |
|------|---------|---------|
| extension-legacy/ (tracked) | Old code. It adds 50 of 613 nodes to the graphify graph. | archived/ |
| openlist-1.1.0.zip (tracked) | Build artifact | output/ and untrack |
| extension.zip (ignored) | Build artifact from 2025 | output/ or delete |
| playwright-report/ (tracked) | Generated | output/ and untrack |
| test-results/ (tracked) | Generated | output/ and untrack |
| .DS_Store, extension-legacy/.DS_Store (tracked) | Junk | untrack, ignore |
| chrome_store/ | Not in the layout. Store screenshots and icon. | docs/ |
| icon.png, icon.pxm | Source art at the root | docs/ |
| .worktrees/ | Empty folder | delete |
| AGENTS.md, CLAUDE.md | Untracked. The setup tool owns them. | commit them |
| claude-graphify-semantic.sh | Symlink to a script outside the project | confirm that you want it here |
| docs/reports/qa-*.md | Generated reports in docs/ | output/ |
| graphify-out/ | Untracked, 613 nodes | add .graphifyignore for archived/ |

Playwright and Vitest write reports to the root. Set their output paths to output/ or temp/ in playwright.config.ts and vitest.config.ts.

### O4. Missing and stale project files [verified]

- **No CHANGELOG.md.** Your global rules keep administrative notes there. output/notes/ holds 15 task-progress notes instead.
- **README.md:** the history stops at v1.0.0 (package version is 1.1.0). It says Node 18+ and pnpm 9+. The rules say Node 24+. Step "Click anywhere in the empty text area" is wrong, because the popup fills the list when it opens (src/popup/App.tsx:17-29).
- **docs/prd.md:** it lists permissions as `contextMenus` and `tabs` and says `storage` was removed. The manifest has `storage`. It names config constants `STATUS_TIMEOUT`, `METRICS_REFRESH_INTERVAL`, and `MAX_ERROR_DETAILS`. None exist. The code has `POLL_INTERVAL_MS` and `MAX_VISIBLE_ERRORS` as local constants. Every item carries a done mark, and I could not confirm the accessibility mark (see C6).
- **docs/reports/qa-final-2026-03-25.md** says 243 tests (now 247) and names a `.worktrees/` path that is empty.
- **src/components/Footer.tsx:5,9** says "OpenList 1.0" and uses `utm_campaign=openlist_1_0`. The version is 1.1.0.
- **docs/orientation.md** names `src/validate-manifest.sh`, `src/hooks/code_mode.py`, `src/claude_env.py`, and `src/lib-lock.sh`. None exist in this project. The file is a symlink to the shared library, so this text does not fit this project. The prefix rule for skills and plugins is met: all 10 skills use `skill-*`, all 3 plugins use `plugin-*`, and each declared name matches its folder.

### O5. Compliant

README.md is at the root. data/, input/, logs/, and references/ exist and are empty. No file uses /tmp. `.claude/hindsight-bank` names the bank `openlist`. docs/asd-ste.yaml and docs/installedtools.md exist. qmd indexes the docs. The `.claude/` skill and plugin names follow the prefix rule.

## C. Chrome rules compliance (docs/rules-chrome-ext.md)

| ID | Rule | Finding | Tag |
|----|------|---------|-----|
| R1 | 2.3 build fails on any TS error | `"build": "vite build"` (package.json:8). Vite does not type-check. Use `tsc --noEmit && vite build`. | verified |
| R2 | Tier 1 Knip | knip.json:3 puts test files in `project`, so a symbol used only by tests counts as used. `ignoreExportsUsedInFile` also hides `ConfigSchema`. Dead code passes (see section D). Use `knip --production`, or exclude `*.test.*` from `project`. | verified |
| R3 | Tier 2 Audit | 54 issues. Production: zod `<4.6.6` (high, memory exhaustion on large collections). The fix needs zod 4. Dev tools: vitest and tinypool (critical), happy-dom (critical), vite `<=6.4.3`, rollup under CRXJS, brace-expansion, postcss. Update the dev tools to patched versions. | verified |
| R4 | Tier 2 ESLint compat, size-limit, audit | No `audit`, `size-limit`, or compat script in package.json. | verified |
| R5 | P4 / Tier 1 scope | tsconfig.json includes `src` only. biome.json ignores `e2e`. So e2e code, vite.config.ts, and the other config files are never type-checked or linted. | verified |
| R6 | 2.1 file purpose comment | 17 non-test source files have no purpose comment on line 1: background/context-menu, index, messages, metrics, open-list; all 5 components; both hooks; popup/App and index; types/index; utils/logger and tabs. All e2e files lack it too. | verified |
| R7 | 2.4 TSDoc on exports | No TSDoc: `sleep` (utils/tabs.ts:5), `ErrorBoundary`, `ErrorDisplay`, `Footer`, `MetricsGrid`, `StatusBar`, `App`. | verified |
| R8 | 5.1 explicit return types | No return type on components in ErrorDisplay, Footer, MetricsGrid (2), StatusBar, App (2), and `handleKeyDown`. | audit |
| R9 | 2.1 file size 250 LOC | src/schemas/metrics.test.ts has 256 lines. | verified |
| R10 | 2.1 entry point names | Rule names background.ts, popup.tsx, content.ts. The project uses background/index.ts and popup/index.tsx. CRXJS works with both. Treat as a naming choice to confirm. | verified |
| R11 | Anti-pattern: mixing paradigms | src/background/messages.ts:36-65 and src/popup/App.tsx:18-29 use `.then().catch()`. The `onMessage` listener must return `true` at once, which explains the chains. An inner async function gives the same result and follows the rule. | verified |
| R12 | 5.2 Zod for all external data | Two casts skip Zod: `(urls as string[])` at App.tsx:23 and `(raw as { message?: string })` at useOpenUrls.ts:42. | verified |
| R13 | 5.3 strip logs in production | The logger calls `console` only in dev. The `console` references are gone from the service-worker bundle (I did not check the two popup chunks). The message strings stay in that bundle (for example "Context menu created"). | verified |
| R14 | 5.4 no flaky tests | playwright.config.ts:7 sets `retries: 1`. Three e2e tests use fixed sleeps (`waitForTimeout`: popup.spec.ts:23, keyboard.spec.ts:14, metrics.spec.ts:13). metrics.spec.ts:15-16 passes even if the page shows "Unable to load metrics". No e2e test covers the context menu. | audit |
| R15 | 5.4 Chrome mock library | The mock is hand-written (src/test/setup.ts). The rule names vitest-chrome or sinon-chrome. The hand-written mock hid D2. | verified |
| R16 | P3 manifest is documentation | src/manifest.json has no comments. A TypeScript manifest (`defineManifest` in CRXJS) allows comments. | verified |
| R17 | P4 literal `noImplicitAny` | tsconfig.json sets `strict: true`, which turns it on. The literal text of the rule asks for the explicit key. | verified |
| R18 | 5.5 skeleton loaders, badge | No Suspense skeleton. No badge call (see D5). | verified |
| R19 | 2.5 Node 24+ | No `engines` field. This machine runs Node 22.22.3. | verified |

### C6. Accessibility and UI

Section H replaces this list. It has the measured results and the full WCAG 2.1 table. Two items in the first draft of this list were wrong:

- A disabled button is exempt from the text-contrast rule (WCAG 1.4.3 exempts inactive components). White on #ccc is a design weakness, not a failure.
- The `#metrics` divider line is decoration. WCAG 1.4.11 does not apply to it.

### C7. Compliant [verified unless noted]

- Strict TypeScript. No `any`, no `@ts-ignore`, no `eval`, no remote code, no `console.*` in production code.
- Imports use the `@/` alias. No `../` in src. One `../dist` path string in e2e/fixtures.ts.
- Strict extension-page CSP in the manifest. Each permission has a use: `tabs` (read URLs), `contextMenus`, `storage` (session metrics).
- The service worker holds no global state. Listeners register at the top level. State lives in `chrome.storage.session`. Storage reads pass through Zod.
- The `useMetrics` interval stops in the effect cleanup. The popup is wrapped in an error boundary.
- No source file passes 250 lines. No component passes 100 lines.
- `.npmrc`, `vite.config.ts`, and `manifest.json` exist.

## D. Chisle findings (over-built and dead code)

Method: I searched with `rg` and excluded test files. Items marked (V) I re-ran myself. The rest come from the second reviewer.

```text
src/schemas/config.ts:5: (V) ConfigSchema validates a constant that code writes itself; only tests use it. Delete it and keep a typed object.
src/schemas/config.ts:8: (V) METRICS_RETENTION_HOURS has no reader. Delete it.
src/schemas/urls.ts:5: (V) UrlValidationResultSchema has no reader. Delete it.
src/background/metrics.ts:35: (V) incrementMetric has no caller; batchIncrementMetrics replaces it. Delete it.
src/background/metrics.ts:65: (V) recordError has no caller. Call it (D5) or delete it.
src/schemas/metrics.ts:11,18: (V) lastOperation and lastContextMenuCreation are never written. Delete them.
src/background/messages.ts:47: (V) serviceWorkerState is sent, but useMetrics.ts never reads it. Delete it or show it.
src/components/ErrorBoundary.tsx:6: (V) the fallback prop has no caller outside tests. Delete it.
src/popup/main.css:96: (V) the .error rule has no user. Delete it.
src/utils/tabs.ts:15: the retries parameter never varies. Make it a constant.
src/hooks/useMetrics.ts:35, useOpenUrls.ts:37, App.tsx:20: Schema.parse() on literals the code builds. Send the literal.
src/components/StatusBar.tsx:5: a one-line wrapper around <span>. Inline it.
src/hooks/useMetrics.ts:49-59: hand-written equality guard in setState. React already skips equal state. Delete it.
src/background/messages.ts:59-66: a worker round trip for tabs.query. The popup can call chrome.tabs.query itself.
src/test/setup.ts:15,23,31-34,44-47: mocks for storage.local, action.*, onMessage.removeListener, lastError. No production code calls them. Delete them.
```

15 findings. Est. 120 lines removable, plus their tests.

Limit on this list: item "popup calls chrome.tabs.query itself" removes a message type. Rule P5 and the PRD do not require the round trip. Confirm that the `tabs` permission stays in the popup context (it does, because permissions apply to the whole extension).

## E. Rulings (answered by you on 2026-11-16)

| # | Question | Your ruling | Effect on the plan |
|---|----------|-------------|--------------------|
| 1 | Test location | The orientation document wins over the Chrome rules in any conflict. | All tests go in `tests/`. Unit tests move out of `src/` into `tests/unit/`. End-to-end tests move from `e2e/` to `tests/e2e/`. |
| 2 | `webext-bridge` | Skip it. | Keep the Zod-validated runtime messages. Record the exception in docs/. |
| 3 | Tier 2 tools | Add `size-limit` and an `audit` script. | Add both to package.json. Skip `eslint-plugin-compat` and `vitest-chrome` (you did not ask for them). |
| 4 | Start on defects | Build everything into the plan first. More planning follows. | No code changes until the plan is final and you approve it. |
| 5 | Copy-feature approach | Approach A: a "Copy" view next to "Open URLs" (2026-11-16). | Section G and section H3. |
| 6 | Accessibility test dependencies | Yes to `vitest-axe` and `@axe-core/playwright` (2026-11-16). | Installed after the design document is approved. |
| 7 | Mockup | Yes, in light and dark mode (2026-11-16). | Section H8. |
| 8 | Filled button | Open is the filled button. Copy is the plain button. The positions and the styles never change. Ctrl or Cmd+Enter runs Open (2026-11-16). | Section H3 and the next mockup. |
| 9 | Clipboard | Yes, read the clipboard when the popup opens, only to find URLs (2026-11-16). | Needs the `clipboardRead` permission. Rules: never store the text, never send it out, use it only if it holds URLs, otherwise ignore it. Update the README privacy text and the store permission note. Test in Chrome that the popup can read the clipboard. |
| 10 | Clipboard threshold | Two or more URLs (2026-11-16). One copied URL is ignored. | When the clipboard is used, the tab control reads "Clipboard (N URLs)" and the user can switch it to "This window". |
| 11 | Already-open URLs | Open skips a URL that is already open in the window and reports it, for example "Opened 4, skipped 2 already open." (2026-11-16). | Section H3. |
| 12 | Edit then change scope | A scope change replaces the list. The status line says so, for example "List replaced with 12 tabs from all windows." (2026-11-16). | Section H3. |
| 13 | Details update | The numbers update when the popup opens and after each Open. A "Refresh" button is available. No 5-second polling (2026-11-16). | Fixes WCAG 2.2.2. |
| 14 | Layout version 5 | Approved (2026-11-16). | Section H9. The design document will cite this table. |
| 15 | Copy without the popup (D8) | Yes (2026-11-16). A keyboard shortcut and a toolbar-icon right-click item copy this window's tabs in the remembered format. The badge shows the result. | Needs the `offscreen` permission and Chrome 109 or later (the minimum rises from 102). Test in Chrome: whether `offscreen` adds an install warning, and whether the clipboard write works from the offscreen page. |
| 16 | After the 20-tab cap (D9) | The URLs that did not open stay in the list. The opened ones leave it. The button then reads "Open next 20 of 25" (2026-11-16). | Also fixes defect D6b (silent drop). |
| 17 | By window grouping (D10) | Yes (2026-11-16). In "All windows", a blank line separates the windows in the list. Every format keeps those groups. | No new control. |
| 18 | Tab groups (D11) | Deferred. My call, on the advisor's advice: it needs the `tabGroups` permission and a naming rule. | Listed as deferred in the design document. |
| 19 | Builder check (2026-11-16) | Seven questions. Six settled as my calls (design doc section 0). One needs your decision: D12, the `clipboardRead` permission model. | The Chrome docs check says `clipboardRead` shows an install warning. |
| 20 | Clipboard permission model (D12) | Optional permission (choice B, 2026-11-16). A one-time "Turn on clipboard detection" button asks for it. | Design document sections 3 and 7. The update turns no existing user off. |
| 21 | Details totals (D14) | Success rate, tabs opened, and errors are kept in `chrome.storage.local` and survive restarts. "Open since" stays tied to the browser session (2026-11-16). | Design document section 5.6. |

Consequences of ruling 1. The ruling applies to every later conflict too:

- Update `vitest.config.ts` (`include`, `setupFiles`, coverage), `tsconfig.json` (`include`), `knip.json`, `biome.json`, and `playwright.config.ts` (`testDir`) to the new paths.
- Test files import with the `@/` alias. They stop using `./` imports. This also meets rule 2.1.
- Remove `tests/` from `.gitignore`.
- The 250-line limit and the purpose-comment rule still apply to the test files. Split `schemas/metrics.test.ts` (256 lines).
- Rule P2 text ("unit tests in `src/**/*.test.ts`") no longer applies to this project. Record the ruling in docs/ (for example docs/project-decisions.md), because the shared rules file is a read-only link.
- A conflict I already saw: orientation says root holds only README.md (AGENTS.md and CLAUDE.md are written by the setup tool, so I treat them as exempt). Confirm.

## F. Work plan (nothing below is started)

Phases run in the order of the table. Each phase ends with the full gate: Biome, `tsc`, Vitest, Knip (production mode), build, and audit. Each phase is one commit. Phase 1 starts with a failing test.

| Phase | Work | Items |
|-------|------|-------|
| 1 | Git hygiene. It must come first, because `tests/` is ignored now and git would drop moved tests. | O1, O3 (untrack artifacts, fix `.gitignore` including `.superpowers/` and `temp/`, commit CLAUDE.md and AGENTS.md). The design document in `docs/superpowers/specs/` stays untracked until this phase fixes `.gitignore`. |
| 2 | Test layout move (ruling 1) | O2 and the consequences list in section E |
| 3 | User-facing defects, test first. Each new test is written once, in `tests/`. | D1 to D6 |
| 4 | Gates | R1 (build type-checks), R2 (Knip), R4 (add `size-limit` and `audit` scripts), R5 (e2e and config under lint and type-check), R14, R15 |
| 5 | Dependencies | R3: zod 4 migration (schemas, tests), then dev-tool updates. Run the gate after each update. |
| 6 | Dead code | Section D deletions. Run Knip in production mode after. |
| 7 | Layout and documents | O3 moves, CHANGELOG.md, README, PRD, Footer text (O4), `.graphifyignore`, `graphify update .`, qmd re-index |
| 8 | Design system and WCAG 2.1 AA for the whole extension, then the style rules | Section H (tokens, popup layout, every failing criterion, automated and manual accessibility tests), then R6 to R13 and R16 to R19 |
| 9 | New feature: copy tab fields (title, URL, and other tab data) in many formats | Section G. It starts only after phases 1 to 6 and phase 8 pass. Only phase 7 runs in parallel. The new view is built on the phase 8 design system, so it is accessible from the first commit. |

Phase 9 depends on phases 1 to 6 and phase 8. The `getCurrentTabUrls` round trip (Chisle item "popup can call chrome.tabs.query itself") is removed inside phase 9, when the new popup stops using it. The implementation plans are docs/superpowers/plans/2026-11-16-openlist-foundation.md (phases 1 to 7) and 2026-11-16-openlist-popup-copy.md (phases 8 and 9).

## G. New feature: copy tab fields in many formats (clean-room plan)

### G1. Status

This section is a plan for a brainstorm. No design is approved. I wrote no code.
The "reverse engineer anything" tool exists on this machine as the MCP server `rea` (`npx -y rea-agents@6.7.0 mcp`, in ~/.claude.json). **This project denies it.** `.claude/settings.local.json` lists `rea` in `deniedMcpServers`, because the setup tool denies every server that no selected category allows. So I did the analysis by hand, from the screenshot alone. To turn the server on, run `claude-setup --allow rea` and start a new session. I did not run it, because it rewrites `.claude/settings.local.json`. After that I can redo the extraction and compare it with G3.

The screenshot is saved at docs/clean-room/2026-11-16_10-55-15-reference-screenshot.png. The original was in a macOS temporary folder that the system clears.

### G2. Clean-room rules for this feature

1. The only source is the screenshot you gave me. Nobody opens, installs, decompiles, or reads the code or store page of the other extension.
2. The written spec (G3) lists only what the picture shows. It marks every guess as a guess.
3. The builder works from the spec and from our own decisions, not from the picture's styling. Our labels, icons, colors, and layout come from OpenList's own theme (src/popup/main.css).
4. **Exception on 2026-11-16.** You asked for competitor research. The research agent fetched the store listing of a product named "Tab Copy". Its format list (Link, URL, Title & URL, Markdown, CSV, JSON, HTML) is close to the screenshot's. I do not know whether the screenshot shows that product. Every idea that came from the research carries its source in section J, apart from the screenshot spec. The builder must not copy that product's wording, layout, or styling.
5. The spec goes in docs/ with the screenshot's date and file name, so you can show the process later. This is an engineering control. It is not legal advice.

### G3. What the screenshot shows (observed) and what it hints at (inferred)

Observed:

- O-1. A dark popup, one column, about 260 px wide.
- O-2. A centered title, "COPY". A small icon at the left of the title. An info icon and a heart icon at the right.
- O-3. Four wide buttons, stacked: "This tab", "This window's tabs", "All tabs", "All tabs by window".
- O-4. A row "Copy as:" with a current value, "Title: URL", and an arrow that points up (the row looks open).
- O-5. Ten small chips under that row: Link, URL, Title & URL, Title, Markdown, BBCode, CSV, JSON, HTML, HTML table.

Inferred (not proven by the picture):

- I-1. A click on one of the four scope buttons copies the data for that scope in the chosen format.
- I-2. The chosen format stays selected between uses. The picture does not show this.
- I-3. "Title: URL" is the name of the chosen format. It does not match any chip, so it may be a custom template. The picture does not say.
- I-4. The left icon opens settings or a menu. The info icon opens an about page. The heart icon opens a support or review page.
- I-5. "All tabs by window" groups the output by window. The picture does not show how.

Not shown at all: what feedback appears after a copy, what "Link" produces, whether the output is rich text or plain text, how it treats pinned tabs, internal pages, or other windows' tabs, and any keyboard use.

### G4. Scope ruling (user, 2026-11-16)

The feature copies **tab fields only**: the page title, the page URL, and any other field the tab itself exposes. It does not copy page text. The user's purpose: move a set of tabs into other applications through the clipboard, so other people can use it. That is why the picture offers so many formats.

This drops the "page contents" work from the first draft of this plan. Effects:

- New permission: none. OpenList already holds `tabs`. That permission gives `title`, `url`, `pendingUrl`, and `favIconUrl`.
- No `scripting` permission, no host access, and no change to the README privacy statement.
- The data never leaves the browser. Nothing is read from a web page.

### G5. What a tab exposes with today's permissions

I read the `Tab` type in `@types/chrome` 0.0.291. These fields need no new permission beyond `tabs`:

| Field | Note |
|-------|------|
| `title`, `url`, `pendingUrl`, `favIconUrl` | Need `tabs` (we have it). `favIconUrl` can be empty while a page loads. |
| `id`, `index`, `windowId`, `openerTabId` | Position and ownership |
| `active`, `highlighted`, `pinned`, `audible`, `discarded`, `autoDiscardable`, `incognito`, `status`, `mutedInfo` | State flags |
| `groupId` | A number only. The group name and color need the `tabGroups` permission, which is new. |
| `lastAccessed` | Chrome 121 or later. The manifest minimum is 102, so treat it as optional. |
| `width`, `height`, `sessionId` | Low value for a copy feature |

`chrome.windows.getAll({ populate: true })` returns every window with its tabs and needs no extra permission. It serves the scopes "All tabs" and "All tabs by window" in one call.

### G6. Plan items after the spec is settled

| Step | Work |
|------|------|
| G-1 | You pick the approach (brainstorm, in progress). I write the design document: docs/superpowers/specs/2026-11-16-copy-tabs-design.md. |
| G-2 | A builder check reads the design. You approve it. |
| G-3 | Write the clean-room spec (G3) into docs/clean-room/. The screenshot is already there. |
| G-4 | Test first. Pure formatter functions in `src/utils/`, one per format. A Zod schema for the tab fields we copy and for the format list. Tests in `tests/unit/`. Escape rules for each format: HTML, Markdown, BBCode, CSV (including cells that start with =, +, -, or @, which spreadsheets run as formulas), and JSON. |
| G-5 | Popup view, as the chosen approach says and as section H designs it: scope, format, live preview, one Copy button. Store the chosen format in `chrome.storage.local` and read it back through Zod. Reuse the status bar for feedback. Set the badge text for the count. |
| G-6 | Clipboard. `navigator.clipboard.writeText` for plain text. `ClipboardItem` with both `text/html` and `text/plain` for the HTML formats. Test in Chrome, because the mock cannot prove it. |
| G-7 | End-to-end tests in `tests/e2e/`: copy each scope and format in a real Chrome with several windows. Wait on a real condition. Do not use fixed sleeps. |
| G-8 | Update README, PRD, the manifest version, and the footer. Add the CHANGELOG entry. Run `graphify update .` and re-index qmd. |

## H. Popup design and WCAG 2.1 AA (whole extension)

### H1. What I used from /design-taste-frontend, and what I did not

The skill builds full websites. It has a build, deal, and gate pipeline for landing pages: hero screens, photographs, effects, section heights. None of that fits a 450 px popup, so I did not run the skill's scripts. I used its rules for interface craft only:

- One strict system. One button pair. One radius scale. One accent. Flat neutral grounds.
- Exactly one filled button marks the main action in a view. Every other button is secondary.
- Controls 44 px high. Labels you can see above fields. A placeholder is never the label.
- Text contrast 4.5:1 or more. Nothing under 13 px. Sentence case. Buttons say a verb and an object.
- The focus ring is 2 px, shows at once, and has 3:1 on the ground. Hover steps the button 1 px. Press sinks it 1 px. Hover and press movement only runs for a fine pointer, and it stops under reduced motion.
- No caption under a picture. No gradient, glow, or shadow stack.

One deliberate difference: the skill sets reading text at 16 px for web pages. A popup is dense, so I propose 14 px body text and 13 px labels. That is your call.

### H2. Why the reference popup looks bad (from the picture only)

- Four wide slabs have equal weight. Nothing says which one matters.
- The ten format chips are tiny, with thin borders and gray text on dark gray. They are hard to see and hard to hit.
- The "Copy as: Title: URL" row is unclear. The arrow is ambiguous. The picture shows no output, so the user cannot see what a format does until after the copy.
- Gray on gray everywhere. The title and the icons are faint. The controls have no labels you can read at a glance.
- There is no visible result or feedback.

### H3. Design proposal for the Copy view

The rule of the design: **choose, see, copy.** The user picks what to copy and how. A live preview shows the real output. One primary button copies it.

```text
OpenList                              [ Open | Copy ]     <- two tabs
------------------------------------------------------
What to copy
[ This tab | This window | All windows | By window ]     <- one segmented choice
Format
[Link][URL][Title][Title & URL][Markdown]                 <- 2 rows of 5 radio chips
[BBCode][CSV][JSON][HTML][HTML table]
Preview - 12 tabs
+----------------------------------------------------+
| - [Example page](https://example.com)              |   <- read-only, monospace
| - [Another page](https://example.org)              |
+----------------------------------------------------+
[ Copy 12 tabs ]                                          <- the one filled button
Copied 12 tabs as Markdown.                               <- role="status"
```

Design choices, each with its reason:

- **Live preview.** It answers "what will I get?" before the copy. The existing text area already works this way for the Open view, so the popup keeps one pattern.
- **One filled button.** The button label states the count: "Copy 12 tabs". This follows the skill's rule of one main action per view.
- **Scope as one segmented choice and format as radio chips.** Both are native radio inputs in a `fieldset` with a visible `legend`. The keyboard gets arrow-key movement for free, and a screen reader hears "radio, 3 of 10, selected".
- **Hit size.** Each chip is 44 px high. Ten chips in 2 rows of 5 fit the 450 px width (about 85 px per chip). The whole view stays under Chrome's 600 px popup height limit.
- **Colour.** About 95% neutral. One accent. The accent is the primary button, the focus ring, and links.
- **Both themes.** The popup follows the system theme with the same tokens, so the layout in dark and light is the same.
- **Metrics.** Move them into a closed "Details" disclosure, read once when the popup opens (see 2.2.2 below). They are low value and they are the only auto-updating content.
- **No decorative icons.** The reference popup has three faint icons with no clear purpose. We use text.

### H4. Measured color results (computed from src/popup/main.css)

I computed the contrast ratio of each token pair. Required: 4.5:1 for text (1.4.3), 3:1 for control borders and focus rings (1.4.11).

| Result | Ratio | Pair |
|--------|-------|------|
| FAIL | 3.88:1 | Footer link, #1a73e8 on #eee (light) |
| FAIL | 4.05:1 | Error text on the error box (light) |
| FAIL | 3.70:1 | Error text on the error box (dark) |
| FAIL | 4.27:1 | Metric value, #1a73e8 on #f8f9fa (light) |
| FAIL | 1.61:1 | Text-area border on its background (light), 3:1 needed |
| FAIL | 2.37:1 | Text-area border on its background (dark), 3:1 needed |
| Pass | 10.89:1 and 13.36:1 | Body text (light and dark) |
| Pass | 5.21:1 and 6.10:1 | Status and detail text (light and dark) |
| Pass | 4.51:1 | White on the primary button (passes by 0.01) |
| Pass | 3.88:1 and 7.64:1 | Focus ring on the page (light and dark) |

Proposed token fixes. I computed each pair:

| Token | Light | Dark |
|-------|-------|------|
| Accent, links, metric value | #0b57d0 (5.50:1 on #eee, 6.39:1 on white) | #8ab4f8 (7.64:1, unchanged) |
| Primary button | white on #0b57d0 (6.39:1) | #202124 on #8ab4f8 (7.64:1) |
| Error text | #b3261e on #fce8e6 (5.55:1) | #f9b4ae on #402022 (8.40:1) |
| Control border | #767676 (4.54:1 on white, 3.91:1 on #eee) | #8e918f (4.51:1 on #292a2d, 5.06:1 on #202124) |

### H5. WCAG 2.1 A and AA: status of the popup

Evidence key: **computed** (I computed it), **code read** (I read the source), **untested** (needs a browser or a screen reader). I have not run a screen reader, an axe scan, or a zoom test. No result below comes from assistive technology.

| Criterion | Status | Evidence and fix |
|-----------|--------|------------------|
| 1.1.1 Non-text content | Pass | The popup has no images. Code read. |
| 1.3.1 Info and relationships | FAIL | The text area has no label (App.tsx:44-52). The error box is not tied to its field. Add `<label>`, `aria-describedby`, `aria-invalid`. Code read. |
| 1.3.2, 1.3.3, 1.3.4, 1.3.5 | Pass or not applicable | Code read. |
| 1.4.1 Use of color | Pass | Errors carry text as well as color. Code read. |
| 1.4.3 Contrast (text) | FAIL | Four pairs in H4. Computed. |
| 1.4.4 Resize text 200% | Untested | The body is fixed at 450 px. Test at 200% browser zoom. |
| 1.4.10 Reflow | Untested | The popup cannot reflow below 300 px. Make the width `min(450px, 100vw)` and test at 400% zoom. |
| 1.4.11 Non-text contrast | FAIL | Text-area border, both themes (H4). Computed. |
| 1.4.12 Text spacing | Untested | Fixed heights may clip. Test with a text-spacing override. |
| 1.4.13 Content on hover or focus | Pass | The only hover text is a native `title`. Code read. |
| 2.1.1 Keyboard, 2.1.2 No trap, 2.1.4 Shortcuts | Pass | Native controls. Ctrl+Enter uses a modifier. Code read. Test the Tab order in Chrome. |
| 2.2.2 Pause, stop, hide | FAIL | `useMetrics` updates the visible metrics every 5 seconds with no way to stop it. Read the metrics once, on open, or add a pause control. Code read. |
| 2.4.2 Page titled | Pass | `<title>OpenList</title>`. |
| 2.4.3 Focus order | Pass | Code read. |
| 2.4.6 Headings and labels | Not applicable | The criterion needs headings and labels to describe their purpose where they exist. It does not require a heading. Add an `h1` as good practice. |
| 2.4.7 Focus visible | Pass, weak | Custom ring on the text area and the button only. It uses `:focus`, not `:focus-visible`. The footer link uses the browser default. Define one ring for every control. Code read. |
| 2.5.3 Label in name | Pass | Button text "Open URLs" is in its name. Code read. |
| 3.1.1 Language | Pass | `<html lang="en">`. |
| 3.3.1 Error identification | Partial | The message is text, but it is not linked to the field. |
| 3.3.2 Labels or instructions | FAIL | The text area has only a placeholder. |
| 4.1.2 Name, role, value | FAIL | The text area has no accessible name. |
| 4.1.3 Status messages (new in 2.1) | FAIL | The status line has no `role="status"`. The error box has no `role="alert"`. The metrics region has `aria-live="polite"` and re-announces every 5 seconds. Code read. |

### H6. Other surfaces of the extension

| Surface | Finding | Fix |
|---------|---------|-----|
| Toolbar icon | The manifest has no `action.default_title`. | Add a title that names the action. |
| Keyboard access | The manifest has no `commands` entry for the popup. | Add `_execute_action` with a suggested shortcut. This gives a documented keyboard path to the popup. |
| Context menu | It is browser UI. The title "Open selected URLs in new tabs" is clear. | None. |
| Badge text (planned in D5 and G-5) | A badge must not be the only signal. Its background needs 4.5:1 with its text. | Pair it with the status line. Choose the colors from the token table. |
| Forced-colors mode (Windows high contrast) | No rule exists. | Add `@media (forced-colors: active)` styles for focus and borders. |
| README and docs | The README has a plain structure. It has no image without text. | Add an accessibility statement. |

### H7. How we prove it (tests and records)

1. **Token test (unit).** A test reads the color tokens from the CSS and asserts every text pair is 4.5:1 or more and every border and ring is 3:1 or more, in both themes. It fails the build if a token changes and breaks contrast. This is the real contrast gate, because axe cannot check contrast in happy-dom (it has no layout). It needs no browser.
2. **Component tests.** `vitest-axe` runs on each component. It asserts no violations with the WCAG 2.1 A and AA rule tags. Run it once under happy-dom before we rely on it. If it fails there, a per-file `// @vitest-environment jsdom` needs `jsdom`, which is one more dependency to approve.
3. **End-to-end scan.** `@axe-core/playwright` scans the real popup in light and dark themes, with the tag set `wcag2a, wcag2aa, wcag21a, wcag21aa`. It lives in `tests/e2e/`. Playwright's Chromium downloads to `~/Library/Caches` by default, which is outside the project root. Set `PLAYWRIGHT_BROWSERS_PATH=temp/ms-playwright` so the download stays inside the root.
4. **Manual pass, written to docs/accessibility.md.** Keyboard only. VoiceOver on macOS. 200% zoom and 400% reflow. Text-spacing override. Forced colors. A tool finds only part of the WCAG failures, so I will not call the extension compliant until this pass is done and recorded. The record states the standard (WCAG 2.1 AA), the date, the method, and the known gaps.
5. **Gate.** The `pnpm check` script runs the token test and the component tests. The end-to-end scan runs in `pnpm test:e2e`.

You approved both new dev dependencies (`vitest-axe`, `@axe-core/playwright`) on 2026-11-16. I install them only after you approve the design document, because the brainstorming gate counts an install as building.

### H8. Mockup results (clickable, light and dark)

A throwaway mockup shows six frames: the Copy and Open views in light and dark, an error state, a keyboard focus state, and the Details disclosure. Each popup is exactly 450 px wide. The mockup files are in `.superpowers/brainstorm/5627-1794845633/content/` (latest: `popup-mockup-v4.html`). The frames use sample tabs on example domains and the real format output for each format.

I measured the mockup in headless Chrome:

| Measure | Result |
|---------|--------|
| Chip width (5 per row, 6 px gaps) | 80.4 px. "Title & URL" and "HTML table" fit on one line with no clipping. |
| Copy view height, Details closed | 586 px. It fits the 600 px limit. The first draft was 610 px. I removed the reserved hint line and moved its text into the preview label. |
| Open view height | 435 px (light, no error) and 481 px (dark, with the error box). |
| Copy view height, Details open | 709 px. It does not fit. Chrome scrolls the popup. Decision for you: keep Details (rarely open, so scrolling is acceptable) or drop the metrics. The Chisle list already marks the metrics as low value. |

I computed the contrast of 24 token pairs of the mockup (text, selected states, borders, focus ring, primary button in rest and hover states, error box). All pass. Smallest margins: the light primary button (6.39:1), the dark selected-chip border (4.64:1 against 3:1), the dark chip border on its surface (4.51:1 against 3:1).

Decisions the mockup carries into the real code:

- **Open | Copy switch.** Two buttons in a group, each with `aria-pressed`. I did not use `role="tablist"`, because that role needs the full tab keyboard pattern (arrow keys, `aria-selected`, linked panels). Two toggle buttons need none of it.
- **Scope and format.** Native radio inputs in a `fieldset` with a `legend`. Selected state is a fill, a heavier border, and a bold label, so color is not the only cue.
- **One filled button per view.** Selected chips use a tonal fill. Only "Copy N tabs" and "Open URLs" use the solid accent.
- **Rich-text formats.** Link, HTML, and HTML table copy rich text. The preview shows the plain-text version, and the label says so.
- **Disclosure.** `<details>` with a chevron. It has a 44 px summary.
- **Open view.** The text area now has a visible label above it, and the error box uses `role="alert"` with `aria-invalid` and `aria-describedby` on the field.

Not yet checked: a real screen reader, the real clipboard, the Windows forced-colors look, and the focus order inside the real popup.

### H9. Mockup version 5: one list, two verbs (your decisions 1 to 13)

The layout, from top to bottom: the URL list, the "From" control, the filled "Open" button and the plain "Copy" button, the "Copy as" format dropdown with a one-line example, a status line, the Details disclosure, and the footer link. The file is `popup-mockup-v5.html` in the same folder as the earlier versions.

Measured in headless Chrome:

| Measure | Result |
|---------|--------|
| Height, Details closed | 491 px |
| Height, Details open | 594 px. It fits the 600 px limit. |
| Height, error state | 520 px |
| Button size | Open 230 px wide, Copy 188 px wide, both 44 px high |
| Longest label, "Copy 45 as HTML table" | Wraps to two lines. Both buttons grow to 46 px. It fits. |
| Example line | Cut with an ellipsis when the item is long. The full text is copied. |

Not yet checked: the real clipboard read, the select-all on open, and the behavior in a real extension popup.

## J. Competitor research (2026-11-16, Haiku agent, 6 searches and 6 fetches)

Scope: free and commercial tools that open a pasted URL list or copy tab URLs and titles. The agent returned 8 products. Most are free or open source. Pricing is unverified for most of them. The agent could not answer: accessibility, undo, duplicates, pinned tabs, browser-internal pages, clipboard detection, and large-list limits.

| Product | What it does | Source |
|---------|--------------|--------|
| Open Link List | Opens a pasted list. Remembers group name and color. | github.com/Daidaros/open-link-list |
| Open Multiple URLs | One URL per line. Opens into tab groups. | Chrome Web Store (snippet only) |
| URL Bulk Opener | Delay between tabs. Pause and resume. | addons.mozilla.org (snippet only) |
| Copy URL of All Tabs | Copies all tab URLs. Opens clipboard URLs. Plain text, JSON, custom. | addons.mozilla.org |
| Tab Copy | Copies this tab, window, or all tabs. Shortcuts, context menu, tab filter, group by window, custom templates (marketing claim). Link, URL, Title & URL, Markdown, CSV, JSON, HTML, custom. | Chrome Web Store (4.0 from 663 ratings) |
| Copy as Markdown | Markdown links, list, task list. User-set shortcuts. | github.com/yorkxin/copy-as-markdown |
| Safe Tab URL Lister | Optional titles. Plain URLs, Markdown, JSON, CSV, TSV. No data kept after the popup closes (project claim). | github.com/muminkoykiran/safe-tab-url-lister |
| Tab Session Manager | Saves and restores sessions. A different category. | addons.mozilla.org |

Judgment (the advisor and I reviewed the list):

- **Worth a decision:** copy without the popup (D8), a next step after the 20-tab cap (D9), "By window" grouping (D10), and opening into a tab group (D11, recommend defer).
- **Noise, deferred, not asked:**
  - Backup and export, and all five pain points. They come from session managers, which are a different category. JSON copy already works as an export.
  - Custom templates. They add a template language, which goes against "don't make me think".
  - A tab text filter. It adds a control to a list the user already edits by hand.
  - TSV. Minor. Note it for the builder.
  - Pacing and pause. The code already waits 100 ms between tabs (`DELAY_BETWEEN_TABS`), and the 20-tab cap prevents the problem.
- **Confirmed by the research:** the formats we chose are common. One URL per line as input is the shared expectation.

Disclosures:

- The research agent mis-filed 47 annotation rows in the append-only search journal. It also wrote 12 annotation files to `temp/`, against its instructions. Only the journal's administrator can fix those rows. This does not block the design.

## I. State left by this review

- I installed dependencies in node_modules/ with pnpm 10. I pointed the npm cache at temp/npm-cache and the pnpm store at temp/pnpm-store. All three paths are ignored by git. pnpm-lock.yaml did not change.
- **One write went outside the project root.** pnpm wrote its registry metadata cache to ~/Library/Caches/pnpm/metadata-v1.3 at 10:45 today. I did not ask first. The folder is a cache only. You can delete ~/Library/Caches/pnpm. I made no other write outside the root.
- I removed the coverage/ and dist/ folders that the gates created.
- I changed no source file and no config file. I added two files: this report and the screenshot copy in docs/clean-room/.
- I started the visual-companion server on a local port and opened a browser tab at your request. Its files are in `.superpowers/` inside the project. I used a headless Chrome profile in `temp/chrome-profile` and screenshots in `temp/mockup/`. Stop the server with `bash /Users/cspenn/.claude/plugins/cache/claude-plugins-official/superpowers/7.0.2/skills/brainstorming/scripts/stop-server.sh` and the session folder when you are done.
- **A second slip.** One shell command wrote a log file to /tmp, which your rules forbid. I deleted the file at once (1.8 kB, a Chrome log). Nothing else was written outside the root.
