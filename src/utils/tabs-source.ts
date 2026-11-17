// Tab sources: reads open tabs, drops junk and tabs of the other privacy kind, and looks tabs up by URL

import { type TabRecord, TabRecordSchema } from '@/schemas/tab';
import { urlKey } from '@/utils/extract-urls';
import { isProbablyUrl } from '@/utils/urls';

/** Addresses of tabs that never belong in a list (compared without a trailing slash). */
const JUNK_ADDRESSES = new Set(['chrome://newtab', 'chrome://new-tab-page', 'about:blank']);

/** The tabs of the current window, the other sources, and every known tab. */
export interface LoadedTabs {
  active: TabRecord | null;
  window: TabRecord[];
  selected: TabRecord[];
  all: TabRecord[][];
  known: TabRecord[];
}

/**
 * Turns a Chrome tab into a tab record.
 * @public Exported for the unit tests. The production code calls it through loadTabs.
 * @param tab - The Chrome tab.
 * @returns The record, or null for a new-tab page, a blank page, a tab with no address, a tab with a blocked scheme, or data that fails the schema.
 */
export function toTabRecord(tab: chrome.tabs.Tab): TabRecord | null {
  const url = tab.url || tab.pendingUrl;
  // A blocked scheme (file:, view-source:, data:) would turn into a search term, so the tab is dropped.
  if (!url || JUNK_ADDRESSES.has(url.replace(/\/$/, '')) || !isProbablyUrl(url)) return null;
  const parsed = TabRecordSchema.safeParse({
    title: tab.title || url,
    url,
    windowId: tab.windowId,
    index: tab.index,
    pinned: tab.pinned,
    active: tab.active,
    groupId: tab.groupId,
    ...(tab.favIconUrl === undefined ? {} : { favIconUrl: tab.favIconUrl }),
    ...(tab.lastAccessed === undefined ? {} : { lastAccessed: tab.lastAccessed }),
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Turns Chrome tabs into records and drops the tabs that fail the filters.
 * @param tabs - The Chrome tabs, or undefined for a window with no tab list.
 * @returns The records in tab order.
 */
function toRecords(tabs: readonly chrome.tabs.Tab[] | undefined): TabRecord[] {
  return (tabs ?? []).flatMap((tab) => {
    const record = toTabRecord(tab);
    return record === null ? [] : [record];
  });
}

/**
 * Reads the open tabs of every normal window with the same privacy kind as the current window.
 * @returns The current window's tabs, its selected and active tabs, one list per window, and the flat list.
 */
export async function loadTabs(): Promise<LoadedTabs> {
  const [current, windows] = await Promise.all([
    chrome.windows.getCurrent(),
    chrome.windows.getAll({ populate: true, windowTypes: ['normal'] }),
  ]);
  const sameKind = windows.filter((win) => win.incognito === current.incognito);
  const home = sameKind.find((win) => win.id === current.id);
  const homeTabs = home?.tabs ?? [];
  const active = homeTabs.find((tab) => tab.active);
  const all = sameKind.map((win) => toRecords(win.tabs));
  return {
    active: active === undefined ? null : toTabRecord(active),
    window: toRecords(homeTabs),
    selected: toRecords(homeTabs.filter((tab) => tab.highlighted)),
    all,
    known: all.flat(),
  };
}

/**
 * Looks each URL up in the known tabs so a copied list keeps its titles and positions.
 * @param groups - URLs in groups.
 * @param known - The tabs to search.
 * @returns One record per URL: the first tab with the same urlKey, or a plain record that uses the URL as the title.
 */
export function resolveTabs(
  groups: readonly (readonly string[])[],
  known: readonly TabRecord[]
): TabRecord[][] {
  const byKey = new Map<string, TabRecord>();
  for (const tab of known) {
    const key = urlKey(tab.url);
    if (!byKey.has(key)) byKey.set(key, tab);
  }
  return groups.map((group) =>
    group.map(
      (url) =>
        byKey.get(urlKey(url)) ?? {
          title: url,
          url,
          windowId: 0,
          index: 0,
          pinned: false,
          active: false,
          groupId: -1,
        }
    )
  );
}
