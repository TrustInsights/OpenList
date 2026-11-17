// Unit tests for handleContextMenuClick in background/context-menu.ts

import { handleContextMenuClick } from '@/background/context-menu';
import * as copyWindowModule from '@/background/copy-window';
import * as openListModule from '@/background/open-list';
import { CONFIG } from '@/schemas/config';
import * as metricsModule from '@/utils/metrics-store';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLICK = {
  menuItemId: CONFIG.CONTEXT_MENU_ID,
  selectionText: 'https://example.com',
  editable: false,
  pageUrl: 'https://page.example',
} as chrome.contextMenus.OnClickData;

describe('handleContextMenuClick', () => {
  let openListSpy: MockInstance<typeof openListModule.openList>;
  let recordErrorSpy: MockInstance<typeof metricsModule.recordError>;

  beforeEach(() => {
    openListSpy = vi.spyOn(openListModule, 'openList').mockResolvedValue({
      successful: 1,
      failed: 0,
      skipped: 0,
      totalTime: 0,
      errors: [],
      opened: [],
    });
    recordErrorSpy = vi.spyOn(metricsModule, 'recordError').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the selection and records no error on success', async () => {
    await handleContextMenuClick(CLICK);

    expect(openListSpy).toHaveBeenCalledWith('https://example.com');
    expect(recordErrorSpy).not.toHaveBeenCalled();
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

  it('records one error when openList rejects', async () => {
    openListSpy.mockRejectedValue(new Error('tabs gone'));

    await handleContextMenuClick(CLICK);

    expect(recordErrorSpy).toHaveBeenCalledOnce();
    const message = recordErrorSpy.mock.calls[0][0];
    expect(message).toContain('Context menu click failed');
    expect(message).toContain('tabs gone');
  });

  it('still resolves when recordError also rejects', async () => {
    openListSpy.mockRejectedValue(new Error('tabs gone'));
    recordErrorSpy.mockRejectedValue(new Error('storage gone'));

    await expect(handleContextMenuClick(CLICK)).resolves.toBeUndefined();

    expect(recordErrorSpy).toHaveBeenCalledOnce();
  });
});
