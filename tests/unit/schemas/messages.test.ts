// Unit tests for schemas/messages.ts

import { OpenListMessageSchema, OpenListResponseSchema } from '@/schemas/messages';
import { describe, expect, it } from 'vitest';

describe('OpenListMessageSchema', () => {
  it('parses an openList message with an array of urls', () => {
    const result = OpenListMessageSchema.safeParse({
      action: 'openList',
      urls: ['https://example.com', 'https://www.google.com/search?q=best%20pizza'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('openList');
      expect(result.data.urls).toEqual([
        'https://example.com',
        'https://www.google.com/search?q=best%20pizza',
      ]);
    }
  });

  it('rejects the removed getMetrics message', () => {
    expect(OpenListMessageSchema.safeParse({ action: 'getMetrics' }).success).toBe(false);
  });

  it('rejects the removed getCurrentTabUrls message', () => {
    expect(OpenListMessageSchema.safeParse({ action: 'getCurrentTabUrls' }).success).toBe(false);
  });

  it('rejects an empty object (no action)', () => {
    expect(OpenListMessageSchema.safeParse({}).success).toBe(false);
  });

  it('rejects an openList message missing urls', () => {
    expect(OpenListMessageSchema.safeParse({ action: 'openList' }).success).toBe(false);
  });

  it('rejects an openList message with an empty array', () => {
    expect(OpenListMessageSchema.safeParse({ action: 'openList', urls: [] }).success).toBe(false);
  });

  it('rejects an openList message with urls as a string', () => {
    expect(
      OpenListMessageSchema.safeParse({ action: 'openList', urls: 'https://example.com' }).success
    ).toBe(false);
  });

  it('rejects a non-string entry in urls', () => {
    expect(OpenListMessageSchema.safeParse({ action: 'openList', urls: [1] }).success).toBe(false);
  });

  it('rejects an unknown action', () => {
    expect(OpenListMessageSchema.safeParse({ action: 'unknown' }).success).toBe(false);
  });

  it('rejects null', () => {
    expect(OpenListMessageSchema.safeParse(null).success).toBe(false);
  });

  it('rejects undefined', () => {
    expect(OpenListMessageSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('OpenListResponseSchema', () => {
  it('parses a valid complete response', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: {
        successful: 3,
        failed: 1,

        totalTime: 500,
        errors: ['some error'],
        opened: ['https://a.com'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing status', () => {
    const result = OpenListResponseSchema.safeParse({
      results: { successful: 0, failed: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong status value', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'pending',
      results: { successful: 0, failed: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative successful count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: -1, failed: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative failed count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: -1, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative totalTime', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, totalTime: -1, errors: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer successful count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 1.5, failed: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a response without opened', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, totalTime: 0, errors: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string entry in opened', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, totalTime: 0, errors: [], opened: [1] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-array errors', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: {
        successful: 0,
        failed: 0,

        totalTime: 0,
        errors: 'not array',
        opened: [],
      },
    });
    expect(result.success).toBe(false);
  });
});
