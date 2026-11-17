// Source choice: picks the default "From" source and lists the options with their counts

import type { SourceId } from '@/schemas/settings';

/** How many URLs each source holds. */
export interface SourceCounts {
  selected: number;
  clipboard: number;
  window: number;
  all: number;
}

/** The fewest URLs that make the selected and clipboard sources worth showing. */
const MIN_MULTI = 2;

/**
 * Picks the source the popup starts with: selected tabs, then clipboard, then this window.
 * A window with one tab starts at this tab.
 * @param counts - The size of each source.
 * @returns The id of the first source that applies.
 */
export function chooseDefaultSource(counts: SourceCounts): SourceId {
  if (counts.selected >= MIN_MULTI) return 'selected';
  if (counts.clipboard >= MIN_MULTI) return 'clipboard';
  return counts.window === 1 ? 'tab' : 'window';
}

/**
 * Lists the options of the "From" control in menu order.
 * Selected tabs and clipboard show only when each holds two or more URLs.
 * @param counts - The size of each source.
 * @returns The ids and labels of the shown options.
 */
export function sourceOptions(
  counts: SourceCounts
): ReadonlyArray<{ id: SourceId; label: string }> {
  const options: Array<{ id: SourceId; label: string }> = [];
  if (counts.selected >= MIN_MULTI) {
    options.push({ id: 'selected', label: `Selected tabs (${counts.selected})` });
  }
  if (counts.clipboard >= MIN_MULTI) {
    options.push({ id: 'clipboard', label: `Clipboard (${counts.clipboard} URLs)` });
  }
  options.push(
    { id: 'window', label: `This window (${counts.window})` },
    { id: 'tab', label: 'This tab (1)' },
    { id: 'all', label: `All windows (${counts.all})` }
  );
  return options;
}
