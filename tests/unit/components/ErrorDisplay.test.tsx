// Unit tests for components/ErrorDisplay.tsx

import { ErrorDisplay } from '@/components/ErrorDisplay';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('ErrorDisplay', () => {
  it('is a role=alert block and carries the id it is given', () => {
    render(<ErrorDisplay id="list-error" message="Bad list" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('id', 'list-error');
    expect(alert).toHaveTextContent('Bad list');
  });

  it('renders no id attribute when none is given', () => {
    render(<ErrorDisplay message="Bad list" />);
    expect(screen.getByRole('alert')).not.toHaveAttribute('id');
  });

  it('renders message text', () => {
    render(<ErrorDisplay message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders no details list when details is undefined', () => {
    render(<ErrorDisplay message="Error occurred" />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders no details list when details is empty array', () => {
    render(<ErrorDisplay message="Error occurred" details={[]} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders up to 3 details items', () => {
    const details = ['Error 1', 'Error 2', 'Error 3'];
    render(<ErrorDisplay message="Multiple errors" details={details} />);
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
    expect(screen.getByText('Error 3')).toBeInTheDocument();
    expect(screen.queryByText(/more errors/)).not.toBeInTheDocument();
  });

  it('shows "...and N more errors" when details.length > 3', () => {
    const details = ['Error 1', 'Error 2', 'Error 3', 'Error 4', 'Error 5'];
    render(<ErrorDisplay message="Many errors" details={details} />);
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
    expect(screen.getByText('Error 3')).toBeInTheDocument();
    expect(screen.queryByText('Error 4')).not.toBeInTheDocument();
    expect(screen.queryByText('Error 5')).not.toBeInTheDocument();
    expect(screen.getByText('...and 2 more errors')).toBeInTheDocument();
  });

  it('details list appears when details has items', () => {
    const details = ['Error A', 'Error B'];
    render(<ErrorDisplay message="Some errors" details={details} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
  });

  it('renders two items for duplicate details and logs no duplicate-key warning', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(<ErrorDisplay message="Repeated" details={['a', 'a']} />);
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      const keyWarnings = errorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('same key'))
      );
      expect(keyWarnings).toHaveLength(0);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('shows exactly 1 overflow message for exactly 4 details', () => {
    const details = ['Error 1', 'Error 2', 'Error 3', 'Error 4'];
    render(<ErrorDisplay message="4 errors" details={details} />);
    expect(screen.getByText('...and 1 more errors')).toBeInTheDocument();
  });
});
