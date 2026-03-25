import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('renders the TrustInsights.ai link', () => {
    render(<Footer />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://www.trustinsights.ai?utm_source=openlist&utm_medium=referral&utm_campaign=openlist_1_0'
    );
  });

  it('link has target="_blank"', () => {
    render(<Footer />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('link has rel="noreferrer"', () => {
    render(<Footer />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('link text matches expected', () => {
    render(<Footer />);
    expect(screen.getByText('OpenList 1.0 brought to you by TrustInsights.ai')).toBeInTheDocument();
  });
});
