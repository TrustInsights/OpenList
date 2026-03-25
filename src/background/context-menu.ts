// Context menu initialization with retry logic

import { CONFIG } from '@/schemas/config';
import { logger } from '@/utils/logger';

const MENU_ITEM = {
  id: CONFIG.CONTEXT_MENU_ID,
  title: 'Open selected URLs in new tabs',
  contexts: ['selection'] as chrome.contextMenus.ContextType[],
};

/**
 * Creates the context menu item, removing any existing one first.
 * Retries once on failure.
 */
export async function initializeContextMenu(): Promise<void> {
  await chrome.contextMenus.removeAll();

  try {
    await chrome.contextMenus.create(MENU_ITEM);
    logger.info('Context menu created');
  } catch (err) {
    logger.error('Context menu creation failed, retrying', {
      error: err instanceof Error ? err.message : String(err),
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    await chrome.contextMenus.create(MENU_ITEM);
    logger.info('Context menu created on retry');
  }
}
