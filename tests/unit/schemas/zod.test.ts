// Unit tests for schemas/zod.ts: Zod runs with its JIT off, and every source file gets Zod from there

import { z } from '@/schemas/zod';
import { describe, expect, it } from 'vitest';

const SOURCES = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

describe('schemas/zod', () => {
  it('turns the Zod JIT off, because the extension CSP forbids code from strings', () => {
    expect(z.config().jitless).toBe(true);
  });

  it('still parses an object', () => {
    expect(z.object({ a: z.string() }).parse({ a: 'x' })).toEqual({ a: 'x' });
  });

  it('is the only file that imports a Zod value straight from the package', () => {
    const direct = Object.entries(SOURCES)
      .filter(([file]) => !file.endsWith('/src/schemas/zod.ts'))
      .filter(([, text]) => /^import (?!type)[^;]*from 'zod'/m.test(text))
      .map(([file]) => file);
    expect(direct).toEqual([]);
  });
});
