// Shared tab records for the formatter tests

import type { TabRecord } from '@/schemas/tab';

/** A tab whose title and URL need escaping in every format. */
export const TAB: TabRecord = {
  title: 'Fish & Chips [v2]',
  url: 'https://example.com/a_(b)?x=1&y=2',
  windowId: 1,
  index: 0,
  pinned: false,
  active: true,
  groupId: -1,
};

/** A second tab in another window. */
export const TAB_TWO: TabRecord = {
  ...TAB,
  title: 'Second',
  url: 'https://example.org/two',
  windowId: 2,
  index: 3,
};
