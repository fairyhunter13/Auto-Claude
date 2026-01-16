/**
 * OpenCode CLI Helper for E2E Tests
 *
 * Provides utilities for executing OpenCode commands in tests,
 * detecting OpenCode availability, and parsing workflow outputs.
 */

import { spawn, execSync, type ChildProcess } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenCodeInfo {
  available: boolean;
  path: string | null;
  version: string | null;
}

export interface OpenCodeExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
  duration: number;
  timedOut: boolean;
  error?: string;
}

export interface OpenCodeExecutionOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables to pass */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 120000) */
  timeout?: number;
  /** Callback for stdout data */
  onStdout?: (data: string) => void;
  /** Callback for stderr data */
  onStderr?: (data: string) => void;
  /** Run in YOLO mode (autonomous, no confirmations) */
  yoloMode?: boolean;
  /** Specify the BMAD agent to use */
  agent?: string;
}

export interface WorkflowExecutionResult extends OpenCodeExecutionResult {
  workflowId: string;
  agent: string;
  artifactCreated: boolean;
  artifactPath?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenCode Detection
// ─────────────────────────────────────────────────────────────────────────────

let cachedOpenCodeInfo: OpenCodeInfo | null = null;

/**
 * Find the OpenCode CLI executable path
 */
function findOpenCodePath(): string | null {
  const candidates = [
    'opencode',
    '/usr/local/bin/opencode',
    '/usr/bin/opencode',
    path.join(process.env.HOME || '', '.local', 'bin', 'opencode'),
    path.join(process.env.HOME || '', 'go', 'bin', 'opencode'),
  ];

  if (process.platform === 'win32') {
    candidates.push(
      'opencode.cmd',
      'opencode.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'opencode', 'opencode.exe')
    );
  }

  if (process.platform === 'darwin') {
    candidates.push(
      '/opt/homebrew/bin/opencode',
      '/usr/local/Cellar/opencode/bin/opencode'
    );
  }

  for (const candidate of candidates) {
    try {
      execSync(`${candidate} --version`, { stdio: 'pipe', timeout: 5000 });
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

/**
 * Get OpenCode version string
 */
function getOpenCodeVersion(opencodePath: string): string | null {
  try {
    const output = execSync(`${opencodePath} --version`, {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    const match = output.match(/v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : output;
  } catch {
    return null;
  }
}

/**
 * Check if OpenCode CLI is available and get its info
 */
export function getOpenCodeInfo(): OpenCodeInfo {
  if (cachedOpenCodeInfo) {
    return cachedOpenCodeInfo;
  }

  const opencodePath = findOpenCodePath();
  const version = opencodePath ? getOpenCodeVersion(opencodePath) : null;

  cachedOpenCodeInfo = {
    available: opencodePath !== null,
    path: opencodePath,
    version,
  };

  return cachedOpenCodeInfo;
}

/**
 * Check if OpenCode is available (convenience function)
 */
export function isOpenCodeAvailable(): boolean {
  return getOpenCodeInfo().available;
}

/**
 * Clear cached OpenCode info (for testing)
 */
export function clearOpenCodeCache(): void {
  cachedOpenCodeInfo = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenCode Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute an OpenCode command and wait for completion
 */
export async function executeOpenCode(
  args: string[],
  options: OpenCodeExecutionOptions = {}
): Promise<OpenCodeExecutionResult> {
  const info = getOpenCodeInfo();

  if (!info.available || !info.path) {
    return {
      exitCode: -1,
      stdout: '',
      stderr: 'OpenCode CLI not available',
      success: false,
      duration: 0,
      timedOut: false,
      error: 'OpenCode CLI not found. Please install OpenCode.',
    };
  }

  const {
    cwd = process.cwd(),
    env = {},
    timeout = 120000,
    onStdout,
    onStderr,
    yoloMode = false,
    agent,
  } = options;

  const startTime = Date.now();

  // Build command arguments
  const cmdArgs: string[] = [];

  if (agent) {
    cmdArgs.push('--agent', agent);
  }

  if (yoloMode) {
    cmdArgs.push('--yolo');
  }

  cmdArgs.push(...args);

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(info.path!, cmdArgs, {
      cwd,
      env: {
        ...process.env,
        ...env,
        BMAD_PROJECT_PATH: cwd,
      } as NodeJS.ProcessEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Handle stdout
    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      onStdout?.(text);
    });

    // Handle stderr
    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      onStderr?.(text);
    });

    // Timeout handler
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      setTimeout(() => proc.kill('SIGKILL'), 5000);
    }, timeout);

    // Handle completion
    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      resolve({
        exitCode: code ?? -1,
        stdout,
        stderr,
        success: code === 0,
        duration,
        timedOut,
        error: timedOut ? `Command timed out after ${timeout}ms` : undefined,
      });
    });

    proc.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({
        exitCode: -1,
        stdout,
        stderr: stderr + '\n' + error.message,
        success: false,
        duration: Date.now() - startTime,
        timedOut: false,
        error: error.message,
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Workflow Execution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BMAD Workflow definitions for testing
 */
export const BMAD_TEST_WORKFLOWS = {
  // Phase 1: Analysis
  'brainstorm-project': {
    command: '/bmad:bmm:workflows:brainstorming',
    agent: 'analyst',
    phase: 1,
    outputFile: null,
    optional: true,
  },
  research: {
    command: '/bmad:bmm:workflows:research',
    agent: 'analyst',
    phase: 1,
    outputFile: 'research-findings.md',
    optional: true,
  },
  'product-brief': {
    command: '/bmad:bmm:workflows:create-product-brief',
    agent: 'analyst',
    phase: 1,
    outputFile: 'product-brief.md',
    optional: true,
  },

  // Phase 2: Planning
  prd: {
    command: '/bmad:bmm:workflows:create-prd',
    agent: 'pm',
    phase: 2,
    outputFile: 'prd.md',
    optional: false,
  },
  'ux-design': {
    command: '/bmad:bmm:workflows:create-ux-design',
    agent: 'ux-designer',
    phase: 2,
    outputFile: 'ux-design.md',
    optional: true,
  },

  // Phase 3: Solutioning
  architecture: {
    command: '/bmad:bmm:workflows:create-architecture',
    agent: 'architect',
    phase: 3,
    outputFile: 'architecture.md',
    optional: false,
  },
  epics: {
    command: '/bmad:bmm:workflows:create-epics-and-stories',
    agent: 'pm',
    phase: 3,
    outputFile: 'epics.md',
    optional: false,
  },
  'test-design': {
    command: '/bmad:bmm:workflows:test-design',
    agent: 'tea',
    phase: 3,
    outputFile: 'test-design.md',
    optional: true,
  },
  'implementation-readiness': {
    command: '/bmad:bmm:workflows:implementation-readiness',
    agent: 'architect',
    phase: 3,
    outputFile: 'implementation-readiness-report.md',
    optional: false,
  },

  // Phase 4: Implementation
  'sprint-planning': {
    command: '/bmad:bmm:workflows:sprint-planning',
    agent: 'sm',
    phase: 4,
    outputFile: 'sprint-status.yaml',
    optional: false,
  },
  'create-story': {
    command: '/bmad:bmm:workflows:create-story',
    agent: 'sm',
    phase: 4,
    outputFile: null,
    optional: false,
  },
  'dev-story': {
    command: '/bmad:bmm:workflows:dev-story',
    agent: 'dev',
    phase: 4,
    outputFile: null,
    optional: false,
  },
  'code-review': {
    command: '/bmad:bmm:workflows:code-review',
    agent: 'dev',
    phase: 4,
    outputFile: null,
    optional: false,
  },
} as const;

export type BmadWorkflowId = keyof typeof BMAD_TEST_WORKFLOWS;

/**
 * Execute a BMAD workflow via OpenCode
 */
export async function executeBmadWorkflow(
  workflowId: BmadWorkflowId,
  projectPath: string,
  options: Omit<OpenCodeExecutionOptions, 'agent'> & {
    overrideAgent?: string;
  } = {}
): Promise<WorkflowExecutionResult> {
  const workflow = BMAD_TEST_WORKFLOWS[workflowId];

  if (!workflow) {
    return {
      workflowId,
      agent: 'unknown',
      exitCode: -1,
      stdout: '',
      stderr: `Unknown workflow: ${workflowId}`,
      success: false,
      duration: 0,
      timedOut: false,
      artifactCreated: false,
      error: `Unknown workflow: ${workflowId}`,
    };
  }

  const agent = options.overrideAgent || workflow.agent;

  console.log(`[OpenCode] Executing workflow: ${workflowId} with agent: ${agent}`);
  console.log(`[OpenCode] Command: ${workflow.command}`);

  const result = await executeOpenCode([workflow.command], {
    ...options,
    cwd: projectPath,
    agent,
  });

  // Check if artifact was created
  let artifactCreated = false;
  let artifactPath: string | undefined;

  if (workflow.outputFile) {
    const outputDir =
      workflow.phase === 4
        ? path.join(projectPath, '_bmad-output', 'implementation-artifacts')
        : path.join(projectPath, '_bmad-output', 'planning-artifacts');

    artifactPath = path.join(outputDir, workflow.outputFile);
    artifactCreated = existsSync(artifactPath);
  }

  return {
    ...result,
    workflowId,
    agent,
    artifactCreated,
    artifactPath,
  };
}

/**
 * Execute multiple workflows in sequence
 */
export async function executeWorkflowSequence(
  workflows: BmadWorkflowId[],
  projectPath: string,
  options: Omit<OpenCodeExecutionOptions, 'agent'> = {}
): Promise<Map<BmadWorkflowId, WorkflowExecutionResult>> {
  const results = new Map<BmadWorkflowId, WorkflowExecutionResult>();

  for (const workflowId of workflows) {
    const result = await executeBmadWorkflow(workflowId, projectPath, options);
    results.set(workflowId, result);

    // Stop if workflow fails (unless it's optional)
    if (!result.success && !BMAD_TEST_WORKFLOWS[workflowId].optional) {
      console.error(`[OpenCode] Required workflow ${workflowId} failed, stopping sequence`);
      break;
    }
  }

  return results;
}

/**
 * Get workflows for a specific phase
 */
export function getWorkflowsForPhase(phase: 1 | 2 | 3 | 4): BmadWorkflowId[] {
  return (Object.entries(BMAD_TEST_WORKFLOWS) as [BmadWorkflowId, (typeof BMAD_TEST_WORKFLOWS)[BmadWorkflowId]][])
    .filter(([_, workflow]) => workflow.phase === phase)
    .map(([id]) => id);
}

/**
 * Get required workflows for a phase
 */
export function getRequiredWorkflowsForPhase(phase: 1 | 2 | 3 | 4): BmadWorkflowId[] {
  return (Object.entries(BMAD_TEST_WORKFLOWS) as [BmadWorkflowId, (typeof BMAD_TEST_WORKFLOWS)[BmadWorkflowId]][])
    .filter(([_, workflow]) => workflow.phase === phase && !workflow.optional)
    .map(([id]) => id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skip test if OpenCode is not available
 */
export function skipIfNoOpenCode(test: { skip: (reason?: string) => void }): void {
  if (!isOpenCodeAvailable()) {
    test.skip('OpenCode CLI not available');
  }
}

/**
 * Log execution result summary
 */
export function logWorkflowResult(result: WorkflowExecutionResult): void {
  const status = result.success ? '✓' : '✗';
  const time = `${(result.duration / 1000).toFixed(2)}s`;

  console.log(`  ${status} ${result.workflowId} (${result.agent}) - ${time}`);

  if (result.artifactCreated && result.artifactPath) {
    console.log(`    → Created: ${result.artifactPath}`);
  }

  if (!result.success) {
    console.log(`    Error: ${result.error || result.stderr.slice(0, 200)}`);
  }
}

/**
 * Parse workflow status from YAML file
 */
export function parseWorkflowStatus(
  statusPath: string
): Record<string, unknown> | null {
  try {
    if (!existsSync(statusPath)) return null;
    const content = readFileSync(statusPath, 'utf-8');
    // Simple YAML parsing for tests - import yaml if available
    const lines = content.split('\n');
    const result: Record<string, string> = {};
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2];
      }
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Wait for a file to exist (useful for async artifact creation)
 */
export async function waitForFile(
  filePath: string,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 500
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (existsSync(filePath)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}
