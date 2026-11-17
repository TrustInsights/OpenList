// Unit tests for popup/App.tsx: the Details section and the clipboard button

import { App } from '@/popup/App';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FakeStorage, useFakeStorage } from '@tests/helpers/chrome-storage';
import { mockWindows, siteTab, stubClipboard } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const THREE = [siteTab(1, { active: true }), siteTab(2), siteTab(3)];
let storage: FakeStorage;
let user: ReturnType<typeof userEvent.setup>;

/** Renders the popup with one window and waits for the list to load. */
async function loadedApp(): Promise<void> {
  mockWindows([THREE]);
  vi.mocked(chrome.tabs.query).mockResolvedValue(
    THREE.map((tab) => ({ url: tab.url }) as chrome.tabs.Tab)
  );
  render(<App />);
  await screen.findByRole('button', { name: /^Copy [1-9]/ });
}

beforeEach(() => {
  storage = useFakeStorage();
  // userEvent.setup() installs its own clipboard, so the stub goes in after it.
  user = userEvent.setup();
  stubClipboard();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App Details', () => {
  it('shows the totals and the Refresh button reads them again', async () => {
    storage.local.totals = { tabsOpened: 5, tabsFailed: 1, urlsProcessed: 6 };
    storage.session.openSince = new Date(2026, 10, 16, 9, 41).getTime();
    await loadedApp();
    const rate = screen.getByText('Success rate', { selector: 'dt' }).parentElement;
    await waitFor(() => expect(rate).toHaveTextContent('83.3%'));
    storage.local.totals = { tabsOpened: 6, tabsFailed: 1, urlsProcessed: 6 };
    const refresh = screen.getByRole('button', { name: 'Refresh', hidden: true });
    await user.click(refresh);
    await waitFor(() => expect(rate).toHaveTextContent('100%'));
    expect(screen.getByText('Errors', { selector: 'dt' }).parentElement).toHaveTextContent('1');
  });
});

describe('App clipboard button', () => {
  it('shows the button, and a grant removes it', async () => {
    (chrome.permissions.request as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    await loadedApp();
    const turnOn = await screen.findByRole('button', { name: 'Turn on clipboard detection' });
    expect(turnOn.closest('details')).toBeNull();
    await user.click(turnOn);
    expect(chrome.permissions.request).toHaveBeenCalledWith({
      permissions: ['clipboardRead', 'clipboardWrite'],
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Turn on clipboard detection' })
      ).not.toBeInTheDocument()
    );
  });

  it("'Not now' moves the button into Details and remembers it", async () => {
    await loadedApp();
    await user.click(await screen.findByRole('button', { name: 'Not now' }));
    const turnOn = await screen.findByRole('button', {
      name: 'Turn on clipboard detection',
      hidden: true,
    });
    expect(turnOn.closest('details')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Not now', hidden: true })).not.toBeInTheDocument();
    await waitFor(() => expect(storage.local.clipboardPromptDismissed).toBe(true));
  });

  it('moves the button into Details while Details is open and back when it closes', async () => {
    await loadedApp();
    const summary = screen.getByText('Details', { selector: 'summary' });
    const details = summary.closest('details') as HTMLDetailsElement;
    const turnOnName = { name: 'Turn on clipboard detection', hidden: true };
    expect((await screen.findByRole('button', turnOnName)).closest('details')).toBeNull();

    details.open = true;
    await waitFor(() =>
      expect(screen.getByRole('button', turnOnName).closest('details')).toBe(details)
    );
    // Inside Details the button has no "Not now" partner.
    expect(screen.queryByRole('button', { name: 'Not now', hidden: true })).not.toBeInTheDocument();

    details.open = false;
    await waitFor(() =>
      expect(screen.getByRole('button', turnOnName).closest('details')).toBeNull()
    );
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('starts in Details when a dismissal was saved', async () => {
    storage.local.clipboardPromptDismissed = true;
    await loadedApp();
    const turnOn = await screen.findByRole('button', {
      name: 'Turn on clipboard detection',
      hidden: true,
    });
    expect(turnOn.closest('details')).not.toBeNull();
  });
  it('a grant from the button in Details removes it', async () => {
    storage.local.clipboardPromptDismissed = true;
    (chrome.permissions.request as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    await loadedApp();
    const turnOn = await screen.findByRole('button', {
      name: 'Turn on clipboard detection',
      hidden: true,
    });
    await user.click(turnOn);
    expect(chrome.permissions.request).toHaveBeenCalledWith({
      permissions: ['clipboardRead', 'clipboardWrite'],
    });
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Turn on clipboard detection', hidden: true })
      ).not.toBeInTheDocument()
    );
  });
});
