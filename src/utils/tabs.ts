import { logger } from '@/utils/logger';

const RETRY_DELAY_MS = 500;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new background tab for the given URL, retrying on failure.
 * @param url - The URL to open
 * @param retries - Number of retry attempts (default 2)
 * @returns The created Chrome tab
 */
export async function createTab(url: string, retries = 2): Promise<chrome.tabs.Tab> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await chrome.tabs.create({ url, active: false });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * (attempt + 1);
        logger.warn('Tab creation failed, retrying', { url, attempt, delay });
        await sleep(delay);
      }
    }
  }
  throw lastError;
}
