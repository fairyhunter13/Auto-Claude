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

// Artifact Management (Epic 6)
export { ArtifactsView } from './components/ArtifactsView';
export { MarkdownPreview } from './components/MarkdownPreview';
export { ArtifactMetadata, type ArtifactMetadataInfo } from './components/ArtifactMetadata';
export { ArtifactEditor } from './components/ArtifactEditor';
export {
  useArtifactStore,
  loadArtifacts,
  loadArtifactContent,
  saveArtifactContent,
  exportArtifact,
  copyArtifactToClipboard,
  type ArtifactFile,
  type ArtifactViewMode,
} from './stores/artifact-store';

// Interactive Mode / Chat (Epic 7)
export { ChatView } from './components/ChatView';
export { ChatMessage } from './components/ChatMessage';
export { ChatInput } from './components/ChatInput';
export {
  useChatStore,
  selectMessages,
  selectIsStreaming,
  selectActiveAgent,
  type ChatMessage as ChatMessageType,
  type ChatSession,
  type SlashCommand,
} from './stores/chat-store';

// Gate Checks (Epic 8)
export { GateCheckPanel } from './components/GateCheckPanel';
export {
  useGateCheckStore,
  selectGateCheckResult,
  selectIsGateCheckRunning,
  selectGateCheckPassed,
  type GateCheckItem,
  type GateCheckResult,
} from './stores/gate-check-store';
