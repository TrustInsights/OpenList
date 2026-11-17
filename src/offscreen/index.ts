// Offscreen page: writes the copied list to the clipboard for the service worker

import { OffscreenCopyMessageSchema } from '@/schemas/messages';
import { writeClipboard } from '@/utils/clipboard';
import { toErrorMessage } from '@/utils/errors';
import type { ClipboardPayload } from '@/utils/formatters';

/**
 * Copies with the old copy command when the async clipboard API refuses, as it does
 * for a page that has no focus. A copy event handler puts both flavors on the clipboard.
 * @param payload - The text and the optional HTML flavor
 * @returns A promise that resolves after the copy and rejects when the command fails
 */
async function copyWithCommand(payload: ClipboardPayload): Promise<void> {
  const field = document.createElement('textarea');
  field.value = payload.text;
  field.setAttribute('aria-hidden', 'true');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  const onCopy = (event: ClipboardEvent): void => {
    event.clipboardData?.setData('text/plain', payload.text);
    if (payload.html !== undefined) event.clipboardData?.setData('text/html', payload.html);
    event.preventDefault();
  };
  document.addEventListener('copy', onCopy);
  try {
    field.select();
    if (!document.execCommand('copy')) throw new Error('The copy command failed.');
  } finally {
    document.removeEventListener('copy', onCopy);
    field.remove();
  }
}

/**
 * Handles a runtime message. It writes only a valid message for the offscreen target and ignores every other message.
 * @param message - The raw message
 * @param _sender - The sender (unused)
 * @param sendResponse - Sends { ok: true } or { ok: false, error }
 * @returns True when the answer comes later, false for a message it ignores
 */
export function handleOffscreenMessage(
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  const parsed = OffscreenCopyMessageSchema.safeParse(message);
  if (!parsed.success) return false;
  const { payload } = parsed.data;
  const run = async (): Promise<void> => {
    try {
      try {
        await writeClipboard(payload);
      } catch {
        await copyWithCommand(payload);
      }
      sendResponse({ ok: true });
    } catch (err) {
      sendResponse({ ok: false, error: toErrorMessage(err) });
    }
  };
  void run();
  return true;
}

chrome.runtime.onMessage.addListener(handleOffscreenMessage);
