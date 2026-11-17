// Zod schema and constants for the copy formats, the sources, and the saved settings

import { z } from '@/schemas/zod';

/**
 * The ten copy formats, in menu order.
 * @public Exported for the unit tests. The production code reads it through FormatSchema.
 */
export const FORMATS = [
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
] as const;

/** Accepts only one of the ten copy formats. */
export const FormatSchema = z.enum(FORMATS);

/** The name of one copy format. */
export type Format = z.infer<typeof FormatSchema>;

/** The three groups of the format menu. */
export const FORMAT_GROUPS: ReadonlyArray<{ label: string; formats: readonly Format[] }> = [
  { label: 'Plain text', formats: ['URL', 'Title', 'Title & URL'] },
  { label: 'Markup', formats: ['Markdown', 'BBCode', 'HTML', 'Link'] },
  { label: 'Data', formats: ['CSV', 'JSON', 'HTML table'] },
];

/**
 * The five places the list can come from, in id form.
 * @public Exported for the unit tests. The production code reads it through SourceId.
 */
export const SOURCES = ['selected', 'clipboard', 'window', 'tab', 'all'] as const;

/** The id of one list source. */
export type SourceId = (typeof SOURCES)[number];

/** The shape of the saved settings. */
export const SettingsSchema = z.object({ format: FormatSchema });

/** The format of a first copy. It matches what the extension did before. */
export const DEFAULT_FORMAT: Format = 'URL';
