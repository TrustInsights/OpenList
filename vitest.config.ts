// Test runner configuration — separate from vite.config.ts to prevent CRXJS plugin conflicts

import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '@tests': resolve(import.meta.dirname, './tests'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './output/coverage',
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      // Entry points: side-effect-only bootstrap files
      exclude: ['src/background/index.ts', 'src/popup/index.tsx'],
    },
  },
});
