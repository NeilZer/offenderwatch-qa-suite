import { defineConfig, devices } from '@playwright/test';
import { environment } from './src/config/environment';

/**
 * Projects:
 *   api   pure HTTP tests (no browser)
 *   ui    Chromium against the console
 *   demo  the same UI tests, visible and slowed down — for watching a run live
 *
 * workers: 1 — all tests share ONE live instance and several assert exact counter deltas
 * (FR-11 / API-05). Running them in parallel would let one test's data change another test's
 * expected numbers. Stability over speed; the whole suite runs in about a minute.
 *
 * retries: 0 — a retry would hide flakiness; every result in the report is a first attempt.
 *
 * reports/results.json (the dashboard's input) is written ONLY by the official run `npm run qa`
 * (QA_RECORD=1). Ad-hoc runs — one test, the demo — never overwrite the dashboard data.
 */
const recordForDashboard = process.env.QA_RECORD === '1';

/**
 * Part 5: when the Test Management Platform starts the suite it sets PLATFORM_URL. Then the platform
 * reporter pushes results live, and every UI test keeps a final screenshot as evidence (TM-08).
 */
const reportToPlatform = !!process.env.PLATFORM_URL;

export default defineConfig({
  testDir: './tests',
  outputDir: './reports/artifacts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ...(recordForDashboard ? [['json', { outputFile: 'reports/results.json' }] as const] : []),
    ...(reportToPlatform ? [['./src/reporting/platform-reporter.ts'] as const] : []),
  ],
  use: {
    baseURL: environment.baseUrl,
    timezoneId: environment.timezone,
    locale: 'en-GB',
    headless: !environment.headed,
    trace: 'retain-on-failure',
    screenshot: reportToPlatform ? { mode: 'on', fullPage: true } : 'only-on-failure',
    video: 'off',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'demo',
      testDir: './tests/ui',
      timeout: 120_000,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        headless: false,
        launchOptions: { slowMo: 600 },
      },
    },
  ],
});
