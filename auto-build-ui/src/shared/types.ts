/**
 * Shared TypeScript interfaces for Auto-Build UI
 */

// Project Types
export interface Project {
  id: string;
  name: string;
  path: string;
  autoBuildPath: string;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  parallelEnabled: boolean;
  maxWorkers: number;
  model: string;
  memoryBackend: 'graphiti' | 'file';
  linearSync: boolean;
  linearTeamId?: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  onTaskComplete: boolean;
  onTaskFailed: boolean;
  onReviewNeeded: boolean;
  sound: boolean;
}

// Task Types
export type TaskStatus = 'backlog' | 'in_progress' | 'ai_review' | 'human_review' | 'done';

export type ChunkStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Chunk {
  id: string;
  title: string;
  description: string;
  status: ChunkStatus;
  files: string[];
  verification?: {
    type: 'command' | 'browser';
    run?: string;
    scenario?: string;
  };
}

export interface QAReport {
  status: 'passed' | 'failed' | 'pending';
  issues: QAIssue[];
  timestamp: Date;
}

export interface QAIssue {
  id: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  file?: string;
  line?: number;
}

export interface Task {
  id: string;
  specId: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  chunks: Chunk[];
  qaReport?: QAReport;
  logs: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Implementation Plan (from auto-build)
export interface ImplementationPlan {
  feature: string;
  workflow_type: string;
  services_involved: string[];
  phases: Phase[];
  final_acceptance: string[];
  created_at: string;
  updated_at: string;
  spec_file: string;
}

export interface Phase {
  phase: number;
  name: string;
  type: string;
  chunks: PlanChunk[];
  depends_on?: number[];
}

export interface PlanChunk {
  id: string;
  description: string;
  status: ChunkStatus;
  verification?: {
    type: string;
    run?: string;
    scenario?: string;
  };
}

// IPC Types
export interface IPCResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TaskStartOptions {
  parallel?: boolean;
  workers?: number;
  model?: string;
}

export interface TaskProgressUpdate {
  taskId: string;
  plan: ImplementationPlan;
  currentChunk?: string;
}

// App Settings
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultModel: string;
  defaultParallelism: number;
  pythonPath?: string;
  autoBuildPath?: string;
  notifications: NotificationSettings;
}

// Electron API exposed via contextBridge
export interface ElectronAPI {
  // Project operations
  addProject: (projectPath: string) => Promise<IPCResult<Project>>;
  removeProject: (projectId: string) => Promise<IPCResult>;
  getProjects: () => Promise<IPCResult<Project[]>>;
  updateProjectSettings: (projectId: string, settings: Partial<ProjectSettings>) => Promise<IPCResult>;

  // Task operations
  getTasks: (projectId: string) => Promise<IPCResult<Task[]>>;
  createTask: (projectId: string, title: string, description: string) => Promise<IPCResult<Task>>;
  startTask: (taskId: string, options?: TaskStartOptions) => void;
  stopTask: (taskId: string) => void;
  submitReview: (taskId: string, approved: boolean, feedback?: string) => Promise<IPCResult>;

  // Event listeners
  onTaskProgress: (callback: (taskId: string, plan: ImplementationPlan) => void) => () => void;
  onTaskError: (callback: (taskId: string, error: string) => void) => () => void;
  onTaskLog: (callback: (taskId: string, log: string) => void) => () => void;
  onTaskStatusChange: (callback: (taskId: string, status: TaskStatus) => void) => () => void;

  // App settings
  getSettings: () => Promise<IPCResult<AppSettings>>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<IPCResult>;

  // Dialog operations
  selectDirectory: () => Promise<string | null>;

  // App info
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
