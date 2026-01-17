/**
 * SIMPLE "WHOLE CAR" TEST
 * 
 * A robust, minimal test that validates the app works end-to-end.
 */

import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAIN_JS = path.join(__dirname, '..', 'out', 'main', 'index.js');
const OUTPUT_DIR = path.join(__dirname, 'test-results', 'simple-test');

test('Simple Whole Car Test', async () => {
  test.setTimeout(120000);
  
  console.log('\n🚗 AUTO-BMAD SIMPLE WHOLE CAR TEST\n');
  
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  if (!existsSync(MAIN_JS)) {
    throw new Error('Build not found - run npm run build');
  }
  
  // Launch app
  console.log('1. Launching app...');
  const app = await electron.launch({
    args: [MAIN_JS, '--no-sandbox', '--disable-gpu-sandbox'],
    timeout: 60000,
  });
  
  console.log('2. Waiting for startup...');
  await new Promise(r => setTimeout(r, 15000));
  
  // Get windows
  const windows = app.windows();
  console.log(`3. Found ${windows.length} windows`);
  
  // Find main window
  let mainWindow = windows.find(w => !w.url().includes('devtools://')) || windows[0];
  
  for (const win of windows) {
    const url = win.url();
    const title = await win.title().catch(() => '');
    console.log(`   - Window: "${title}" @ ${url.substring(0, 40)}...`);
  }
  
  expect(mainWindow).toBeTruthy();
  console.log('4. Main window found');
  
  // Take screenshot
  const screenshotPath = path.join(OUTPUT_DIR, 'main-window.png');
  await mainWindow.screenshot({ path: screenshotPath });
  console.log(`5. Screenshot saved: ${screenshotPath}`);
  
  // Get UI metrics
  const buttons = await mainWindow.locator('button').count();
  const bodyText = await mainWindow.locator('body').textContent().catch(() => '');
  
  console.log(`6. UI Metrics:`);
  console.log(`   - Buttons: ${buttons}`);
  console.log(`   - Content length: ${bodyText?.length || 0} chars`);
  
  // Verify app content
  expect(buttons).toBeGreaterThan(5);
  expect(bodyText?.length || 0).toBeGreaterThan(100);
  
  // Check for key elements
  const hasWelcome = bodyText?.includes('Welcome') || bodyText?.includes('Auto BMAD');
  const hasNavigation = bodyText?.includes('Kanban') || bodyText?.includes('Terminal');
  
  console.log(`7. Content checks:`);
  console.log(`   - Has welcome/branding: ${hasWelcome}`);
  console.log(`   - Has navigation: ${hasNavigation}`);
  
  // Close app
  console.log('8. Closing app...');
  await app.close();
  
  console.log('\n✅ SIMPLE WHOLE CAR TEST PASSED\n');
  console.log(`Screenshot: ${screenshotPath}`);
});
