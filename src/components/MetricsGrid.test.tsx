import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricsGrid } from './MetricsGrid';

describe('MetricsGrid', () => {
  const defaultProps = {
    successRate: '95.0',
    tabsOpened: 42,
    tabsFailed: 3,
    uptime: '5m 10s',
  };

  it('renders "Success Rate" with value "${successRate}%"', () => {
    render(<MetricsGrid {...defaultProps} />);
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument();
  });

  it('renders "Tabs Opened" with tabsOpened value', () => {
    render(<MetricsGrid {...defaultProps} />);
    expect(screen.getByText('Tabs Opened')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders "Errors" with tabsFailed value', () => {
    render(<MetricsGrid {...defaultProps} />);
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "Uptime" with uptime value', () => {
    render(<MetricsGrid {...defaultProps} />);
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('5m 10s')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    render(<MetricsGrid successRate="100" tabsOpened={0} tabsFailed={0} uptime="0s" />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    // There will be two zeros (tabsOpened and tabsFailed)
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(2);
    expect(screen.getByText('0s')).toBeInTheDocument();
  });
});
