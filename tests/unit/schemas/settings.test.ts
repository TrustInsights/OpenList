// Unit tests for schemas/settings.ts

import {
  DEFAULT_FORMAT,
  FORMATS,
  FORMAT_GROUPS,
  FormatSchema,
  SOURCES,
  SettingsSchema,
} from '@/schemas/settings';
import { describe, expect, it } from 'vitest';

describe('FORMATS', () => {
  it('has 10 entries in the exact order of the spec', () => {
    expect(FORMATS).toEqual([
      'URL',
      'Title',
      'Title & URL',
      'Markdown',
      'BBCode',
      'HTML',
      'Link',
      'CSV',
      'JSON',
      'HTML table',
    ]);
    expect(FORMATS).toHaveLength(10);
  });
});

describe('FORMAT_GROUPS', () => {
  it("labels are 'Plain text', 'Markup', 'Data'", () => {
    expect(FORMAT_GROUPS.map((group) => group.label)).toEqual(['Plain text', 'Markup', 'Data']);
  });

  it('holds the formats of each group in spec order', () => {
    expect(FORMAT_GROUPS.map((group) => group.formats)).toEqual([
      ['URL', 'Title', 'Title & URL'],
      ['Markdown', 'BBCode', 'HTML', 'Link'],
      ['CSV', 'JSON', 'HTML table'],
    ]);
  });

  it('lists every format exactly once, in FORMATS order', () => {
    expect(FORMAT_GROUPS.flatMap((group) => group.formats)).toEqual([...FORMATS]);
  });
});

describe('FormatSchema', () => {
  it('accepts every format', () => {
    for (const format of FORMATS) {
      expect(FormatSchema.parse(format)).toBe(format);
    }
  });

  it('rejects a name outside the list and a wrong case', () => {
    expect(FormatSchema.safeParse('Nope').success).toBe(false);
    expect(FormatSchema.safeParse('markdown').success).toBe(false);
  });
});

describe('SOURCES', () => {
  it('holds the five source ids in spec order', () => {
    expect(SOURCES).toEqual(['selected', 'clipboard', 'window', 'tab', 'all']);
  });
});

describe('SettingsSchema', () => {
  it('accepts an object with a valid format', () => {
    expect(SettingsSchema.parse({ format: 'CSV' })).toEqual({ format: 'CSV' });
  });

  it('rejects an object with an invalid format or no format', () => {
    expect(SettingsSchema.safeParse({ format: 'Nope' }).success).toBe(false);
    expect(SettingsSchema.safeParse({}).success).toBe(false);
  });
});

describe('DEFAULT_FORMAT', () => {
  it("is 'URL' so a first copy matches the old behavior", () => {
    expect(DEFAULT_FORMAT).toBe('URL');
  });
});
