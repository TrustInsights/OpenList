# OpenList Chrome Extension

OpenList helps you manage lists of URLs. It's useful if you have a habit of emailing yourself lists of articles or pages to check out later.

## Features

* Select a list of URLs (or search terms) in any web page or textarea, then open them all in new tabs
* Paste a list of URLs (or search terms) into a popup, then open them all in new tabs
* Get a list of all tabs in the current window
* Automatically converts non-URL text into Google searches
* Enforces HTTPS for security
* Dark mode support
* Performance monitoring and metrics
* Rate limiting to prevent browser overload

## Installation

[Download the extension from the Chrome store](https://chromewebstore.google.com/detail/openlist/lfbdgcgbddpkaogkhaieknhallmebhkm?authuser=0&hl=en). It's free!

## Usage

### Opening URLs from Selection
1. Select URLs or text anywhere on a webpage
2. Right-click and select "Open selected URLs in new tabs"
3. The extension will open each URL in a new tab

### Opening URLs from Popup
1. Click the OpenList icon in your toolbar
2. Paste your URLs (one per line) into the text area
3. Click "Open URLs" or press Ctrl+Enter

### Getting Current Tab URLs
1. Click the OpenList icon in your toolbar
2. Click anywhere in the empty text area
3. Your current window's tab URLs will be automatically copied to the text area

## Security Features

* Automatic HTTPS upgrading for all HTTP URLs
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

* Chrome 102+
* Chromium-based browsers (Edge, Brave, etc.)

## History

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

To work on this extension:

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable Developer Mode
4. Click "Load unpacked" and select the `extension` directory

## Privacy

This extension:
* Does not collect any personal data
* Does not track your browsing history
* Does not send data to any external servers
* All processing happens locally in your browser

## License

MIT. See `LICENSE` included in this repo.

## Credits

* Original version by Chris Dzombak
* Manifest V3 update and modernization by TrustInsights.ai
* [chris.dzombak.name](http://chris.dzombak.name/)

## Contact

* For bugs and features: Use the [GitHub issue tracker](https://github.com/cdzombak/OpenList/issues)
* Original author: chris@chrisdzombak.net
