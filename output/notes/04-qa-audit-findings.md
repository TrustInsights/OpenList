# 04 — QA Audit Findings

> Preserved audit note from planning phase. Do not delete — future agents depend on these findings.

This document records the full QA audit of the current `extension/` codebase against `docs/rules-chrome-ext.md`. Each finding is classified by severity (CRITICAL / HIGH / MEDIUM / LOW / INFO) and assigned a unique ID for tracking.

---

## Summary Scorecard

| Dimension | Status | Critical | High | Medium | Low |
|-----------|--------|----------|------|--------|-----|
| 1. Async/Sync | FAIL | 0 | 1 | 1 | 2 |
| 2. CSP Compliance | FAIL | 3 | 0 | 0 | 0 |
| 3. Memory Leaks | FAIL | 0 | 1 | 2 | 1 |
| 4. Permissions | FAIL | 1 | 0 | 1 | 1 |
| 5. Quota | WARN | 0 | 0 | 1 | 1 |
| 6. Service Worker | FAIL | 1 | 2 | 2 | 0 |
| 7. DOM Isolation | PASS | 0 | 0 | 0 | 0 |
| 8. Offline | FAIL | 0 | 0 | 2 | 1 |
| Cross-cutting (Toolchain) | FAIL | 5 | 4 | 4 | 1 |
| **TOTALS** | **FAIL** | **10** | **8** | **13** | **7** |

**Overall result: FAIL — not compliant with docs/rules-chrome-ext.md**

---

## Dimension 1: Async/Sync

**Status: FAIL**

### AS-01 — HIGH: Mixed async paradigms in onMessage handler

**File:** `extension/service-worker.js`, lines 271–314

The `onMessage` listener uses `.then()/.catch()` promise chains in some branches while other parts of the codebase use `async/await`. The rules explicitly prohibit mixing these paradigms within a single codebase. The consistent standard required is `async/await` throughout.

**Fix:** Rewrite all `.then()/.catch()` chains as `async/await` with `try/catch`.

### AS-02 — MEDIUM: `performance.now()` in service worker

**File:** `extension/service-worker.js`, lines 129, 190

`performance.now()` is called at the start and end of `openList()`. Because service workers are terminated and restarted by Chrome, the timer context resets on every worker wake-up. Duration measurements for runs that span a sleep cycle will be incorrect. The `lastRunTimestamp` stored in the in-memory `metrics` object has the same problem.

**Fix:** Use `Date.now()` for wall-clock timestamps (survives worker restarts if written to `chrome.storage.session`). Duration should be calculated within a single execution context only.

### AS-03 — LOW: Three nested setTimeout chains in `openUrls()`

**File:** `extension/popup.js`, lines 157, 159, 162

Three `setTimeout` calls are nested for UI state transitions. These are not cancellable — if the popup closes before they fire, they execute against a potentially-detached DOM. Not a crash risk, but a code quality issue.

**Fix:** Use `async/await` with a `sleep()` helper, or manage timeouts with stored handles that are cleared on cleanup.

### AS-04 — LOW: `setTimeout` inside async functions for delays

**File:** `extension/service-worker.js`, lines 122, 179, 220

Several async functions wrap `setTimeout` in a `new Promise()` to create delays (the standard `sleep` pattern). This is acceptable but should be extracted into a shared `sleep(ms: number): Promise<void>` utility rather than duplicated inline.

---

## Dimension 2: CSP Compliance

**Status: FAIL (CRITICAL)**

### CSP-01 — CRITICAL: `statusElement.innerHTML = ''`

**File:** `extension/popup.js`, line 67

Assigning to `innerHTML` is forbidden by the project's CSP rules, even for clearing an element. While `''` contains no executable content, using `innerHTML` at all violates the no-innerHTML rule and sets a bad precedent.

**Fix:** `statusElement.replaceChildren()` or `while (el.firstChild) el.removeChild(el.firstChild)`

### CSP-02 — CRITICAL: `metricsElement.innerHTML` with template literal interpolation

**File:** `extension/popup.js`, lines 103–122

The metrics display is built as an HTML string using template literals with interpolated values from `chrome.runtime.sendMessage()`. The values come from the extension's own service worker, so the direct XSS risk is low. However:
1. It violates the no-innerHTML rule unconditionally
2. If message channels or the metrics object were tampered with, the interpolated values could contain HTML tags or script payloads
3. Linters and security scanners will flag this as a violation regardless of data origin

**Fix:** Build the metrics DOM using `document.createElement()` / `.textContent`, or (after migration) use React JSX which never assigns to `innerHTML`.

### CSP-03 — CRITICAL: `metricsElement.innerHTML` for empty state

**File:** `extension/popup.js`, line 126

```js
metricsElement.innerHTML = '<div class="metrics-empty">No metrics yet</div>';
```

Same violation as CSP-02, for the empty-state fallback.

**Fix:** Create the div element programmatically or use a React component.

### CSP-04 — INFO: CSP policy is reasonable but could be explicit

**File:** `extension/manifest.json`

The declared CSP (`default-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests;`) is solid. No `unsafe-inline`, no `unsafe-eval`. No issues — this finding is informational only. After migration with Vite, the CSP may need to allow `'wasm-unsafe-eval'` if any dependency requires it.

---

## Dimension 3: Memory Leaks

**Status: FAIL**

### ML-01 — HIGH: Unreliable `unload` event for interval cleanup

**File:** `extension/popup.js`, line 202

The `setInterval` created for metrics refresh is cleaned up via:

```js
window.addEventListener('unload', () => clearInterval(metricsInterval));
```

The `unload` event is not reliably fired in Chrome extension popups. When the user clicks away from the popup, Chrome may destroy the popup process without dispatching `unload`. This means the interval handle is never cleared in the browser's internal accounting, and any pending microtasks or callbacks associated with it may not be properly collected.

**Fix:** Use `document.addEventListener('visibilitychange', ...)` and clear the interval when `document.visibilityState === 'hidden'`. In the React migration, the `useEffect` cleanup function is the correct mechanism.

### ML-02 — MEDIUM: No double-initialization guard

**File:** `extension/popup.js`, lines 181–212

`initPopup()` is called once on load. If it were ever called twice (e.g., from a future event listener), a second `setInterval` would be created without clearing the first, resulting in two concurrent polling loops. No `initialized` flag prevents this.

**Fix:** Add an `initialized` guard variable, or (in React) rely on `useEffect`'s single-execution guarantee per component mount.

### ML-03 — MEDIUM: Unbounded error accumulation in service worker

**File:** `extension/service-worker.js`, lines 1–9

The global `metrics.errors` array accumulates errors without a maximum size. In pathological scenarios (a user repeatedly opening malformed lists), this array could grow very large — though in practice it resets on worker restart, limiting real-world impact.

**Fix:** Cap the array at `MAX_ERROR_DETAILS` (already defined in popup.js CONFIG) and apply the same cap in service-worker.js. After migration, `chrome.storage.session` has a 10MB quota limit that enforces an implicit cap.

### ML-04 — LOW: Service worker event listeners never removed

**File:** `extension/service-worker.js`, lines 234–314

`chrome.runtime.onMessage.addListener()`, `chrome.contextMenus.onClicked.addListener()`, etc. are never explicitly removed. This is **standard and correct** for service workers — the listeners should persist for the lifetime of the worker. This finding is low-severity documentation only; no fix needed.

---

## Dimension 4: Permissions

**Status: FAIL (CRITICAL)**

### PM-01 — CRITICAL: `host_permissions: ["*://*/*"]` is overly broad

**File:** `extension/manifest.json`

This grants the extension the ability to interact with every URL on every host. OpenList does not inject content scripts, does not read page content, and does not communicate with remote servers. The only reason `host_permissions` might be present is to enable `chrome.tabs.create()` with arbitrary URLs — but this does **not** require host permissions in MV3.

**Impact:**
- Chrome Web Store review flags broad host permissions and may require justification
- Users see a scary "Read and change all your data on all websites" permission prompt
- Violates the principle of least privilege

**Fix:** Remove `host_permissions` entirely. If `chrome.tabs.create()` requires a permission for certain URL schemes, add only the minimum required (e.g., no additional permissions are needed for `https://` URLs).

### PM-02 — MEDIUM: `web_accessible_resources` exposes icons unnecessarily

**File:** `extension/manifest.json`

```json
"web_accessible_resources": [
  { "resources": ["icon/*.png"], "matches": ["<all_urls>"] }
]
```

Web-accessible resources are intended for assets that content scripts (injected into pages) need to reference. OpenList has no content scripts. Making icons web-accessible means any website can include them as `<img src="chrome-extension://[EXTENSION_ID]/icon/icon-128.png">`. This is a minor fingerprinting vector — websites can detect if OpenList is installed by attempting to load these resources.

**Fix:** Remove the `web_accessible_resources` section entirely, or restrict `matches` to `[]` (empty, effectively preventing external access).

### PM-03 — LOW: `tabs` permission is appropriate

**File:** `extension/manifest.json`

The `tabs` permission is used for `chrome.tabs.query()` (to count tabs in the current window) and `chrome.tabs.create()`. Both usages are legitimate and necessary. No fix required.

---

## Dimension 5: Quota

**Status: WARN**

### QT-01 — MEDIUM: No `chrome.storage` usage

**File:** `extension/service-worker.js` (entire file)

The rules state that `chrome.storage.session` should be the source of truth for ephemeral state (metrics, worker status) and `chrome.storage.local` for user settings. Currently, all state is in JavaScript module globals, which are destroyed when the service worker sleeps. No storage APIs are used at all.

**Fix:** Migrate `metrics` and `serviceWorkerState` to `chrome.storage.session`. `chrome.storage.session` persists across service worker sleep/wake cycles (but not browser restarts), making it appropriate for session-scoped metrics.

### QT-02 — LOW: No current quota risk

No `chrome.storage` writes occur, so no quota violations are possible today. After migration to `chrome.storage.session`, metrics data will be small (well under the 10MB session quota). No fix required for the current state.

---

## Dimension 6: Service Worker

**Status: FAIL (CRITICAL)**

### SW-01 — CRITICAL: Global mutable state lost on worker termination

**File:** `extension/service-worker.js`, lines 1–16

As documented in the Source Code Analysis (note 02), the `metrics` and `serviceWorkerState` objects are module-level variables. Chrome terminates idle service workers after approximately 30 seconds of inactivity. When the worker is restarted (by a new event), all variables are re-initialized to their default values.

**Consequences:**
- `metrics.tabsOpened`, `tabsFailed`, `totalRuns` reset to 0
- `metrics.lastRunDuration`, `lastRunTimestamp` reset to `null`
- `serviceWorkerState.restarts` always reads 0 (never actually increments across restarts)
- The popup shows "stale zeros" that do not represent actual usage

This is the single most impactful bug in the codebase from a correctness standpoint.

**Fix:** Persist all metrics to `chrome.storage.session` after every update. Read from storage at the top of every event handler.

### SW-02 — HIGH: `serviceWorkerState.restarts++` is actively deceptive

**File:** `extension/service-worker.js`, line 248 (approximately, within `onInstalled`/`onStartup` handlers)

The code increments `serviceWorkerState.restarts` but this value is always 0 at the time of increment (due to SW-01). The popup displays a restart count that is always either 0 or 1, never the true cumulative count. This is worse than showing no data — it actively misleads.

**Fix:** Read the current restart count from `chrome.storage.session`, increment it, and write it back.

### SW-03 — HIGH: `openList()` runtime exceeds safe service worker window

**File:** `extension/service-worker.js`, lines 128–200

With `MAX_TABS=20` and `DELAY_BETWEEN_TABS=100ms`, opening a full list takes at least 2 seconds. The Chrome service worker idle timeout is approximately 30 seconds, but the timeout clock resets with each event. A large list near the 20-tab limit risks partial execution if Chrome decides to terminate the worker. Additionally, the rules note that long-running operations in service workers should use `chrome.alarms` for deferral — though for a 2-second operation this is borderline.

**Fix:** Ensure each `createTab()` call is awaited within an active event extension context. After migration, consider using `event.waitUntil()` patterns (or equivalent Chrome MV3 mechanisms) to signal that the worker should remain alive during the operation.

### SW-04 — MEDIUM: Uptime calculation is meaningless

**File:** `extension/service-worker.js`, line 297 (approximately, in the metrics response handler)

The service worker computes "uptime" as `Date.now() - serviceWorkerState.startTime`. Since `startTime` is set to `Date.now()` when the module initializes, this measures how long the current worker instance has been alive — not the cumulative uptime. It resets to 0 on every worker restart.

**Fix:** Remove the uptime metric, or track it as "time since last wake" which is actually useful for debugging. True cumulative uptime is not reliably measurable in service workers.

### SW-05 — MEDIUM: `log()` dumps full state on every call

**File:** `extension/service-worker.js`, lines 27–37

Every `log()` call serializes and logs the complete `metrics` and `serviceWorkerState` objects. This produces extremely verbose output and makes the DevTools console difficult to use. In production, these logs should be stripped (see CC-06).

**Fix:** After migration, the logger utility should accept structured data explicitly rather than auto-appending global state. Production builds should strip all logging via `import.meta.env.MODE === 'production'` dead-code elimination.

---

## Dimension 7: DOM Isolation

**Status: PASS**

### DI-01: No CSS bleed risk

The popup runs in its own Chrome extension popup document, completely isolated from web page DOMs. No CSS can leak in or out.

### DI-02: No content scripts

OpenList injects no content scripts into web pages. There is no DOM isolation concern. This dimension is not applicable.

---

## Dimension 8: Offline

**Status: FAIL**

### OF-01 — MEDIUM: Tabs created successfully when offline, but fail silently

**File:** `extension/service-worker.js`, lines 110–125

`chrome.tabs.create()` succeeds (returns a tab object) even when the device is offline. The created tab will display `ERR_INTERNET_DISCONNECTED`. The extension's metrics count this as a successful tab open. From the user's perspective, all their URLs "opened" but none loaded.

**Fix:** Add a `navigator.onLine` check before starting the batch open operation. If offline, return an error to the popup immediately. Note that `navigator.onLine` is not perfectly reliable (it can be true even with a captive portal), but it catches the common offline case.

### OF-02 — MEDIUM: Google search fallback fails offline

**File:** `extension/service-worker.js`, `sanitizeUrl()` function

When a string doesn't look like a URL, `sanitizeUrl()` converts it to a Google search URL (`https://www.google.com/search?q=...`). Offline, this tab will also fail with a network error. The fallback is correct behavior for the online case but provides no offline awareness.

**Fix:** Same as OF-01 — an upfront offline check prevents opening tabs that will all fail.

### OF-03 — LOW: No distinction between "worker sleeping" and "actual error"

**File:** `extension/popup.js`, `updateMetrics()` function

When the popup sends a metrics request and gets no response (e.g., because the service worker is starting up), the popup cannot distinguish this from a genuine error. The user sees an error state when the worker is merely cold-starting.

**Fix:** Add a timeout and retry loop for the initial metrics fetch. If the worker wakes within 500ms (typical for cold start), the second request will succeed.

### OF-04 — INFO: No `navigator.onLine` check before opening multiple tabs

**File:** `extension/popup.js`, `openUrls()` function

No offline check is performed in the popup before sending the `openList` message. This is informational — the primary fix should be in the service worker (OF-01), not the popup.

---

## Cross-Cutting Failures (Toolchain)

These failures span the entire codebase and reflect the absence of required tooling.

### CC-01 — CRITICAL: No TypeScript

The rules require TypeScript 5.8+ with `strict: true`, `noUncheckedIndexedAccess: true`. The entire codebase is plain JavaScript with no type annotations. Every function signature, every Chrome API call, and every message shape is untyped.

### CC-02 — CRITICAL: No build pipeline

The rules require Vite 6+ with `@crxjs/vite-plugin` for MV3 bundling, manifest transformation, and hot-reload during development. Currently there is no build step — Chrome loads raw source files directly.

### CC-03 — CRITICAL: No `package.json`

The rules require pnpm as the package manager. No `package.json` exists. No dependencies are declared. All tooling (TypeScript, Vite, Biome, Vitest, Playwright) must be installed from scratch.

### CC-04 — CRITICAL: Zero test coverage

See note 03 (Test Infrastructure) for full details. The rules require 100% coverage with Vitest + Playwright. Current coverage is 0%.

### CC-05 — CRITICAL: No Zod schemas

The rules require Zod validation on all external data inputs, particularly on message payloads received in `chrome.runtime.onMessage` handlers. Currently, messages are consumed with no validation — the handler trusts that `message.type`, `message.urls`, etc. exist and have the right shape.

### CC-06 — HIGH: Raw `console[level]()` in production

The rules require a logger utility whose calls are stripped from production builds via dead-code elimination (checking `import.meta.env.MODE`). Currently `console.log`, `console.warn`, and `console.error` are called directly throughout both files. These remain in the production extension package.

### CC-07 — HIGH: No Biome linting/formatting

The rules require Biome 1.9+ for linting and formatting. No `.biome.json` config exists, no Biome is installed. The code has inconsistent spacing, lacks trailing commas in some places, and would fail Biome's default lint rules (particularly around `innerHTML` usage and `console` calls).

### CC-08 — HIGH: No React

The rules require React 19 for the popup UI. The popup is currently vanilla DOM manipulation. This is the largest surface area change in the migration — the entire popup must be rewritten as React components.

### CC-09 — HIGH: No `webext-bridge`

The rules require typed message passing via `webext-bridge` (or equivalent). Currently, messages are plain objects sent via `chrome.runtime.sendMessage()` with no type safety and no schema validation.

### CC-10 — MEDIUM: `service-worker.js` exceeds 250 LOC limit

**File:** `extension/service-worker.js` — 315 lines

The rules set a 250 LOC limit per file. `service-worker.js` exceeds this by 65 lines. The natural fix is to extract `openList()`, `isProbablyUrl()`, `sanitizeUrl()`, and `metrics` management into separate modules.

### CC-11 — MEDIUM: Duplicate blocked protocols list

**File:** `extension/service-worker.js`, lines ~50 and ~97

The array of blocked protocols (`['javascript:', 'data:', 'vbscript:', 'file:', 'about:', 'chrome:', 'chrome-extension:']`) appears in both `isProbablyUrl()` and `sanitizeUrl()`. If a new dangerous protocol needs to be blocked, both places must be updated. This is a DRY violation.

**Fix:** Extract to a single `BLOCKED_PROTOCOLS` constant at module scope.

### CC-12 — MEDIUM: No file-purpose comments

Neither `service-worker.js` nor `popup.js` has a file-level comment explaining its purpose, its public API, or its relationship to other files. The rules require file-purpose comments.

### CC-13 — MEDIUM: No TSDoc on any function

No function has documentation comments. After migration to TypeScript, all exported functions and types must have TSDoc comments.

### CC-14 — LOW: Code lives in `extension/` not `src/`

The rules specify `src/` as the source directory. This is a structural issue corrected during Phase 1 of the migration — it does not require a fix to the current codebase.
