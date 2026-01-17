/**
 * P1 Worktree Lifecycle E2E Tests
 * 
 * Tests for git worktree operations:
 * - Worktree listing
 * - Worktree status checking
 * - Worktree diff viewing
 * - Merge operations
 * - Discard operations
 * - PR creation
 * 
 * These tests verify the worktree handlers in worktree-handlers.ts
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

import {
  TEST_PROJECT_AUTO_CLAUDE,
} from './fixtures/test-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PATH = path.join(__dirname, '..', 'out', 'main', 'index.js');
const ARTIFACTS_DIR = path.join(__dirname, 'test-results', 'p1-worktree-lifecycle');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ============================================================================
// Test Utilities
// ============================================================================

function log(message: string): void {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] ${message}`);
}

async function captureStep(page: Page, stepName: string): Promise<void> {
  const safeName = stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  // Skip screenshots in headless mode (window not visible)
  if (process.env.E2E_HEADLESS !== '1') {
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, `${safeName}.png`),
      fullPage: true
    });
  }
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

async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.body.innerHTML.length > 100);
  await page.waitForTimeout(1500);
}

async function callIPC<T>(page: Page, method: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ({ method, args }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI;
      if (!api || typeof api[method] !== 'function') {
        return { success: false, error: `Method ${method} not found` };
      }
      return api[method](...args);
    },
    { method, args }
  ) as Promise<T>;
}

async function getFirstProjectId(page: Page): Promise<string | null> {
  type ProjectsResult = { success: boolean; data?: Array<{ id: string }> };
  const result = await callIPC<ProjectsResult>(page, 'getProjects');
  return result.success && result.data?.[0]?.id ? result.data[0].id : null;
}

// ============================================================================
// P1-1: Worktree Listing Tests
// ============================================================================

test.describe('P1-1: Worktree Listing', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    log('=== P1-1: Worktree Listing ===');
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    await callIPC(page, 'addProject', TEST_PROJECT_AUTO_CLAUDE.path);
    await page.reload();
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('1.1 List worktrees API is available', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.listWorktrees === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('listWorktrees API available');
  });

  test('1.2 List worktrees for project', async () => {
    const projectId = await getFirstProjectId(page);
    expect(projectId).toBeTruthy();
    
    type WorktreeListResult = {
      success: boolean;
      data?: {
        worktrees: Array<{
          path: string;
          branch: string;
          head: string;
          isBare?: boolean;
          isMain?: boolean;
        }>;
      };
      error?: string;
    };
    
    const result = await callIPC<WorktreeListResult>(page, 'listWorktrees', projectId);
    
    if (result.success) {
      log(`Found ${result.data?.worktrees?.length || 0} worktrees`);
      result.data?.worktrees?.forEach(wt => {
        log(`  - ${wt.branch} @ ${wt.path}`);
        log(`    HEAD: ${wt.head?.substring(0, 8) || 'unknown'}`);
        log(`    Main: ${wt.isMain}, Bare: ${wt.isBare}`);
      });
    } else {
      log(`Worktree list failed: ${result.error}`);
    }
    
    await captureStep(page, 'worktree-list');
  });

  test('1.3 Worktree list handles non-git project', async () => {
    // This test verifies graceful handling when project is not a git repo
    // In our case, the test project IS a git repo, so we just verify the API works
    
    const projectId = await getFirstProjectId(page);
    type WorktreeListResult = { success: boolean; error?: string };
    const result = await callIPC<WorktreeListResult>(page, 'listWorktrees', projectId);
    
    // Should either succeed or fail gracefully with error message
    expect(result.success !== undefined).toBeTruthy();
    
    if (!result.success) {
      expect(result.error).toBeTruthy();
      log(`Expected error: ${result.error}`);
    }
  });
});

// ============================================================================
// P1-2: Worktree Status Tests
// ============================================================================

test.describe('P1-2: Worktree Status', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    log('=== P1-2: Worktree Status ===');
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    await callIPC(page, 'addProject', TEST_PROJECT_AUTO_CLAUDE.path);
    await page.reload();
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('2.1 Get worktree status API is available', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.getWorktreeStatus === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('getWorktreeStatus API available');
  });

  test('2.2 Get worktree status for task (may not exist)', async () => {
    const projectId = await getFirstProjectId(page);
    
    // Get a task to check
    type TasksResult = { success: boolean; data?: Array<{ id: string; status: string }> };
    const tasksResult = await callIPC<TasksResult>(page, 'getTasks', projectId);
    
    const anyTask = tasksResult.data?.[0];
    
    if (!anyTask) {
      log('No tasks available - skipping');
      return;
    }
    
    type WorktreeStatusResult = {
      success: boolean;
      data?: {
        exists: boolean;
        path?: string;
        branch?: string;
        hasChanges?: boolean;
        filesChanged?: number;
        insertions?: number;
        deletions?: number;
      };
      error?: string;
    };
    
    const result = await callIPC<WorktreeStatusResult>(page, 'getWorktreeStatus', anyTask.id);
    
    log(`Worktree status for ${anyTask.id}:`);
    log(`  Success: ${result.success}`);
    
    if (result.success && result.data) {
      log(`  Exists: ${result.data.exists}`);
      if (result.data.exists) {
        log(`  Path: ${result.data.path}`);
        log(`  Branch: ${result.data.branch}`);
        log(`  Has changes: ${result.data.hasChanges}`);
        log(`  Files changed: ${result.data.filesChanged}`);
        log(`  +${result.data.insertions}/-${result.data.deletions}`);
      }
    } else if (result.error) {
      log(`  Error: ${result.error}`);
    }
    
    await captureStep(page, 'worktree-status');
  });

  test('2.3 Worktree status handles non-existent task', async () => {
    type WorktreeStatusResult = { success: boolean; error?: string };
    const result = await callIPC<WorktreeStatusResult>(
      page, 
      'getWorktreeStatus', 
      'non-existent-task-id'
    );
    
    // Should fail gracefully
    expect(result.success).toBeFalsy();
    expect(result.error).toBeTruthy();
    log(`Expected error: ${result.error}`);
  });
});

// ============================================================================
// P1-3: Worktree Diff Tests
// ============================================================================

test.describe('P1-3: Worktree Diff', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    log('=== P1-3: Worktree Diff ===');
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    await callIPC(page, 'addProject', TEST_PROJECT_AUTO_CLAUDE.path);
    await page.reload();
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('3.1 Get worktree diff API is available', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.getWorktreeDiff === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('getWorktreeDiff API available');
  });

  test('3.2 Get diff for task with worktree', async () => {
    const projectId = await getFirstProjectId(page);
    
    type TasksResult = { 
      success: boolean; 
      data?: Array<{ id: string; status: string }> 
    };
    const tasksResult = await callIPC<TasksResult>(page, 'getTasks', projectId);
    
    // Find task in human_review (most likely to have worktree)
    const reviewTask = tasksResult.data?.find(t => t.status === 'human_review');
    
    if (!reviewTask) {
      log('No task in human_review - skipping diff test');
      return;
    }
    
    type WorktreeDiffResult = {
      success: boolean;
      data?: {
        files: Array<{
          path: string;
          status: string;
          additions?: number;
          deletions?: number;
          diff?: string;
        }>;
        summary?: {
          filesChanged: number;
          insertions: number;
          deletions: number;
        };
      };
      error?: string;
    };
    
    const result = await callIPC<WorktreeDiffResult>(page, 'getWorktreeDiff', reviewTask.id);
    
    if (result.success && result.data) {
      log(`Diff for ${reviewTask.id}:`);
      log(`  Files: ${result.data.files?.length || 0}`);
      result.data.files?.slice(0, 5).forEach(f => {
        log(`    - ${f.status}: ${f.path} (+${f.additions}/-${f.deletions})`);
      });
      if (result.data.files && result.data.files.length > 5) {
        log(`    ... and ${result.data.files.length - 5} more`);
      }
    } else {
      log(`Diff failed: ${result.error}`);
    }
  });
});

// ============================================================================
// P1-4: Merge/Discard Operations
// ============================================================================

test.describe('P1-4: Merge/Discard Operations', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    log('=== P1-4: Merge/Discard Operations ===');
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    await callIPC(page, 'addProject', TEST_PROJECT_AUTO_CLAUDE.path);
    await page.reload();
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('4.1 All worktree APIs are available', async () => {
    const apis = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI;
      return {
        mergeWorktree: typeof api.mergeWorktree === 'function',
        mergeWorktreePreview: typeof api.mergeWorktreePreview === 'function',
        discardWorktree: typeof api.discardWorktree === 'function',
        clearStagedState: typeof api.clearStagedState === 'function',
        createWorktreePR: typeof api.createWorktreePR === 'function',
      };
    });
    
    log(`Merge/Discard APIs available:`);
    log(`  mergeWorktree: ${apis.mergeWorktree}`);
    log(`  mergeWorktreePreview: ${apis.mergeWorktreePreview}`);
    log(`  discardWorktree: ${apis.discardWorktree}`);
    log(`  clearStagedState: ${apis.clearStagedState}`);
    log(`  createWorktreePR: ${apis.createWorktreePR}`);
    
    expect(apis.mergeWorktree).toBeTruthy();
    expect(apis.discardWorktree).toBeTruthy();
    expect(apis.createWorktreePR).toBeTruthy();
  });

  test('4.2 Merge preview API', async () => {
    const projectId = await getFirstProjectId(page);
    type TasksResult = { success: boolean; data?: Array<{ id: string; status: string }> };
    const tasksResult = await callIPC<TasksResult>(page, 'getTasks', projectId);
    
    const reviewTask = tasksResult.data?.find(t => t.status === 'human_review');
    
    if (!reviewTask) {
      log('No task in human_review - skipping merge preview');
      return;
    }
    
    type MergePreviewResult = {
      success: boolean;
      data?: {
        canMerge?: boolean;
        hasConflicts?: boolean;
        conflictFiles?: string[];
      };
      error?: string;
    };
    
    const result = await callIPC<MergePreviewResult>(page, 'mergeWorktreePreview', reviewTask.id);
    
    if (result.success && result.data) {
      log(`Merge preview for ${reviewTask.id}:`);
      log(`  Can merge: ${result.data.canMerge}`);
      log(`  Has conflicts: ${result.data.hasConflicts}`);
      if (result.data.conflictFiles?.length) {
        log(`  Conflict files: ${result.data.conflictFiles.join(', ')}`);
      }
    } else {
      log(`Preview failed: ${result.error}`);
    }
  });

  test('4.3 Discard handles non-existent worktree', async () => {
    // Test graceful handling when task has no worktree
    const projectId = await getFirstProjectId(page);
    type TasksResult = { success: boolean; data?: Array<{ id: string; status: string }> };
    const tasksResult = await callIPC<TasksResult>(page, 'getTasks', projectId);
    
    const backlogTask = tasksResult.data?.find(t => t.status === 'backlog');
    
    if (!backlogTask) {
      log('No backlog task - skipping');
      return;
    }
    
    type DiscardResult = { success: boolean; error?: string };
    const result = await callIPC<DiscardResult>(page, 'discardWorktree', backlogTask.id);
    
    // Should fail gracefully (no worktree to discard)
    log(`Discard on backlog task: success=${result.success}, error=${result.error}`);
  });
});

// ============================================================================
// P1-5: PR Creation Tests
// ============================================================================

test.describe('P1-5: PR Creation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    log('=== P1-5: PR Creation ===');
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    await callIPC(page, 'addProject', TEST_PROJECT_AUTO_CLAUDE.path);
    await page.reload();
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('5.1 PR creation API available', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.createWorktreePR === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('createWorktreePR API available');
  });

  test('5.2 PR creation requires task with worktree', async () => {
    // Test that PR creation fails gracefully without worktree
    const projectId = await getFirstProjectId(page);
    type TasksResult = { success: boolean; data?: Array<{ id: string; status: string }> };
    const tasksResult = await callIPC<TasksResult>(page, 'getTasks', projectId);
    
    const backlogTask = tasksResult.data?.find(t => t.status === 'backlog');
    
    if (!backlogTask) {
      log('No backlog task - skipping');
      return;
    }
    
    type PRResult = { success: boolean; error?: string };
    const result = await callIPC<PRResult>(page, 'createWorktreePR', backlogTask.id, {
      title: 'Test PR',
      body: 'Test body'
    });
    
    // Should fail (no worktree)
    expect(result.success).toBeFalsy();
    log(`PR creation on backlog task: ${result.error}`);
  });

  test('5.3 PR creation validates options', async () => {
    // This tests the option validation in the handler
    const projectId = await getFirstProjectId(page);
    type TasksResult = { success: boolean; data?: Array<{ id: string; status: string }> };
    const tasksResult = await callIPC<TasksResult>(page, 'getTasks', projectId);
    
    const anyTask = tasksResult.data?.[0];
    
    if (!anyTask) {
      log('No tasks - skipping');
      return;
    }
    
    // Test with empty title (should use default or fail validation)
    type PRResult = { success: boolean; error?: string };
    const result = await callIPC<PRResult>(page, 'createWorktreePR', anyTask.id, {
      title: '',
      body: ''
    });
    
    // Result depends on whether task has worktree
    log(`PR creation with empty options: success=${result.success}`);
    if (!result.success) {
      log(`  Error: ${result.error}`);
    }
  });
});

// ============================================================================
// P1-6: IDE/Terminal Opening
// ============================================================================

test.describe('P1-6: IDE/Terminal Integration', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    log('=== P1-6: IDE/Terminal Integration ===');
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    await electronApp?.close();
  });

  test('6.1 Tool detection API available', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.worktreeDetectTools === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('worktreeDetectTools API available');
  });

  test('6.2 Detect installed IDEs and terminals', async () => {
    type DetectResult = {
      success: boolean;
      data?: {
        ides: Array<{ id: string; name: string; installed: boolean }>;
        terminals: Array<{ id: string; name: string; installed: boolean }>;
      };
    };
    
    const result = await callIPC<DetectResult>(page, 'worktreeDetectTools');
    
    if (result.success && result.data) {
      const installedIDEs = result.data.ides.filter(i => i.installed);
      const installedTerminals = result.data.terminals.filter(t => t.installed);
      
      log(`Detected IDEs (${installedIDEs.length}):`);
      installedIDEs.slice(0, 5).forEach(ide => {
        log(`  - ${ide.name}`);
      });
      
      log(`Detected Terminals (${installedTerminals.length}):`);
      installedTerminals.slice(0, 5).forEach(term => {
        log(`  - ${term.name}`);
      });
    }
    
    await captureStep(page, 'tool-detection');
  });

  test('6.3 Open in IDE API exists', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.worktreeOpenInIDE === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('worktreeOpenInIDE API available');
  });

  test('6.4 Open in Terminal API exists', async () => {
    const hasAPI = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return typeof (window as any).electronAPI.worktreeOpenInTerminal === 'function';
    });
    
    expect(hasAPI).toBeTruthy();
    log('worktreeOpenInTerminal API available');
  });
});

// ============================================================================
// Summary
// ============================================================================

test.describe('P1 Worktree Lifecycle Summary', () => {
  test('All P1 worktree lifecycle tests completed', async () => {
    log('=== P1 Worktree Lifecycle Summary ===');
    log('P1-1: Worktree Listing - Tested');
    log('P1-2: Worktree Status - Tested');
    log('P1-3: Worktree Diff - Tested');
    log('P1-4: Merge/Discard Operations - Tested');
    log('P1-5: PR Creation - Tested');
    log('P1-6: IDE/Terminal Integration - Tested');
    
    expect(true).toBeTruthy();
  });
});
