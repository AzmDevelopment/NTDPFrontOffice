import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

// Check if ZAP integration is enabled
const USE_ZAP = process.env.USE_ZAP === 'true' || process.env.CI === 'true';
const ZAP_PROXY = process.env.ZAP_PROXY || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: 90000, // 90 seconds per test
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },
  globalSetup: USE_ZAP ? './global-setup.ts' : undefined,
  globalTeardown: USE_ZAP ? './global-teardown.ts' : undefined,
  reporter: process.env.CI ? [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ] : [
    ['html'],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'https://portal-uat.ntdp-sa.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000, // Increased for CI
    navigationTimeout: 60000,
    headless: true, // Ensure headless in CI
    // Configure ZAP proxy if enabled
    ...(USE_ZAP && {
      proxy: {
        server: ZAP_PROXY,
      },
      ignoreHTTPSErrors: true, // Required for ZAP proxy
    }),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
