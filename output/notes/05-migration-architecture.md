# 05 — Migration Architecture

> Preserved audit note from planning phase. Do not delete — future agents depend on these findings.

This document describes the 7-phase plan to migrate the OpenList extension from plain vanilla JavaScript to a fully compliant TypeScript/React/Vite codebase.

---

## Migration Principles

1. **Never break the existing extension.** The `extension/` directory remains functional throughout migration. It is the reference implementation.
2. **Each phase is independently deployable.** A phase is complete only when its tests pass and the extension loads without errors.
3. **Phases are ordered by dependency.** Later phases build on earlier ones — do not skip or reorder.
4. **100% test coverage is not optional.** Every new module gets tests before the phase is considered done.

---

## Phase 0: Tooling Foundation

**Goal:** Establish the complete build and development toolchain before writing any application code.

**Files to create:**

| File | Purpose |
|------|---------|
| `package.json` | Declares all dependencies, scripts, pnpm config |
| `.npmrc` | pnpm settings (`shamefully-hoist=false`, `strict-peer-dependencies=true`) |
| `tsconfig.json` | TypeScript 5.8+ config with `strict: true`, `noUncheckedIndexedAccess: true`, path aliases |
| `vite.config.ts` | Vite 6 + CRXJS plugin, manifest input, output to `dist/` |
| `biome.json` | Biome 1.9+ lint and format rules (no `innerHTML`, no raw `console`, import organization) |

**Dependencies (production):**

```json
{
  "typescript": "^5.8",
  "vite": "^6",
  "@crxjs/vite-plugin": "^2",
  "react": "^19",
  "react-dom": "^19",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  "@biomejs/biome": "^1.9",
  "zod": "^3.24",
  "vitest": "^3",
  "@vitest/coverage-v8": "^3",
  "jsdom": "latest",
  "@playwright/test": "^1.50",
  "knip": "^5",
  "@types/chrome": "latest"
}
```

**Verification:** `pnpm build` produces a `dist/` directory loadable as an unpacked extension in Chrome.

---

## Phase 1: Source Scaffold

**Goal:** Create the complete `src/` directory tree with stub files. All stubs compile (TypeScript) but contain no logic yet.

**Directory structure:**

```
src/
├── manifest.json                    # CRXJS input manifest (migrated from extension/)
├── background/
│   ├── index.ts                     # Service worker entry point (orchestration)
│   ├── messages.ts                  # Zod-validated message dispatch
│   ├── context-menu.ts              # initializeContextMenu with retry
│   ├── open-list.ts                 # openList() function
│   └── metrics.ts                   # chrome.storage.session metrics management
├── popup/
│   ├── index.tsx                    # React entry point (ReactDOM.createRoot)
│   ├── App.tsx                      # Root component
│   ├── components/
│   │   ├── MetricsGrid.tsx          # Metrics display (replaces innerHTML in popup.js)
│   │   ├── ErrorDisplay.tsx         # Error display (replaces innerHTML in popup.js)
│   │   ├── UrlInput.tsx             # Textarea + button
│   │   └── StatusMessage.tsx        # Status display
│   └── hooks/
│       ├── useStorage.ts            # Typed chrome.storage wrapper
│       └── useMetrics.ts            # Polls metrics from service worker
├── schemas/
│   └── messages.ts                  # Zod discriminated union for all message types
├── utils/
│   ├── logger.ts                    # Logger stripped in production
│   ├── isProbablyUrl.ts             # URL validation (extracted from service-worker.js)
│   ├── sanitizeUrl.ts               # URL normalization (extracted from service-worker.js)
│   └── sleep.ts                     # Promise-based delay utility
└── types/
    └── chrome-ext.d.ts              # Ambient type declarations and re-exports
```

**Key design decisions:**

### `src/manifest.json`

```json
{
  "manifest_version": 3,
  "permissions": ["contextMenus", "tabs", "storage"],
  "host_permissions": [],
  "web_accessible_resources": []
}
```

Changes from current: adds `"storage"` (required for `chrome.storage.session`), removes `host_permissions` (see PM-01), removes `web_accessible_resources` (see PM-02).

### `src/utils/logger.ts`

```ts
// Stripped entirely in production builds via dead-code elimination
const isDev = import.meta.env.MODE === 'development';

export const logger = {
  log: isDev ? console.log.bind(console) : () => {},
  warn: isDev ? console.warn.bind(console) : () => {},
  error: isDev ? console.error.bind(console) : () => {},
};
```

### `src/schemas/messages.ts`

Zod discriminated union for all message types:

```ts
import { z } from 'zod';

export const OpenListMessageSchema = z.object({
  type: z.literal('openList'),
  urls: z.string().min(1),
});

export const GetMetricsMessageSchema = z.object({
  type: z.literal('getMetrics'),
});

export const MessageSchema = z.discriminatedUnion('type', [
  OpenListMessageSchema,
  GetMetricsMessageSchema,
]);

export type Message = z.infer<typeof MessageSchema>;
```

### `src/hooks/useStorage.ts`

Typed wrapper around `chrome.storage.session` and `chrome.storage.local`:

```ts
// Returns [value, setValue] — React-state-like API over chrome.storage
export function useSessionStorage<T>(key: string, defaultValue: T): [T, (v: T) => void]
```

---

## Phase 2: Service Worker Migration

**Goal:** Migrate all background logic from `extension/service-worker.js` to `src/background/`.

**File responsibilities:**

| File | Responsibility | Max LOC |
|------|---------------|---------|
| `src/background/index.ts` | Event listener registration, orchestration | 100 |
| `src/background/messages.ts` | `onMessage` handler with Zod validation and dispatch | 80 |
| `src/background/context-menu.ts` | `initializeContextMenu()` with retry | 60 |
| `src/background/open-list.ts` | `openList()` function | 100 |
| `src/background/metrics.ts` | `chrome.storage.session` metrics CRUD | 80 |

**Critical change: metrics persistence**

Replace in-memory globals with `chrome.storage.session`:

```ts
// BEFORE (service-worker.js)
const metrics = { tabsOpened: 0, tabsFailed: 0, ... };

// AFTER (src/background/metrics.ts)
const METRICS_KEY = 'sw_metrics';

export async function getMetrics(): Promise<Metrics> {
  const result = await chrome.storage.session.get(METRICS_KEY);
  return result[METRICS_KEY] ?? defaultMetrics;
}

export async function incrementTabsOpened(): Promise<void> {
  const current = await getMetrics();
  await chrome.storage.session.set({
    [METRICS_KEY]: { ...current, tabsOpened: current.tabsOpened + 1 }
  });
}
```

**Critical change: async/await consistency**

All `.then()/.catch()` chains in event handlers are rewritten as `async/await` with `try/catch`.

**Critical change: BLOCKED_PROTOCOLS constant**

```ts
// src/utils/sanitizeUrl.ts — single source of truth
export const BLOCKED_PROTOCOLS = [
  'javascript:', 'data:', 'vbscript:', 'file:',
  'about:', 'chrome:', 'chrome-extension:',
] as const;
```

---

## Phase 3: React Popup Migration

**Goal:** Replace the vanilla DOM popup with React components. Eliminate all `innerHTML` violations.

**Component hierarchy:**

```
App
├── UrlInput (textarea + button)
├── StatusMessage (replaces setStatus/clearStatus)
├── MetricsGrid (replaces innerHTML metrics template)
└── ErrorDisplay (replaces showError)
```

**Critical change: eliminating innerHTML**

```tsx
// BEFORE (popup.js)
metricsElement.innerHTML = `<div class="metrics-grid">...</div>`;

// AFTER (MetricsGrid.tsx)
function MetricsGrid({ metrics }: { metrics: Metrics }) {
  return (
    <div className="metrics-grid">
      <MetricItem label="Tabs Opened" value={metrics.tabsOpened} />
      ...
    </div>
  );
}
```

React's JSX never uses `innerHTML` internally for user-controlled string interpolation — it escapes all values automatically.

**Critical change: interval cleanup**

```ts
// BEFORE (popup.js)
window.addEventListener('unload', () => clearInterval(metricsInterval));

// AFTER (useMetrics.ts)
useEffect(() => {
  const id = setInterval(refreshMetrics, CONFIG.METRICS_REFRESH_INTERVAL);
  return () => clearInterval(id);  // React cleanup — always fires on unmount
}, []);
```

---

## Phase 4: Unit Tests (Target: 100% Coverage)

**Goal:** Write Vitest unit tests for every module in `src/`, hitting 100% coverage on all four metrics.

**Coverage configuration (`vitest.config.ts`):**

```ts
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 100,
    branches: 100,
    functions: 100,
    statements: 100,
  },
  exclude: ['src/popup/index.tsx', 'tests/'],
}
```

**Estimated test files (18+):**

| Test File | Covers |
|-----------|--------|
| `background/index.test.ts` | Event listener registration |
| `background/messages.test.ts` | Message validation, dispatch, error paths |
| `background/context-menu.test.ts` | Menu creation, retry logic, failure modes |
| `background/open-list.test.ts` | URL processing, tab creation, metrics updates |
| `background/metrics.test.ts` | Storage read/write, default values, increment ops |
| `utils/isProbablyUrl.test.ts` | All URL patterns, all blocked protocols, edge cases |
| `utils/sanitizeUrl.test.ts` | http→https, scheme addition, search fallback, blocked protocols |
| `utils/logger.test.ts` | Production stripping, development passthrough |
| `utils/sleep.test.ts` | Timing behavior |
| `schemas/messages.test.ts` | Valid and invalid message shapes, Zod errors |
| `popup/App.test.tsx` | Full component tree rendering |
| `popup/components/MetricsGrid.test.tsx` | All metric states, empty state |
| `popup/components/ErrorDisplay.test.tsx` | Error rendering, multiple errors, truncation |
| `popup/components/UrlInput.test.tsx` | Input handling, button disabled states |
| `popup/components/StatusMessage.test.tsx` | Status show/hide/clear |
| `popup/hooks/useStorage.test.ts` | Read/write, default values |
| `popup/hooks/useMetrics.test.ts` | Polling interval, cleanup on unmount |
| `types/chrome-ext.test.ts` | Type assertion tests |

**Chrome API mock setup (`tests/setup.ts`):**

```ts
import { vi } from 'vitest';

globalThis.chrome = {
  tabs: {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    query: vi.fn().mockResolvedValue([]),
  },
  contextMenus: {
    create: vi.fn(),
    removeAll: vi.fn().mockImplementation((cb) => cb?.()),
    onClicked: { addListener: vi.fn() },
  },
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onStartup: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
    sendMessage: vi.fn().mockResolvedValue({}),
    lastError: null,
  },
  storage: {
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
} as unknown as typeof chrome;
```

---

## Phase 5: E2E Tests

**Goal:** Playwright tests that load the built extension in a real Chromium instance and verify end-to-end behavior.

**Playwright config (`playwright.config.ts`):**

```ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    browserName: 'chromium',
    launchOptions: {
      args: [
        `--load-extension=${path.resolve('dist')}`,
        '--disable-extensions-except=' + path.resolve('dist'),
      ],
    },
  },
});
```

**E2E spec files (7):**

| Spec | Tests |
|------|-------|
| `popup-opens.spec.ts` | Extension icon click opens popup with correct elements |
| `url-list-opens-tabs.spec.ts` | Entering URLs and clicking Open creates correct number of tabs |
| `context-menu.spec.ts` | Right-clicking selected text shows menu item, clicking opens tabs |
| `metrics-display.spec.ts` | Metrics update after opening tabs; counters increment correctly |
| `error-handling.spec.ts` | Invalid URLs show appropriate error state |
| `offline-behavior.spec.ts` | Offline check shows error before attempting to open tabs |
| `csp-violations.spec.ts` | No CSP violations reported in console during any operation |

---

## Phase 6: Quality Gates

**Goal:** Establish automated quality checks that block merges if standards slip.

**`knip.json`** — detects unused exports, files, and dependencies:

```json
{
  "entry": ["src/background/index.ts", "src/popup/index.tsx"],
  "project": ["src/**/*.{ts,tsx}"],
  "ignore": ["tests/**"]
}
```

**Size budgets (in `vite.config.ts`):**

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: undefined,
    },
  },
  // Fail build if chunks exceed limits
  chunkSizeWarningLimit: 50, // 50KB warning
}
```

**`pnpm check` script** (in `package.json`):

```json
{
  "scripts": {
    "check": "pnpm biome check . && pnpm tsc --noEmit && pnpm vitest run --coverage && pnpm knip"
  }
}
```

---

## Phase 7: Cleanup

**Goal:** Archive the legacy code and update documentation.

**Actions:**
1. Rename `extension/` to `extension-legacy/` (preserves reference implementation)
2. Update `.gitignore` to exclude `dist/` and `node_modules/`
3. Update `README.md` with new development instructions (`pnpm install`, `pnpm dev`, `pnpm build`)
4. Update `docs/orientation.md` to reference the new `src/` structure
5. Delete `extension.zip` from repo root (replace with `pnpm pack` script that creates it from `dist/`)

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CRXJS v2 incompatibility with Vite 6 | Medium | High | Pin exact versions; check CRXJS changelog before Phase 0 |
| `chrome.storage.session` not available in test environment | High | Medium | Mock in `tests/setup.ts`; use conditional require in prod |
| React 19 concurrent features conflict with popup lifecycle | Low | Medium | Use stable `ReactDOM.createRoot`, avoid `startTransition` in popups |
| Playwright extension loading requires specific Chrome flags | Medium | High | Test `--load-extension` flags in CI before Phase 5; check Chrome version |
| `@types/chrome` missing types for newer MV3 APIs | Low | Low | Declare ambient types in `src/types/chrome-ext.d.ts` |
| 100% coverage threshold blocks CI if one branch missed | High | Low | Use `/* v8 ignore next */` for unreachable branches (document each use) |
| `host_permissions` removal breaks `chrome.tabs.create` for certain URL schemes | Low | Critical | Test URL opening after removal; add back specific schemes only if needed |
| Service worker bundle size exceeds 1MB due to React deps | Low | Medium | React is popup-only; service worker bundle has no React |
| Biome conflicts with existing code style | High | Low | Run `biome check --apply` once in Phase 0 to auto-fix; review diff |
| knip false positives blocking CI | Medium | Low | Add exceptions in `knip.json` for entry points and type-only exports |
