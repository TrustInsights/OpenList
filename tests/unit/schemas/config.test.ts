// Unit tests for schemas/config.ts

import { CONFIG } from '@/schemas/config';
import { describe, expect, it } from 'vitest';

describe('CONFIG', () => {
  it('holds exactly the four settings that production code reads', () => {
    expect(CONFIG).toEqual({
      MAX_TABS: 20,
      DELAY_BETWEEN_TABS: 100,
      CONTEXT_MENU_ID: 'OpenList-ContextMenuOpen',
      COPY_WINDOW_MENU_ID: 'OpenList-CopyWindow',
    });
  });
});
