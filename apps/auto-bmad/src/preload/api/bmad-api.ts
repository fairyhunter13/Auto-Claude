/**
 * BMAD Preload API
 * 
 * Exposes BMAD IPC handlers to the renderer process via contextBridge.
 * Provides typed methods for config, status, workflows, agents, and artifacts.
 */

import { ipcRenderer } from 'electron';

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrored from main process for preload safety)
// ─────────────────────────────────────────────────────────────────────────────

export type BmadPhase = 'analysis' | 'planning' | 'solutioning' | 'implementation';
export type WorkflowStatusValue = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked';

export interface BmadConfig {
  project_name: string;
  user_skill_level?: 'beginner' | 'intermediate' | 'advanced';
  planning_artifacts?: string;
  implementation_artifacts?: string;
  project_knowledge?: string;
  tea_use_mcp_enhancements?: boolean;
  tea_use_playwright_utils?: boolean;
  user_name?: string;
  communication_language?: string;
  document_output_language?: string;
  output_folder?: string;
}

export interface WorkflowEntry {
  status: WorkflowStatusValue;
  completed_at?: string;
  artifact_path?: string;
  note?: string;
  result?: string;
  current_story?: string;
}

export interface PhaseStatus {
  status: WorkflowStatusValue;
  current_sprint?: number;
  workflows: Record<string, WorkflowEntry>;
}

export interface BmadWorkflowStatus {
  project_name: string;
  project_type?: 'greenfield' | 'brownfield';
  current_phase: BmadPhase;
  phases: {
    analysis?: PhaseStatus;
    planning?: PhaseStatus;
    solutioning?: PhaseStatus;
    implementation?: PhaseStatus;
  };
  next_workflow?: string;
  current_story?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  phase: BmadPhase;
  agent: string;
  command: string;
  outputFile?: string;
  optional: boolean;
  dependsOn?: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  module: 'bmm' | 'cis' | 'core';
  description?: string;
  principles?: string[];
  communicationStyle?: string;
}

export interface ArtifactInfo {
  path: string;
  name: string;
  type: 'planning' | 'implementation';
  workflow?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  size?: number;
}

export type IpcResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusChangeEvent {
  type: 'status-change';
  status: BmadWorkflowStatus;
}

export interface ArtifactChangeEvent {
  type: 'artifact-change';
  action: 'add' | 'change' | 'unlink';
  path: string;
  artifact?: ArtifactInfo;
}

export interface WorkflowProgressEvent {
  type: 'workflow-progress';
  workflowId: string;
  phase: BmadPhase;
  status: WorkflowStatusValue;
  message?: string;
}

export interface WorkflowExitEvent {
  workflowId: string;
  exitCode: number | null;
  success: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface BmadAPI {
  // Project Detection
  isProject: (projectPath: string) => Promise<boolean>;
  hasConfig: (projectPath: string) => Promise<boolean>;
  hasStatus: (projectPath: string) => Promise<boolean>;

  // Configuration
  getConfig: (projectPath: string) => Promise<IpcResult<BmadConfig>>;
  getDefaultConfig: (projectPath: string, projectName?: string) => Promise<IpcResult<BmadConfig>>;

  // Status Management
  initStatus: (projectPath: string, projectName?: string) => Promise<IpcResult<BmadWorkflowStatus>>;
  getStatus: (projectPath: string) => Promise<IpcResult<BmadWorkflowStatus>>;
  updateStatus: (
    projectPath: string,
    phase: BmadPhase,
    workflowId: string,
    status: WorkflowStatusValue,
    options?: {
      artifactPath?: string;
      note?: string;
      result?: string;
      currentStory?: string;
    }
  ) => Promise<IpcResult<BmadWorkflowStatus>>;

  // Artifact Management
  initArtifacts: (projectPath: string) => Promise<IpcResult<ArtifactInfo[]>>;
  listArtifacts: (projectPath: string) => Promise<IpcResult<ArtifactInfo[]>>;
  getArtifactsByType: (projectPath: string, type: 'planning' | 'implementation') => Promise<IpcResult<ArtifactInfo[]>>;

  // Workflow Execution (OpenCode CLI)
  checkOpenCode: () => Promise<IpcResult<{ available: boolean }>>;
  initWorkflowRunner: (projectPath: string) => Promise<IpcResult<void>>;
  getWorkflows: (projectPath: string) => Promise<IpcResult<WorkflowDefinition[]>>;
  getWorkflowsForPhase: (projectPath: string, phase: BmadPhase) => Promise<IpcResult<WorkflowDefinition[]>>;
  startWorkflow: (
    projectPath: string,
    workflowId: string,
    options?: {
      args?: string[];
      env?: Record<string, string>;
    }
  ) => Promise<IpcResult<void>>;
  cancelWorkflow: (projectPath: string) => Promise<IpcResult<void>>;
  isWorkflowRunning: (projectPath: string) => Promise<IpcResult<{ running: boolean; workflowId: string | null }>>;
  writeToWorkflow: (projectPath: string, data: string) => Promise<IpcResult<void>>;

  // Agent Management
  getAgents: () => Promise<IpcResult<AgentDefinition[]>>;
  getAgentsByModule: (module: 'bmm' | 'cis' | 'core') => Promise<IpcResult<AgentDefinition[]>>;
  loadAllAgents: (projectPath: string) => Promise<IpcResult<AgentDefinition[]>>;
  loadAgent: (projectPath: string, agentId: string) => Promise<IpcResult<AgentDefinition>>;

  // Cleanup
  dispose: () => Promise<IpcResult<void>>;

  // Event Subscriptions
  onStatusChanged: (callback: (event: StatusChangeEvent) => void) => () => void;
  onArtifactChanged: (callback: (event: ArtifactChangeEvent) => void) => () => void;
  onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => () => void;
  onWorkflowStdout: (callback: (data: string) => void) => () => void;
  onWorkflowStderr: (callback: (data: string) => void) => () => void;
  onWorkflowExit: (callback: (event: WorkflowExitEvent) => void) => () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createBmadAPI = (): BmadAPI => ({
  // Project Detection
  isProject: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke('bmad:is-project', projectPath),

  hasConfig: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke('bmad:has-config', projectPath),

  hasStatus: (projectPath: string): Promise<boolean> =>
    ipcRenderer.invoke('bmad:has-status', projectPath),

  // Configuration
  getConfig: (projectPath: string): Promise<IpcResult<BmadConfig>> =>
    ipcRenderer.invoke('bmad:get-config', projectPath),

  getDefaultConfig: (projectPath: string, projectName?: string): Promise<IpcResult<BmadConfig>> =>
    ipcRenderer.invoke('bmad:get-default-config', projectPath, projectName),

  // Status Management
  initStatus: (projectPath: string, projectName?: string): Promise<IpcResult<BmadWorkflowStatus>> =>
    ipcRenderer.invoke('bmad:init-status', projectPath, projectName),

  getStatus: (projectPath: string): Promise<IpcResult<BmadWorkflowStatus>> =>
    ipcRenderer.invoke('bmad:get-status', projectPath),

  updateStatus: (
    projectPath: string,
    phase: BmadPhase,
    workflowId: string,
    status: WorkflowStatusValue,
    options?: {
      artifactPath?: string;
      note?: string;
      result?: string;
      currentStory?: string;
    }
  ): Promise<IpcResult<BmadWorkflowStatus>> =>
    ipcRenderer.invoke('bmad:update-status', projectPath, phase, workflowId, status, options),

  // Artifact Management
  initArtifacts: (projectPath: string): Promise<IpcResult<ArtifactInfo[]>> =>
    ipcRenderer.invoke('bmad:init-artifacts', projectPath),

  listArtifacts: (projectPath: string): Promise<IpcResult<ArtifactInfo[]>> =>
    ipcRenderer.invoke('bmad:list-artifacts', projectPath),

  getArtifactsByType: (projectPath: string, type: 'planning' | 'implementation'): Promise<IpcResult<ArtifactInfo[]>> =>
    ipcRenderer.invoke('bmad:get-artifacts-by-type', projectPath, type),

  // Workflow Execution (OpenCode CLI)
  checkOpenCode: (): Promise<IpcResult<{ available: boolean }>> =>
    ipcRenderer.invoke('bmad:check-opencode'),

  initWorkflowRunner: (projectPath: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:init-workflow-runner', projectPath),

  getWorkflows: (projectPath: string): Promise<IpcResult<WorkflowDefinition[]>> =>
    ipcRenderer.invoke('bmad:get-workflows', projectPath),

  getWorkflowsForPhase: (projectPath: string, phase: BmadPhase): Promise<IpcResult<WorkflowDefinition[]>> =>
    ipcRenderer.invoke('bmad:get-workflows-for-phase', projectPath, phase),

  startWorkflow: (
    projectPath: string,
    workflowId: string,
    options?: {
      args?: string[];
      env?: Record<string, string>;
    }
  ): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:start-workflow', projectPath, workflowId, options),

  cancelWorkflow: (projectPath: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:cancel-workflow', projectPath),

  isWorkflowRunning: (projectPath: string): Promise<IpcResult<{ running: boolean; workflowId: string | null }>> =>
    ipcRenderer.invoke('bmad:is-workflow-running', projectPath),

  writeToWorkflow: (projectPath: string, data: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:write-to-workflow', projectPath, data),

  // Agent Management
  getAgents: (): Promise<IpcResult<AgentDefinition[]>> =>
    ipcRenderer.invoke('bmad:get-agents'),

  getAgentsByModule: (module: 'bmm' | 'cis' | 'core'): Promise<IpcResult<AgentDefinition[]>> =>
    ipcRenderer.invoke('bmad:get-agents-by-module', module),

  loadAllAgents: (projectPath: string): Promise<IpcResult<AgentDefinition[]>> =>
    ipcRenderer.invoke('bmad:load-all-agents', projectPath),

  loadAgent: (projectPath: string, agentId: string): Promise<IpcResult<AgentDefinition>> =>
    ipcRenderer.invoke('bmad:load-agent', projectPath, agentId),

  // Cleanup
  dispose: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:dispose'),

  // Event Subscriptions
  onStatusChanged: (callback: (event: StatusChangeEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: StatusChangeEvent) => callback(event);
    ipcRenderer.on('bmad:status-changed', listener);
    return () => ipcRenderer.off('bmad:status-changed', listener);
  },

  onArtifactChanged: (callback: (event: ArtifactChangeEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: ArtifactChangeEvent) => callback(event);
    ipcRenderer.on('bmad:artifact-changed', listener);
    return () => ipcRenderer.off('bmad:artifact-changed', listener);
  },

  onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: WorkflowProgressEvent) => callback(event);
    ipcRenderer.on('bmad:workflow-progress', listener);
    return () => ipcRenderer.off('bmad:workflow-progress', listener);
  },

  onWorkflowStdout: (callback: (data: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('bmad:workflow-stdout', listener);
    return () => ipcRenderer.off('bmad:workflow-stdout', listener);
  },

  onWorkflowStderr: (callback: (data: string) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('bmad:workflow-stderr', listener);
    return () => ipcRenderer.off('bmad:workflow-stderr', listener);
  },

  onWorkflowExit: (callback: (event: WorkflowExitEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: WorkflowExitEvent) => callback(event);
    ipcRenderer.on('bmad:workflow-exit', listener);
    return () => ipcRenderer.off('bmad:workflow-exit', listener);
  },
});
