// Token test: every color pair in src/popup/tokens.css meets its WCAG 2.1 AA ratio in both themes

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contrastRatio } from '@tests/helpers/contrast';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(process.cwd(), 'src/popup/tokens.css'), 'utf8');
const TOKEN_NAMES = [
  'bg',
  'surface',
  'text',
  'muted',
  'accent',
  'accent-hover',
  'on-accent',
  'border',
  'err',
  'err-bg',
  'err-border',
  'sel-bg',
  'sel-text',
] as const;

type Theme = Record<(typeof TOKEN_NAMES)[number], string>;

/**
 * Read the custom properties out of one CSS block body.
 * @param body - Text between the braces of a rule.
 * @returns Map of property name (without the dashes) to value.
 */
function readProperties(body: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of body.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    found.set(match[1] ?? '', match[2] ?? '');
  }
  return found;
}

/**
 * Build a theme from the properties of one block and check that it is complete.
 * @param body - Text between the braces of a rule.
 * @returns The theme with every token present.
 */
function readTheme(body: string): Theme {
  const props = readProperties(body);
  const theme: Record<string, string> = {};
  for (const name of TOKEN_NAMES) {
    const value = props.get(name);
    if (!value) throw new Error(`Token --${name} is missing`);
    theme[name] = value;
  }
  return theme as Theme;
}

const darkStart = CSS.indexOf('@media (prefers-color-scheme: dark)');
const lightBlock = /:root\s*\{([^}]*)\}/.exec(CSS.slice(0, darkStart))?.[1] ?? '';
const darkBlock = /:root\s*\{([^}]*)\}/.exec(CSS.slice(darkStart))?.[1] ?? '';

const TEXT_PAIRS: [keyof Theme, keyof Theme][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['muted', 'bg'],
  ['accent', 'bg'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['err', 'err-bg'],
  ['sel-text', 'sel-bg'],
];
const BORDER_PAIRS: [keyof Theme, keyof Theme][] = [
  ['border', 'surface'],
  ['border', 'bg'],
  ['accent', 'bg'],
  ['accent', 'sel-bg'],
];

describe('design tokens', () => {
  it('has a light block and a dark block', () => {
    expect(darkStart).toBeGreaterThan(0);
    expect(lightBlock).not.toBe('');
    expect(darkBlock).not.toBe('');
  });

  it('uses the exact light and dark values from the spec', () => {
    const light = readTheme(lightBlock);
    const dark = readTheme(darkBlock);
    expect(light).toMatchObject({
      accent: '#0b57d0',
      'accent-hover': '#0842a0',
      bg: '#eeeeee',
      surface: '#ffffff',
      text: '#333333',
      muted: '#5f6368',
      border: '#767676',
      err: '#b3261e',
      'err-bg': '#fce8e6',
      'sel-bg': '#d3e3fd',
      'sel-text': '#041e49',
    });
    expect(dark).toMatchObject({
      accent: '#8ab4f8',
      'accent-hover': '#aecbfa',
      bg: '#202124',
      surface: '#292a2d',
      text: '#e8eaed',
      muted: '#9aa0a6',
      border: '#8e918f',
      err: '#f9b4ae',
      'err-bg': '#402022',
      'sel-bg': '#2f4468',
      'sel-text': '#d3e3fd',
    });
  });

  for (const [themeName, block] of [
    ['light', lightBlock],
    ['dark', darkBlock],
  ] as const) {
    describe(`${themeName} theme`, () => {
      const theme = readTheme(block);

      it.each(TEXT_PAIRS)('text pair %s on %s is at least 4.5:1', (fg, bg) => {
        expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(4.5);
      });

      it.each(BORDER_PAIRS)('border or ring pair %s on %s is at least 3:1', (fg, bg) => {
        expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(3);
      });

      it('error border is at least 3:1 on its error fill', () => {
        expect(contrastRatio(theme['err-border'], theme['err-bg'])).toBeGreaterThanOrEqual(3);
      });
    });
  }

  it('the helper fails a pair that is too weak', () => {
    expect(contrastRatio('#777777', '#888888')).toBeLessThan(4.5);
  });
});
