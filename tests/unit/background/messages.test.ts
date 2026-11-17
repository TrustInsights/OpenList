// Unit tests for background/messages.ts

import { handleMessage } from '@/background/messages';
import * as openListModule from '@/background/open-list';
import { describe, expect, it, vi } from 'vitest';

const fakeSender = {} as chrome.runtime.MessageSender;

describe('handleMessage', () => {
  it('unknown action → sendResponse({ status: "error" }), returns false', () => {
    const sendResponse = vi.fn();
    const result = handleMessage({ action: 'unknownAction' }, fakeSender, sendResponse);

    expect(result).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('invalid payload (not Zod-valid) → sendResponse({ status: "error" }), returns false', () => {
    const sendResponse = vi.fn();
    const result = handleMessage({ notAnAction: true }, fakeSender, sendResponse);

    expect(result).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  it('invalid message → exact { status: "error", message: "Unknown action" } with no zod text', () => {
    const sendResponse = vi.fn();
    handleMessage({ action: 'openList', urls: 42 }, fakeSender, sendResponse);

    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ status: 'error', message: 'Unknown action' });
  });

  it('null payload → sendResponse({ status: "error" }), returns false', () => {
    const sendResponse = vi.fn();
    const result = handleMessage(null, fakeSender, sendResponse);

    expect(result).toBe(false);
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  describe('"openList" action', () => {
    it('returns true (async) and calls sendResponse with results', async () => {
      const fakeResults = {
        successful: 2,
        failed: 0,
        skipped: 0,
        totalTime: 50,
        errors: [],
        opened: ['https://example.com', 'https://test.com'],
      };
      const openListSpy = vi.spyOn(openListModule, 'openList').mockResolvedValue(fakeResults);
      const sendResponse = vi.fn();

      const result = handleMessage(
        { action: 'openList', urls: 'https://example.com\nhttps://test.com' },
        fakeSender,
        sendResponse
      );

      expect(result).toBe(true);

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
        { action: 'openList', urls: 'https://example.com' },
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

  describe('"getMetrics" action (removed)', () => {
    it('rejects { action: "getMetrics" } as unknown and returns false', () => {
      const sendResponse = vi.fn();
      const result = handleMessage({ action: 'getMetrics' }, fakeSender, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).toHaveBeenCalledTimes(1);
      expect(sendResponse).toHaveBeenCalledWith({ status: 'error', message: 'Unknown action' });
    });
  });

  describe('"getCurrentTabUrls" action (removed)', () => {
    it('rejects { action: "getCurrentTabUrls" } as unknown and returns false', () => {
      const sendResponse = vi.fn();
      const result = handleMessage({ action: 'getCurrentTabUrls' }, fakeSender, sendResponse);

      expect(result).toBe(false);
      expect(sendResponse).toHaveBeenCalledTimes(1);
      expect(sendResponse).toHaveBeenCalledWith({ status: 'error', message: 'Unknown action' });
      expect(chrome.tabs.query).not.toHaveBeenCalled();
    });
  });
});
