/**
 * Agent module - BMAD-based agent management system
 *
 * This module provides AI-powered task execution via OpenCode CLI and BMAD methodology.
 * All task execution goes through BMAD workflows - no Python runners or Claude CLI.
 * 
 * Architecture:
 * - AgentManager (BmadAgentManager): Main orchestrator for all AI task execution
 * - TaskWorkflowBridge: Bridges Kanban tasks to BMAD workflows
 * - WorkflowRunner: Executes workflows via OpenCode CLI
 */

// Main export - AgentManager IS BmadAgentManager
export { 
  BmadAgentManager,
  BmadAgentManager as AgentManager,
  getBmadAgentManager,
  disposeBmadAgentManager,
  isBmadModeAvailable,
  type BmadAgentManagerConfig,
  type TaskStartOptions,
  type AgentStatus,
} from '../bmad/bmad-agent-manager';

// Task Workflow Bridge
export {
  TaskWorkflowBridge,
  getTaskWorkflowBridge,
  disposeTaskWorkflowBridge,
  type BmadTask,
  type BmadTaskStatus,
  type BmadTaskMetadata,
  type TaskProgressEvent,
  type TaskExecutionResult,
} from '../bmad/task-workflow-bridge';

// Internal components (still used for state tracking)
export { AgentState } from './agent-state';
export { AgentEvents } from './agent-events';
export { AgentProcessManager } from './agent-process';
export { AgentQueueManager } from './agent-queue';

export type {
  AgentProcess,
  ExecutionProgressData,
  ProcessType,
  AgentManagerEvents,
  TaskExecutionOptions,
  SpecCreationMetadata,
  IdeationProgressData,
  RoadmapProgressData
} from './types';

// Re-export IdeationConfig from shared types for consistency
export type { IdeationConfig } from '../../shared/types';
