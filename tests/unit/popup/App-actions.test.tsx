// Unit tests for popup/App.tsx: copy, open, format, source, Details, and the clipboard button

import { App } from '@/popup/App';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FakeStorage, useFakeStorage } from '@tests/helpers/chrome-storage';
import {
  type ClipboardStub,
  deferred,
  mockWindows,
  siteTab,
  stubClipboard,
} from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const THREE = [siteTab(1, { active: true }), siteTab(2), siteTab(3)];
const send = vi.mocked(chrome.runtime.sendMessage);
let storage: FakeStorage;
let clipboard: ClipboardStub;
let user: ReturnType<typeof userEvent.setup>;

/** Builds the service worker reply for the lines that opened. */
function reply(opened: string[]): unknown {
  return {
    status: 'complete',
    results: {
      successful: opened.length,
      failed: 0,
      errors: [],
      opened,
    },
  };
}

/** Renders the popup with one window and waits for the list to load. */
async function loadedApp(tabs = THREE, openUrls = tabs.map((tab) => tab.url)): Promise<void> {
  mockWindows([tabs]);
  vi.mocked(chrome.tabs.query).mockResolvedValue(
    openUrls.map((url) => ({ url }) as chrome.tabs.Tab)
  );
  render(<App />);
  await screen.findByRole('button', { name: /^Copy [1-9]/ });
}

beforeEach(() => {
  storage = useFakeStorage();
  // userEvent.setup() installs its own clipboard, so the stub goes in after it.
  user = userEvent.setup();
  clipboard = stubClipboard();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App copy and format', () => {
  it('Copy writes the URLs and says what it copied', async () => {
    await loadedApp();
    await user.click(screen.getByRole('button', { name: 'Copy 3 as URL' }));
    expect(clipboard.writeText).toHaveBeenCalledWith(
      'https://site1.com/\nhttps://site2.com/\nhttps://site3.com/'
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied 3 as URL.'));
  });

  it('a format change updates the label and the example, saves, and keeps the list', async () => {
    await loadedApp();
    const list = screen.getByRole('textbox');
    const before = (list as HTMLTextAreaElement).value;
    await user.selectOptions(screen.getByLabelText('Copy as'), 'Markdown');
    expect(screen.getByRole('button', { name: 'Copy 3 as Markdown' })).toBeInTheDocument();
    expect(screen.getByLabelText('Copy as')).toHaveAccessibleDescription(
      'Example: - [Site 1](https://site1.com/)'
    );
    expect(list).toHaveValue(before);
    expect(list).not.toHaveFocus();
    await waitFor(() => expect(storage.local.settings).toEqual({ format: 'Markdown' }));
    await user.click(screen.getByRole('button', { name: 'Copy 3 as Markdown' }));
    expect(clipboard.writeText).toHaveBeenCalledWith(
      '- [Site 1](https://site1.com/)\n- [Site 2](https://site2.com/)\n- [Site 3](https://site3.com/)'
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Copied 3 as Markdown.')
    );
  });

  it('uses the remembered format on open', async () => {
    storage.local.settings = { format: 'CSV' };
    await loadedApp();
    await waitFor(() => expect(screen.getByLabelText('Copy as')).toHaveValue('CSV'));
    expect(screen.getByRole('button', { name: 'Copy 3 as CSV' })).toBeInTheDocument();
  });

  it('a failed copy shows the error in an alert linked to nothing on the list', async () => {
    clipboard.writeText.mockRejectedValue(new Error('Document is not focused'));
    await loadedApp();
    await user.click(screen.getByRole('button', { name: 'Copy 3 as URL' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Document is not focused');
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });
});

describe('App open', () => {
  it('opens the new URLs, removes them, reports, and reads Details again', async () => {
    storage.local.totals = { tabsOpened: 1, tabsFailed: 0, urlsProcessed: 1 };
    await loadedApp(THREE, [THREE[0].url as string]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open 2 URLs' })).toBeInTheDocument()
    );
    send.mockResolvedValue(reply(['https://site2.com/', 'https://site3.com/']));
    storage.local.totals = { tabsOpened: 3, tabsFailed: 0, urlsProcessed: 3 };
    await user.click(screen.getByRole('button', { name: 'Open 2 URLs' }));
    expect(send).toHaveBeenCalledWith({
      action: 'openList',
      urls: ['https://site2.com/', 'https://site3.com/'],
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Opened 2, skipped 1 already open.')
    );
    expect(screen.getByRole('textbox')).toHaveValue('');
    const tabsOpened = screen.getByText('Tabs opened', { selector: 'dt' }).parentElement;
    await waitFor(() => expect(tabsOpened).toHaveTextContent('3'));
  });

  it('Ctrl+Enter in the list opens, and a second Ctrl+Enter while it runs does nothing', async () => {
    await loadedApp(THREE, []);
    const gate = deferred<unknown>();
    send.mockReturnValue(gate.promise);
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Control>}{Enter}{Enter}{/Control}');
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /^Open/ })).toBeDisabled();
    gate.resolve(reply(['https://site1.com/']));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Open/ })).toBeEnabled());
  });

  it('Cmd+Enter in the list opens', async () => {
    await loadedApp(THREE, []);
    send.mockResolvedValue(reply(['https://site1.com/']));
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  });

  it('an empty list shows the alert, marks the list invalid, and links them', async () => {
    await loadedApp();
    const box = screen.getByRole('textbox');
    await user.clear(box);
    await user.click(screen.getByLabelText('URLs, one per line'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Please enter some URLs or text to search.');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Please enter some URLs or text to search.');
    expect(send).not.toHaveBeenCalled();
    await user.type(box, 'https://x.com');
    expect(box).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it("all URLs open already: 'All 3 URLs are already open.'", async () => {
    await loadedApp();
    await user.click(screen.getByLabelText('URLs, one per line'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('All 3 URLs are already open.')
    );
    expect(send).not.toHaveBeenCalled();
  });
});

describe('App status after a source change', () => {
  it('Open says "All 3 URLs are already open." again after a source change between two clicks', async () => {
    await loadedApp();
    await user.click(screen.getByLabelText('URLs, one per line'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('All 3 URLs are already open.')
    );
    await user.selectOptions(screen.getByLabelText('From'), 'This tab (1)');
    await user.selectOptions(screen.getByLabelText('From'), 'This window (3)');
    expect(screen.getByRole('status')).toHaveTextContent(
      'List replaced with 3 tabs from this window.'
    );
    await user.click(screen.getByLabelText('URLs, one per line'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByRole('status')).toHaveTextContent(/^All 3 URLs are already open\.$/);
    expect(send).not.toHaveBeenCalled();
  });

  it('Copy says "Nothing to copy." again after a source change between two clicks', async () => {
    await loadedApp([siteTab(1, { active: true }), siteTab(2)]);
    await user.clear(screen.getByRole('textbox'));
    await user.click(screen.getByRole('button', { name: 'Copy 0 as URL' }));
    expect(screen.getByRole('status')).toHaveTextContent(/^Nothing to copy\.$/);
    await user.selectOptions(screen.getByLabelText('From'), 'This tab (1)');
    await user.selectOptions(screen.getByLabelText('From'), 'This window (2)');
    await user.clear(screen.getByRole('textbox'));
    expect(screen.getByRole('status')).toHaveTextContent(
      'List replaced with 2 tabs from this window.'
    );
    await user.click(screen.getByRole('button', { name: 'Copy 0 as URL' }));
    expect(screen.getByRole('status')).toHaveTextContent(/^Nothing to copy\.$/);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('the status node is new when the same result repeats', async () => {
    await loadedApp();
    await user.click(screen.getByLabelText('URLs, one per line'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    const first = await screen.findByText('All 3 URLs are already open.');
    await user.click(screen.getByLabelText('URLs, one per line'));
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByText('All 3 URLs are already open.')).not.toBe(first);
  });
});

describe('App source and status', () => {
  it('a source change replaces the list and its notice replaces an earlier copy status', async () => {
    mockWindows([[siteTab(1, { active: true }), siteTab(2)], [siteTab(3, { windowId: 2 })]]);
    vi.mocked(chrome.tabs.query).mockResolvedValue([]);
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Copy 2 as URL' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Copied 2 as URL.'));
    await user.selectOptions(screen.getByLabelText('From'), 'All windows (3)');
    expect(screen.getByRole('textbox')).toHaveValue(
      'https://site1.com/\nhttps://site2.com/\n\nhttps://site3.com/'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'List replaced with 3 tabs from all windows.'
    );
    expect(screen.getByRole('button', { name: 'Copy 3 as URL' })).toBeInTheDocument();
  });

  it('starts from the clipboard when it holds URLs and says so', async () => {
    (chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    clipboard.readText.mockResolvedValue('https://c1.com\nhttps://c2.com\nhttps://c3.com');
    await loadedApp();
    expect(await screen.findByText('Using 3 URLs from your clipboard.')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveValue('clipboard');
    expect(
      screen.queryByRole('button', { name: 'Turn on clipboard detection' })
    ).not.toBeInTheDocument();
  });
});
