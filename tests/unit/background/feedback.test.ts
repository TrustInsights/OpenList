// Unit tests for background/feedback.ts

import { showResult } from '@/background/feedback';
import { logger } from '@/utils/logger';
import { contrastRatio } from '@tests/helpers/contrast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_TITLE = 'OpenList: open or copy a list of URLs';

describe('showResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sets a check mark badge, white text, and the message as the title for a success', async () => {
    await showResult('Copied 3 as Markdown.', true);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#0b57d0' });
    expect(chrome.action.setBadgeTextColor).toHaveBeenCalledWith({ color: '#ffffff' });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Copied 3 as Markdown.' });
  });

  it('sets an exclamation mark on the error color for a failure', async () => {
    await showResult('Nothing to copy.', false);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '!' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#b3261e' });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Nothing to copy.' });
  });

  it('keeps the badge text at 4.5:1 or more against both badge backgrounds', async () => {
    await showResult('ok', true);
    await showResult('bad', false);

    const textColor = vi.mocked(chrome.action.setBadgeTextColor).mock.calls[0][0].color as string;
    const colors = vi
      .mocked(chrome.action.setBadgeBackgroundColor)
      .mock.calls.map((call) => call[0].color as string);
    expect(colors).toHaveLength(2);
    for (const background of colors) {
      expect(contrastRatio(textColor, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('clears the badge and resets the title after 3000 ms, not before', async () => {
    await showResult('Copied 3 as Markdown.', true);
    vi.mocked(chrome.action.setBadgeText).mockClear();
    vi.mocked(chrome.action.setTitle).mockClear();

    await vi.advanceTimersByTimeAsync(2999);
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
    expect(chrome.action.setTitle).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: DEFAULT_TITLE });
  });

  it('lets a second result keep its full 3000 ms', async () => {
    await showResult('first', true);
    await vi.advanceTimersByTimeAsync(2000);
    await showResult('second', true);
    vi.mocked(chrome.action.setBadgeText).mockClear();

    await vi.advanceTimersByTimeAsync(2999);
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(chrome.action.setBadgeText).toHaveBeenCalledTimes(1);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('resets to an empty title when the manifest has no default title', async () => {
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({
      version: '1.1.0',
    } as chrome.runtime.Manifest);
    await showResult('Copied 1 as URL.', true);

    await vi.advanceTimersByTimeAsync(3000);

    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ title: '' });
  });

  it('logs a failed reset and does not reject', async () => {
    const errorLog = vi.spyOn(logger, 'error');
    await showResult('Copied 1 as URL.', true);
    vi.mocked(chrome.action.setBadgeText).mockRejectedValue(new Error('action gone'));

    await vi.advanceTimersByTimeAsync(3000);

    expect(errorLog).toHaveBeenCalledWith('Feedback reset failed', { error: 'action gone' });
  });
});
