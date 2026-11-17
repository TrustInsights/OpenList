// Hook that fills the list from a source (tabs or clipboard) and tracks the From choice

import type { SourceId } from '@/schemas/settings';
import type { TabRecord } from '@/schemas/tab';
import {
  hasClipboardPermission,
  readClipboardUrls,
  requestClipboardPermission,
} from '@/utils/clipboard';
import { getClipboardPromptDismissed, setClipboardPromptDismissed } from '@/utils/settings-store';
import { type SourceCounts, chooseDefaultSource, sourceOptions } from '@/utils/source-choice';
import { type LoadedTabs, loadTabs } from '@/utils/tabs-source';
import { useCallback, useEffect, useRef, useState } from 'react';

/** The state the popup shows for the list and its source. */
interface SourcesState {
  options: ReadonlyArray<{ id: SourceId; label: string }>;
  source: SourceId;
  text: string;
  setText: (text: string) => void;
  changeSource: (id: SourceId) => void;
  notice: string;
  /** Goes up on every notice write, so a repeated notice still counts as a new result. */
  noticeSeq: number;
  clipboardPrompt: 'hidden' | 'button' | 'details';
  enableClipboard: () => Promise<void>;
  dismissPrompt: () => void;
  known: TabRecord[];
}

/** What a source picks: its id, the list text, and the notice for the status line. */
interface Pick {
  source: SourceId;
  text: string;
  notice: string;
}

const NO_TABS: LoadedTabs = { active: null, window: [], selected: [], all: [], known: [] };

/** The name of each source in the "List replaced" notice. */
const SOURCE_NAMES: Record<SourceId, string> = {
  selected: 'selected tabs',
  clipboard: 'clipboard',
  window: 'this window',
  tab: 'this tab',
  all: 'all windows',
};

/**
 * Lists the URLs of tabs.
 * @param tabs - The tab records.
 * @returns Their URLs in order.
 */
function urlsOf(tabs: readonly TabRecord[]): string[] {
  return tabs.map((tab) => tab.url);
}

/**
 * Counts the URLs each source holds.
 * @param loaded - The open tabs.
 * @param clipboard - The URLs found in the clipboard.
 * @returns The counts that drive the source choice.
 */
function countsOf(loaded: LoadedTabs, clipboard: readonly string[]): SourceCounts {
  return {
    selected: loaded.selected.length,
    clipboard: clipboard.length,
    window: loaded.window.length,
    all: loaded.all.flat().length,
  };
}

/**
 * Builds the list text of a source. The all-windows source puts a blank line between windows.
 * @param id - The source.
 * @param loaded - The open tabs.
 * @param clipboard - The URLs found in the clipboard.
 * @returns The URLs of the source, one per line.
 */
function textOf(id: SourceId, loaded: LoadedTabs, clipboard: readonly string[]): string {
  const byId: Record<SourceId, string[][]> = {
    selected: [urlsOf(loaded.selected)],
    clipboard: [[...clipboard]],
    window: [urlsOf(loaded.window)],
    tab: [loaded.active === null ? [] : [loaded.active.url]],
    all: loaded.all.map(urlsOf).filter((group) => group.length > 0),
  };
  return byId[id].map((group) => group.join('\n')).join('\n\n');
}

/**
 * Picks the starting source and its text.
 * @param loaded - The open tabs.
 * @param clipboard - The URLs found in the clipboard.
 * @returns The source, the list text, and the clipboard notice when the clipboard wins.
 */
function pickDefault(loaded: LoadedTabs, clipboard: readonly string[]): Pick {
  const source = chooseDefaultSource(countsOf(loaded, clipboard));
  return {
    source,
    text: textOf(source, loaded, clipboard),
    notice: source === 'clipboard' ? `Using ${clipboard.length} URLs from your clipboard.` : '',
  };
}

/**
 * Writes the notice for a source change.
 * @param id - The chosen source.
 * @param text - The new list text.
 * @returns For example "List replaced with 12 tabs from all windows."
 */
function replacedNotice(id: SourceId, text: string): string {
  const count = text.split(/\n+/).filter(Boolean).length;
  const noun = id === 'clipboard' ? 'URL' : 'tab';
  return `List replaced with ${count} ${noun}${count === 1 ? '' : 's'} from ${SOURCE_NAMES[id]}.`;
}

/**
 * Loads the tabs and the clipboard once, fills the list, and handles the From control.
 * A user edit or a user choice is never overwritten by a late load.
 * One dismissal of the clipboard button is saved, so the button stays in Details on later opens.
 * @returns The options, the list text, the notice, and the clipboard prompt state.
 */
export function useSources(): SourcesState {
  const [loaded, setLoaded] = useState<LoadedTabs>(NO_TABS);
  const [clipboard, setClipboard] = useState<string[]>([]);
  const [source, setSource] = useState<SourceId>('window');
  const [text, setTextState] = useState('');
  const [{ text: notice, seq: noticeSeq }, setNoticeState] = useState({ text: '', seq: 0 });
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [dismissed, setDismissed] = useState(false);
  const touched = useRef(false);

  const setNotice = useCallback((message: string): void => {
    setNoticeState((previous) => ({ text: message, seq: previous.seq + 1 }));
  }, []);

  const applyPick = useCallback(
    (pick: Pick): void => {
      setSource(pick.source);
      setTextState(pick.text);
      setNotice(pick.notice);
    },
    [setNotice]
  );

  useEffect(() => {
    let current = true;
    (async (): Promise<void> => {
      try {
        const [tabs, granted, urls, wasDismissed] = await Promise.all([
          loadTabs(),
          hasClipboardPermission(),
          readClipboardUrls(),
          getClipboardPromptDismissed().catch(() => false),
        ]);
        if (!current) return;
        setLoaded(tabs);
        setDismissed((already) => already || wasDismissed);
        const found = urls ?? [];
        setClipboard(found);
        setPermission(granted ? 'granted' : 'denied');
        if (!touched.current) applyPick(pickDefault(tabs, found));
      } catch {
        if (current) setNotice('Could not read your open tabs.');
      }
    })();
    return () => {
      current = false;
    };
  }, [applyPick, setNotice]);

  return {
    options: sourceOptions(countsOf(loaded, clipboard)),
    source,
    text,
    setText: (next: string): void => {
      touched.current = true;
      setTextState(next);
    },
    changeSource: (id: SourceId): void => {
      touched.current = true;
      const next = textOf(id, loaded, clipboard);
      setSource(id);
      setTextState(next);
      setNotice(replacedNotice(id, next));
    },
    notice,
    noticeSeq,
    clipboardPrompt: permission === 'denied' ? (dismissed ? 'details' : 'button') : 'hidden',
    enableClipboard: async (): Promise<void> => {
      if (!(await requestClipboardPermission())) return;
      const urls = (await readClipboardUrls()) ?? [];
      setClipboard(urls);
      setPermission('granted');
      if (!touched.current) applyPick(pickDefault(loaded, urls));
    },
    dismissPrompt: (): void => {
      setDismissed(true);
      setClipboardPromptDismissed().catch(() => undefined);
    },
    known: loaded.known,
  };
}
