// Unit tests for schemas/tab.ts

import { TabRecordSchema } from '@/schemas/tab';
import { describe, expect, it } from 'vitest';

const base = {
  title: 'Example',
  url: 'https://example.com',
  windowId: 3,
  index: 0,
  pinned: false,
  active: true,
  groupId: -1,
};

describe('TabRecordSchema', () => {
  it('accepts a tab with no favIconUrl and no lastAccessed', () => {
    const result = TabRecordSchema.safeParse(base);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(base);
  });

  it('accepts a tab with favIconUrl and lastAccessed', () => {
    const full = { ...base, favIconUrl: 'https://example.com/i.png', lastAccessed: 1763290000000 };

    expect(TabRecordSchema.parse(full)).toEqual(full);
  });

  it('rejects a non-integer index', () => {
    expect(TabRecordSchema.safeParse({ ...base, index: 1.5 }).success).toBe(false);
  });

  it('rejects a non-integer windowId', () => {
    expect(TabRecordSchema.safeParse({ ...base, windowId: 2.2 }).success).toBe(false);
  });

  it('rejects a non-integer groupId', () => {
    expect(TabRecordSchema.safeParse({ ...base, groupId: 0.5 }).success).toBe(false);
  });

  it('rejects a tab with a missing required field', () => {
    const { title: _title, ...noTitle } = base;

    expect(TabRecordSchema.safeParse(noTitle).success).toBe(false);
  });

  it('rejects a non-boolean pinned or active value', () => {
    expect(TabRecordSchema.safeParse({ ...base, pinned: 'yes' }).success).toBe(false);
    expect(TabRecordSchema.safeParse({ ...base, active: 1 }).success).toBe(false);
  });
});
