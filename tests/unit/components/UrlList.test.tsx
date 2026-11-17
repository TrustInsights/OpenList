// Unit tests for components/UrlList.tsx

import { UrlList } from '@/components/UrlList';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { axe } from 'vitest-axe';

/** Renders UrlList with its own text state, as the popup does. */
function Harness({
  initial,
  onOpen,
  invalid = false,
}: { initial: string; onOpen: () => void; invalid?: boolean }): React.JSX.Element {
  const [value, setValue] = useState(initial);
  return (
    <>
      <UrlList
        value={value}
        onChange={setValue}
        invalid={invalid}
        describedBy={invalid ? 'list-error' : undefined}
        onOpen={onOpen}
      />
      <button type="button" onClick={() => setValue('https://late.com/\nhttps://later.com/')}>
        load
      </button>
    </>
  );
}

describe('UrlList', () => {
  it('has no accessibility violations and a visible label', async () => {
    const { container } = render(<Harness initial="" onOpen={() => undefined} />);
    expect(await axe(container)).toHaveNoViolations();
    expect(screen.getByLabelText('URLs, one per line')).toBe(screen.getByRole('textbox'));
  });

  it('has no accessibility violations when invalid and described', async () => {
    const { container } = render(
      <>
        <Harness initial="" invalid onOpen={() => undefined} />
        <p id="list-error">Please enter some URLs or text to search.</p>
      </>
    );
    expect(await axe(container)).toHaveNoViolations();
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Please enter some URLs or text to search.');
  });

  it('is not marked invalid by default', () => {
    render(<Harness initial="" onOpen={() => undefined} />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('focuses the box and selects all text on mount', () => {
    render(<Harness initial={'https://a.com/\nhttps://b.com/'} onOpen={() => undefined} />);
    const box = screen.getByRole<HTMLTextAreaElement>('textbox');
    expect(box).toHaveFocus();
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe(box.value.length);
  });

  it('selects all text that arrives after mount, once', async () => {
    render(<Harness initial="" onOpen={() => undefined} />);
    const box = screen.getByRole<HTMLTextAreaElement>('textbox');
    expect(box).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'load' }));
    expect(box.selectionStart).toBe(0);
    expect(box.selectionEnd).toBe(box.value.length);
    box.setSelectionRange(3, 3);
    fireEvent.click(screen.getByRole('button', { name: 'load' }));
    expect(box.selectionStart).toBe(3);
  });

  it('does not select the text after the user typed', async () => {
    const user = userEvent.setup();
    render(<Harness initial="" onOpen={() => undefined} />);
    const box = screen.getByRole<HTMLTextAreaElement>('textbox');
    await user.type(box, 'a');
    fireEvent.click(screen.getByRole('button', { name: 'load' }));
    expect(box.selectionStart).toBe(box.selectionEnd);
  });

  it('calls onOpen for Ctrl+Enter and for Cmd+Enter', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="https://a.com/" onOpen={onOpen} />);
    await user.keyboard('{Control>}{Enter}{/Control}');
    expect(onOpen).toHaveBeenCalledTimes(1);
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('does not call onOpen for plain Enter or for Ctrl with another key', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial="https://a.com/" onOpen={onOpen} />);
    await user.keyboard('{Enter}');
    await user.keyboard('{Control>}a{/Control}');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('reports each edit through onChange', async () => {
    const user = userEvent.setup();
    render(<Harness initial="" onOpen={() => undefined} />);
    await user.type(screen.getByRole('textbox'), 'abc');
    expect(screen.getByRole('textbox')).toHaveValue('abc');
  });
});
