# Task 8: Playwright E2E Tests

## Status
DONE_WITH_CONCERNS

## Overview
Playwright E2E tests created for the OpenList Chrome MV3 extension.
Tests load the built extension (`dist/`) in a real Chrome instance using persistent context.

## Files Created
- `playwright.config.ts` - Playwright configuration (project root)
- `e2e/fixtures.ts` - Custom test fixtures for loading the extension
- `e2e/popup.spec.ts` - Popup UI tests (3 tests)
- `e2e/keyboard.spec.ts` - Keyboard shortcut tests (1 test)
- `e2e/dark-mode.spec.ts` - Dark mode tests (1 test)
- `e2e/metrics.spec.ts` - Metrics display tests (1 test)

## Playwright Setup
- Playwright `@playwright/test` ^1.50.0 already in devDependencies
- `pnpm playwright install chromium` ran successfully (or already installed)
- `pnpm test:e2e` script already configured in package.json

## Build Result: FAIL

```
error during build:
Could not resolve entry module "background/index.js".
```

### Root Cause
The manifest (`src/manifest.json`) specifies `"service_worker": "background/index.js"`,
but CRXJS/Rollup cannot resolve this entry. The actual source file is `src/background/index.ts`.
CRXJS should handle `.js` → `.ts` aliasing but is failing here.

This is expected per task instructions — Task 9 (quality gates & manifest fixes) will resolve this.

## Concern
E2E tests are written but **cannot pass** until:
1. The build succeeds and `dist/` is populated
2. The background service worker (`src/background/index.ts`) properly exports

## Notes
- Tests use `chromium.launchPersistentContext` with `--load-extension` flag
- Extension ID is extracted from service worker URL
- `headless: false` is required for extension loading in Playwright (Chromium limitation)
- All tests are designed to be run against the built `dist/` directory
