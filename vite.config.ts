// Build orchestration for OpenList Chrome Extension
import { crx } from '@crxjs/vite-plugin';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import manifest from './src/manifest.json';

export default defineConfig({
  root: resolve(__dirname, './src'),
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: resolve(__dirname, './dist'),
    emptyOutDir: true,
  },
});
