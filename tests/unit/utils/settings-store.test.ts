// Unit tests for utils/settings-store.ts

import {
  getClipboardPromptDismissed,
  getFormat,
  setClipboardPromptDismissed,
  setFormat,
} from '@/utils/settings-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Replaces the storage.local mocks with a small in-memory store. */
function useMemoryStorage(initial: Record<string, unknown> = {}): Record<string, unknown> {
  const data: Record<string, unknown> = { ...initial };
  chrome.storage.local.get = vi
    .fn()
    .mockImplementation((key: string) => Promise.resolve(key in data ? { [key]: data[key] } : {}));
  chrome.storage.local.set = vi.fn().mockImplementation((items: Record<string, unknown>) => {
    Object.assign(data, items);
    return Promise.resolve();
  });
  return data;
}

describe('getFormat', () => {
  beforeEach(() => {
    useMemoryStorage();
  });

  it("returns 'URL' when storage is empty", async () => {
    expect(await getFormat()).toBe('URL');
  });

  it("returns 'URL' when storage holds {format:'Nope'}", async () => {
    useMemoryStorage({ settings: { format: 'Nope' } });

    expect(await getFormat()).toBe('URL');
  });

  it("returns 'URL' when the stored settings are not an object", async () => {
    useMemoryStorage({ settings: 'Markdown' });

    expect(await getFormat()).toBe('URL');
  });

  it('returns the stored format when it is valid', async () => {
    useMemoryStorage({ settings: { format: 'HTML table' } });

    expect(await getFormat()).toBe('HTML table');
  });

  it("reads the 'settings' key of chrome.storage.local", async () => {
    await getFormat();

    expect(chrome.storage.local.get).toHaveBeenCalledWith('settings');
  });
});

describe('setFormat', () => {
  it('writes {settings:{format}} to chrome.storage.local', async () => {
    useMemoryStorage();
    await setFormat('JSON');

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ settings: { format: 'JSON' } });
  });

  it("returns 'Markdown' after setFormat('Markdown')", async () => {
    useMemoryStorage();
    await setFormat('Markdown');

    expect(await getFormat()).toBe('Markdown');
  });

  it('keeps the last choice when it is set twice', async () => {
    useMemoryStorage();
    await setFormat('CSV');
    await setFormat('BBCode');

    expect(await getFormat()).toBe('BBCode');
  });
});

describe('clipboard prompt dismissal', () => {
  it('reads false when storage is empty', async () => {
    useMemoryStorage();

    expect(await getClipboardPromptDismissed()).toBe(false);
  });

  it('reads false when the stored value is not a boolean', async () => {
    useMemoryStorage({ clipboardPromptDismissed: 'yes' });

    expect(await getClipboardPromptDismissed()).toBe(false);
  });

  it("writes true to the 'clipboardPromptDismissed' key and reads it back", async () => {
    useMemoryStorage();
    await setClipboardPromptDismissed();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ clipboardPromptDismissed: true });
    expect(await getClipboardPromptDismissed()).toBe(true);
  });

  it('survives a format save, because the two use separate keys', async () => {
    useMemoryStorage();
    await setClipboardPromptDismissed();
    await setFormat('CSV');

    expect(await getClipboardPromptDismissed()).toBe(true);
    expect(await getFormat()).toBe('CSV');
  });
});
