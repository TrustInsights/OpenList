// Unit tests for background/feedback.ts

import { clearFeedback, showResult } from '@/background/feedback';
import { logger } from '@/utils/logger';
import { useFakeStorage } from '@tests/helpers/chrome-storage';
import { contrastRatio } from '@tests/helpers/contrast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_TITLE = 'OpenList: open or copy a list of URLs';

describe('showResult', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useFakeStorage();
  });

  afterEach(async () => {
    await clearFeedback();
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

  it('keeps a sticky message after 3000 ms and clears it when clearFeedback runs', async () => {
    await showResult(
      'Open OpenList and press "Turn on clipboard detection" once to turn on copying.',
      false,
      true
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '' });

    await clearFeedback();
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ title: DEFAULT_TITLE });
  });

  it('gives the icon back to the sticky message when a short result ends', async () => {
    const hint = 'Open OpenList and press "Turn on clipboard detection" once to turn on copying.';
    await showResult(hint, false, true);
    await showResult('Opened 1.', true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ title: hint });
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '!' });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '' });
  });

  it('keeps the sticky message when the service worker restarts before a short result ends', async () => {
    const hint = 'Open OpenList and press "Turn on clipboard detection" once to turn on copying.';
    await showResult(hint, false, true);
    vi.resetModules();
    const restarted = await import('@/background/feedback');

    await restarted.showResult('Opened 1.', true);
    await vi.advanceTimersByTimeAsync(3000);

    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ title: hint });
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '!' });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '' });
  });

  it('logs an error and does not reject when clearFeedback cannot forget the sticky message', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    vi.mocked(chrome.storage.session.remove).mockRejectedValueOnce(new Error('session gone'));

    await expect(clearFeedback()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith('Feedback reset failed', { error: 'session gone' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('logs an error and rests when the sticky message cannot be read', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await showResult('Opened 1.', true);
    vi.mocked(chrome.storage.session.get).mockRejectedValueOnce(new Error('session gone'));

    await vi.advanceTimersByTimeAsync(3000);

    expect(error).toHaveBeenCalledWith('Feedback restore failed', { error: 'session gone' });
  });

  it('rests after a short result once clearFeedback has forgotten the sticky message', async () => {
    await showResult('hint', false, true);
    await clearFeedback();
    await showResult('Opened 1.', true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' });
    expect(chrome.action.setTitle).toHaveBeenLastCalledWith({ title: DEFAULT_TITLE });
  });

  it('logs an error and does not reject when the sticky message cannot come back', async () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    await showResult('hint', false, true);
    await showResult('Opened 1.', true);
    vi.mocked(chrome.action.setTitle).mockRejectedValueOnce(new Error('gone'));
    await vi.advanceTimersByTimeAsync(3000);
    expect(error).toHaveBeenCalledWith('Feedback restore failed', { error: 'gone' });
  });

  it('cancels the timer of an earlier message when a sticky message follows', async () => {
    await showResult('Copied 3 as URL.', true);
    await showResult(
      'Open OpenList and press "Turn on clipboard detection" once to turn on copying.',
      false,
      true
    );
    await vi.advanceTimersByTimeAsync(10_000);
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: '' });
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
