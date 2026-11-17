// Clipboard helpers: optional read permission, read of URLs, and plain or rich writes

import { webAddresses } from '@/utils/extract-urls';
import type { ClipboardPayload } from '@/utils/formatters';

/**
 * The optional permissions behind the clipboard features: reading a copied list in the popup,
 * and writing the copied tabs from the offscreen page. One prompt asks for both.
 */
const CLIPBOARD_PERMISSIONS: chrome.permissions.Permissions = {
  permissions: ['clipboardRead', 'clipboardWrite'],
};

/** Clipboard text longer than this is ignored without parsing. */
const MAX_READ_LENGTH = 1_000_000;

/**
 * Checks whether the user granted both optional clipboard permissions.
 * @returns True when both permissions are granted
 */
export async function hasClipboardPermission(): Promise<boolean> {
  return chrome.permissions.contains(CLIPBOARD_PERMISSIONS);
}

/**
 * Asks the user for both optional clipboard permissions. Call it from a click handler.
 * @returns True when the user grants the permissions
 */
export async function requestClipboardPermission(): Promise<boolean> {
  return chrome.permissions.request(CLIPBOARD_PERMISSIONS);
}

/**
 * Reads the clipboard text and returns the web addresses in it. The text is never stored or logged.
 * @returns The http and https URLs, or null when the permission is missing, the read fails, or the text is over 1,000,000 characters
 */
export async function readClipboardUrls(): Promise<string[] | null> {
  try {
    if (!(await hasClipboardPermission())) return null;
    const text = await navigator.clipboard.readText();
    if (text.length > MAX_READ_LENGTH) return null;
    return webAddresses(text);
  } catch {
    return null;
  }
}

/**
 * Writes a payload to the clipboard. A payload with HTML carries both flavors.
 * @param payload - The text, and the HTML for rich formats
 * @returns A promise that resolves when the write finishes
 */
export async function writeClipboard(payload: ClipboardPayload): Promise<void> {
  if (payload.html === undefined) {
    await navigator.clipboard.writeText(payload.text);
    return;
  }
  const item = new ClipboardItem({
    'text/plain': new Blob([payload.text], { type: 'text/plain' }),
    'text/html': new Blob([payload.html], { type: 'text/html' }),
  });
  await navigator.clipboard.write([item]);
}
