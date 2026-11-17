// Toolbar feedback: a badge and a title that tell the user the result of a copy without the popup

import { toErrorMessage } from '@/utils/errors';
import { logger } from '@/utils/logger';

/** How long the badge and the title show the result, in milliseconds. */
const FEEDBACK_MS = 3000;

/** Badge background for success and for failure, with white text. Both pass 4.5:1 with the text. */
const SUCCESS_COLOR = '#0b57d0';
const FAILURE_COLOR = '#b3261e';
const BADGE_TEXT_COLOR = '#ffffff';

/** The pending reset, so a second result never loses its feedback to the first timer. */
let resetTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Clears the badge and sets the title back to the manifest title. Never rejects.
 * @returns A promise that resolves when the reset ends
 */
export async function clearFeedback(): Promise<void> {
  try {
    await Promise.all([
      chrome.action.setBadgeText({ text: '' }),
      chrome.action.setTitle({ title: chrome.runtime.getManifest().action?.default_title ?? '' }),
    ]);
  } catch (err) {
    logger.error('Feedback reset failed', { error: toErrorMessage(err) });
  }
}

/**
 * Shows the result of a copy on the toolbar icon. The badge shows a mark. The title carries the
 * message because a screen reader does not announce a badge. Both clear after 3000 ms, unless the message is
 * sticky. A sticky message stays until clearFeedback runs (for example when the user grants a permission).
 * @param message - The result text
 * @param ok - True for success, false for a failure
 * @param sticky - True to keep the message until clearFeedback runs
 * @returns A promise that resolves when the badge and the title are set
 */
export async function showResult(message: string, ok: boolean, sticky = false): Promise<void> {
  clearTimeout(resetTimer);
  await Promise.all([
    chrome.action.setBadgeText({ text: ok ? '✓' : '!' }),
    chrome.action.setBadgeBackgroundColor({ color: ok ? SUCCESS_COLOR : FAILURE_COLOR }),
    chrome.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR }),
    chrome.action.setTitle({ title: message }),
  ]);
  if (sticky) return;
  resetTimer = setTimeout(() => {
    void clearFeedback();
  }, FEEDBACK_MS);
}
