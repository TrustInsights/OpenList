# 02 — Source Code Analysis

> Preserved audit note from planning phase. Do not delete — future agents depend on these findings.

## `extension/manifest.json` (44 lines, 1.2K)

### Full Contents Summary

```json
{
  "manifest_version": 3,
  "name": "OpenList",
  "version": "1.0.2",
  "permissions": ["contextMenus", "tabs"],
  "host_permissions": ["*://*/*"],
  "background": { "service_worker": "service-worker.js", "type": "module" },
  "action": { "default_popup": "popup.html", "default_icon": { ... } },
  "content_security_policy": {
    "extension_pages": "default-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests;"
  },
  "web_accessible_resources": [
    { "resources": ["icon/*.png"], "matches": ["<all_urls>"] }
  ],
  "minimum_chrome_version": "102"
}
```

### Issues

- **host_permissions `*://*/*`** is overly broad. The extension opens tabs and reads the clipboard-like textarea — it does not inject into pages. This triggers Chrome Web Store review warnings and violates the principle of least privilege.
- **`web_accessible_resources` with `<all_urls>`** exposes icon files to every website. Since there are no content scripts that embed these icons into pages, this is unnecessary and slightly expands the attack surface.
- **`minimum_chrome_version: 102`** is appropriate for MV3 usage but could potentially be raised to 116+ where service worker improvements landed.
- The CSP is reasonable: no `unsafe-inline`, no `unsafe-eval`. However the code violates it anyway via `innerHTML` (see popup.js analysis below).

---

## `extension/service-worker.js` (315 lines, 9.7K)

### Structure Overview

| Lines | Content |
|-------|---------|
| 1–9 | Global `metrics` object (mutable state) |
| 11–16 | Global `serviceWorkerState` object (mutable state) |
| 19–24 | CONFIG constants |
| 27–37 | `log()` utility function |
| 40–72 | `isProbablyUrl()` — URL validation |
| 75–107 | `sanitizeUrl()` — URL normalization |
| 110–125 | `createTab()` — tab creation with retry |
| 128–200 | `openList()` — main URL processing (73 lines) |
| 203–232 | `initializeContextMenu()` — context menu setup with retry |
| 234–314 | Event listeners (onInstalled, onStartup, onMessage, contextMenus.onClicked) |

### Global Mutable State (Lines 1–16)

```js
const metrics = {
  tabsOpened: 0,
  tabsFailed: 0,
  lastRunDuration: null,
  lastRunTimestamp: null,
  totalRuns: 0,
  errors: [],
  startTime: null,
};

const serviceWorkerState = {
  initialized: false,
  contextMenuReady: false,
  lastError: null,
  restarts: 0,
  startTime: Date.now(),
};
```

**Critical bug:** Both objects live in module-level memory. When Chrome terminates the service worker (after ~30 seconds of inactivity), these values are destroyed. Every wake-up starts fresh with zeros. The `restarts` counter always reads 0 — it cannot increment because the variable is re-initialized on every worker startup.

### CONFIG Constants (Lines 19–24)

```js
const CONFIG = {
  MAX_TABS: 20,
  DELAY_BETWEEN_TABS: 100, // ms
};
```

`MAX_TABS * DELAY_BETWEEN_TABS = 2000ms` — opening 20 tabs takes at least 2 seconds. This approaches the service worker idle timeout threshold.

### `log()` Function (Lines 27–37)

Uses `console[level]()` (e.g., `console.log`, `console.warn`, `console.error`). Includes full `metrics` and `serviceWorkerState` objects in every log call. This produces verbose, repetitive noise and leaks internal state structure. Rules require a logger utility that is stripped in production builds — this violates that requirement.

### `isProbablyUrl()` (Lines 40–72)

Validates whether a string looks like a URL. Blocks dangerous protocols: `javascript:`, `data:`, `vbscript:`, `file:`, `about:`, `chrome:`, `chrome-extension:`. Returns `true` for strings containing `://` or `.` in the right positions. The blocked protocol list is duplicated in `sanitizeUrl()` (line 97) — a DRY violation (see CC-11 in QA findings).

### `sanitizeUrl()` (Lines 75–107)

Normalizes URLs:
- Blocks dangerous protocols (duplicate check)
- Adds `https://` if no scheme present
- Forces HTTPS by replacing `http://` with `https://`
- Falls back to Google search if input doesn't look like a URL

The forced HTTPS upgrade is a good security practice but may break intentional `http://` localhost dev URLs. No user opt-out exists.

### `createTab()` (Lines 110–125)

Wraps `chrome.tabs.create()` with a retry loop (up to 3 attempts, 200ms delay). Returns the new tab object or throws after all retries fail. Uses `async/await` correctly here.

### `openList()` (Lines 128–200)

The main function — 73 lines. Receives a raw string of URLs (one per line), processes each through `isProbablyUrl()` and `sanitizeUrl()`, then creates tabs sequentially with `DELAY_BETWEEN_TABS` delay between each. Updates `metrics` throughout. Uses `performance.now()` for timing (lines 129, 190), which resets when the worker restarts — timing data is unreliable across sessions.

Key concerns:
- Accumulates errors into `metrics.errors` array without a size cap — could grow unbounded in pathological cases
- `performance.now()` timer context is reset on every worker instantiation, making duration measurements meaningless across restarts

### `initializeContextMenu()` (Lines 203–232)

Creates a context menu item for selected text with retry logic (up to 3 attempts). Uses a `Promise` chain internally. Correctly calls `chrome.contextMenus.removeAll()` before recreating to avoid duplicate menu items on `onInstalled`.

### Event Listeners (Lines 234–314)

**`onInstalled` (line 234):** Calls `initializeContextMenu()`. Standard.

**`onStartup` (line 240):** Calls `initializeContextMenu()`. Needed because context menus don't persist across browser restarts.

**`onMessage` (lines 243–285):** **CRITICAL ASYNC BUG.** The handler receives messages and dispatches to either `openList` or a metrics-fetch branch. The handler mixes `.then()/.catch()` (for `openList`) with direct `async/await` (implied by surrounding code). The `return true` for async response is used correctly, but the mixed paradigm violates the rules and creates subtle timing risks.

**`contextMenus.onClicked` (lines 287–314):** Handles right-click context menu activation. Extracts selected text, calls `openList()`. Uses `.then()/.catch()` pattern — inconsistent with other async code.

---

## `extension/popup.js` (215 lines, 7.0K)

### Structure Overview

| Lines | Content |
|-------|---------|
| 1–4 | DOM element references |
| 7–11 | CONFIG constants |
| 14–37 | `setStatus()`, `clearStatus()`, `formatDuration()` utilities |
| 39–69 | `showError()` — error display |
| 71–87 | `getCurrentWindowTabs()` — queries chrome.tabs |
| 89–128 | `updateMetrics()` — CRITICAL innerHTML usage |
| 130–168 | `openUrls()` — sends message to service worker |
| 181–212 | `initPopup()` — initialization |

### DOM Element References (Lines 1–4)

```js
const listElement = document.getElementById('list');
const openButton = document.getElementById('openButton');
const statusElement = document.getElementById('status');
const metricsElement = document.getElementById('metrics');
```

No null-checks on these references. If the DOM structure changes (e.g., an element is renamed), these will be `null` and subsequent property accesses will throw `TypeError`.

### CONFIG Constants (Lines 7–11)

```js
const CONFIG = {
  STATUS_TIMEOUT: 2000,
  METRICS_REFRESH_INTERVAL: 5000,
  MAX_ERROR_DETAILS: 3,
};
```

### `showError()` (Lines 39–69)

Uses `document.createElement()` and `.textContent` safely for most content — good. **Exception: line 67** sets `statusElement.innerHTML = ''` to clear the element. This is a CSP violation (see CSP-01 in QA findings). The correct approach is `statusElement.replaceChildren()` or `while (el.firstChild) el.removeChild(el.firstChild)`.

### `getCurrentWindowTabs()` (Lines 71–87)

Queries `chrome.tabs.query({ currentWindow: true })`. Handles the case where the popup's own tab might be included. `console.error` at line 83 for failures.

### `updateMetrics()` (Lines 89–128)

**CRITICAL CSP VIOLATION.** Lines 103–122 build an HTML string using template literals with interpolated values from the service worker's `sendMessage` response, then assign to `metricsElement.innerHTML`:

```js
metricsElement.innerHTML = `
  <div class="metrics-grid">
    <div class="metric-item">
      <span class="metric-value">${metrics.tabsOpened}</span>
      ...
    </div>
    ...
  </div>
`;
```

While the `metrics` values come from the extension's own service worker (not external user input), using `innerHTML` with any interpolation is a CSP violation and a linting failure. If the message channel were ever compromised or spoofed, this could be exploited.

Line 126 also sets `metricsElement.innerHTML = '<div class="metrics-empty">...</div>'` for the empty state — a second violation.

`console.error` at line 125 for failures.

### `openUrls()` (Lines 130–168)

Reads the textarea value, sends a `{ type: 'openList', urls: text }` message to the service worker, handles the response. Contains three nested `setTimeout` chains (lines 157, 159, 162) for UI state transitions — not cancellable, and creates a minor timing risk if the popup is closed before they fire. `console.error` at line 165.

### `initPopup()` (Lines 181–212)

Sets up the click handler on `openButton`, calls `updateMetrics()` immediately, then starts a `setInterval` for periodic metrics refresh. The interval handle is stored but the cleanup is registered via `window.addEventListener('unload', ...)` at line 202.

**Memory leak risk (ML-01):** The `unload` event is unreliable in Chrome extension popups. Chrome may not fire `unload` consistently when the popup closes. The correct approach is to clear the interval in a `visibilitychange` listener or when the popup's lifecycle events indicate it is closing. No guard against double-initialization (ML-02).

`console.error` at lines 194 and 209.

---

## `extension/popup.html` (24 lines, 921B)

Standard HTML5 document. Elements:
- `<textarea id="list">` — URL input area
- `<button id="openButton">` — trigger button
- `<div id="status">` — status message display
- `<div id="metrics">` — metrics display area
- `<footer>` — branding/link
- `<script src="popup.js">` — loaded at bottom of body

No inline scripts (good for CSP). No inline styles (good for CSP). The `defer` attribute is absent on the script tag — acceptable since it is placed at the bottom of `<body>`.

---

## `extension/popup.css` (180 lines, 3.7K)

Well-structured CSS. Key features:
- CSS custom properties (`--color-*`, `--spacing-*`) for consistent theming
- Full dark mode via `@media (prefers-color-scheme: dark)` — overrides custom properties
- `.metrics-grid` using CSS Grid for metrics display
- `.error` styles with distinct background for error states
- `:focus-visible` outlines for accessibility
- `min-width: 300px; width: 450px` on the popup container

No issues found in CSS. This file will be replaced by Tailwind or CSS Modules in the React migration, but its design tokens can be carried over.
