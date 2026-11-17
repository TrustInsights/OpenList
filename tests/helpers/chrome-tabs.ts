// Builders for full Chrome tab and window objects used by the tab source tests

/**
 * Builds a full Chrome tab from the fields a test cares about.
 * @param fields - Fields that differ from a plain loaded tab.
 * @returns A complete tab object.
 */
export function chromeTab(fields: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return {
    id: 1,
    index: 0,
    windowId: 1,
    pinned: false,
    highlighted: false,
    active: false,
    incognito: false,
    discarded: false,
    autoDiscardable: true,
    groupId: -1,
    selected: false,
    title: 'Page',
    url: 'https://example.com/',
    ...fields,
  };
}

/**
 * Builds a populated window for the getAll mock.
 * @param id - The window id.
 * @param tabs - The tabs of the window.
 * @param incognito - The privacy flag of the window.
 * @returns A window object with tabs.
 */
export function chromeWindow(
  id: number,
  tabs: chrome.tabs.Tab[],
  incognito = false
): chrome.windows.Window {
  return { id, incognito, focused: false, alwaysOnTop: false, tabs };
}
