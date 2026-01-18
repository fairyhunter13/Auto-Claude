/**
 * Human Review Types
 * Defines the structure for human review checkpoints and decisions
 */

import type { BmadPhaseId, WorkflowId, AgentId } from './bmad-phase';

// ============================================
// Review Item Types
// ============================================

export type ReviewItemType = 'workflow' | 'story' | 'gate' | 'sprint';

export type ReviewStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'regressed';

// ============================================
// Human Review Checkpoint
// ============================================

export interface HumanReviewCheckpoint {
  id: string;
  projectId: string;
  itemType: ReviewItemType;
  itemId: string;
  title: string;
  description?: string;
  phase: BmadPhaseId;
  status: ReviewStatus;
  
  // Context for the review
  context: {
    workflowId?: WorkflowId;
    storyId?: string;
    sprintNumber?: number;
    completedBy?: AgentId;
    completedAt?: string;
  };
  
  // What was produced
  artifacts?: ReviewArtifact[];
  
  // Acceptance criteria (for stories)
  acceptanceCriteria?: AcceptanceCriterion[];
  
  // Changes made (for code reviews)
  changes?: FileChange[];
  
  // Valid regression targets
  canRegressTo: BmadPhaseId[];
  
  // Review decision
  decision?: HumanReviewDecision;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Review Artifacts
// ============================================

export interface ReviewArtifact {
  type: 'document' | 'code' | 'test' | 'diagram';
  name: string;
  path: string;
  description?: string;
}

export interface AcceptanceCriterion {
  id: string;
  description: string;
  met: boolean;
  notes?: string;
}

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  additions?: number;
  deletions?: number;
}

// ============================================
// Human Review Decision
// ============================================

export type DecisionType = 'approve' | 'request_changes' | 'reject' | 'regress';

export interface HumanReviewDecision {
  type: DecisionType;
  decidedBy: string;
  decidedAt: string;
  feedback?: string;
  
  // For request_changes
  requestedChanges?: string[];
  sendBackTo?: 'in_progress' | 'ai_review';
  
  // For regress
  regression?: {
    targetPhase: BmadPhaseId;
    reason: string;
    workflowsToRerun?: WorkflowId[];
    preserveArtifacts: boolean;
  };
}

// ============================================
// Review Queue
// ============================================

export interface ReviewQueue {
  projectId: string;
  pending: HumanReviewCheckpoint[];
  completed: HumanReviewCheckpoint[];
  totalPending: number;
  totalCompleted: number;
}

// ============================================
// Gate Review (Phase Transition)
// ============================================

export interface GateReviewCheckpoint extends HumanReviewCheckpoint {
  itemType: 'gate';
  gateInfo: {
    fromPhase: BmadPhaseId;
    toPhase: BmadPhaseId;
    requiredWorkflows: WorkflowId[];
    completedWorkflows: WorkflowId[];
    blockedWorkflows: WorkflowId[];
  };
  checklist: GateChecklistItem[];
}

export interface GateChecklistItem {
  id: string;
  category: string;
  description: string;
  required: boolean;
  passed: boolean;
  autoValidated: boolean;
  notes?: string;
}

// ============================================
// Story Review (Sprint Item)
// ============================================

export interface StoryReviewCheckpoint extends HumanReviewCheckpoint {
  itemType: 'story';
  storyInfo: {
    storyId: string;
    title: string;
    epicId: number;
    sprintNumber: number;
    assignedAgent: AgentId;
    estimatedPoints?: number;
  };
}

// ============================================
// Review Actions (for IPC)
// ============================================

export interface ApproveReviewAction {
  type: 'approve';
  checkpointId: string;
  feedback?: string;
}

export interface RequestChangesAction {
  type: 'request_changes';
  checkpointId: string;
  feedback: string;
  requestedChanges: string[];
  sendBackTo: 'in_progress' | 'ai_review';
}

export interface RegressAction {
  type: 'regress';
  checkpointId: string;
  targetPhase: BmadPhaseId;
  reason: string;
  workflowsToRerun?: WorkflowId[];
  preserveArtifacts: boolean;
}

export type ReviewAction = ApproveReviewAction | RequestChangesAction | RegressAction;

// ============================================
// Review Notification
// ============================================

export interface ReviewNotification {
  id: string;
  checkpointId: string;
  projectId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'action_required';
  read: boolean;
  createdAt: string;
}
