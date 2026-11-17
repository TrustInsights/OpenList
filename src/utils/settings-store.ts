// Reads and writes the remembered copy format and the clipboard prompt dismissal in chrome.storage.local

import { DEFAULT_FORMAT, type Format, SettingsSchema } from '@/schemas/settings';
import { z } from 'zod';

const SETTINGS_KEY = 'settings';

/** Its own key, so a format save never overwrites the dismissal. */
const DISMISSED_KEY = 'clipboardPromptDismissed';

/**
 * Reads the remembered copy format.
 * @returns The stored format, or the default when storage is empty or invalid
 */
export async function getFormat(): Promise<Format> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const parsed = SettingsSchema.safeParse(result[SETTINGS_KEY]);
  return parsed.success ? parsed.data.format : DEFAULT_FORMAT;
}

/**
 * Saves the copy format for the next use.
 * @param format - The format the user chose
 * @returns A promise that resolves when the format is saved
 */
export async function setFormat(format: Format): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: { format } });
}

/**
 * Reads whether the user dismissed the clipboard permission button.
 * @returns True after one dismissal. False when storage is empty or invalid.
 */
export async function getClipboardPromptDismissed(): Promise<boolean> {
  const result = await chrome.storage.local.get(DISMISSED_KEY);
  const parsed = z.boolean().safeParse(result[DISMISSED_KEY]);
  return parsed.success && parsed.data;
}

/**
 * Saves that the user dismissed the clipboard permission button.
 * @returns A promise that resolves when the dismissal is saved
 */
export async function setClipboardPromptDismissed(): Promise<void> {
  await chrome.storage.local.set({ [DISMISSED_KEY]: true });
}
