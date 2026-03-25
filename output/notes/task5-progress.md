# Task 5: Migrate Service Worker to TypeScript

## Status: DONE

## Goal
Migrate `extension/service-worker.js` (315 lines, vanilla JS) to TypeScript modules in `src/background/`.

## Critical Bug Being Fixed
Original code stored metrics in global variables lost when the service worker sleeps.
Fix: use `chrome.storage.session` so metrics survive restarts.

## Files to Create
- [x] `src/background/metrics.ts` — metrics persistence via chrome.storage.session
- [x] `src/background/open-list.ts` — URL list processing
- [x] `src/background/context-menu.ts` — context menu initialization
- [x] `src/background/messages.ts` — message handler dispatch
- [x] `src/background/index.ts` — service worker entry point

## Infrastructure Already in Place
- `src/types/index.ts` — OpenListResult, ExtensionMetrics, ServiceWorkerState, MetricsResponse
- `src/schemas/messages.ts` — IncomingMessageSchema (Zod discriminated union)
- `src/schemas/metrics.ts` — ExtensionMetricsSchema, ServiceWorkerStateSchema, DEFAULT_METRICS, DEFAULT_SW_STATE
- `src/schemas/config.ts` — CONFIG object
- `src/utils/logger.ts` — logger (info/warn/error)
- `src/utils/urls.ts` — isProbablyUrl(), sanitizeUrl()
- `src/utils/tabs.ts` — createTab()

## Steps
1. [x] Create output/notes/task5-progress.md
2. [x] Create src/background/ directory
3. [x] Write all 5 files
4. [x] Run pnpm tsc --noEmit — 0 errors
5. [x] Run pnpm biome check src/ — 4 formatting/import-sort issues auto-fixed with --write, then clean
6. [x] Commit

## Notes
- messages.ts uses .then()/.catch() pattern intentionally — Chrome onMessage.addListener
  callback cannot be async (must return `true` synchronously for async responses)
- chrome.storage.session available in Chrome 102+ (matches minimum_chrome_version)
- All chrome.* types come from @types/chrome already installed
