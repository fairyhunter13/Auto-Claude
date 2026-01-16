/**
 * BMAD Module Index
 * 
 * Main entry point for BMAD functionality in the main process.
 * Re-exports all BMAD-related types and utilities.
 */

// Types
export * from './types';

// Configuration
export {
  loadBmadConfig,
  getDefaultConfig,
  getConfigPath,
  hasBmadConfig,
  isBmadProject,
} from './config-loader';

// Status Management
export {
  StatusManager,
  getStatusManager,
  disposeStatusManager,
  getStatusPath,
  hasStatusFile,
} from './status-manager';

// Artifact Watching
export {
  ArtifactWatcher,
  getArtifactWatcher,
  disposeArtifactWatcher,
  getOutputPath,
  getPlanningArtifactsPath,
  getImplementationArtifactsPath,
} from './artifact-watcher';

// Workflow Execution
export {
  WorkflowRunner,
  getWorkflowRunner,
  disposeWorkflowRunner,
  isOpenCodeAvailable,
  getOpenCodeVersion,
  type WorkflowRunOptions,
  type WorkflowRunResult,
} from './workflow-runner';

// Agent Parsing
export {
  loadAgent,
  loadAllAgents,
  discoverAgents,
  getBaseAgents,
  getAgentsByModule,
  getAgentForWorkflow,
  getAgentsPath,
  getAgentFilePath,
} from './agent-parser';

// Project Management
export {
  BmadProjectManager,
  bmadProjectManager,
  type BmadProject,
  type BmadProjectType,
  type CreateProjectOptions,
  type ImportProjectOptions,
  type BmadProjectValidation,
} from './project-manager';

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────────────────────

import { disposeStatusManager } from './status-manager';
import { disposeArtifactWatcher } from './artifact-watcher';
import { disposeWorkflowRunner } from './workflow-runner';

/**
 * Dispose all BMAD resources
 * Call this when switching projects or before app quit
 */
export async function disposeBmadResources(): Promise<void> {
  await Promise.all([
    disposeStatusManager(),
    disposeArtifactWatcher(),
    disposeWorkflowRunner(),
  ]);
}
