// Opens the URLs of a right-click selection: reads the text like the popup, skips open tabs, and shows the result

import { showResult } from '@/background/feedback';
import { openList } from '@/background/open-list';
import { CONFIG } from '@/schemas/config';
import { urlKey } from '@/utils/extract-urls';
import { type OpenPlan, entryUrl, planOpen } from '@/utils/open-plan';

/**
 * Writes the result message of the right-click path.
 * @param plan - What the planner chose.
 * @param opened - How many tabs opened.
 * @param failed - How many tabs failed.
 * @returns For example "Opened 4, skipped 2 already open."
 */
function summary(plan: OpenPlan, opened: number, failed: number): string {
  const parts = [`Opened ${opened}`];
  if (plan.skipped.length > 0) parts.push(`skipped ${plan.skipped.length} already open`);
  if (plan.waiting.length > 0)
    parts.push(`${plan.waiting.length} more over the limit of ${CONFIG.MAX_TABS}`);
  if (failed > 0) parts.push(`${failed} failed`);
  return `${parts.join(', ')}.`;
}

/**
 * Opens the URLs in the selected text with the same rules as the popup: it finds addresses in any pasted
 * format, skips pages that are already open in the window, and opens at most MAX_TABS tabs. The toolbar
 * icon shows the result for a few seconds.
 * @param text - The selected text.
 * @param windowId - The window of the page where the user selected the text, if known.
 * @returns A promise that resolves when the tabs are open and the result is shown.
 */
export async function openSelection(text: string, windowId?: number): Promise<void> {
  const tabs = await chrome.tabs.query(
    windowId === undefined ? { currentWindow: true } : { windowId }
  );
  const open = new Set(
    tabs.flatMap((tab) => {
      const url = tab.url || tab.pendingUrl;
      return url ? [urlKey(url)] : [];
    })
  );
  const plan = planOpen(text, open, CONFIG.MAX_TABS);
  if (plan.batch.length === 0) {
    const allOpen = plan.skipped.length > 0;
    await showResult(
      allOpen ? `All ${plan.skipped.length} already open.` : 'Nothing to open.',
      allOpen
    );
    return;
  }
  const result = await openList(plan.batch.map(entryUrl));
  await showResult(summary(plan, result.successful, result.failed), result.failed === 0);
}
