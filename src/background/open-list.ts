// URL list processing — opens each URL in a background tab

import { incrementMetric } from '@/background/metrics';
import { CONFIG } from '@/schemas/config';
import type { OpenListResult } from '@/types';
import { logger } from '@/utils/logger';
import { createTab } from '@/utils/tabs';
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
  };

  const lines = list.split(/\r\n|\r|\n/);
  logger.info('Processing URL list', { count: lines.length });

  let opened = 0;

  for (const raw of lines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      results.skipped++;
      continue;
    }

    if (opened >= CONFIG.MAX_TABS) {
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
      opened++;
      await incrementMetric('tabsOpened');

      if (opened < lines.length) {
        await new Promise<void>((resolve) => setTimeout(resolve, CONFIG.DELAY_BETWEEN_TABS));
      }
    } catch (err) {
      results.failed++;
      await incrementMetric('tabsFailed');
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`Failed to open ${trimmed}: ${msg}`);
      logger.error('Tab creation failed', { url: trimmed, error: msg });
    }
  }

  await incrementMetric('urlsProcessed', lines.length);
  results.totalTime = performance.now() - startTime;

  logger.info('URL processing complete', { results });
  return results;
}
