/**
 * BMAD Workflow Runner
 * 
 * Executes BMAD workflows via OpenCode CLI.
 * Manages workflow lifecycle and integrates with terminal.
 */

import { spawn, type ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { EventEmitter } from 'events';
import { 
  WorkflowDefinition,
  BMAD_WORKFLOWS,
  BmadPhase,
  WorkflowProgressEvent,
  IpcResult,
  successResult,
  errorResult,
} from './types';
import { getStatusManager } from './status-manager';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowRunOptions {
  /** Additional arguments to pass to OpenCode CLI */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
  /** Working directory (defaults to project path) */
  cwd?: string;
  /** Callback for stdout data */
  onStdout?: (data: string) => void;
  /** Callback for stderr data */
  onStderr?: (data: string) => void;
  /** Callback for exit */
  onExit?: (code: number | null) => void;
  /** Run in YOLO mode (autonomous, no confirmations) */
  yoloMode?: boolean;
}

export interface WorkflowRunResult {
  workflowId: string;
  exitCode: number | null;
  success: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenCode CLI Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the OpenCode CLI executable
 */
async function findOpenCode(): Promise<string | null> {
  // Try common paths
  const candidates = [
    'opencode',           // In PATH
    '/usr/local/bin/opencode',
    '/usr/bin/opencode',
    join(process.env.HOME || '', '.local', 'bin', 'opencode'),
    join(process.env.HOME || '', 'go', 'bin', 'opencode'), // Go install location
  ];

  // On Windows, also check .cmd and .exe
  if (process.platform === 'win32') {
    candidates.push(
      'opencode.cmd',
      'opencode.exe',
      join(process.env.LOCALAPPDATA || '', 'Programs', 'opencode', 'opencode.exe'),
    );
  }

  // On macOS, check Homebrew locations
  if (process.platform === 'darwin') {
    candidates.push(
      '/opt/homebrew/bin/opencode',
      '/usr/local/Cellar/opencode/bin/opencode',
    );
  }

  // Check each candidate
  for (const candidate of candidates) {
    try {
      const result = await new Promise<boolean>((resolve) => {
        const proc = spawn(candidate, ['--version'], {
          stdio: 'pipe',
          timeout: 5000,
        });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
      });

      if (result) {
        return candidate;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Check if OpenCode CLI is available
 */
export async function isOpenCodeAvailable(): Promise<boolean> {
  const path = await findOpenCode();
  return path !== null;
}

/**
 * Get OpenCode version
 */
export async function getOpenCodeVersion(): Promise<string | null> {
  const opencodePath = await findOpenCode();
  if (!opencodePath) return null;

  return new Promise((resolve) => {
    const proc = spawn(opencodePath, ['--version'], {
      stdio: 'pipe',
      timeout: 5000,
    });

    let output = '';
    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        // Parse version from output (e.g., "opencode v0.1.0")
        const match = output.match(/v?(\d+\.\d+\.\d+)/);
        resolve(match ? match[1] : output.trim());
      } else {
        resolve(null);
      }
    });
    proc.on('error', () => resolve(null));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Runner Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WorkflowRunner manages BMAD workflow execution via OpenCode CLI
 */
export class WorkflowRunner extends EventEmitter {
  private projectPath: string;
  private activeProcess: ChildProcess | null = null;
  private activeWorkflowId: string | null = null;
  private openCodePath: string | null = null;

  constructor(projectPath: string) {
    super();
    this.projectPath = resolve(projectPath);
  }

  /**
   * Get the current project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Initialize the workflow runner
   */
  async initialize(): Promise<IpcResult<void>> {
    // Find OpenCode CLI
    this.openCodePath = await findOpenCode();
    
    if (!this.openCodePath) {
      console.warn('[WorkflowRunner] OpenCode CLI not found in PATH');
      return errorResult(
        'OPENCODE_NOT_FOUND',
        'OpenCode CLI not found. Please install OpenCode (https://github.com/opencode-ai/opencode) or ensure it is in your PATH.'
      );
    }

    const version = await getOpenCodeVersion();
    console.log(`[WorkflowRunner] Using OpenCode CLI: ${this.openCodePath} (version: ${version || 'unknown'})`);
    return successResult(undefined);
  }

  /**
   * Get a workflow definition by ID
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return BMAD_WORKFLOWS.find(w => w.id === workflowId);
  }

  /**
   * Get all workflows for a phase
   */
  getWorkflowsForPhase(phase: BmadPhase): WorkflowDefinition[] {
    return BMAD_WORKFLOWS.filter(w => w.phase === phase);
  }

  /**
   * Get all available workflows
   */
  getAllWorkflows(): WorkflowDefinition[] {
    return [...BMAD_WORKFLOWS];
  }

  /**
   * Check if a workflow is currently running
   */
  isRunning(): boolean {
    return this.activeProcess !== null;
  }

  /**
   * Get the currently running workflow ID
   */
  getActiveWorkflowId(): string | null {
    return this.activeWorkflowId;
  }

  /**
   * Start a workflow
   * 
   * Executes the workflow using OpenCode CLI with the specified BMAD agent.
   * The workflow command (slash command) is passed as the prompt.
   */
  async startWorkflow(
    workflowId: string,
    options: WorkflowRunOptions = {}
  ): Promise<IpcResult<void>> {
    // Check if already running
    if (this.isRunning()) {
      return errorResult(
        'WORKFLOW_ALREADY_RUNNING',
        `A workflow is already running: ${this.activeWorkflowId}`
      );
    }

    // Get workflow definition
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) {
      return errorResult(
        'WORKFLOW_NOT_FOUND',
        `Unknown workflow: ${workflowId}`
      );
    }

    // Ensure OpenCode is available
    if (!this.openCodePath) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    if (!this.openCodePath) {
      return errorResult(
        'OPENCODE_NOT_FOUND',
        'OpenCode CLI is not available'
      );
    }

    // Update status to in_progress
    const statusManager = getStatusManager(this.projectPath);
    await statusManager.updateWorkflowStatus(workflow.phase, workflowId, 'in_progress');

    // Build command arguments for OpenCode
    // OpenCode CLI syntax: opencode [flags] [prompt]
    // Using --agent to specify the BMAD agent
    const args: string[] = [];

    // Specify the agent to use
    if (workflow.agent) {
      args.push('--agent', workflow.agent);
    }

    // Add YOLO mode flag if requested (autonomous execution)
    if (options.yoloMode) {
      args.push('--yolo');
    }

    // Add any additional user-specified args
    if (options.args) {
      args.push(...options.args);
    }

    // The workflow command is the prompt (BMAD slash command)
    args.push(workflow.command);

    // Set up environment
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...options.env,
      // Ensure project path is available to the agent
      BMAD_PROJECT_PATH: this.projectPath,
      // Set working directory context
      PWD: options.cwd || this.projectPath,
    };

    // Emit start event
    this.emitProgress(workflowId, workflow.phase, 'in_progress', `Starting workflow with agent: ${workflow.agent}...`);

    try {
      // Spawn OpenCode process
      this.activeWorkflowId = workflowId;
      this.activeProcess = spawn(this.openCodePath, args, {
        cwd: options.cwd || this.projectPath,
        env: env as NodeJS.ProcessEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Handle stdout
      this.activeProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        options.onStdout?.(text);
        this.emit('stdout', text);
      });

      // Handle stderr
      this.activeProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        options.onStderr?.(text);
        this.emit('stderr', text);
      });

      // Handle exit
      this.activeProcess.on('close', async (code) => {
        const exitCode = code ?? 1;
        const success = exitCode === 0;

        // Update status
        await statusManager.updateWorkflowStatus(
          workflow.phase,
          workflowId,
          success ? 'completed' : 'pending',
          workflow.outputFile ? { artifactPath: workflow.outputFile } : undefined
        );

        // Emit completion event
        this.emitProgress(
          workflowId,
          workflow.phase,
          success ? 'completed' : 'pending',
          success ? 'Workflow completed successfully' : `Workflow failed with exit code ${exitCode}`
        );

        // Call exit callback
        options.onExit?.(exitCode);
        this.emit('exit', { workflowId, exitCode, success });

        // Clean up
        this.activeProcess = null;
        this.activeWorkflowId = null;
      });

      // Handle error
      this.activeProcess.on('error', async (error) => {
        console.error('[WorkflowRunner] Process error:', error);
        
        await statusManager.updateWorkflowStatus(
          workflow.phase,
          workflowId,
          'pending',
          { note: `Error: ${error.message}` }
        );

        this.emitProgress(
          workflowId,
          workflow.phase,
          'pending',
          `Process error: ${error.message}`
        );

        this.emit('error', error);
        
        this.activeProcess = null;
        this.activeWorkflowId = null;
      });

      return successResult(undefined);

    } catch (error) {
      this.activeProcess = null;
      this.activeWorkflowId = null;

      await statusManager.updateWorkflowStatus(
        workflow.phase,
        workflowId,
        'pending',
        { note: `Failed to start: ${error instanceof Error ? error.message : 'Unknown error'}` }
      );

      return errorResult(
        'WORKFLOW_START_ERROR',
        `Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel the currently running workflow
   */
  async cancelWorkflow(): Promise<IpcResult<void>> {
    if (!this.activeProcess || !this.activeWorkflowId) {
      return errorResult(
        'NO_WORKFLOW_RUNNING',
        'No workflow is currently running'
      );
    }

    const workflowId = this.activeWorkflowId;
    const workflow = this.getWorkflow(workflowId);

    try {
      // Kill the process
      this.activeProcess.kill('SIGTERM');

      // Wait a bit, then force kill if necessary
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.activeProcess) {
            this.activeProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.activeProcess?.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      // Update status
      if (workflow) {
        const statusManager = getStatusManager(this.projectPath);
        await statusManager.updateWorkflowStatus(
          workflow.phase,
          workflowId,
          'pending',
          { note: 'Cancelled by user' }
        );
      }

      this.emitProgress(
        workflowId,
        workflow?.phase || 'analysis',
        'pending',
        'Workflow cancelled'
      );

      return successResult(undefined);

    } catch (error) {
      return errorResult(
        'WORKFLOW_CANCEL_ERROR',
        `Failed to cancel workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.activeProcess = null;
      this.activeWorkflowId = null;
    }
  }

  /**
   * Write to the workflow's stdin (for interactive prompts)
   */
  writeToWorkflow(data: string): boolean {
    if (!this.activeProcess?.stdin) {
      return false;
    }

    this.activeProcess.stdin.write(data);
    return true;
  }

  /**
   * Emit a workflow progress event
   */
  private emitProgress(
    workflowId: string,
    phase: BmadPhase,
    status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked',
    message?: string
  ): void {
    const event: WorkflowProgressEvent = {
      type: 'workflow-progress',
      workflowId,
      phase,
      status,
      message,
    };
    this.emit('progress', event);
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.activeProcess) {
      await this.cancelWorkflow();
    }
    this.removeAllListeners();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance Management
// ─────────────────────────────────────────────────────────────────────────────

let activeRunner: WorkflowRunner | null = null;

/**
 * Get or create a WorkflowRunner for a project
 */
export function getWorkflowRunner(projectPath: string): WorkflowRunner {
  const resolvedPath = resolve(projectPath);
  
  // If we have an active runner for a different project, dispose it
  if (activeRunner && activeRunner.getProjectPath() !== resolvedPath) {
    activeRunner.dispose().catch(console.error);
    activeRunner = null;
  }

  // Create new runner if needed
  if (!activeRunner) {
    activeRunner = new WorkflowRunner(resolvedPath);
  }

  return activeRunner;
}

/**
 * Dispose the active workflow runner
 */
export async function disposeWorkflowRunner(): Promise<void> {
  if (activeRunner) {
    await activeRunner.dispose();
    activeRunner = null;
  }
}
