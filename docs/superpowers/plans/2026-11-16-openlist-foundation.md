# OpenList Foundation Implementation Plan (audit phases 1 to 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the OpenList repository into line with docs/orientation.md and the working parts of docs/rules-chrome-ext.md, and fix the audit defects, so the popup redesign and copy feature (Plan B) land on a clean base.

**Architecture:** No new product behavior. Move files and configs to the orientation layout (all tests in `tests/`), fix defects test-first, tighten the gates, update dependencies (zod 4), remove dead code, and refresh documents. Each task ends with the full gate and one commit.

**Tech Stack:** TypeScript 5.8 strict, React 19, Vite 6 with CRXJS, Zod (3 now, 4 in Task 9), Vitest 3 with happy-dom, Playwright, Biome, Knip, pnpm 10, size-limit.

**Spec:** docs/superpowers/specs/2026-11-16-openlist-popup-copy-design.md. Audit and decision table: output/review/2026-11-16-openlist-review.md (sections A to F). Plan B continues in docs/superpowers/plans/2026-11-16-openlist-popup-copy.md.

## Global Constraints

- Orientation wins when it conflicts with the Chrome rules. All tests live in `tests/` (`tests/unit/`, `tests/e2e/`). Test files import with the `@/` alias. No `./` or `../` imports in tests.
- Never use /tmp. Temporary data goes in `temp/`. Caches: `npm_config_cache=$PWD/temp/npm-cache`, `npm_config_store_dir=$PWD/temp/pnpm-store` (export both; do not pass `--store-dir` on the command line, because pnpm rejects it with `exec`). Command prefix used below: `P='npx --yes pnpm@10'` with those variables set. Playwright browsers: `PLAYWRIGHT_BROWSERS_PATH=$PWD/temp/ms-playwright`.
- No file over 250 lines. Purpose comment on line 1 of every file. TSDoc (`@param`, `@returns`) on every exported function. Explicit return types. No `any`, `@ts-ignore`, `console.*` in production code. No `.then()` chains in `async` code.
- Skip `webext-bridge`. Add `size-limit` and an `audit` script. Do not add `eslint-plugin-compat` or `vitest-chrome`.
- Gate (run at the end of every task): `$P biome check src tests *.config.ts`, `$P tsc --noEmit`, `$P vitest run --coverage`, `$P knip` (from Task 8: also build, audit, size-limit). Coverage threshold stays 100% on measured files.
- Commit steps are checkpoints. Commit only after the owner has approved commits for this work (CLAUDE.md). Never push. Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Node here is 22.22.3. Set `engines.node` to `>=22` (the rules say 24+; this is a call to record in docs/project-decisions.md).
- Never edit the shared-library symlinks (docs/orientation.md, docs/rules-chrome-ext.md, docs/asd-ste.yaml, docs/installedtools.md, docs/checklist-*.yaml, docs/trust-insights-brand).

## Review Focus

Failure modes the spec implies and no task states. Each line has a test in the owning task.

1. Pasted text with Windows line endings, tabs, a byte-order mark, or trailing spaces. Expected: the same URLs as clean text. (Task 3)
2. A site-like string with a port, query, or fragment, such as `example.com:8080/a?b=1#c`. Expected: an https URL that keeps all parts. (Task 3)
3. Two `openList` calls at once (popup plus context menu). Expected: no lost metric counts. (Task 6)
4. Storage that rejects during install or browser start. Expected: no unhandled rejection, one logged error. (Task 5)
5. A zod 4 parse error text that differs from zod 3. Expected: no production behavior depends on the error text. (Task 9)

---

### Task 1: Git hygiene and folder layout

**Files:**
- Modify: `.gitignore`
- Move (git mv): `extension-legacy/` to `archived/extension-legacy/`; `chrome_store/`, `icon.png`, `icon.pxm` to `docs/store-assets/`; `docs/reports/qa-2026-03-24.md`, `docs/reports/qa-final-2026-03-25.md` to `output/reports/`
- Untrack (git rm --cached) and move to `output/artifacts/`: `openlist-1.1.0.zip`, `extension.zip`
- Untrack only: `playwright-report/`, `test-results/`, `.DS_Store`, `extension-legacy/.DS_Store`
- Delete: empty `.worktrees/`
- Create: `.gitkeep` in `data/`, `input/`, `logs/`, `references/`

**Interfaces:** Produces the tracked layout that Task 2's layout-guard test asserts.

- [ ] **Step 1: Rewrite `.gitignore`** to exactly these ignore entries and no others: `node_modules/ dist/ coverage/ .vite/ *.tsbuildinfo .DS_Store .env .env.* credentials.json *.zip .superpowers/ temp/ output/artifacts/ output/coverage/ output/playwright-report/ graphify-out/cache/ .claude/claude-env.state.json .claude/settings.local.json .claude/skills/ .claude/plugins/ .claude/agents/ claude-graphify-semantic.sh archived/claude-setup-stash/`. Do not ignore `docs/`, `tests/`, `output/` as a whole, `.claude/hindsight-bank`, or `.claude/claude-setup.json`.
- [ ] **Step 2: Verify the ignore rules.** Run: `git check-ignore -v docs/prd.md tests/unit/x.test.ts output/review/x.md .claude/hindsight-bank; echo $?` Expected: no path printed, exit 1. Run: `git check-ignore -v .env credentials.json a.zip .DS_Store .superpowers/x temp/x output/artifacts/x` Expected: all seven paths printed.
- [ ] **Step 3: Move and untrack** the files listed above with `git mv` (tracked) or `mv` (untracked). Create `output/artifacts/` first. Update any link in README.md or docs that names a moved path.
- [ ] **Step 4: Verify.** Run: `git status --short | head -40` Expected: renames and deletions only, plus `?? AGENTS.md CLAUDE.md` and new `.gitkeep` files. Run: `ls` Expected: no `extension-legacy`, `chrome_store`, `icon.*`, `*.zip`, `playwright-report`, `test-results`, `.worktrees` at the root.
- [ ] **Step 5: Run the gate.** The suite still lives in `src/`. Expected: all pass (247 tests).
- [ ] **Step 6: Commit** `chore: orientation layout, git hygiene, archive legacy extension` with `git add -A` limited to the files above plus `AGENTS.md CLAUDE.md`.

---

### Task 2: Move all tests to `tests/` and add the layout guard

**Files:**
- Move: every `src/**/*.test.ts(x)` to `tests/unit/<same subpath>`; `src/test/setup.ts` to `tests/setup.ts`; `e2e/*` to `tests/e2e/`
- Modify: `vitest.config.ts`, `tsconfig.json`, `biome.json`, `knip.json`, `playwright.config.ts`, `package.json`
- Create: `tests/unit/project-layout.test.ts`, `tests/unit/schemas/metrics-response.test.ts`
- Modify: `tests/unit/schemas/metrics.test.ts` (split, under 250 lines)

**Interfaces:** Produces the test path convention `tests/unit/<mirror of src>/<name>.test.ts(x)` used by every later task.

- [ ] **Step 1: Write the failing layout guard** `tests/unit/project-layout.test.ts` (reads the repo with `node:fs` from `process.cwd()`). Tests, with assertions:
  - `root holds only allowed entries`: the set of root names is a subset of `.claude .git .gitignore .npmrc .size-limit.json .superpowers .DS_Store AGENTS.md CHANGELOG.md CLAUDE.md LICENSE README.md archived biome.json claude-graphify-semantic.sh data dist docs graphify-out input knip.json logs node_modules output package.json playwright.config.ts pnpm-lock.yaml references src temp tests tsconfig.json vite.config.ts vitest.config.ts`.
  - `no test file lives under src`: no path under `src/` matches `/.test.tsx?$/`.
  - `gitignore keeps project folders tracked`: the text of `.gitignore` has no line equal to `docs/`, `tests/`, `output/`, `.claude/`.
  - `gitignore blocks secrets and junk`: it has lines `.env`, `credentials.json`, `.DS_Store`, `*.zip`.
  - `no file over 250 lines in src and tests`.
- [ ] **Step 2: Run it** `$P vitest run tests/unit/project-layout.test.ts` (after Step 3 configs exist this is the first run; before them vitest finds no tests). Expected after Step 3 and before Step 4: FAIL on the `no test file lives under src` and the 250-line tests.
- [ ] **Step 3: Update configs.**
  - `vitest.config.ts`: `include: ['tests/unit/**/*.test.ts','tests/unit/**/*.test.tsx']`, `setupFiles: ['./tests/setup.ts']`, `coverage.reportsDirectory: './output/coverage'`, coverage `exclude` drops `src/test/**` and keeps the entry-point and type exclusions.
  - `tsconfig.json`: `include: ['src/**/*','tests/**/*','*.config.ts']`, `rootDir: '.'`, add `node` to `types`.
  - `biome.json`: `files.ignore` loses `e2e`. The check command in package.json lints `src tests *.config.ts`.
  - `playwright.config.ts`: `testDir: './tests/e2e'`, `outputDir: './temp/test-results'`, `retries: 0`, `reporter: [['html',{outputFolder:'output/playwright-report',open:'never'}]]`.
  - `package.json` scripts: `lint` becomes `biome check src tests *.config.ts`; `lint:fix` likewise.
- [ ] **Step 4: Move the files** with `git mv`. In each moved unit test, rewrite `from './<name>'` and `vi.mock('./<name>')` to `@/<dir>/<name>`. In e2e files, import the fixtures as `@tests/e2e/fixtures`: add the alias `@tests/*` to the `paths` of `tsconfig.json` and to `resolve.alias` of `vitest.config.ts` and `playwright.config.ts`. In `tests/e2e/fixtures.ts` set `EXTENSION_PATH = path.join(__dirname, '../../dist')`.
- [ ] **Step 5: Split `tests/unit/schemas/metrics.test.ts` (256 lines)** at its top-level `describe` boundary: the `MetricsResponseSchema` tests go to `metrics-response.test.ts`.
- [ ] **Step 6: Run the gate.** Expected: 247 tests pass (plus the 5 layout tests, so 252), coverage 100%, `rg "from '\.\.?/" tests` prints nothing except inside `tests/e2e/`.
- [ ] **Step 7: Commit** `test: move all tests to tests/ per orientation, add layout guard`.

---

### Task 3: Fix bare domains and the blocked-protocol test (defect D1, D6c)

**Files:**
- Modify: `src/utils/urls.ts`
- Test: `tests/unit/utils/urls.test.ts`, `tests/unit/background/open-list.test.ts`

**Interfaces:**
- Consumes: `BLOCKED_PROTOCOLS` from `@/schemas/urls`.
- Produces: `isProbablyUrl(input: unknown): boolean` (unchanged signature); `sanitizeUrl(url: string): string | null` (unchanged signature). Plan B's extractor relies on both.

- [ ] **Step 1: Write failing tests** in `urls.test.ts`. `it.each` over `[input, expected]`: `isProbablyUrl` is true and `sanitizeUrl` equals `expected` for `example.com`→`https://example.com/`, `x.com`→`https://x.com/`, `news.ycombinator.com`→`https://news.ycombinator.com/`, `example.com/path`→`https://example.com/path`, `WWW.example.com`→`https://www.example.com/`, `example.com:8080/a?b=1#c`→`https://example.com:8080/a?b=1#c`, `http://example.com`→`https://example.com/`. Also: `isProbablyUrl('best pizza')`, `isProbablyUrl('localhost')`, `isProbablyUrl('javascript:alert(1)')` are false; `sanitizeUrl('javascript:alert(1)')` is null. Add the Review Focus case: `sanitizeUrl(' example.com')` (leading space, trailing carriage return) equals `https://example.com/`.
- [ ] **Step 2: Write failing integration tests** in `open-list.test.ts` with the real URL functions (no spies on `isProbablyUrl`/`sanitizeUrl`): `openList('example.com
best pizza')` calls `createTab` with `https://example.com/` then `https://www.google.com/search?q=best%20pizza`. `openList('javascript:alert(1)')` calls `createTab` once with `https://www.google.com/search?q=javascript%3Aalert(1)` and never with a `javascript:` URL. Remove the old spy-based blocked-protocol test.
- [ ] **Step 3: Run** `$P vitest run tests/unit/utils/urls.test.ts tests/unit/background/open-list.test.ts` Expected: FAIL on the bare-domain rows.
- [ ] **Step 4: Implement.** In `isProbablyUrl`: after the blocked-protocol check, return true for an allowed-protocol prefix, otherwise test `/^(?:www.)?(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z]{2,}(?::d+)?(?:[/?#]S*)?$/i` on the trimmed text. In `sanitizeUrl`: trim, then prepend `https://` when the text has no scheme (`/^[a-z][a-z0-9+.-]*:///i` fails); keep the blocked-protocol check and the http-to-https upgrade.
- [ ] **Step 5: Run the tests** from Step 3. Expected: PASS. Then run the gate.
- [ ] **Step 6: Commit** `fix: open bare domains and prove the protocol block with real functions`.

---

### Task 4: Fix the context-menu API misuse (defect D2)

**Files:**
- Modify: `src/background/context-menu.ts`, `tests/setup.ts`
- Test: `tests/unit/background/context-menu.test.ts`

**Interfaces:**
- Produces: `createMenuItem(props: chrome.contextMenus.CreateProperties): Promise<void>` (exported from `src/background/context-menu.ts`; Plan B reuses it for the toolbar item); `removeAllMenuItems(): Promise<void>`; `initializeContextMenu(): Promise<void>` (unchanged).
- Consumes: `sleep` from `@/utils/tabs`.

- [ ] **Step 1: Make the mock match the real signature** in `tests/setup.ts`: `create: vi.fn((props, cb) => { cb?.(); return 'menu-id'; })`, `removeAll: vi.fn((cb) => { cb?.(); })`. Keep `runtime.lastError` settable.
- [ ] **Step 2: Write failing tests:** (a) `createMenuItem` resolves when the callback runs with no `lastError`; (b) it rejects with `Error('boom')` when `chrome.runtime.lastError = { message: 'boom' }` while the callback runs; (c) `initializeContextMenu` retries once after 1000 ms (fake timers) when the first create sets `lastError`, and rejects when the second also fails; (d) `removeAllMenuItems` calls `removeAll` with a callback.
- [ ] **Step 3: Run** the file. Expected: FAIL (b, c).
- [ ] **Step 4: Implement** both helpers by wrapping the callback form in a `Promise` that reads `chrome.runtime.lastError` inside the callback. `initializeContextMenu` keeps its flow: remove all, create, retry once after `sleep(1000)`.
- [ ] **Step 5: Run** the file, then the gate. Expected: PASS.
- [ ] **Step 6: Commit** `fix: context menu uses the callback API and reads lastError`.

---

### Task 5: Safe lifecycle listeners and a correct start time (defects D3, D4)

**Files:**
- Create: `src/background/lifecycle.ts`
- Modify: `src/background/index.ts`, `src/background/metrics.ts`, `src/schemas/metrics.ts`
- Test: `tests/unit/background/lifecycle.test.ts`, `tests/unit/background/metrics.test.ts`

**Interfaces:**
- Produces: `handleInstalled(): Promise<void>`, `handleStartup(): Promise<void>` (never reject); `markSessionStart(now?: number): Promise<void>` in `metrics.ts` (writes `startTime` to `chrome.storage.session`).
- Changes: `getMetrics()` returns the stored `startTime` and does not invent one (default `startTime: 0`). `ServiceWorkerState.restarts`, `installTime`, `activationTime`, `lastContextMenuCreation` stay for now. Task 10 removes them.

- [ ] **Step 1: Write failing tests:** `markSessionStart(1000)` makes `getMetrics().startTime` equal 1000 on the next two reads (storage mock holds state). `handleStartup` calls `markSessionStart` and `initializeContextMenu`. `handleInstalled` and `handleStartup` resolve (do not reject) when `chrome.storage.session.set` rejects, and call `logger.error` once (Review Focus 4). Update the old `metrics.test.ts` assertion that locked in the unsaved `Date.now()`.
- [ ] **Step 2: Run** the two files. Expected: FAIL.
- [ ] **Step 3: Implement** `lifecycle.ts` with try/catch around each flow; log through `logger.error('Lifecycle handler failed', { error })`. In `index.ts` register `chrome.runtime.onInstalled.addListener(handleInstalled)` and `onStartup.addListener(handleStartup)`; keep the `contextMenus.onClicked` and `onMessage` registrations at the top level.
- [ ] **Step 4: Run** the two files, then the gate. Expected: PASS.
- [ ] **Step 5: Commit** `fix: lifecycle listeners catch errors; save session start time`.

---

### Task 6: Serialize metric writes (defect D6e)

**Files:**
- Modify: `src/background/metrics.ts`
- Test: `tests/unit/background/metrics.test.ts`

**Interfaces:** `batchIncrementMetrics(deltas)` keeps its signature and now runs inside a module-level promise queue `let queue: Promise<void> = Promise.resolve()` so reads and writes never overlap. A rejected write must not block the next one.

- [ ] **Step 1: Write the failing test:** with a storage mock whose `get` resolves on the next tick, fire `Promise.all([batchIncrementMetrics({tabsOpened:1}), batchIncrementMetrics({tabsOpened:2})])` and assert the stored `tabsOpened` is 3. Add: after a first call whose `set` rejects, a second call still runs and its change is stored (Review Focus 3).
- [ ] **Step 2: Run** the file. Expected: FAIL (stored value 2).
- [ ] **Step 3: Implement** the queue; `incrementMetric` and `recordError` use the same queue.
- [ ] **Step 4: Run** the file and the gate. Expected: PASS.
- [ ] **Step 5: Commit** `fix: serialize metric writes so concurrent opens keep every count`.

---

### Task 7: Record errors and fix error keys (defects D5 part, D6d)

**Files:**
- Modify: `src/background/open-list.ts`, `src/background/index.ts`, `src/components/ErrorDisplay.tsx`
- Test: `tests/unit/background/open-list.test.ts`, `tests/unit/components/ErrorDisplay.test.tsx`

**Interfaces:** `recordError(message: string): Promise<void>` (existing) is called from the `openList` catch block and from the `contextMenus.onClicked` catch block. Badge feedback is Plan B (Task 13).

- [ ] **Step 1: Write failing tests:** `openList` with `createTab` rejecting for one URL calls `recordError` once with a message that contains the URL; `ErrorDisplay` with `details=['a','a']` renders two `li` and logs no React duplicate-key warning (spy on `console.error` inside the test only).
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement.** Call `recordError` in the catch blocks (await it, catch its own errors). Use `key={`${i}-${d}`}` in `ErrorDisplay`.
- [ ] **Step 4: Run** both files and the gate. Expected: PASS.
- [ ] **Step 5: Commit** `fix: record errors in metrics and use unique error keys`.

---

### Task 8: Tighten the gates

**Files:**
- Modify: `package.json`, `knip.json`, `tsconfig.json`
- Create: `.size-limit.json`

**Interfaces:** Scripts after this task: `build`: `tsc --noEmit && vite build`; `audit`: `pnpm audit --audit-level=high`; `size`: `pnpm build && size-limit`; `knip`: `knip --production && knip`; `check`: `pnpm lint && pnpm typecheck && pnpm test && pnpm knip && pnpm size` (`audit` joins `check` in Task 9). Add `engines: { node: '>=22' }`.

- [ ] **Step 1: Install** `$P add -D size-limit @size-limit/file`.
- [ ] **Step 2: Create `.size-limit.json`** with three entries, gzip on: `dist/assets/index.html-*.js` limit `75 kB`; `dist/assets/messages-*.js` limit `20 kB`; `dist/assets/index.ts-*.js` limit `5 kB` (current gzip sizes: 62.64, 12.99, 1.81 kB).
- [ ] **Step 3: Configure Knip production.** `knip.json`: `entry: ['src/background/index.ts!','src/popup/index.tsx!']`, `project: ['src/**/*.{ts,tsx}!']`; remove `ignoreExportsUsedInFile`. Expected: `knip --production` now lists the dead exports of audit section D (see Task 10); until then run only `knip` in `check` and add the production run in Task 10 Step 5.
- [ ] **Step 4: Prove the build fails on a type error.** Temporarily add `const x: number = 'a';` to `src/utils/errors.ts`, run `$P build`. Expected: exit code non-zero with a TS error. Remove the line.
- [ ] **Step 5: Run** `$P build && $P size-limit` Expected: PASS within limits.
- [ ] **Step 6: Commit** `chore: build type-checks, add size-limit and audit scripts, Knip production mode`.

---

### Task 9: Update dependencies (zod 4 and patched tools)

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, and any schema or test that breaks.

**Interfaces:** zod 4 API (`z.object`, `z.enum`, `z.discriminatedUnion`, `safeParse` unchanged in use). Plan B writes new schemas against zod 4.

- [ ] **Step 1: Baseline.** Run `$P audit --audit-level=high` Expected: FAIL (zod prod high; vitest and happy-dom critical).
- [ ] **Step 2: Update.** `$P add zod@^4`; `$P up -L vite vitest @vitest/coverage-v8 happy-dom knip @vitejs/plugin-react @crxjs/vite-plugin`.
- [ ] **Step 3: Fix breakage.** Run the gate. Fix zod 4 changes in `src/schemas/*.ts` and tests. No production code may depend on the text of a zod error (Review Focus 5): add a test that `handleMessage` returns `{ status: 'error', message: 'Unknown action' }` for an invalid message without reading `parsed.error.message` into the response.
- [ ] **Step 4: Run audit.** `$P audit --audit-level=high` Expected: exit 0. If an advisory has no patched version (for example under CRXJS), add `pnpm.overrides` to `package.json` or record it in `CHANGELOG.md` (Task 11) with the advisory id.
- [ ] **Step 5: Add `audit` to the `check` script.** Run `$P check` Expected: PASS.
- [ ] **Step 6: Commit** `chore: zod 4 and patched dev tools; audit passes`.

---

### Task 10: Remove dead code (audit section D, part 1)

**Files:**
- Modify: `src/schemas/config.ts`, `src/schemas/urls.ts`, `src/schemas/metrics.ts`, `src/background/metrics.ts`, `src/background/messages.ts`, `src/components/ErrorBoundary.tsx`, `src/popup/main.css`, `src/utils/tabs.ts`, `tests/setup.ts` and their tests.

**Interfaces:** Keep what the current popup still uses until Plan B replaces it: the `getCurrentTabUrls` message, `getMetrics`, `StatusBar`, the hooks. Plan B Tasks 11 and 12 delete those.

- [ ] **Step 1: Delete** (with their tests): `ConfigSchema` (keep `CONFIG` as `as const`), `METRICS_RETENTION_HOURS`, `UrlValidationResultSchema`, `incrementMetric`, `lastOperation`, `lastContextMenuCreation` (field and default), `ServiceWorkerState.restarts/installTime/activationTime` and the `serviceWorkerState` key of the `getMetrics` reply and `MetricsResponseSchema`, the `fallback` prop of `ErrorBoundary`, the `.error` CSS rule, the `retries` parameter of `createTab` (make it a constant `TAB_RETRIES = 2`), and the unused mocks in `tests/setup.ts` (`storage.local`, `action.*`, `onMessage.removeListener` stay only if a later task needs them; Plan B re-adds what it needs).
- [ ] **Step 2: Run the gate.** Fix every test and type error caused by the deletions.
- [ ] **Step 3: Run** `$P knip --production` Expected: no unused exports or files reported except those Plan B removes (list them in the commit message).
- [ ] **Step 4: Commit** `refactor: remove dead code found by the Chisle review`.

---

### Task 11: Documents, changelog, graph, and search index

**Files:**
- Create: `CHANGELOG.md`, `docs/project-decisions.md`, `.graphifyignore`
- Modify: `README.md`, `docs/prd.md`, `src/components/Footer.tsx`
- Test: `tests/unit/components/Footer.test.tsx`

**Interfaces:** `Footer()` renders the version from `chrome.runtime.getManifest().version` as `OpenList ${version} brought to you by TrustInsights.ai` with `utm_campaign=openlist_${version.replaceAll('.', '_')}`.

- [ ] **Step 1: Write the failing Footer test:** with `chrome.runtime.getManifest` mocked to return `{ version: '1.1.0' }`, the link text contains `OpenList 1.1.0` and the `href` contains `utm_campaign=openlist_1_1_0`. Add `getManifest` to the runtime mock in `tests/setup.ts`.
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement** the Footer change. Run the file. Expected: PASS.
- [ ] **Step 4: Write documents.**
  - `CHANGELOG.md`: Keep a Changelog format. An `Unreleased` section listing this plan's changes and any unpatched advisory.
  - `docs/project-decisions.md`: the rulings of 2026-11-16 (orientation wins; tests in `tests/`; no `webext-bridge`; size-limit and audit added; `eslint-plugin-compat`, `vitest-chrome` skipped; `engines.node >=22` call).
  - `README.md`: add a v1.1.0 history entry; Node 22+ and pnpm 10; remove the step "Click anywhere in the empty text area" (Plan B rewrites Usage).
  - `docs/prd.md`: permissions line lists `contextMenus`, `storage`, `tabs`; replace the three config names with the real ones (`MAX_TABS`, `DELAY_BETWEEN_TABS` and the local constants); remove done marks the code does not support (accessibility, "Extract URLs"); mark them as planned in Plan B.
  - `.graphifyignore`: `archived/`, `node_modules/`, `dist/`, `temp/`, `output/`.
- [ ] **Step 5: Refresh indexes.** Run `graphify update .` Expected: success and the node count drops below 613. Run `qmd update && qmd embed` Expected: success; `qmd status` shows the OpenList collections updated.
- [ ] **Step 6: Run the gate.** Expected: PASS.
- [ ] **Step 7: Commit** `docs: changelog, decisions record, README and PRD refresh, version-aware footer`.

---

### Task 12: Style rules for the surviving non-UI files

**Files:**
- Modify: every file in `src/background/`, `src/utils/`, `src/schemas/`, `src/types/`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, and every test file under `tests/`.
- Modify: `tests/unit/project-layout.test.ts`

**Interfaces:** Adds two guard tests that Plan B's new files must also pass. The popup folders (`src/popup`, `src/components`, `src/hooks`) are excluded from the guards until Plan B Task 12 removes the exclusion, because Plan B rewrites them.

- [ ] **Step 1: Write failing guards** in `project-layout.test.ts`: `every guarded source and test file starts with a purpose comment` (line 1 starts with `//` or `/*`); `every exported function in guarded source files has TSDoc` (the text before each `export function` or `export async function` ends with `*/` plus a newline and contains `@returns` unless the return type is `void` or `Promise<void>`); `no .then( in guarded source files`.
- [ ] **Step 2: Run** the guards. Expected: FAIL listing the files.
- [ ] **Step 3: Fix the files:** add a purpose comment to line 1 of each; add TSDoc to `sleep` and every other undocumented export; rewrite the `.then()` chains in `src/background/messages.ts` as an inner `async` function called with `void run()` (the listener still returns `true`); add explicit return types where missing.
- [ ] **Step 4: Run the gate.** Expected: PASS. Run `$P check` Expected: PASS.
- [ ] **Step 5: Commit** `style: purpose comments, TSDoc, async/await in background code`.

## Self-review notes

- Spec coverage: audit phases 1 to 7 are Tasks 1 to 11. Phase 8's style rules for surviving files are Task 12. The accessibility, design system, and feature work is Plan B.
- Audit items not in this plan, by design: D6a, D6b, D6f, D6g, D6e part (Plan B); R8 return types and R12 Zod casts and C6 accessibility in popup files (Plan B rewrites them); R16 manifest comments (not adopted: the manifest stays plain JSON, recorded in docs/project-decisions.md, Task 11).
- The audit text that says phase 6 removes the `getCurrentTabUrls` round trip is corrected: Plan B Task 11 removes it, when the new popup stops using it.
