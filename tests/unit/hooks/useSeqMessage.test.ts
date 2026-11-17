// Unit tests for hooks/useSeqMessage.ts

import { useSeqMessage } from '@/hooks/useSeqMessage';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('useSeqMessage', () => {
  it('starts empty with a counter of zero', () => {
    const { result } = renderHook(() => useSeqMessage());
    expect(result.current.text).toBe('');
    expect(result.current.seq).toBe(0);
  });

  it('counts a repeated message as a new write', () => {
    const { result } = renderHook(() => useSeqMessage());
    act(() => result.current.setMessage('Done.'));
    act(() => result.current.setMessage('Done.'));
    expect(result.current.text).toBe('Done.');
    expect(result.current.seq).toBe(2);
  });

  it('keeps one setter across renders', () => {
    const { result, rerender } = renderHook(() => useSeqMessage());
    const first = result.current.setMessage;
    rerender();
    expect(result.current.setMessage).toBe(first);
  });
});
