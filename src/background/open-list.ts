// Opens a list of URLs and search terms in new tabs

import { CONFIG } from '@/schemas/config';
import type { OpenListResult } from '@/types';
import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { addTotals } from '@/utils/metrics-store';
import { createTab, sleep } from '@/utils/tabs';
import { isProbablyUrl, sanitizeUrl } from '@/utils/urls';

/**
 * Processes a newline-separated string of URLs/search terms and opens each in a new tab.
 * @param list - Raw text input, one URL or search term per line
 * @returns Results summary with counts and error details
 */
export async function openList(list: string): Promise<OpenListResult> {
  const startTime = performance.now();
  const results: OpenListResult = {
    successful: 0,
    failed: 0,
    skipped: 0,
    totalTime: 0,
    errors: [],
    opened: [],
  };

  const lines = list.split(/\r\n|\r|\n/);
  logger.info('Processing URL list', { count: lines.length });

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      results.skipped++;
      continue;
    }

    if (results.successful >= CONFIG.MAX_TABS) {
      logger.warn('Maximum tab limit reached', { limit: CONFIG.MAX_TABS });
      break;
    }

    try {
      const url = isProbablyUrl(trimmed)
        ? sanitizeUrl(trimmed)
        : `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;

      if (!url) {
        results.failed++;
        results.errors.push(`Invalid URL: ${trimmed}`);
        continue;
      }

      await createTab(url);
      results.successful++;
      results.opened.push(trimmed);

      const hasMore = i < lines.length - 1;
      if (hasMore && results.successful < CONFIG.MAX_TABS) {
        await sleep(CONFIG.DELAY_BETWEEN_TABS);
      }
    } catch (err) {
      results.failed++;
      const msg = toErrorMessage(err);
      results.errors.push(`Failed to open ${trimmed}: ${msg}`);
      logger.error('Tab creation failed', { url: trimmed, error: msg });
    }
  }

  await addTotals({
    tabsOpened: results.successful,
    tabsFailed: results.failed,
    urlsProcessed: results.successful + results.failed,
  });

  results.totalTime = performance.now() - startTime;

  logger.info('URL processing complete', { results });
  return results;
}
