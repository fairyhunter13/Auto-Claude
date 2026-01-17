/**
 * BMAD Task Workflow Bridge
 * 
 * Bridges Kanban tasks to BMAD workflows, replacing the old Python runner approach.
 * This allows tasks to be executed via OpenCode CLI with BMAD methodology.
 * 
 * Architecture:
 * - Kanban Task → BMAD Story → dev-story workflow → OpenCode CLI execution
 * - Task completion → human_review → merge/iterate
 * 
 * Key Features:
 * - Maps task lifecycle to BMAD phases
 * - Supports YOLO mode for autonomous execution
 * - Integrates with load balancer for multi-profile support
 * - Real-time progress events
 */

import { EventEmitter } from 'events';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as yaml from 'js-yaml';
import { WorkflowRunner, getWorkflowRunner, WorkflowRunOptions } from './workflow-runner';
import { getStatusManager } from './status-manager';
import { 
  WorkflowDefinition,
  BMAD_WORKFLOWS,
  BmadPhase,
  successResult,
  errorResult,
  IpcResult,
} from './types';
import { debugLogger } from '../debug-logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BmadTask {
  id: string;
  title: string;
  description?: string;
  specId: string;
  projectPath: string;
  status: BmadTaskStatus;
  metadata?: BmadTaskMetadata;
  createdAt: string;
  updatedAt: string;
}

export type BmadTaskStatus = 
  | 'backlog'
  | 'planning'
  | 'in_progress'
  | 'ai_review'
  | 'human_review'
  | 'done';

export interface BmadTaskMetadata {
  /** Use worktree for isolated development */
  useWorktree?: boolean;
  /** Base branch for worktree */
  baseBranch?: string;
  /** BMAD phase this task maps to */
  bmadPhase?: BmadPhase;
  /** Story ID if created via BMAD workflow */
  storyId?: string;
  /** Epic ID if part of an epic */
  epicId?: string;
  /** Model configuration */
  model?: string;
  /** Thinking level for complex tasks */
  thinkingLevel?: string;
}

export interface TaskExecutionOptions {
  /** Run autonomously without user confirmations */
  yoloMode?: boolean;
  /** Use load balancing across profiles */
  useLoadBalancing?: boolean;
  /** Enable auto-retry on rate limit */
  retryOnRateLimit?: boolean;
  /** Maximum retries */
  maxRetries?: number;
  /** Callback for stdout */
  onStdout?: (data: string) => void;
  /** Callback for stderr */
  onStderr?: (data: string) => void;
  /** Callback for progress events */
  onProgress?: (event: TaskProgressEvent) => void;
}

export interface TaskProgressEvent {
  taskId: string;
  phase: 'planning' | 'coding' | 'testing' | 'review' | 'complete' | 'failed';
  progress: number;
  message: string;
  timestamp: string;
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  exitCode: number | null;
  duration: number;
  artifactsCreated: string[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BMAD_OUTPUT_DIR = '_bmad-output';
const PLANNING_ARTIFACTS_DIR = 'planning-artifacts';
const IMPLEMENTATION_ARTIFACTS_DIR = 'implementation-artifacts';
const STORIES_DIR = 'stories';

// Map task phases to BMAD workflows
const TASK_PHASE_WORKFLOWS: Record<string, string> = {
  'create-story': 'create-story',
  'dev-story': 'dev-story',
  'code-review': 'code-review',
};

// ─────────────────────────────────────────────────────────────────────────────
// Task Workflow Bridge Class
// ─────────────────────────────────────────────────────────────────────────────

export class TaskWorkflowBridge extends EventEmitter {
  private projectPath: string;
  private workflowRunner: WorkflowRunner;
  private activeTasks: Map<string, { task: BmadTask; startTime: number }> = new Map();

  constructor(projectPath: string) {
    super();
    this.projectPath = resolve(projectPath);
    this.workflowRunner = getWorkflowRunner(projectPath);
    
    // Forward workflow events
    this.workflowRunner.on('stdout', (data) => this.emit('stdout', data));
    this.workflowRunner.on('stderr', (data) => this.emit('stderr', data));
    this.workflowRunner.on('progress', (event) => this.emit('workflow-progress', event));
    this.workflowRunner.on('exit', (result) => this.handleWorkflowExit(result));
    this.workflowRunner.on('error', (error) => this.emit('error', error));
  }

  /**
   * Initialize the bridge
   */
  async initialize(): Promise<IpcResult<void>> {
    debugLogger.log('TASK', 'Initializing TaskWorkflowBridge', { projectPath: this.projectPath });
    
    // Initialize workflow runner
    const result = await this.workflowRunner.initialize();
    if (!result.success) {
      return result;
    }

    // Ensure BMAD output directories exist
    this.ensureOutputDirectories();

    // Enable load balancing by default for better rate limit handling
    await this.workflowRunner.enableLoadBalancing();

    debugLogger.log('TASK', 'TaskWorkflowBridge initialized successfully');
    return successResult(undefined);
  }

  /**
   * Ensure BMAD output directories exist
   */
  private ensureOutputDirectories(): void {
    const dirs = [
      join(this.projectPath, BMAD_OUTPUT_DIR),
      join(this.projectPath, BMAD_OUTPUT_DIR, PLANNING_ARTIFACTS_DIR),
      join(this.projectPath, BMAD_OUTPUT_DIR, IMPLEMENTATION_ARTIFACTS_DIR),
      join(this.projectPath, BMAD_OUTPUT_DIR, IMPLEMENTATION_ARTIFACTS_DIR, STORIES_DIR),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        debugLogger.log('TASK', 'Created directory', { path: dir });
      }
    }
  }

  /**
   * Create a BMAD story from a Kanban task
   */
  async createStoryFromTask(task: BmadTask): Promise<IpcResult<string>> {
    debugLogger.log('TASK', 'Creating BMAD story from task', { taskId: task.id, title: task.title });

    // Generate story file
    const storyId = `story-${task.specId}`;
    const storyPath = join(
      this.projectPath,
      BMAD_OUTPUT_DIR,
      IMPLEMENTATION_ARTIFACTS_DIR,
      STORIES_DIR,
      `${storyId}.md`
    );

    const storyContent = this.generateStoryContent(task, storyId);

    try {
      writeFileSync(storyPath, storyContent, 'utf-8');
      debugLogger.log('TASK', 'Story file created', { storyPath, storyId });
      return successResult(storyId);
    } catch (error) {
      return errorResult(
        'STORY_CREATION_FAILED',
        `Failed to create story file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate story content from task
   */
  private generateStoryContent(task: BmadTask, storyId: string): string {
    return `# Story: ${task.title}

## ID: ${storyId}

## Status: draft

## Description
${task.description || task.title}

## Acceptance Criteria
- [ ] Implementation matches the task requirements
- [ ] Code is properly tested
- [ ] Documentation is updated if needed

## Technical Notes
- Created from Kanban task: ${task.id}
- Spec ID: ${task.specId}

## Implementation Details
<!-- To be filled by the dev agent -->

---
Created: ${new Date().toISOString()}
`;
  }

  /**
   * Execute a task using BMAD dev-story workflow
   */
  async executeTask(
    task: BmadTask,
    options: TaskExecutionOptions = {}
  ): Promise<IpcResult<void>> {
    debugLogger.log('TASK', 'Executing task via BMAD workflow', { 
      taskId: task.id, 
      title: task.title,
      yoloMode: options.yoloMode,
    });

    // Check if task is already running
    if (this.activeTasks.has(task.id)) {
      return errorResult('TASK_ALREADY_RUNNING', `Task ${task.id} is already running`);
    }

    // Check if workflow runner is busy
    if (this.workflowRunner.isRunning()) {
      return errorResult(
        'WORKFLOW_BUSY',
        'A workflow is already running. Please wait for it to complete.'
      );
    }

    // Create story if needed
    if (!task.metadata?.storyId) {
      const storyResult = await this.createStoryFromTask(task);
      if (!storyResult.success) {
        return errorResult(storyResult.error?.code || 'STORY_CREATION_FAILED', storyResult.error?.message || 'Failed to create story');
      }
      task.metadata = { ...task.metadata, storyId: storyResult.data };
    }

    // Update sprint status to include this story
    await this.updateSprintStatus(task);

    // Track active task
    this.activeTasks.set(task.id, { task, startTime: Date.now() });

    // Emit initial progress
    this.emitProgress(task.id, 'planning', 0, 'Starting task execution via BMAD dev workflow...');

    // Build workflow options
    const workflowOptions: WorkflowRunOptions = {
      yoloMode: options.yoloMode ?? true, // Default to YOLO mode for autonomous execution
      useLoadBalancing: options.useLoadBalancing ?? true,
      retryOnRateLimit: options.retryOnRateLimit ?? true,
      maxRetries: options.maxRetries ?? 3,
      onStdout: (data) => {
        options.onStdout?.(data);
        this.parseProgressFromOutput(task.id, data);
      },
      onStderr: (data) => {
        options.onStderr?.(data);
      },
      onExit: (code) => {
        this.handleTaskExit(task.id, code);
      },
      env: {
        BMAD_STORY_ID: task.metadata?.storyId || '',
        BMAD_TASK_ID: task.id,
        BMAD_SPEC_ID: task.specId,
      },
    };

    // Execute dev-story workflow
    const result = await this.workflowRunner.startWorkflow('dev-story', workflowOptions);

    if (!result.success) {
      this.activeTasks.delete(task.id);
      this.emitProgress(task.id, 'failed', 0, result.error?.message || 'Failed to start workflow');
    }

    return result;
  }

  /**
   * Update sprint status to track the task/story
   */
  private async updateSprintStatus(task: BmadTask): Promise<void> {
    const sprintStatusPath = join(
      this.projectPath,
      BMAD_OUTPUT_DIR,
      IMPLEMENTATION_ARTIFACTS_DIR,
      'sprint-status.yaml'
    );

    let sprintStatus: Record<string, unknown> = {
      sprint: 1,
      status: 'in_progress',
      stories: [],
      startDate: new Date().toISOString(),
    };

    // Load existing sprint status if it exists
    if (existsSync(sprintStatusPath)) {
      try {
        const content = readFileSync(sprintStatusPath, 'utf-8');
        sprintStatus = yaml.load(content) as Record<string, unknown>;
      } catch (error) {
        debugLogger.log('TASK', 'Failed to load sprint status, creating new', { error });
      }
    }

    // Add or update story in sprint
    const stories = (sprintStatus.stories as Array<Record<string, unknown>>) || [];
    const existingIndex = stories.findIndex(s => s.id === task.metadata?.storyId);

    const storyEntry = {
      id: task.metadata?.storyId,
      title: task.title,
      status: 'in_progress',
      taskId: task.id,
      specId: task.specId,
      startedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      stories[existingIndex] = storyEntry;
    } else {
      stories.push(storyEntry);
    }

    sprintStatus.stories = stories;
    sprintStatus.updatedAt = new Date().toISOString();

    // Write updated sprint status
    try {
      writeFileSync(sprintStatusPath, yaml.dump(sprintStatus), 'utf-8');
      debugLogger.log('TASK', 'Sprint status updated', { storyId: task.metadata?.storyId });
    } catch (error) {
      debugLogger.log('TASK', 'Failed to update sprint status', { error }, 'warn');
    }
  }

  /**
   * Parse progress from workflow output
   */
  private parseProgressFromOutput(taskId: string, output: string): void {
    // Look for BMAD progress markers
    const progressMatch = output.match(/__BMAD_PROGRESS__:(\w+):(\d+):(.+)/);
    if (progressMatch) {
      const phase = progressMatch[1] as TaskProgressEvent['phase'];
      const progress = parseInt(progressMatch[2], 10);
      const message = progressMatch[3];
      this.emitProgress(taskId, phase, progress, message);
      return;
    }

    // Heuristic progress detection from common output patterns
    if (output.includes('Analyzing') || output.includes('Planning')) {
      this.emitProgress(taskId, 'planning', 20, 'Analyzing task requirements...');
    } else if (output.includes('Implementing') || output.includes('Writing code')) {
      this.emitProgress(taskId, 'coding', 40, 'Implementing solution...');
    } else if (output.includes('Testing') || output.includes('Running tests')) {
      this.emitProgress(taskId, 'testing', 70, 'Running tests...');
    } else if (output.includes('Review') || output.includes('Checking')) {
      this.emitProgress(taskId, 'review', 90, 'Reviewing implementation...');
    }
  }

  /**
   * Handle task exit
   */
  private handleTaskExit(taskId: string, exitCode: number | null): void {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;

    const duration = Date.now() - activeTask.startTime;
    const success = exitCode === 0;

    this.activeTasks.delete(taskId);

    // Emit completion event
    const result: TaskExecutionResult = {
      taskId,
      success,
      exitCode,
      duration,
      artifactsCreated: [], // TODO: Track created artifacts
      error: success ? undefined : `Process exited with code ${exitCode}`,
    };

    this.emitProgress(
      taskId,
      success ? 'complete' : 'failed',
      100,
      success ? 'Task completed successfully' : `Task failed with exit code ${exitCode}`
    );

    this.emit('task-complete', result);
    debugLogger.log('TASK', 'Task execution completed', { taskId, success, duration, exitCode });
  }

  /**
   * Handle workflow exit (from workflow runner)
   */
  private handleWorkflowExit(result: { workflowId: string; exitCode: number; success: boolean }): void {
    // Find task associated with this workflow
    for (const [taskId, activeTask] of this.activeTasks) {
      // If this workflow was for a dev-story, it's likely our task
      if (result.workflowId === 'dev-story') {
        this.handleTaskExit(taskId, result.exitCode);
        break;
      }
    }
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    taskId: string,
    phase: TaskProgressEvent['phase'],
    progress: number,
    message: string
  ): void {
    const event: TaskProgressEvent = {
      taskId,
      phase,
      progress,
      message,
      timestamp: new Date().toISOString(),
    };
    this.emit('task-progress', event);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<IpcResult<void>> {
    debugLogger.log('TASK', 'Cancelling task', { taskId });

    if (!this.activeTasks.has(taskId)) {
      return errorResult('TASK_NOT_RUNNING', `Task ${taskId} is not running`);
    }

    const result = await this.workflowRunner.cancelWorkflow();

    if (result.success) {
      this.activeTasks.delete(taskId);
      this.emitProgress(taskId, 'failed', 0, 'Task cancelled by user');
    }

    return result;
  }

  /**
   * Check if a task is running
   */
  isTaskRunning(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }

  /**
   * Get all running tasks
   */
  getRunningTasks(): string[] {
    return Array.from(this.activeTasks.keys());
  }

  /**
   * Run a BMAD planning workflow (PRD, Architecture, etc.)
   */
  async runPlanningWorkflow(
    workflowId: string,
    options: TaskExecutionOptions = {}
  ): Promise<IpcResult<void>> {
    debugLogger.log('TASK', 'Running planning workflow', { workflowId });

    const workflowOptions: WorkflowRunOptions = {
      yoloMode: options.yoloMode ?? true,
      useLoadBalancing: options.useLoadBalancing ?? true,
      retryOnRateLimit: options.retryOnRateLimit ?? true,
      maxRetries: options.maxRetries ?? 3,
      onStdout: options.onStdout,
      onStderr: options.onStderr,
    };

    return this.workflowRunner.startWorkflow(workflowId, workflowOptions);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(): Promise<Record<string, unknown>> {
    const statusManager = getStatusManager(this.projectPath);
    const result = await statusManager.read();
    if (result.success && result.data) {
      return result.data as unknown as Record<string, unknown>;
    }
    return {};
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    // Cancel all running tasks
    for (const taskId of this.activeTasks.keys()) {
      await this.cancelTask(taskId);
    }

    this.activeTasks.clear();
    this.removeAllListeners();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Management
// ─────────────────────────────────────────────────────────────────────────────

const bridgeInstances: Map<string, TaskWorkflowBridge> = new Map();

/**
 * Get or create a TaskWorkflowBridge for a project
 */
export function getTaskWorkflowBridge(projectPath: string): TaskWorkflowBridge {
  const resolvedPath = resolve(projectPath);
  
  if (!bridgeInstances.has(resolvedPath)) {
    bridgeInstances.set(resolvedPath, new TaskWorkflowBridge(resolvedPath));
  }
  
  return bridgeInstances.get(resolvedPath)!;
}

/**
 * Dispose a TaskWorkflowBridge for a project
 */
export async function disposeTaskWorkflowBridge(projectPath: string): Promise<void> {
  const resolvedPath = resolve(projectPath);
  const bridge = bridgeInstances.get(resolvedPath);
  
  if (bridge) {
    await bridge.dispose();
    bridgeInstances.delete(resolvedPath);
  }
}

/**
 * Dispose all TaskWorkflowBridge instances
 */
export async function disposeAllBridges(): Promise<void> {
  for (const bridge of bridgeInstances.values()) {
    await bridge.dispose();
  }
  bridgeInstances.clear();
}
