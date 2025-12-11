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
  backlog: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ai_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  human_review: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
};

// Chunk status colors
export const CHUNK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-200 dark:bg-gray-700',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500'
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
