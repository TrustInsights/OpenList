// Unit tests for components/SourceSelect.tsx

import { SourceSelect } from '@/components/SourceSelect';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

const OPTIONS = [
  { id: 'window', label: 'This window (3)' },
  { id: 'tab', label: 'This tab (1)' },
  { id: 'all', label: 'All windows (3)' },
] as const;

describe('SourceSelect', () => {
  it('has no accessibility violations and a visible "From" label', async () => {
    const { container } = render(
      <SourceSelect options={OPTIONS} value="window" onChange={() => undefined} />
    );
    expect(await axe(container)).toHaveNoViolations();
    expect(screen.getByLabelText('From')).toBe(screen.getByRole('combobox'));
  });

  it('lists the option labels in order and selects the value', () => {
    render(<SourceSelect options={OPTIONS} value="tab" onChange={() => undefined} />);
    const labels = screen.getAllByRole('option').map((option) => option.textContent);
    expect(labels).toEqual(['This window (3)', 'This tab (1)', 'All windows (3)']);
    expect(screen.getByRole('combobox')).toHaveValue('tab');
  });

  it('calls onChange with the id of the chosen option', async () => {
    const onChange = vi.fn();
    render(<SourceSelect options={OPTIONS} value="window" onChange={onChange} />);
    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'All windows (3)');
    expect(onChange).toHaveBeenCalledWith('all');
  });

  it('ignores a value that is not an option', () => {
    const onChange = vi.fn();
    render(<SourceSelect options={OPTIONS} value="window" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bogus' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
