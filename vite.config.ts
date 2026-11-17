// Build orchestration for OpenList Chrome Extension

import { resolve } from 'node:path';
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import manifest from './src/manifest.json';

export default defineConfig({
  root: resolve(import.meta.dirname, './src'),
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, './dist'),
    emptyOutDir: true,
    rollupOptions: {
      // The offscreen page has no manifest entry, so name it as a build input.
      input: { offscreen: resolve(import.meta.dirname, './src/offscreen/index.html') },
      // Zod gets a fixed chunk name so the size budget keeps its path.
      output: { codeSplitting: { groups: [{ name: 'zod', test: /node_modules[\\/]zod/ }] } },
    },
  },
});
