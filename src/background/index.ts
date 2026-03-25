import { initializeContextMenu } from '@/background/context-menu';
import { handleMessage } from '@/background/messages';
import { getSwState, setSwState } from '@/background/metrics';
import { openList } from '@/background/open-list';
import { CONFIG } from '@/schemas/config';
import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getSwState();
  await setSwState({ ...state, installTime: Date.now() });
  logger.info('Extension installed/updated');
  await initializeContextMenu();
});

chrome.runtime.onStartup.addListener(async () => {
  const state = await getSwState();
  const restarts = state.restarts + 1;
  await setSwState({ ...state, activationTime: Date.now(), restarts });
  logger.info('Service worker started', { restarts });
  await initializeContextMenu();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === CONFIG.CONTEXT_MENU_ID && info.selectionText) {
    try {
      const results = await openList(info.selectionText);
      logger.info('Context menu selection processed', { results });
    } catch (err) {
      logger.error('Context menu click handler error', { error: toErrorMessage(err) });
    }
  }
});

chrome.runtime.onMessage.addListener(handleMessage);
