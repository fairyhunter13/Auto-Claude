/**
 * Playwright configuration for Electron E2E tests
 * 
 * Supports multiple modes:
 * - Default: Headless with video recording (CI mode)
 * - Headed: Visible browser for debugging (--headed flag)
 * - User Journeys: Focused journey tests with enhanced recording
 * 
 * Usage:
 *   npx playwright test                           # Headless with video
 *   npx playwright test --headed                  # Visible browser
 *   npx playwright test --project=user-journeys   # Journey tests only
 *   HEADED=true npx playwright test               # Visible via env var
 */
import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if headed mode is requested via environment variable
const isHeaded = process.env.HEADED === 'true' || process.env.HEADED === '1';
const slowMo = process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : (isHeaded ? 100 : 0);

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
    ['html', { outputFolder: path.join(__dirname, 'playwright-report'), open: 'never' }],
    ['list'],
    ['json', { outputFile: path.join(__dirname, 'test-results', 'results.json') }],
  ],
  outputDir: path.join(__dirname, 'test-results'),
  
  // Global settings
  use: {
    trace: 'on', // Always capture trace for debugging
    screenshot: 'on', // Capture screenshots on test end
    video: 'on', // Always record video for review
    headless: !isHeaded, // Toggle via HEADED env or --headed flag
    launchOptions: {
      slowMo: slowMo, // Slow down for visibility when headed
    },
  },
  
  projects: [
    // Default Electron tests
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts',
      testIgnore: ['**/journeys/**/*.e2e.ts'], // Exclude journey tests from default
    },
    
    // User Journey tests - always headed with slow motion
    {
      name: 'user-journeys',
      testDir: './journeys',
      testMatch: '**/*.e2e.ts',
      use: {
        headless: false, // Always visible for journey verification
        video: 'on',
        trace: 'on',
        launchOptions: {
          slowMo: 200, // Slower for human observation
        },
      },
    },
    
    // Debug mode - extra slow for step-through debugging
    {
      name: 'debug',
      testMatch: '**/*.e2e.ts',
      use: {
        headless: false,
        video: 'on',
        trace: 'on',
        launchOptions: {
          slowMo: 500, // Very slow for debugging
        },
      },
    },
  ],
});
