// Shared setup for the popup hook tests: a stateful clipboard stub and a one-window tab setup

import { chromeTab, chromeWindow } from '@tests/helpers/chrome-tabs';
import { vi } from 'vitest';

/** The clipboard functions the hooks call. */
export interface ClipboardStub {
  readText: ReturnType<typeof vi.fn>;
  writeText: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
}

/**
 * Replaces navigator.clipboard with stubs. Call vi.unstubAllGlobals() in afterEach.
 * @returns The three stub functions.
 */
export function stubClipboard(): ClipboardStub {
  const stub: ClipboardStub = {
    readText: vi.fn().mockResolvedValue(''),
    writeText: vi.fn().mockResolvedValue(undefined),
    write: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('navigator', { clipboard: stub });
  vi.stubGlobal(
    'ClipboardItem',
    class {
      constructor(readonly data: Record<string, Blob>) {}
    }
  );
  return stub;
}

/** A promise that the test settles by hand. */
interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

/**
 * Makes a promise that the test settles by hand.
 * @returns The promise and its resolve function.
 */
export function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/**
 * Builds a tab for a site address.
 * @param n - A number that makes the address and the title unique.
 * @param fields - Fields that differ from a plain loaded tab.
 * @returns A Chrome tab at https://siteN.com/.
 */
export function siteTab(n: number, fields: Partial<chrome.tabs.Tab> = {}): chrome.tabs.Tab {
  return chromeTab({
    id: n,
    index: n - 1,
    title: `Site ${n}`,
    url: `https://site${n}.com/`,
    ...fields,
  });
}

/**
 * Makes chrome.windows return the given windows, with window 1 as the current one.
 * @param windows - One array of tabs per window, in window order.
 * @returns Nothing.
 */
export function mockWindows(windows: chrome.tabs.Tab[][]): void {
  vi.mocked(chrome.windows.getAll).mockResolvedValue(
    windows.map((tabs, index) => chromeWindow(index + 1, tabs))
  );
}
