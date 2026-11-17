// Unit tests for components/DetailsPanel.tsx

import { DetailsPanel } from '@/components/DetailsPanel';
import type { Totals } from '@/types';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const TOTALS: Totals = { tabsOpened: 5, tabsFailed: 1, urlsProcessed: 6 };

/** The Open since time of 16 Nov 2026, 09:41 in the local time zone. */
const OPEN_SINCE = new Date(2026, 10, 16, 9, 41).getTime();

/** Reads the value that sits under a term in the details list. */
function textUnder(term: string): string {
  const label = screen.getByText(term, { selector: 'dt' });
  return label.parentElement?.querySelector('dd')?.textContent ?? '';
}

describe('DetailsPanel', () => {
  it('has no accessibility violations when closed and when open', async () => {
    const { container } = render(
      <DetailsPanel totals={TOTALS} openSince={OPEN_SINCE} onRefresh={() => undefined}>
        <p>child</p>
      </DetailsPanel>
    );
    expect(await axe(container)).toHaveNoViolations();
    container.querySelector('details')?.setAttribute('open', '');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('is closed by default', () => {
    const { container } = render(
      <DetailsPanel totals={TOTALS} openSince={OPEN_SINCE} onRefresh={() => undefined} />
    );
    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('Details', { selector: 'summary' })).toBeInTheDocument();
  });

  it('shows the four values with their labels', () => {
    render(<DetailsPanel totals={TOTALS} openSince={OPEN_SINCE} onRefresh={() => undefined} />);
    expect(textUnder('Success rate')).toBe('83.3%');
    expect(textUnder('Tabs opened')).toBe('5');
    expect(textUnder('Errors')).toBe('1');
    const since = textUnder('Open since');
    expect(since).toMatch(/41/);
    expect(since).toMatch(/16/);
  });

  it('shows 100% when nothing was processed and a whole rate without a decimal', () => {
    const { rerender } = render(
      <DetailsPanel
        totals={{ ...TOTALS, tabsOpened: 0, tabsFailed: 0, urlsProcessed: 0 }}
        openSince={OPEN_SINCE}
        onRefresh={() => undefined}
      />
    );
    expect(textUnder('Success rate')).toBe('100%');
    rerender(
      <DetailsPanel
        totals={{ ...TOTALS, tabsOpened: 4, tabsFailed: 0, urlsProcessed: 4 }}
        openSince={OPEN_SINCE}
        onRefresh={() => undefined}
      />
    );
    expect(textUnder('Success rate')).toBe('100%');
  });

  it('shows Unknown when the session start is not known', () => {
    render(<DetailsPanel totals={TOTALS} openSince={0} onRefresh={() => undefined} />);
    expect(textUnder('Open since')).toBe('Unknown');
  });

  it('calls onRefresh when Refresh is clicked', async () => {
    const onRefresh = vi.fn();
    render(<DetailsPanel totals={TOTALS} openSince={OPEN_SINCE} onRefresh={onRefresh} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh', hidden: true }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('reports each open and close to onToggle, and works without it', async () => {
    const onToggle = vi.fn();
    const { container } = render(
      <DetailsPanel
        totals={TOTALS}
        openSince={OPEN_SINCE}
        onRefresh={() => undefined}
        onToggle={onToggle}
      />
    );
    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    await waitFor(() => expect(onToggle).toHaveBeenLastCalledWith(true));
    details.open = false;
    await waitFor(() => expect(onToggle).toHaveBeenLastCalledWith(false));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('ignores a toggle when no onToggle is given', async () => {
    const { container } = render(
      <DetailsPanel totals={TOTALS} openSince={OPEN_SINCE} onRefresh={() => undefined} />
    );
    const details = container.querySelector('details') as HTMLDetailsElement;
    details.open = true;
    await waitFor(() => expect(details).toHaveAttribute('open'));
    details.dispatchEvent(new Event('toggle'));
    expect(details.open).toBe(true);
  });

  it('renders its children', () => {
    render(
      <DetailsPanel totals={TOTALS} openSince={OPEN_SINCE} onRefresh={() => undefined}>
        <p>inside details</p>
      </DetailsPanel>
    );
    expect(screen.getByText('inside details')).toBeInTheDocument();
  });
});
