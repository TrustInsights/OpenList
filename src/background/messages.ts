// Runtime message validation and dispatch for the service worker

import { openList } from '@/background/open-list';
import { OpenListMessageSchema } from '@/schemas/messages';
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
  const parsed = OpenListMessageSchema.safeParse(request);

  if (!parsed.success) {
    logger.warn('Unknown or invalid message', { error: parsed.error.message });
    sendResponse({ status: 'error', message: 'Unknown action' });
    return false;
  }

  const { urls } = parsed.data;

  const run = async (): Promise<void> => {
    try {
      const results = await openList(urls);
      sendResponse({ status: 'complete', results });
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      logger.error('Error processing URL list', { error: message });
      sendResponse({ status: 'error', message });
    }
  };
  void run();
  return true;
}
