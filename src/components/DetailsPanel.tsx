// Popup Details section: the totals, the session start, a Refresh button, and extra content

import type { Totals } from '@/types';
import type { ReactNode } from 'react';

/** What the panel needs from the popup. */
interface DetailsPanelProps {
  totals: Totals;
  openSince: number;
  onRefresh: () => void;
  /** Called each time the user opens or closes the section, with the new state. */
  onToggle?: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * Writes the success rate of the totals.
 * @param totals - The stored totals.
 * @returns A percent with at most one decimal. 100% when nothing was processed.
 */
function successRate(totals: Totals): string {
  if (totals.urlsProcessed === 0) return '100%';
  return `${Math.round((totals.tabsOpened / totals.urlsProcessed) * 1000) / 10}%`;
}

/**
 * Writes the start of the browser session.
 * @param openSince - The start time in milliseconds, or 0 when it is not known.
 * @returns The date and time in the user locale, or "Unknown".
 */
function sessionStart(openSince: number): string {
  if (openSince <= 0) return 'Unknown';
  return new Date(openSince).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Renders the Details disclosure. It is closed by default.
 * @param props - The totals, the session start, the refresh action, the toggle action, and the children.
 * @returns The details element.
 */
export function DetailsPanel({
  totals,
  openSince,
  onRefresh,
  onToggle,
  children,
}: DetailsPanelProps): React.JSX.Element {
  return (
    <details className="details" onToggle={(event) => onToggle?.(event.currentTarget.open)}>
      <summary>Details</summary>
      <dl className="metrics">
        <div>
          <dt>Success rate</dt>
          <dd>{successRate(totals)}</dd>
        </div>
        <div>
          <dt>Tabs opened</dt>
          <dd>{totals.tabsOpened}</dd>
        </div>
        <div>
          <dt>Errors</dt>
          <dd>{totals.tabsFailed}</dd>
        </div>
        <div>
          <dt>Open since</dt>
          <dd>{sessionStart(openSince)}</dd>
        </div>
      </dl>
      <div className="details-actions">
        <button type="button" className="btn-plain" onClick={onRefresh}>
          Refresh
        </button>
        {children}
      </div>
    </details>
  );
}
