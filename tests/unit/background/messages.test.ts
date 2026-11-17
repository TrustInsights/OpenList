// Unit tests for background/messages.ts

import { handleMessage } from '@/background/messages';
import * as openListModule from '@/background/open-list';
import { describe, expect, it, vi } from 'vitest';

const fakeSender = {} as chrome.runtime.MessageSender;

describe('handleMessage', () => {
  it.each([
    ['an unknown action', { action: 'unknownAction' }],
    ['a payload with no action', { notAnAction: true }],
    ['urls that are not an array', { action: 'openList', urls: 42 }],
    ['urls as a string', { action: 'openList', urls: 'https://example.com' }],
    ['an empty urls array', { action: 'openList', urls: [] }],
    ['a null payload', null],
    ['the removed getMetrics action', { action: 'getMetrics' }],
    ['the removed getCurrentTabUrls action', { action: 'getCurrentTabUrls' }],
  ])('rejects %s with the exact error reply and no zod text', (_name, payload) => {
    const sendResponse = vi.fn();
    const result = handleMessage(payload, fakeSender, sendResponse);

    expect(result).toBe(false);
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ status: 'error', message: 'Unknown action' });
    expect(chrome.tabs.query).not.toHaveBeenCalled();
  });

  describe('"openList" action', () => {
    it('returns true (async) and calls sendResponse with results', async () => {
      const fakeResults = {
        successful: 2,
        failed: 0,
        errors: [],
        opened: ['https://example.com', 'https://test.com'],
      };
      const openListSpy = vi.spyOn(openListModule, 'openList').mockResolvedValue(fakeResults);
      const sendResponse = vi.fn();

      const result = handleMessage(
        { action: 'openList', urls: ['https://example.com', 'https://test.com'] },
        fakeSender,
        sendResponse
      );

      expect(result).toBe(true);
      expect(openListSpy).toHaveBeenCalledWith(['https://example.com', 'https://test.com']);

      // Wait for the async handler to resolve
      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

      expect(sendResponse).toHaveBeenCalledWith({
        status: 'complete',
        results: fakeResults,
      });
      openListSpy.mockRestore();
    });

    it('openList failure → sendResponse with error status', async () => {
      const openListSpy = vi
        .spyOn(openListModule, 'openList')
        .mockRejectedValue(new Error('processing failed'));
      const sendResponse = vi.fn();

      const result = handleMessage(
        { action: 'openList', urls: ['https://example.com'] },
        fakeSender,
        sendResponse
      );

      expect(result).toBe(true);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'error', message: 'processing failed' })
      );
      openListSpy.mockRestore();
    });
  });
});
