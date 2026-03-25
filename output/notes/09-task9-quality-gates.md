# Task 9: Quality Gates, Build Fix, Legacy Archive, Final QA

Date: 2026-03-25

## Summary

All quality gates are passing. The migration is complete.

## Build Fix

**Problem**: `pnpm build` failed with `Could not resolve entry module "background/index.ts"`.

**Root cause**: `vite.config.ts` had no `root` setting, so CRXJS resolved manifest paths from the project root rather than `src/`. The manifest at `src/manifest.json` references `background/index.ts` and `popup/index.html`, but Vite was looking for `./background/index.ts` (doesn't exist — it's at `./src/background/index.ts`).

**Fix**: Added `root: resolve(__dirname, './src')` to `vite.config.ts`, with an explicit `build.outDir: resolve(__dirname, './dist')`.

**Second problem**: Icons missing from `src/icon/`. CRXJS couldn't find `icon/icon-16.png` etc.

**Fix**: Copied icon files from `extension/icon/` to `src/icon/`.

## Quality Gate Results

### Biome Lint
- Initial: 21 errors (import ordering, formatting)
- Fix: `pnpm lint:fix` auto-fixed 16 files; 3 `void` type issues fixed with `--unsafe`
- Final: PASS (0 errors)

### TypeScript
- Initial: 3 errors in `tabs.test.ts` (`Tab` not assignable to `void` mock type)
- Fix: Changed `as chrome.tabs.Tab` to `as unknown as undefined`
- Initial App.test.tsx: 6 errors (wrong types for mock return values)
- Fix: Corrected `successRate: number → string`, `uptime: number → string`, `error: boolean` for MetricsState
- Final: PASS (0 errors)

### Vitest (unit tests)
- 243 tests, 21 test files, all pass
- Coverage: 100% lines/branches/functions/statements
- Key fixes:
  - Added `include/exclude` to vitest config to exclude e2e/ from unit test discovery
  - Excluded entry points (`background/index.ts`, `popup/index.tsx`) and `types/index.ts` from coverage
  - Removed unreachable dead code from `messages.ts` (final `if` + fallthrough `return false`)
  - Created `src/popup/App.test.tsx` with 14 tests covering all branches of App component

### Knip (dead code)
- Initial: 7 unused exported types + 3 config hints
- Fix: Removed unused type aliases (`OpenListMessage`, `GetMetricsMessage`, etc.) from `messages.ts`, `UrlValidationResult` from `urls.ts`, `MetricsResponse` from `types/index.ts`
- Updated `knip.json`: removed `ignore` array (knip auto-detects test dirs), added `ignoreExportsUsedInFile: true`
- Final: PASS (0 errors, 0 hints)

### Playwright E2E
- 6 tests, all pass (13.6s)
- Tests: dark-mode.spec, keyboard.spec, metrics.spec, popup.spec

## Coverage Numbers

```
All files          |     100 |      100 |     100 |     100
```

All files at 100%. Entry point files excluded from coverage reporting (correct practice for side-effect bootstrap files).

## Legacy Archive

- `extension/` → `extension-legacy/` via `git mv`
- Git history preserved

## README Update

Added modern "Development" section with:
- Setup instructions
- Command reference table
- Chrome loading instructions
- Tech stack summary

## Files Changed

- `vite.config.ts` — Added `root: 'src'` and explicit `outDir`
- `src/icon/` — New directory with 3 icon PNG files copied from extension-legacy
- `vitest.config.ts` — Added `include/exclude` for test discovery; excluded entry points from coverage
- `src/background/messages.ts` — Removed unreachable dead code path
- `src/popup/App.test.tsx` — New file, 14 tests, full App component coverage
- `src/schemas/messages.ts` — Removed unused type aliases
- `src/schemas/urls.ts` — Removed unused `UrlValidationResult` type
- `src/types/index.ts` — Removed unused `MetricsResponse` type
- `src/utils/tabs.test.ts` — Fixed mock type casting
- `knip.json` — Simplified config
- `README.md` — Added modern development section
- `extension-legacy/` — Renamed from `extension/`
