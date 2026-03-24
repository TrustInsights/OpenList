# 03 — Test Infrastructure

> Preserved audit note from planning phase. Do not delete — future agents depend on these findings.

## Current State: Complete Absence of Tests

As of this audit, there is **zero test infrastructure** in the OpenList project.

## What Was Checked

| Check | Result |
|-------|--------|
| `tests/` directory exists | YES — but completely empty |
| Any `*.test.js` files anywhere | NONE |
| Any `*.spec.js` files anywhere | NONE |
| `package.json` with test scripts | NO `package.json` exists |
| `vitest.config.*` | NONE |
| `jest.config.*` | NONE |
| `playwright.config.*` | NONE |
| `.mocharc.*` | NONE |
| `scripts/` directory | NONE |
| `docs/reports/` directory | NONE |
| Coverage reports (`.nyc_output/`, `coverage/`) | NONE |
| CI configuration (`.github/workflows/`) | NONE |

## Test Coverage Measurement

**Current coverage: 0%**

There is no mechanism to measure coverage because there are no tests and no test runner.

## What the Rules Require

Per `docs/rules-chrome-ext.md`, the project must have:

- **Unit tests:** Vitest 3+ with `@vitest/coverage-v8`, targeting 100% line/branch/function/statement coverage
- **E2E tests:** Playwright 1.50+ loading the built extension via `chromium.launchPersistentContext`
- **Chrome API mocks:** A `tests/setup.ts` (or equivalent) that provides typed mocks for `chrome.tabs`, `chrome.contextMenus`, `chrome.runtime`, `chrome.storage`
- **Coverage thresholds:** All four metrics at 100% (lines, branches, functions, statements)

## Files That Must Be Created During Migration

### Unit Test Files (estimated 18+ files)

```
src/background/__tests__/
  index.test.ts
  messages.test.ts
  context-menu.test.ts
  open-list.test.ts
  metrics.test.ts

src/popup/__tests__/
  components/MetricsGrid.test.tsx
  components/ErrorDisplay.test.tsx
  hooks/useStorage.test.ts
  hooks/useMetrics.test.ts

src/utils/__tests__/
  logger.test.ts
  isProbablyUrl.test.ts
  sanitizeUrl.test.ts

src/schemas/__tests__/
  messages.test.ts
```

### E2E Test Files (estimated 7 files)

```
tests/e2e/
  popup-opens.spec.ts
  url-list-opens-tabs.spec.ts
  context-menu.spec.ts
  metrics-display.spec.ts
  error-handling.spec.ts
  offline-behavior.spec.ts
  csp-violations.spec.ts
```

### Test Configuration Files

```
vitest.config.ts         # Unit test runner config
playwright.config.ts     # E2E test config with extension loading
tests/setup.ts           # Chrome API mocks and global test setup
```

## Chrome API Mocking Strategy

The extension relies heavily on `chrome.*` APIs that are not available in Node.js (Vitest's environment). The migration must establish a mock layer in `tests/setup.ts`:

```ts
// Conceptual structure (not yet written)
globalThis.chrome = {
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn(),
    onClicked: { addListener: vi.fn() },
  },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn(),
    lastError: null,
  },
  storage: {
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};
```

## Priority Functions Requiring Unit Tests

These are the highest-risk functions that need comprehensive test coverage:

1. **`isProbablyUrl()`** — needs tests for all blocked protocols, valid URLs, bare domains, IP addresses, edge cases (empty string, whitespace, numbers only)
2. **`sanitizeUrl()`** — needs tests for http→https coercion, scheme addition, Google search fallback, all blocked protocol variants
3. **`openList()`** — needs tests for empty input, single URL, multiple URLs, MAX_TABS enforcement, failure handling, metrics updates
4. **`updateMetrics()` (popup)** — needs tests that verify no `innerHTML` usage after migration
5. **`initializeContextMenu()`** — needs tests for retry logic, failure modes
6. **Message dispatch** — needs tests for every message type with valid and invalid payloads (Zod schema validation)

## Conclusion

The test infrastructure gap is the second-largest risk in the migration (after the toolchain absence). Building 100% coverage from zero requires careful planning: Chrome API mocking must be established first, then unit tests can be written alongside each migrated module, and E2E tests validate end-to-end behavior against the built extension.
