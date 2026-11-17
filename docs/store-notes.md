# Chrome Web Store notes

## Single purpose

OpenList opens a list of URLs as tabs, and copies the URLs and titles of open tabs in the format you choose.

## Permissions

| Permission | Kind | Why OpenList needs it |
|------------|------|-----------------------|
| `tabs` | Required | Read the titles and addresses of your open tabs. OpenList fills the list with them, finds the title of each URL you copy, and skips a URL that is already open. |
| `contextMenus` | Required | Add the right-click item "Open selected URLs in new tabs" and the toolbar item "Copy this window's tabs". |
| `storage` | Required | Remember the copy format you chose, the totals in Details (success rate, tabs opened, errors), the start time of the browser session, and that you dismissed the clipboard button. These values hold numbers and settings. They never hold a URL, a title, or clipboard text. |
| `offscreen` | Required | Write the clipboard when you press the shortcut or use the toolbar item. A service worker cannot write the clipboard, so OpenList opens a hidden page for the write and closes it at once. |
| `clipboardRead` | Optional | Detect a copied URL list when you open the popup, so the list is ready to open. OpenList asks only after you press "Turn on clipboard detection". |
| `clipboardWrite` | Optional | Write the clipboard from the hidden page for the shortcut and the toolbar item. OpenList asks for it together with `clipboardRead`, in the same prompt. |

The shortcut Alt+Shift+C (command `copy-window`) needs no permission. You can change it at `chrome://extensions/shortcuts`.

## Privacy statement

OpenList uses the text on your clipboard only to find URLs in it. OpenList never stores, logs, or sends that text. It reads the clipboard only when you open the popup, and only after you grant the optional permission. If the text holds fewer than two web addresses, OpenList drops it at once. The shortcut and the toolbar item never read the clipboard.

OpenList does not collect personal data, does not track your browsing, and does not send data to any server. It copies the title and address of a tab only to your clipboard, when you press Copy or use the shortcut. All work happens in your browser.

OpenList does not load or run code from a remote server.
