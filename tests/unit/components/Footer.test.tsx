// Unit tests for components/Footer.tsx

import { Footer } from '@/components/Footer';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetManifest = vi.mocked(chrome.runtime.getManifest);

function mockVersion(version: string): void {
  mockGetManifest.mockReturnValue({ version } as chrome.runtime.Manifest);
}

describe('Footer', () => {
  beforeEach(() => {
    mockVersion('1.1.0');
  });

  it('renders the TrustInsights.ai link with the manifest version in the campaign', () => {
    render(<Footer />);
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toContain('utm_campaign=openlist_1_1_0');
    expect(link).toHaveAttribute(
      'href',
      'https://www.trustinsights.ai?utm_source=openlist&utm_medium=referral&utm_campaign=openlist_1_1_0'
    );
  });

  it('link text contains the manifest version', () => {
    render(<Footer />);
    expect(screen.getByRole('link').textContent).toContain('OpenList 1.1.0');
    expect(
      screen.getByText('OpenList 1.1.0 brought to you by TrustInsights.ai')
    ).toBeInTheDocument();
  });

  it('follows a different manifest version', () => {
    mockVersion('2.10.3');
    render(<Footer />);
    expect(screen.getByRole('link').textContent).toBe(
      'OpenList 2.10.3 brought to you by TrustInsights.ai'
    );
    expect(screen.getByRole('link').getAttribute('href')).toContain('utm_campaign=openlist_2_10_3');
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
});
