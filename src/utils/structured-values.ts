// Structured text readers: pull URL values out of JSON, CSV, and HTML that Copy writes

/** The first line that the CSV format of Copy writes. */
const CSV_HEADER = 'title,url,window,index,pinned,active';

/** The href value of an HTML link, in double or single quotes. */
const HREF = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/**
 * Decodes the HTML entities that a link value can hold. The ampersand goes last, so "&amp;lt;" stays text.
 * @param value - The raw attribute value.
 * @returns The decoded value.
 */
function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Walks parsed JSON and collects every string `url` property, in document order.
 * @param root - The parsed JSON value.
 * @returns The url values.
 */
function jsonUrls(root: unknown): string[] {
  const found: string[] = [];
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      stack.push(...[...node].reverse());
    } else if (node !== null && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (typeof record.url === 'string') found.push(record.url);
      stack.push(...Object.values(record).reverse());
    }
  }
  return found;
}

/**
 * Reads JSON text and returns its url values.
 * @param text - Text that starts with [ or {.
 * @returns The url values, or an empty array when the text is not JSON.
 */
function fromJson(text: string): string[] {
  try {
    return jsonUrls(JSON.parse(text));
  } catch {
    return [];
  }
}

/**
 * Splits CSV text into rows of cells. Quoted cells can hold commas, quotes, and newlines.
 * @param text - CSV text with \n line endings.
 * @returns The rows.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);
    if (quoted) {
      if (char !== '"') {
        cell += char;
      } else if (text.charAt(i + 1) === '"') {
        cell += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

/**
 * Reads the CSV format of Copy and returns the cells of its url column.
 * @param text - CSV text that starts with the Copy header.
 * @returns The cell values.
 */
function fromCsv(text: string): string[] {
  const [head = [], ...rows] = parseCsv(text);
  const column = head.indexOf('url');
  return rows.map((row) => row[column] ?? '');
}

/**
 * Reads the href values of an HTML list or table.
 * @param text - Text that starts with <.
 * @returns The decoded href values.
 */
function fromHtml(text: string): string[] {
  return [...text.matchAll(HREF)].map((match) => decodeEntities(match.slice(1).join('')));
}

/**
 * Reads the whole text as CSV, JSON, or HTML.
 * @param text - Normalized text with \n line endings.
 * @returns The raw URL values, or null when the text has no known structure.
 */
export function structuredValues(text: string): string[] | null {
  const trimmed = text.trim();
  const newline = text.indexOf('\n');
  const firstLine = newline < 0 ? text : text.slice(0, newline);
  if (firstLine.trim() === CSV_HEADER) return fromCsv(text);
  let found: string[] = [];
  if (/^[[{]/.test(trimmed)) found = fromJson(trimmed);
  else if (trimmed.startsWith('<')) found = fromHtml(trimmed);
  return found.length > 0 ? found : null;
}
