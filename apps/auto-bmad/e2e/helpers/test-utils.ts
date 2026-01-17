/**
 * Shared E2E Test Utilities
 * 
 * Common helpers used across all E2E test files.
 */

import { ElectronApplication, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Configuration
// ============================================================================

export const APP_PATH = path.join(__dirname, '..', '..', 'out', 'main', 'index.js');
export const TEST_PROJECT_PATH = '/home/hafiz/git/github.com/fairyhunter13/Auto-Claude';

export function getArtifactsDir(suiteName: string): string {
  const dir = path.join(__dirname, '..', 'test-results', suiteName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ============================================================================
// Window Management
// ============================================================================

/**
 * Get the main application window (not DevTools)
 * The app may open DevTools which becomes firstWindow, so we need to find
 * the actual app window by checking the title or content.
 */
export async function getMainWindow(electronApp: ElectronApplication): Promise<Page> {
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

// ============================================================================
// App Readiness
// ============================================================================

/**
 * Wait for the app to be fully ready (React hydrated)
 */
export async function waitForAppReady(page: Page, timeout = 30000) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  await page.waitForFunction(() => document.body.innerHTML.length > 100, { timeout });
  await page.waitForTimeout(1000); // Extra time for React hydration
}

// ============================================================================
// Modal Handling
// ============================================================================

/**
 * Dismiss any open modals/dialogs that might be blocking interactions
 */
export async function dismissAnyModals(page: Page) {
  const hasModalBackdrop = await page.locator('[data-state="open"].fixed.inset-0').isVisible().catch(() => false);
  
  if (hasModalBackdrop) {
    // Try pressing Escape multiple times
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      const stillHasModal = await page.locator('[data-state="open"].fixed.inset-0').isVisible().catch(() => false);
      if (!stillHasModal) {
        break;
      }
    }
    
    // If still has modal, try clicking close button
    const closeBtn = page.locator('button[aria-label="Close"], [role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Skip")').first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(500);
    }
  }
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * Navigate to a sidebar view by name
 */
export async function navigateToView(page: Page, viewName: string): Promise<boolean> {
  await dismissAnyModals(page);
  
  const selectors = [
    `button:has-text("${viewName}")`,
    `[role="button"]:has-text("${viewName}")`,
    `a:has-text("${viewName}")`,
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
// State Capture
// ============================================================================

export interface StateCapture {
  html: string;
  bodyText: string;
  timestamp: string;
  hasElement: (text: string) => boolean;
  elementCounts: {
    buttons: number;
    inputs: number;
    links: number;
    dialogs: number;
  };
}

/**
 * Capture comprehensive page state
 */
export async function captureState(
  page: Page, 
  artifactsDir: string,
  stepName: string,
  stepNumber?: number
): Promise<StateCapture> {
  const prefix = stepNumber ? String(stepNumber).padStart(2, '0') : '';
  const safeName = prefix 
    ? `${prefix}-${stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`
    : stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  
  // Screenshot
  await page.screenshot({
    path: path.join(artifactsDir, `${safeName}.png`),
    fullPage: true
  });
  
  // HTML dump
  const html = await page.content();
  fs.writeFileSync(path.join(artifactsDir, `${safeName}.html`), html);
  
  // Get body text for assertions
  const bodyText = await page.locator('body').innerText().catch(() => '');
  
  // Element counts
  const elementCounts = {
    buttons: await page.locator('button').count(),
    inputs: await page.locator('input, textarea').count(),
    links: await page.locator('a').count(),
    dialogs: await page.locator('[role="dialog"]').count(),
  };
  
  return {
    html,
    bodyText,
    timestamp: new Date().toISOString(),
    hasElement: (text: string) => bodyText.includes(text) || html.includes(text),
    elementCounts,
  };
}

// ============================================================================
// Project Management (IPC helpers)
// ============================================================================

/**
 * Add a project via IPC API
 */
export async function addProjectViaIPC(page: Page, projectPath: string): Promise<{
  success: boolean;
  projectId?: string;
  error?: string;
}> {
  try {
    const result = await page.evaluate(async (path) => {
      // @ts-ignore
      const response = await window.electronAPI.addProject(path);
      return response;
    }, projectPath);
    
    if (result?.success && result?.data) {
      return { success: true, projectId: result.data.id };
    }
    return { success: false, error: result?.error?.message || 'Unknown error' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Initialize a project via IPC API
 */
export async function initializeProjectViaIPC(page: Page, projectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const result = await page.evaluate(async (id) => {
      // @ts-ignore
      const response = await window.electronAPI.initializeProject(id);
      return response;
    }, projectId);
    
    return { success: result?.success ?? false, error: result?.error?.message };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get all projects via IPC API
 */
export async function getProjectsViaIPC(page: Page): Promise<{
  success: boolean;
  projects?: Array<{ id: string; name: string; path: string }>;
  error?: string;
}> {
  try {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      const response = await window.electronAPI.getProjects();
      return response;
    });
    
    if (result?.success) {
      return { success: true, projects: result.data };
    }
    return { success: false, error: result?.error?.message };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================================
// Electron Launch Config
// ============================================================================

export function getElectronLaunchConfig() {
  return {
    args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
    env: { ...process.env, NODE_ENV: 'test', DISPLAY: ':0' }
  };
}
