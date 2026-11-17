// Unit tests for components/ClipboardPrompt.tsx

import { ClipboardPrompt } from '@/components/ClipboardPrompt';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';

describe('ClipboardPrompt', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <ClipboardPrompt onEnable={() => undefined} onDismiss={() => undefined} />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('states that the clipboard text is never saved or sent', () => {
    render(<ClipboardPrompt onEnable={() => undefined} onDismiss={() => undefined} />);
    expect(screen.getByText(/never saved or sent/)).toBeInTheDocument();
  });

  it('calls onEnable for "Turn on clipboard detection"', async () => {
    const onEnable = vi.fn();
    const onDismiss = vi.fn();
    render(<ClipboardPrompt onEnable={onEnable} onDismiss={onDismiss} />);
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Turn on clipboard detection' }));
    expect(onEnable).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss for "Not now"', async () => {
    const onEnable = vi.fn();
    const onDismiss = vi.fn();
    render(<ClipboardPrompt onEnable={onEnable} onDismiss={onDismiss} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Not now' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onEnable).not.toHaveBeenCalled();
  });

  it('hides "Not now" when there is no onDismiss', () => {
    render(<ClipboardPrompt onEnable={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Not now' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
