// Unit tests for utils/errors.ts

import { toErrorMessage } from '@/utils/errors';
import { describe, expect, it } from 'vitest';

describe('toErrorMessage', () => {
  it.each([
    ['an Error instance', new Error('something went wrong'), 'something went wrong'],
    ['a subclass of Error', new TypeError('type mismatch'), 'type mismatch'],
    ['a string', 'oops', 'oops'],
    ['a number', 42, '42'],
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
  ])('gives the text for %s', (_name, input, expected) => {
    expect(toErrorMessage(input)).toBe(expected);
  });
});
