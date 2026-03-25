import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorDisplay } from './ErrorDisplay';

describe('ErrorDisplay', () => {
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

  it('shows exactly 1 overflow message for exactly 4 details', () => {
    const details = ['Error 1', 'Error 2', 'Error 3', 'Error 4'];
    render(<ErrorDisplay message="4 errors" details={details} />);
    expect(screen.getByText('...and 1 more errors')).toBeInTheDocument();
  });
});
