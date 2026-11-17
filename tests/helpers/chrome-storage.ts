// Stateful chrome.storage mocks that behave like real key-value stores

import { vi } from 'vitest';

/** The two backing stores and a reset that simulates a browser restart. */
export interface FakeStorage {
  local: Record<string, unknown>;
  session: Record<string, unknown>;
  /** Clears session storage and keeps local storage, as a browser restart does. */
  restart: () => void;
}

/**
 * Builds a mock for one storage area. A get resolves on the next tick, so unqueued
 * read-modify-write cycles would lose updates in a test.
 * @param store - Backing object for the area
 * @param failSets - Number of set calls that reject before sets succeed
 * @returns Mock get and set functions
 */
function makeArea(
  store: Record<string, unknown>,
  failSets: number
): { get: typeof chrome.storage.local.get; set: typeof chrome.storage.local.set } {
  let failuresLeft = failSets;
  const get = vi.fn(async (key: string) => {
    await Promise.resolve();
    return { [key]: store[key] };
  });
  const set = vi.fn(async (items: Record<string, unknown>) => {
    await Promise.resolve();
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      throw new Error('quota');
    }
    Object.assign(store, items);
  });
  return {
    get: get as unknown as typeof chrome.storage.local.get,
    set: set as unknown as typeof chrome.storage.local.set,
  };
}

/**
 * Replaces chrome.storage.local and chrome.storage.session with stateful mocks.
 * @param options - failLocalSets: number of local set calls that reject first
 * @returns The backing stores
 */
export function useFakeStorage(options: { failLocalSets?: number } = {}): FakeStorage {
  const local: Record<string, unknown> = {};
  const session: Record<string, unknown> = {};
  const localArea = makeArea(local, options.failLocalSets ?? 0);
  const sessionArea = makeArea(session, 0);
  chrome.storage.local.get = localArea.get;
  chrome.storage.local.set = localArea.set;
  chrome.storage.session.get = sessionArea.get;
  chrome.storage.session.set = sessionArea.set;
  return {
    local,
    session,
    restart: (): void => {
      for (const key of Object.keys(session)) delete session[key];
    },
  };
}
