// Tab creation and sleep helpers

import { logger } from '@/utils/logger';

const RETRY_DELAY_MS = 500;
const TAB_RETRIES = 2;

/**
 * Waits for a fixed time.
 * @param ms - Delay in milliseconds
 * @returns A promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new background tab for the given URL, retrying on failure.
 * @param url - The URL to open
 * @returns The created Chrome tab
 */
export async function createTab(url: string): Promise<chrome.tabs.Tab> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TAB_RETRIES; attempt++) {
    try {
      return await chrome.tabs.create({ url, active: false });
    } catch (err) {
      lastError = err;
      if (attempt < TAB_RETRIES) {
        const delay = RETRY_DELAY_MS * (attempt + 1);
        logger.warn('Tab creation failed, retrying', { url, attempt, delay });
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
