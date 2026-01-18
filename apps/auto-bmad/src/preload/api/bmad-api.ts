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
  module: 'bmm' | 'cis' | 'core' | 'bmb';
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

// Project Management Types
export type BmadProjectType = 'greenfield' | 'brownfield';

export interface BmadProject {
  id: string;
  name: string;
  path: string;
  projectType: BmadProjectType;
  currentPhase: BmadPhase;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
}

export interface CreateProjectOptions {
  name: string;
  path: string;
  projectType: BmadProjectType;
  communicationLanguage?: string;
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ImportProjectOptions {
  path: string;
}

export interface BmadProjectValidation {
  valid: boolean;
  hasBmadDir: boolean;
  hasBmadOutput: boolean;
  hasStatusFile: boolean;
  hasConfigFile: boolean;
  errors: string[];
}

export interface BmadSettings {
  opencodePath?: string;
  defaultCommunicationLanguage?: string;
}

// Load Balancer Types
export type OpenCodeProfile = 'personal' | 'work' | 'default';
export type LoadBalancingStrategy = 'round-robin' | 'least-loaded' | 'least-recently-used' | 'random';

export interface ProfileStats {
  id: OpenCodeProfile;
  name: string;
  available: boolean;
  currentLoad: number;
  rateLimitedUntil: number | null;
  lastUsed: number;
  successCount: number;
  failureCount: number;
}

export interface LoadBalancerConfig {
  enabled: boolean;
  strategy: LoadBalancingStrategy;
  maxConcurrentPerProfile: number;
  rateLimitCooldown: number;
  skipRateLimited: boolean;
  enabledProfiles: OpenCodeProfile[];
}

export interface LoadBalancerState {
  initialized: boolean;
  profiles: ProfileStats[];
  config: LoadBalancerConfig;
}

export interface RateLimitedEvent {
  profile: OpenCodeProfile;
  cooldownUntil: number;
}

export interface ExecutionCompletedEvent {
  profile: OpenCodeProfile;
  exitCode: number;
  duration: number;
  rateLimited: boolean;
}

// Chat/Interactive Mode Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  isStreaming?: boolean;
  workflowId?: string;
}

export interface ChatSession {
  id: string;
  projectPath: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  activeAgentId?: string;
}

export interface ChatSessionInit {
  sessionId: string;
  messages: ChatMessage[];
}

export interface ChatStreamEvent {
  messageId: string;
  chunk: string;
  content: string;
}

// Gate Check Types
export interface GateCheckItem {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  message?: string;
  artifactPath?: string;
  details?: string[];
}

export interface GateCheckResult {
  passed: boolean;
  overridden: boolean;
  overriddenAt?: Date;
  checkedAt: Date;
  items: GateCheckItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  blockingIssues: string[];
}

export interface GateCheckOverride {
  confirmation: string;
  reason?: string;
  timestamp: Date;
}

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
  // Project Management
  selectFolder: () => Promise<IpcResult<{ canceled: boolean; path: string | null }>>;
  validateProject: (projectPath: string) => Promise<IpcResult<BmadProjectValidation>>;
  createProject: (options: CreateProjectOptions) => Promise<IpcResult<BmadProject>>;
  importProject: (options: ImportProjectOptions) => Promise<IpcResult<BmadProject>>;
  getProjects: () => Promise<IpcResult<BmadProject[]>>;
  getProject: (projectId: string) => Promise<IpcResult<BmadProject | undefined>>;
  getRecentProjects: () => Promise<IpcResult<BmadProject[]>>;
  openProject: (projectId: string) => Promise<IpcResult<BmadProject | undefined>>;
  removeProject: (projectId: string) => Promise<IpcResult<boolean>>;
  updateProject: (projectId: string, updates: Partial<Pick<BmadProject, 'name' | 'currentPhase'>>) => Promise<IpcResult<BmadProject | undefined>>;
  getSettings: () => Promise<IpcResult<BmadSettings>>;
  updateSettings: (settings: Partial<BmadSettings>) => Promise<IpcResult<void>>;

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

  // Load Balancer
  initLoadBalancer: () => Promise<IpcResult<{ initialized: boolean }>>;
  getLoadBalancerState: () => Promise<IpcResult<LoadBalancerState>>;
  getProfileStats: () => Promise<IpcResult<Record<OpenCodeProfile, ProfileStats>>>;
  clearRateLimit: (profile: OpenCodeProfile) => Promise<IpcResult<void>>;
  enableLoadBalancing: (projectPath: string) => Promise<IpcResult<void>>;
  disableLoadBalancing: (projectPath: string) => Promise<IpcResult<void>>;
  isLoadBalancingEnabled: (projectPath: string) => Promise<IpcResult<{ enabled: boolean }>>;

  // Interactive Mode / Chat
  initInteractiveSession: (projectPath: string) => Promise<IpcResult<ChatSessionInit>>;
  sendChatMessage: (content: string, options?: { agentId?: string }) => Promise<IpcResult<ChatMessage>>;
  cancelChatResponse: () => Promise<IpcResult<void>>;
  setActiveAgent: (agentId: string) => Promise<IpcResult<void>>;
  clearChatHistory: () => Promise<IpcResult<void>>;
  saveChatSession: () => Promise<IpcResult<void>>;
  loadChatSession: (sessionId: string) => Promise<IpcResult<ChatSession>>;
  listChatSessions: (projectPath: string) => Promise<IpcResult<Array<{ id: string; createdAt: Date; messageCount: number }>>>;
  onChatStream: (callback: (event: ChatStreamEvent) => void) => () => void;
  onChatMessageComplete: (callback: (message: ChatMessage) => void) => () => void;

  // Gate Check
  runGateCheck: (projectPath: string) => Promise<IpcResult<GateCheckResult>>;
  overrideGateCheck: (projectPath: string, override: GateCheckOverride) => Promise<IpcResult<GateCheckResult>>;
  shouldBlockPhase4: (projectPath: string) => Promise<IpcResult<boolean>>;
  getBlockingReasons: (projectPath: string) => Promise<IpcResult<string[]>>;

  // Event Subscriptions
  onStatusChanged: (callback: (event: StatusChangeEvent) => void) => () => void;
  onArtifactChanged: (callback: (event: ArtifactChangeEvent) => void) => () => void;
  onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => () => void;
  onWorkflowStdout: (callback: (data: string) => void) => () => void;
  onWorkflowStderr: (callback: (data: string) => void) => () => void;
  onWorkflowExit: (callback: (event: WorkflowExitEvent) => void) => () => void;
  onRateLimited: (callback: (event: RateLimitedEvent) => void) => () => void;
  onExecutionCompleted: (callback: (event: ExecutionCompletedEvent) => void) => () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createBmadAPI = (): BmadAPI => ({
  // Project Management
  selectFolder: (): Promise<IpcResult<{ canceled: boolean; path: string | null }>> =>
    ipcRenderer.invoke('bmad:select-folder'),

  validateProject: (projectPath: string): Promise<IpcResult<BmadProjectValidation>> =>
    ipcRenderer.invoke('bmad:validate-project', projectPath),

  createProject: (options: CreateProjectOptions): Promise<IpcResult<BmadProject>> =>
    ipcRenderer.invoke('bmad:create-project', options),

  importProject: (options: ImportProjectOptions): Promise<IpcResult<BmadProject>> =>
    ipcRenderer.invoke('bmad:import-project', options),

  getProjects: (): Promise<IpcResult<BmadProject[]>> =>
    ipcRenderer.invoke('bmad:get-projects'),

  getProject: (projectId: string): Promise<IpcResult<BmadProject | undefined>> =>
    ipcRenderer.invoke('bmad:get-project', projectId),

  getRecentProjects: (): Promise<IpcResult<BmadProject[]>> =>
    ipcRenderer.invoke('bmad:get-recent-projects'),

  openProject: (projectId: string): Promise<IpcResult<BmadProject | undefined>> =>
    ipcRenderer.invoke('bmad:open-project', projectId),

  removeProject: (projectId: string): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke('bmad:remove-project', projectId),

  updateProject: (projectId: string, updates: Partial<Pick<BmadProject, 'name' | 'currentPhase'>>): Promise<IpcResult<BmadProject | undefined>> =>
    ipcRenderer.invoke('bmad:update-project', projectId, updates),

  getSettings: (): Promise<IpcResult<BmadSettings>> =>
    ipcRenderer.invoke('bmad:get-settings'),

  updateSettings: (settings: Partial<BmadSettings>): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:update-settings', settings),

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

  // Load Balancer
  initLoadBalancer: (): Promise<IpcResult<{ initialized: boolean }>> =>
    ipcRenderer.invoke('bmad:init-load-balancer'),

  getLoadBalancerState: (): Promise<IpcResult<LoadBalancerState>> =>
    ipcRenderer.invoke('bmad:get-load-balancer-state'),

  getProfileStats: (): Promise<IpcResult<Record<OpenCodeProfile, ProfileStats>>> =>
    ipcRenderer.invoke('bmad:get-profile-stats'),

  clearRateLimit: (profile: OpenCodeProfile): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:clear-rate-limit', profile),

  enableLoadBalancing: (projectPath: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:enable-load-balancing', projectPath),

  disableLoadBalancing: (projectPath: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:disable-load-balancing', projectPath),

  isLoadBalancingEnabled: (projectPath: string): Promise<IpcResult<{ enabled: boolean }>> =>
    ipcRenderer.invoke('bmad:is-load-balancing-enabled', projectPath),

  // Interactive Mode / Chat
  initInteractiveSession: (projectPath: string): Promise<IpcResult<ChatSessionInit>> =>
    ipcRenderer.invoke('bmad:init-interactive-session', projectPath),

  sendChatMessage: (content: string, options?: { agentId?: string }): Promise<IpcResult<ChatMessage>> =>
    ipcRenderer.invoke('bmad:send-chat-message', content, options),

  cancelChatResponse: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:cancel-chat-response'),

  setActiveAgent: (agentId: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:set-active-agent', agentId),

  clearChatHistory: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:clear-chat-history'),

  saveChatSession: (): Promise<IpcResult<void>> =>
    ipcRenderer.invoke('bmad:save-chat-session'),

  loadChatSession: (sessionId: string): Promise<IpcResult<ChatSession>> =>
    ipcRenderer.invoke('bmad:load-chat-session', sessionId),

  listChatSessions: (projectPath: string): Promise<IpcResult<Array<{ id: string; createdAt: Date; messageCount: number }>>> =>
    ipcRenderer.invoke('bmad:list-chat-sessions', projectPath),

  onChatStream: (callback: (event: ChatStreamEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: ChatStreamEvent) => callback(event);
    ipcRenderer.on('bmad:chat-stream', listener);
    return () => ipcRenderer.off('bmad:chat-stream', listener);
  },

  onChatMessageComplete: (callback: (message: ChatMessage) => void) => {
    const listener = (_: Electron.IpcRendererEvent, message: ChatMessage) => callback(message);
    ipcRenderer.on('bmad:chat-message-complete', listener);
    return () => ipcRenderer.off('bmad:chat-message-complete', listener);
  },

  // Gate Check
  runGateCheck: (projectPath: string): Promise<IpcResult<GateCheckResult>> =>
    ipcRenderer.invoke('bmad:run-gate-check', projectPath),

  overrideGateCheck: (projectPath: string, override: GateCheckOverride): Promise<IpcResult<GateCheckResult>> =>
    ipcRenderer.invoke('bmad:override-gate-check', projectPath, override),

  shouldBlockPhase4: (projectPath: string): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke('bmad:should-block-phase4', projectPath),

  getBlockingReasons: (projectPath: string): Promise<IpcResult<string[]>> =>
    ipcRenderer.invoke('bmad:get-blocking-reasons', projectPath),

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

  onRateLimited: (callback: (event: RateLimitedEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: RateLimitedEvent) => callback(event);
    ipcRenderer.on('bmad:rate-limited', listener);
    return () => ipcRenderer.off('bmad:rate-limited', listener);
  },

  onExecutionCompleted: (callback: (event: ExecutionCompletedEvent) => void) => {
    const listener = (_: Electron.IpcRendererEvent, event: ExecutionCompletedEvent) => callback(event);
    ipcRenderer.on('bmad:lb-execution-completed', listener);
    return () => ipcRenderer.off('bmad:lb-execution-completed', listener);
  },
});
