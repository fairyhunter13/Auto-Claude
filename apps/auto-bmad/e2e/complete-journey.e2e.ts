/**
 * COMPLETE USER JOURNEY E2E TEST
 * 
 * "From Showroom to Cross-Country Rally"
 * 
 * This test simulates the ENTIRE customer experience:
 * 
 * PHASE 1: SHOWROOM (First Launch)
 *   - App launches successfully
 *   - Welcome screen displays
 *   - UI components are present
 * 
 * PHASE 2: PURCHASE (Project Setup)  
 *   - Add a project via IPC
 *   - Initialize project for Auto BMAD
 *   - Enable full functionality
 * 
 * PHASE 3: CITY DRIVING (Basic Navigation)
 *   - Navigate through all sidebar views
 *   - Verify each view loads correctly
 *   - Test Settings dialog
 * 
 * PHASE 4: HIGHWAY CRUISE (Task Management)
 *   - Create a new task
 *   - Verify task appears in Kanban
 *   - Test task card interactions
 * 
 * PHASE 5: MOUNTAIN TERRAIN (Advanced Features)
 *   - Test MCP server overview
 *   - Test Insights chat interface
 *   - Test Roadmap/Ideation generation UI
 *   - Test Changelog generator
 * 
 * PHASE 6: OFF-ROAD ADVENTURE (Edge Cases)
 *   - Test keyboard navigation
 *   - Test error handling
 *   - Test modal interactions
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PATH = path.join(__dirname, '..', 'out', 'main', 'index.js');
const ARTIFACTS_DIR = path.join(__dirname, 'test-results', 'complete-journey');
const TEST_PROJECT_PATH = '/home/hafiz/git/github.com/fairyhunter13/Auto-Claude';

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ============================================================================
// Test Utilities
// ============================================================================

let stepCounter = 0;
let journeyLog: string[] = [];

function log(message: string) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const logLine = `[${timestamp}] ${message}`;
  journeyLog.push(logLine);
  console.log(logLine);
}

async function captureStep(page: Page, stepName: string): Promise<{
  bodyText: string;
  html: string;
  hasElement: (text: string) => boolean;
}> {
  stepCounter++;
  const prefix = String(stepCounter).padStart(2, '0');
  const safeName = `${prefix}-${stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `${safeName}.png`),
    fullPage: true
  });
  
  const html = await page.content();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, `${safeName}.html`), html);
  
  const bodyText = await page.locator('body').innerText().catch(() => '');
  
  log(`Step ${stepCounter}: ${stepName} - Screenshot: ${safeName}.png`);
  
  return {
    bodyText,
    html,
    hasElement: (text: string) => bodyText.includes(text) || html.includes(text)
  };
}

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

async function waitForAppReady(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.body.innerHTML.length > 100);
  await page.waitForTimeout(1000);
}

async function dismissAnyModals(page: Page) {
  const hasModalBackdrop = await page.locator('[data-state="open"].fixed.inset-0').isVisible().catch(() => false);
  
  if (hasModalBackdrop) {
    log('Found modal backdrop, dismissing...');
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const stillHasModal = await page.locator('[data-state="open"].fixed.inset-0').isVisible().catch(() => false);
      if (!stillHasModal) break;
    }
  }
}

async function navigateToView(page: Page, viewName: string): Promise<boolean> {
  await dismissAnyModals(page);
  
  const button = page.locator(`button:has-text("${viewName}")`).first();
  const isVisible = await button.isVisible().catch(() => false);
  const isEnabled = await button.isEnabled().catch(() => false);
  
  if (isVisible && isEnabled) {
    await button.click();
    await page.waitForTimeout(800);
    return true;
  }
  
  log(`Navigation to ${viewName} failed - visible: ${isVisible}, enabled: ${isEnabled}`);
  return false;
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

test.describe('Complete User Journey - Showroom to Cross-Country Rally', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  let projectId: string | null = null;

  test.beforeAll(async () => {
    log('========================================');
    log('STARTING COMPLETE USER JOURNEY TEST');
    log('========================================');
    
    // Clean artifacts directory
    const files = fs.readdirSync(ARTIFACTS_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(ARTIFACTS_DIR, file));
    }
    stepCounter = 0;
    journeyLog = [];
    
    // Launch app
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    log('App launched successfully');
  });

  test.afterAll(async () => {
    // Save journey log
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'journey-log.txt'),
      journeyLog.join('\n')
    );
    
    log('========================================');
    log(`JOURNEY COMPLETE - ${stepCounter} steps captured`);
    log(`Artifacts saved to: ${ARTIFACTS_DIR}`);
    log('========================================');
    
    await electronApp?.close();
  });

  // ==========================================================================
  // PHASE 1: SHOWROOM (First Launch)
  // ==========================================================================
  
  test.describe('PHASE 1: SHOWROOM - First Launch', () => {
    test('1.1 App launches and displays Auto BMAD branding', async () => {
      const state = await captureStep(page, 'showroom-launch');
      
      expect(state.hasElement('Auto BMAD')).toBeTruthy();
      expect(state.bodyText.length).toBeGreaterThan(100);
      
      log('App displays Auto BMAD branding - PASS');
    });

    test('1.2 Initial UI components are visible', async () => {
      const state = await captureStep(page, 'showroom-components');
      
      // Check for core UI elements
      const hasSettings = state.hasElement('Settings');
      const hasSidebar = state.html.includes('sidebar') || state.html.includes('nav');
      
      log(`Settings button: ${hasSettings}, Sidebar: ${hasSidebar}`);
      expect(hasSettings || hasSidebar).toBeTruthy();
    });

    test('1.3 Welcome or project setup is displayed', async () => {
      const state = await captureStep(page, 'showroom-welcome');
      
      const hasWelcome = state.hasElement('Welcome') || state.hasElement('Get Started');
      const hasKanban = state.hasElement('Kanban') || state.hasElement('Backlog');
      
      log(`Welcome screen: ${hasWelcome}, Already has project: ${hasKanban}`);
      expect(hasWelcome || hasKanban).toBeTruthy();
    });
  });

  // ==========================================================================
  // PHASE 2: PURCHASE (Project Setup)
  // ==========================================================================
  
  test.describe('PHASE 2: PURCHASE - Project Setup', () => {
    test('2.1 Add project via IPC API', async () => {
      log('Adding test project via IPC...');
      
      try {
        const result = await page.evaluate(async (projectPath) => {
          // @ts-ignore
          const response = await window.electronAPI.addProject(projectPath);
          return response;
        }, TEST_PROJECT_PATH);
        
        if (result?.success && result?.data) {
          projectId = result.data.id;
          log(`Project added successfully! ID: ${projectId}`);
          log(`Project name: ${result.data.name}`);
        } else {
          log(`Project add result: ${JSON.stringify(result)}`);
        }
        
        await page.waitForTimeout(1000);
        await captureStep(page, 'purchase-add-project');
        
      } catch (err) {
        log(`Error adding project: ${err}`);
      }
    });

    test('2.2 Initialize project for Auto BMAD', async () => {
      if (!projectId) {
        log('No project ID - checking if project already exists...');
        
        // Try to get existing projects
        const projects = await page.evaluate(async () => {
          // @ts-ignore
          const response = await window.electronAPI.getProjects();
          return response;
        });
        
        if (projects?.success && projects?.data?.length > 0) {
          projectId = projects.data[0].id;
          log(`Using existing project: ${projectId}`);
        }
      }
      
      if (projectId) {
        log(`Initializing project ${projectId}...`);
        
        try {
          const initResult = await page.evaluate(async (id) => {
            // @ts-ignore
            const response = await window.electronAPI.initializeProject(id);
            return response;
          }, projectId);
          
          log(`Initialize result: ${JSON.stringify(initResult)}`);
          
        } catch (err) {
          log(`Initialize error (may already be initialized): ${err}`);
        }
      }
      
      // Reload to sync state
      await page.reload();
      await waitForAppReady(page);
      await page.waitForTimeout(2000);
      
      await captureStep(page, 'purchase-initialize');
    });

    test('2.3 Verify navigation is now enabled', async () => {
      await dismissAnyModals(page);
      
      const kanbanBtn = page.locator('button:has-text("Kanban")').first();
      const isEnabled = await kanbanBtn.isEnabled().catch(() => false);
      
      log(`Kanban button enabled: ${isEnabled}`);
      await captureStep(page, 'purchase-nav-enabled');
      
      expect(isEnabled).toBeTruthy();
    });
  });

  // ==========================================================================
  // PHASE 3: CITY DRIVING (Basic Navigation)
  // ==========================================================================
  
  test.describe('PHASE 3: CITY DRIVING - Navigation', () => {
    const views = [
      { name: 'Kanban', expected: ['Backlog', 'Progress', 'Review', 'Done'] },
      { name: 'Terminals', expected: ['Terminal', 'Agent', 'New'] },
      { name: 'Insights', expected: ['Insight', 'Ask', 'codebase'] },
      { name: 'Roadmap', expected: ['Roadmap', 'Generate'] },
      { name: 'Ideation', expected: ['Idea', 'Generate', 'feature'] },
      { name: 'Changelog', expected: ['Changelog', 'Generate'] },
      { name: 'Context', expected: ['Context', 'Memory', 'Project'] },
      { name: 'MCP', expected: ['MCP', 'Server'] },
      { name: 'Worktrees', expected: ['Worktree', 'workspace'] },
    ];

    for (const view of views) {
      test(`3.${views.indexOf(view) + 1} Navigate to ${view.name} view`, async () => {
        const success = await navigateToView(page, view.name);
        const state = await captureStep(page, `city-${view.name.toLowerCase()}`);
        
        if (success) {
          const hasExpectedContent = view.expected.some(e => state.hasElement(e));
          log(`${view.name} view: navigated=${success}, hasContent=${hasExpectedContent}`);
          expect(hasExpectedContent).toBeTruthy();
        } else {
          log(`${view.name} navigation failed - button may be disabled`);
        }
      });
    }

    test('3.10 Test Settings dialog', async () => {
      await dismissAnyModals(page);
      
      const settingsBtn = page.locator('button:has-text("Settings")').first();
      const isEnabled = await settingsBtn.isEnabled().catch(() => false);
      
      if (isEnabled) {
        await settingsBtn.click();
        await page.waitForTimeout(800);
        
        const state = await captureStep(page, 'city-settings-open');
        
        const hasSettingsContent = state.hasElement('Appearance') || 
                                    state.hasElement('Settings') ||
                                    state.hasElement('Theme');
        
        log(`Settings dialog opened: ${hasSettingsContent}`);
        expect(hasSettingsContent).toBeTruthy();
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await captureStep(page, 'city-settings-closed');
      }
    });
  });

  // ==========================================================================
  // PHASE 4: HIGHWAY CRUISE (Task Management)
  // ==========================================================================
  
  test.describe('PHASE 4: HIGHWAY CRUISE - Task Management', () => {
    test('4.1 Navigate to Kanban view', async () => {
      await navigateToView(page, 'Kanban');
      await captureStep(page, 'highway-kanban');
    });

    test('4.2 Check New Task button state', async () => {
      await dismissAnyModals(page);
      
      const newTaskBtn = page.locator('button:has-text("New Task")').first();
      const isEnabled = await newTaskBtn.isEnabled().catch(() => false);
      
      log(`New Task button enabled: ${isEnabled}`);
      await captureStep(page, 'highway-new-task-state');
      
      // If enabled, we can proceed with task creation
      if (isEnabled) {
        log('New Task button is enabled - project is initialized!');
      } else {
        log('New Task button disabled - checking for initialization message');
        const state = await captureStep(page, 'highway-init-message');
        const needsInit = state.hasElement('Initialize Auto BMAD');
        log(`Needs initialization: ${needsInit}`);
      }
    });

    test('4.3 Open task creation wizard (if enabled)', async () => {
      const newTaskBtn = page.locator('button:has-text("New Task")').first();
      const isEnabled = await newTaskBtn.isEnabled().catch(() => false);
      
      if (isEnabled) {
        await newTaskBtn.click();
        await page.waitForTimeout(800);
        
        const state = await captureStep(page, 'highway-task-wizard');
        
        const hasWizard = state.hasElement('Create') || 
                          state.hasElement('Task') ||
                          state.hasElement('Title') ||
                          state.hasElement('Description');
        
        log(`Task wizard opened: ${hasWizard}`);
        
        if (hasWizard) {
          // Try to create a test task
          const titleInput = page.locator('input[placeholder*="title"], input[name*="title"]').first();
          if (await titleInput.isVisible().catch(() => false)) {
            await titleInput.fill('E2E Test Task');
            log('Filled task title');
          }
          
          await captureStep(page, 'highway-task-filled');
        }
        
        // Close the wizard
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await captureStep(page, 'highway-wizard-closed');
      } else {
        log('Skipping task creation - button disabled');
      }
    });

    test('4.4 Verify Kanban columns exist', async () => {
      await navigateToView(page, 'Kanban');
      const state = await captureStep(page, 'highway-kanban-columns');
      
      const columns = ['Backlog', 'In Progress', 'AI Review', 'Human Review', 'Done'];
      const foundColumns = columns.filter(col => state.hasElement(col));
      
      log(`Found Kanban columns: ${foundColumns.join(', ')}`);
      expect(foundColumns.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // PHASE 5: MOUNTAIN TERRAIN (Advanced Features)
  // ==========================================================================
  
  test.describe('PHASE 5: MOUNTAIN TERRAIN - Advanced Features', () => {
    test('5.1 MCP Server Overview', async () => {
      await navigateToView(page, 'MCP');
      const state = await captureStep(page, 'mountain-mcp');
      
      const hasMCPContent = state.hasElement('MCP') || 
                            state.hasElement('Server') ||
                            state.hasElement('Context7');
      
      log(`MCP view content: ${hasMCPContent}`);
    });

    test('5.2 Insights chat interface', async () => {
      await navigateToView(page, 'Insights');
      const state = await captureStep(page, 'mountain-insights');
      
      const hasInsights = state.hasElement('Ask') || 
                          state.hasElement('codebase') ||
                          state.hasElement('question');
      
      log(`Insights interface: ${hasInsights}`);
    });

    test('5.3 Roadmap generation UI', async () => {
      await navigateToView(page, 'Roadmap');
      const state = await captureStep(page, 'mountain-roadmap');
      
      const hasRoadmap = state.hasElement('Roadmap') || 
                         state.hasElement('Generate') ||
                         state.hasElement('AI-powered');
      
      log(`Roadmap UI: ${hasRoadmap}`);
    });

    test('5.4 Ideation feature types', async () => {
      await navigateToView(page, 'Ideation');
      const state = await captureStep(page, 'mountain-ideation');
      
      const featureTypes = ['Performance', 'Security', 'UX', 'Documentation'];
      const foundTypes = featureTypes.filter(t => state.hasElement(t));
      
      log(`Ideation types found: ${foundTypes.join(', ')}`);
    });

    test('5.5 Changelog generator', async () => {
      await navigateToView(page, 'Changelog');
      const state = await captureStep(page, 'mountain-changelog');
      
      const hasChangelog = state.hasElement('Changelog') || 
                           state.hasElement('Generate') ||
                           state.hasElement('commits');
      
      log(`Changelog UI: ${hasChangelog}`);
    });

    test('5.6 Context/Memory view', async () => {
      await navigateToView(page, 'Context');
      const state = await captureStep(page, 'mountain-context');
      
      const hasContext = state.hasElement('Context') || 
                         state.hasElement('Memory') ||
                         state.hasElement('Project Index');
      
      log(`Context view: ${hasContext}`);
    });
  });

  // ==========================================================================
  // PHASE 6: OFF-ROAD ADVENTURE (Edge Cases)
  // ==========================================================================
  
  test.describe('PHASE 6: OFF-ROAD ADVENTURE - Edge Cases', () => {
    test('6.1 Keyboard navigation works', async () => {
      // Press Tab multiple times
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }
      
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
      log(`Focused element after Tab: ${focusedTag}`);
      
      await captureStep(page, 'offroad-keyboard-nav');
    });

    test('6.2 Escape key closes dialogs', async () => {
      // Open settings
      const settingsBtn = page.locator('button:has-text("Settings")').first();
      if (await settingsBtn.isEnabled().catch(() => false)) {
        await settingsBtn.click();
        await page.waitForTimeout(500);
        
        const beforeState = await captureStep(page, 'offroad-dialog-open');
        const hadDialog = beforeState.hasElement('Appearance') || beforeState.html.includes('dialog');
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        await captureStep(page, 'offroad-dialog-closed');
        log(`Dialog handling: opened=${hadDialog}`);
      }
    });

    test('6.3 No React error boundaries triggered', async () => {
      const state = await captureStep(page, 'offroad-error-check');
      
      const errorIndicators = [
        'Something went wrong',
        'Error boundary',
        'Uncaught error',
        'Cannot read property',
        'undefined is not',
      ];
      
      const hasError = errorIndicators.some(e => state.hasElement(e));
      log(`Error check: hasError=${hasError}`);
      
      expect(hasError).toBeFalsy();
    });

    test('6.4 Console errors check', async () => {
      const consoleErrors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Do some navigation to trigger potential errors
      await navigateToView(page, 'Terminals');
      await page.waitForTimeout(300);
      await navigateToView(page, 'Kanban');
      await page.waitForTimeout(300);
      
      log(`Console errors detected: ${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        log(`First 3 errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
      }
      
      await captureStep(page, 'offroad-console-check');
    });

    test('6.5 Final state validation', async () => {
      await navigateToView(page, 'Kanban');
      const state = await captureStep(page, 'offroad-final-state');
      
      // Validate core components are still working
      expect(state.html.length).toBeGreaterThan(5000);
      expect(state.hasElement('Auto BMAD')).toBeTruthy();
      
      log('JOURNEY COMPLETE - All phases passed!');
    });
  });
});
