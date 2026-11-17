// Unit tests for popup/App.tsx: first render, layout, and failure handling

import * as sourcesModule from '@/hooks/useSources';
import { App } from '@/popup/App';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { chromeTab } from '@tests/helpers/chrome-tabs';
import { type ClipboardStub, mockWindows, siteTab, stubClipboard } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';

const THREE = [siteTab(1, { active: true }), siteTab(2), siteTab(3)];

/** Sets one window with these tabs, all of them open. */
function useTabs(tabs: chrome.tabs.Tab[]): void {
  mockWindows([tabs]);
  vi.mocked(chrome.tabs.query).mockResolvedValue(tabs);
}

/** Renders the popup and waits until the tabs are loaded into the list. */
async function loadedApp(): Promise<void> {
  render(<App />);
  await screen.findByRole('button', { name: /^Copy [1-9]/ });
}

let clipboard: ClipboardStub;

beforeEach(() => {
  useFakeStorage();
  clipboard = stubClipboard();
  useTabs(THREE);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('App first render', () => {
  it('has the h1, the labelled list, and no accessibility violations', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Copy 3 as URL' });
    expect(screen.getByRole('heading', { level: 1, name: 'OpenList' })).toBeInTheDocument();
    expect(screen.getByLabelText('URLs, one per line')).toHaveValue(
      'https://site1.com/\nhttps://site2.com/\nhttps://site3.com/'
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("with 3 tabs mocked, shows 'Open 0 URLs' (all open), 'Copy 3 as URL', and the example line", async () => {
    await loadedApp();
    expect(screen.getByRole('button', { name: 'Open 0 URLs' })).toHaveClass('btn-open');
    expect(screen.getByRole('button', { name: 'Copy 3 as URL' })).toHaveClass('btn-copy');
    expect(screen.getByLabelText('Copy as')).toHaveAccessibleDescription(
      'Example: https://site1.com/'
    );
  });

  it('focuses the list with all text selected and starts at This window (3)', async () => {
    await loadedApp();
    const box = screen.getByRole<HTMLTextAreaElement>('textbox');
    expect(box).toHaveFocus();
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe(box.value.length);
    expect(screen.getByLabelText('From')).toHaveValue('window');
    expect(screen.getByRole('option', { name: 'This window (3)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Copy as')).toHaveValue('URL');
  });

  it('keeps Details closed and shows an empty status line', async () => {
    const { container } = render(<App />);
    await screen.findByRole('button', { name: 'Copy 3 as URL' });
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('follows the layout order of the design when a user tabs through it', async () => {
    (chrome.permissions.contains as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    await loadedApp();
    const user = userEvent.setup();
    const seen: string[] = [];
    for (let step = 0; step < 5; step += 1) {
      const active = document.activeElement;
      seen.push(active?.getAttribute('id') ?? active?.textContent ?? '');
      await user.tab();
    }
    expect(seen).toEqual(['list', 'source', 'Open 0 URLs', 'Copy 3 as URL', 'format']);
    // happy-dom does not skip the closed Details content, so the rest is checked by document order.
    const summary = screen.getByText('Details', { selector: 'summary' });
    const link = screen.getByRole('link');
    const follows = (first: Element, second: Element): boolean =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(screen.getByLabelText('Copy as'), summary)).toBe(true);
    expect(follows(summary, link)).toBe(true);
  });

  it('sets no setInterval', async () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    render(<App />);
    await act(async () => {
      for (let tick = 0; tick < 20; tick += 1) await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Copy 3 as URL' })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('App with a window that has no usable tabs', () => {
  it("shows 'Open 0 URLs' filled and 'Nothing to copy.' on Copy click", async () => {
    useTabs([
      chromeTab({ url: 'chrome://newtab/', id: 1, active: true }),
      chromeTab({ id: 2, url: 'about:blank' }),
    ]);
    render(<App />);
    const user = userEvent.setup();
    const open = await screen.findByRole('button', { name: 'Open 0 URLs' });
    expect(open).toHaveClass('btn-open');
    expect(screen.getByRole('textbox')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Copy 0 as URL' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Nothing to copy.'));
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });
});

describe('App failure handling', () => {
  it('shows a notice when the tabs cannot be read', async () => {
    vi.mocked(chrome.windows.getAll).mockRejectedValue(new Error('no windows'));
    render(<App />);
    expect(await screen.findByText('Could not read your open tabs.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Could not read your open tabs.');
  });

  it('renders the error boundary text when a hook throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(sourcesModule, 'useSources').mockImplementation(() => {
      throw new Error('render crash');
    });
    render(<App />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
