// Playwright configuration for Chrome Extension E2E tests
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './temp/test-results',
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'output/playwright-report', open: 'never' }]],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Extension loading is handled in fixtures.ts
      },
    },
  ],
});
