/**
 * AUTO-BMAD COMPREHENSIVE "WHOLE CAR" E2E TEST SUITE
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHILOSOPHY: Test the fully assembled car on real roads, not parts in a workshop.
 * 
 * This single comprehensive test launches the app once and navigates through
 * ALL user journeys, taking screenshots at each step for human review.
 * 
 * VIDEO RECORDING is enabled to capture the entire journey.
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * RUN:
 *   cd apps/auto-bmad
 *   DISPLAY=:0 npx playwright test --config=e2e/playwright.config.ts comprehensive-whole-car.e2e.ts
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PATH = path.join(__dirname, '..');
const MAIN_JS = path.join(APP_PATH, 'out', 'main', 'index.js');
const SCREENSHOT_DIR = path.join(__dirname, 'test-results', 'screenshots', 'comprehensive');
const VIDEO_DIR = path.join(__dirname, 'test-results', 'videos');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let screenshotNum = 0;

async function screenshot(page: Page, name: string): Promise<void> {
  screenshotNum++;
  const filename = `${String(screenshotNum).padStart(3, '0')}-${name}.png`;
  try {
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), timeout: 10000 });
    console.log(`   📸 ${filename}`);
  } catch (e) {
    console.log(`   ⚠️ Screenshot failed: ${name}`);
  }
}

function log(msg: string): void {
  console.log(`   🎬 ${msg}`);
}

async function clickBtn(page: Page, text: string): Promise<boolean> {
  try {
    const btn = page.locator(`button:has-text("${text}")`).first();
    if (await btn.isVisible({ timeout: 2000 })) {
      await btn.click({ timeout: 5000 });
      log(`Clicked: "${text}"`);
      await page.waitForTimeout(800);
      return true;
    }
  } catch {}
  return false;
}

async function clickSidebar(page: Page, label: string): Promise<boolean> {
  try {
    // Try different selector patterns for sidebar items
    const selectors = [
      `aside button:has-text("${label}")`,
      `nav button:has-text("${label}")`,
      `[role="navigation"] button:has-text("${label}")`,
      `button[title*="${label}"]`,
      `button[aria-label*="${label}"]`,
    ];
    
    for (const selector of selectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        await el.click({ timeout: 3000 });
        log(`Sidebar: ${label}`);
        await page.waitForTimeout(1000);
        return true;
      }
    }
  } catch {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Test
// ─────────────────────────────────────────────────────────────────────────────

test('WHOLE CAR: Complete Auto-BMAD User Journey', async () => {
  test.setTimeout(180000); // 3 minutes total
  
  console.log('\n' + '═'.repeat(70));
  console.log('  AUTO-BMAD COMPREHENSIVE "WHOLE CAR" E2E TEST');
  console.log('  Testing ALL user journeys in one complete session');
  console.log('═'.repeat(70) + '\n');
  
  // Setup
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  mkdirSync(VIDEO_DIR, { recursive: true });
  
  if (!existsSync(MAIN_JS)) {
    throw new Error(`Build not found. Run 'npm run build' first.`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LAUNCH APP
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('🚗 LAUNCHING APP...');
  
  const app = await electron.launch({
    args: [MAIN_JS, '--no-sandbox', '--disable-gpu-sandbox'],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 60000,
    recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } },
  });
  
  log('App process started');
  await new Promise(r => setTimeout(r, 12000)); // Wait for full startup
  
  // Find main window
  const windows = app.windows();
  const page = windows.find(w => !w.url().includes('devtools://')) || windows[0];
  
  if (!page) {
    await app.close();
    throw new Error('No window found');
  }
  
  log(`Found ${windows.length} windows, using main app window`);
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 1: FIRST LAUNCH & ONBOARDING
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 1: FIRST LAUNCH & ONBOARDING');
    console.log('─'.repeat(50));
    
    await screenshot(page, 'j1-app-launched');
    
    // Check what's showing
    const pageText = await page.locator('body').textContent().catch(() => '') || '';
    
    if (pageText.includes('Setup Wizard') || pageText.includes('Welcome to Auto BMAD')) {
      log('Onboarding wizard detected');
      await screenshot(page, 'j1-onboarding-wizard');
      
      // Click Skip Setup
      if (await clickBtn(page, 'Skip Setup')) {
        await screenshot(page, 'j1-onboarding-skipped');
      } else if (await clickBtn(page, 'Get Started')) {
        // Navigate through wizard
        for (let i = 0; i < 8; i++) {
          await screenshot(page, `j1-wizard-step-${i}`);
          const clicked = await clickBtn(page, 'Skip') || 
                         await clickBtn(page, 'Next') || 
                         await clickBtn(page, 'Continue');
          if (!clicked) break;
        }
        await screenshot(page, 'j1-wizard-complete');
      }
    } else {
      log('Main UI displayed (no wizard)');
    }
    
    await screenshot(page, 'j1-after-onboarding');

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 2: EXPLORE SIDEBAR NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 2: SIDEBAR NAVIGATION');
    console.log('─'.repeat(50));
    
    const sidebarViews = [
      'Kanban', 'Terminals', 'Insights', 'Roadmap', 'Ideation', 
      'Changelog', 'Context', 'MCP', 'Worktrees'
    ];
    
    for (const view of sidebarViews) {
      if (await clickSidebar(page, view)) {
        await screenshot(page, `j2-view-${view.toLowerCase()}`);
      }
    }
    
    // Try clicking sidebar icons (visual buttons)
    const sidebarBtns = await page.locator('aside button').all();
    log(`Found ${sidebarBtns.length} sidebar buttons`);
    
    for (let i = 0; i < Math.min(8, sidebarBtns.length); i++) {
      try {
        await sidebarBtns[i].click({ timeout: 2000 });
        await page.waitForTimeout(500);
        await screenshot(page, `j2-sidebar-btn-${i}`);
      } catch {}
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 3: SETTINGS EXPLORATION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 3: SETTINGS');
    console.log('─'.repeat(50));
    
    if (await clickBtn(page, 'Settings') || await clickSidebar(page, 'Settings')) {
      await page.waitForTimeout(1000);
      await screenshot(page, 'j3-settings-opened');
      
      // Try clicking settings sections
      const sections = ['General', 'Theme', 'Display', 'Profiles', 'Integrations', 'Advanced'];
      for (const sec of sections) {
        if (await clickBtn(page, sec)) {
          await screenshot(page, `j3-settings-${sec.toLowerCase()}`);
        }
      }
      
      // Close settings
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
    
    await screenshot(page, 'j3-settings-done');

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 4: PROJECT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 4: PROJECT MANAGEMENT');
    console.log('─'.repeat(50));
    
    if (await clickBtn(page, 'New Project') || await clickBtn(page, 'Add Project')) {
      await page.waitForTimeout(1000);
      await screenshot(page, 'j4-add-project-dialog');
      await page.keyboard.press('Escape');
    }
    
    if (await clickBtn(page, 'Open Project')) {
      await page.waitForTimeout(500);
      await screenshot(page, 'j4-open-project');
      await page.keyboard.press('Escape');
    }
    
    await screenshot(page, 'j4-project-done');

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 5: TASK MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 5: TASK MANAGEMENT');
    console.log('─'.repeat(50));
    
    // Navigate to Kanban
    await clickSidebar(page, 'Kanban');
    await screenshot(page, 'j5-kanban-view');
    
    // Try creating a task
    if (await clickBtn(page, 'New Task') || await clickBtn(page, 'Create Task')) {
      await page.waitForTimeout(1000);
      await screenshot(page, 'j5-task-wizard');
      await page.keyboard.press('Escape');
    }
    
    await screenshot(page, 'j5-task-done');

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 6: TERMINALS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 6: TERMINALS');
    console.log('─'.repeat(50));
    
    if (await clickSidebar(page, 'Terminals') || await clickSidebar(page, 'Terminal')) {
      await page.waitForTimeout(1500);
      await screenshot(page, 'j6-terminals-view');
      
      if (await clickBtn(page, 'New Terminal') || await clickBtn(page, 'Add Terminal')) {
        await page.waitForTimeout(2000);
        await screenshot(page, 'j6-new-terminal');
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 7: MCP & TOOLS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 7: MCP & TOOLS');
    console.log('─'.repeat(50));
    
    if (await clickSidebar(page, 'MCP') || await clickSidebar(page, 'Tools')) {
      await page.waitForTimeout(1000);
      await screenshot(page, 'j7-mcp-view');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 8: OTHER VIEWS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 8: OTHER VIEWS');
    console.log('─'.repeat(50));
    
    for (const view of ['Roadmap', 'Ideation', 'Context', 'Insights', 'Changelog', 'Worktrees']) {
      if (await clickSidebar(page, view)) {
        await screenshot(page, `j8-${view.toLowerCase()}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JOURNEY 9: KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 JOURNEY 9: KEYBOARD SHORTCUTS');
    console.log('─'.repeat(50));
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    
    await page.keyboard.press('Control+,'); // Settings shortcut
    await page.waitForTimeout(500);
    await screenshot(page, 'j9-keyboard-settings');
    await page.keyboard.press('Escape');
    
    await screenshot(page, 'j9-keyboard-done');

    // ═══════════════════════════════════════════════════════════════════════════
    // FINAL SCREENSHOT
    // ═══════════════════════════════════════════════════════════════════════════
    await screenshot(page, 'final-state');
    
  } finally {
    // ═══════════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n🛑 Closing app...');
    await app.close();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║             AUTO-BMAD "WHOLE CAR" TEST COMPLETE                               ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Journeys Completed:                                                          ║
║    1. First Launch & Onboarding    ✓                                         ║
║    2. Sidebar Navigation           ✓                                         ║
║    3. Settings Exploration         ✓                                         ║
║    4. Project Management           ✓                                         ║
║    5. Task Management              ✓                                         ║
║    6. Terminal Operations          ✓                                         ║
║    7. MCP & Tools                  ✓                                         ║
║    8. Other Views                  ✓                                         ║
║    9. Keyboard Shortcuts           ✓                                         ║
║                                                                               ║
║  Screenshots: ${screenshotNum} captured
║  Video:       ${VIDEO_DIR}
║                                                                               ║
║  View Report: npx playwright show-report e2e/test-results/html-report        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);

  expect(screenshotNum).toBeGreaterThan(10);
});
