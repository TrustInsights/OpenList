// Service Worker Entry Point

import { initializeContextMenu } from '@/background/context-menu';
import { handleMessage } from '@/background/messages';
import { getSwState, setSwState } from '@/background/metrics';
import { logger } from '@/utils/logger';

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getSwState();
  await setSwState({ ...state, installTime: Date.now() });
  logger.info('Extension installed/updated');
  await initializeContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
  const state = await getSwState();
  await setSwState({
    ...state,
    activationTime: Date.now(),
    restarts: state.restarts + 1,
  });
  logger.info('Service worker started', { restarts: state.restarts + 1 });
  await initializeContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'OpenList-ContextMenuOpen' && info.selectionText) {
    try {
      const { openList } = await import('@/background/open-list');
      const results = await openList(info.selectionText);
      logger.info('Context menu selection processed', { results });
    } catch (err) {
      logger.error('Context menu click handler error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
});

chrome.runtime.onMessage.addListener(handleMessage);
