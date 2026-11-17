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
 * Key of the sticky message in session storage. The message waits for the user to act and a short result
 * shows over it. It lives in storage because Chrome ends an idle service worker, but the title and the badge stay.
 */
const STICKY_KEY = 'stickyMessage';

/**
 * Paints the badge and the title.
 * @param message - The title text.
 * @param ok - True for the success badge, false for the failure badge.
 * @returns A promise that resolves when the badge and the title are set.
 */
async function paint(message: string, ok: boolean): Promise<void> {
  await Promise.all([
    chrome.action.setBadgeText({ text: ok ? '✓' : '!' }),
    chrome.action.setBadgeBackgroundColor({ color: ok ? SUCCESS_COLOR : FAILURE_COLOR }),
    chrome.action.setBadgeTextColor({ color: BADGE_TEXT_COLOR }),
    chrome.action.setTitle({ title: message }),
  ]);
}

/**
 * Sets the badge and the title back to rest. Never rejects.
 * @returns A promise that resolves when the reset ends
 */
async function rest(): Promise<void> {
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
 * Ends the feedback: forgets the sticky message and returns the badge and the title to rest. Run it
 * when the user grants the permission that the sticky message asked for. Never rejects.
 * @returns A promise that resolves when the reset ends
 */
export async function clearFeedback(): Promise<void> {
  clearTimeout(resetTimer);
  try {
    await chrome.storage.session.remove(STICKY_KEY);
  } catch (err) {
    logger.error('Feedback reset failed', { error: toErrorMessage(err) });
  }
  await rest();
}

/**
 * Ends a short result. A sticky message that still waits for the user comes back. Otherwise the icon rests.
 * @returns A promise that resolves when the badge and the title are set
 */
async function endShortResult(): Promise<void> {
  try {
    const sticky = (await chrome.storage.session.get(STICKY_KEY))[STICKY_KEY];
    if (typeof sticky !== 'string') {
      await rest();
      return;
    }
    await paint(sticky, false);
  } catch (err) {
    logger.error('Feedback restore failed', { error: toErrorMessage(err) });
  }
}

/**
 * Shows the result of a copy on the toolbar icon. The badge shows a mark. The title carries the
 * message because a screen reader does not announce a badge. Both clear after 3000 ms, unless the message is
 * sticky. A sticky message stays until clearFeedback runs (for example when the user grants a permission).
 * A short result that shows while a sticky message waits gives the icon back to the sticky message when it ends.
 * @param message - The result text
 * @param ok - True for success, false for a failure
 * @param sticky - True to keep the message until clearFeedback runs
 * @returns A promise that resolves when the badge and the title are set
 */
export async function showResult(message: string, ok: boolean, sticky = false): Promise<void> {
  clearTimeout(resetTimer);
  await paint(message, ok);
  if (sticky) {
    await chrome.storage.session.set({ [STICKY_KEY]: message });
    return;
  }
  resetTimer = setTimeout(() => {
    void endShortResult();
  }, FEEDBACK_MS);
}
