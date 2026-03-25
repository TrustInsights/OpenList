import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBar } from './StatusBar';

describe('StatusBar', () => {
  it('renders message text', () => {
    render(<StatusBar message="Operation complete" />);
    expect(screen.getByText('Operation complete')).toBeInTheDocument();
  });

  it('has id="status"', () => {
    render(<StatusBar message="Ready" />);
    const element = screen.getByText('Ready');
    expect(element).toHaveAttribute('id', 'status');
  });

  it('no className when isError is false (default)', () => {
    render(<StatusBar message="Ready" />);
    const element = document.getElementById('status');
    // StatusBar renders a plain <span id="status"> with no className attribute
    expect(element).not.toBeNull();
    expect(element?.className).toBe('');
  });

  it('renders empty message', () => {
    render(<StatusBar message="" />);
    const element = document.getElementById('status');
    expect(element).not.toBeNull();
    expect(element?.textContent).toBe('');
  });
});
