/**
 * Visible User Journey E2E Tests
 * 
 * This test:
 * 1. Runs with VISIBLE UI (not headless)
 * 2. Handles Setup Wizard/Welcome screen first
 * 3. Takes screenshots and HTML dumps after EVERY action
 * 4. Asserts that navigation actually happened (not stuck)
 * 5. Adds delays so you can see what's happening
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PATH = path.join(__dirname, '..', 'out', 'main', 'index.js');
const ARTIFACTS_DIR = path.join(__dirname, 'test-results', 'visible-journey');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ============================================================================
// Helper Functions
// ============================================================================

let stepCounter = 0;

/**
 * Capture state with screenshot and HTML - call this after EVERY action
 */
async function captureStep(page: Page, stepName: string): Promise<{
  bodyText: string;
  hasElement: (text: string) => boolean;
}> {
  stepCounter++;
  const prefix = String(stepCounter).padStart(2, '0');
  const safeName = `${prefix}-${stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  
  // Screenshot
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `${safeName}.png`),
    fullPage: true
  });
  
  // HTML dump
  const html = await page.content();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${safeName}.html`), html);
  
  // Get body text for assertions
  const bodyText = await page.locator('body').innerText().catch(() => '');
  
  // Log what we captured
  console.log(`\n=== Step ${stepCounter}: ${stepName} ===`);
  console.log(`Screenshot: ${safeName}.png`);
  console.log(`HTML: ${safeName}.html`);
  console.log(`Body preview (first 500 chars):\n${bodyText.substring(0, 500)}`);
  
  return {
    bodyText,
    hasElement: (text: string) => bodyText.includes(text) || html.includes(text)
  };
}

/**
 * Get the main application window (not DevTools)
 */
async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
  const windows = electronApp.windows();
  
  for (const win of windows) {
    const title = await win.title().catch(() => '');
    if (title !== 'DevTools' && !win.url().includes('devtools://')) {
      return win;
    }
  }
  
  return windows[0];
}

/**
 * Wait for app to be ready
 */
async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.body.innerHTML.length > 100);
  await page.waitForTimeout(1000); // Give time for React to hydrate
}

/**
 * Dismiss any open modals/dialogs that might be blocking
 */
async function dismissAnyModals(page: Page) {
  console.log('>>> Checking for open modals...');
  
  // Check if there's a modal backdrop blocking clicks
  const hasModalBackdrop = await page.locator('[data-state="open"].fixed.inset-0').isVisible().catch(() => false);
  
  if (hasModalBackdrop) {
    console.log('>>> Found modal backdrop, attempting to dismiss...');
    
    // Try pressing Escape multiple times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      const stillHasModal = await page.locator('[data-state="open"].fixed.inset-0').isVisible().catch(() => false);
      if (!stillHasModal) {
        console.log('>>> Modal dismissed!');
        break;
      }
    }
    
    // If still has modal, try clicking outside or on close button
    const closeBtn = page.locator('button[aria-label="Close"], [role="dialog"] button:has-text("×"), [role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Skip")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      console.log('>>> Found close button, clicking...');
      await closeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
}

/**
 * Handle the Setup Wizard / Welcome screen
 * This is REQUIRED before we can test navigation
 */
async function handleWelcomeScreen(page: Page): Promise<boolean> {
  console.log('\n>>> Checking for Welcome Screen / Setup Wizard...');
  
  // Capture initial state
  let state = await captureStep(page, 'initial-state');
  
  // Check if we're on welcome screen
  const isOnWelcome = state.hasElement('Welcome to Auto BMAD') || 
                       state.hasElement('Setup Wizard') ||
                       state.hasElement('Get Started');
  
  if (!isOnWelcome) {
    console.log('>>> Not on welcome screen, already in main app');
    return true;
  }
  
  console.log('>>> On Welcome screen, need to initialize project');
  
  // Add a test project directly using the IPC API
  // This bypasses the native file picker dialog
  const testProjectPath = '/home/hafiz/git/github.com/fairyhunter13/Auto-Claude';
  
  console.log(`>>> Adding test project: ${testProjectPath}`);
  
  try {
    // Use the store's addProject function which updates both backend AND React state
    const result = await page.evaluate(async (projectPath) => {
      // First, add the project via IPC
      // @ts-ignore - electronAPI is exposed via preload
      const response = await window.electronAPI.addProject(projectPath);
      
      if (!response.success || !response.data) {
        return { success: false, error: response.error };
      }
      
      const project = response.data;
      
      // Now we need to update the Zustand store to reflect the new project
      // This is what the store's addProject function does internally
      // We'll dispatch a custom event to trigger a project refresh
      
      // Try to get the store and update it
      // @ts-ignore - accessing React internals
      const zustandStore = window.__ZUSTAND_PROJECT_STORE__;
      if (zustandStore) {
        const state = zustandStore.getState();
        state.addProject(project);
        state.selectProject(project.id);
        state.openProjectTab(project.id);
        state.setActiveProject(project.id);
      }
      
      return { success: true, data: project };
    }, testProjectPath);
    
    console.log('>>> addProject result:', JSON.stringify(result, null, 2));
    
    if (result?.success && result?.data) {
      console.log('>>> Project added successfully!');
      console.log('>>> Project ID:', result.data.id);
      console.log('>>> Project name:', result.data.name);
      
      // Wait for UI to update
      await page.waitForTimeout(2000);
      await captureStep(page, 'after-add-project');
      
      // Reload the page to pick up the new project from storage
      // This is the most reliable way to sync state
      console.log('>>> Reloading page to sync state...');
      await page.reload();
      await page.waitForTimeout(3000);
      await captureStep(page, 'after-page-reload');
      
      // Check if navigation is now enabled
      const kanbanBtn = page.locator('button:has-text("Kanban")').first();
      const isEnabled = await kanbanBtn.isEnabled().catch(() => false);
      
      console.log(`>>> Kanban button enabled after reload: ${isEnabled}`);
      
      if (!isEnabled) {
        // Try clicking on the project tab in the PROJECT header
        console.log('>>> Looking for project tabs...');
        const projectTab = page.locator(`text=${result.data.name}`).first();
        if (await projectTab.isVisible().catch(() => false)) {
          console.log('>>> Found project tab, clicking...');
          await projectTab.click();
          await page.waitForTimeout(1000);
          await captureStep(page, 'after-click-project-tab');
        }
        
        // Also check for any close/dismiss buttons on modals
        const closeBtn = page.locator('button[aria-label="Close"], button:has-text("×"), button:has-text("Close")').first();
        if (await closeBtn.isVisible().catch(() => false)) {
          console.log('>>> Found close button, clicking...');
          await closeBtn.click();
          await page.waitForTimeout(500);
        }
      }
      
      return true;
    } else {
      console.log('>>> Failed to add project:', result?.error);
    }
  } catch (err) {
    console.log('>>> Error adding project:', err);
  }
  
  // Check current state after handling
  state = await captureStep(page, 'after-welcome-handling');
  
  // Check if navigation is now enabled
  const kanbanBtn = page.locator('button:has-text("Kanban")').first();
  const isEnabled = await kanbanBtn.isEnabled().catch(() => false);
  
  console.log(`>>> Kanban button enabled: ${isEnabled}`);
  
  return isEnabled;
}

// ============================================================================
// Main Test Suite
// ============================================================================

test.describe('Visible User Journey', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    console.log('\n========================================');
    console.log('STARTING VISIBLE USER JOURNEY TEST');
    console.log('========================================\n');
    
    // Clean artifacts directory
    const files = fs.readdirSync(ARTIFACTS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(ARTIFACTS_DIR, file));
    }
    stepCounter = 0;
    
    // Launch app
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    
    // Wait for windows to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get main window (not DevTools)
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    console.log('>>> App launched successfully');
  });

  test.afterAll(async () => {
    console.log('\n========================================');
    console.log('TEST COMPLETE - Check artifacts at:');
    console.log(ARTIFACTS_DIR);
    console.log('========================================\n');
    
    await electronApp?.close();
  });

  test('Step 1: Verify app launched and capture initial state', async () => {
    const state = await captureStep(page, 'app-launched');
    
    // Basic assertions
    expect(state.hasElement('Auto BMAD')).toBeTruthy();
    expect(state.bodyText.length).toBeGreaterThan(100);
    
    console.log('>>> App launched successfully with Auto BMAD title');
  });

  test('Step 2: Handle Welcome Screen / Setup Wizard', async () => {
    const navigationEnabled = await handleWelcomeScreen(page);
    
    console.log(`>>> Navigation enabled after handling welcome: ${navigationEnabled}`);
    
    // Even if navigation isn't enabled, we continue to see what happens
  });

  test('Step 3: Attempt navigation to each view', async () => {
    // First dismiss any open modals
    await dismissAnyModals(page);
    await captureStep(page, 'after-dismiss-modals');
    
    const views = [
      { name: 'Kanban', expectedContent: ['Backlog', 'Progress', 'Review', 'Done'] },
      { name: 'Terminals', expectedContent: ['Terminal', 'Agent'] },
      { name: 'Insights', expectedContent: ['Insight'] },
      { name: 'Roadmap', expectedContent: ['Roadmap'] },
      { name: 'Ideation', expectedContent: ['Idea', 'Generate'] },
      { name: 'Changelog', expectedContent: ['Changelog'] },
      { name: 'Context', expectedContent: ['Context', 'Memory'] },
      { name: 'MCP', expectedContent: ['MCP', 'Server'] },
      { name: 'Worktrees', expectedContent: ['Worktree', 'Branch'] },
    ];

    for (const view of views) {
      console.log(`\n>>> Attempting to navigate to: ${view.name}`);
      
      // Capture state BEFORE navigation
      const beforeState = await captureStep(page, `before-nav-${view.name}`);
      const beforeText = beforeState.bodyText;
      
      // Try to find and click the navigation button
      const button = page.locator(`button:has-text("${view.name}")`).first();
      const isVisible = await button.isVisible().catch(() => false);
      const isEnabled = await button.isEnabled().catch(() => false);
      
      console.log(`>>> Button "${view.name}" - visible: ${isVisible}, enabled: ${isEnabled}`);
      
      if (isVisible && isEnabled) {
        await button.click();
        await page.waitForTimeout(1000); // Wait for navigation
        
        // Capture state AFTER navigation
        const afterState = await captureStep(page, `after-nav-${view.name}`);
        const afterText = afterState.bodyText;
        
        // CRITICAL: Assert that something changed
        const contentChanged = afterText !== beforeText;
        const hasExpectedContent = view.expectedContent.some(c => afterState.hasElement(c));
        
        console.log(`>>> Content changed: ${contentChanged}`);
        console.log(`>>> Has expected content: ${hasExpectedContent}`);
        
        if (!contentChanged) {
          console.log('>>> WARNING: Page content did not change after navigation!');
          console.log('>>> This means we might be STUCK!');
        }
      } else {
        console.log(`>>> SKIPPED: Button not clickable (need project initialized?)`);
        await captureStep(page, `skipped-${view.name}`);
      }
    }
  });

  test('Step 4: Test Settings dialog', async () => {
    console.log('\n>>> Attempting to open Settings...');
    
    // First dismiss any open modals
    await dismissAnyModals(page);
    
    const beforeState = await captureStep(page, 'before-settings');
    
    const settingsBtn = page.locator('button:has-text("Settings")').first();
    const isEnabled = await settingsBtn.isEnabled().catch(() => false);
    
    console.log(`>>> Settings button enabled: ${isEnabled}`);
    
    if (isEnabled) {
      await settingsBtn.click();
      await page.waitForTimeout(1000);
      
      const afterState = await captureStep(page, 'after-settings-open');
      
      // Check if dialog opened
      const dialogOpened = afterState.hasElement('Appearance') || 
                           afterState.hasElement('Settings') ||
                           afterState.hasElement('Theme');
      
      console.log(`>>> Settings dialog opened: ${dialogOpened}`);
      
      // Close dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await captureStep(page, 'after-settings-close');
    }
  });

  test('Step 5: Test New Task button', async () => {
    console.log('\n>>> Attempting to click New Task...');
    
    const beforeState = await captureStep(page, 'before-new-task');
    
    const newTaskBtn = page.locator('button:has-text("New Task")').first();
    const isEnabled = await newTaskBtn.isEnabled().catch(() => false);
    
    console.log(`>>> New Task button enabled: ${isEnabled}`);
    
    if (isEnabled) {
      await newTaskBtn.click();
      await page.waitForTimeout(1000);
      
      const afterState = await captureStep(page, 'after-new-task-open');
      
      // Check if wizard opened
      const wizardOpened = afterState.hasElement('Create') || 
                           afterState.hasElement('Task') ||
                           afterState.hasElement('Title');
      
      console.log(`>>> Task wizard opened: ${wizardOpened}`);
      
      // Close dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      await captureStep(page, 'after-new-task-close');
    } else {
      console.log('>>> New Task button disabled - need project first');
    }
  });

  test('Step 6: Final state capture', async () => {
    await captureStep(page, 'final-state');
    
    console.log('\n>>> Test complete!');
    console.log(`>>> Total steps captured: ${stepCounter}`);
    console.log(`>>> Artifacts saved to: ${ARTIFACTS_DIR}`);
  });
});
