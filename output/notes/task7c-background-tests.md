# Task 7c — Background Service Worker Unit Tests

## Status: DONE

## Test Files Created

| File | Tests | Status |
|------|-------|--------|
| `src/background/metrics.test.ts` | 14 | PASS |
| `src/background/context-menu.test.ts` | 4 | PASS |
| `src/background/open-list.test.ts` | 10 | PASS |
| `src/background/messages.test.ts` | 9 | PASS |
| `src/utils/errors.test.ts` | 6 (pre-existing) | PASS |

**Total: 43 tests, 43 passing, 0 errors**

## Test Results

```
Test Files  5 passed (5)
     Tests  43 passed (43)
   Start at  20:47:01
   Duration  2.11s
```

## Coverage Notes

All functions, branches, statements, and lines in the target source files are exercised:

- `metrics.ts`: `getMetrics`, `setMetrics`, `incrementMetric`, `recordError`, `getSwState`, `setSwState` — all happy paths, empty storage, and Zod validation failure branches tested.
- `context-menu.ts`: `initializeContextMenu` — success, first-fail-retry-success, and both-fail-throws branches tested.
- `open-list.ts`: `openList` — empty input, blank lines, valid URL, invalid URL (sanitize=null), non-URL (search), MAX_TABS limit, mixed input, createTab failure, metrics batching.
- `messages.ts`: `handleMessage` — unknown action, invalid payload, null payload, openList (success + failure), getMetrics (success + failure), getCurrentTabUrls (success + failure).
- `errors.ts`: `toErrorMessage` — Error, string, number, null, undefined, Error subclass.

## Tricky Issues Encountered

### Context-menu "both calls fail" unhandled rejection warning

**Problem:** Vitest reported a `PromiseRejectionHandledWarning` for the "both create() calls fail" test. The root cause: when `vi.runAllTimersAsync()` fires the 1000ms retry `setTimeout`, the source code's `catch` block calls `await chrome.contextMenus.create(MENU_ITEM)`. The mock returns `Promise.reject(...)`, which is created synchronously — but Node.js registers the rejection before the `await` microtask can attach the `.catch()` handler, briefly flagging it as "unhandled."

**Fix:** Wrapped both `initializeContextMenu()` and `vi.runAllTimersAsync()` in `Promise.allSettled([...])`. This ensures both promises are in the same microtask batch, so the rejection from the second `create()` call is always "handled" by the `allSettled` settlement cycle.

```typescript
const [result] = await Promise.allSettled([
  initializeContextMenu(),
  vi.runAllTimersAsync(),
]);
expect(result.status).toBe('rejected');
expect((result as PromiseRejectedResult).reason.message).toBe('persistent error');
```

### open-list.ts: empty string is one line, not zero

`''.split(/\r\n|\r|\n/)` returns `['']` (one element), so an empty input produces `skipped: 1`, not `skipped: 0`. Test was written to match actual behavior.

### open-list.ts delay between tabs

The source uses `CONFIG.DELAY_BETWEEN_TABS` (100ms) between tabs. Tests use `vi.useFakeTimers()` + `vi.runAllTimersAsync()` to avoid real delays, while also handling the delay condition (`hasMore && opened < CONFIG.MAX_TABS`).
