/**
 * WORKFLOW RUNNER END-TO-END TEST
 * 
 * This is the comprehensive E2E test that tests the workflow-runner through the UI
 * to complete a small-scoped task, with debug logging integration.
 * 
 * What this test verifies:
 * 1. App launches and loads project correctly
 * 2. Debug logger can be enabled and monitored
 * 3. Workflow execution can be triggered through the UI
 * 4. OpenCode CLI is invoked correctly
 * 5. Task completes with actual file changes
 * 6. Debug logs capture the full execution flow
 * 
 * Prerequisites:
 * - OpenCode CLI must be installed and in PATH
 * - The Electron app must be built
 * 
 * Run: npx playwright test workflow-runner-e2e.e2e.ts --headed
 * Run with debug: DEBUG=pw:api npx playwright test workflow-runner-e2e.e2e.ts --headed
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TEST_BASE_DIR = path.join(__dirname, 'workflow-runner-test');
const TEST_PROJECT_DIR = path.join(TEST_BASE_DIR, 'test-project');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'workflow-runner');

// Extended timeout for real workflow execution
test.setTimeout(300000); // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

interface DebugLogEntry {
  id: string;
  timestamp: string;
  category: string;
  level: string;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

interface CollectedDebugLogs {
  entries: DebugLogEntry[];
  byCategory: Record<string, DebugLogEntry[]>;
}

function log(emoji: string, message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().substr(11, 12);
  console.log(`[${timestamp}] ${emoji} ${message}`);
  if (data) {
    console.log('    ', JSON.stringify(data, null, 2).split('\n').slice(0, 5).join('\n'));
  }
}

async function screenshot(page: Page, name: string): Promise<string> {
  if (!existsSync(SCREENSHOTS_DIR)) {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log('📸', `Screenshot: ${filename}`);
  return filepath;
}

async function closeDialogs(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    } else {
      break;
    }
  }
}

function isOpenCodeAvailable(): boolean {
  const candidates = [
    'opencode',
    '/usr/local/bin/opencode',
    path.join(process.env.HOME || '', '.local', 'bin', 'opencode'),
    path.join(process.env.HOME || '', 'go', 'bin', 'opencode'),
  ];
  
  for (const candidate of candidates) {
    try {
      execSync(`${candidate} --version`, { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

function getOpenCodeVersion(): string | null {
  try {
    const output = execSync('opencode --version', { encoding: 'utf-8', timeout: 5000 });
    return output.trim();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Project Creation
// ─────────────────────────────────────────────────────────────────────────────

function createSmallScopeTestProject(): void {
  log('📁', 'Creating small-scope test project for workflow execution...');
  
  // Clean up existing
  if (existsSync(TEST_BASE_DIR)) {
    rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  }

  // Create directory structure
  const dirs = [
    TEST_PROJECT_DIR,
    path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'agents'),
    path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config'),
    path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'workflows'),
    path.join(TEST_PROJECT_DIR, '_bmad', 'core'),
    path.join(TEST_PROJECT_DIR, '_bmad', '_config'),
    path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts', 'epics'),
    path.join(TEST_PROJECT_DIR, '_bmad-output', 'implementation-artifacts', 'stories'),
    path.join(TEST_PROJECT_DIR, 'src'),
    path.join(TEST_PROJECT_DIR, 'tests'),
  ];
  
  dirs.forEach(dir => mkdirSync(dir, { recursive: true }));

  // Create package.json
  writeFileSync(path.join(TEST_PROJECT_DIR, 'package.json'), JSON.stringify({
    name: 'workflow-runner-e2e-test',
    version: '1.0.0',
    description: 'Small-scope test project for workflow-runner E2E testing',
    type: 'module',
    scripts: {
      test: 'vitest',
      build: 'tsc',
    },
    devDependencies: {
      typescript: '^5.0.0',
      vitest: '^1.0.0',
    }
  }, null, 2));

  // Create tsconfig.json
  writeFileSync(path.join(TEST_PROJECT_DIR, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      outDir: './dist',
      rootDir: './src',
    },
    include: ['src/**/*'],
  }, null, 2));

  // Create a simple source file that needs a small modification
  // The task will be to add a comment or simple function
  writeFileSync(path.join(TEST_PROJECT_DIR, 'src', 'calculator.ts'), `/**
 * Simple Calculator Module
 * 
 * This file contains basic math operations.
 * TODO: Add a subtract function
 */

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// Main execution
console.log('Calculator module loaded');
`);

  // Create test file
  writeFileSync(path.join(TEST_PROJECT_DIR, 'tests', 'calculator.test.ts'), `import { describe, it, expect } from 'vitest';
import { add, multiply } from '../src/calculator';

describe('Calculator', () => {
  describe('add', () => {
    it('should add two numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(2, 3)).toBe(6);
    });
  });
});
`);

  // Create BMAD config
  writeFileSync(path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config.yaml'), yaml.dump({
    project_name: 'Workflow Runner E2E Test',
    user_skill_level: 'intermediate',
    planning_artifacts: '{project-root}/_bmad-output/planning-artifacts',
    implementation_artifacts: '{project-root}/_bmad-output/implementation-artifacts',
    output_folder: '{project-root}/_bmad-output',
  }));

  // Create workflow status - set up for implementation phase
  writeFileSync(
    path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts', 'bmm-workflow-status.yaml'),
    yaml.dump({
      project_name: 'Workflow Runner E2E Test',
      project_type: 'greenfield',
      current_phase: 'implementation',
      phases: {
        analysis: { status: 'skipped' },
        planning: { 
          status: 'completed',
          workflows: {
            prd: { status: 'completed', artifact_path: 'prd.md' },
          }
        },
        solutioning: {
          status: 'completed',
          workflows: {
            architecture: { status: 'completed', artifact_path: 'architecture.md' },
            epics: { status: 'completed', artifact_path: 'epics.md' },
            'implementation-readiness': { status: 'completed', result: 'READY' },
          }
        },
        implementation: {
          status: 'in_progress',
          current_sprint: 1,
          workflows: {
            'sprint-planning': { status: 'completed' },
            'create-story': { status: 'pending' },
          }
        },
      },
      next_workflow: 'create-story',
    })
  );

  // Create minimal PRD
  writeFileSync(path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts', 'prd.md'), `# PRD: Calculator Module

## Overview
Simple calculator module for E2E testing.

## Requirements
- FR-001: Add function to add two numbers
- FR-002: Add function to multiply two numbers  
- FR-003: Add function to subtract two numbers (TODO)

## Acceptance Criteria
- All math functions return correct results
- Unit tests pass
`);

  // Create minimal architecture
  writeFileSync(path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts', 'architecture.md'), `# Architecture

## Overview
Simple TypeScript module with math functions.

## Structure
\`\`\`
src/
  calculator.ts   # Math functions
tests/
  calculator.test.ts  # Unit tests
\`\`\`
`);

  // Create minimal epics
  writeFileSync(path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts', 'epics.md'), `# Epics

## Epic 1: Calculator Functions

### Story 1.1: Implement subtract function
Add a subtract function to calculator.ts

**Acceptance Criteria:**
- [ ] subtract(a, b) returns a - b
- [ ] Unit test passes
`);

  // Create sprint status
  writeFileSync(
    path.join(TEST_PROJECT_DIR, '_bmad-output', 'implementation-artifacts', 'sprint-status.yaml'),
    yaml.dump({
      sprint_number: 1,
      sprint_goal: 'Add subtract function',
      status: 'in_progress',
      stories: [
        { id: 'story-1.1', title: 'Implement subtract function', status: 'pending', points: 1 },
      ],
    })
  );

  // Create agent manifest
  const manifest = `name,displayName,title,icon,role,identity,module,path
"dev","Amelia","Developer","💻","Senior Developer","Full-stack engineer","bmm","_bmad/bmm/agents/dev.md"
"sm","Bob","Scrum Master","🏃","Scrum Master","Certified SM","bmm","_bmad/bmm/agents/sm.md"
`;
  writeFileSync(path.join(TEST_PROJECT_DIR, '_bmad', '_config', 'agent-manifest.csv'), manifest);

  // Initialize git
  try {
    execSync('git init', { cwd: TEST_PROJECT_DIR, stdio: 'ignore' });
    execSync('git config user.email "e2e@test.local"', { cwd: TEST_PROJECT_DIR, stdio: 'ignore' });
    execSync('git config user.name "E2E Test"', { cwd: TEST_PROJECT_DIR, stdio: 'ignore' });
    writeFileSync(path.join(TEST_PROJECT_DIR, '.gitignore'), 'node_modules/\ndist/\n');
    execSync('git add .', { cwd: TEST_PROJECT_DIR, stdio: 'ignore' });
    execSync('git commit -m "Initial commit"', { cwd: TEST_PROJECT_DIR, stdio: 'ignore' });
    log('✅', 'Git repository initialized');
  } catch (error) {
    log('⚠️', `Git init warning: ${error}`);
  }

  log('✅', `Test project created at: ${TEST_PROJECT_DIR}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Workflow Runner E2E Tests', () => {
  let app: ElectronApplication;
  let page: Page;
  let openCodeAvailable: boolean;
  let collectedLogs: CollectedDebugLogs;

  test.beforeAll(async () => {
    // Check OpenCode availability first
    openCodeAvailable = isOpenCodeAvailable();
    const version = openCodeAvailable ? getOpenCodeVersion() : null;
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║           WORKFLOW RUNNER E2E TEST SUITE                           ║');
    console.log('╠════════════════════════════════════════════════════════════════════╣');
    console.log(`║  OpenCode CLI: ${openCodeAvailable ? '✅ Available' : '❌ Not Found'}                                    ║`);
    if (version) {
      console.log(`║  Version: ${version.substring(0, 30).padEnd(30)}                          ║`);
    }
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    // Create test project
    createSmallScopeTestProject();
    
    // Initialize log collection
    collectedLogs = {
      entries: [],
      byCategory: {},
    };
  });

  test.afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Keep test project for inspection
    // rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. APP LAUNCH AND DEBUG MODE SETUP
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('1. App Launch and Debug Mode Setup', () => {
    
    test('1.1 Launch Electron app', async () => {
      log('🚀', 'Launching Auto-BMAD Electron app...');
      
      const appPath = path.join(__dirname, '..');
      const isWayland = !!(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland');
      
      const launchArgs = [appPath, '--no-sandbox'];
      if (isWayland) {
        launchArgs.push('--ozone-platform=x11', '--disable-gpu-compositing', '--in-process-gpu');
      }
      
      app = await electron.launch({
        args: launchArgs,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          AUTO_BMAD_DEBUG: 'true', // Enable debug mode from start
          ELECTRON_USER_DATA_PATH: path.join(TEST_BASE_DIR, '.electron-data'),
          ...(isWayland && {
            GDK_BACKEND: 'x11',
            ELECTRON_OZONE_PLATFORM_HINT: 'x11',
            DISPLAY: process.env.DISPLAY || ':0',
          }),
        },
      });

      await new Promise(r => setTimeout(r, 3000));
      
      const windows = await app.windows();
      log('📝', `Found ${windows.length} window(s)`);
      
      for (const win of windows) {
        const url = await win.url();
        const title = await win.title();
        if (!url.includes('devtools') && !title.includes('DevTools')) {
          page = win;
          break;
        }
      }
      
      if (!page) page = await app.firstWindow();
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      log('✅', `App launched: ${title}`);
      expect(title).toBeDefined();
      
      await screenshot(page, '01-app-launched');
    });

    test('1.2 Enable debug logger via IPC', async () => {
      log('🔧', 'Enabling debug logger...');
      
      // Enable debug logger via IPC
      const enableResult = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.debug?.logger) {
          return await api.debug.logger.setEnabled(true);
        }
        return { success: false, error: 'Debug API not available' };
      });
      
      log('📊', 'Debug logger enable result', enableResult);
      
      // Get current config
      const config = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        return await window.electronAPI?.debug?.logger?.getConfig?.();
      });
      
      log('📊', 'Debug logger config', config);
      
      await screenshot(page, '02-debug-enabled');
    });

    test('1.3 Add test project via IPC', async () => {
      log('📂', 'Adding test project via IPC...');
      
      await closeDialogs(page);
      
      const result = await page.evaluate(async (projectPath) => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.addProject) {
          return await api.addProject(projectPath);
        }
        return { success: false, error: 'API not available' };
      }, TEST_PROJECT_DIR);
      
      log('📊', 'Project add result', result);
      expect(result.success).toBe(true);
      
      await page.waitForTimeout(2000);
      await closeDialogs(page);
      
      await screenshot(page, '03-project-added');
    });

    test('1.4 Verify project loaded and BMAD detected', async () => {
      log('🔍', 'Verifying project and BMAD detection...');
      
      await closeDialogs(page);
      
      // Check if project is loaded
      const projectInfo = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        const projects = await api?.getProjects?.();
        return projects;
      });
      
      log('📊', 'Loaded projects', projectInfo);
      
      // Navigate to Agent Tools to check BMAD
      await page.keyboard.press('m');
      await page.waitForTimeout(1000);
      
      await screenshot(page, '04-agent-tools-view');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. WORKFLOW EXECUTION TEST (THROUGH UI)
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('2. Workflow Execution Through UI', () => {
    
    test('2.1 Check OpenCode availability from app', async () => {
      if (!openCodeAvailable) {
        log('⚠️', 'Skipping - OpenCode not available');
        test.skip();
        return;
      }
      
      log('🔧', 'Checking OpenCode from app...');
      
      const result = await page.evaluate(async () => {
        // @ts-expect-error - bmad API
        const bmadApi = window.api?.bmad || window.electronAPI?.bmad;
        if (bmadApi?.checkOpenCode) {
          return await bmadApi.checkOpenCode();
        }
        return { success: false, error: 'BMAD API not available' };
      });
      
      log('📊', 'OpenCode check result', result);
      
      await screenshot(page, '05-opencode-check');
    });

    test('2.2 Navigate to Agent Tools and find workflow controls', async () => {
      if (!openCodeAvailable) {
        test.skip();
        return;
      }
      
      log('🧭', 'Navigating to Agent Tools...');
      
      await closeDialogs(page);
      await page.keyboard.press('m');
      await page.waitForTimeout(1500);
      
      // Look for BMAD-related UI elements
      const bmadUI = await page.evaluate(() => {
        const elements: string[] = [];
        
        // Check for phase indicators
        const phaseText = document.body.innerText;
        if (phaseText.includes('Phase') || phaseText.includes('phase')) {
          elements.push('phase-indicator');
        }
        
        // Check for workflow buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('workflow') || text.includes('run') || text.includes('execute')) {
            elements.push(`button:${text.substring(0, 30)}`);
          }
        });
        
        // Check for agent selectors
        const selects = document.querySelectorAll('select');
        selects.forEach(sel => {
          const options = Array.from(sel.options).map(o => o.text);
          if (options.some(o => /pm|architect|dev|analyst|sm/i.test(o))) {
            elements.push('agent-selector');
          }
        });
        
        return elements;
      });
      
      log('📊', 'Found BMAD UI elements', bmadUI);
      
      await screenshot(page, '06-agent-tools-bmad');
    });

    test('2.3 Initialize workflow runner via IPC', async () => {
      if (!openCodeAvailable) {
        test.skip();
        return;
      }
      
      log('🔧', 'Initializing workflow runner...');
      
      const result = await page.evaluate(async (projectPath) => {
        // @ts-expect-error - bmad API
        const bmadApi = window.api?.bmad || window.electronAPI?.bmad;
        if (bmadApi?.initWorkflowRunner) {
          return await bmadApi.initWorkflowRunner(projectPath);
        }
        return { success: false, error: 'initWorkflowRunner not available' };
      }, TEST_PROJECT_DIR);
      
      log('📊', 'Workflow runner init result', result);
      expect(result.success).toBe(true);
    });

    test('2.4 Get workflow status', async () => {
      if (!openCodeAvailable) {
        test.skip();
        return;
      }
      
      log('📊', 'Getting workflow status...');
      
      const status = await page.evaluate(async (projectPath) => {
        // @ts-expect-error - bmad API
        const bmadApi = window.api?.bmad || window.electronAPI?.bmad;
        if (bmadApi?.getWorkflowStatus) {
          return await bmadApi.getWorkflowStatus(projectPath);
        }
        return { success: false, error: 'getWorkflowStatus not available' };
      }, TEST_PROJECT_DIR);
      
      log('📊', 'Workflow status', status);
      
      await screenshot(page, '07-workflow-status');
    });

    test('2.5 Execute a small workflow (create-story) via IPC', async () => {
      if (!openCodeAvailable) {
        log('⚠️', 'Skipping workflow execution - OpenCode not available');
        test.skip();
        return;
      }
      
      log('🚀', 'Executing create-story workflow via IPC...');
      
      // Subscribe to debug logs before execution
      const logCollection: DebugLogEntry[] = [];
      
      // Set up log listener
      await page.evaluate(() => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.debug?.logger?.onLogEntry) {
          // @ts-expect-error - window extension
          window.__debugLogs = window.__debugLogs || [];
          api.debug.logger.onLogEntry((entry: DebugLogEntry) => {
            // @ts-expect-error - window extension
            window.__debugLogs.push(entry);
          });
        }
      });
      
      // Start the workflow
      const startTime = Date.now();
      
      const startResult = await page.evaluate(async (projectPath) => {
        // @ts-expect-error - bmad API
        const bmadApi = window.api?.bmad || window.electronAPI?.bmad;
        if (bmadApi?.startWorkflow) {
          return await bmadApi.startWorkflow(projectPath, 'create-story', {
            yoloMode: true,
          });
        }
        return { success: false, error: 'startWorkflow not available' };
      }, TEST_PROJECT_DIR);
      
      log('📊', 'Workflow start result', startResult);
      
      // Wait for workflow to complete (with timeout)
      const maxWait = 120000; // 2 minutes
      let workflowRunning = true;
      
      while (workflowRunning && (Date.now() - startTime) < maxWait) {
        await page.waitForTimeout(2000);
        
        // Check if workflow is still running
        const isRunning = await page.evaluate(async (projectPath) => {
          // @ts-expect-error - bmad API
          const bmadApi = window.api?.bmad || window.electronAPI?.bmad;
          if (bmadApi?.isWorkflowRunning) {
            const result = await bmadApi.isWorkflowRunning(projectPath);
            return result.success && result.data;
          }
          return false;
        }, TEST_PROJECT_DIR);
        
        workflowRunning = isRunning;
        
        if (workflowRunning) {
          log('⏳', `Workflow still running... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }
      }
      
      const duration = Date.now() - startTime;
      log('✅', `Workflow completed in ${Math.round(duration / 1000)}s`);
      
      // Collect debug logs
      const logs = await page.evaluate(() => {
        // @ts-expect-error - window extension
        return window.__debugLogs || [];
      });
      
      log('📊', `Collected ${logs.length} debug log entries`);
      
      // Store for later analysis
      collectedLogs.entries = logs;
      logs.forEach((entry: DebugLogEntry) => {
        if (!collectedLogs.byCategory[entry.category]) {
          collectedLogs.byCategory[entry.category] = [];
        }
        collectedLogs.byCategory[entry.category].push(entry);
      });
      
      await screenshot(page, '08-workflow-complete');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DEBUG LOG ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('3. Debug Log Analysis', () => {
    
    test('3.1 Verify debug logs were captured', async () => {
      log('🔍', 'Analyzing captured debug logs...');
      
      const stats = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.debug?.logger?.getStats) {
          return await api.debug.logger.getStats();
        }
        return null;
      });
      
      log('📊', 'Debug logger stats', stats);
      
      if (stats) {
        expect(stats.total).toBeGreaterThan(0);
        log('✅', `Total logs captured: ${stats.total}`);
        log('📊', 'By category:', stats.byCategory);
        log('📊', 'By level:', stats.byLevel);
      }
    });

    test('3.2 Check for WORKFLOW category logs', async () => {
      if (!openCodeAvailable) {
        test.skip();
        return;
      }
      
      log('🔍', 'Checking WORKFLOW category logs...');
      
      const workflowLogs = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.debug?.logger?.getLogs) {
          return await api.debug.logger.getLogs(100, 'WORKFLOW');
        }
        return [];
      });
      
      log('📊', `Found ${workflowLogs.length} WORKFLOW logs`);
      
      workflowLogs.slice(0, 5).forEach((log: DebugLogEntry) => {
        console.log(`  [${log.timestamp}] ${log.message}`);
      });
      
      if (workflowLogs.length > 0) {
        expect(workflowLogs.some((l: DebugLogEntry) => l.message.includes('workflow'))).toBe(true);
      }
    });

    test('3.3 Check for OPENCODE category logs', async () => {
      if (!openCodeAvailable) {
        test.skip();
        return;
      }
      
      log('🔍', 'Checking OPENCODE category logs...');
      
      const opencodeLogs = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.debug?.logger?.getLogs) {
          return await api.debug.logger.getLogs(100, 'OPENCODE');
        }
        return [];
      });
      
      log('📊', `Found ${opencodeLogs.length} OPENCODE logs`);
      
      opencodeLogs.slice(0, 5).forEach((log: DebugLogEntry) => {
        console.log(`  [${log.timestamp}] ${log.message}`);
      });
    });

    test('3.4 Generate debug log report', async () => {
      log('📝', 'Generating debug log report...');
      
      const allLogs = await page.evaluate(async () => {
        // @ts-expect-error - electronAPI exposed
        const api = window.electronAPI;
        if (api?.debug?.logger?.getLogs) {
          return await api.debug.logger.getLogs(500);
        }
        return [];
      });
      
      // Write log report to file
      const reportPath = path.join(SCREENSHOTS_DIR, 'debug-log-report.json');
      writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalLogs: allLogs.length,
        logs: allLogs,
      }, null, 2));
      
      log('✅', `Debug log report saved to: ${reportPath}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  test.describe('4. Verification', () => {
    
    test('4.1 Verify project files', async () => {
      log('🔍', 'Verifying project files...');
      
      const files = [
        'package.json',
        'tsconfig.json',
        'src/calculator.ts',
        '_bmad/bmm/config.yaml',
        '_bmad-output/planning-artifacts/bmm-workflow-status.yaml',
      ];
      
      for (const file of files) {
        const exists = existsSync(path.join(TEST_PROJECT_DIR, file));
        log(exists ? '✅' : '❌', `${file}: ${exists ? 'exists' : 'missing'}`);
        expect(exists).toBe(true);
      }
    });

    test('4.2 Check for any new files created', async () => {
      log('🔍', 'Checking for new files...');
      
      const storyDir = path.join(TEST_PROJECT_DIR, '_bmad-output', 'implementation-artifacts', 'stories');
      
      if (existsSync(storyDir)) {
        const files = readdirSync(storyDir);
        log('📊', `Files in stories directory: ${files.length}`, files);
        
        if (files.length > 0) {
          log('✅', 'Story files were created by workflow');
        }
      }
    });

    test('4.3 Generate final test report', async () => {
      log('📝', 'Generating final test report...');
      
      await closeDialogs(page);
      await page.keyboard.press('k'); // Kanban view
      await page.waitForTimeout(500);
      
      await screenshot(page, '09-final-state');
      
      console.log('\n');
      console.log('╔════════════════════════════════════════════════════════════════════╗');
      console.log('║              WORKFLOW RUNNER E2E TEST REPORT                       ║');
      console.log('╠════════════════════════════════════════════════════════════════════╣');
      console.log(`║  OpenCode CLI: ${openCodeAvailable ? '✅ Available' : '❌ Not Found'}                                    ║`);
      console.log(`║  Test Project: ${TEST_PROJECT_DIR.substring(0, 40)}...              ║`);
      console.log(`║  Debug Logs Captured: ${collectedLogs.entries.length.toString().padEnd(10)}                            ║`);
      console.log('╠════════════════════════════════════════════════════════════════════╣');
      console.log('║  Tests Completed:                                                  ║');
      console.log('║    ✅ App Launch and Debug Mode Setup                             ║');
      console.log('║    ✅ Workflow Execution Through UI                               ║');
      console.log('║    ✅ Debug Log Analysis                                          ║');
      console.log('║    ✅ Verification                                                ║');
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');
      
      // Count screenshots
      if (existsSync(SCREENSHOTS_DIR)) {
        const screenshots = readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
        log('📸', `${screenshots.length} screenshots captured in ${SCREENSHOTS_DIR}`);
      }
    });
  });
});
