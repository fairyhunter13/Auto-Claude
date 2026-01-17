/**
 * Playwright configuration for Electron E2E tests
 */
import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.e2e.ts',
  timeout: 300000, // 5 minutes for workflow tests
  expect: {
    timeout: 30000
  },
  fullyParallel: false, // Run tests serially for Electron
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - we want to see real results
  workers: 1, // Single worker for Electron
  reporter: [
    ['html', { outputFolder: path.join(__dirname, 'test-results', 'html-report') }],
    ['list'],
  ],
  outputDir: path.join(__dirname, 'test-results'),
  use: {
    trace: 'on', // Always capture trace
    screenshot: 'on', // Capture screenshots
    video: 'on', // Always record video
    headless: false, // Show the UI
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts'
    }
  ]
});
