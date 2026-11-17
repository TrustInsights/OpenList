// Unit tests for components/ErrorDisplay.tsx

import { ErrorDisplay } from '@/components/ErrorDisplay';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});
