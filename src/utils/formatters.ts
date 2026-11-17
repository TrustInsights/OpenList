// Copy formats: turn tab records into clipboard text and, for two formats, clipboard HTML

import type { Format } from '@/schemas/settings';
import type { TabRecord } from '@/schemas/tab';

/** What a copy puts on the clipboard: plain text, and rich HTML for Link and HTML table. */
export interface ClipboardPayload {
  text: string;
  html?: string;
}

/** One group of tabs: the tabs of one window, or one blank-line block of the list. */
type Group = readonly TabRecord[];

/** The header row of the CSV format. The extractor reads the same text. */
const CSV_HEADER = 'title,url,window,index,pinned,active';

/** The first characters that make a spreadsheet run a cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Makes a title safe for a text format: each line break (CR, LF, or the Unicode line and paragraph separators) becomes one space.
 * @param title - The tab title.
 * @returns The title on one line.
 */
function oneLine(title: string): string {
  return title.replace(/\r\n|[\r\n\u2028\u2029]/g, ' ');
}

/**
 * Escapes text for HTML text and for a double-quoted attribute.
 * @param text - The raw text.
 * @returns The text with &, <, >, and " escaped.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Makes a title safe inside Markdown link text.
 * @param title - The tab title.
 * @returns The title with backslash, [ and ] escaped.
 */
function markdownTitle(title: string): string {
  return oneLine(title).replace(/[\\[\]]/g, '\\$&');
}

/**
 * Makes a URL safe inside a Markdown link target.
 * @param url - The tab URL.
 * @returns The URL with parentheses and spaces percent-encoded.
 */
function markdownUrl(url: string): string {
  return url.replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/ /g, '%20');
}

/**
 * Writes one CSV text cell: quoted, inner quotes doubled, formula starts guarded.
 * @param value - The cell text.
 * @returns The quoted cell.
 */
function csvCell(value: string): string {
  const guarded = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

/**
 * Names the window of a tab. A tab that the lookup did not match has window id 0, so its field is empty.
 * @param tab - The tab record.
 * @returns The window id as text, or an empty string.
 */
function windowField(tab: TabRecord): string {
  return tab.windowId > 0 ? String(tab.windowId) : '';
}

/**
 * Builds the JSON object of one tab. Optional fields appear only when the tab has them.
 * @param tab - The tab record.
 * @returns The object, with lastAccessed as an ISO date.
 */
function jsonRecord(tab: TabRecord): Record<string, unknown> {
  const accessed = tab.lastAccessed === undefined ? undefined : new Date(tab.lastAccessed);
  return {
    title: tab.title,
    url: tab.url,
    ...(tab.favIconUrl === undefined ? {} : { favIconUrl: tab.favIconUrl }),
    windowId: tab.windowId,
    index: tab.index,
    pinned: tab.pinned,
    active: tab.active,
    groupId: tab.groupId,
    ...(accessed === undefined || Number.isNaN(accessed.getTime())
      ? {}
      : { lastAccessed: accessed.toISOString() }),
  };
}

/**
 * Writes the anchor of one tab.
 * @param tab - The tab record.
 * @returns The a element with escaped href and title.
 */
function anchor(tab: TabRecord): string {
  return `<a href="${escapeHtml(tab.url)}">${escapeHtml(oneLine(tab.title))}</a>`;
}

/** The first item of each format, with no wrapper and no group break. */
const ITEMS: Record<Format, (tab: TabRecord) => string> = {
  URL: (tab) => tab.url,
  Title: (tab) => oneLine(tab.title),
  'Title & URL': (tab) => `${oneLine(tab.title)}: ${tab.url}`,
  Markdown: (tab) => `- [${markdownTitle(tab.title)}](${markdownUrl(tab.url)})`,
  BBCode: (tab) =>
    `[url=${tab.url}]${oneLine(tab.title).replace(/\[/g, '(').replace(/\]/g, ')')}[/url]`,
  HTML: (tab) => `<li>${anchor(tab)}</li>`,
  Link: (tab) => `${oneLine(tab.title)} (${tab.url})`,
  CSV: (tab) =>
    `${csvCell(tab.title)},${csvCell(tab.url)},${windowField(tab)},${tab.index},${tab.pinned},${tab.active}`,
  JSON: (tab) => JSON.stringify(jsonRecord(tab)),
  'HTML table': (tab) =>
    `<tr><td>${escapeHtml(oneLine(tab.title))}</td><td><a href="${escapeHtml(tab.url)}">${escapeHtml(tab.url)}</a></td><td>${windowField(tab)}</td></tr>`,
};

/**
 * Builds a payload that has one item per line and a blank line between groups.
 * @param format - A line format.
 * @param groups - The non-empty groups.
 * @returns The payload with text only.
 */
function lineText(format: Format, groups: readonly Group[]): ClipboardPayload {
  const item = ITEMS[format];
  return { text: groups.map((group) => group.map(item).join('\n')).join('\n\n') };
}

/**
 * Builds the HTML format: one ul block per group.
 * @param groups - The non-empty groups.
 * @returns The payload with text only (the source).
 */
function htmlList(groups: readonly Group[]): ClipboardPayload {
  const blocks = groups.map(
    (group) => `<ul>\n${group.map((tab) => `  ${ITEMS.HTML(tab)}`).join('\n')}\n</ul>`
  );
  return { text: blocks.join('\n\n') };
}

/**
 * Builds the Link format: Title (URL) lines as text, and one anchor per line as HTML.
 * @param groups - The non-empty groups.
 * @returns The payload with text and html.
 */
function linkList(groups: readonly Group[]): ClipboardPayload {
  const html = groups.map((group) => group.map(anchor).join('<br>')).join('<br><br>');
  return { ...lineText('Link', groups), html };
}

/**
 * Builds the CSV format: a header row, then one row per tab. Groups are ignored.
 * @param groups - The non-empty groups.
 * @returns The payload with text only.
 */
function csvTable(groups: readonly Group[]): ClipboardPayload {
  return { text: [CSV_HEADER, ...groups.flat().map(ITEMS.CSV)].join('\n') };
}

/**
 * Builds the JSON format: one flat array, two-space indent. Groups are ignored.
 * @param groups - The non-empty groups.
 * @returns The payload with text only.
 */
function jsonArray(groups: readonly Group[]): ClipboardPayload {
  return { text: JSON.stringify(groups.flat().map(jsonRecord), null, 2) };
}

/**
 * Builds the HTML table format: a header row, then one row per tab. Groups are ignored.
 * @param groups - The non-empty groups.
 * @returns The payload with the source as text and the same markup as html.
 */
function htmlTable(groups: readonly Group[]): ClipboardPayload {
  const rows = groups.flat().map((tab) => `  ${ITEMS['HTML table'](tab)}`);
  const header = '  <tr><th>Title</th><th>URL</th><th>Window</th></tr>';
  const text = ['<table>', header, ...rows, '</table>'].join('\n');
  return { text, html: text };
}

/** One builder per format. */
const BUILDERS: Record<Format, (groups: readonly Group[]) => ClipboardPayload> = {
  URL: (groups) => lineText('URL', groups),
  Title: (groups) => lineText('Title', groups),
  'Title & URL': (groups) => lineText('Title & URL', groups),
  Markdown: (groups) => lineText('Markdown', groups),
  BBCode: (groups) => lineText('BBCode', groups),
  HTML: htmlList,
  Link: linkList,
  CSV: csvTable,
  JSON: jsonArray,
  'HTML table': htmlTable,
};

/**
 * Formats tabs for the clipboard. Empty groups are dropped. No tabs give empty text.
 * @param format - The copy format.
 * @param groups - The tabs, one array per group.
 * @returns The clipboard text and, for Link and HTML table, the clipboard HTML.
 */
export function formatTabs(format: Format, groups: readonly Group[]): ClipboardPayload {
  const filled = groups.filter((group) => group.length > 0);
  return filled.length === 0 ? { text: '' } : BUILDERS[format](filled);
}

/**
 * Shows the first item of a format on one line, with no wrapper. The popup uses it as the format example.
 * @param format - The copy format.
 * @param tab - The tab that supplies the title and URL.
 * @returns The one-line example.
 */
export function formatExample(format: Format, tab: TabRecord): string {
  return ITEMS[format](tab);
}
