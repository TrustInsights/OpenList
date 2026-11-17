// Unit tests for utils/errors.ts

import { toErrorMessage } from '@/utils/errors';
import { describe, expect, it } from 'vitest';

describe('toErrorMessage', () => {
  it('returns the message from an Error instance', () => {
    const err = new Error('something went wrong');
    expect(toErrorMessage(err)).toBe('something went wrong');
  });

  it('returns String() of a non-Error value — string literal', () => {
    expect(toErrorMessage('oops')).toBe('oops');
  });

  it('returns String() of a number', () => {
    expect(toErrorMessage(42)).toBe('42');
  });

  it('returns String() of null', () => {
    expect(toErrorMessage(null)).toBe('null');
  });

  it('returns String() of undefined', () => {
    expect(toErrorMessage(undefined)).toBe('undefined');
  });

  it('returns message from a subclass of Error', () => {
    const err = new TypeError('type mismatch');
    expect(toErrorMessage(err)).toBe('type mismatch');
  });
});
