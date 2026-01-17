/**
 * AgentManager - BMAD-based agent management
 *
 * This file provides the AgentManager (which is BmadAgentManager).
 * All task execution goes through BMAD workflows via OpenCode CLI.
 *
 * Import:
 *   import { AgentManager } from './agent-manager'
 */

export {
  AgentManager,
  BmadAgentManager,
  getBmadAgentManager,
  disposeBmadAgentManager,
  AgentState,
  AgentEvents,
  AgentProcessManager,
  AgentQueueManager,
  TaskWorkflowBridge,
  getTaskWorkflowBridge,
  disposeTaskWorkflowBridge,
} from './agent';

export type {
  AgentProcess,
  ExecutionProgressData,
  ProcessType,
  AgentManagerEvents,
  IdeationConfig,
  TaskExecutionOptions,
  SpecCreationMetadata,
  IdeationProgressData,
  RoadmapProgressData,
  BmadTask,
  BmadTaskStatus,
  BmadTaskMetadata,
  TaskProgressEvent,
  TaskExecutionResult,
  BmadAgentManagerConfig,
  TaskStartOptions,
  AgentStatus,
} from './agent';
