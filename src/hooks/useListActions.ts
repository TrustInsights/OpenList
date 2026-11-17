// Hook that runs the Open and Copy actions on the list text and builds their labels

import { CONFIG } from '@/schemas/config';
import { OpenListMessageSchema, OpenListResponseSchema } from '@/schemas/messages';
import type { Format } from '@/schemas/settings';
import type { TabRecord } from '@/schemas/tab';
import { writeClipboard } from '@/utils/clipboard';
import { toErrorMessage } from '@/utils/errors';
import { type Entry, parseList, urlKey } from '@/utils/extract-urls';
import { formatExample, formatTabs } from '@/utils/formatters';
import { openLabel, planOpen, remainingText } from '@/utils/open-plan';
import { resolveTabs } from '@/utils/tabs-source';
import { useCallback, useEffect, useMemo, useState } from 'react';

/** The error that an Open click on an empty list shows. The popup hides it when the user types. */
export const EMPTY_LIST_ERROR = 'Please enter some URLs or text to search.';

/** The example line is cut to this many characters, with an ellipsis. */
const EXAMPLE_MAX = 80;

/** What the popup needs to run the two actions. */
interface ListActionsArgs {
  text: string;
  setText: (text: string) => void;
  known: TabRecord[];
  format: Format;
}

/** The labels, the messages, and the two actions. */
interface ListActions {
  openLabel: string;
  copyLabel: string;
  example: string;
  status: string;
  /** Goes up on every status write, so a repeated message still counts as a new result. */
  statusSeq: number;
  error: string | null;
  running: boolean;
  open: () => Promise<void>;
  copy: () => Promise<void>;
}

/**
 * Writes a count with its noun.
 * @param count - The count.
 * @param noun - The singular noun.
 * @returns For example "1 URL" or "2 URLs".
 */
function counted(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * Gives the line an entry sends to the service worker.
 * @param entry - A list entry.
 * @returns The URL, or the search term.
 */
function lineOf(entry: Entry): string {
  return entry.kind === 'url' ? entry.url : entry.term;
}

/**
 * Cuts a line to the example length.
 * @param line - The example line.
 * @returns The line, or its start and an ellipsis when it is long.
 */
function shorten(line: string): string {
  return line.length > EXAMPLE_MAX ? `${line.slice(0, EXAMPLE_MAX - 1)}…` : line;
}

/**
 * Builds the labels and the Open and Copy actions for the list.
 * Open skips the URLs that are open in the current window and sends at most one batch.
 * @param args - The list text and its setter, the known tabs, and the copy format.
 * @returns The labels, the example, the status and error text, and the two actions.
 */
export function useListActions({ text, setText, known, format }: ListActionsArgs): ListActions {
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(new Set());
  const [{ text: status, seq: statusSeq }, setStatusState] = useState({ text: '', seq: 0 });
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [resumeText, setResumeText] = useState<string | null>(null);

  const setStatus = useCallback((message: string): void => {
    setStatusState((previous) => ({ text: message, seq: previous.seq + 1 }));
  }, []);

  const refreshOpenKeys = useCallback(async (): Promise<void> => {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      setOpenKeys(
        new Set(
          tabs.flatMap((tab) => {
            const url = tab.url || tab.pendingUrl;
            return url ? [urlKey(url)] : [];
          })
        )
      );
    } catch {
      // Keep the last lookup. A wrong label is better than a broken popup.
    }
  }, []);

  useEffect(() => {
    void refreshOpenKeys();
  }, [refreshOpenKeys]);

  const parsed = useMemo(() => parseList(text), [text]);
  const plan = useMemo(() => planOpen(text, openKeys, CONFIG.MAX_TABS), [text, openKeys]);
  const urlGroups = parsed.groups
    .map((group) => group.flatMap((entry) => (entry.kind === 'url' ? [entry.url] : [])))
    .filter((group) => group.length > 0);
  const urlCount = urlGroups.flat().length;
  const first = urlGroups[0]?.[0];

  /** Sends one batch to the service worker and updates the list from the reply. */
  async function open(): Promise<void> {
    setError(null);
    setStatus('');
    if (parsed.entries.length === 0) {
      setError(EMPTY_LIST_ERROR);
      return;
    }
    if (plan.batch.length === 0) {
      const count = plan.skipped.length;
      setStatus(`All ${counted(count, 'URL')} ${count === 1 ? 'is' : 'are'} already open.`);
      return;
    }
    setRunning(true);
    try {
      const raw = await chrome.runtime.sendMessage(
        OpenListMessageSchema.parse({ action: 'openList', urls: plan.batch.map(lineOf).join('\n') })
      );
      const reply = OpenListResponseSchema.safeParse(raw);
      if (!reply.success) {
        setError('Failed to open tabs');
        return;
      }
      const { opened, errors } = reply.data.results;
      if (errors.length > 0 || opened.length === 0) {
        setError(errors.join('\n') || 'Failed to open tabs');
      }
      if (opened.length === 0) return;
      const openedLines = new Set(opened);
      const openedEntries = plan.batch.filter((entry) => openedLines.has(lineOf(entry)));
      const next = remainingText(text, plan, openedEntries);
      setText(next);
      setResumeText(next);
      const skipped =
        plan.skipped.length > 0 ? `, skipped ${plan.skipped.length} already open` : '';
      setStatus(`Opened ${openedEntries.length}${skipped}.`);
      await refreshOpenKeys();
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  /** Formats the URLs in the list and writes them to the clipboard. */
  async function copy(): Promise<void> {
    setError(null);
    setStatus('');
    if (urlCount === 0) {
      setStatus('Nothing to copy.');
      return;
    }
    setRunning(true);
    try {
      await writeClipboard(formatTabs(format, resolveTabs(urlGroups, known)));
      const searches = parsed.entries.length - urlCount;
      const skipped = searches > 0 ? `, skipped ${counted(searches, 'search term')}` : '';
      setStatus(`Copied ${urlCount} as ${format}${skipped}.`);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return {
    openLabel: openLabel(plan, CONFIG.MAX_TABS, resumeText !== null && resumeText === text),
    copyLabel: `Copy ${urlCount} as ${format}`,
    example:
      first === undefined
        ? ''
        : shorten(formatExample(format, resolveTabs([[first]], known)[0][0])),
    status,
    statusSeq,
    error,
    running,
    open,
    copy,
  };
}
