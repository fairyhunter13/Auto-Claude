/**
 * Test Fixtures for Real Integration E2E Tests
 * 
 * Provides consistent, reusable test data and utilities for E2E tests.
 * These are REAL integration tests - no mocking of core functionality.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Page } from '@playwright/test';

// ============================================================================
// Project Fixtures
// ============================================================================

export interface TestProject {
  id: string;
  name: string;
  path: string;
  description?: string;
  initialized?: boolean;
}

/**
 * Standard test project pointing to the Auto-Claude repo
 */
export const TEST_PROJECT_AUTO_CLAUDE: TestProject = {
  id: 'test-project-auto-claude',
  name: 'Auto-Claude',
  path: '/home/hafiz/git/github.com/fairyhunter13/Auto-Claude',
  description: 'Main test project using the Auto-Claude repository',
  initialized: true,
};

/**
 * Create a temporary test project directory with real git initialization
 */
export async function createTempTestProject(name = 'e2e-test-project'): Promise<TestProject> {
  const tempDir = path.join(os.tmpdir(), `auto-bmad-e2e-${Date.now()}`);
  const projectPath = path.join(tempDir, name);
  
  // Create directory structure
  fs.mkdirSync(projectPath, { recursive: true });
  fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true });
  
  // Create minimal files
  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      description: 'E2E test project',
      main: 'src/index.ts',
    }, null, 2)
  );
  
  fs.writeFileSync(
    path.join(projectPath, 'src', 'index.ts'),
    '// E2E test project entry point\nexport const hello = () => "Hello, E2E!";\n'
  );
  
  // Initialize as git repo
  const { execSync } = await import('child_process');
  try {
    execSync('git init', { cwd: projectPath, stdio: 'pipe' });
    execSync('git config user.email "test@e2e.local"', { cwd: projectPath, stdio: 'pipe' });
    execSync('git config user.name "E2E Test"', { cwd: projectPath, stdio: 'pipe' });
    execSync('git add .', { cwd: projectPath, stdio: 'pipe' });
    execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'pipe' });
  } catch (err) {
    console.warn('Git init warning (may be expected in CI):', err);
  }
  
  return {
    id: `temp-${Date.now()}`,
    name,
    path: projectPath,
    description: 'Temporary E2E test project',
    initialized: false,
  };
}

/**
 * Clean up a temporary test project
 */
export function cleanupTempTestProject(project: TestProject): void {
  if (project.path.includes('auto-bmad-e2e-') && fs.existsSync(project.path)) {
    fs.rmSync(project.path, { recursive: true, force: true });
  }
}

// ============================================================================
// Real Integration Helpers
// ============================================================================

/**
 * Check if OpenCode CLI is available on the system
 */
export async function checkOpenCodeAvailable(): Promise<{ available: boolean; path?: string; version?: string }> {
  const { execSync } = await import('child_process');
  
  const possiblePaths = [
    '/home/hafiz/.local/bin/opencode',
    path.join(os.homedir(), '.local/bin/opencode'),
    'opencode', // In PATH
  ];
  
  for (const opencodePath of possiblePaths) {
    try {
      const version = execSync(`${opencodePath} --version 2>/dev/null || echo "unknown"`, { 
        encoding: 'utf-8',
        timeout: 5000,
      }).trim();
      return { available: true, path: opencodePath, version };
    } catch {
      continue;
    }
  }
  
  return { available: false };
}

/**
 * Wait for a real task status change via IPC
 */
export async function waitForTaskStatus(
  page: Page,
  taskId: string,
  expectedStatus: string,
  timeoutMs = 60000
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const currentStatus = await page.evaluate(async (id) => {
      // @ts-expect-error - electronAPI exposed via preload
      const result = await window.electronAPI.getTasks?.() || { success: false };
      if (result.success && result.data) {
        const task = result.data.find((t: { id: string }) => t.id === id);
        return task?.status;
      }
      return null;
    }, taskId);
    
    if (currentStatus === expectedStatus) {
      return true;
    }
    
    await page.waitForTimeout(500);
  }
  
  return false;
}

/**
 * Wait for task execution progress events
 */
export async function waitForTaskProgress(
  page: Page,
  taskId: string,
  targetProgress: number,
  timeoutMs = 120000
): Promise<{ reached: boolean; finalProgress: number }> {
  return page.evaluate(
    async ({ taskId, targetProgress, timeoutMs }) => {
      return new Promise<{ reached: boolean; finalProgress: number }>((resolve) => {
        let currentProgress = 0;
        const startTime = Date.now();
        
        const checkProgress = () => {
          // Check via DOM or store state
          const progressEl = document.querySelector(`[data-task-id="${taskId}"] [data-progress]`);
          if (progressEl) {
            currentProgress = parseInt(progressEl.getAttribute('data-progress') || '0', 10);
          }
          
          if (currentProgress >= targetProgress) {
            resolve({ reached: true, finalProgress: currentProgress });
            return;
          }
          
          if (Date.now() - startTime > timeoutMs) {
            resolve({ reached: false, finalProgress: currentProgress });
            return;
          }
          
          setTimeout(checkProgress, 500);
        };
        
        checkProgress();
      });
    },
    { taskId, targetProgress, timeoutMs }
  );
}

// ============================================================================
// Task Fixtures
// ============================================================================

export type TaskStatus = 'backlog' | 'in_progress' | 'ai_review' | 'human_review' | 'done' | 'archived';

export interface TestTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
  labels?: string[];
}

/**
 * Standard task fixtures for different test scenarios
 */
export const TEST_TASKS = {
  simple: {
    id: 'task-simple-001',
    title: 'Add hello world function',
    description: 'Create a simple hello world function in src/hello.ts',
    status: 'backlog' as TaskStatus,
    priority: 'low' as const,
  },
  
  complex: {
    id: 'task-complex-001',
    title: 'Implement user authentication',
    description: `Implement user authentication with the following requirements:
- OAuth 2.0 support for Google and GitHub
- Session management with JWT tokens
- Password reset flow via email
- Rate limiting on login attempts`,
    status: 'backlog' as TaskStatus,
    priority: 'high' as const,
    labels: ['feature', 'security', 'auth'],
  },
  
  bugFix: {
    id: 'task-bug-001',
    title: 'Fix memory leak in worker pool',
    description: 'Workers are not being properly cleaned up after task completion, causing memory to grow over time.',
    status: 'backlog' as TaskStatus,
    priority: 'high' as const,
    labels: ['bug', 'performance'],
  },
  
  inProgress: {
    id: 'task-inprogress-001',
    title: 'Task currently running',
    description: 'This task simulates one that is currently being executed by OpenCode.',
    status: 'in_progress' as TaskStatus,
    priority: 'medium' as const,
  },
  
  inReview: {
    id: 'task-review-001',
    title: 'Task awaiting review',
    description: 'This task has been completed and is awaiting human review.',
    status: 'human_review' as TaskStatus,
    priority: 'medium' as const,
  },
  
  done: {
    id: 'task-done-001',
    title: 'Completed task',
    description: 'This task has been completed and merged.',
    status: 'done' as TaskStatus,
    priority: 'low' as const,
  },
};

/**
 * Generate a unique task for testing
 */
export function createTestTask(overrides: Partial<TestTask> = {}): TestTask {
  const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    title: `Test Task ${id}`,
    description: 'Automatically generated test task for E2E testing.',
    status: 'backlog',
    priority: 'medium',
    ...overrides,
  };
}

/**
 * Generate multiple test tasks
 */
export function createTestTasks(count: number, status: TaskStatus = 'backlog'): TestTask[] {
  return Array.from({ length: count }, (_, i) => 
    createTestTask({
      title: `Test Task ${i + 1}`,
      description: `Test task #${i + 1} for E2E testing`,
      status,
      priority: ['low', 'medium', 'high'][i % 3] as TestTask['priority'],
    })
  );
}

// ============================================================================
// BMAD Workflow Fixtures
// ============================================================================

export interface TestWorkflow {
  id: string;
  name: string;
  command: string;
  expectedOutputs: string[];
}

export const TEST_WORKFLOWS = {
  createPrd: {
    id: 'create-prd',
    name: 'Create PRD',
    command: '/bmad:bmm:workflows:create-prd',
    expectedOutputs: ['_bmad-output/planning-artifacts/prd.md'],
  },
  
  createArchitecture: {
    id: 'create-architecture',
    name: 'Create Architecture',
    command: '/bmad:bmm:workflows:create-architecture',
    expectedOutputs: ['_bmad-output/planning-artifacts/architecture.md'],
  },
  
  createEpics: {
    id: 'create-epics',
    name: 'Create Epics and Stories',
    command: '/bmad:bmm:workflows:create-epics-and-stories',
    expectedOutputs: [
      '_bmad-output/planning-artifacts/epics/index.md',
      '_bmad-output/planning-artifacts/epics/epic-1.md',
    ],
  },
};

// ============================================================================
// Settings Fixtures
// ============================================================================

export interface TestSettings {
  theme: 'light' | 'dark' | 'system';
  claudeProfile?: string;
  openCodePath?: string;
  sentryEnabled: boolean;
}

export const DEFAULT_TEST_SETTINGS: TestSettings = {
  theme: 'dark',
  claudeProfile: 'default',
  openCodePath: '/home/hafiz/.local/bin/opencode',
  sentryEnabled: false,
};

// ============================================================================
// IPC Response Helpers
// ============================================================================

/**
 * Standard IPC success response type
 */
export interface IPCSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard IPC error response type
 */
export interface IPCErrorResponse {
  success: false;
  error: string;
}

export type IPCResponse<T> = IPCSuccessResponse<T> | IPCErrorResponse;

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Detect the test environment capabilities
 */
export async function detectTestEnvironment(): Promise<{
  hasOpenCode: boolean;
  openCodePath?: string;
  hasGit: boolean;
  hasClaude: boolean;
  platform: string;
}> {
  const { execSync } = await import('child_process');
  
  const checkCommand = (cmd: string): boolean => {
    try {
      execSync(`which ${cmd}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };
  
  const openCode = await checkOpenCodeAvailable();
  
  return {
    hasOpenCode: openCode.available,
    openCodePath: openCode.path,
    hasGit: checkCommand('git'),
    hasClaude: checkCommand('claude'),
    platform: process.platform,
  };
}

/**
 * Skip test if OpenCode is not available
 * Use in test.beforeEach or test.skip conditions
 */
export async function requireOpenCode(): Promise<void> {
  const { available } = await checkOpenCodeAvailable();
  if (!available) {
    throw new Error('OpenCode CLI not available - skipping real integration test');
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Projects
  TEST_PROJECT_AUTO_CLAUDE,
  createTempTestProject,
  cleanupTempTestProject,
  
  // Tasks
  TEST_TASKS,
  createTestTask,
  createTestTasks,
  
  // Workflows
  TEST_WORKFLOWS,
  
  // Settings
  DEFAULT_TEST_SETTINGS,
  
  // Real Integration
  checkOpenCodeAvailable,
  waitForTaskStatus,
  waitForTaskProgress,
  detectTestEnvironment,
  requireOpenCode,
};
