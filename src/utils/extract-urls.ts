// URL extractor: turns pasted or copied text into URL and search entries

import { structuredValues } from '@/utils/structured-values';
import { isLocalHost, isProbablyUrl, sanitizeUrl } from '@/utils/urls';

/** One item of the list: a page address or a search term. `line` is the zero-based source line, or -1 for structured text. */
export type Entry =
  | { kind: 'url'; url: string; line: number }
  | { kind: 'search'; term: string; line: number };

/** The result of reading a text: unique entries, the same entries in blank-line groups, and the structure flag. */
export interface ParsedList {
  entries: Entry[];
  groups: Entry[][];
  structured: boolean;
}

/** A run of non-space characters that starts at http:// or https:// and stops at < > " ' [ ]. */
const ADDRESS = /https?:\/\/[^\s<>"'[\]]+/gi;

/**
 * The Markdown and BBCode items that Copy writes. A title can hold an address, so only the link target counts.
 * Group 1 is the Markdown target. Group 2 is the BBCode target.
 */
const COPY_ITEM =
  /^- \[(?:\\.|[^\\\]])*\]\((https?:\/\/\S+)\)$|^\[url=(https?:\/\/[^\]\s]+)\][^[\]]*\[\/url\]$/i;

/**
 * The Title & URL item ("Title: URL") and the Link item ("Title (URL)") that Copy writes. The address is the last
 * thing on the line, so a title that holds an address gives no second page. Group 1 is the Title & URL target.
 * Group 2 is the Link target. A line that does not end this way keeps the rule "every address on the line".
 */
const TITLE_ITEM = /^.*: (https?:\/\/\S+)$|^.* \((https?:\/\/.+)\)$/i;

/** Punctuation that ends a sentence and does not belong to an address. */
const TRAILING_PUNCTUATION = /[.,;:!?]$/;

/**
 * Builds the "same page" key of a URL: escaped parentheses become parentheses, then the URL is normalized.
 * An http address and its https twin share one key, because the parser upgrades http to https.
 * So a tab at an http address still matches the https entry that the list gives for it.
 * Local hosts keep http, so their http and https addresses stay two keys.
 * @param url - The URL text.
 * @returns The normalized URL, or the input unchanged when it does not parse.
 */
export function urlKey(url: string): string {
  try {
    const parsed = new URL(url.replace(/%28/g, '(').replace(/%29/g, ')'));
    if (parsed.protocol === 'http:' && !isLocalHost(parsed.hostname)) parsed.protocol = 'https:';
    return parsed.href;
  } catch {
    return url;
  }
}

/**
 * Makes a URL entry from address text.
 * @param raw - The address text.
 * @param line - The source line, or -1.
 * @returns The entry, or an empty array when the address is invalid or blocked.
 */
function urlEntry(raw: string, line: number): Entry[] {
  const url = sanitizeUrl(raw);
  return url === null ? [] : [{ kind: 'url', url, line }];
}

/**
 * Makes a URL entry from a value in structured text. Text that is not a URL gives nothing.
 * @param value - The value of a JSON url, a CSV cell, or an HTML href.
 * @returns The entry, or an empty array.
 */
function structuredEntry(value: string): Entry[] {
  const text = value.trim();
  return isProbablyUrl(text) ? urlEntry(text, -1) : [];
}

/**
 * Removes trailing punctuation and any unbalanced closing parenthesis from an address.
 * @param raw - The address as found in the line.
 * @returns The address without its trailing marks.
 */
function trimAddress(raw: string): string {
  let end = raw;
  for (;;) {
    if (TRAILING_PUNCTUATION.test(end)) {
      end = end.slice(0, -1);
    } else if (end.endsWith(')') && end.split(')').length > end.split('(').length) {
      end = end.slice(0, -1);
    } else {
      return end;
    }
  }
}

/**
 * Reads one non-empty line: an item of Copy (Markdown, BBCode, Title & URL, Link), addresses, a site, or a search term.
 * @param line - The trimmed line text.
 * @param index - The zero-based line number.
 * @returns The entries of the line, before repeats are removed.
 */
export function lineEntries(line: string, index: number): Entry[] {
  const item = COPY_ITEM.exec(line);
  if (item !== null) return urlEntry(item[1] ?? item[2], index);
  const titled = TITLE_ITEM.exec(line);
  if (titled !== null) return urlEntry(trimAddress(titled[1] ?? titled[2]), index);
  const addresses = [...line.matchAll(ADDRESS)];
  if (addresses.length > 0) {
    return addresses.flatMap((match) => urlEntry(trimAddress(match[0]), index));
  }
  if (isProbablyUrl(line)) return urlEntry(line, index);
  return [{ kind: 'search', term: line, line: index }];
}

/**
 * Reads the text line by line. A blank line ends a group.
 * @param text - Normalized text.
 * @returns The groups of entries.
 */
function lineGroups(text: string): Entry[][] {
  const groups: Entry[][] = [];
  let current: Entry[] = [];
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (line === '') {
      if (current.length > 0) groups.push(current);
      current = [];
    } else {
      current.push(...lineEntries(line, index));
    }
  });
  if (current.length > 0) groups.push(current);
  return groups;
}

/**
 * Removes repeated URLs and empty groups, then builds the result.
 * @param groups - The groups with repeats.
 * @param structured - True when the text had a known structure.
 * @returns The parsed list.
 */
function build(groups: Entry[][], structured: boolean): ParsedList {
  const seen = new Set<string>();
  const unique = groups
    .map((group) =>
      group.filter((entry) => {
        if (entry.kind === 'search') return true;
        const key = urlKey(entry.url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
    )
    .filter((group) => group.length > 0);
  return { entries: unique.flat(), groups: unique, structured };
}

/**
 * Finds the explicit http and https addresses in a text. A site such as example.com does not count.
 * @param text - Any text, for example the clipboard text.
 * @returns The unique addresses, upgraded and cleaned as the list does it, in order.
 */
export function webAddresses(text: string): string[] {
  const seen = new Set<string>();
  const found: string[] = [];
  for (const match of text.matchAll(ADDRESS)) {
    const entry = urlEntry(trimAddress(match[0]), -1)[0];
    if (entry === undefined || entry.kind !== 'url' || seen.has(urlKey(entry.url))) continue;
    seen.add(urlKey(entry.url));
    found.push(entry.url);
  }
  return found;
}

/**
 * Reads text into URL and search entries. It tries JSON, CSV, and HTML first, then reads line by line.
 * @param text - Pasted, copied, or typed text.
 * @returns The unique entries, the blank-line groups, and the structure flag.
 */
export function parseList(text: string): ParsedList {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const values = structuredValues(normalized);
  return values === null
    ? build(lineGroups(normalized), false)
    : build([values.flatMap(structuredEntry)], true);
}
