// Unit tests for schemas/config.ts

import { CONFIG } from '@/schemas/config';
import { describe, expect, it } from 'vitest';

describe('CONFIG', () => {
  it('has MAX_TABS of 20', () => {
    expect(CONFIG.MAX_TABS).toBe(20);
  });

  it('has DELAY_BETWEEN_TABS of 100', () => {
    expect(CONFIG.DELAY_BETWEEN_TABS).toBe(100);
  });

  it('has CONTEXT_MENU_ID of OpenList-ContextMenuOpen', () => {
    expect(CONFIG.CONTEXT_MENU_ID).toBe('OpenList-ContextMenuOpen');
  });

  it('has COPY_WINDOW_MENU_ID of OpenList-CopyWindow', () => {
    expect(CONFIG.COPY_WINDOW_MENU_ID).toBe('OpenList-CopyWindow');
  });

  it('holds only the four keys that production code reads', () => {
    expect(Object.keys(CONFIG).sort()).toEqual([
      'CONTEXT_MENU_ID',
      'COPY_WINDOW_MENU_ID',
      'DELAY_BETWEEN_TABS',
      'MAX_TABS',
    ]);
  });
});
