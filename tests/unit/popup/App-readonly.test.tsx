// Unit tests for popup/App.tsx: the list is read-only while an action runs

import { App } from '@/popup/App';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { deferred, mockWindows, siteTab, stubClipboard } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const send = vi.mocked(chrome.runtime.sendMessage);
let user: ReturnType<typeof userEvent.setup>;

/** Builds the service worker reply for the lines that opened. */
function reply(opened: string[]): unknown {
  return {
    status: 'complete',
    results: { successful: opened.length, failed: 0, totalTime: 5, errors: [], opened },
  };
}

/** Renders the popup with three tabs, none of them open in the window, and waits for the list. */
async function loadedApp(): Promise<void> {
  mockWindows([[siteTab(1, { active: true }), siteTab(2), siteTab(3)]]);
  vi.mocked(chrome.tabs.query).mockResolvedValue([]);
  render(<App />);
  await screen.findByRole('button', { name: /^Copy [1-9]/ });
}

beforeEach(() => {
  useFakeStorage();
  // userEvent.setup() installs its own clipboard, so the stub goes in after it.
  user = userEvent.setup();
  stubClipboard();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App list while Open waits', () => {
  it('keeps the list read-only while Open waits, so a reply never overwrites typed text', async () => {
    await loadedApp();
    const gate = deferred<unknown>();
    send.mockReturnValue(gate.promise);
    const box = screen.getByRole('textbox');
    await user.click(box);
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(box).toHaveAttribute('readonly');
    expect(box).toHaveFocus();
    await user.type(box, 'typed meanwhile');
    expect(box).not.toHaveValue(expect.stringContaining('typed meanwhile'));
    gate.resolve(reply(['https://site1.com/']));
    await waitFor(() => expect(box).not.toHaveAttribute('readonly'));
  });
});
