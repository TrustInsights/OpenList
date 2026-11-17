// Unit tests for schemas/messages.ts

import {
  IncomingMessageSchema,
  OpenListMessageSchema,
  OpenListResponseSchema,
} from '@/schemas/messages';
import { describe, expect, it } from 'vitest';

describe('IncomingMessageSchema', () => {
  describe('valid cases', () => {
    it('parses openList message with urls', () => {
      const result = IncomingMessageSchema.safeParse({
        action: 'openList',
        urls: 'https://example.com',
      });
      expect(result.success).toBe(true);
    });

    it('rejects the removed getMetrics message', () => {
      const result = IncomingMessageSchema.safeParse({ action: 'getMetrics' });
      expect(result.success).toBe(false);
    });

    it('rejects the removed getCurrentTabUrls message', () => {
      const result = IncomingMessageSchema.safeParse({ action: 'getCurrentTabUrls' });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid cases', () => {
    it('rejects empty object (no action)', () => {
      const result = IncomingMessageSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects openList message missing urls', () => {
      const result = IncomingMessageSchema.safeParse({ action: 'openList' });
      expect(result.success).toBe(false);
    });

    it('rejects openList message with empty urls', () => {
      const result = IncomingMessageSchema.safeParse({ action: 'openList', urls: '' });
      expect(result.success).toBe(false);
    });

    it('rejects unknown action', () => {
      const result = IncomingMessageSchema.safeParse({ action: 'unknown' });
      expect(result.success).toBe(false);
    });

    it('rejects null', () => {
      const result = IncomingMessageSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('rejects undefined', () => {
      const result = IncomingMessageSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });
});

describe('OpenListMessageSchema', () => {
  it('parses valid openList payload', () => {
    const result = OpenListMessageSchema.safeParse({
      action: 'openList',
      urls: 'https://example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe('openList');
      expect(result.data.urls).toBe('https://example.com');
    }
  });
});

describe('OpenListResponseSchema', () => {
  it('parses a valid complete response', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: {
        successful: 3,
        failed: 1,
        skipped: 0,
        totalTime: 500,
        errors: ['some error'],
        opened: ['https://a.com'],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing status', () => {
    const result = OpenListResponseSchema.safeParse({
      results: { successful: 0, failed: 0, skipped: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong status value', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'pending',
      results: { successful: 0, failed: 0, skipped: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative successful count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: -1, failed: 0, skipped: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative failed count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: -1, skipped: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative skipped count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, skipped: -1, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative totalTime', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, skipped: 0, totalTime: -1, errors: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer successful count', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 1.5, failed: 0, skipped: 0, totalTime: 0, errors: [], opened: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a response without opened', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, skipped: 0, totalTime: 0, errors: [] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-string entry in opened', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: { successful: 0, failed: 0, skipped: 0, totalTime: 0, errors: [], opened: [1] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-array errors', () => {
    const result = OpenListResponseSchema.safeParse({
      status: 'complete',
      results: {
        successful: 0,
        failed: 0,
        skipped: 0,
        totalTime: 0,
        errors: 'not array',
        opened: [],
      },
    });
    expect(result.success).toBe(false);
  });
});
