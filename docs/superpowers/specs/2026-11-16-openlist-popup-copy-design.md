# OpenList popup redesign and copy-tabs feature: design

Date: 2026-11-16
Status: draft for approval. Not committed. The folder `docs/` is ignored by git until phase 1 of the work plan fixes `.gitignore`.
Inputs: output/review/2026-11-16-openlist-review.md (audit, work plan, decision table in section E), the clickable mockup `.superpowers/brainstorm/5627-1794845633/content/popup-mockup-v5.html`, the reference screenshot docs/clean-room/2026-11-16_10-55-15-reference-screenshot.png.

## 0. Calls I made (please read before you approve)

The owner did not decide these. Each is marked "(My call.)" in the section it affects.

1. The implementation plan covers phases 1 to 9. The feature waits for phases 1 to 6 and phase 8. Only phase 7 runs in parallel.
2. Source order for "From": Selected tabs, then Clipboard, then This window. A window with one tab starts at "This tab".
3. After Open, a whole line leaves the list when all its URLs were opened or skipped, and only if at least one tab opened. Ignored lines stay. Skipped URLs do not count toward the 20-tab cap.
4. The Open count excludes URLs that are already open. On the default list it reads "Open 0 URLs", and the status line explains.
5. The parsing rule (section 6.1): detect JSON, the CSV header, or HTML first. Otherwise read line by line: addresses, then site-like lines, then searches.
6. A blank line always ends a group. CSV, JSON, and HTML table are flat and carry a window field.
7. Round trip means the same page, not the same string. Title does not round-trip.
8. Copy skips search lines. Open counts them. The status line reports the difference.
9. Incognito: a window lists only tabs of its own privacy kind.
10. HTML copies its source as plain text only. HTML table and Link carry `text/html`.
11. After one dismissal, the "Turn on clipboard detection" button moves into Details.
12. The shortcut and toolbar item report their result with a badge and `setTitle`. A badge alone is not announced by a screen reader.
13. Fallback for D8: if the offscreen write needs `clipboardWrite`, that permission is optional too and shares the one-time button.

## 1. Intent and why

OpenList is a Chrome extension with two jobs on one list of URLs: open the list as tabs, or copy the list. The owner wants it to stay focused on those two jobs. The guiding rule is "don't make me think": each default must do the right thing without the user reading anything.

New capability: copy the URLs and other tab data (title, window, position, pinned state, and more) of open tabs to the clipboard in many formats, so the list can move to other applications and other people. A second capability: copy this window's tabs without opening the popup. The popup also gets a new look, and the whole extension meets WCAG 2.1 level AA.

Why now: the extension only opens URLs and fills a text box with the current window's URLs. People who share tab lists need Markdown, CSV, JSON, HTML, and similar formats. The current popup also fails several WCAG 2.1 criteria (see the audit, section H5).

## 2. Goals, non-goals, anti-goals

Goals:
- One list, two verbs (Open and Copy), on one screen.
- Defaults that follow the state of the window and the clipboard, and that the user can see and change.
- Ten copy formats, remembered between uses.
- A popup that fits Chrome's 600 px height limit, in light and dark mode.
- WCAG 2.1 AA, proven by automated tests and a recorded manual pass.

Non-goals (decided, deferred):
- Opening a list into a browser tab group (needs the `tabGroups` permission and a naming rule).
- Restoring an unsent draft list.
- Custom copy templates, a tab text filter, a TSV format, pause and resume for long lists, backup or export of saved sessions.
- Page text. The feature copies tab fields only, never page contents.

Anti-goals (the work fails even if it passes its tests):
- A mode switch or a setting the user must understand before the first use.
- A default that silently destroys the user's typed text.
- A hidden rule. Every automatic choice is visible in a control or reported in the status line.
- Copying the reference product's code, wording, layout, or styling (see section 11).

## 3. Constraints

- **Orientation wins.** When docs/orientation.md and docs/rules-chrome-ext.md conflict, the orientation document wins. All tests go in `tests/` (unit in `tests/unit/`, end-to-end in `tests/e2e/`).
- Manifest V3. TypeScript strict. React 19. Vite and CRXJS. Zod for every external value (storage, messages, clipboard text, tab data). Biome, Knip, Vitest, Playwright.
- Skip `webext-bridge`. Messages between the popup and the service worker stay Zod-validated runtime messages.
- Add a `size-limit` script and an `audit` script. Do not add `eslint-plugin-compat` or `vitest-chrome`.
- Permissions today: `contextMenus`, `storage`, `tabs`. New: `offscreen` (write the clipboard from the service worker), and a `commands` entry (a keyboard shortcut; `commands` needs no permission). New optional permission, in `optional_permissions`: `clipboardRead` (read the clipboard when the popup opens). It is optional because it shows an install warning, and an update that adds a warning can turn the extension off for existing users (decision D12). `minimum_chrome_version` rises from 102 to 110. `offscreen` needs 109 and `chrome.action.setBadgeTextColor` needs 110 (both reported by the Chrome docs check, section 16).
- Privacy: the clipboard text is used only to find URLs. It is never stored, logged, or sent anywhere. The README privacy text and the store permission notes change to say so.
- No file over 250 lines. A purpose comment on line 1 of every file. TSDoc on every exported function. Explicit return types.
- The 20-tab cap and the 100 ms delay between tabs stay (`CONFIG.MAX_TABS`, `CONFIG.DELAY_BETWEEN_TABS`).

## 4. Approaches considered

| Approach | What it is | Result |
|----------|------------|--------|
| A. Separate Copy view | An Open view and a Copy view behind a two-button switch | Chosen first, then replaced. The switch makes the user pick a mode before the job. |
| B. Copy controls on the same screen as the text area | A crowded single screen | Rejected. Too many controls. |
| C. No popup UI, shortcuts and menus only | Clipboard write needs an offscreen page. Hard to discover. | Rejected as the only way. Kept as an addition (section 8). |
| **Chosen: one list, two verbs** | One editable list on top. A filled Open button and a plain Copy button below it. The format control below those. | Fewest decisions for the user. Matches the original purpose. |

## 5. The popup (the design)

Width 450 px. Light and dark themes follow `prefers-color-scheme`. Target height at most 600 px with the Details section open (the mockup measures 594 px open and 491 px closed).

Layout, top to bottom:

1. Heading "OpenList" (an `h1`).
2. A row: label "URLs, one per line" (left) and a "From" control (right).
3. The list: a multi-line text box, 150 px high.
4. An error box (only when needed).
5. Two buttons in one row: **Open N URLs** (filled, wider) and **Copy N as FORMAT** (plain). Positions and styles never change.
6. A row: label "Copy as" and the format dropdown.
7. A one-line example of the chosen format, built from the first URL in the list.
8. A status line.
9. A "Details" disclosure (closed by default).
10. The footer link.

### 5.1 The "From" control

A native select. The options carry counts: "This window (6)".

| Option | Shown when | What the list holds |
|--------|------------|---------------------|
| Selected tabs (N) | Two or more tabs are highlighted in the current window | The URLs of the highlighted tabs |
| Clipboard (N URLs) | The clipboard holds two or more URLs | The URLs found in the clipboard text |
| This window (N) | Always | The URLs of this window's tabs |
| This tab (1) | Always | The URL of the active tab |
| All windows (N) | Always | The URLs of all normal windows, a blank line between windows |

The popup picks the first option that applies, in this order: Selected tabs, Clipboard, This window. This order is my call; the audit decision table does not set it. A window with only one tab starts at "This tab". The user can change the choice at any time.

Rules:
- Changing the "From" control always replaces the list. The status line says so, for example "List replaced with 12 tabs from all windows." Edits are lost. This is decided.
- The popup never changes a control the user has touched.
- Only tabs whose `incognito` flag equals the flag of the window that holds the popup are used. A normal window never lists private tabs. A private window lists only private tabs. This applies to every source, to the lookup, and to the already-open check. (My call.)
- Filtered out of every tab source: the new-tab page, `about:blank`, and tabs of non-normal windows (devtools, app and popup windows). Pinned tabs stay in.
- A tab with an empty or missing title uses its URL as the title.
- A tab that is still loading uses `pendingUrl` when `url` is empty.

### 5.2 The list

- Filled on open from the chosen source. All the text is selected, so a paste replaces it and Ctrl+C copies it.
- The text box has a visible label and a Zod-checked source. The user can edit it freely.
- The count N in the buttons is the number of URLs found in the list (section 6.1). It updates as the user types.
- A change in the format control never changes the list.

### 5.3 Open

- Opens each URL as a background tab, in list order, with the existing retry and delay.
- Skips a URL that is already open in the current window. The status line reports it: "Opened 4, skipped 2 already open."
- The Open count N excludes URLs that are already open. On the default list (this window's tabs) every URL is already open, so the button reads "Open 0 URLs". That tells the user Copy is the useful action. (My call, after the advisor review.)
- If a click opens nothing, the list does not change, and the status line says "All 6 URLs are already open." Lines that were skipped leave the list only when at least one tab opened.
- The list is stored as raw text. The popup finds the URLs in each line and remembers which line each URL came from. After an Open, a line leaves the list when every URL in it has been opened or skipped as already open. A line with no URL (an ignored line) stays. A line with some URLs left stays whole. (My call.)
- Skipped URLs do not count toward the cap. Only opened tabs count, so "Open first 20 of 45" opens 20 tabs unless fewer URLs remain after skips. (My call.)
- Cap of 20 tabs per click. When the list holds more than 20 URLs, the button reads "Open first 20 of 45". After the click, the opened URLs leave the list, and the button reads "Open next 20 of 25". The URLs that did not open stay. A failed URL stays in the list and is named in the error box.
- An empty list shows the error "Please enter some URLs or text to search." The text box gets `aria-invalid` and `aria-describedby`, and the box uses `role="alert"`.
- The shortcut Ctrl+Enter or Cmd+Enter in the list runs Open. This is fixed and never depends on state. Today only Ctrl+Enter works.

### 5.4 Copy

- Copies the URLs in the list, formatted by the chosen format, to the clipboard.
- Titles and other fields come from a lookup: each URL is matched to an open tab of any normal window. A URL with no match gets its own text as the title and empty values for the other fields. If two tabs share a URL, the first tab in window order wins.
- The status line says what happened: "Copied 6 as Markdown."
- The user can delete lines from the list before copying. That is how the user chooses what to copy.

### 5.5 Copy as: the format control

A native select with three groups:

| Group | Formats |
|-------|---------|
| Plain text | URL, Title, Title & URL |
| Markup | Markdown, BBCode, HTML, Link |
| Data | CSV, JSON, HTML table |

- The first-run default is URL, so a first copy matches what the extension did before.
- The last choice is remembered in `chrome.storage.local` and read back through a Zod schema.
- Changing the format updates the button label and the example. It never moves focus and never starts an action.
- The example line shows the first item in the chosen format, cut with an ellipsis when long.

### 5.6 Details

- Shows four numbers: success rate, tabs opened, errors, and "Open since".
- They are read when the popup opens and after each Open. A "Refresh" button reads them again. No 5-second polling.
- Success rate, tabs opened, and errors are totals. They live in `chrome.storage.local`, so they survive browser restarts, extension updates, and reloads. Read them through a Zod schema. (Owner decision D14, choice A.)
- "Open since" is tied to the browser session. Save its start time in `chrome.storage.session` on install and on browser start, so it is correct (audit defect D3). The unused `restarts` counter is removed.
- A total must stay bounded. Store only counters, never URLs or titles.

### 5.7 Status messages

All status text goes in one `role="status"` line. Errors use `role="alert"`. Examples: "Using 5 URLs from your clipboard.", "List replaced with 3 tabs from this window.", "Opened 4, skipped 2 already open.", "Copied 6 as Markdown.". The builder writes the final wording in the same plain, short style.

## 6. Parsing and formats

### 6.1 What counts as a URL in the list

The extractor looks at the structure of the whole text first. Then it falls back to the original line-by-line rule. (My call, after the advisor review.)

1. If the text parses as JSON, take the `url` value of each object.
2. If the first line is the CSV header that Copy writes (`title,url,window,index,pinned,active`), take the URL column.
3. If the text starts with `<` (HTML), take the `href` values.
4. Otherwise read each line on its own. A line that ends in the Copy shape "Title: URL" or "Title (URL)" gives only its last address, so a title that holds an address adds no page (owner choice B, 2026-11-17; a typed line with two labelled addresses keeps only the last):
   - A line with one or more `http://` or `https://` addresses gives those addresses, in order. This covers Markdown, BBCode, Title & URL, Link, and plain URLs. An `http://` address of a website becomes `https://`. An `http://` address of a local host stays `http://` as typed. Local hosts are `localhost`, `127.0.0.1`, `[::1]`, and any host that ends in `.local`. (Owner decision 17.)
   - A line that looks like a site (`www.example.com`, `example.com`, `news.ycombinator.com/item`) becomes an `https://` URL.
   - Any other line becomes a Google search. This is the original behavior and the README promise.
   - A blank line ends a group.

Repeated URLs are removed. A mixed list therefore behaves as it does today: `https://a.com`, `example.com`, and `best pizza` give a URL, a site, and a search.

Audit defect D1 (bare domains) is fixed first: `example.com`, `x.com`, `news.ycombinator.com`, `example.com/path`, and `WWW.example.com` all become working `https://` URLs. Blocked protocols (`javascript:`, `data:`, `vbscript:`, `file:`, `about:`, `blob:`) are never opened.

The "same page" key (`urlKey`) follows the same rule. For a website, an `http://` tab and its `https://` list entry are one page. For a local host, `http://` and `https://` are two pages.

### 6.2 Formats

Each format has an item form and a wrapper. A blank line in the list always ends a group, whether the popup made it or the user typed it. Text formats show a group as a blank line (URL, Title, Title & URL, Markdown, BBCode, Link) or a new `<ul>` (HTML). CSV, JSON, and HTML table do not show groups. They are flat, and the window field of each tab already says which window it came from. A tab that the lookup cannot match has an empty window field. (My call.)

| Format | Item | Wrapper and notes |
|--------|------|-------------------|
| URL | `URL` | None |
| Title | `Title` | None |
| Title & URL | `Title: URL` | None |
| Markdown | `- [Title](URL)` | Escape `[`, `]`, and `\` in the title. Encode `(`, `)`, and spaces in the URL as `%28`, `%29`, `%20`. A blank line separates window groups. |
| BBCode | `[url=URL]Title[/url]` | Replace `[` and `]` in the title with `(` and `)`. |
| HTML | `<li><a href="URL">Title</a></li>` | Wrapped in `<ul>`. One `<ul>` per window group. Escape `&`, `<`, `>`, and `"`. Clipboard carries `text/plain` only, the source. (My call: HTML and Link would otherwise paste as the same rendered list.) |
| Link | Rich text link | `text/html`: `<a href="URL">Title</a>` per line, joined by `<br>`. `text/plain`: `Title (URL)` per line. This is the rendered-links format. |
| CSV | `"Title","URL",window,index,pinned,active` | A header row first. No blank lines. Quote every text cell, double inner quotes. Prefix a cell that starts with `=`, `+`, `-`, or `@` with `'` so spreadsheets do not run it. |
| JSON | One object per tab | Fields: `title`, `url`, `favIconUrl`, `windowId`, `index`, `pinned`, `active`, `groupId`, `lastAccessed` (ISO date, omitted when the browser does not report it). Pretty-printed array. Always a flat array, with no group wrapper. |
| HTML table | A row per tab | `<table>` with a header row of Title and URL, then `<tr><td>Title</td><td><a href="URL">URL</a></td><td>window</td></tr>`. The header row is Title, URL, Window. Clipboard carries `text/html` (the table rendered) and `text/plain` (the source), so a spreadsheet or word processor receives a table. |

Fields beyond title and URL exist only for tabs found by the lookup. The text formats (URL, Title, Title & URL, Markdown, BBCode, HTML, Link) use title and URL only.

### 6.3 Round trip

Every format that carries URLs must read back into the same list of pages: URL, Title & URL, Markdown, BBCode, HTML, Link, CSV, JSON, and HTML table. Title cannot, because it holds no URLs. The test checks for the same page, not the same string. Two URLs are the same page when their parsed forms match after `%28` and `%29` are turned back into parentheses. The tab lookup and the already-open check use the same rule. The extractor stops a URL at a closing `)` or `"` unless the parenthesis is part of the address. (My call.)

### 6.4 Lines that are not URLs

A line of search words becomes a Google search when Open runs, and the Open count N includes it. Copy skips search lines, and its count excludes them. A site-like line is copied as its `https://` URL. The status line after a click reports any difference, for example "Copied 5 as Markdown, skipped 1 search term." (My call.)

## 7. Clipboard read on open

- The permission `clipboardRead` is optional (decision D12, owner choice B). The popup checks `chrome.permissions.contains` when it opens.
- If the permission is not granted, the popup shows one button, "Turn on clipboard detection", under the status line. It is a real button with a visible label. A click calls `chrome.permissions.request`, which needs a user gesture. If the permission prompt closes the popup, the next open uses the clipboard at once. After one dismissal the button moves into Details so it never nags. (The exact wording and placement are the builder's.)
- If the permission is granted, the popup reads the clipboard text once when it opens.
- If the text holds two or more `http://` or `https://` addresses (site-like text such as example.com does not count), "Clipboard (N URLs)" is added to the "From" control and becomes the default (after "Selected tabs", see section 5.1). The status line says "Using 5 URLs from your clipboard."
- Otherwise the text is dropped at once. A read that fails or is denied is ignored with no message.
- The clipboard is read only when the popup opens. The shortcut and the toolbar menu in section 8 never read it.
- Test in Chrome: whether the permission prompt closes the popup (section 14).

## 8. Copy without the popup

- A keyboard shortcut (a `commands` entry) and a right-click item on the toolbar icon (a `contextMenus` item with the `action` context, titled "Copy this window's tabs").
- Both copy this window's tabs in the remembered format, applying the filters in section 5.1.
- The service worker cannot write to the clipboard. It creates an offscreen document (`offscreen` permission, reason `CLIPBOARD`), sends it the text and flavors, and the offscreen page writes them. The document closes after the write.
- Feedback: a badge for a short time and `chrome.action.setTitle` with the result text, because a screen reader does not announce a badge. Badge text and background must have a 4.5:1 contrast ratio.
- **Fallback (my call).** The docs check could not confirm whether the offscreen write needs `clipboardWrite`. That permission has a warning ("Modify data you copy and paste"), so it must be optional too. If testing shows it is needed, the one-time button in section 7 requests both optional permissions together. Until the user grants them, the shortcut and the toolbar item set a title that says "Open OpenList once to turn on copying."
- The builder picks a suggested shortcut that does not clash with a Chrome or DevTools shortcut. The user can change it at `chrome://extensions/shortcuts`.

## 9. Accessibility (WCAG 2.1 AA, whole extension)

The audit's section H5 lists each criterion and its status. The design requires:

- Color tokens from audit section H4 (accent `#0b57d0` light and `#8ab4f8` dark, error `#b3261e` on `#fce8e6` and `#f9b4ae` on `#402022`, control border `#767676` and `#8e918f`). Every text pair is at least 4.5:1. Every control border and focus ring is at least 3:1.
- Every control has a visible label. The list has a `<label>`. The "From" and "Copy as" controls have visible labels.
- One focus ring for every control: 2 px, `:focus-visible`, 2 px offset, 3:1 on its ground.
- Controls are 44 px high.
- No auto-updating content. Status messages use `role="status"` or `role="alert"`.
- Hover and press movement only for a fine pointer, and none under `prefers-reduced-motion`. A `forced-colors` style for focus and borders.
- A toolbar icon title (`action.default_title`) that names the action.
- The popup width is `min(450px, 100vw)` with no sideways scroll. Test at 200% and 400% zoom.
- Proof: a token test (unit), component tests with `vitest-axe`, an end-to-end scan with `@axe-core/playwright` in light and dark, and a recorded manual pass (keyboard only, VoiceOver, zoom, text spacing, forced colors) in docs/accessibility.md. The extension is not called compliant until that record exists.

## 10. Structure and tests

Suggested modules (the builder may adjust):

- `src/utils/tabs-source.ts` (tab queries and filters), `src/utils/extract-urls.ts` (section 6.1), `src/utils/formatters.ts` (section 6.2, pure functions, one per format), `src/utils/clipboard.ts` (rich and plain writes), `src/schemas/settings.ts` (remembered format), `src/schemas/tab.ts`.
- `src/background/offscreen.ts` and an offscreen page, `src/background/commands.ts`.
- Popup components: `UrlList`, `SourceSelect`, `ActionButtons`, `FormatSelect`, `StatusLine`, `DetailsPanel`, with hooks for the logic.
- Tests: every formatter with hostile titles (quotes, brackets, angle brackets, commas, newlines, leading `=`); extraction of every format's output back into URLs (round trip); the source rules (order, filters, fallbacks); the cap and the "next 20" flow; the skip-duplicates report; clipboard-used and clipboard-ignored cases; the status messages; the accessibility tests in section 9.
- A test must not pass because a mock hides real Chrome behavior. The audit found this for `contextMenus.create`. Mocks must match the real signatures. End-to-end tests run in real Chrome.

## 11. Clean-room record

The screenshot shows a popup with four scope buttons and ten format chips. Only those visible facts guided the feature list. The look, the layout, the single-list model, the defaults, and all wording are this project's own. On 2026-11-16 the owner asked for competitor research. The research agent read the store listing of a product named "Tab Copy", which may or may not be the product in the screenshot. Ideas from the research are in audit section J. The builder must not copy any product's wording, layout, or styling.

## 12. Decisions made by the owner (2026-11-16)

Orientation wins in a conflict. No `webext-bridge`. Add `size-limit` and an `audit` script. Approach A, then the single-list model. Open is the filled button. Read the clipboard on open, using it only with two or more URLs. The permission is optional, with a one-time button to turn it on (D12, choice B). Skip URLs already open and say so. A scope change replaces the list. Details update on open and after each Open, with Refresh. The totals live in `chrome.storage.local` and survive restarts (D14, choice A). Layout version 5 approved. Copy without the popup: yes. After the 20-tab cap: the rest stay in the list. "By window": a blank line between windows. Tab groups: deferred (my call). Dependencies approved: `vitest-axe`, `@axe-core/playwright`. Install them only after this document is approved.

## 13. Left to the builder

Exact wording of every status and error message. The suggested shortcut key. The exact breakpoints inside the popup. The order of options inside a format group. Names of modules and components. How to turn the mockup's CSS into the project's tokens. The release version number.

## 14. To check in real Chrome before relying on it

The Chrome docs check (section 16) answered some of the items that were here. These remain open:

- Whether the popup can read the clipboard after the optional `clipboardRead` is granted, with no further prompt.
- Whether the `chrome.permissions.request` prompt closes the popup.
- Whether the clipboard write works from the offscreen page, and whether it needs the `clipboardWrite` permission (the docs check could not confirm either). If it does, see the fallback in section 8.
- Whether `clipboardRead` is accepted in `optional_permissions`.
- Whether pre-selected text in the list is undone with Ctrl+Z after a paste.
- Whether `selectionText` keeps newlines for a multi-line selection (audit finding D6f).
- Whether a screen reader reads a long pre-filled list sensibly when the text box takes focus on open.

## 15. Order of work

The audit's phases 1 to 7 come first: git hygiene, test layout move to `tests/`, defect fixes (D1 to D6), gates, dependency updates (including zod 4), dead-code removal, and document updates. Then phase 8 (design system and WCAG), then this feature (phase 9). The feature starts only when phases 1 to 6 and phase 8 pass their gates (audit section F). Phase 5 is the zod 4 migration. New schemas are written against zod 4. The `getCurrentTabUrls` round trip is removed by the feature plan, when the new popup stops using it (plan B, Task 11). Only phase 7 (document updates) runs in parallel with the feature. (My call, after the advisor review.) The implementation plan covers all phases 1 to 9, in the order of the audit's work plan.

## 16. Chrome reference check (2026-11-16)

A Haiku agent read the official reference at developer.chrome.com. The fetch tool returns text that a model extracted from each page, so quotes are not checked word for word against the raw page. Treat each fact as "reported by the docs check" until the builder confirms it in Chrome.

| Topic | Reported fact | Effect on this design |
|-------|---------------|-----------------------|
| `offscreen` permission | First in Chrome 109. One offscreen document per extension at a time. Has a `CLIPBOARD` reason. No install warning listed. | The plan in section 8 is allowed. Create the document on demand, and close it after the write. |
| Clipboard write from the background | The offscreen page reports "to write to it in Chrome 156 and earlier". From Chrome 157, a service worker with `clipboardWrite` can write directly. | The offscreen path works now. A later version can drop it. Do not build for the later version yet. |
| `clipboardRead` | Install warning: "Read data you copy and paste." | See the open decision D12 in the audit decision table. |
| `clipboardWrite` | Install warning: "Modify data you copy and paste." | Avoid it unless the offscreen write needs it. |
| `tabs` | Warning: "Read your browsing history." Needed for `url` and `title`, including tabs from `windows.getAll({populate:true})`. | Already granted. No change. |
| `commands` | At most four suggested shortcuts. Must include Ctrl or Alt. Ctrl+Alt is not allowed. `_execute_action` opens the popup and does not fire `onCommand`. | The copy shortcut is a separate named command with `onCommand`. |
| `contextMenus` | `"action"` is a valid context. `create()` takes a callback and returns an id. `removeAll()` returns a Promise from Chrome 123. | Confirms audit defect D2. Use a callback for `create()` and read `chrome.runtime.lastError`. |
| Tab fields | `lastAccessed` from Chrome 121. `groupId` from 88. | `lastAccessed` stays optional. |
| `windows.getAll` | With `windowTypes` unset, it returns `normal` and `popup` windows. | Pass `windowTypes: ["normal"]` so popup windows are excluded. |
| `chrome.action` | `setTitle`, `setBadgeText`, `setBadgeBackgroundColor`. `setBadgeTextColor` from Chrome 110. | Sets the minimum version at 110. |
| `chrome.storage` | Session area clears on disable, reload, update, and browser restart. Local and session quotas are 10 MB. | Confirms audit defect D3 (restart count). The remembered format goes in `local`. |
| Popup size | Not stated on the pages fetched. | Unverified. Test the 600 px limit in Chrome. |
| Clipboard from a popup | The page for it returned HTTP 404. Not answered. | Stays in section 14. |
