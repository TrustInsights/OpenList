// Unit tests for handleContextMenuClick in background/context-menu.ts

import { handleContextMenuClick } from '@/background/context-menu';
import * as copyWindowModule from '@/background/copy-window';
import * as openListModule from '@/background/open-list';
import { CONFIG } from '@/schemas/config';
import * as loggerModule from '@/utils/logger';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLICK = {
  menuItemId: CONFIG.CONTEXT_MENU_ID,
  selectionText: 'https://example.com',
  editable: false,
  pageUrl: 'https://page.example',
} as chrome.contextMenus.OnClickData;

describe('handleContextMenuClick', () => {
  let openListSpy: MockInstance<typeof openListModule.openList>;

  beforeEach(() => {
    openListSpy = vi.spyOn(openListModule, 'openList').mockResolvedValue({
      successful: 1,
      failed: 0,
      errors: [],
      opened: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the selection', async () => {
    await handleContextMenuClick(CLICK);

    expect(openListSpy).toHaveBeenCalledWith(['https://example.com/']);
  });

  it("copies this window's tabs on a click on the toolbar item, with no selection", async () => {
    const copySpy = vi.spyOn(copyWindowModule, 'copyWindowTabs').mockResolvedValue(undefined);

    await handleContextMenuClick({
      menuItemId: 'OpenList-CopyWindow',
      editable: false,
      pageUrl: 'https://page.example',
    } as chrome.contextMenus.OnClickData);

    expect(copySpy).toHaveBeenCalledOnce();
    expect(openListSpy).not.toHaveBeenCalled();
  });

  it('does not copy the window on a click on the selection item', async () => {
    const copySpy = vi.spyOn(copyWindowModule, 'copyWindowTabs').mockResolvedValue(undefined);

    await handleContextMenuClick(CLICK);

    expect(copySpy).not.toHaveBeenCalled();
  });

  it('ignores a click on another menu item', async () => {
    await handleContextMenuClick({ ...CLICK, menuItemId: 'other' });

    expect(openListSpy).not.toHaveBeenCalled();
  });

  it('ignores a click with no selection text', async () => {
    await handleContextMenuClick({ ...CLICK, selectionText: undefined });

    expect(openListSpy).not.toHaveBeenCalled();
  });

  it('logs one error and resolves when openList rejects', async () => {
    openListSpy.mockRejectedValue(new Error('tabs gone'));
    const error = vi.spyOn(loggerModule.logger, 'error').mockImplementation(() => undefined);

    await expect(handleContextMenuClick(CLICK)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith('Context menu click handler error', { error: 'tabs gone' });
  });
});
