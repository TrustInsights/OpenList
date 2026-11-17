// Service worker entry point: registers lifecycle, menu and message listeners

import { handleContextMenuClick } from '@/background/context-menu';
import { copyWindowTabs } from '@/background/copy-window';
import { handleInstalled, handleStartup } from '@/background/lifecycle';
import { handleMessage } from '@/background/messages';

chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);

chrome.commands.onCommand.addListener((name) => {
  if (name === 'copy-window') void copyWindowTabs();
});

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

chrome.runtime.onMessage.addListener(handleMessage);
