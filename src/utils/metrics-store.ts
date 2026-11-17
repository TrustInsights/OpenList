// Details totals in local storage and the session start time in session storage

import { DEFAULT_TOTALS, TotalsSchema } from '@/schemas/metrics';
import type { Totals } from '@/types';
import { z } from 'zod';

const TOTALS_KEY = 'totals';
const OPEN_SINCE_KEY = 'openSince';
/** Longest stored error text. It keeps the totals bounded. */

const OpenSinceSchema = z.number().int().min(0);

/** Tail of the write queue. Each totals write waits for the one before it. */
let queue: Promise<void> = Promise.resolve();

/**
 * Runs a task after every earlier queued task ends. A rejected task does not block the next one.
 * @param task - The read-modify-write step to run
 * @returns A promise that settles with the result of the task
 */
function enqueue(task: () => Promise<void>): Promise<void> {
  const previous = queue;
  const run = (async (): Promise<void> => {
    await previous;
    await task();
  })();
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Reads the Details totals from local storage.
 * @returns The stored totals, or zeros if none are stored or the data is corrupt
 */
export async function getTotals(): Promise<Totals> {
  const result = await chrome.storage.local.get(TOTALS_KEY);
  const parsed = TotalsSchema.safeParse(result[TOTALS_KEY]);
  return parsed.success ? parsed.data : { ...DEFAULT_TOTALS };
}

/**
 * Adds counts to the stored totals in one read-modify-write step.
 * Totals writes run through one queue, so concurrent calls never read a stale snapshot.
 * @param delta - Counts to add. An omitted field adds 0
 * @returns A promise that resolves when the new totals are saved
 */
export function addTotals(
  delta: Partial<Pick<Totals, 'tabsOpened' | 'tabsFailed' | 'urlsProcessed'>>
): Promise<void> {
  return enqueue(async () => {
    const totals = await getTotals();
    await chrome.storage.local.set({
      [TOTALS_KEY]: {
        ...totals,
        tabsOpened: totals.tabsOpened + (delta.tabsOpened ?? 0),
        tabsFailed: totals.tabsFailed + (delta.tabsFailed ?? 0),
        urlsProcessed: totals.urlsProcessed + (delta.urlsProcessed ?? 0),
      },
    });
  });
}

/**
 * Saves the start time of this browser session in session storage.
 * @param now - Start time in milliseconds since the epoch (default: now)
 * @returns A promise that resolves when the start time is saved
 */
export async function markSessionStart(now: number = Date.now()): Promise<void> {
  await chrome.storage.session.set({ [OPEN_SINCE_KEY]: now });
}

/**
 * Reads the start time of this browser session from session storage.
 * @returns The start time in milliseconds since the epoch, or 0 if none is saved
 */
export async function getOpenSince(): Promise<number> {
  const result = await chrome.storage.session.get(OPEN_SINCE_KEY);
  const parsed = OpenSinceSchema.safeParse(result[OPEN_SINCE_KEY]);
  return parsed.success ? parsed.data : 0;
}
