## OpenList Extension Requirements

**1. Purpose:**

OpenList is a Chrome extension designed to enhance user productivity by simplifying the management and opening of lists of URLs. It allows users to quickly open multiple URLs in new tabs from various sources, improving workflow efficiency for tasks involving lists of web resources.

**2. User Stories:**

*   **As a user who frequently compiles lists of articles to read later,** I want to be able to select a list of URLs on a webpage and open them all at once in new tabs, so I can quickly access all the articles without having to open each link individually.
*   **As a user who receives lists of URLs via email or other text documents,** I want to be able to paste a list of URLs into the extension's popup and open them all in new tabs, so I can efficiently review and access these resources.
*   **As a user who wants to share all open tabs in my current window,** I want to be able to quickly get a list of URLs of all my current tabs, so I can easily copy and share them.
*   **As a user who sometimes copies regular text instead of URLs,** I want the extension to automatically convert non-URL text into Google searches when I try to open them, so I can quickly search for information related to that text.
*   **As a security-conscious user,** I want the extension to automatically ensure that all URLs are opened using HTTPS whenever possible, so my browsing is more secure.
*   **As a user who uses dark mode,** I want the extension's popup to automatically adapt to dark mode, so the extension is visually comfortable to use in my preferred system theme.
*   **As a user concerned about browser performance,** I want the extension to be performant and not overload my browser when opening multiple tabs, so my browsing experience remains smooth.
*   **As a user,** I want clear feedback when using the extension, such as status messages and error indications, so I understand what the extension is doing and if any issues occur.

**3. Personas:**

*   **Research User (Researcher Rita):** Rita is a researcher who frequently gathers lists of articles, studies, and online resources for her work. She often receives lists of URLs from colleagues or finds them in online databases. Rita needs a quick way to open and manage these lists without manually clicking each link. She values efficiency and organization.
*   **Content Curator (Curator Carlos):** Carlos is a content curator who spends a significant amount of time browsing the web for interesting articles and resources to share on social media and newsletters. He often compiles lists of links throughout the day and needs a tool to quickly open and review them before sharing. Carlos prioritizes speed and ease of use.
*   **Power Browser (Power User Patricia):** Patricia is a power user who often has many tabs open for different projects and tasks. She sometimes needs to share her current browsing session with others or quickly save all open tabs for later review. Patricia needs a way to easily extract and manage lists of URLs from her current browser window.

**4. Functional Requirements:**

*   **URL Opening from Selection:**
    *   Provide a context menu item "Open selected URLs in new tabs" that appears when text is selected on a webpage. ✅
    *   Upon selection of this context menu item, the extension must:
        *   Extract URLs from the selected text. NOT DONE for the right-click path: it still reads one URL or search term per line (`openList`), so a selection of Markdown, JSON, CSV, or HTML is not parsed. The owner decides whether to wire `parseList` into it. Done in the popup list (not this path): extraction from JSON, CSV, HTML, Markdown, BBCode, and plain lines. Tests of the popup extraction: `extract-urls.test.ts` ("reads JSON", "reads CSV with the Copy header", "reads HTML hrefs and decodes entities", "reads Markdown with an escaped parenthesis", "reads BBCode", "parses 5,000 URLs in under 200 ms").
        *   Sanitize and validate each extracted URL. ✅
        *   For each valid URL, open a new tab in the browser, in the background by default. ✅
        *   Handle non-URL text by converting it into a Google search URL and opening it in a new tab. ✅
        *   Implement rate limiting to control the number of tabs opened simultaneously and prevent browser overload. ✅
        *   Provide user feedback on the number of URLs opened, failed, and skipped. ✅
        *   Log any errors encountered during URL processing. ✅
*   **URL Opening from Popup:**
    *   Provide a browser action (popup) with a text area for users to paste lists of URLs. ✅
    *   Include an "Open N URLs" button in the popup, filled, beside the "Copy N as FORMAT" button, over one editable list. ✅ Tests: `App.test.tsx`, `App-actions.test.tsx`, `ActionButtons.test.tsx`, `popup.spec.ts` ("renders the list, the two actions, and the copy formats in three groups").
    *   Allow users to trigger URL opening by pressing Ctrl+Enter or Cmd+Enter in the text area. ✅ Tests: `open.spec.ts` (Control+Enter on pasted URLs) and `keyboard.spec.ts` ("Meta+Enter opens the URLs of the list").
    *   Upon activation, the extension must:
        *   Process the list of URLs from the text area, line by line. ✅
        *   Sanitize and validate each URL. ✅
        *   For each valid URL, open a new tab in the browser, in the background by default. ✅
        *   Handle non-URL text by converting it into a Google search URL and opening it in a new tab. ✅
        *   Implement rate limiting for tab opening. ✅
        *   Display status messages in the popup to indicate progress and results (successful, failed, skipped counts, and total time). ✅
        *   Display error details in the popup for failed URLs. ✅
        *   Update metrics display after each operation. ✅
*   **Tab sources (replaces "Get Current Tab URLs"):**
    *   In the popup, when the popup opens, the extension must:
        *   Fill the list from the first source that applies: selected tabs, a copied URL list, or this window. A window with one tab starts at "This tab". The "From" control also offers "All windows". ✅ Tests: `tabs-source.test.ts`, `source-choice.test.ts`, `useSources.test.ts`, `popup.spec.ts` ("starts at This window when the window holds several tabs, and fills the list").
        *   Filter out new-tab pages, `about:blank`, blocked schemes, other privacy kinds, and tabs of non-normal windows. ✅ Tests: `tabs-source.test.ts`, `tabs-source-load.test.ts`.
        *   Skip a URL that is already open, and say so in the status line. ✅ Tests: `open-plan.test.ts`, `open.spec.ts` ("Ctrl+Enter opens three pasted URLs, and a second paste is skipped as already open").
        *   Cap one click at 20 tabs and keep the rest in the list. ✅ Test: `open.spec.ts` ("45 URLs open 20 at a time, and the label follows the rest").
*   **Copy tabs:**
    *   Copy the list in one of ten formats in three groups (Plain text: URL, Title, Title & URL. Markup: Markdown, BBCode, HTML, Link. Data: CSV, JSON, HTML table). The first-run format is URL. The popup remembers the last choice. ✅ Tests: `formatters.test.ts`, `formatters-escaping.test.ts`, `settings-store.test.ts`, `copy.spec.ts` ("Markdown gives one linked line per tab, with the page title", "CSV gives the header and one row per tab", "JSON gives an array of objects with the title and address of each tab", "All windows in URL format puts a blank line between windows").
    *   Write the rich flavor for Link and HTML table. ✅ Tests: `clipboard.test.ts` ("calls write with both flavors for a payload with html"), `formatters.test.ts` ("Link gives Title (URL) text and an anchor as html", "HTML table has a header row, a rendered row, and equal text and html").
    *   Read the clipboard when the popup opens, only after the user grants the optional permission, and use it only to find URLs. ✅ Tests: `clipboard.test.ts`, `useSources-prompt.test.ts`, `popup.spec.ts` ("a copied list of URLs becomes the default source, and the status line says so", "a clipboard with one URL is ignored without a message"). The real Chrome prompt is UNVERIFIED (docs/accessibility.md).
*   **Copy without the popup:**
    *   A keyboard shortcut (`copy-window`, suggested Alt+Shift+C) and a toolbar menu item copy this window's tabs in the remembered format through an offscreen page, and report the result with a badge and the icon title. ✅ Tests: `copy-window.test.ts`, `feedback.test.ts`, `offscreen/index.test.ts`, `index.test.ts`, `popup.spec.ts` ("registers the service worker and the copy shortcut from the built manifest"), `copy.spec.ts` ("the offscreen page writes the clipboard in real Chrome"), `chrome-checks.spec.ts` ("Chrome lists the copy-window command with its description and the suggested key"). Pressing the shortcut in a real Chrome window is UNVERIFIED (docs/accessibility.md).
*   **Security:**
    *   Enforce HTTPS for all opened HTTP URLs by automatically upgrading them. ✅
    *   Block potentially dangerous URL protocols (e.g., `javascript:`, `data:`, `file:`). ✅
    *   Sanitize and validate all input URLs to prevent injection attacks. ✅
    *   Implement Content Security Policy (CSP) to enhance extension security. ✅
*   **Performance and Monitoring:**
    *   Implement asynchronous tab creation to prevent UI blocking. ✅
    *   Implement rate limiting to manage tab creation frequency and avoid browser overload (configurable `MAX_TABS` and `DELAY_BETWEEN_TABS`). ✅
    *   Track and display performance metrics in the popup:
        *   Success rate of tab opening. ✅
        *   Number of tabs opened. ✅
        *   Number of errors. ✅
        *   "Open since": the start time of the browser session, saved in `chrome.storage.session`. ✅
    *   Implement error logging and reporting, using `console.error` and structured logging. ✅
*   **User Interface and Experience:**
    *   Provide a user-friendly popup UI that is easy to understand and use. ✅
    *   Support dark mode and light mode based on the user's system preferences. ✅
    *   Provide clear status updates and error messages in the popup. ✅
    *   Ensure accessibility of the popup UI to WCAG 2.1 AA, including keyboard navigation, visible focus, labels, status and alert roles, 4.5:1 text contrast, 3:1 control borders, 44 px controls, reflow at 320 px, and forced colors. Automated checks are done ✅. Tests: `tokens-contrast.test.ts`, the `vitest-axe` scans in `tests/unit/components/`, `a11y.spec.ts` (axe in light and dark, tab order, focus ring), `keyboard-only.spec.ts`, `reflow.spec.ts` (200% and 400% zoom, text spacing), and `forced-colors.spec.ts`. The manual items (VoiceOver, real Windows forced colors, real zoom) are NOT DONE. OpenList is not called compliant until they are done. Record: docs/accessibility.md.
    *   Use CSS variables for styling to manage themes and ensure consistency. ✅
*   **Configuration:**
    *   Define constants in `src/schemas/config.ts` (`MAX_TABS`, `DELAY_BETWEEN_TABS`, `CONTEXT_MENU_ID`, `COPY_WINDOW_MENU_ID`) and local constants where one module uses them (`TAB_RETRIES`, `RETRY_DELAY_MS`). The popup no longer polls, so `POLL_INTERVAL_MS` is gone. ✅

**5. Domain Requirements:**

*   **Browser Compatibility:**
    *   The extension must be compatible with Chrome 110 and later (`offscreen` needs 109, `setBadgeTextColor` needs 110). ✅ Test: `manifest.test.ts`.
    *   The extension should aim to be compatible with other Chromium-based browsers (Edge, Brave, etc.). ✅
*   **Manifest V3:**
    *   The extension must be implemented using Manifest V3 as required by modern Chrome extension standards. ✅
    *   Utilize Service Worker for background processes instead of persistent background pages. ✅
*   **Permissions:**
    *   The extension should request the minimum necessary permissions. ✅
    *   Requested permissions are: `contextMenus`, `storage`, `tabs`, `offscreen`. Optional permissions are `clipboardRead` and `clipboardWrite`, asked once from a button. `storage` holds the totals and the chosen format in `chrome.storage.local` and the session start in `chrome.storage.session`. Each permission has a store justification in docs/store-notes.md. ✅ Tests: `manifest.test.ts`, `deliverables.test.ts` ("the store notes justify every permission of the manifest").
*   **Error Handling and Recovery:**
    *   Implement robust error handling to gracefully manage unexpected situations during URL processing and tab creation. ✅
    *   Include retry mechanisms for tab creation to handle temporary failures. ✅
*   **Privacy:**
    *   The extension must not collect any personal user data. ✅
    *   The extension must operate locally in the browser without sending data to external servers. ✅
    *   Clearly state the privacy policy in the extension description and documentation. The clipboard text is used only to find URLs, and it is never stored, logged, or sent. ✅ Documents: README.md (Privacy) and docs/store-notes.md. Test: `deliverables.test.ts`.
*   **Licensing:**
    *   The extension is released under the MIT License. ✅
