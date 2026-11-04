import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const port = Number(process.env.E2E_PORT || 4397);
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (existsSync('/tmp/atma-chromium') ? '/tmp/atma-chromium' : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['recovery-v3.spec.ts'],
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['html', { outputFolder: 'test-results/html', open: 'never' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    reducedMotion: 'reduce',
    acceptDownloads: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  webServer: {
    command: `node scripts/e2e-server.mjs`,
    url: `http://127.0.0.1:${port}`,
    timeout: 30_000,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(port) },
  },
});
