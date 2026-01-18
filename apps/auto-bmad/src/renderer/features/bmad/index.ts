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
export {
  usePhaseStore,
  initializePhaseStoreListeners,
  type PhaseInfo,
  type WorkflowInfo,
} from './stores/phase-store';

// Hooks
export { useWorkflowTerminal } from './hooks/useWorkflowTerminal';
export { useWorkflowHistory } from './hooks/useWorkflowHistory';

// Agent Store
export {
  useAgentStore,
  syncActiveAgentWithWorkflow,
  type AgentModule,
} from './stores/agent-store';

// Components
export { WorkflowTerminal } from './components/WorkflowTerminal';
export { WorkflowTerminalPanel, StandaloneWorkflowTerminal } from './components/WorkflowTerminalPanel';
export { CreateProjectDialog } from './components/CreateProjectDialog';
export { ImportProjectDialog } from './components/ImportProjectDialog';
export { ProjectList } from './components/ProjectList';
export { ProjectSettingsDialog } from './components/ProjectSettingsDialog';
export { ProjectFileBrowser } from './components/ProjectFileBrowser';
export { PhaseDashboard } from './components/PhaseDashboard';
export { PhaseDetail } from './components/PhaseDetail';
export { WorkflowExecutionPanel } from './components/WorkflowExecutionPanel';
export { WorkflowList } from './components/WorkflowList';
export { WorkflowRunner } from './components/WorkflowRunner';

// Agent Components (Epic 5)
export { AgentRoster } from './components/AgentRoster';
export { AgentCard } from './components/AgentCard';
export { AgentDetailsPanel } from './components/AgentDetailsPanel';

// Target & Language Components (New)
export {
  TargetSelector,
  TargetBadge,
  getTargetInfo,
  getTargetsByPhase,
  getRequiredTargets,
  type BmadTarget,
} from './components/TargetSelector';

export {
  LanguageDetectionBadge,
  LanguageBadge,
  PolyglotSummary,
  type DetectedLanguage,
  type LanguageDetectionResult,
  type ConfidenceLevel,
  type ResolutionTier,
} from './components/LanguageDetectionBadge';

export {
  ArtifactDashboard,
  ArtifactSummary,
  createMockArtifacts,
  type Artifact,
  type ArtifactStatus,
  type ArtifactGroup,
} from './components/ArtifactDashboard';
