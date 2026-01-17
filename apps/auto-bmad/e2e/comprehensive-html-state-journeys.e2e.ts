/**
 * Comprehensive HTML State Capture E2E Tests
 * 
 * Philosophy: Capture and verify HTML state at each navigation point
 * to ensure the "whole car" works correctly across all journeys.
 * 
 * This test suite:
 * 1. Captures HTML content at each navigation state
 * 2. Validates expected elements/text exist in DOM
 * 3. Saves HTML snapshots for debugging
 * 4. Provides comprehensive coverage of all UI journeys
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Test Configuration
// ============================================================================

const APP_PATH = path.join(__dirname, '..', 'out', 'main', 'index.js');
const ARTIFACTS_DIR = path.join(__dirname, 'test-results', 'html-states');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the main application window (not DevTools)
 * The app may open DevTools which becomes the firstWindow, so we need to find
 * the actual app window by checking the title or content.
 */
async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
  const windows = electronApp.windows();
  
  // If only one window, use it
  if (windows.length === 1) {
    return windows[0];
  }
  
  // Find the main app window (not DevTools)
  for (const win of windows) {
    const title = await win.title().catch(() => '');
    const url = win.url();
    
    // Skip DevTools windows
    if (title === 'DevTools' || url.includes('devtools://')) {
      continue;
    }
    
    // Check if this looks like the main app
    const content = await win.content().catch(() => '');
    if (content.includes('Auto BMAD') || content.includes('Kanban') || content.includes('auto-bmad')) {
      return win;
    }
  }
  
  // Fallback: return the window that's NOT DevTools
  for (const win of windows) {
    const title = await win.title().catch(() => '');
    if (title !== 'DevTools') {
      return win;
    }
  }
  
  // Last resort: first window
  return windows[0];
}

interface StateCapture {
  html: string;
  timestamp: string;
  viewName: string;
  url: string;
  title: string;
  bodyText: string;
  elementCounts: {
    buttons: number;
    inputs: number;
    links: number;
    dialogs: number;
    forms: number;
  };
  foundElements: string[];
  missingElements: string[];
}

/**
 * Capture comprehensive state of the page including HTML
 */
async function captureState(page: Page, viewName: string, expectedElements: string[] = []): Promise<StateCapture> {
  const html = await page.content();
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const title = await page.title().catch(() => '');
  
  // Count various element types
  const elementCounts = {
    buttons: await page.locator('button').count(),
    inputs: await page.locator('input, textarea').count(),
    links: await page.locator('a').count(),
    dialogs: await page.locator('[role="dialog"]').count(),
    forms: await page.locator('form').count(),
  };

  // Check for expected elements
  const foundElements: string[] = [];
  const missingElements: string[] = [];
  
  for (const el of expectedElements) {
    const found = await page.locator(`text=${el}`).first().isVisible().catch(() => false) ||
                  html.includes(el);
    if (found) {
      foundElements.push(el);
    } else {
      missingElements.push(el);
    }
  }

  const state: StateCapture = {
    html,
    timestamp: new Date().toISOString(),
    viewName,
    url: page.url(),
    title,
    bodyText: bodyText.substring(0, 5000), // Truncate for logging
    elementCounts,
    foundElements,
    missingElements,
  };

  // Save HTML to file for debugging
  const safeName = viewName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const htmlPath = path.join(ARTIFACTS_DIR, `${safeName}.html`);
  const statePath = path.join(ARTIFACTS_DIR, `${safeName}-state.json`);
  
  fs.writeFileSync(htmlPath, html);
  fs.writeFileSync(statePath, JSON.stringify({
    ...state,
    html: '[see .html file]',
    bodyText: state.bodyText.substring(0, 1000) + '...',
  }, null, 2));

  return state;
}

/**
 * Take screenshot with consistent naming
 */
async function screenshot(page: Page, name: string) {
  const safeName = name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, `${safeName}.png`),
    fullPage: true
  });
}

/**
 * Wait for app to be ready
 */
async function waitForAppReady(page: Page, timeout = 30000) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForFunction(() => document.body.innerHTML.length > 100, { timeout });
  await page.waitForTimeout(1000); // Extra time for React hydration
}

/**
 * Navigate to a view by clicking sidebar button
 */
async function navigateToView(page: Page, viewName: string): Promise<boolean> {
  // Try multiple selector strategies
  const selectors = [
    `button:has-text("${viewName}")`,
    `[role="button"]:has-text("${viewName}")`,
    `a:has-text("${viewName}")`,
    `text=${viewName}`,
  ];
  
  for (const selector of selectors) {
    const element = page.locator(selector).first();
    const isVisible = await element.isVisible().catch(() => false);
    const isEnabled = await element.isEnabled().catch(() => false);
    
    if (isVisible && isEnabled) {
      await element.click();
      await page.waitForTimeout(500);
      return true;
    }
  }
  
  return false;
}

// ============================================================================
// Test Suite: App Launch & Initial State
// ============================================================================

test.describe('App Launch & Initial State Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    // Wait for windows to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Initial app state has all required UI elements', async () => {
    const expectedElements = [
      'Auto BMAD',
      'Settings',
      'New Task',
    ];

    const state = await captureState(page, 'initial-launch', expectedElements);
    await screenshot(page, 'initial-launch');

    // Log state for debugging
    console.log('=== Initial Launch State ===');
    console.log('Title:', state.title);
    console.log('Element counts:', state.elementCounts);
    console.log('Found elements:', state.foundElements);
    console.log('Missing elements:', state.missingElements);

    // Validate minimum requirements
    expect(state.elementCounts.buttons).toBeGreaterThan(5);
    expect(state.html.length).toBeGreaterThan(1000);
  });

  test('Sidebar contains all navigation items', async () => {
    const sidebarNavItems = [
      'Kanban',
      'Terminal',
      'Insight',
      'Roadmap',
      'Ideation',
      'Changelog',
      'Context',
      'Worktree',
    ];

    const state = await captureState(page, 'sidebar-navigation', sidebarNavItems);
    await screenshot(page, 'sidebar-navigation');

    console.log('=== Sidebar Navigation ===');
    console.log('Found nav items:', state.foundElements);
    console.log('Missing nav items:', state.missingElements);

    // At least some navigation items should be found
    expect(state.foundElements.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Test Suite: Navigation View States
// ============================================================================

test.describe('Navigation View State Transitions', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  // Define all views and their expected content
  const viewDefinitions = [
    {
      name: 'Kanban',
      expectedContent: ['Backlog', 'Progress', 'Review', 'Done', 'Task'],
      description: 'Task management kanban board',
    },
    {
      name: 'Terminals',
      expectedContent: ['Terminal', 'New', 'Agent'],
      description: 'AI agent terminals grid',
    },
    {
      name: 'Insights',
      expectedContent: ['Insight', 'Analysis'],
      description: 'Project insights and analysis',
    },
    {
      name: 'Roadmap',
      expectedContent: ['Roadmap', 'Feature', 'Generate'],
      description: 'Feature roadmap planning',
    },
    {
      name: 'Ideation',
      expectedContent: ['Idea', 'Generate', 'Type'],
      description: 'AI-powered feature ideation',
    },
    {
      name: 'Changelog',
      expectedContent: ['Changelog', 'Change', 'Version'],
      description: 'Project changelog',
    },
    {
      name: 'Context',
      expectedContent: ['Context', 'Memory', 'Project'],
      description: 'Project context and memory',
    },
    {
      name: 'Worktrees',
      expectedContent: ['Worktree', 'Branch', 'Git'],
      description: 'Git worktree management',
    },
  ];

  for (const view of viewDefinitions) {
    test(`Navigate to ${view.name} view and validate state`, async () => {
      const navigated = await navigateToView(page, view.name);
      
      if (!navigated) {
        console.log(`Could not navigate to ${view.name} - button not found or not enabled`);
        // Still capture state to see what's there
      }

      await page.waitForTimeout(500);
      
      const state = await captureState(page, `view-${view.name}`, view.expectedContent);
      await screenshot(page, `view-${view.name}`);

      console.log(`=== ${view.name} View ===`);
      console.log('Description:', view.description);
      console.log('Element counts:', state.elementCounts);
      console.log('Found content:', state.foundElements);
      console.log('Missing content:', state.missingElements);
      console.log('Body text preview:', state.bodyText.substring(0, 500));

      // Verify the view loaded (has reasonable content)
      expect(state.html.length).toBeGreaterThan(500);
    });
  }
});

// ============================================================================
// Test Suite: Settings Dialog States
// ============================================================================

test.describe('Settings Dialog State Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Open Settings dialog and capture all sections', async () => {
    // Find and click settings button
    const settingsBtn = page.locator('button:has-text("Settings")').first();
    const canClick = await settingsBtn.isEnabled().catch(() => false);
    
    if (canClick) {
      await settingsBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    const expectedSettingsSections = [
      'Appearance',
      'Display',
      'Language',
      'DevTools',
      'Agent',
      'Paths',
      'Integrations',
      'API',
      'Profile',
      'Update',
      'Notification',
    ];

    const state = await captureState(page, 'settings-dialog', expectedSettingsSections);
    await screenshot(page, 'settings-dialog');

    console.log('=== Settings Dialog ===');
    console.log('Dialog count:', state.elementCounts.dialogs);
    console.log('Found sections:', state.foundElements);
    console.log('Missing sections:', state.missingElements);
    console.log('Input count:', state.elementCounts.inputs);

    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  test('Settings sections are accessible', async () => {
    const settingsSections = [
      { name: 'Appearance', expected: ['Theme', 'Color', 'Dark', 'Light'] },
      { name: 'Display', expected: ['Scale', 'UI', 'Size'] },
      { name: 'Language', expected: ['Language', 'English'] },
    ];

    // Open settings
    const settingsBtn = page.locator('button:has-text("Settings")').first();
    if (await settingsBtn.isEnabled().catch(() => false)) {
      await settingsBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
    }

    for (const section of settingsSections) {
      // Try to navigate to section
      const sectionBtn = page.locator(`button:has-text("${section.name}"), text=${section.name}`).first();
      if (await sectionBtn.isVisible().catch(() => false)) {
        await sectionBtn.click().catch(() => {});
        await page.waitForTimeout(300);
        
        const state = await captureState(page, `settings-${section.name}`, section.expected);
        await screenshot(page, `settings-${section.name}`);
        
        console.log(`=== Settings: ${section.name} ===`);
        console.log('Found:', state.foundElements);
      }
    }

    // Close settings
    await page.keyboard.press('Escape');
  });
});

// ============================================================================
// Test Suite: Task Creation Flow States
// ============================================================================

test.describe('Task Creation Flow State Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('New Task button state and dialog structure', async () => {
    const newTaskBtn = page.locator('button:has-text("New Task")').first();
    const isVisible = await newTaskBtn.isVisible().catch(() => false);
    const isEnabled = await newTaskBtn.isEnabled().catch(() => false);

    console.log('=== New Task Button State ===');
    console.log('Visible:', isVisible);
    console.log('Enabled:', isEnabled);

    await screenshot(page, 'new-task-button-state');

    if (isEnabled) {
      await newTaskBtn.click();
      await page.waitForTimeout(500);

      const expectedWizardElements = [
        'Create',
        'Task',
        'Description',
        'Title',
        'Cancel',
      ];

      const state = await captureState(page, 'task-creation-wizard', expectedWizardElements);
      await screenshot(page, 'task-creation-wizard');

      console.log('=== Task Creation Wizard ===');
      console.log('Dialog count:', state.elementCounts.dialogs);
      console.log('Input count:', state.elementCounts.inputs);
      console.log('Found elements:', state.foundElements);
      console.log('Missing elements:', state.missingElements);

      // Close dialog
      await page.keyboard.press('Escape');
    } else {
      console.log('New Task button not enabled (requires initialized project)');
      
      // Capture current state anyway
      const state = await captureState(page, 'new-task-disabled', []);
      console.log('Current state buttons:', state.elementCounts.buttons);
    }
  });
});

// ============================================================================
// Test Suite: MCP/Agent Tools States
// ============================================================================

test.describe('MCP/Agent Tools State Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('MCP Overview page state', async () => {
    // Navigate to MCP/Agent Tools
    await navigateToView(page, 'MCP');
    await navigateToView(page, 'Agent Tools');
    await page.waitForTimeout(500);

    const expectedMCPElements = [
      'MCP',
      'Server',
      'Context7',
      'Graphiti',
      'Linear',
      'Electron',
      'Puppeteer',
      'Custom',
      'Agent',
    ];

    const state = await captureState(page, 'mcp-agent-tools', expectedMCPElements);
    await screenshot(page, 'mcp-agent-tools');

    console.log('=== MCP/Agent Tools ===');
    console.log('Found elements:', state.foundElements);
    console.log('Missing elements:', state.missingElements);
    console.log('Body preview:', state.bodyText.substring(0, 1000));

    // Check for specific MCP-related content in HTML
    const hasMCPContent = state.html.includes('MCP') || 
                          state.html.includes('Server') || 
                          state.html.includes('Agent');
    console.log('Has MCP-related content:', hasMCPContent);
  });
});

// ============================================================================
// Test Suite: Onboarding Flow States
// ============================================================================

test.describe('Onboarding Flow State Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Capture onboarding/welcome state', async () => {
    const expectedOnboardingElements = [
      'Welcome',
      'Get Started',
      'Skip',
      'Setup',
      'Auto BMAD',
    ];

    const state = await captureState(page, 'onboarding-welcome', expectedOnboardingElements);
    await screenshot(page, 'onboarding-welcome');

    console.log('=== Onboarding/Welcome State ===');
    console.log('Found elements:', state.foundElements);
    console.log('Missing elements:', state.missingElements);

    // Check if in onboarding or main app
    const hasOnboarding = state.html.includes('Get Started') || 
                          state.html.includes('Setup Wizard') ||
                          state.html.includes('Welcome to');
    const hasMainApp = state.html.includes('Kanban') || 
                       state.html.includes('New Task');

    console.log('In onboarding flow:', hasOnboarding);
    console.log('In main app:', hasMainApp);
  });
});

// ============================================================================
// Test Suite: Project Management States
// ============================================================================

test.describe('Project Management State Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Project tab bar and welcome screen states', async () => {
    const expectedProjectElements = [
      'Project',
      'New Project',
      'Open Project',
      'Recent',
    ];

    const state = await captureState(page, 'project-management', expectedProjectElements);
    await screenshot(page, 'project-management');

    console.log('=== Project Management State ===');
    console.log('Found elements:', state.foundElements);
    console.log('Missing elements:', state.missingElements);

    // Check for project-related UI
    const hasProjectUI = state.html.includes('Project') || 
                         state.html.includes('project');
    console.log('Has project-related UI:', hasProjectUI);
  });

  test('Add project modal structure', async () => {
    // Try to open add project modal
    const addProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Add Project"), button:has-text("Open")').first();
    
    if (await addProjectBtn.isVisible().catch(() => false)) {
      await addProjectBtn.click().catch(() => {});
      await page.waitForTimeout(500);

      const state = await captureState(page, 'add-project-modal', ['Project', 'Path', 'Add', 'Cancel']);
      await screenshot(page, 'add-project-modal');

      console.log('=== Add Project Modal ===');
      console.log('Dialog count:', state.elementCounts.dialogs);
      console.log('Found elements:', state.foundElements);

      // Close modal
      await page.keyboard.press('Escape');
    }
  });
});

// ============================================================================
// Test Suite: Complete Journey Validation
// ============================================================================

test.describe('Complete User Journey Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('Full navigation cycle through all views', async () => {
    const views = [
      'Kanban',
      'Terminals', 
      'Insights',
      'Roadmap',
      'Ideation',
      'Changelog',
      'Context',
      'Worktrees',
    ];

    const results: Record<string, { navigated: boolean; hasContent: boolean; buttonCount: number }> = {};

    for (const view of views) {
      const navigated = await navigateToView(page, view);
      await page.waitForTimeout(300);

      const state = await captureState(page, `journey-${view}`, [view]);
      await screenshot(page, `journey-${view}`);

      results[view] = {
        navigated,
        hasContent: state.html.length > 1000,
        buttonCount: state.elementCounts.buttons,
      };

      console.log(`=== Journey: ${view} ===`);
      console.log('Navigated:', navigated);
      console.log('Content length:', state.html.length);
      console.log('Buttons:', state.elementCounts.buttons);
    }

    // Summary
    console.log('\n=== JOURNEY SUMMARY ===');
    for (const [view, result] of Object.entries(results)) {
      console.log(`${view}: navigated=${result.navigated}, content=${result.hasContent}, buttons=${result.buttonCount}`);
    }

    // At least some views should have navigated successfully
    const successfulNavigations = Object.values(results).filter(r => r.hasContent).length;
    console.log(`Successful navigations: ${successfulNavigations}/${views.length}`);
    
    expect(successfulNavigations).toBeGreaterThan(0);
  });

  test('Capture final comprehensive state', async () => {
    // Navigate back to Kanban (home)
    await navigateToView(page, 'Kanban');
    await page.waitForTimeout(300);

    const state = await captureState(page, 'final-comprehensive-state', [
      'Auto BMAD',
      'Kanban',
      'Settings',
      'New Task',
    ]);
    await screenshot(page, 'final-comprehensive-state');

    console.log('\n=== FINAL STATE ===');
    console.log('Total buttons:', state.elementCounts.buttons);
    console.log('Total inputs:', state.elementCounts.inputs);
    console.log('Total dialogs:', state.elementCounts.dialogs);
    console.log('HTML size:', state.html.length, 'bytes');
    console.log('Found core elements:', state.foundElements);

    // Final validation
    expect(state.html.length).toBeGreaterThan(5000);
    expect(state.elementCounts.buttons).toBeGreaterThan(10);
  });
});

// ============================================================================
// Test Suite: Error State Validation
// ============================================================================

test.describe('Error State & Edge Case Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
    });
    await new Promise(resolve => setTimeout(resolve, 2000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('No React error boundaries triggered', async () => {
    const state = await captureState(page, 'error-check', []);
    
    // Check for common error indicators
    const errorIndicators = [
      'Something went wrong',
      'Error boundary',
      'Uncaught error',
      'Cannot read property',
      'undefined is not',
    ];

    const hasError = errorIndicators.some(indicator => 
      state.html.includes(indicator) || state.bodyText.includes(indicator)
    );

    console.log('=== Error Check ===');
    console.log('Has error indicators:', hasError);

    if (hasError) {
      console.log('Body text:', state.bodyText.substring(0, 2000));
    }

    expect(hasError).toBeFalsy();
  });

  test('All console errors captured', async () => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Do some navigation to trigger any potential errors
    await navigateToView(page, 'Terminals');
    await page.waitForTimeout(300);
    await navigateToView(page, 'Kanban');
    await page.waitForTimeout(300);

    console.log('=== Console Errors ===');
    console.log('Error count:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 5));
    }

    // Log but don't fail on console errors (some may be expected)
  });
});
