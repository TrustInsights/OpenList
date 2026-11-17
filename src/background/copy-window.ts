// Copies this window's tabs in the remembered format, without the popup, through an offscreen document

import { showResult } from '@/background/feedback';
import { OffscreenReplySchema } from '@/schemas/messages';
import { hasClipboardPermission } from '@/utils/clipboard';
import { toErrorMessage } from '@/utils/errors';
import { formatTabs } from '@/utils/formatters';
import type { ClipboardPayload } from '@/utils/formatters';
import { logger } from '@/utils/logger';
import { getFormat } from '@/utils/settings-store';
import { loadTabs } from '@/utils/tabs-source';

/** The offscreen page path inside the built extension. */
const OFFSCREEN_PATH = 'offscreen/index.html';

/** The toolbar text when the user did not yet grant the clipboard permissions in the popup. */
const NEEDS_PERMISSION = 'Open OpenList once to turn on copying.';

/** The text Chrome uses when an offscreen document is already open. */
const SINGLE_DOCUMENT_ERROR = 'Only a single offscreen document may be created';

/**
 * Opens the offscreen document, or reuses the open one.
 * @returns A promise that resolves when a document is open
 */
async function ensureOffscreenDocument(): Promise<void> {
  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL(OFFSCREEN_PATH),
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: 'Write the copied list of tabs to the clipboard',
    });
  } catch (err) {
    if (!toErrorMessage(err).includes(SINGLE_DOCUMENT_ERROR)) throw err;
  }
}

/**
 * Closes the offscreen document. A failure is logged, never thrown.
 * @returns A promise that resolves when the close ends
 */
async function closeOffscreenDocument(): Promise<void> {
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    logger.error('Offscreen close failed', { error: toErrorMessage(err) });
  }
}

/**
 * Sends the payload to the offscreen page and waits for its answer. The document closes after the write.
 * @param payload - The text and the optional HTML flavor
 * @returns A promise that resolves after the write and rejects with the failure text
 */
async function writeThroughOffscreen(payload: ClipboardPayload): Promise<void> {
  await ensureOffscreenDocument();
  try {
    const reply = OffscreenReplySchema.safeParse(
      await chrome.runtime.sendMessage({ target: 'offscreen', type: 'copy', payload })
    );
    if (!reply.success) throw new Error('The clipboard page did not answer.');
    if (!reply.data.ok) throw new Error(reply.data.error);
  } finally {
    await closeOffscreenDocument();
  }
}

/**
 * Copies the tabs of this window in the remembered format and shows the result on the toolbar icon.
 * It applies the same filters as the popup. Never rejects.
 * @returns A promise that resolves when the copy and the feedback end
 */
export async function copyWindowTabs(): Promise<void> {
  let message: string;
  let ok = true;
  try {
    const [format, loaded, allowed] = await Promise.all([
      getFormat(),
      loadTabs(),
      hasClipboardPermission(),
    ]);
    if (!allowed) {
      message = NEEDS_PERMISSION;
      ok = false;
    } else if (loaded.window.length === 0) {
      message = 'Nothing to copy.';
      ok = false;
    } else {
      await writeThroughOffscreen(formatTabs(format, [loaded.window]));
      message = `Copied ${loaded.window.length} as ${format}.`;
    }
  } catch (err) {
    message = toErrorMessage(err);
    ok = false;
    logger.error('Copy of this window failed', { error: message });
  }
  try {
    await showResult(message, ok);
  } catch (err) {
    logger.error('Feedback failed', { error: toErrorMessage(err) });
  }
}
