/**
 * Human Review Store
 * Manages human review checkpoints, decisions, and review queue
 */

import { create } from 'zustand';
import type {
  HumanReviewCheckpoint,
  HumanReviewDecision,
  ReviewStatus,
  ReviewItemType,
  ReviewAction,
  ReviewQueue,
  GateReviewCheckpoint,
  StoryReviewCheckpoint,
} from '../../shared/types';
import type { BmadPhaseId, WorkflowId, AgentId } from '../../shared/types';
import { REGRESSION_TARGETS } from '../../shared/constants';

// ============================================
// Store State Interface
// ============================================

interface HumanReviewState {
  // Review queue
  pendingReviews: HumanReviewCheckpoint[];
  completedReviews: HumanReviewCheckpoint[];
  
  // Currently active review (dialog open)
  activeReview: HumanReviewCheckpoint | null;
  
  // Loading and error states
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  
  // Actions - Queue Management
  loadReviewQueue: (projectId: string) => Promise<void>;
  addReviewCheckpoint: (checkpoint: HumanReviewCheckpoint) => void;
  removeReviewCheckpoint: (checkpointId: string) => void;
  
  // Actions - Review Dialog
  openReview: (checkpointId: string) => void;
  closeReview: () => void;
  
  // Actions - Review Decisions
  submitDecision: (checkpointId: string, decision: HumanReviewDecision) => Promise<HumanReviewCheckpoint | undefined>;
  approveReview: (checkpointId: string, feedback?: string) => Promise<HumanReviewCheckpoint | undefined>;
  requestChanges: (checkpointId: string, feedback: string, requestedChanges: string[], sendBackTo: 'in_progress' | 'ai_review') => Promise<HumanReviewCheckpoint | undefined>;
  regressReview: (checkpointId: string, targetPhase: BmadPhaseId, reason: string, workflowsToRerun?: WorkflowId[]) => Promise<HumanReviewCheckpoint | undefined>;
  
  // Actions - Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Selectors
  getPendingCount: () => number;
  getReviewsByPhase: (phase: BmadPhaseId) => HumanReviewCheckpoint[];
  getReviewsByType: (type: ReviewItemType) => HumanReviewCheckpoint[];
  hasStoryInReview: (storyId: string) => boolean;
  canRegressFrom: (checkpoint: HumanReviewCheckpoint) => BmadPhaseId[];
}

// ============================================
// Initial State
// ============================================

const initialState = {
  pendingReviews: [],
  completedReviews: [],
  activeReview: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

// ============================================
// Store Implementation
// ============================================

export const useHumanReviewStore = create<HumanReviewState>((set, get) => ({
  ...initialState,

  // ============================================
  // Queue Management Actions
  // ============================================

  loadReviewQueue: async (projectId) => {
    set({ isLoading: true, error: null });
    
    try {
      // For now, initialize empty queue - will be populated by phase store
      // In the future, this could load from persistence
      set({
        pendingReviews: [],
        completedReviews: [],
        isLoading: false,
      });
    } catch (error) {
      console.error('[HumanReviewStore] Failed to load review queue:', error);
      set({ error: 'Failed to load review queue', isLoading: false });
    }
  },

  addReviewCheckpoint: (checkpoint) => {
    set((state) => ({
      pendingReviews: [...state.pendingReviews, checkpoint],
    }));
  },

  removeReviewCheckpoint: (checkpointId) => {
    set((state) => ({
      pendingReviews: state.pendingReviews.filter((r) => r.id !== checkpointId),
    }));
  },

  // ============================================
  // Review Dialog Actions
  // ============================================

  openReview: (checkpointId) => {
    const checkpoint = get().pendingReviews.find((r) => r.id === checkpointId);
    if (checkpoint) {
      set({ activeReview: { ...checkpoint, status: 'in_review' } });
    }
  },

  closeReview: () => {
    set({ activeReview: null });
  },

  // ============================================
  // Review Decision Actions
  // ============================================

  submitDecision: async (checkpointId, decision) => {
    set({ isSubmitting: true, error: null });
    
    try {
      const checkpoint = get().pendingReviews.find((r) => r.id === checkpointId);
      if (!checkpoint) {
        throw new Error('Checkpoint not found');
      }

      // Determine new status based on decision type
      const newReviewStatus: ReviewStatus = 
        decision.type === 'approve' ? 'approved' 
        : decision.type === 'reject' ? 'rejected'
        : decision.type === 'request_changes' ? 'changes_requested'
        : 'regressed';

      // Update checkpoint with decision
      const updatedCheckpoint: HumanReviewCheckpoint = {
        ...checkpoint,
        status: newReviewStatus,
        decision,
        updatedAt: new Date().toISOString(),
      };

      // Persist decision to BMAD status file via IPC
      if (window.electronAPI?.bmad?.updateStatus && checkpoint.itemType === 'workflow') {
        const phaseName = (['', 'analysis', 'planning', 'solutioning', 'implementation'] as const)[checkpoint.phase];
        const workflowStatus = decision.type === 'approve' ? 'completed' 
          : decision.type === 'request_changes' ? 'in_progress'
          : decision.type === 'regress' ? 'pending'
          : 'completed';
        
        try {
          await window.electronAPI.bmad.updateStatus(
            checkpoint.projectId,
            phaseName,
            checkpoint.itemId,
            workflowStatus,
            {
              note: decision.feedback || `Human review: ${decision.type}`,
              result: decision.type === 'approve' ? 'approved' : decision.type,
            }
          );
          console.log('[HumanReviewStore] Persisted decision to BMAD status file');
        } catch (ipcError) {
          console.error('[HumanReviewStore] Failed to persist to IPC, continuing anyway:', ipcError);
          // Don't fail the whole operation if IPC fails - store update is more important
        }
      }

      // Move from pending to completed
      set((state) => ({
        pendingReviews: state.pendingReviews.filter((r) => r.id !== checkpointId),
        completedReviews: [...state.completedReviews, updatedCheckpoint],
        activeReview: null,
        isSubmitting: false,
      }));

      // Return the decision for the calling component to handle
      return updatedCheckpoint;
      
    } catch (error) {
      console.error('[HumanReviewStore] Failed to submit decision:', error);
      set({ error: 'Failed to submit review decision', isSubmitting: false });
      throw error;
    }
  },

  approveReview: async (checkpointId, feedback) => {
    const decision: HumanReviewDecision = {
      type: 'approve',
      decidedBy: 'user', // Will be replaced with actual user name
      decidedAt: new Date().toISOString(),
      feedback,
    };
    
    return get().submitDecision(checkpointId, decision);
  },

  requestChanges: async (checkpointId, feedback, requestedChanges, sendBackTo) => {
    const decision: HumanReviewDecision = {
      type: 'request_changes',
      decidedBy: 'user',
      decidedAt: new Date().toISOString(),
      feedback,
      requestedChanges,
      sendBackTo,
    };
    
    return get().submitDecision(checkpointId, decision);
  },

  regressReview: async (checkpointId, targetPhase, reason, workflowsToRerun) => {
    const checkpoint = get().pendingReviews.find((r) => r.id === checkpointId);
    if (!checkpoint) return undefined;

    // Validate regression target
    const validTargets = get().canRegressFrom(checkpoint);
    if (!validTargets.includes(targetPhase)) {
      set({ error: `Cannot regress to phase ${targetPhase} from this checkpoint` });
      return undefined;
    }

    const decision: HumanReviewDecision = {
      type: 'regress',
      decidedBy: 'user',
      decidedAt: new Date().toISOString(),
      feedback: reason,
      regression: {
        targetPhase,
        reason,
        workflowsToRerun,
        preserveArtifacts: true,
      },
    };
    
    return get().submitDecision(checkpointId, decision);
  },

  // ============================================
  // Utility Actions
  // ============================================

  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),

  // ============================================
  // Selectors
  // ============================================

  getPendingCount: () => get().pendingReviews.length,

  getReviewsByPhase: (phase) => 
    get().pendingReviews.filter((r) => r.phase === phase),

  getReviewsByType: (type) =>
    get().pendingReviews.filter((r) => r.itemType === type),

  hasStoryInReview: (storyId) =>
    get().pendingReviews.some((r) => r.itemType === 'story' && r.itemId === storyId),

  canRegressFrom: (checkpoint) => {
    // Get valid regression targets based on the checkpoint's phase
    return REGRESSION_TARGETS[checkpoint.phase] || [];
  },
}));

// ============================================
// Helper Functions
// ============================================

/**
 * Create a workflow review checkpoint
 */
export function createWorkflowReviewCheckpoint(
  projectId: string,
  phase: BmadPhaseId,
  workflowId: WorkflowId,
  title: string,
  completedBy: AgentId,
  artifactPath?: string
): HumanReviewCheckpoint {
  const now = new Date().toISOString();
  
  return {
    id: `review-${projectId}-${workflowId}-${Date.now()}`,
    projectId,
    itemType: 'workflow',
    itemId: workflowId,
    title,
    phase,
    status: 'pending',
    context: {
      workflowId,
      completedBy,
      completedAt: now,
    },
    artifacts: artifactPath ? [{ type: 'document', name: title, path: artifactPath }] : [],
    canRegressTo: REGRESSION_TARGETS[phase] || [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a story review checkpoint
 */
export function createStoryReviewCheckpoint(
  projectId: string,
  storyId: string,
  title: string,
  epicId: number,
  sprintNumber: number,
  assignedAgent: AgentId,
  changes?: { path: string; type: 'added' | 'modified' | 'deleted' }[]
): StoryReviewCheckpoint {
  const now = new Date().toISOString();
  
  return {
    id: `review-story-${storyId}-${Date.now()}`,
    projectId,
    itemType: 'story',
    itemId: storyId,
    title,
    phase: 4, // Stories are always in implementation phase
    status: 'pending',
    context: {
      storyId,
      completedBy: assignedAgent,
      completedAt: now,
      sprintNumber,
    },
    storyInfo: {
      storyId,
      title,
      epicId,
      sprintNumber,
      assignedAgent,
    },
    changes: changes?.map((c) => ({ ...c, additions: 0, deletions: 0 })),
    canRegressTo: [2, 3], // Can regress to Planning or Solutioning
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a gate review checkpoint
 */
export function createGateReviewCheckpoint(
  projectId: string,
  fromPhase: BmadPhaseId,
  toPhase: BmadPhaseId,
  completedWorkflows: WorkflowId[],
  checklist: { id: string; category: string; description: string; required: boolean; passed: boolean }[]
): GateReviewCheckpoint {
  const now = new Date().toISOString();
  
  return {
    id: `review-gate-${fromPhase}-to-${toPhase}-${Date.now()}`,
    projectId,
    itemType: 'gate',
    itemId: `gate-${fromPhase}-${toPhase}`,
    title: `Phase ${fromPhase} Gate Check`,
    description: `Review and approve transition from Phase ${fromPhase} to Phase ${toPhase}`,
    phase: fromPhase,
    status: 'pending',
    context: {},
    gateInfo: {
      fromPhase,
      toPhase,
      requiredWorkflows: [],
      completedWorkflows,
      blockedWorkflows: [],
    },
    checklist: checklist.map((item) => ({ ...item, autoValidated: false })),
    canRegressTo: REGRESSION_TARGETS[fromPhase] || [],
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// Utility Exports
// ============================================

export function getPendingReviewCount(): number {
  return useHumanReviewStore.getState().getPendingCount();
}

export function addWorkflowReview(
  projectId: string,
  phase: BmadPhaseId,
  workflowId: WorkflowId,
  title: string,
  completedBy: AgentId,
  artifactPath?: string
): void {
  const checkpoint = createWorkflowReviewCheckpoint(
    projectId,
    phase,
    workflowId,
    title,
    completedBy,
    artifactPath
  );
  useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
}

export function addStoryReview(
  projectId: string,
  storyId: string,
  title: string,
  epicId: number,
  sprintNumber: number,
  assignedAgent: AgentId,
  changes?: { path: string; type: 'added' | 'modified' | 'deleted' }[]
): void {
  const checkpoint = createStoryReviewCheckpoint(
    projectId,
    storyId,
    title,
    epicId,
    sprintNumber,
    assignedAgent,
    changes
  );
  useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
}
