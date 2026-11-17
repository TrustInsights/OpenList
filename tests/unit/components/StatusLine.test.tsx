// Unit tests for components/StatusLine.tsx

import { StatusLine } from '@/components/StatusLine';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

describe('StatusLine', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<StatusLine message="Copied 3 as URL." id="a-1" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders the message in a role=status element', () => {
    render(<StatusLine message="Opened 4, skipped 2 already open." id="a-1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Opened 4, skipped 2 already open.');
  });

  it('renders an empty role=status element when there is no message', () => {
    render(<StatusLine message="" id="start" />);
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
  });

  it('replaces the text node when the same message comes with a new id', () => {
    const { rerender } = render(<StatusLine message="Nothing to copy." id="a-1" />);
    const first = screen.getByText('Nothing to copy.');
    rerender(<StatusLine message="Nothing to copy." id="a-1" />);
    expect(screen.getByText('Nothing to copy.')).toBe(first);
    rerender(<StatusLine message="Nothing to copy." id="a-2" />);
    expect(screen.getByText('Nothing to copy.')).not.toBe(first);
    expect(screen.getByRole('status')).toHaveTextContent(/^Nothing to copy\.$/);
  });

  it('never renders an alert', () => {
    render(<StatusLine message="Copied 3 as URL." id="a-1" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
