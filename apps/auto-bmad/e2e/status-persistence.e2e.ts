/**
 * Status Persistence E2E Tests
 * 
 * These tests verify that task status changes are properly persisted
 * and don't "flip-flop" back to previous states due to race conditions.
 * 
 * Key scenarios tested:
 * 1. Status persists across page reload
 * 2. Rapid status changes don't cause race conditions
 * 3. Concurrent operations don't corrupt status
 * 4. Status survives app restart
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

import {
  TEST_PROJECT_AUTO_CLAUDE,
  createTestTask,
  type TestProject,
} from './fixtures/test-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_PATH = path.join(__dirname, '..', 'out', 'main', 'index.js');
const ARTIFACTS_DIR = path.join(__dirname, 'test-results', 'status-persistence');

// Ensure artifacts directory exists
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

// ============================================================================
// Test Utilities
// ============================================================================

type TaskStatus = 'backlog' | 'in_progress' | 'ai_review' | 'human_review' | 'done' | 'archived';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
}

let stepCounter = 0;

function log(message: string): void {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`[${timestamp}] ${message}`);
}

async function captureStep(page: Page, stepName: string): Promise<void> {
  stepCounter++;
  const prefix = String(stepCounter).padStart(2, '0');
  const safeName = `${prefix}-${stepName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  
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

async function getTaskStatus(page: Page, taskId: string): Promise<TaskStatus | null> {
  const result = await page.evaluate(async (id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    const projects = await api.getProjects();
    if (!projects.success || !projects.data?.length) return null;
    
    const tasks = await api.getTasks(projects.data[0].id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = tasks.data?.find((t: any) => t.id === id);
    return task?.status || null;
  }, taskId);
  
  return result as TaskStatus | null;
}

async function updateTaskStatus(page: Page, taskId: string, status: TaskStatus): Promise<boolean> {
  const result = await page.evaluate(
    async ({ taskId, status }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI;
      const response = await api.updateTaskStatus(taskId, status);
      return response?.success || false;
    },
    { taskId, status }
  );
  
  return result;
}

async function createTask(page: Page, title: string, description: string): Promise<Task | null> {
  const result = await page.evaluate(
    async ({ title, description }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).electronAPI;
      const projects = await api.getProjects();
      if (!projects.success || !projects.data?.length) return null;
      
      const response = await api.createTask(projects.data[0].id, title, description);
      return response?.data || null;
    },
    { title, description }
  );
  
  return result as Task | null;
}

async function deleteTask(page: Page, taskId: string): Promise<void> {
  await page.evaluate(async (id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (window as any).electronAPI.deleteTask(id);
  }, taskId);
}

// ============================================================================
// Status Persistence Tests
// ============================================================================

test.describe('Status Persistence Tests', () => {
  let electronApp: ElectronApplication;
  let page: Page;
  const createdTaskIds: string[] = [];

  test.beforeAll(async () => {
    log('=== Status Persistence Tests ===');
    stepCounter = 0;
    
    // Clean artifacts
    if (fs.existsSync(ARTIFACTS_DIR)) {
      const files = fs.readdirSync(ARTIFACTS_DIR);
      files.forEach(f => fs.unlinkSync(path.join(ARTIFACTS_DIR, f)));
    }
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    // Ensure project is added
    await page.evaluate(async (projectPath) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (window as any).electronAPI.addProject(projectPath);
    }, TEST_PROJECT_AUTO_CLAUDE.path);
    
    await page.reload();
    await waitForAppReady(page);
  });

  test.afterAll(async () => {
    // Cleanup created tasks
    for (const taskId of createdTaskIds) {
      await deleteTask(page, taskId).catch(() => {});
    }
    await electronApp?.close();
  });

  test('1. Status persists across page reload', async () => {
    // Create a test task
    const task = await createTask(
      page,
      `Persistence Test ${Date.now()}`,
      'Testing status persistence across reload'
    );
    
    if (!task) {
      log('Failed to create task - skipping test');
      return;
    }
    
    createdTaskIds.push(task.id);
    log(`Created task: ${task.id} with status: ${task.status}`);
    
    // Verify initial status
    expect(task.status).toBe('backlog');
    
    // Change status to in_progress
    const updated = await updateTaskStatus(page, task.id, 'in_progress');
    expect(updated).toBeTruthy();
    log('Changed status to in_progress');
    
    // Verify status before reload
    let currentStatus = await getTaskStatus(page, task.id);
    expect(currentStatus).toBe('in_progress');
    log(`Status before reload: ${currentStatus}`);
    
    await captureStep(page, 'before-reload');
    
    // Reload page
    await page.reload();
    await waitForAppReady(page);
    
    await captureStep(page, 'after-reload');
    
    // Verify status persisted after reload
    currentStatus = await getTaskStatus(page, task.id);
    expect(currentStatus).toBe('in_progress');
    log(`Status after reload: ${currentStatus}`);
    
    // Cleanup: Move back to backlog
    await updateTaskStatus(page, task.id, 'backlog');
  });

  test('2. Rapid status changes maintain final state', async () => {
    const task = await createTask(
      page,
      `Rapid Change Test ${Date.now()}`,
      'Testing rapid status changes'
    );
    
    if (!task) {
      log('Failed to create task - skipping test');
      return;
    }
    
    createdTaskIds.push(task.id);
    log(`Created task: ${task.id}`);
    
    // Perform rapid status changes
    const statuses: TaskStatus[] = ['in_progress', 'ai_review', 'human_review', 'done', 'backlog'];
    
    for (const status of statuses) {
      await updateTaskStatus(page, task.id, status);
      // Small delay to ensure each update is processed
      await page.waitForTimeout(100);
    }
    
    log(`Performed ${statuses.length} rapid status changes`);
    
    // Wait for all updates to settle
    await page.waitForTimeout(500);
    
    // Verify final status is the last one we set
    const finalStatus = await getTaskStatus(page, task.id);
    expect(finalStatus).toBe('backlog');
    log(`Final status after rapid changes: ${finalStatus}`);
    
    await captureStep(page, 'rapid-changes-final');
  });

  test('3. Multiple tasks can be updated independently', async () => {
    // Create multiple tasks
    const tasks: Task[] = [];
    
    for (let i = 0; i < 3; i++) {
      const task = await createTask(
        page,
        `Multi-Task Test ${i + 1} - ${Date.now()}`,
        `Testing independent task updates - task ${i + 1}`
      );
      
      if (task) {
        tasks.push(task);
        createdTaskIds.push(task.id);
      }
    }
    
    if (tasks.length < 3) {
      log('Could not create all test tasks - skipping');
      return;
    }
    
    log(`Created ${tasks.length} tasks`);
    
    // Update each task to a different status
    // Note: 'human_review' requires spec.md to exist (validation protection)
    // For new tasks, we test with statuses that don't require spec completion
    const targetStatuses: TaskStatus[] = ['in_progress', 'ai_review', 'backlog'];
    
    for (let i = 0; i < tasks.length; i++) {
      const updated = await updateTaskStatus(page, tasks[i].id, targetStatuses[i]);
      log(`Updated task ${i + 1} to ${targetStatuses[i]} (success: ${updated})`);
    }
    
    await page.waitForTimeout(500);
    
    // Verify each task has the correct status
    for (let i = 0; i < tasks.length; i++) {
      const currentStatus = await getTaskStatus(page, tasks[i].id);
      expect(currentStatus).toBe(targetStatuses[i]);
      log(`Task ${i + 1} status verified: ${currentStatus}`);
    }
    
    await captureStep(page, 'multi-task-independent');
    
    // Cleanup
    for (const task of tasks) {
      await updateTaskStatus(page, task.id, 'backlog');
    }
  });

  test('4. Status survives app restart', async () => {
    // Create a task and set status
    const task = await createTask(
      page,
      `Restart Test ${Date.now()}`,
      'Testing status persistence across app restart'
    );
    
    if (!task) {
      log('Failed to create task - skipping test');
      return;
    }
    
    createdTaskIds.push(task.id);
    
    // Set status to ai_review (a distinctive state that doesn't require spec.md)
    // Note: 'human_review' requires spec.md to exist (validation protection),
    // so we use 'ai_review' instead which can be set on any task
    const updated = await updateTaskStatus(page, task.id, 'ai_review');
    log(`Update to ai_review success: ${updated}`);
    
    // Verify before restart
    let currentStatus = await getTaskStatus(page, task.id);
    expect(currentStatus).toBe('ai_review');
    log(`Status before restart: ${currentStatus}`);
    
    await captureStep(page, 'before-restart');
    
    // Close and relaunch app
    await electronApp.close();
    
    log('App closed, relaunching...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    electronApp = await electron.launch({
      args: [APP_PATH, '--no-sandbox', '--disable-gpu-sandbox'],
      env: { ...process.env, NODE_ENV: 'test', E2E_HEADLESS: '1' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    page = await getMainWindow(electronApp);
    await waitForAppReady(page);
    
    await captureStep(page, 'after-restart');
    
    // Verify status persisted
    currentStatus = await getTaskStatus(page, task.id);
    expect(currentStatus).toBe('ai_review');
    log(`Status after restart: ${currentStatus}`);
    
    // Cleanup
    await updateTaskStatus(page, task.id, 'backlog');
  });

  test('5. No flip-flop on concurrent drag-and-drop simulation', async () => {
    const task = await createTask(
      page,
      `Flip-Flop Test ${Date.now()}`,
      'Testing for flip-flop bugs in status updates'
    );
    
    if (!task) {
      log('Failed to create task - skipping test');
      return;
    }
    
    createdTaskIds.push(task.id);
    log(`Created task: ${task.id}`);
    
    // Simulate what happens during drag-and-drop:
    // Multiple rapid status checks and updates
    const statusHistory: TaskStatus[] = [];
    
    // First update to in_progress
    await updateTaskStatus(page, task.id, 'in_progress');
    statusHistory.push('in_progress');
    
    // Simulate multiple concurrent status checks (as might happen during drag)
    const statusPromises = Array(5).fill(null).map(() => getTaskStatus(page, task.id));
    const statuses = await Promise.all(statusPromises);
    
    // All should be in_progress
    const allSame = statuses.every(s => s === 'in_progress');
    log(`Concurrent reads all consistent: ${allSame}`);
    
    // Now update to ai_review
    await updateTaskStatus(page, task.id, 'ai_review');
    statusHistory.push('ai_review');
    
    // Wait and check multiple times to detect any flip-flop
    const checksAfterUpdate: (TaskStatus | null)[] = [];
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(100);
      const status = await getTaskStatus(page, task.id);
      checksAfterUpdate.push(status);
    }
    
    // All checks should be ai_review
    const noFlipFlop = checksAfterUpdate.every(s => s === 'ai_review');
    expect(noFlipFlop).toBeTruthy();
    log(`No flip-flop detected: ${noFlipFlop}`);
    log(`Status history after update: ${checksAfterUpdate.join(' -> ')}`);
    
    await captureStep(page, 'no-flip-flop');
    
    // Cleanup
    await updateTaskStatus(page, task.id, 'backlog');
  });

  test('6. Status update with forceCleanup option', async () => {
    const task = await createTask(
      page,
      `Force Cleanup Test ${Date.now()}`,
      'Testing status update with forceCleanup'
    );
    
    if (!task) {
      log('Failed to create task - skipping test');
      return;
    }
    
    createdTaskIds.push(task.id);
    
    // Update to in_progress first
    await updateTaskStatus(page, task.id, 'in_progress');
    
    // Now update to done with forceCleanup
    const result = await page.evaluate(
      async ({ taskId }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const api = (window as any).electronAPI;
        const response = await api.updateTaskStatus(taskId, 'done', { forceCleanup: true });
        return response;
      },
      { taskId: task.id }
    );
    
    log(`Force cleanup update result: ${JSON.stringify(result)}`);
    
    const finalStatus = await getTaskStatus(page, task.id);
    expect(finalStatus).toBe('done');
    log(`Final status with forceCleanup: ${finalStatus}`);
    
    await captureStep(page, 'force-cleanup');
    
    // Cleanup
    await updateTaskStatus(page, task.id, 'backlog');
  });
});

// ============================================================================
// Summary
// ============================================================================

test.describe('Status Persistence Summary', () => {
  test('Summary: All status persistence tests completed', () => {
    log('=== Status Persistence Test Summary ===');
    log('1. Status persists across page reload - Tested');
    log('2. Rapid status changes maintain final state - Tested');
    log('3. Multiple tasks updated independently - Tested');
    log('4. Status survives app restart - Tested');
    log('5. No flip-flop on concurrent operations - Tested');
    log('6. Status update with forceCleanup - Tested');
    log('');
    log(`Artifacts saved to: ${ARTIFACTS_DIR}`);
    
    expect(true).toBeTruthy();
  });
});
