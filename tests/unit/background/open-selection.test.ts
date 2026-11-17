// Unit tests for openSelection: the right-click path reads text like the popup, skips open tabs, and reports

import * as feedbackModule from '@/background/feedback';
import * as openListModule from '@/background/open-list';
import { openSelection } from '@/background/open-selection';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Makes the tab query return tabs with these addresses. @param urls - Open tab addresses. */
function openTabs(urls: string[]): void {
  vi.mocked(chrome.tabs.query).mockResolvedValue(urls.map((url) => ({ url }) as chrome.tabs.Tab));
}

describe('openSelection', () => {
  let openListSpy: MockInstance<typeof openListModule.openList>;
  let showSpy: MockInstance<typeof feedbackModule.showResult>;

  beforeEach(() => {
    openListSpy = vi.spyOn(openListModule, 'openList').mockImplementation(async (urls) => ({
      successful: urls.length,
      failed: 0,
      totalTime: 0,
      errors: [],
      opened: [...urls],
    }));
    showSpy = vi.spyOn(feedbackModule, 'showResult').mockResolvedValue(undefined);
    openTabs([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads addresses out of pasted Markdown, like the popup', async () => {
    await openSelection(
      '- [Docs](https://docs.example.com/a)\n- [Blog](https://blog.example.org/b)'
    );
    expect(openListSpy).toHaveBeenCalledWith([
      'https://docs.example.com/a',
      'https://blog.example.org/b',
    ]);
    expect(showSpy).toHaveBeenCalledWith('Opened 2.', true);
  });

  it('keeps a search term and opens it as a search', async () => {
    await openSelection('https://a.example/\nbest pizza');
    expect(openListSpy).toHaveBeenCalledWith([
      'https://a.example/',
      'https://www.google.com/search?q=best%20pizza',
    ]);
  });

  it('skips a page that is already open in the window, and says so', async () => {
    openTabs(['http://a.example/', 'https://c.example/']);
    await openSelection('https://a.example/\nhttps://b.example/');
    expect(openListSpy).toHaveBeenCalledWith(['https://b.example/']);
    expect(showSpy).toHaveBeenCalledWith('Opened 1, skipped 1 already open.', true);
  });

  it('opens nothing when every page is already open', async () => {
    openTabs(['https://a.example/', 'https://b.example/']);
    await openSelection('https://a.example/\nhttps://b.example/');
    expect(openListSpy).not.toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalledWith('All 2 already open.', true);
  });

  it('counts a tab that is still loading by its pending address and ignores a tab with no address', async () => {
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { pendingUrl: 'https://a.example/' } as chrome.tabs.Tab,
      {} as chrome.tabs.Tab,
    ]);
    await openSelection('https://a.example/\nhttps://b.example/');
    expect(openListSpy).toHaveBeenCalledWith(['https://b.example/']);
    expect(showSpy).toHaveBeenCalledWith('Opened 1, skipped 1 already open.', true);
  });

  it('removes a repeated address in the selection', async () => {
    await openSelection('https://a.example/\nhttps://a.example/');
    expect(openListSpy).toHaveBeenCalledWith(['https://a.example/']);
  });

  it('says there is nothing to open for a selection of blank text', async () => {
    await openSelection('   \n  ');
    expect(openListSpy).not.toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalledWith('Nothing to open.', false);
  });

  it('stops at the tab limit and reports the rest', async () => {
    const urls = Array.from({ length: 25 }, (_, i) => `https://x.example/${i}`);
    await openSelection(urls.join('\n'));
    expect(openListSpy.mock.calls[0]?.[0]).toHaveLength(20);
    expect(showSpy).toHaveBeenCalledWith('Opened 20, 5 more over the limit of 20.', true);
  });

  it('shows a failure when a tab does not open', async () => {
    openListSpy.mockResolvedValue({
      successful: 1,
      failed: 1,
      totalTime: 0,
      errors: ['x'],
      opened: [],
    });
    await openSelection('https://a.example/\nhttps://b.example/');
    expect(showSpy).toHaveBeenCalledWith('Opened 1, 1 failed.', false);
  });

  it('asks for the tabs of the window of the click when it is known', async () => {
    await openSelection('https://a.example/', 7);
    expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId: 7 });
  });

  it('asks for the current window when the window is not known', async () => {
    await openSelection('https://a.example/');
    expect(chrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
  });
});
