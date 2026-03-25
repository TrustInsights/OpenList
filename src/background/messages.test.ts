// Unit tests for background/messages.ts

import { handleMessage } from '@/background/messages';
import * as metricsModule from '@/background/metrics';
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

  describe('"getMetrics" action', () => {
    it('returns true (async) and calls sendResponse with metrics', async () => {
      const fakeMetrics = {
        tabsOpened: 5,
        tabsFailed: 1,
        urlsProcessed: 6,
        lastError: null,
        startTime: 1000,
        lastOperation: null,
      };
      const fakeSwState = {
        installTime: null,
        activationTime: null,
        restarts: 0,
        lastContextMenuCreation: null,
      };
      const getMetricsSpy = vi.spyOn(metricsModule, 'getMetrics').mockResolvedValue(fakeMetrics);
      const getSwStateSpy = vi.spyOn(metricsModule, 'getSwState').mockResolvedValue(fakeSwState);

      const sendResponse = vi.fn();

      const result = handleMessage({ action: 'getMetrics' }, fakeSender, sendResponse);

      expect(result).toBe(true);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          metrics: fakeMetrics,
          serviceWorkerState: fakeSwState,
          uptime: expect.any(Number),
        })
      );

      getMetricsSpy.mockRestore();
      getSwStateSpy.mockRestore();
    });

    it('getMetrics failure → sendResponse with error status', async () => {
      const getMetricsSpy = vi
        .spyOn(metricsModule, 'getMetrics')
        .mockRejectedValue(new Error('storage error'));
      const getSwStateSpy = vi
        .spyOn(metricsModule, 'getSwState')
        .mockRejectedValue(new Error('storage error'));
      const sendResponse = vi.fn();

      handleMessage({ action: 'getMetrics' }, fakeSender, sendResponse);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

      expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

      getMetricsSpy.mockRestore();
      getSwStateSpy.mockRestore();
    });
  });

  describe('"getCurrentTabUrls" action', () => {
    it('returns true (async) and calls sendResponse with URL array', async () => {
      const fakeTabs = [
        { url: 'https://example.com', id: 1 },
        { url: 'https://test.com', id: 2 },
        { id: 3 }, // tab without url
      ];
      chrome.tabs.query = vi.fn().mockResolvedValue(fakeTabs);
      const sendResponse = vi.fn();

      const result = handleMessage({ action: 'getCurrentTabUrls' }, fakeSender, sendResponse);

      expect(result).toBe(true);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

      // Only tabs with URLs are included
      expect(sendResponse).toHaveBeenCalledWith(['https://example.com', 'https://test.com']);
    });

    it('getCurrentTabUrls chrome.tabs.query failure → sendResponse([])', async () => {
      chrome.tabs.query = vi.fn().mockRejectedValue(new Error('tabs query failed'));
      const sendResponse = vi.fn();

      handleMessage({ action: 'getCurrentTabUrls' }, fakeSender, sendResponse);

      await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled());

      expect(sendResponse).toHaveBeenCalledWith([]);
    });
  });
});
