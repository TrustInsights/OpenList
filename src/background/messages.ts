// Message handler dispatch — validates with Zod then routes to handlers

import { getMetrics, getSwState } from '@/background/metrics';
import { openList } from '@/background/open-list';
import { IncomingMessageSchema } from '@/schemas/messages';
import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';

type SendResponse = (response: unknown) => void;

/**
 * Handles a Chrome runtime message, validates it, and dispatches to the correct handler.
 * @param request - Raw message payload
 * @param _sender - Message sender (unused)
 * @param sendResponse - Callback to send a response
 * @returns true if the response will be sent asynchronously
 */
export function handleMessage(
  request: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: SendResponse
): boolean {
  const parsed = IncomingMessageSchema.safeParse(request);

  if (!parsed.success) {
    logger.warn('Unknown or invalid message', { error: parsed.error.message });
    sendResponse({ status: 'error', message: 'Unknown action' });
    return false;
  }

  const msg = parsed.data;

  if (msg.action === 'openList') {
    openList(msg.urls)
      .then((results) => sendResponse({ status: 'complete', results }))
      .catch((err: unknown) => {
        const message = toErrorMessage(err);
        logger.error('Error processing URL list', { error: message });
        sendResponse({ status: 'error', message, details: 'Failed to process URLs' });
      });
    return true;
  }

  if (msg.action === 'getMetrics') {
    Promise.all([getMetrics(), getSwState()])
      .then(([metrics, swState]) => {
        sendResponse({
          metrics,
          serviceWorkerState: swState,
          uptime: Date.now() - metrics.startTime,
        });
      })
      .catch((err: unknown) => {
        const message = toErrorMessage(err);
        sendResponse({ status: 'error', message });
      });
    return true;
  }

  // msg.action === 'getCurrentTabUrls' (exhaustive — discriminated union)
  chrome.tabs
    .query({ currentWindow: true })
    .then((tabs) => sendResponse(tabs.map((t) => t.url).filter(Boolean)))
    .catch((err: unknown) => {
      const message = toErrorMessage(err);
      logger.error('Error fetching current tab URLs', { error: message });
      sendResponse([]);
    });
  return true;
}
