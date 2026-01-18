/**
 * BMAD Phase Types
 * Defines the structure for BMAD methodology phases and workflows
 */

// ============================================
// Phase Definitions
// ============================================

export type BmadPhaseId = 1 | 2 | 3 | 4;

export type BmadPhaseName = 'analysis' | 'planning' | 'solutioning' | 'implementation';

export interface BmadPhase {
  id: BmadPhaseId;
  name: BmadPhaseName;
  displayName: string;
  description: string;
  required: boolean;
  icon: string;
}

// ============================================
// Workflow Definitions
// ============================================

export type WorkflowId =
  // Phase 1: Analysis
  | 'brainstorm-project'
  | 'research'
  | 'product-brief'
  // Phase 2: Planning
  | 'prd'
  | 'create-ux-design'
  // Phase 3: Solutioning
  | 'create-architecture'
  | 'create-epics-and-stories'
  | 'test-design'
  | 'implementation-readiness'
  // Phase 4: Implementation
  | 'sprint-planning'
  | 'create-story'
  | 'dev-story'
  | 'code-review';

export type WorkflowStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'blocked'
  | 'failed';

export type AgentId =
  | 'analyst'
  | 'pm'
  | 'architect'
  | 'ux-designer'
  | 'sm'
  | 'dev'
  | 'tea';

export interface WorkflowDefinition {
  id: WorkflowId;
  phase: BmadPhaseId;
  name: string;
  description: string;
  agent: AgentId;
  command: string;
  required: boolean;
  conditional?: string; // e.g., 'if_has_ui'
  outputArtifact?: string;
  humanReviewRequired: boolean;
  isGate?: boolean;
}

export interface WorkflowInstance {
  id: string; // Unique instance ID
  workflowId: WorkflowId;
  projectId: string;
  phase: BmadPhaseId;
  status: WorkflowStatus;
  agent: AgentId;
  startedAt?: string;
  completedAt?: string;
  artifactPath?: string;
  error?: string;
  humanReviewRequired: boolean;
  humanReviewStatus?: 'pending' | 'approved' | 'rejected' | 'changes_requested';
}

// ============================================
// Phase Status
// ============================================

export type PhaseStatus =
  | 'locked'        // Cannot start yet (previous phase not complete)
  | 'available'     // Can be started
  | 'in_progress'   // Currently working on this phase
  | 'review'        // Awaiting human review at gate
  | 'completed'     // Phase fully done
  | 'skipped';      // Phase was skipped (only for optional phases)

export interface PhaseInstance {
  phaseId: BmadPhaseId;
  projectId: string;
  status: PhaseStatus;
  workflows: WorkflowInstance[];
  gateStatus?: GateStatus;
  startedAt?: string;
  completedAt?: string;
  skippedAt?: string;
  skippedReason?: string;
}

// ============================================
// Gate Checkpoints
// ============================================

export type GateDecision = 'pending' | 'approved' | 'rejected' | 'regressed';

export interface GateCheckItem {
  id: string;
  description: string;
  passed: boolean;
  notes?: string;
}

export interface GateStatus {
  fromPhase: BmadPhaseId;
  toPhase: BmadPhaseId;
  status: GateDecision;
  checklist: GateCheckItem[];
  decision?: {
    type: 'approve' | 'reject' | 'regress';
    decidedBy: string;
    decidedAt: string;
    reason?: string;
    regressTo?: BmadPhaseId;
  };
}

// ============================================
// Project BMAD Status
// ============================================

export interface ProjectBmadStatus {
  projectId: string;
  currentPhase: BmadPhaseId;
  activeView: BmadPhaseId | 'current'; // For UI navigation
  phases: Record<BmadPhaseId, PhaseInstance>;
  totalProgress: {
    storiesCompleted: number;
    totalStories: number;
    epicsCompleted: number[];
    epicsRemaining: number[];
    currentSprint?: number;
  };
  lastUpdated: string;
}

// ============================================
// Sprint-specific types (Phase 4)
// ============================================

export interface SprintInfo {
  number: number;
  epicId: number;
  epicName: string;
  status: 'planning' | 'active' | 'review' | 'completed';
  stories: SprintStory[];
  startedAt?: string;
  completedAt?: string;
}

export interface SprintStory {
  id: string;
  title: string;
  status: 'backlog' | 'in_progress' | 'ai_review' | 'human_review' | 'done';
  assignedAgent?: AgentId;
  humanReviewRequired: boolean;
  humanReviewStatus?: 'pending' | 'approved' | 'changes_requested' | 'regressed';
}

// ============================================
// Phase Regression
// ============================================

export interface PhaseRegression {
  id: string;
  projectId: string;
  fromPhase: BmadPhaseId;
  toPhase: BmadPhaseId;
  reason: string;
  triggeredBy: string;
  triggeredAt: string;
  workflowsToRerun?: WorkflowId[];
  preserveArtifacts: boolean;
  status: 'pending' | 'in_progress' | 'completed';
}
