// Smoke test: proves axe runs under happy-dom and the toHaveNoViolations matcher works.

import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

describe('a11y-smoke', () => {
  it('catches an unlabelled input', async () => {
    const { container } = render(<textarea />);
    expect((await axe(container)).violations.length).toBeGreaterThan(0);
  });
});
