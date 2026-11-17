// Opens a list of final URLs in new tabs

import { CONFIG } from '@/schemas/config';
import type { OpenListResult } from '@/schemas/messages';
import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { addTotals } from '@/utils/metrics-store';
import { createTab, sleep } from '@/utils/tabs';

/**
 * Opens each URL in a new tab, in order, and stops at the tab limit.
 * @param urls - The final addresses to open, already parsed and cleaned by the caller
 * @returns Results summary with counts, error details, and the URLs that opened
 */
export async function openList(urls: readonly string[]): Promise<OpenListResult> {
  const results: OpenListResult = {
    successful: 0,
    failed: 0,
    errors: [],
    opened: [],
  };

  logger.info('Processing URL list', { count: urls.length });

  for (let i = 0; i < urls.length; i++) {
    if (results.successful >= CONFIG.MAX_TABS) {
      logger.warn('Maximum tab limit reached', { limit: CONFIG.MAX_TABS });
      break;
    }

    const url = urls[i];
    try {
      await createTab(url);
      results.successful++;
      results.opened.push(url);

      const hasMore = i < urls.length - 1;
      if (hasMore && results.successful < CONFIG.MAX_TABS) {
        await sleep(CONFIG.DELAY_BETWEEN_TABS);
      }
    } catch (err) {
      results.failed++;
      const msg = toErrorMessage(err);
      results.errors.push(`Failed to open ${url}: ${msg}`);
      logger.error('Tab creation failed', { url, error: msg });
    }
  }

  try {
    await addTotals({
      tabsOpened: results.successful,
      tabsFailed: results.failed,
      urlsProcessed: results.successful + results.failed,
    });
  } catch (err) {
    // The counters never change the result: the tabs are open already.
    logger.error('Totals update failed', { error: toErrorMessage(err) });
  }

  logger.info('URL processing complete', { results });
  return results;
}
