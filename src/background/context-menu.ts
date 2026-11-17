// Context menu creation for the service worker

import { copyWindowTabs } from '@/background/copy-window';
import { openSelection } from '@/background/open-selection';
import { CONFIG } from '@/schemas/config';
import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { sleep } from '@/utils/tabs';

/** The item on selected text: open the URLs in the selection. */
const MENU_ITEM: chrome.contextMenus.CreateProperties = {
  id: CONFIG.CONTEXT_MENU_ID,
  title: 'Open selected URLs in new tabs',
  contexts: ['selection'],
};

/** The item on the toolbar icon: copy this window's tabs without the popup. */
const COPY_WINDOW_ITEM: chrome.contextMenus.CreateProperties = {
  id: CONFIG.COPY_WINDOW_MENU_ID,
  title: "Copy this window's tabs",
  contexts: ['action'],
};

/**
 * Creates one context menu item. The Chrome create call reports failure
 * through chrome.runtime.lastError in its callback, not through a promise.
 * @param props - The menu item properties
 * @returns A promise that resolves when Chrome creates the item and rejects on lastError
 */
function createMenuItem(props: chrome.contextMenus.CreateProperties): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.create(props, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Removes every context menu item that this extension owns.
 * @returns A promise that resolves when Chrome removes the items and rejects on lastError
 */
function removeAllMenuItems(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.contextMenus.removeAll(() => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Creates one menu item. Retries once after one second on failure; throws if the retry also fails.
 * @param props - The menu item properties
 * @returns A promise that resolves when the item exists
 */
async function createWithRetry(props: chrome.contextMenus.CreateProperties): Promise<void> {
  try {
    await createMenuItem(props);
    logger.info('Context menu created', { id: props.id });
  } catch (err) {
    logger.error('Context menu creation failed, retrying', {
      id: props.id,
      error: toErrorMessage(err),
    });
    await sleep(1000);
    await createMenuItem(props);
    logger.info('Context menu created on retry', { id: props.id });
  }
}

/**
 * Creates the two context menu items, removing any existing ones first.
 * Each item retries once on failure; throws if a retry also fails.
 * @returns A promise that resolves when both menu items exist
 */
export async function initializeContextMenu(): Promise<void> {
  await removeAllMenuItems();
  await createWithRetry(MENU_ITEM);
  await createWithRetry(COPY_WINDOW_ITEM);
}

/**
 * Handles a click on a context menu item. The toolbar item copies this window's tabs.
 * The selection item opens the selected URLs and logs any failure. Never rejects.
 * @param info - The click data that Chrome passes to the listener
 * @param tab - The tab where the click happened, when Chrome gives it
 * @returns A promise that resolves when the click is handled
 */
export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
): Promise<void> {
  if (info.menuItemId === CONFIG.COPY_WINDOW_MENU_ID) {
    await copyWindowTabs();
    return;
  }
  if (info.menuItemId !== CONFIG.CONTEXT_MENU_ID || !info.selectionText) {
    return;
  }
  try {
    await openSelection(info.selectionText, tab?.windowId);
    logger.info('Context menu selection processed');
  } catch (err) {
    logger.error('Context menu click handler error', { error: toErrorMessage(err) });
  }
}
