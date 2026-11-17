// Unit tests for utils/source-choice.ts: the default source and the option list

import { chooseDefaultSource, sourceOptions } from '@/utils/source-choice';
import { describe, expect, it } from 'vitest';

describe('chooseDefaultSource', () => {
  it('picks selected tabs first when two or more are highlighted', () => {
    expect(chooseDefaultSource({ selected: 2, clipboard: 5, window: 6, all: 9 })).toBe('selected');
  });

  it('skips a single highlighted tab and picks the clipboard', () => {
    expect(chooseDefaultSource({ selected: 1, clipboard: 5, window: 6, all: 9 })).toBe('clipboard');
  });

  it('skips a clipboard with one URL and picks the window', () => {
    expect(chooseDefaultSource({ selected: 0, clipboard: 1, window: 6, all: 9 })).toBe('window');
  });

  it('picks this tab when the window has one tab', () => {
    expect(chooseDefaultSource({ selected: 0, clipboard: 0, window: 1, all: 1 })).toBe('tab');
  });

  it('picks this window when the window has no usable tab', () => {
    expect(chooseDefaultSource({ selected: 0, clipboard: 0, window: 0, all: 0 })).toBe('window');
  });

  it('prefers the clipboard over a one-tab window', () => {
    expect(chooseDefaultSource({ selected: 0, clipboard: 3, window: 1, all: 1 })).toBe('clipboard');
  });
});

describe('sourceOptions', () => {
  it('lists the always-on options with the exact labels', () => {
    expect(sourceOptions({ selected: 0, clipboard: 0, window: 3, all: 4 })).toEqual([
      { id: 'window', label: 'This window (3)' },
      { id: 'tab', label: 'This tab (1)' },
      { id: 'all', label: 'All windows (4)' },
    ]);
  });

  it('adds selected tabs and clipboard in front, in that order', () => {
    expect(sourceOptions({ selected: 2, clipboard: 5, window: 3, all: 4 })).toEqual([
      { id: 'selected', label: 'Selected tabs (2)' },
      { id: 'clipboard', label: 'Clipboard (5 URLs)' },
      { id: 'window', label: 'This window (3)' },
      { id: 'tab', label: 'This tab (1)' },
      { id: 'all', label: 'All windows (4)' },
    ]);
  });

  it('hides selected and clipboard below two', () => {
    const ids = sourceOptions({ selected: 1, clipboard: 1, window: 3, all: 4 }).map((o) => o.id);
    expect(ids).toEqual(['window', 'tab', 'all']);
  });
});
