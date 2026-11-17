// Unit tests for the WCAG contrast helper

import { contrastRatio } from '@tests/helpers/contrast';
import { describe, expect, it } from 'vitest';

describe('contrastRatio', () => {
  it('returns 6.39 for white on the light accent', () => {
    expect(contrastRatio('#ffffff', '#0b57d0')).toBe(6.39);
  });

  it('returns 10.89 for the light text on the light page', () => {
    expect(contrastRatio('#333333', '#eeeeee')).toBe(10.89);
  });

  it('returns 21 for black on white and 1 for equal colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('#777777', '#777777')).toBe(1);
  });

  it('gives the same ratio when the colors swap places', () => {
    expect(contrastRatio('#0b57d0', '#ffffff')).toBe(contrastRatio('#ffffff', '#0b57d0'));
  });

  it('accepts upper case hex digits', () => {
    expect(contrastRatio('#FFFFFF', '#0B57D0')).toBe(6.39);
  });

  it('rejects a value that is not a six digit hex color', () => {
    expect(() => contrastRatio('red', '#ffffff')).toThrow('Not a six digit hex color: red');
  });
});
