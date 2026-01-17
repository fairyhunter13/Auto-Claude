/**
 * BMAD Agent Manager
 * 
 * Replaces the Python runner-based AgentManager with BMAD workflow execution.
 * All task execution now goes through OpenCode CLI with BMAD methodology.
 * 
 * This is the new central orchestrator for task lifecycle management.
 * 
 * Features:
 * - Task execution via BMAD dev-story workflow
 * - Planning workflow support (PRD, Architecture, etc.)
 * - Load balancing across multiple OpenCode profiles
 * - Rate limit detection and automatic retry
 * - Real-time progress events
 * - Task lifecycle management
 */

import { EventEmitter } from 'events';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import * as yaml from 'js-yaml';
import { 
  TaskWorkflowBridge, 
  getTaskWorkflowBridge,
  disposeTaskWorkflowBridge,
  BmadTask,
  BmadTaskStatus,
  BmadTaskMetadata,
  TaskExecutionOptions,
  TaskProgressEvent,
  TaskExecutionResult,
} from './task-workflow-bridge';
import type { ExecutionProgressData } from '../agent/types';
import { 
  WorkflowRunner, 
  getWorkflowRunner,
  isOpenCodeAvailable,
  getOpenCodeVersion,
} from './workflow-runner';
import { getStatusManager, StatusManager } from './status-manager';
import {
  WorkflowDefinition,
  BMAD_WORKFLOWS,
  BmadPhase,
  IpcResult,
  successResult,
  errorResult,
} from './types';
import { debugLogger } from '../debug-logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BmadAgentManagerConfig {
  /** Enable YOLO mode by default (autonomous execution) */
  defaultYoloMode: boolean;
  /** Enable load balancing by default */
  defaultLoadBalancing: boolean;
  /** Enable auto-retry on rate limit */
  defaultRetryOnRateLimit: boolean;
  /** Maximum retries for rate limited requests */
  maxRetries: number;
}

export interface TaskStartOptions {
  /** Run autonomously without confirmations */
  yoloMode?: boolean;
  /** Use load balancing */
  useLoadBalancing?: boolean;
  /** Base branch for worktree */
  baseBranch?: string;
  /** Use worktree isolation */
  useWorktree?: boolean;
  /** Model to use */
  model?: string;
  /** Thinking level */
  thinkingLevel?: string;
  /** Parallel execution (handled by OpenCode internally) */
  parallel?: boolean;
  /** Number of workers (handled by OpenCode internally) */
  workers?: number;
}

export interface AgentStatus {
  /** Whether OpenCode CLI is available */
  openCodeAvailable: boolean;
  /** OpenCode version */
  openCodeVersion: string | null;
  /** Currently running tasks */
  runningTasks: string[];
  /** Load balancer status */
  loadBalancerEnabled: boolean;
  /** Available profiles count */
  availableProfiles: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: BmadAgentManagerConfig = {
  defaultYoloMode: true, // Autonomous execution by default
  defaultLoadBalancing: true,
  defaultRetryOnRateLimit: true,
  maxRetries: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert TaskProgressEvent to ExecutionProgressData for compatibility with existing event handlers.
 * Maps BMAD phases to the legacy phase names expected by the UI.
 */
function convertToExecutionProgress(event: TaskProgressEvent): ExecutionProgressData {
  // Map BMAD phases to legacy phases
  const phaseMap: Record<TaskProgressEvent['phase'], ExecutionProgressData['phase']> = {
    'planning': 'planning',
    'coding': 'coding',
    'testing': 'qa_review',  // Map testing to qa_review
    'review': 'qa_fixing',   // Map review to qa_fixing
    'complete': 'complete',
    'failed': 'failed',
  };

  return {
    phase: phaseMap[event.phase] || 'planning',
    phaseProgress: event.progress,
    overallProgress: event.progress,
    message: event.message,
    currentSubtask: undefined,
    completedPhases: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Agent Manager Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BmadAgentManager is the central orchestrator for all AI-powered task execution.
 * It replaces the old Python runner approach with BMAD methodology via OpenCode CLI.
 */
export class BmadAgentManager extends EventEmitter {
  private config: BmadAgentManagerConfig;
  private bridges: Map<string, TaskWorkflowBridge> = new Map();
  private activeTasks: Map<string, { projectPath: string; task: BmadTask }> = new Map();
  private initialized: boolean = false;

  constructor(config: Partial<BmadAgentManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the agent manager
   */
  async initialize(): Promise<IpcResult<void>> {
    debugLogger.log('TASK', 'Initializing BmadAgentManager');
    
    // Check OpenCode availability
    const openCodeAvailable = await isOpenCodeAvailable();
    if (!openCodeAvailable) {
      return errorResult(
        'OPENCODE_NOT_FOUND',
        'OpenCode CLI is required but not found. Please install OpenCode (https://github.com/opencode-ai/opencode)'
      );
    }

    const version = await getOpenCodeVersion();
    debugLogger.log('TASK', 'OpenCode CLI found', { version });

    this.initialized = true;
    return successResult(undefined);
  }

  /**
   * Get or create a TaskWorkflowBridge for a project
   */
  private async getBridge(projectPath: string): Promise<TaskWorkflowBridge> {
    const resolvedPath = resolve(projectPath);
    
    if (!this.bridges.has(resolvedPath)) {
      const bridge = getTaskWorkflowBridge(resolvedPath);
      await bridge.initialize();
      
      // Forward events with format conversion for compatibility
      bridge.on('stdout', (data) => this.emit('log', data));
      bridge.on('stderr', (data) => this.emit('log', data));
      bridge.on('task-progress', (event: TaskProgressEvent) => {
        // Convert to ExecutionProgressData format for existing event handlers
        const progressData = convertToExecutionProgress(event);
        this.emit('execution-progress', event.taskId, progressData);
      });
      bridge.on('task-complete', (result) => this.handleTaskComplete(result));
      bridge.on('error', (error) => this.emit('error', null, error.message));
      
      this.bridges.set(resolvedPath, bridge);
    }
    
    return this.bridges.get(resolvedPath)!;
  }

  /**
   * Start spec creation (maps to BMAD story creation + dev-story workflow)
   * 
   * This replaces the old spec_runner.py approach.
   */
  async startSpecCreation(
    taskId: string,
    projectPath: string,
    taskDescription: string,
    specDir?: string,
    metadata?: BmadTaskMetadata,
    baseBranch?: string
  ): Promise<void> {
    debugLogger.log('TASK', 'Starting spec creation via BMAD workflow', {
      taskId,
      projectPath,
      taskDescription: taskDescription.substring(0, 100),
    });

    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        const errorMessage = initResult.error?.message || 'Failed to initialize';
        // Emit both error and failed progress for proper UI update
        this.emit('error', taskId, errorMessage);
        // Emit a failed execution progress so UI shows task as failed
        const failedProgress: ExecutionProgressData = {
          phase: 'failed',
          phaseProgress: 0,
          overallProgress: 0,
          message: errorMessage,
        };
        this.emit('execution-progress', taskId, failedProgress);
        return;
      }
    }

    // Create BMAD task representation
    const task: BmadTask = {
      id: taskId,
      title: taskDescription.split('\n')[0].substring(0, 100),
      description: taskDescription,
      specId: specDir ? specDir.split('/').pop() || taskId : taskId,
      projectPath,
      status: 'planning',
      metadata: {
        useWorktree: metadata?.useWorktree,
        baseBranch,
        model: metadata?.model,
        thinkingLevel: metadata?.thinkingLevel,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Track active task
    this.activeTasks.set(taskId, { projectPath, task });

    // Get bridge and execute
    const bridge = await this.getBridge(projectPath);
    
    const result = await bridge.executeTask(task, {
      yoloMode: this.config.defaultYoloMode,
      useLoadBalancing: this.config.defaultLoadBalancing,
      retryOnRateLimit: this.config.defaultRetryOnRateLimit,
      maxRetries: this.config.maxRetries,
      onStdout: (data) => this.emit('log', taskId, data),
      onStderr: (data) => this.emit('log', taskId, data),
      onProgress: (event: TaskProgressEvent) => {
        const progressData = convertToExecutionProgress(event);
        this.emit('execution-progress', taskId, progressData);
      },
    });

    if (!result.success) {
      const errorMessage = result.error?.message || 'Failed to start task';
      this.emit('error', taskId, errorMessage);
      // Also emit failed progress so UI updates properly
      const failedProgress: ExecutionProgressData = {
        phase: 'failed',
        phaseProgress: 0,
        overallProgress: 0,
        message: errorMessage,
      };
      this.emit('execution-progress', taskId, failedProgress);
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Start task execution (maps to BMAD dev-story workflow)
   * 
   * This replaces the old run.py approach.
   */
  async startTaskExecution(
    taskId: string,
    projectPath: string,
    specId: string,
    options: TaskStartOptions = {}
  ): Promise<void> {
    debugLogger.log('TASK', 'Starting task execution via BMAD workflow', {
      taskId,
      projectPath,
      specId,
    });

    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        const errorMessage = initResult.error?.message || 'Failed to initialize';
        // Emit both error and failed progress for proper UI update
        this.emit('error', taskId, errorMessage);
        // Emit a failed execution progress so UI shows task as failed
        const failedProgress: ExecutionProgressData = {
          phase: 'failed',
          phaseProgress: 0,
          overallProgress: 0,
          message: errorMessage,
        };
        this.emit('execution-progress', taskId, failedProgress);
        return;
      }
    }

    // Load existing task info or create new
    const task: BmadTask = {
      id: taskId,
      title: `Task ${specId}`,
      specId,
      projectPath,
      status: 'in_progress',
      metadata: {
        useWorktree: options.useWorktree,
        baseBranch: options.baseBranch,
        model: options.model,
        thinkingLevel: options.thinkingLevel,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Track active task
    this.activeTasks.set(taskId, { projectPath, task });

    // Get bridge and execute
    const bridge = await this.getBridge(projectPath);
    
    const result = await bridge.executeTask(task, {
      yoloMode: options.yoloMode ?? this.config.defaultYoloMode,
      useLoadBalancing: options.useLoadBalancing ?? this.config.defaultLoadBalancing,
      retryOnRateLimit: this.config.defaultRetryOnRateLimit,
      maxRetries: this.config.maxRetries,
      onStdout: (data) => this.emit('log', taskId, data),
      onStderr: (data) => this.emit('log', taskId, data),
      onProgress: (event: TaskProgressEvent) => {
        const progressData = convertToExecutionProgress(event);
        this.emit('execution-progress', taskId, progressData);
      },
    });

    if (!result.success) {
      const errorMessage = result.error?.message || 'Failed to start task';
      this.emit('error', taskId, errorMessage);
      // Also emit failed progress so UI updates properly
      const failedProgress: ExecutionProgressData = {
        phase: 'failed',
        phaseProgress: 0,
        overallProgress: 0,
        message: errorMessage,
      };
      this.emit('execution-progress', taskId, failedProgress);
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Start QA process (maps to BMAD code-review workflow)
   */
  async startQAProcess(
    taskId: string,
    projectPath: string,
    specId: string
  ): Promise<void> {
    debugLogger.log('TASK', 'Starting QA process via BMAD code-review workflow', {
      taskId,
      projectPath,
      specId,
    });

    const bridge = await this.getBridge(projectPath);
    
    const result = await bridge.runPlanningWorkflow('code-review', {
      yoloMode: this.config.defaultYoloMode,
      useLoadBalancing: this.config.defaultLoadBalancing,
      onStdout: (data) => this.emit('log', taskId, data),
      onStderr: (data) => this.emit('log', taskId, data),
    });

    if (!result.success) {
      this.emit('error', taskId, result.error?.message || 'Failed to start QA process');
    }
  }

  /**
   * Handle task completion
   */
  private handleTaskComplete(result: TaskExecutionResult): void {
    debugLogger.log('TASK', 'Task completed', {
      taskId: result.taskId,
      success: result.success,
      duration: result.duration,
    });

    this.activeTasks.delete(result.taskId);

    // Emit completion event compatible with old agent system
    this.emit('exit', result.taskId, result.exitCode, 'task-execution');
  }

  /**
   * Kill a running task
   */
  async killTask(taskId: string): Promise<boolean> {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) {
      return false;
    }

    const bridge = this.bridges.get(resolve(activeTask.projectPath));
    if (bridge) {
      const result = await bridge.cancelTask(taskId);
      if (result.success) {
        this.activeTasks.delete(taskId);
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a task is running
   */
  isRunning(taskId: string): boolean {
    return this.activeTasks.has(taskId);
  }

  /**
   * Get running task IDs
   */
  getRunningTasks(): string[] {
    return Array.from(this.activeTasks.keys());
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<AgentStatus> {
    const openCodeAvailable = await isOpenCodeAvailable();
    const openCodeVersion = openCodeAvailable ? await getOpenCodeVersion() : null;
    
    return {
      openCodeAvailable,
      openCodeVersion,
      runningTasks: this.getRunningTasks(),
      loadBalancerEnabled: this.config.defaultLoadBalancing,
      availableProfiles: 0, // TODO: Get from load balancer
    };
  }

  /**
   * Run a planning workflow (PRD, Architecture, etc.)
   */
  async runPlanningWorkflow(
    projectPath: string,
    workflowId: string,
    options: TaskExecutionOptions = {}
  ): Promise<IpcResult<void>> {
    debugLogger.log('TASK', 'Running planning workflow', { projectPath, workflowId });

    const bridge = await this.getBridge(projectPath);
    return bridge.runPlanningWorkflow(workflowId, {
      yoloMode: options.yoloMode ?? this.config.defaultYoloMode,
      useLoadBalancing: options.useLoadBalancing ?? this.config.defaultLoadBalancing,
      onStdout: options.onStdout,
      onStderr: options.onStderr,
    });
  }

  /**
   * Get workflow status for a project
   */
  async getWorkflowStatus(projectPath: string): Promise<Record<string, unknown>> {
    const bridge = await this.getBridge(projectPath);
    return bridge.getWorkflowStatus();
  }

  /**
   * Kill all running tasks
   */
  async killAll(): Promise<void> {
    const tasks = Array.from(this.activeTasks.keys());
    await Promise.all(tasks.map(taskId => this.killTask(taskId)));
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    // Kill all running tasks
    await this.killAll();

    // Dispose all bridges
    for (const [path] of this.bridges) {
      await disposeTaskWorkflowBridge(path);
    }
    this.bridges.clear();

    // Clean up
    this.activeTasks.clear();
    this.removeAllListeners();
    this.initialized = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Legacy API Compatibility
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Configure method (legacy compatibility - no-op)
   */
  configure(_pythonPath?: string, _autoBuildSourcePath?: string): void {
    // No-op - BMAD doesn't need Python configuration
    debugLogger.log('TASK', 'configure() called - no-op in BMAD mode');
  }

  /**
   * Start roadmap generation (legacy - maps to BMAD analysis workflows)
   */
  startRoadmapGeneration(
    projectId: string,
    projectPath: string,
    _refresh: boolean = false,
    _enableCompetitorAnalysis: boolean = false,
    _refreshCompetitorAnalysis: boolean = false,
    _config?: unknown
  ): void {
    debugLogger.log('TASK', 'startRoadmapGeneration() - running BMAD analysis workflows', { projectId });
    
    // Run analysis phase workflows
    this.runPlanningWorkflow(projectPath, 'brainstorm-project').catch(err => {
      this.emit('error', projectId, `Roadmap generation failed: ${err.message}`);
    });
  }

  /**
   * Start ideation generation (legacy - maps to BMAD brainstorming)
   */
  startIdeationGeneration(
    projectId: string,
    projectPath: string,
    _config: unknown,
    _refresh: boolean = false
  ): void {
    debugLogger.log('TASK', 'startIdeationGeneration() - running BMAD brainstorming', { projectId });
    
    this.runPlanningWorkflow(projectPath, 'brainstorm-project').catch(err => {
      this.emit('error', projectId, `Ideation generation failed: ${err.message}`);
    });
  }

  /**
   * Stop ideation (legacy)
   */
  stopIdeation(_projectId: string): boolean {
    // TODO: Implement if needed
    return false;
  }

  /**
   * Check if ideation is running (legacy)
   */
  isIdeationRunning(_projectId: string): boolean {
    return false;
  }

  /**
   * Stop roadmap (legacy)
   */
  stopRoadmap(_projectId: string): boolean {
    // TODO: Implement if needed
    return false;
  }

  /**
   * Check if roadmap is running (legacy)
   */
  isRoadmapRunning(_projectId: string): boolean {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let bmadAgentManagerInstance: BmadAgentManager | null = null;

/**
 * Get the singleton BmadAgentManager instance
 */
export function getBmadAgentManager(config?: Partial<BmadAgentManagerConfig>): BmadAgentManager {
  if (!bmadAgentManagerInstance) {
    bmadAgentManagerInstance = new BmadAgentManager(config);
  }
  return bmadAgentManagerInstance;
}

/**
 * Dispose the singleton instance
 */
export async function disposeBmadAgentManager(): Promise<void> {
  if (bmadAgentManagerInstance) {
    await bmadAgentManagerInstance.dispose();
    bmadAgentManagerInstance = null;
  }
}

/**
 * Check if BMAD mode is available (OpenCode CLI installed)
 */
export async function isBmadModeAvailable(): Promise<boolean> {
  return isOpenCodeAvailable();
}
