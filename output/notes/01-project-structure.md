# 01 — Project Structure

> Preserved audit note from planning phase. Do not delete — future agents depend on these findings.

## Repository Root

`/Users/cspenn/Documents/github/OpenList`

This is a Chrome extension project. The extension source lives entirely in `extension/` — **not** in `src/`, which is empty. There is no build tooling, no package manager, no TypeScript. The extension is plain vanilla JavaScript served directly to Chrome.

## Full Directory Tree

```
OpenList/
├── .claude/                         # Claude Code config (CLAUDE.md, settings)
├── chrome_store/                    # Web Store submission assets
│   ├── screenshots/                 # Store listing screenshots
│   └── *.psd                        # Photoshop source files for promotional art
├── data/                            # EMPTY — reserved for future use
├── docs/
│   ├── orientation.md               # Project onboarding overview
│   ├── prd.md                       # Product requirements document
│   └── rules-chrome-ext.md          # Engineering standards/rules for this project
├── extension/                       # THE ACTUAL CHROME EXTENSION SOURCE
│   ├── icon/
│   │   ├── icon-16.png              # Toolbar icon (16×16)
│   │   ├── icon-48.png              # Extension management icon (48×48)
│   │   └── icon-128.png             # Web Store / install icon (128×128)
│   ├── manifest.json                # MV3 manifest (1.2K, 44 lines)
│   ├── popup.css                    # Popup styles (3.7K, 180 lines)
│   ├── popup.html                   # Popup markup (921B, 24 lines)
│   ├── popup.js                     # Popup logic (7.0K, 215 lines)
│   └── service-worker.js            # Background service worker (9.7K, 315 lines)
├── input/                           # EMPTY — reserved for future use
├── logs/                            # EMPTY — reserved for future use
├── output/                          # EMPTY at audit time (now contains notes/)
│   └── notes/                       # Planning-phase audit notes (this directory)
├── src/                             # EMPTY — target for migration output
├── temp/                            # EMPTY — reserved for future use
├── tests/                           # EMPTY — no test infrastructure exists
├── .gitignore
├── extension.zip                    # Packaged extension for Web Store upload
├── icon.png                         # Source icon asset
├── LICENSE                          # MIT License
└── README.md                        # Project readme
```

## File-by-File Purpose

### `extension/manifest.json`
The Chrome extension manifest (Manifest Version 3). Declares permissions, background script, popup entry point, CSP, and web-accessible resources. Version 1.0.2.

### `extension/service-worker.js`
The background service worker. Handles context menu initialization, URL validation and sanitization, tab creation, and message passing from the popup. 315 lines — slightly over the 250 LOC rule limit. Contains all business logic for opening URL lists.

### `extension/popup.js`
The popup UI controller. Manages DOM interactions, sends messages to the service worker, polls for metrics, and displays results. 215 lines. Contains CSP violations via `innerHTML`.

### `extension/popup.html`
Minimal HTML skeleton for the popup. Defines the textarea for URL input, the open button, status area, metrics display, and footer link. 24 lines.

### `extension/popup.css`
Full stylesheet for the popup. Uses CSS custom properties for theming, includes dark mode via `@media (prefers-color-scheme: dark)`, defines metrics grid layout, error styles, and accessibility focus outlines. Popup width: 450px, min-width: 300px. 180 lines.

### `extension/icon/*.png`
Standard Chrome extension icons at required sizes (16, 48, 128). Used in the toolbar, extension management page, and Web Store.

### `docs/rules-chrome-ext.md`
The engineering standards document for this project. Defines required toolchain (TypeScript 5.8+, Vite + CRXJS, pnpm, React 19, Zod, Vitest, Playwright, Biome), coding rules across 8 quality dimensions (Async/Sync, CSP, Memory Leaks, Permissions, Quota, Service Worker, DOM Isolation, Offline), and file-size limits.

### `docs/prd.md`
Product requirements document defining what OpenList does: accepts a list of URLs/search queries and opens them all as new tabs in the current window, with context menu support.

### `docs/orientation.md`
Onboarding guide for developers. References the project structure, tech stack, and workflow.

## Key Structural Facts

1. **Extension source is in `extension/`, not `src/`.** Any references to `src/` as a source directory are incorrect at the time of this audit.

2. **`src/` is the migration target.** The new TypeScript/React codebase will be built into `src/` during the migration.

3. **Zero build tooling.** No `package.json`, no `tsconfig.json`, no `vite.config.ts`, no `biome.json`, no `node_modules/`. The extension is loaded directly into Chrome with no compilation step.

4. **Zero test infrastructure.** The `tests/` directory exists but is empty. No test framework is installed.

5. **`extension.zip`** is a pre-packaged build kept in the repo root for Web Store submission convenience. It matches the `extension/` directory contents.
