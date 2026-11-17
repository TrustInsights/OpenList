// Test harness: runs useListActions with a real text state, as the popup does

import { useListActions } from '@/hooks/useListActions';
import type { Format } from '@/schemas/settings';
import type { TabRecord } from '@/schemas/tab';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { expect, vi } from 'vitest';

/** What the harness returns: the actions plus the text and its setter. */
type Harness = ReturnType<typeof useListActions> & {
  text: string;
  setText: (text: string) => void;
};

/**
 * Renders useListActions with a text state and waits for the open-tab lookup.
 * @param initial - The first list text.
 * @param options - The known tabs, the format, the URLs already open, or raw tabs (or an error) from tabs.query.
 * @returns The hook result.
 */
export async function renderActions(
  initial: string,
  options: {
    known?: TabRecord[];
    format?: Format;
    open?: string[];
    tabs?: Partial<chrome.tabs.Tab>[] | Error;
  } = {}
): Promise<{ current: Harness }> {
  const { tabs } = options;
  if (tabs instanceof Error) {
    vi.mocked(chrome.tabs.query).mockRejectedValue(tabs);
  } else {
    vi.mocked(chrome.tabs.query).mockResolvedValue(
      (tabs ?? (options.open ?? []).map((url) => ({ url }))) as chrome.tabs.Tab[]
    );
  }
  const view = renderHook(() => {
    const [text, setText] = useState(initial);
    const actions = useListActions({
      text,
      setText,
      known: options.known ?? [],
      format: options.format ?? 'URL',
    });
    return { ...actions, text, setText };
  });
  await waitFor(() => expect(chrome.tabs.query).toHaveBeenCalled());
  // The open-tab keys land in state after the lookup settles, so wait for that before a test acts.
  await act(async () => {
    await Promise.allSettled(vi.mocked(chrome.tabs.query).mock.results.map((r) => r.value));
  });
  await waitFor(() => expect(view.result.current.running).toBe(false));
  return view.result;
}
