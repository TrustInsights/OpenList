// Unit tests for components/FormatSelect.tsx

import { FormatSelect } from '@/components/FormatSelect';
import { FORMATS } from '@/schemas/settings';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

describe('FormatSelect', () => {
  it('has no accessibility violations and a visible "Copy as" label', async () => {
    const { container } = render(
      <FormatSelect value="URL" onChange={() => undefined} example="https://a.com/" />
    );
    expect(await axe(container)).toHaveNoViolations();
    expect(screen.getByLabelText('Copy as')).toBe(screen.getByRole('combobox'));
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('Example: https://a.com/');
  });

  it('lists 10 options in 3 optgroups in the Global Constraints order', () => {
    const { container } = render(
      <FormatSelect value="URL" onChange={() => undefined} example="" />
    );
    const groups = Array.from(container.querySelectorAll('optgroup'));
    expect(groups.map((group) => group.label)).toEqual(['Plain text', 'Markup', 'Data']);
    const options = screen.getAllByRole('option').map((option) => option.textContent);
    expect(options).toHaveLength(10);
    expect(options).toEqual([...FORMATS]);
    expect(groups.map((group) => group.querySelectorAll('option').length)).toEqual([3, 4, 3]);
  });

  it('selects the value and describes the control with the example', () => {
    render(
      <FormatSelect
        value="Markdown"
        onChange={() => undefined}
        example="- [Site 1](https://site1.com/)"
      />
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('Markdown');
    expect(select).toHaveAccessibleDescription('Example: - [Site 1](https://site1.com/)');
  });

  it('shows no example text when the list holds no URL', () => {
    render(<FormatSelect value="URL" onChange={() => undefined} example="" />);
    expect(screen.getByRole('combobox')).toHaveAccessibleDescription('');
  });

  it('calls onChange with the chosen format', async () => {
    const onChange = vi.fn();
    render(<FormatSelect value="URL" onChange={onChange} example="" />);
    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'HTML table');
    expect(onChange).toHaveBeenCalledWith('HTML table');
  });

  it('ignores a value that is not a format', () => {
    const onChange = vi.fn();
    render(<FormatSelect value="URL" onChange={onChange} example="" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bogus' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
