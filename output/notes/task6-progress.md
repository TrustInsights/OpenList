# Task 6: Migrate Popup to React — Progress

## Status: DONE

## Goal
Migrate the vanilla JS popup (`extension/popup.js`, 215 lines) to React + TypeScript.

## Key Fixes
1. `innerHTML` violations → React components (safe by design)
2. Unreliable `window.unload` interval cleanup → `useEffect` cleanup function
3. `console.error` calls → removed (logger utility used instead)

## Files Created
- [x] `src/components/ErrorBoundary.tsx`
- [x] `src/components/MetricsGrid.tsx`
- [x] `src/components/ErrorDisplay.tsx`
- [x] `src/components/StatusBar.tsx`
- [x] `src/components/Footer.tsx`
- [x] `src/hooks/useMetrics.ts`
- [x] `src/hooks/useOpenUrls.ts`
- [x] `src/popup/App.tsx`
- [x] `src/popup/index.tsx`
- [x] `src/popup/index.html`
- [x] `src/popup/main.css` (copied from `extension/popup.css`, reformatted by Biome)

## Infrastructure Already Exists
- `src/schemas/metrics.ts` — MetricsResponseSchema
- `src/utils/format.ts` — formatDuration
- `src/types/index.ts` — OpenListResult type
- tsconfig.json with `@/` path alias, JSX set to `react-jsx`
- Vite + React plugin configured

## Steps
1. [x] Create progress notes
2. [x] Create directories and files
3. [x] Run `pnpm tsc --noEmit` — PASS (no errors)
4. [x] Run `pnpm biome check src/` — PASS after fixes
5. [x] Commit

## Issues Fixed During Biome Pass
1. Import sort order in `index.tsx`, `useOpenUrls.ts`, `useMetrics.ts`, `App.tsx` — local imports must come before npm package imports
2. `autoFocus` attribute violated `lint/a11y/noAutofocus` — replaced with `useEffect(() => textareaRef.current?.focus())` pattern
3. `key={i}` array index violated `lint/suspicious/noArrayIndexKey` in `ErrorDisplay.tsx` — changed to `key={d}` (using error string as key)
4. `ErrorBoundary.tsx` formatting — `??` operator needed wrapping parens around entire return expression
5. `useOpenUrls.ts` formatting — single-line `setState` object needed to be multi-line
6. `main.css` formatting — Biome auto-fixed 4-space indents → 2-space and single quotes → double quotes
