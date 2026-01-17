/**
 * E2E Test Type Definitions for Electron API
 * 
 * These types mirror the actual ElectronAPI but are simplified for E2E testing.
 * They are used when evaluating code in the browser context.
 */

export interface IPCResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  autoBuildPath?: string;
  settings?: Record<string, unknown>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  projectId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type TaskStatus = 'backlog' | 'in_progress' | 'ai_review' | 'human_review' | 'done' | 'archived';

export interface TaskMetadata {
  priority?: 'low' | 'medium' | 'high';
  labels?: string[];
  linkedIssue?: {
    source: 'github' | 'gitlab' | 'linear';
    id: string | number;
    url?: string;
  };
}

export interface TerminalSession {
  id: string;
  projectPath: string;
  command?: string;
  title?: string;
  createdAt: string;
}

export interface BmadWorkflow {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface BmadWorkflowStatus {
  phase: string;
  message: string;
  progress?: number;
}

export interface ProjectEnvConfig {
  claudeOAuthToken?: string;
  claudeAuthStatus: 'authenticated' | 'token_set' | 'not_configured';
  graphitiEnabled: boolean;
  linearEnabled: boolean;
  githubEnabled: boolean;
  gitlabEnabled: boolean;
  enableFancyUi: boolean;
}

/**
 * Full ElectronAPI interface for E2E tests
 * This provides type safety when evaluating code in browser context
 */
export interface E2EElectronAPI {
  // Project operations
  addProject: (path: string) => Promise<IPCResult<Project>>;
  removeProject: (projectId: string) => Promise<IPCResult<void>>;
  getProjects: () => Promise<IPCResult<Project[]>>;
  initializeProject: (projectId: string) => Promise<IPCResult<{ success: boolean }>>;
  checkProjectVersion: (projectId: string) => Promise<IPCResult<{ isInitialized: boolean; updateAvailable: boolean }>>;
  
  // Task operations
  getTasks: (projectId: string) => Promise<IPCResult<Task[]>>;
  createTask: (projectId: string, title: string, description: string, metadata?: TaskMetadata) => Promise<IPCResult<Task>>;
  deleteTask: (taskId: string) => Promise<IPCResult<void>>;
  updateTask: (taskId: string, updates: { title?: string; description?: string }) => Promise<IPCResult<Task>>;
  startTask: (taskId: string, options?: Record<string, unknown>) => void;
  stopTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<IPCResult<void>>;
  checkTaskRunning: (taskId: string) => Promise<IPCResult<boolean>>;
  recoverStuckTask: (taskId: string, options?: Record<string, unknown>) => Promise<IPCResult<unknown>>;
  
  // Worktree operations
  getWorktreeStatus: (taskId: string) => Promise<IPCResult<unknown>>;
  getWorktreeDiff: (taskId: string) => Promise<IPCResult<unknown>>;
  mergeWorktree: (taskId: string, options?: Record<string, unknown>) => Promise<IPCResult<unknown>>;
  discardWorktree: (taskId: string, skipStatusChange?: boolean) => Promise<IPCResult<unknown>>;
  createWorktreePR: (taskId: string, options?: Record<string, unknown>) => Promise<IPCResult<unknown>>;
  
  // Terminal operations
  createTerminal: (options: { projectId: string; type?: string }) => Promise<IPCResult<{ id: string }>>;
  destroyTerminal: (id: string) => Promise<IPCResult<void>>;
  sendTerminalInput: (id: string, data: string) => void;
  getTerminalSessions: (projectPath: string) => Promise<IPCResult<TerminalSession[]>>;
  
  // BMAD operations
  bmad?: {
    listWorkflows: (projectId: string) => Promise<IPCResult<BmadWorkflow[]>>;
    runWorkflow: (projectId: string, workflowId: string) => void;
    stopWorkflow: (projectId: string, workflowId: string) => Promise<IPCResult<void>>;
    getWorkflowStatus: (projectId: string) => Promise<IPCResult<BmadWorkflowStatus>>;
  };
  
  // Environment config
  getProjectEnv?: (projectId: string) => Promise<IPCResult<ProjectEnvConfig>>;
  updateProjectEnv?: (projectId: string, config: Partial<ProjectEnvConfig>) => Promise<IPCResult<void>>;
  
  // Debug (used in some tests)
  debug?: {
    getState: () => Promise<Record<string, unknown>>;
    setState: (state: Record<string, unknown>) => Promise<void>;
  };
  
  // Event listeners (return unsubscribe functions)
  onTaskProgress?: (callback: (taskId: string, plan: unknown) => void) => () => void;
  onTaskError?: (callback: (taskId: string, error: string) => void) => () => void;
  onTaskStatusChange?: (callback: (taskId: string, status: TaskStatus) => void) => () => void;
  onTerminalOutput?: (callback: (id: string, data: string) => void) => () => void;
  onTerminalExit?: (callback: (id: string, exitCode: number) => void) => () => void;
}

// Partial project type for Zustand store operations (allows incomplete projects)
export type PartialProject = Partial<Project> & { id: string };

// E2E Window type (use with type assertion)
export interface E2EWindow extends Window {
  electronAPI: E2EElectronAPI;
  DEBUG?: boolean;
  __ZUSTAND_PROJECT_STORE__?: {
    getState: () => {
      projects: Project[];
      activeProjectId: string | null;
      addProject: (project: PartialProject) => void;
      selectProject: (id: string) => void;
      openProjectTab: (id: string) => void;
      setActiveProject: (id: string) => void;
    };
  };
  __OPENCODE_MOCK__?: Record<string, unknown>;
}

// Helper type for page.evaluate() contexts
export type E2EEvaluateContext = E2EWindow & typeof globalThis;

export {};
