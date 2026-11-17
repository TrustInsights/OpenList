# OpenList Chrome Extension

OpenList helps you manage lists of URLs. It's useful if you have a habit of emailing yourself lists of articles or pages to check out later.

## Features

* Open a list of URLs (or search terms) as new tabs, from a web page selection or from the popup
* Copy the URLs and titles of your tabs in ten formats: URL, Title, Title & URL, Markdown, BBCode, HTML, Link, CSV, JSON, and HTML table
* Copy the tabs of this window with a keyboard shortcut or a toolbar menu item, without opening the popup
* Fill the list from selected tabs, a copied URL list, this window, this tab, or all windows
* Skip URLs that are already open
* Automatically converts non-URL text into Google searches
* Upgrades website addresses to HTTPS for security (local addresses stay as typed)
* Light and dark mode that follow your system
* Keyboard support, a visible focus ring, and tested color contrast in light and dark mode (see docs/accessibility.md for what is checked and what is open)
* Totals of tabs opened and errors, and rate limiting to prevent browser overload

## Installation

[Download the extension from the Chrome store](https://chromewebstore.google.com/detail/openlist/lfbdgcgbddpkaogkhaieknhallmebhkm?authuser=0&hl=en). It's free!

## Usage

### Opening URLs from a selection
1. Select URLs or text anywhere on a webpage
2. Right-click and select "Open selected URLs in new tabs"
3. The extension opens each URL in a new tab

### The popup: one list, two actions
1. Click the OpenList icon in your toolbar
2. The list fills by itself. The "From" control shows where the list came from: selected tabs, a copied URL list, this window, this tab, or all windows. Change it to replace the list.
3. Edit the list. Paste URLs, delete lines, or type search terms. One URL or term per line. A blank line starts a new group.
4. Click **Open N URLs**, or press Ctrl+Enter (Cmd+Enter on a Mac) in the list. OpenList opens up to 20 tabs at a time and skips URLs that are already open. The URLs that did not open stay in the list.
5. Or click **Copy N as FORMAT**. The status line says what it copied.

### Copy formats
Pick the format in the "Copy as" control. OpenList remembers it. The first format is URL.

| Group | Formats |
|-------|---------|
| Plain text | URL, Title, Title & URL |
| Markup | Markdown, BBCode, HTML, Link |
| Data | CSV, JSON, HTML table |

Link and HTML table also put a rich version on the clipboard, so a word processor or a spreadsheet pastes real links or a table. Every format that holds URLs reads back into the list.

### Copy this window without the popup
Press Alt+Shift+C, or right-click the OpenList toolbar icon and select "Copy this window's tabs". OpenList copies the tabs of the current window in your chosen format. The toolbar icon shows a check mark or an exclamation mark, and its title tells the result. Change the shortcut at `chrome://extensions/shortcuts`.

### Clipboard button
Click **Turn on clipboard detection** once. Chrome asks you to allow reading and writing the clipboard. Then OpenList uses a copied list of two or more URLs when you open the popup, and the shortcut can write the clipboard. Click "Not now" to move the button into Details.

## Security Features

* Automatic HTTPS upgrading for HTTP website URLs. Local addresses are not upgraded: `localhost`, `127.0.0.1`, `[::1]`, and any host that ends in `.local` stay as typed, so a local dev server opens.
* Blocking of potentially dangerous URL protocols
* Input sanitization and URL validation
* Content Security Policy implementation
* Rate limiting and tab creation limits

## Performance

* Built-in performance monitoring
* Success rate tracking
* Tab operation metrics
* Error tracking and reporting

## Technical Details

* Uses Manifest V3 for modern Chrome compatibility
* Service worker-based background processing
* Asynchronous tab creation with rate limiting
* Error recovery mechanisms
* Comprehensive logging system

## Browser Compatibility

* Chrome 110+
* Chromium-based browsers (Edge, Brave, etc.)

## History

* v1.2.0: single-list popup and copy
  - One list with two actions: Open and Copy
  - Ten copy formats, remembered between uses
  - Copy this window's tabs with Alt+Shift+C or the toolbar menu, without the popup
  - Detects a copied URL list when you allow the optional clipboard permission
  - Skips URLs that are already open
  - New look in light and dark mode, with keyboard support, a visible focus ring, and tested color contrast (see docs/accessibility.md for the checks and the open items)
  - Totals now survive a browser restart
  - Needs Chrome 110 or later
* v1.1.0: quality release
  - Opens bare domains such as `example.com` as HTTPS URLs
  - Leaves `http://` as typed for local addresses (`localhost`, `127.0.0.1`, `[::1]`, `.local`)
  - Fixes context-menu creation and the start time of the metrics
  - Keeps every metric count when two opens run at the same time
  - Records tab errors in the metrics
  - Footer shows the version from the manifest
  - Moves all tests to `tests/` and adds size, audit, and dead-code gates
  - Updates dependencies (zod 4)
* v1.0.0: Complete modernization
  - Upgraded to Manifest V3
  - Added security features and HTTPS upgrading
  - Added performance monitoring
  - Added dark mode support
  - Improved error handling
  - Added rate limiting
* v0.3.3: remove redundant addition of context menu item
* v0.3.2: use Chrome event page instead of persistent background page
* v0.3.1: fix a bug where Open button sometimes didn't work
* v0.3: compatibility and security improvements
* v0.2.2: removes warning when opening many tabs
* v0.2: adds list generation capability & popup
* v0.1: initial release

## Contributing

Please open an issue on [the GitHub issue tracker for this project](https://github.com/cdzombak/OpenList/issues).

## Development

### Prerequisites

- Node.js 22+
- pnpm 10+

### Setup

```bash
git clone https://github.com/cdzombak/OpenList.git
cd OpenList
pnpm install
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with CRXJS HMR |
| `pnpm build` | Production build to `dist/` |
| `pnpm test` | Unit tests with 100% coverage (Vitest) |
| `pnpm test:watch` | Unit tests in watch mode |
| `pnpm test:e2e` | End-to-end tests (Playwright, requires built `dist/`) |
| `pnpm lint` | Biome lint check (`src`, `tests`, and config files) |
| `pnpm lint:fix` | Biome lint with auto-fix |
| `pnpm typecheck` | TypeScript type check |
| `pnpm knip` | Dead code / unused exports check (production and full) |
| `pnpm run audit` | Dependency advisory check (high and critical) |
| `pnpm size` | Build, then check the bundle size limits |
| `pnpm check` | Full quality gate (lint + typecheck + test + knip + audit + size) |

### Loading in Chrome

1. Run `pnpm build`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable Developer Mode
4. Click "Load unpacked" and select the `dist/` directory

### Tech Stack

- **Vite 8** + **CRXJS** — Chrome extension build tooling with HMR
- **React 19** + **TypeScript 5.8** — Popup UI
- **Zod 4** — Runtime validation for messages and storage
- **Biome** — Linting and formatting
- **Vitest** + **Testing Library** — Unit tests with 100% coverage enforcement
- **Playwright** — E2E integration tests

## Privacy

This extension:
* Does not collect any personal data
* Does not track your browsing history
* Does not send data to any external servers
* All processing happens locally in your browser
* Reads the clipboard only if you allow the optional clipboard permission, and only when you open the popup. It uses the text only to find URLs. It never stores, logs, or sends that text.
* Copies the title and address of a tab only to your clipboard, when you ask it to

## License

MIT. See `LICENSE` included in this repo.

## Credits

* Original version by Chris Dzombak
* Manifest V3 update and modernization by TrustInsights.ai
* [chris.dzombak.name](http://chris.dzombak.name/)

## Contact

* For bugs and features: Use the [GitHub issue tracker](https://github.com/cdzombak/OpenList/issues)
* Original author: chris@chrisdzombak.net
