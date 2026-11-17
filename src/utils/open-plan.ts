// Open planner: splits a list into the batch to open now, the entries already open, and the entries that wait

import { type Entry, lineEntries, parseList, urlKey } from '@/utils/extract-urls';

/** What one Open click does with the list. */
export interface OpenPlan {
  /** Entries to open now, at most the cap, in list order. */
  batch: Entry[];
  /** URLs that are already open in the window. They do not count toward the cap. */
  skipped: Entry[];
  /** Entries after the batch. They wait for the next click. */
  waiting: Entry[];
}

/**
 * Builds the key that tells two entries apart: the normalized URL, or the search term.
 * @param entry - A list entry.
 * @returns The key of the entry.
 */
function entryKey(entry: Entry): string {
  return entry.kind === 'url' ? urlKey(entry.url) : `search:${entry.term}`;
}

/**
 * Plans one Open click. URLs already open are skipped. The first `cap` of the rest open now.
 * A search entry is never "open".
 * @param text - The list text.
 * @param openKeys - The urlKey of every URL open in the current window.
 * @param cap - The most tabs one click opens.
 * @returns The batch, the skipped entries, and the waiting entries.
 */
export function planOpen(text: string, openKeys: ReadonlySet<string>, cap: number): OpenPlan {
  const skipped: Entry[] = [];
  const rest: Entry[] = [];
  for (const entry of parseList(text).entries) {
    (entry.kind === 'url' && openKeys.has(urlKey(entry.url)) ? skipped : rest).push(entry);
  }
  return { batch: rest.slice(0, cap), skipped, waiting: rest.slice(cap) };
}

/**
 * Tells whether every URL in the list is already open, so a click would open nothing.
 * An empty list is not "all open".
 * @param plan - The current plan.
 * @returns True when at least one URL was skipped as open and nothing is left to open.
 */
export function allOpen(plan: OpenPlan): boolean {
  return plan.skipped.length > 0 && plan.batch.length === 0 && plan.waiting.length === 0;
}

/**
 * Writes the label of the Open button.
 * @param plan - The current plan.
 * @param cap - The most tabs one click opens.
 * @param continuing - True after a click opened part of the list.
 * @returns For example "Open 3 URLs", "Open first 20 of 45", "Open next 20 of 25", or "All open".
 */
export function openLabel(plan: OpenPlan, cap: number, continuing: boolean): string {
  if (allOpen(plan)) return 'All open';
  const total = plan.batch.length + plan.waiting.length;
  if (total > cap) return `Open ${continuing ? 'next' : 'first'} ${cap} of ${total}`;
  return `Open ${total} ${total === 1 ? 'URL' : 'URLs'}`;
}

/**
 * Removes the finished lines from the list text.
 * A line leaves when it holds at least one entry and every entry of it opened or was skipped.
 * A line that repeats only finished URLs leaves too, because the parser kept no entry for a repeat.
 * A line with no entry stays. Structured text has no lines, so the rest of its URLs go one per line.
 * @param text - The list text the plan came from.
 * @param plan - The plan that the click ran.
 * @param opened - The entries that opened.
 * @returns The text that remains, or the text unchanged when nothing opened.
 */
export function remainingText(text: string, plan: OpenPlan, opened: readonly Entry[]): string {
  if (opened.length === 0) return text;
  const openedKeys = new Set(opened.map(entryKey));
  const left = [...plan.batch.filter((entry) => !openedKeys.has(entryKey(entry))), ...plan.waiting];
  if (plan.batch.concat(plan.waiting, plan.skipped).every((entry) => entry.line < 0)) {
    return left.map((entry) => (entry.kind === 'url' ? entry.url : entry.term)).join('\n');
  }
  const kept = new Set(left.map((entry) => entry.line));
  const done = [...opened, ...plan.skipped];
  const finished = new Set(done.map((entry) => entry.line));
  const doneKeys = new Set(done.map(entryKey));
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line, index) => {
      if (kept.has(index)) return true;
      if (finished.has(index)) return false;
      const entries = line.trim() === '' ? [] : lineEntries(line.trim(), index);
      return entries.length === 0 || !entries.every((entry) => doneKeys.has(entryKey(entry)));
    })
    .join('\n');
}
