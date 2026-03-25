# Task 4: Source Scaffold — Utils, Schemas, and Types

**Status:** DONE
**Date:** 2026-03-24

## Objective
Create the shared infrastructure for the OpenList Chrome Extension MV3 migration:
pure utility functions, Zod schemas, and TypeScript types used by both background and popup.

## Directory Structure
```
src/
  manifest.json
  types/
    index.ts
  schemas/
    messages.ts
    metrics.ts
    config.ts
    urls.ts
  utils/
    logger.ts
    urls.ts
    tabs.ts
    format.ts
  test/
    setup.ts
```

## Steps

- [x] Create output/notes/task4-progress.md
- [x] Create all source directories
- [x] Write src/types/index.ts
- [x] Write src/schemas/messages.ts
- [x] Write src/schemas/metrics.ts
- [x] Write src/schemas/config.ts
- [x] Write src/schemas/urls.ts
- [x] Write src/utils/logger.ts
- [x] Write src/utils/urls.ts
- [x] Write src/utils/tabs.ts
- [x] Write src/utils/format.ts
- [x] Write src/test/setup.ts
- [x] Write src/manifest.json
- [x] Run pnpm tsc --noEmit
- [x] Fix any TypeScript errors
- [x] Commit

## Notes
- tsconfig.json already has "vite/client" in types (covers import.meta.env.DEV)
- tsconfig.json already has "chrome" in types (covers chrome.tabs.create)
- @/* path alias maps to src/*
- rootDir is ./src, so all source files go under src/
- noUnusedLocals and noUnusedParameters are enabled — need to be careful with unused params

## Issues Found
- `beforeEach` global not recognized by tsc because tsconfig `types` array didn't include `"vitest/globals"`.
  Fix: added `"vitest/globals"` to `tsconfig.json` types array.

## TypeScript Check Result
PASS — `pnpm tsc --noEmit` exits 0 with no errors after fix.
