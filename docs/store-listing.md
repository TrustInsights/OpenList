# Chrome Web Store listing (field by field)

Status: draft for the owner's approval. Nothing here is published. The live listing is item lfbdgcgbddpkaogkhaieknhallmebhkm (published, public). The "Current" column is what the owner pasted on 2026-11-17.

The store summary comes from the manifest description ("Summary from package"). Approving the summary text means changing `src/manifest.json`.

## Store listing tab

| Field | Current | Proposed |
|-------|---------|----------|
| Title | OpenList (from package) | No change |
| Summary (from package, max 132) | Manage and open lists of URLs. Select URLs in any webpage or paste them to open in new tabs. Updated by TrustInsights.ai. | Open a list of URLs as tabs, or copy your open tabs as Markdown, CSV, JSON, and more. Updated by TrustInsights.ai. (114 characters) |
| Description (max 16,000) | 200 characters, credits Chris Dzombak | The text below (4413 characters). It follows the layout of the Figured listing: story line, overview, key features, how it works, permissions, open source. |
| Category | Functionality & UI | No change |
| Language | English (United States) | No change |
| Screenshots | Make new ones (the old ones show the old popup) | At least one 1280x800 PNG without alpha |
| Small promo tile | 440x280 | New image |
| Homepage URL | https://www.trustinsights.ai?utm_source=openlist&utm_medium=referral&utm_campaign=openlist_1_0 | Change the campaign tag to openlist_1_2_0 so it matches the footer link |
| Support URL | Same as the homepage | https://github.com/TrustInsights/OpenList/issues (decision for the owner) |

### Description text

OpenList is a Google Chrome extension originally created by Chris Dzombak, rebuilt for Manifest V3 and extended by Christopher Penn, sponsored by TrustInsights.ai. It does two jobs with one list of URLs: open the list as tabs, or copy your open tabs in the format you need.

Overview
A colleague sends you twenty links. You want them all open, now. Or you have thirty tabs open and need them as a clean Markdown list for a report. OpenList does both from one small popup. The list is the center of it: it starts with the tabs of your window, you edit it like any text, and then you press Open or Copy.

Everything happens inside your browser. OpenList makes no network requests of its own, has no tracking or advertising code, and never reads the content of a web page.

Key Features
📋 One List, Two Jobs: Open the URLs in the list as tabs, or copy them. Delete the lines you do not want first, and both buttons follow your edits.
🔗 Paste Anything: Paste plain lines, Markdown, HTML, CSV, JSON, or BBCode. OpenList finds the web addresses. Lines that are not addresses become Google searches, and bare domains like example.com just work.
🧠 Smart Defaults: The list starts with the tabs you highlighted, or a list of URLs you just copied, or your whole window. Your last copy format is remembered. A control you change is never changed back for you.
📝 Ten Copy Formats: URL, Title, Title & URL, Markdown, BBCode, HTML, Link, CSV, JSON, and HTML table. Titles are escaped correctly in every format, and CSV cells that start like a spreadsheet formula are made safe. A one-line example shows what you will get before you copy.
🪟 Pick Your Scope: Selected tabs, this tab, this window, or all windows. With all windows, a blank line separates the windows.
⌨️ Copy Without the Popup: Press Alt+Shift+C, or use the toolbar icon's right-click menu, to copy this window's tabs in your remembered format. You can change the shortcut at chrome://extensions/shortcuts.
🖱️ Right-Click to Open: Select URLs on any web page, right-click, and choose "Open selected URLs in new tabs".
🔁 No Double Tabs: A URL that is already open in your window is skipped, and the status line tells you how many.
📦 Big Lists, One Step at a Time: OpenList opens up to 20 tabs per click so your browser stays fast. The rest stay in the list, and the button reads "Open next 20 of 25".
🛡️ Safe Opening: Web addresses are upgraded to https. Local addresses such as localhost stay as you typed them. Dangerous address types (javascript:, data:, file:, and similar) are never opened.
📊 Details: Success rate, tabs opened, and errors, saved across restarts.
🌗 Light and Dark: The popup follows your system theme and your reduced-motion setting.
⌨️ Keyboard Friendly: Every control works with the keyboard and has a text label. Press Ctrl+Enter, or Cmd+Enter on a Mac, to open the list.
🔒 Local and Private: No data leaves your browser. Private windows keep to themselves: a normal window never lists private tabs.

How It Works
Your Tabs: OpenList reads the title and address of your open tabs to fill the list and to find the title of each URL you copy. It does not read page content.
Clipboard Detection (Optional): If you press "Turn on clipboard detection", the popup reads your clipboard once when it opens, only to find web addresses. If it holds two or more, the list starts with them. The text is never stored, logged, or sent. If you never press the button, OpenList never reads your clipboard.
Copying: Copy writes the formatted list to your clipboard, and nothing else. The shortcut and the toolbar item use a hidden page that closes right after the write, because a browser extension's background script cannot write to the clipboard.
Local Storage: Your copy format, your totals, and your settings are saved in your browser only. They hold numbers and settings, never a URL, a title, or clipboard text.

Permissions
Four required permissions: "tabs" (read your tab titles and addresses), "contextMenus" (the right-click items), "storage" (save your settings and totals), and "offscreen" (write the clipboard for the shortcut). Two optional permissions, asked for only if you press the clipboard button: "clipboardRead" and "clipboardWrite". OpenList has no access to the content of any website.

Open Source
OpenList is free software under the MIT License. Source code, help, and ideas: https://github.com/TrustInsights/OpenList

## Privacy tab

| Field | Current | Proposed |
|-------|---------|----------|
| Single purpose | Manage and open lists of URLs. Select URLs in any webpage or paste them to open in new tabs | Open a list of URLs as browser tabs, and copy the titles and URLs of open tabs to the clipboard in formats such as Markdown, CSV, and JSON. Both jobs work on one list of URLs. |
| contextMenus | To have the extension available in the context menu. | Adds the right-click item "Open selected URLs in new tabs" for selected text, and the toolbar-icon item "Copy this window's tabs". |
| storage | Describes session storage for usage counters | Remembers the copy format you chose, the totals shown in the popup's Details section (tabs opened, tabs failed, success rate), the start time of the browser session, and that you dismissed the clipboard button. It stores numbers and settings only. It never stores a URL, a title, or clipboard text. |
| tabs | To scan the list of open tabs and find their URLs. | Reads the title and address of your open tabs to fill the list, to find the title of each URL you copy, and to skip URLs that are already open. This data stays in your browser and is never sent anywhere. |
| offscreen (new) | none | A service worker cannot write to the clipboard. When you press the keyboard shortcut or use the toolbar menu item, the extension opens a hidden page, writes the copied list to the clipboard, and closes the page at once. |
| clipboardRead (new, optional) | none | Optional. If you press "Turn on clipboard detection", the popup reads the clipboard text once when it opens, only to find web addresses so the list is ready to open. The text is never stored, logged, or sent. If it holds fewer than two web addresses, it is dropped at once. |
| clipboardWrite (new, optional) | none | Optional. Lets the extension write the copied tab list to the clipboard from the hidden page when you use the shortcut or the toolbar menu item. It is requested together with clipboardRead. |
| Remote code | none | The extension does not load or run remote code. |
| Privacy policy URL | https://www.trustinsights.ai/contact/privacy-policy-and-compliance/ | Keep it, and add an OpenList section there. The repository text is in docs/privacy-policy.md. Decision for the owner. |

### Data usage and certifications (owner only)

The form asks which user data types the extension collects, and it asks the owner to certify three disclosures. Those are legal statements that only the owner can make. My reading, which the owner must confirm against the Chrome Web Store FAQ: OpenList reads tab titles and addresses and optional clipboard text on the user's computer only, and sends none of it anywhere. I did not verify how the form defines "collect" for data that stays on the device.

## Notes for the update

- The 1.2.0 update adds the permission `offscreen` (no install warning is listed in the Chrome reference, reported by the docs check and not verified in Chrome) and two optional permissions (`clipboardRead`, `clipboardWrite`), which show no warning at update. The existing permissions are unchanged, so existing users should not be turned off. Confirm after the first review.
- Do not claim WCAG compliance in the listing until the manual pass in docs/accessibility.md is done.
