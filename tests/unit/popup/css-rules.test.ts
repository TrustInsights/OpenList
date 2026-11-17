// Tests for the popup CSS rules the spec names: hover only for a fine pointer, no motion when reduced

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FILES = ['main.css', 'panels.css', 'adapt.css'].map((name) =>
  readFileSync(join(process.cwd(), 'src/popup', name), 'utf8')
);
const ALL = FILES.join('\n');

/**
 * Finds the text inside the braces of an at-rule block.
 * @param css - The CSS text.
 * @param header - The text before the opening brace, for example "@media (hover: hover) and (pointer: fine)".
 * @returns The block body, or an empty string when the block is missing.
 */
function blockOf(css: string, header: string): string {
  const start = css.indexOf(header);
  if (start < 0) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') depth--;
    if (depth === 0) return css.slice(open + 1, i);
  }
  return '';
}

describe('popup CSS: hover and motion rules (spec 9)', () => {
  const fineOnly = blockOf(FILES[0] ?? '', '@media (hover: hover) and (pointer: fine)');

  it('has a block for the fine pointer', () => {
    expect(fineOnly).toContain(':hover');
  });

  it('moves a control on hover only inside the fine-pointer block', () => {
    const outside = (FILES[0] ?? '').replace(fineOnly, '');
    const rules = [...(outside + (FILES[1] ?? '')).matchAll(/([^{}]*:hover[^{}]*)\{([^{}]*)\}/g)];
    const moving = rules.filter((rule) => /transform\s*:/.test(rule[2] ?? ''));
    expect(moving.map((rule) => rule[1]?.trim())).toEqual([]);
  });

  const reduced = blockOf(ALL, '@media (prefers-reduced-motion: reduce)');

  it('removes every transition under reduced motion', () => {
    expect(reduced).toMatch(/transition:\s*none\s*!important/);
  });

  it('removes the hover and press movement of buttons under reduced motion', () => {
    expect(reduced).toMatch(
      /button:hover[\s\S]*button:active[\s\S]*transform:\s*none\s*!important/
    );
  });

  it('keeps a visible focus outline under forced colors', () => {
    expect(blockOf(ALL, '@media (forced-colors: active)')).toContain(':focus-visible');
  });
});
