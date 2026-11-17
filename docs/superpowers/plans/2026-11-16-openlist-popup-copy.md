# OpenList Popup, Accessibility, and Copy Feature Implementation Plan (audit phases 8 and 9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-list popup (Open and Copy on one editable URL list), the ten copy formats, copy without the popup, and WCAG 2.1 AA proof for the whole extension.

**Architecture:** Pure, tested modules do the work: URL extraction, formatters, tab sources, an open planner. Thin React components and hooks call them. A service-worker command and a toolbar menu item copy the window through an offscreen document. Details totals move to `chrome.storage.local`. Every new file follows the layout guard of Plan A.

**Tech Stack:** TypeScript strict, React 19, Zod 4, Vite 6 with CRXJS, Vitest 3 with happy-dom, Playwright with Chromium, `vitest-axe`, `@axe-core/playwright`, Biome, Knip, size-limit.

**Spec:** docs/superpowers/specs/2026-11-16-openlist-popup-copy-design.md (section numbers below refer to it). **Requires** Plan A (docs/superpowers/plans/2026-11-16-openlist-foundation.md) to be finished and passing. Mockup for spacing and states only: `.superpowers/brainstorm/5627-1794845633/content/popup-mockup-v5.html`.

## Global Constraints

- All Plan A global constraints apply (tests in `tests/`, `@/` alias, no /tmp, 250-line limit, purpose comment, TSDoc, explicit return types, no `.then()`, no `console.*`). Same gate. Commit steps are checkpoints: commit only after the owner approves commits; never push.
- Manifest: `minimum_chrome_version: "110"`; `permissions: ["contextMenus","storage","tabs","offscreen"]`; `optional_permissions: ["clipboardRead","clipboardWrite"]`; an `action.default_title`; one `commands` entry named `copy-window` (not `_execute_action`).
- Popup width `min(450px, 100vw)`. Height at most 600 px with Details open. Cap `CONFIG.MAX_TABS = 20`. Delay `CONFIG.DELAY_BETWEEN_TABS = 100`.
- Formats (exact, in this order, in three groups): Plain text: `URL`, `Title`, `Title & URL`. Markup: `Markdown`, `BBCode`, `HTML`, `Link`. Data: `CSV`, `JSON`, `HTML table`. First-run format `URL`.
- Source ids and labels: `selected` "Selected tabs (N)", `clipboard` "Clipboard (N URLs)", `window` "This window (N)", `tab` "This tab (1)", `all` "All windows (N)". Default order: selected, clipboard, window; a window with one tab starts at `tab`.
- Colors (audit H4): light accent `#0b57d0`, page `#eeeeee`, surface `#ffffff`, text `#333333`, muted `#5f6368`, control border `#767676`, error `#b3261e` on `#fce8e6`, selected fill `#d3e3fd` with text `#041e49`; dark accent `#8ab4f8`, page `#202124`, surface `#292a2d`, text `#e8eaed`, muted `#9aa0a6`, control border `#8e918f`, error `#f9b4ae` on `#402022`, selected fill `#2f4468` with text `#d3e3fd`. Text pairs at least 4.5:1. Borders and focus rings at least 3:1. Controls 44 px high. Focus ring 2 px, `:focus-visible`, 2 px offset.
- Privacy: clipboard text is used only to find URLs, never stored, logged, or sent.
- Status text lives in one `role="status"` line. Errors use `role="alert"`.

## Review Focus

Inputs the spec implies and no task states. Each has a test in the owning task.

1. A list of 5,000 URLs. Expected: parse and plan finish in under 200 ms and the popup stays usable. (Task 4)
2. A tab title with a newline, an emoji, right-to-left text, or 10,000 characters. Expected: one record per tab in every format, escaped correctly. (Task 5)
3. A tab that is still loading (`title` undefined, `url` empty, `pendingUrl` set), a discarded tab, or a tab of the wrong privacy kind. Expected: title falls back to the URL; the loading tab uses `pendingUrl`; the wrong-privacy tab is left out. (Task 6)
4. The clipboard permission is granted but `readText` rejects, or the text is over 1 MB. Expected: ignored, no message, no delay. (Task 9)
5. A window whose tabs are all filtered out. Expected: empty list, the Open button is filled and reads "Open 0 URLs", Copy click says "Nothing to copy." (Task 11)

---

### Task 1: Install the accessibility test packages and prove they run

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `tests/setup.ts`
- Create: `tests/unit/a11y-smoke.test.tsx`

**Interfaces:** Produces `expect(results).toHaveNoViolations()` for every later component test, via `import { axe } from 'vitest-axe'` and the matcher registered in `tests/setup.ts`.

- [ ] **Step 1: Install.** `$P add -D vitest-axe @axe-core/playwright` (owner approved both on 2026-11-16).
- [ ] **Step 2: Write the smoke test.** `a11y-smoke renders a labelled input with no violations`: render `<label htmlFor="a">URLs</label><textarea id="a" />`, `expect(await axe(container)).toHaveNoViolations()`. `a11y-smoke catches an unlabelled input`: render `<textarea />` and assert `(await axe(container)).violations.length` is greater than 0.
- [ ] **Step 3: Register the matcher** in `tests/setup.ts` (`expect.extend(matchers)` from `vitest-axe/matchers`). Run `$P vitest run tests/unit/a11y-smoke.test.tsx`. Expected: PASS under happy-dom. If axe fails to run under happy-dom, add `jsdom` as a dev dependency, set `// @vitest-environment jsdom` in the component test files, and record the reason in `docs/project-decisions.md`.
- [ ] **Step 4: Run the gate. Commit** `test: add vitest-axe and @axe-core/playwright`.

---

### Task 2: Design tokens and the contrast test

**Files:**
- Create: `src/popup/tokens.css`, `tests/helpers/contrast.ts`, `tests/unit/tokens-contrast.test.ts`

**Interfaces:**
- Produces `tests/helpers/contrast.ts`: `contrastRatio(foreground: string, background: string): number` (hex colors, WCAG relative luminance, returns the ratio rounded to 2 decimals).
- Produces CSS custom properties on `:root` (light) and inside `@media (prefers-color-scheme: dark)`: `--bg --surface --text --muted --accent --accent-hover --on-accent --border --err --err-bg --err-border --sel-bg --sel-text` (values from Global Constraints; `--accent-hover` light `#0842a0`, dark `#aecbfa`).

- [ ] **Step 1: Write failing tests.** `contrastRatio('#ffffff','#0b57d0') equals 6.39`; `contrastRatio('#333333','#eeeeee') equals 10.89`. `tokens-contrast` reads `src/popup/tokens.css`, parses both theme blocks, and asserts for each theme: text on bg, text on surface, muted on bg, accent on bg, on-accent on accent, on-accent on accent-hover, err on err-bg, sel-text on sel-bg are each at least 4.5; border on surface, border on bg, accent on bg, accent on sel-bg are each at least 3 (border, focus ring, selected border).
- [ ] **Step 2: Run.** Expected: FAIL (no files).
- [ ] **Step 3: Implement** `contrastRatio` and write `tokens.css` with the Global Constraints values. Link it from `src/popup/index.html` via `src/popup/index.tsx` import (`import './tokens.css';` before `main.css`).
- [ ] **Step 4: Run the file and the gate.** Expected: PASS. **Commit** `feat: design tokens with a contrast test`.

---

### Task 3: Schemas and the remembered format

**Files:**
- Create: `src/schemas/tab.ts`, `src/schemas/settings.ts`, `src/utils/settings-store.ts`
- Test: `tests/unit/schemas/tab.test.ts`, `tests/unit/schemas/settings.test.ts`, `tests/unit/utils/settings-store.test.ts`

**Interfaces:**
- `tab.ts`: `TabRecordSchema` = object {`title: string`, `url: string`, `favIconUrl?: string`, `windowId: number` (int), `index: number` (int), `pinned: boolean`, `active: boolean`, `groupId: number` (int), `lastAccessed?: number`}; `type TabRecord = z.infer<typeof TabRecordSchema>`.
- `settings.ts`: `FORMATS` (the ten formats, `as const`, Global Constraints order); `FORMAT_GROUPS: ReadonlyArray<{ label: string; formats: readonly Format[] }>`; `FormatSchema = z.enum(FORMATS)`; `type Format`; `SOURCES = ['selected','clipboard','window','tab','all'] as const`; `type SourceId`; `SettingsSchema = z.object({ format: FormatSchema })`; `DEFAULT_FORMAT: Format = 'URL'`.
- `settings-store.ts`: `getFormat(): Promise<Format>` (reads `chrome.storage.local['settings']` through `SettingsSchema.safeParse`, returns `DEFAULT_FORMAT` on failure); `setFormat(format: Format): Promise<void>`.

- [ ] **Step 1: Write failing tests.** `TabRecordSchema accepts a tab with no favIconUrl and no lastAccessed`; `rejects a non-integer index`. `FORMATS has 10 entries in the exact order of Global Constraints`; `FORMAT_GROUPS labels are 'Plain text', 'Markup', 'Data'`. `getFormat returns 'URL' when storage is empty`, `returns 'URL' when storage holds {format:'Nope'}`, `returns 'Markdown' after setFormat('Markdown')`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the three files to the interfaces. Add `storage.local` get/set mocks back to `tests/setup.ts` if Plan A removed them.
- [ ] **Step 4: Run the gate. Commit** `feat: tab and settings schemas, remembered format`.

---

### Task 4: The URL extractor (spec 6.1)

**Files:**
- Create: `src/utils/extract-urls.ts`
- Test: `tests/unit/utils/extract-urls.test.ts`

**Interfaces:**
- Consumes: `isProbablyUrl`, `sanitizeUrl` from `@/utils/urls`.
- Produces: `type Entry = { kind: 'url'; url: string; line: number } | { kind: 'search'; term: string; line: number }` (`line` is the zero-based source line, or -1 for structured text); `interface ParsedList { entries: Entry[]; groups: Entry[][]; structured: boolean }`; `parseList(text: string): ParsedList`; `urlKey(url: string): string` (the "same page" key: replace `%28` and `%29` with parentheses, then `new URL(...).href`; return the input unchanged when it does not parse).

- [ ] **Step 1: Write failing tests** (exact values):
  - `mixed list`: `parseList('https://a.com\nexample.com\nbest pizza').entries` equals `[{kind:'url',url:'https://a.com/',line:0},{kind:'url',url:'https://example.com/',line:1},{kind:'search',term:'best pizza',line:2}]`.
  - `repeats removed`: `'https://a.com\nhttps://a.com/'` gives one entry.
  - `blank line ends a group`: `'https://a.com\n\nhttps://b.com'` gives `groups.length` 2.
  - `JSON`: `'[{"title":"A","url":"https://a.com"},{"title":"B","url":"https://b.com"}]'` gives two url entries, `structured` true, `line` -1.
  - `CSV header`: text starting with `title,url,window,index,pinned,active` then `"A","https://a.com",1,0,false,true` gives one url entry.
  - `HTML`: `'<ul><li><a href="https://a.com/x?y=1&amp;z=2">A</a></li></ul>'` gives url `https://a.com/x?y=1&z=2`.
  - `Markdown`: `'- [A](https://a.com/p_%28q%29)'` gives url key equal to `urlKey('https://a.com/p_(q)')`. `BBCode`: `'[url=https://a.com/x]A[/url]'`. `Link plain`: `'A (https://a.com/p_(q))'` gives `https://a.com/p_(q)`.
  - `Review Focus 1`: `parseList(Array.from({length:5000},(_, i)=>'https://x.com/'+i).join('\n'))` finishes in under 200 ms (`performance.now()`) and has 5000 entries.
  - `Windows line endings, tab, BOM, trailing spaces`: `'﻿https://a.com \r\nexample.com\t\r\n'` gives the same two entries as clean text.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `parseList` in this order: strip a BOM and normalize `\r\n` and `\r` to `\n`; structure detection (JSON via `JSON.parse` in try/catch, then walk for string `url` properties; CSV header check on the first line; text starting with `<` read `href="…"` values and decode `&amp;`); otherwise line by line: find addresses with the maximal run of non-space characters starting at `http://` or `https://` that stops at `<>"'[]`, then strip trailing `.,;:!?` and any unbalanced `)`; a line with no address that `isProbablyUrl` accepts becomes a site entry via `sanitizeUrl`; any other non-empty line is a search entry; blank lines end a group. Dedupe with `urlKey`.
- [ ] **Step 4: Run the gate. Commit** `feat: URL extractor with structure detection`.

---

### Task 5: Formatters (spec 6.2)

**Files:**
- Create: `src/utils/formatters.ts`
- Test: `tests/unit/utils/formatters.test.ts`

**Interfaces:**
- Consumes: `TabRecord`, `Format`.
- Produces: `interface ClipboardPayload { text: string; html?: string }`; `formatTabs(format: Format, groups: readonly (readonly TabRecord[])[]): ClipboardPayload`; `formatExample(format: Format, tab: TabRecord): string` (one line: the first item of the format, no wrapper).

- [ ] **Step 1: Write failing tests** with the tab `t = {title:'Fish & Chips [v2]', url:'https://example.com/a_(b)?x=1&y=2', windowId:1, index:0, pinned:false, active:true, groupId:-1}` and exact expected `text` for `formatTabs(f, [[t]])`:
  - `URL`: the url. `Title`: the title. `Title & URL`: `Fish & Chips [v2]: https://example.com/a_(b)?x=1&y=2`.
  - `Markdown`: `- [Fish & Chips \[v2\]](https://example.com/a_%28b%29?x=1&y=2)`.
  - `BBCode`: `[url=https://example.com/a_(b)?x=1&y=2]Fish & Chips (v2)[/url]`.
  - `HTML`: `<ul>\n  <li><a href="https://example.com/a_(b)?x=1&amp;y=2">Fish &amp; Chips [v2]</a></li>\n</ul>`, and `html` is undefined.
  - `Link`: `text` `Fish & Chips [v2] (https://example.com/a_(b)?x=1&y=2)`; `html` `<a href="https://example.com/a_(b)?x=1&amp;y=2">Fish &amp; Chips [v2]</a>`.
  - `CSV`: `title,url,window,index,pinned,active\n"Fish & Chips [v2]","https://example.com/a_(b)?x=1&y=2",1,0,false,true`.
  - `JSON`: `JSON.parse(text)` equals `[{title:'Fish & Chips [v2]',url:'https://example.com/a_(b)?x=1&y=2',windowId:1,index:0,pinned:false,active:true,groupId:-1}]` (no `favIconUrl` or `lastAccessed` keys when undefined; two-space indent).
  - `HTML table`: `<table>\n  <tr><th>Title</th><th>URL</th><th>Window</th></tr>\n  <tr><td>Fish &amp; Chips [v2]</td><td><a href="https://example.com/a_(b)?x=1&amp;y=2">https://example.com/a_(b)?x=1&amp;y=2</a></td><td>1</td></tr>\n</table>`, with `html` equal to `text`.
  - `Groups`: `formatTabs('URL', [[t],[t2]])` text is `t.url + '\n\n' + t2.url`; `HTML` gives two `<ul>` blocks; `CSV`, `JSON`, `HTML table` ignore groups (one header, flat).
  - `CSV formula guard`: title `=SUM(A1)` gives cell `"'=SUM(A1)"`. Quotes: title `a "b"` gives `"a ""b"""`.
  - `Review Focus 2`: a title `'line1\nline2 🙂 ‮abc'` gives exactly one CSV record line count of 1 data row when parsed by `parseList` round trip (see below), a JSON string that round-trips through `JSON.parse`, and an HTML-escaped `<li>`; a 10,000-character title is not truncated in `Title`.
  - `Round trip` for each of the nine URL-carrying formats: `parseList(formatTabs(f,[[t]]).text).entries.map(e => urlKey(e.url))` equals `[urlKey(t.url)]`.
  - `formatExample('Markdown', t)` equals `- [Fish & Chips \[v2\]](https://example.com/a_%28b%29?x=1&y=2)`; `formatExample('CSV', t)` equals the data row only.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** one pure function per format in `formatters.ts` (a `Record<Format, …>` table). Titles with `\n` or `\r` become spaces in every text format (CSV and JSON escape instead). If the file passes 250 lines, split HTML and Markdown escapers into `src/utils/escape.ts`.
- [ ] **Step 4: Run the gate. Commit** `feat: ten copy formats with escaping and round trip`.

---

### Task 6: Tab sources and the lookup (spec 5.1)

**Files:**
- Create: `src/utils/tabs-source.ts`
- Test: `tests/unit/utils/tabs-source.test.ts`

**Interfaces:**
- Produces: `toTabRecord(tab: chrome.tabs.Tab): TabRecord | null`; `interface LoadedTabs { active: TabRecord | null; window: TabRecord[]; selected: TabRecord[]; all: TabRecord[][]; known: TabRecord[] }`; `loadTabs(): Promise<LoadedTabs>`; `resolveTabs(groups: readonly (readonly string[])[], known: readonly TabRecord[]): TabRecord[][]` (match each URL by `urlKey` to the first tab in `known`; an unmatched URL becomes `{title:url,url,windowId:0,index:0,pinned:false,active:false,groupId:-1}`).

- [ ] **Step 1: Write failing tests.** `toTabRecord`: returns `null` for url `chrome://newtab/`, `chrome://new-tab-page/`, `about:blank`, and for a tab with empty `url` and empty `pendingUrl`; uses `pendingUrl` when `url` is empty (Review Focus 3); uses the URL as the title when `title` is undefined or empty; keeps `pinned` tabs; copies `favIconUrl` and `lastAccessed` only when present. `loadTabs` with mocks: `chrome.windows.getCurrent` resolves `{id:1,incognito:false}`; `chrome.windows.getAll` is called with `{ populate: true, windowTypes: ['normal'] }`; a window with `incognito: true` is left out for a normal current window, and the reverse; `selected` holds only highlighted tabs of the current window; `all` is one array per window in window order; `known` is the flat list; `active` is the active tab of the current window; a discarded tab is kept.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Add `windows.getCurrent` and `windows.getAll` mocks to `tests/setup.ts` with the real callback-or-promise signature used in the code (use the promise form; Chrome 110 supports it).
- [ ] **Step 4: Run the gate. Commit** `feat: tab sources with privacy and junk filters`.

---

### Task 7: Default source and the open planner (spec 5.1 to 5.3)

**Files:**
- Create: `src/utils/source-choice.ts`, `src/utils/open-plan.ts`
- Test: `tests/unit/utils/source-choice.test.ts`, `tests/unit/utils/open-plan.test.ts`

**Interfaces:**
- `source-choice.ts`: `interface SourceCounts { selected: number; clipboard: number; window: number; all: number }`; `chooseDefaultSource(counts: SourceCounts): SourceId`; `sourceOptions(counts: SourceCounts): ReadonlyArray<{ id: SourceId; label: string }>` (labels from Global Constraints; `selected` listed only when selected ≥ 2; `clipboard` only when clipboard ≥ 2; order: selected, clipboard, window, tab, all).
- `open-plan.ts`: `interface OpenPlan { batch: Entry[]; skipped: Entry[]; waiting: Entry[] }`; `planOpen(text: string, openKeys: ReadonlySet<string>, cap: number): OpenPlan` (entries already open are `skipped`; the first `cap` of the rest are `batch`; the remainder `waiting`); `openLabel(plan: OpenPlan, cap: number, continuing: boolean): string`; `remainingText(text: string, plan: OpenPlan, opened: readonly Entry[]): string`.

- [ ] **Step 1: Write failing tests.** `chooseDefaultSource`: `{selected:2,clipboard:5,window:6,all:9}` gives `'selected'`; `{selected:1,clipboard:5,...}` gives `'clipboard'`; `{selected:0,clipboard:1,window:6}` gives `'window'`; `{selected:0,clipboard:0,window:1}` gives `'tab'`; `{selected:0,clipboard:0,window:0}` gives `'window'`. `sourceOptions` labels: `'This window (3)'`, `'Clipboard (5 URLs)'`, `'Selected tabs (2)'`, `'This tab (1)'`, `'All windows (4)'`. `planOpen` (cap 20): 45 distinct URLs, none open gives `batch.length` 20, `waiting.length` 25; the same text with 2 of the URLs in `openKeys` gives `skipped.length` 2 and `batch.length` 20 (skipped do not count toward the cap). `openLabel`: 3 URLs gives `'Open 3 URLs'`; 1 URL gives `'Open 1 URL'`; 45 URLs gives `'Open first 20 of 45'`; same with `continuing: true` and 25 left gives `'Open next 20 of 25'`; all 6 open gives `'Open 0 URLs'`. `remainingText`: for text `'https://a.com\nhttps://b.com\nnote\nhttps://c.com'` with cap 2, `batch` is the first two lines, `waiting` is `note` and `c.com`; with both batch entries opened the result is `'note\nhttps://c.com'`; a line whose entries were all opened or skipped is removed; a line with an entry still in `waiting` stays; when `opened` is empty the text is returned unchanged. Structured text (JSON) with 2 opened of 3 returns the remaining URL on its own line.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both files. `planOpen` uses `parseList` and `urlKey`; search entries are never "open".
- [ ] **Step 4: Run the gate. Commit** `feat: source choice and open planner`.

---

### Task 8: Details totals in local storage and the openList reply

**Files:**
- Move: `src/background/metrics.ts` to `src/utils/metrics-store.ts` (update every import)
- Modify: `src/schemas/metrics.ts`, `src/schemas/messages.ts`, `src/background/open-list.ts`, `src/background/messages.ts`, `src/types/index.ts`
- Test: `tests/unit/utils/metrics-store.test.ts` (moved from `tests/unit/background/metrics.test.ts`), `tests/unit/background/open-list.test.ts`, `tests/unit/background/messages.test.ts`

**Interfaces:**
- `metrics-store.ts`: `getTotals(): Promise<Totals>` (`chrome.storage.local['totals']`, Zod-checked); `addTotals(delta: Partial<Totals>): Promise<void>` (serialized queue from Plan A Task 6); `recordError(message: string): Promise<void>`; `markSessionStart(now?: number): Promise<void>` and `getOpenSince(): Promise<number>` (`chrome.storage.session['openSince']`, 0 when missing). `Totals` = {`tabsOpened`, `tabsFailed`, `urlsProcessed` (ints ≥ 0), `lastError: string | null`}.
- `OpenListResult` gains `opened: string[]` (the input lines that opened a tab).
- The `getMetrics` message, `MetricsResponseSchema`, `GetMetricsMessageSchema`, and the `serviceWorkerState` key are deleted.

- [ ] **Step 1: Write failing tests.** `addTotals adds to stored totals and keeps them across a simulated restart` (session storage cleared, local storage kept). `getTotals returns zeros for corrupt storage`. `openList('https://a.com\nhttps://b.com') returns opened: ['https://a.com','https://b.com']`. `handleMessage rejects {action:'getMetrics'} as unknown`. `Totals never hold URLs`: assert the stored object keys are exactly `tabsOpened, tabsFailed, urlsProcessed, lastError`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `openList` calls `addTotals` instead of `batchIncrementMetrics` and fills `opened`. Update `lifecycle.ts` (Plan A Task 5) to call `markSessionStart` from the new path.
- [ ] **Step 4: Run the gate.** The old popup hooks still import removed items: temporarily keep `useMetrics` compiling by pointing it at `getTotals` and `getOpenSince` (Task 11 deletes it). Expected: PASS.
- [ ] **Step 5: Commit** `feat: Details totals persist in local storage`.

---

### Task 9: Clipboard and permission helpers (spec 7)

**Files:**
- Create: `src/utils/clipboard.ts`
- Test: `tests/unit/utils/clipboard.test.ts`

**Interfaces:**
- Produces: `hasClipboardPermission(): Promise<boolean>` (`chrome.permissions.contains({permissions:['clipboardRead']})`); `requestClipboardPermission(): Promise<boolean>` (`chrome.permissions.request`); `readClipboardUrls(): Promise<string[] | null>` (null when not granted, when `navigator.clipboard.readText` rejects, or when the text is over 1,000,000 characters; otherwise the `url` entries of `parseList` that start with `http`); `writeClipboard(payload: ClipboardPayload): Promise<void>` (`navigator.clipboard.write([new ClipboardItem({'text/plain': Blob, 'text/html': Blob})])` when `html` is set; `writeText` otherwise).

- [ ] **Step 1: Write failing tests** with `navigator.clipboard` mocked: `readClipboardUrls returns null when permission is missing and never calls readText`; `returns the urls of 'https://a.com\nhttps://b.com'`; `returns null when readText rejects` and `returns null for a 1,000,001-character text without parsing it` (Review Focus 4); `writeClipboard calls write with both flavors for a payload with html` and `writeText for a payload without`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** and add `permissions.contains` and `permissions.request` mocks to `tests/setup.ts` with the real callback-or-promise shape the code uses.
- [ ] **Step 4: Run the gate. Commit** `feat: clipboard read and write helpers with optional permission`.

---

### Task 10: Popup state hooks

**Files:**
- Create: `src/hooks/useSources.ts`, `src/hooks/useFormat.ts`, `src/hooks/useDetails.ts`, `src/hooks/useListActions.ts`
- Test: `tests/unit/hooks/useSources.test.ts`, `tests/unit/hooks/useFormat.test.ts`, `tests/unit/hooks/useDetails.test.ts`, `tests/unit/hooks/useListActions.test.ts`

**Interfaces (all return plain objects; no JSX):**
- `useSources(): { options: ReadonlyArray<{id: SourceId; label: string}>; source: SourceId; text: string; setText(t: string): void; changeSource(id: SourceId): void; notice: string; clipboardPrompt: 'hidden' | 'button' | 'details'; enableClipboard(): Promise<void>; dismissPrompt(): void; known: TabRecord[] }`. On mount it runs `loadTabs`, `readClipboardUrls`, `chooseDefaultSource`, fills `text` (URLs joined by `\n`; `all` source puts a blank line between windows), and sets `notice` to `'Using 5 URLs from your clipboard.'` when the clipboard source wins. `changeSource` always replaces `text` and sets `notice` to `'List replaced with N tabs from this window.'` (label text lowercased after "from"). A user edit via `setText` never changes `source`. `clipboardPrompt` is `'button'` until dismissed once, then `'details'`; `'hidden'` when the permission is granted.
- `useFormat(): { format: Format; changeFormat(f: Format): void }` (reads `getFormat`, writes `setFormat`).
- `useDetails(): { totals: Totals; openSince: number; refresh(): Promise<void> }` (reads once on mount; no timer).
- `useListActions(args: { text: string; setText(t: string): void; known: TabRecord[]; format: Format }): { openLabel: string; copyLabel: string; example: string; status: string; error: string | null; running: boolean; open(): Promise<void>; copy(): Promise<void> }`.

- [ ] **Step 1: Write failing tests** (hook tests use `renderHook` and the chrome mocks):
  - `useSources picks 'selected' when two tabs are highlighted`, `'clipboard' when the clipboard holds 2 URLs and permission is granted`, `'window' when the clipboard holds 1 URL`, `'tab' for a one-tab window`; `changeSource('all') replaces edited text and sets the notice`; `typing never changes source`; `enableClipboard grants, re-reads, and hides the prompt`; `a rejected readText leaves the window source and no notice`.
  - `useFormat starts at 'URL' and persists the change`.
  - `useDetails reads totals and openSince once and refresh reads again; it sets no interval` (spy `setInterval` not called).
  - `useListActions`: `copyLabel is 'Copy 3 as Markdown'` for 3 URL lines; `openLabel is 'Open 0 URLs'` when all are open (`chrome.tabs.query` returns them); `copy() writes the formatted payload via writeClipboard and sets status 'Copied 3 as Markdown.'`; `copy() with search lines sets 'Copied 5 as Markdown, skipped 1 search term.'`; `copy() with an empty list sets 'Nothing to copy.'` (Review Focus 5); `open() sends {action:'openList', urls} with the batch only, then removes the opened lines from the text (remainingText) and sets status 'Opened 4, skipped 2 already open.'`; `open() when nothing opens leaves the text unchanged and sets 'All 6 URLs are already open.'`; `open() on an empty list sets error 'Please enter some URLs or text to search.'` and no message is sent; `after the first batch of 45 the label reads 'Open next 20 of 25'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the four hooks to the interfaces; the logic lives in the pure modules of Tasks 4 to 9. Messages to the service worker use `OpenListMessageSchema` and `OpenListResponseSchema` from `@/schemas/messages` (parse the reply; on a parse failure set `error` to `'Failed to open tabs'`).
- [ ] **Step 4: Run the gate. Commit** `feat: popup state hooks`.

---

### Task 11: Popup components, styles, and removal of the old popup

**Files:**
- Create: `src/components/UrlList.tsx`, `SourceSelect.tsx`, `ActionButtons.tsx`, `FormatSelect.tsx`, `StatusLine.tsx`, `DetailsPanel.tsx`, `ClipboardPrompt.tsx` (all in `src/components/`)
- Modify: `src/popup/App.tsx`, `src/popup/main.css`, `src/components/Footer.tsx` (keeps the version-aware text from Plan A Task 11), `src/schemas/messages.ts`, `src/background/messages.ts`
- Delete: `src/components/StatusBar.tsx`, `MetricsGrid.tsx`, `src/hooks/useMetrics.ts`, `useOpenUrls.ts`, and their tests; the `getCurrentTabUrls` message, schema, handler, and tests
- Test: `tests/unit/components/*.test.tsx` (one per component), `tests/unit/popup/App.test.tsx`

**Interfaces (props; every component also receives nothing else):**
- `UrlList({ value, onChange, invalid, describedBy })`: a `<label htmlFor>` "URLs, one per line", a `<textarea>` that focuses and selects all text once on first mount, `aria-invalid` when `invalid`. `onKeyDown`: Ctrl+Enter or Cmd+Enter (`metaKey`) calls `onOpen` (prop `onOpen: () => void`).
- `SourceSelect({ options, value, onChange })`: label "From", native `<select>`.
- `ActionButtons({ openLabel, copyLabel, onOpen, onCopy, disabled })`: two `<button type="button">`; Open has class `btn-open` (filled), Copy has `btn-copy` (plain); order fixed.
- `FormatSelect({ value, onChange, example })`: label "Copy as", native `<select>` with three `<optgroup>` from `FORMAT_GROUPS`, an example `<p id>` linked by `aria-describedby`.
- `StatusLine({ message, error })`: `<p role="status">` always rendered; the error box `role="alert"` only when `error`.
- `DetailsPanel({ totals, openSince, onRefresh, children })`: `<details>` closed; four values "Success rate", "Tabs opened", "Errors", "Open since"; a `Refresh` button; renders `children` (the clipboard prompt when it moved here).
- `ClipboardPrompt({ onEnable, onDismiss })`: a button "Turn on clipboard detection" and a "Not now" button.
- `App()` wires `useSources`, `useFormat`, `useDetails`, `useListActions` inside the existing `ErrorBoundary`, with the layout order of spec 5 and a `<h1>OpenList</h1>`.

- [ ] **Step 1: Write failing component tests.** For every component: render, then `expect(await axe(container)).toHaveNoViolations()` (the roles and labels are the test of 1.3.1, 3.3.2, 4.1.2, 4.1.3). Plus: `UrlList selects all text on mount` (`selectionStart` 0 and `selectionEnd` equal to length), `calls onOpen for Ctrl+Enter and for Cmd+Enter`, `does not call onOpen for plain Enter`. `ActionButtons renders Open before Copy and gives only Open the btn-open class`. `FormatSelect lists 10 options in 3 optgroups in the Global Constraints order`. `StatusLine renders an empty role=status element when there is no message`. `DetailsPanel is closed by default`. `App: with 3 tabs mocked, the first render shows 'Open 0 URLs' (all open), 'Copy 3 as URL', and the example line`; `App sets no setInterval`; `a window with all tabs filtered shows 'Open 0 URLs' and Copy click says 'Nothing to copy.'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the components and rewrite `main.css` from `tokens.css` variables using the mockup's spacing: `.popup` width `min(450px,100vw)`; controls `min-height: 44px`; `.btn-open` fill `var(--accent)` text `var(--on-accent)`; `.btn-copy` surface with `var(--border)`; selects and textarea border `var(--border)`; focus ring `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`; hover step 1 px only inside `@media (hover:hover) and (pointer:fine)`; `@media (prefers-reduced-motion: reduce)` removes transitions and transforms; `@media (forced-colors: active)` keeps a visible border and focus outline. Delete the listed old files and the `getCurrentTabUrls` and `getMetrics` remnants.
- [ ] **Step 4: Run the gate and `$P knip --production`.** Expected: PASS and no unused exports.
- [ ] **Step 5: Commit** `feat: single-list popup with accessible components`.

---

### Task 12: Style guards cover the whole source tree

**Files:**
- Modify: `tests/unit/project-layout.test.ts` and every file under `src/popup/`, `src/components/`, `src/hooks/` that fails a guard

**Interfaces:** The three guards from Plan A Task 12 (purpose comment, TSDoc with `@returns`, no `.then(`) now cover all of `src/` and `tests/`. Add: `every exported React component and function has an explicit return type` (regex on `export function \w+\([^)]*\)\s*\{` without `:` before `{` fails).

- [ ] **Step 1: Remove the folder exclusions** from the guards. Run `$P vitest run tests/unit/project-layout.test.ts`. Expected: FAIL listing files.
- [ ] **Step 2: Fix the listed files** (comments, TSDoc, `: JSX.Element` or `: ReactElement` return types). No behavior changes.
- [ ] **Step 3: Run the gate. Commit** `style: purpose comments, TSDoc, and return types in the popup`.

---

### Task 13: Copy without the popup (spec 8)

**Files:**
- Create: `src/background/copy-window.ts`, `src/background/feedback.ts`, `src/offscreen/index.html`, `src/offscreen/index.ts`
- Modify: `src/manifest.json`, `src/background/context-menu.ts`, `src/background/index.ts`, `tests/setup.ts`
- Test: `tests/unit/background/copy-window.test.ts`, `tests/unit/background/feedback.test.ts`, `tests/unit/offscreen/index.test.ts`, `tests/unit/background/context-menu.test.ts`

**Interfaces:**
- `feedback.ts`: `showResult(message: string, ok: boolean): Promise<void>` (`chrome.action.setBadgeText` with `'✓'` or `'!'`, `setBadgeBackgroundColor` `#0b57d0` or `#b3261e`, `setBadgeTextColor` `#ffffff`, `setTitle` with `message`; after 3000 ms via `setTimeout` clears the badge and resets the title to the manifest `action.default_title`).
- `copy-window.ts`: `copyWindowTabs(): Promise<void>` (`loadTabs`, take `window`, format with `getFormat`, `formatTabs`, ensure the offscreen document, send `{target:'offscreen', type:'copy', payload}`, close the document, `showResult` with `'Copied N as FORMAT.'` or `'Nothing to copy.'` or the error text; never rejects).
- `src/offscreen/index.ts`: listens for `chrome.runtime.onMessage` messages with `target === 'offscreen'` and `type === 'copy'`, writes through `writeClipboard` (falling back to a hidden textarea and `document.execCommand('copy')` when `navigator.clipboard.write` rejects) and replies `{ ok: true }` or `{ ok: false, error }`.
- `context-menu.ts`: `initializeContextMenu` also creates `{ id: 'OpenList-CopyWindow', title: "Copy this window's tabs", contexts: ['action'] }` through `createMenuItem`; the `contextMenus.onClicked` handler (in `index.ts`) runs `copyWindowTabs()` for that id.
- `index.ts`: `chrome.commands.onCommand.addListener((name) => name === 'copy-window' && void copyWindowTabs())` at the top level.
- `manifest.json`: the Global Constraints manifest values; `commands`: `{"copy-window":{"suggested_key":{"default":"Alt+Shift+C","mac":"Alt+Shift+C"},"description":"Copy this window's tabs"}}`; `action.default_title`: `"OpenList: open or copy a list of URLs"`; `offscreen` pages need no manifest entry.

- [ ] **Step 1: Write failing tests** (mocks: add `chrome.offscreen.createDocument/closeDocument`, `chrome.commands.onCommand.addListener`, `chrome.action.setTitle/setBadgeTextColor` to `tests/setup.ts`): `showResult sets badge, title, and clears both after 3000 ms (fake timers)`; `copyWindowTabs with 3 tabs and format Markdown sends the Markdown payload to the offscreen document and shows 'Copied 3 as Markdown.'`; `copyWindowTabs with no tabs shows 'Nothing to copy.' and creates no document`; `copyWindowTabs does not reject when createDocument rejects and shows the error`; `when createDocument rejects with 'Only a single offscreen document may be created' it reuses the open one`; `offscreen handler replies {ok:true} after write and falls back to execCommand when write rejects`; `initializeContextMenu creates two items, the second with contexts ['action']`; `the manifest satisfies the constraints` (read `src/manifest.json`: version floors, `permissions`, `optional_permissions`, `commands['copy-window']`, no `_execute_action` override, `action.default_title` non-empty).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the interfaces. Add `src/offscreen/index.ts` as a CRXJS-built page: reference it from `copy-window.ts` with `chrome.runtime.getURL('offscreen/index.html')` and list it in `vite.config.ts` build input if CRXJS does not pick it up (verify with `$P build` and look for `dist/offscreen/index.html`).
- [ ] **Step 4: Run the gate and `$P size`.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: copy this window's tabs from a shortcut or the toolbar menu`.

---

### Task 14: End-to-end tests in real Chrome, with axe

**Files:**
- Modify: `tests/e2e/fixtures.ts`, `tests/e2e/popup.spec.ts`, `tests/e2e/keyboard.spec.ts`, `tests/e2e/dark-mode.spec.ts`, `tests/e2e/metrics.spec.ts`
- Create: `tests/e2e/copy.spec.ts`, `tests/e2e/open.spec.ts`, `tests/e2e/a11y.spec.ts`

**Interfaces:** `fixtures.ts` exports `test` with fixtures `context` (a persistent Chromium context from `chromium.launchPersistentContext(userDataDir, { channel: 'chromium', headless: true, args: ['--disable-extensions-except=dist','--load-extension=dist'] })` with `userDataDir` under `temp/`), `extensionId` (from the service worker URL), `site` (a local HTTP server on `127.0.0.1` serving pages `/a.html` to `/z.html` with distinct `<title>` values), and `popup(page)` helper that opens `chrome-extension://<id>/popup/index.html`.

- [ ] **Step 1: Install the browser inside the project.** `PLAYWRIGHT_BROWSERS_PATH=$PWD/temp/ms-playwright $P exec playwright install chromium` then `$P build`. Expected: `dist/` exists.
- [ ] **Step 2: Write the tests** (no fixed sleeps; wait on a locator or a tab count with `expect.poll`):
  - `copy.spec`: open three site pages in one window; open the popup; choose "Copy as" Markdown; click the Copy button; read `navigator.clipboard.readText()` in the popup page (grant `clipboard-read` and `clipboard-write`); expect three `- [Title](url)` lines. Repeat for `CSV` (header plus 3 rows) and `JSON` (parse, 3 objects). `All windows` with a second window: blank line between windows in `URL` format.
  - `open.spec`: paste 3 URLs into the list, press Ctrl+Enter, expect 3 new tabs; paste the same URLs again, expect status `'All 3 URLs are already open.'` and no new tabs; paste 45 distinct site URLs (reuse `/a.html?n=1` …), click Open, expect 20 new tabs and the label `'Open next 20 of 25'`, click again, expect 20 more, then 5 with `'Open 5 URLs'`.
  - `a11y.spec`: for each of light and dark (`page.emulateMedia({ colorScheme })`) and for the default, error, and Details-open states: `(await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()).violations` equals `[]`. Keyboard: Tab order is list, From, Open, Copy, Copy as, Details summary, footer link; the focused element always shows an outline of at least 2 px (`getComputedStyle`).
  - Keep and repair the existing dark-mode, keyboard, and metrics specs: replace every `waitForTimeout` with a wait on a condition; the metrics spec asserts the Details totals text after an Open without waiting 3 seconds.
- [ ] **Step 3: Run.** `$P exec playwright test` Expected: PASS. Fix real defects the tests find in the product code, not in the tests.
- [ ] **Step 4: Run the full gate. Commit** `test: end-to-end copy, open, and accessibility scans in real Chrome`.

---

### Task 15: Manual accessibility record, store notes, release

**Files:**
- Create: `docs/accessibility.md`, `docs/store-notes.md`
- Modify: `README.md`, `CHANGELOG.md`, `docs/prd.md`, `src/manifest.json`, `package.json`
- Test: `tests/unit/project-layout.test.ts` (add one guard)

**Interfaces:** A guard `manifest version equals package version`. Version becomes `1.2.0` in both files.

- [ ] **Step 1: Write the failing guard** and run it after bumping only `package.json`. Expected: FAIL. Bump `src/manifest.json`. Expected: PASS.
- [ ] **Step 2: Do the manual pass** and record it in `docs/accessibility.md` with the standard (WCAG 2.1 AA), the date, the build version, and for each item the result and any known gap: keyboard only (every control reachable, Ctrl and Cmd+Enter, focus visible); VoiceOver on macOS (labels, the status line announces copy and open results, the alert announces the empty-list error, a long pre-filled list on focus); browser zoom 200% and 400% (no sideways scroll, no clipped text); a text-spacing override; Windows forced colors (a visible border and focus ring). Record the Chrome checks of spec section 14: the optional permission accepted and the prompt's effect on the popup; the offscreen clipboard write and any permission it needs; Ctrl+Z after a paste; `selectionText` newlines; the screen-reader read of the pre-filled list. If a check fails, fix the product (new task steps), then record again.
- [ ] **Step 3: Write `docs/store-notes.md`:** a justification line for each permission (`tabs` read titles and URLs; `contextMenus`; `storage` remember the format and totals; `offscreen` write the clipboard from a shortcut; optional `clipboardRead` detect a copied URL list; optional `clipboardWrite` write the clipboard from the offscreen page), and the privacy statement of spec section 3.
- [ ] **Step 4: Update documents.** `README.md` Usage rewritten for the single list, the formats, the shortcut, and the clipboard button; Privacy section states the optional clipboard read; History entry 1.2.0. `CHANGELOG.md` and `docs/prd.md` (mark accessibility, extraction, copy, and shortcut as done, with the test names that prove them).
- [ ] **Step 5: Final gate.** `$P check` then `$P exec playwright test`. Expected: PASS. Run `graphify update .` and `qmd update && qmd embed`.
- [ ] **Step 6: Commit** `chore: release 1.2.0 with the single-list popup, copy formats, and WCAG 2.1 AA record`.

## Self-review notes

- Spec coverage: section 5 (popup) is Tasks 7, 10, 11; 5.6 Details is Tasks 8 and 11; 6.1 is Task 4; 6.2 to 6.4 are Tasks 5 and 10; 7 is Tasks 9 and 10; 8 is Task 13; 9 (accessibility) is Tasks 1, 2, 11, 14, 15; 10 (tests) runs through every task; 14 (Chrome checks) is Task 15 Step 2; 3 (constraints) is Global Constraints.
- Type names used across tasks: `Entry`, `ParsedList`, `urlKey` (Task 4); `ClipboardPayload`, `formatTabs`, `formatExample` (Task 5); `TabRecord`, `LoadedTabs`, `resolveTabs` (Tasks 3 and 6); `OpenPlan`, `planOpen`, `openLabel`, `remainingText`, `chooseDefaultSource`, `sourceOptions` (Task 7); `Totals` (Task 8); `readClipboardUrls`, `writeClipboard` (Task 9). Tasks 10 and 11 use these names exactly.
- Items left to the builder by the spec: exact status wording beyond the strings fixed above, the shortcut key (`Alt+Shift+C` is a suggestion to verify against Chrome and DevTools), CSS values not fixed by the tokens.
