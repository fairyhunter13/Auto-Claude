/**
 * Shared constants for Auto-Build UI
 */

// Task status columns in Kanban board order
export const TASK_STATUS_COLUMNS = [
  'backlog',
  'in_progress',
  'ai_review',
  'human_review',
  'done'
] as const;

// Human-readable status labels
export const TASK_STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  ai_review: 'AI Review',
  human_review: 'Human Review',
  done: 'Done'
};

// Status colors for UI
export const TASK_STATUS_COLORS: Record<string, string> = {
  backlog: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/10 text-info',
  ai_review: 'bg-warning/10 text-warning',
  human_review: 'bg-purple-500/10 text-purple-400',
  done: 'bg-success/10 text-success'
};

// Chunk status colors
export const CHUNK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted',
  in_progress: 'bg-info',
  completed: 'bg-success',
  failed: 'bg-destructive'
};

// Default app settings
export const DEFAULT_APP_SETTINGS = {
  theme: 'system' as const,
  defaultModel: 'sonnet',
  defaultParallelism: 1,
  notifications: {
    onTaskComplete: true,
    onTaskFailed: true,
    onReviewNeeded: true,
    sound: false
  }
};

// Default project settings
export const DEFAULT_PROJECT_SETTINGS = {
  parallelEnabled: false,
  maxWorkers: 2,
  model: 'sonnet',
  memoryBackend: 'file' as const,
  linearSync: false,
  notifications: {
    onTaskComplete: true,
    onTaskFailed: true,
    onReviewNeeded: true,
    sound: false
  }
};

// IPC Channel names
export const IPC_CHANNELS = {
  // Project operations
  PROJECT_ADD: 'project:add',
  PROJECT_REMOVE: 'project:remove',
  PROJECT_LIST: 'project:list',
  PROJECT_UPDATE_SETTINGS: 'project:updateSettings',

  // Task operations
  TASK_LIST: 'task:list',
  TASK_CREATE: 'task:create',
  TASK_START: 'task:start',
  TASK_STOP: 'task:stop',
  TASK_REVIEW: 'task:review',

  // Task events (main -> renderer)
  TASK_PROGRESS: 'task:progress',
  TASK_ERROR: 'task:error',
  TASK_LOG: 'task:log',
  TASK_STATUS_CHANGE: 'task:statusChange',

  // Terminal operations
  TERMINAL_CREATE: 'terminal:create',
  TERMINAL_DESTROY: 'terminal:destroy',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_RESIZE: 'terminal:resize',
  TERMINAL_INVOKE_CLAUDE: 'terminal:invokeClaude',

  // Terminal events (main -> renderer)
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_EXIT: 'terminal:exit',
  TERMINAL_TITLE_CHANGE: 'terminal:titleChange',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SAVE: 'settings:save',

  // Dialogs
  DIALOG_SELECT_DIRECTORY: 'dialog:selectDirectory',

  // App info
  APP_VERSION: 'app:version'
} as const;

// File paths relative to project
export const AUTO_BUILD_PATHS = {
  SPECS_DIR: 'auto-build/specs',
  IMPLEMENTATION_PLAN: 'implementation_plan.json',
  SPEC_FILE: 'spec.md',
  QA_REPORT: 'qa_report.md',
  BUILD_PROGRESS: 'build-progress.txt',
  CONTEXT: 'context.json',
  REQUIREMENTS: 'requirements.json'
} as const;

// Models available for selection
export const AVAILABLE_MODELS = [
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'opus', label: 'Claude Opus' },
  { value: 'haiku', label: 'Claude Haiku' }
] as const;

// Memory backends
export const MEMORY_BACKENDS = [
  { value: 'file', label: 'File-based (default)' },
  { value: 'graphiti', label: 'Graphiti (FalkorDB)' }
] as const;
