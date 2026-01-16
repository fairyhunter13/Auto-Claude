/**
 * BMAD Feature Module
 * 
 * Exports all BMAD-related components, hooks, stores, and types.
 */

// Types
export * from './types';

// Stores
export { useBmadStore } from './stores/bmad-store';
export {
  useBmadProjectStore,
  initializeBmadProjectStore,
  type BmadProject,
  type BmadProjectType,
  type CreateProjectOptions,
  type BmadProjectValidation,
  type BmadSettings,
} from './stores/project-store';

// Hooks
export { useWorkflowTerminal } from './hooks/useWorkflowTerminal';
export { useWorkflowHistory } from './hooks/useWorkflowHistory';

// Components
export { WorkflowTerminal } from './components/WorkflowTerminal';
export { WorkflowTerminalPanel, StandaloneWorkflowTerminal } from './components/WorkflowTerminalPanel';
export { CreateProjectDialog } from './components/CreateProjectDialog';
export { ImportProjectDialog } from './components/ImportProjectDialog';
export { ProjectList } from './components/ProjectList';
export { ProjectSettingsDialog } from './components/ProjectSettingsDialog';
export { ProjectFileBrowser } from './components/ProjectFileBrowser';
