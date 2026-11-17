// Service worker lifecycle handlers that never reject

import { initializeContextMenu } from '@/background/context-menu';
import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { markSessionStart } from '@/utils/metrics-store';

/**
 * Runs one lifecycle step and logs a failure instead of throwing.
 * @param step - The async work to run
 * @returns A promise that always resolves
 */
async function runStep(step: () => Promise<void>): Promise<void> {
  try {
    await step();
  } catch (err) {
    logger.error('Lifecycle handler failed', { error: toErrorMessage(err) });
  }
}

/**
 * Handles chrome.runtime.onInstalled. Saves the session start, then creates the context menu. A failed step is logged, not thrown.
 * @returns A promise that always resolves
 */
export async function handleInstalled(): Promise<void> {
  await runStep(async () => {
    await markSessionStart();
    logger.info('Extension installed/updated');
  });
  await runStep(initializeContextMenu);
}

/**
 * Handles chrome.runtime.onStartup. Saves the session start, then creates the context menu. A failed step is logged, not thrown.
 * @returns A promise that always resolves
 */
export async function handleStartup(): Promise<void> {
  await runStep(async () => {
    await markSessionStart();
    logger.info('Service worker started');
  });
  await runStep(initializeContextMenu);
}
