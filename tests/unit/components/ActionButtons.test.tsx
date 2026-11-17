// Unit tests for components/ActionButtons.tsx

import { ActionButtons } from '@/components/ActionButtons';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

/** Renders the buttons with test labels. */
function setup(disabled = false): { onOpen: () => void; onCopy: () => void } {
  const onOpen = vi.fn();
  const onCopy = vi.fn();
  render(
    <ActionButtons
      openLabel="Open 0 URLs"
      copyLabel="Copy 3 as URL"
      onOpen={onOpen}
      onCopy={onCopy}
      disabled={disabled}
      openDisabled={false}
    />
  );
  return { onOpen, onCopy };
}

describe('ActionButtons', () => {
  it('disables only Open, and keeps Copy live, when every URL is already open', () => {
    render(
      <ActionButtons
        openLabel="All open"
        copyLabel="Copy 3 as URL"
        onOpen={() => undefined}
        onCopy={() => undefined}
        disabled={false}
        openDisabled
      />
    );
    expect(screen.getByRole('button', { name: 'All open' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy 3 as URL' })).toBeEnabled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ActionButtons
        openLabel="Open 3 URLs"
        copyLabel="Copy 3 as URL"
        onOpen={() => undefined}
        onCopy={() => undefined}
        disabled={false}
        openDisabled={false}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders Open before Copy and gives only Open the btn-open class', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual(['Open 0 URLs', 'Copy 3 as URL']);
    expect(buttons[0]).toHaveClass('btn-open');
    expect(buttons[0]).not.toHaveClass('btn-copy');
    expect(buttons[1]).toHaveClass('btn-copy');
    expect(buttons[1]).not.toHaveClass('btn-open');
    for (const button of buttons) expect(button).toHaveAttribute('type', 'button');
  });

  it('calls the handler of the clicked button', async () => {
    const { onOpen, onCopy } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Open 0 URLs' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onCopy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Copy 3 as URL' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('disables both buttons while an action runs', async () => {
    const { onOpen, onCopy } = setup(true);
    const user = userEvent.setup();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
      await user.click(button);
    }
    expect(onOpen).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();
  });
});
