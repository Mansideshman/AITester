import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [ ['html'], ['list'] ],
  use: {
    baseURL: process.env.API_BASE_URL || 'https://example.com/api',
    extraHTTPHeaders: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },
});
