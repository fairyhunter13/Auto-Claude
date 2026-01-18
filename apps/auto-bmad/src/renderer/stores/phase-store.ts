/**
 * BMAD Phase Store
 * Manages BMAD methodology phase state, workflow tracking, and navigation
 */

import { create } from 'zustand';
import type {
  BmadPhaseId,
  PhaseStatus,
  PhaseInstance,
  WorkflowInstance,
  WorkflowId,
  WorkflowStatus,
  ProjectBmadStatus,
  SprintInfo,
  GateStatus,
  PhaseRegression,
} from '../../shared/types';
import {
  BMAD_PHASES,
  BMAD_PHASE_IDS,
  PHASE_WORKFLOWS,
  BMAD_WORKFLOWS,
  REGRESSION_TARGETS,
} from '../../shared/constants';

// ============================================
// Store State Interface
// ============================================

interface PhaseState {
  // Current project's BMAD status
  projectId: string | null;
  currentPhase: BmadPhaseId;
  activeView: BmadPhaseId | 'current';
  phases: Record<BmadPhaseId, PhaseInstance>;
  
  // Sprint info for Phase 4
  currentSprint: SprintInfo | null;
  sprintHistory: SprintInfo[];
  
  // Progress tracking
  totalProgress: {
    storiesCompleted: number;
    totalStories: number;
    epicsCompleted: number[];
    epicsRemaining: number[];
  };
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Regression tracking
  activeRegression: PhaseRegression | null;
  
  // Actions - Navigation
  setActiveView: (view: BmadPhaseId | 'current') => void;
  
  // Actions - Phase Management
  loadProjectPhases: (projectId: string) => Promise<void>;
  initializePhases: (projectId: string) => void;
  updatePhaseStatus: (phaseId: BmadPhaseId, status: PhaseStatus) => void;
  skipPhase: (phaseId: BmadPhaseId, reason?: string) => void;
  
  // Actions - Workflow Management
  startWorkflow: (phaseId: BmadPhaseId, workflowId: WorkflowId) => void;
  completeWorkflow: (workflowId: WorkflowId, artifactPath?: string) => void;
  failWorkflow: (workflowId: WorkflowId, error: string) => void;
  skipWorkflow: (workflowId: WorkflowId) => void;
  
  // Actions - Gate Management
  updateGateStatus: (fromPhase: BmadPhaseId, gateStatus: GateStatus) => void;
  approveGate: (fromPhase: BmadPhaseId, decidedBy: string) => void;
  rejectGate: (fromPhase: BmadPhaseId, reason: string, decidedBy: string) => void;
  
  // Actions - Regression
  initiateRegression: (fromPhase: BmadPhaseId, toPhase: BmadPhaseId, reason: string, triggeredBy: string) => void;
  completeRegression: () => void;
  cancelRegression: () => void;
  
  // Actions - Sprint Management
  setCurrentSprint: (sprint: SprintInfo) => void;
  updateSprintStory: (storyId: string, updates: Partial<SprintInfo['stories'][0]>) => void;
  
  // Actions - Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Selectors
  getPhase: (phaseId: BmadPhaseId) => PhaseInstance | undefined;
  getWorkflow: (workflowId: WorkflowId) => WorkflowInstance | undefined;
  getPhaseProgress: (phaseId: BmadPhaseId) => { completed: number; total: number; percentage: number };
  canStartPhase: (phaseId: BmadPhaseId) => boolean;
  canRegressTo: (targetPhase: BmadPhaseId) => boolean;
  getPendingReviews: () => WorkflowInstance[];
}

// ============================================
// Helper Functions for BMAD Status Transformation
// ============================================

type BmadPhaseName = 'analysis' | 'planning' | 'solutioning' | 'implementation';

interface BmadWorkflowEntry {
  status: string;
  completed_at?: string;
  artifact_path?: string;
  note?: string;
}

interface BmadPhaseStatus {
  status: string;
  workflows: Record<string, BmadWorkflowEntry>;
}

interface BmadWorkflowStatus {
  current_phase: BmadPhaseName;
  phases: Partial<Record<BmadPhaseName, BmadPhaseStatus>>;
}

function phaseNameToId(phaseName: BmadPhaseName): BmadPhaseId {
  const mapping: Record<BmadPhaseName, BmadPhaseId> = {
    analysis: 1,
    planning: 2,
    solutioning: 3,
    implementation: 4,
  };
  return mapping[phaseName] || 1;
}

function bmadStatusToWorkflowStatus(status: string): WorkflowStatus {
  const mapping: Record<string, WorkflowStatus> = {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    skipped: 'skipped',
    blocked: 'blocked',
    failed: 'failed',
  };
  return mapping[status] || 'pending';
}

function bmadStatusToPhaseStatus(status: string): PhaseStatus {
  const mapping: Record<string, PhaseStatus> = {
    pending: 'locked',
    in_progress: 'in_progress',
    completed: 'completed',
    skipped: 'skipped',
  };
  return mapping[status] || 'locked';
}

function transformBmadStatusToPhases(
  projectId: string,
  bmadStatus: BmadWorkflowStatus
): Record<BmadPhaseId, PhaseInstance> {
  const phases: Record<BmadPhaseId, PhaseInstance> = {} as Record<BmadPhaseId, PhaseInstance>;
  const currentPhaseId = phaseNameToId(bmadStatus.current_phase);

  for (const phaseId of BMAD_PHASE_IDS) {
    const phaseName = BMAD_PHASES[phaseId].name as BmadPhaseName;
    const bmadPhase = bmadStatus.phases[phaseName];
    const workflowIds = PHASE_WORKFLOWS[phaseId];

    // Determine phase status
    let phaseStatus: PhaseStatus;
    if (bmadPhase) {
      phaseStatus = bmadStatusToPhaseStatus(bmadPhase.status);
    } else if (phaseId < currentPhaseId) {
      phaseStatus = 'completed';
    } else if (phaseId === currentPhaseId) {
      phaseStatus = 'in_progress';
    } else if (phaseId === currentPhaseId + 1) {
      phaseStatus = 'available';
    } else {
      phaseStatus = 'locked';
    }

    // Transform workflows
    const workflows: WorkflowInstance[] = workflowIds.map((wfId) => {
      const bmadWorkflow = bmadPhase?.workflows?.[wfId];
      const wfDef = BMAD_WORKFLOWS[wfId];

      return {
        id: `${projectId}-${wfId}`,
        workflowId: wfId,
        projectId,
        phase: phaseId,
        status: bmadWorkflow ? bmadStatusToWorkflowStatus(bmadWorkflow.status) : 'pending',
        agent: wfDef.agent,
        completedAt: bmadWorkflow?.completed_at,
        artifactPath: bmadWorkflow?.artifact_path,
        humanReviewRequired: wfDef.humanReviewRequired,
      };
    });

    phases[phaseId] = {
      phaseId,
      projectId,
      status: phaseStatus,
      workflows,
    };
  }

  return phases;
}

// ============================================
// Initial State
// ============================================

const createInitialPhases = (projectId: string): Record<BmadPhaseId, PhaseInstance> => {
  const phases: Record<BmadPhaseId, PhaseInstance> = {} as Record<BmadPhaseId, PhaseInstance>;
  
  for (const phaseId of BMAD_PHASE_IDS) {
    const workflowIds = PHASE_WORKFLOWS[phaseId];
    const workflows: WorkflowInstance[] = workflowIds.map((wfId) => ({
      id: `${projectId}-${wfId}`,
      workflowId: wfId,
      projectId,
      phase: phaseId,
      status: 'pending' as WorkflowStatus,
      agent: BMAD_WORKFLOWS[wfId].agent,
      humanReviewRequired: BMAD_WORKFLOWS[wfId].humanReviewRequired,
    }));
    
    phases[phaseId] = {
      phaseId,
      projectId,
      status: phaseId === 1 ? 'available' : 'locked',
      workflows,
    };
  }
  
  return phases;
};

const initialState = {
  projectId: null,
  currentPhase: 1 as BmadPhaseId,
  activeView: 'current' as BmadPhaseId | 'current',
  phases: {} as Record<BmadPhaseId, PhaseInstance>,
  currentSprint: null,
  sprintHistory: [],
  totalProgress: {
    storiesCompleted: 0,
    totalStories: 0,
    epicsCompleted: [],
    epicsRemaining: [],
  },
  isLoading: false,
  error: null,
  activeRegression: null,
};

// ============================================
// Store Implementation
// ============================================

export const usePhaseStore = create<PhaseState>((set, get) => ({
  ...initialState,

  // ============================================
  // Navigation Actions
  // ============================================

  setActiveView: (view) => {
    set({ activeView: view });
  },

  // ============================================
  // Phase Management Actions
  // ============================================

  loadProjectPhases: async (projectPath) => {
    set({ isLoading: true, error: null });
    
    try {
      // Try to load existing phase status from IPC using existing bmad.getStatus
      if (window.electronAPI?.bmad?.getStatus) {
        const result = await window.electronAPI.bmad.getStatus(projectPath);
        
        if (result?.success && result.data) {
          // Transform BmadWorkflowStatus to our PhaseInstance format
          const bmadStatus = result.data;
          const transformedPhases = transformBmadStatusToPhases(projectPath, bmadStatus);
          const currentPhaseId = phaseNameToId(bmadStatus.current_phase);
          
          set({
            projectId: projectPath,
            currentPhase: currentPhaseId,
            phases: transformedPhases,
            totalProgress: {
              storiesCompleted: 0,
              totalStories: 0,
              epicsCompleted: [],
              epicsRemaining: [],
            },
            currentSprint: null,
            isLoading: false,
          });
          return;
        }
      }
      
      // Initialize new phases if none exist or IPC not available
      get().initializePhases(projectPath);
    } catch (error) {
      console.error('[PhaseStore] Failed to load phases:', error);
      // Initialize new phases on error
      get().initializePhases(projectPath);
    }
  },

  initializePhases: (projectId) => {
    const phases = createInitialPhases(projectId);
    set({
      projectId,
      currentPhase: 1,
      activeView: 'current',
      phases,
      isLoading: false,
      error: null,
    });
  },

  updatePhaseStatus: (phaseId, status) => {
    set((state) => {
      const phase = state.phases[phaseId];
      if (!phase) return state;

      const updatedPhase: PhaseInstance = {
        ...phase,
        status,
        startedAt: status === 'in_progress' && !phase.startedAt ? new Date().toISOString() : phase.startedAt,
        completedAt: status === 'completed' ? new Date().toISOString() : phase.completedAt,
      };

      // If completing a phase, unlock the next one
      let updatedPhases = { ...state.phases, [phaseId]: updatedPhase };
      
      if (status === 'completed' && phaseId < 4) {
        const nextPhaseId = (phaseId + 1) as BmadPhaseId;
        const nextPhase = state.phases[nextPhaseId];
        if (nextPhase && nextPhase.status === 'locked') {
          updatedPhases[nextPhaseId] = { ...nextPhase, status: 'available' };
        }
      }

      // Update current phase if needed
      let newCurrentPhase = state.currentPhase;
      if (status === 'completed' && phaseId === state.currentPhase && phaseId < 4) {
        newCurrentPhase = (phaseId + 1) as BmadPhaseId;
      }

      return {
        phases: updatedPhases,
        currentPhase: newCurrentPhase,
      };
    });
  },

  skipPhase: (phaseId, reason) => {
    const phase = get().phases[phaseId];
    if (!phase || !BMAD_PHASES[phaseId].required === false) return;

    set((state) => {
      const updatedPhase: PhaseInstance = {
        ...phase,
        status: 'skipped',
        skippedAt: new Date().toISOString(),
        skippedReason: reason,
      };

      // Unlock next phase
      let updatedPhases = { ...state.phases, [phaseId]: updatedPhase };
      
      if (phaseId < 4) {
        const nextPhaseId = (phaseId + 1) as BmadPhaseId;
        const nextPhase = state.phases[nextPhaseId];
        if (nextPhase && nextPhase.status === 'locked') {
          updatedPhases[nextPhaseId] = { ...nextPhase, status: 'available' };
        }
      }

      return {
        phases: updatedPhases,
        currentPhase: phaseId < 4 ? ((phaseId + 1) as BmadPhaseId) : state.currentPhase,
      };
    });
  },

  // ============================================
  // Workflow Management Actions
  // ============================================

  startWorkflow: (phaseId, workflowId) => {
    set((state) => {
      const phase = state.phases[phaseId];
      if (!phase) return state;

      const workflows = phase.workflows.map((wf) =>
        wf.workflowId === workflowId
          ? { ...wf, status: 'in_progress' as WorkflowStatus, startedAt: new Date().toISOString() }
          : wf
      );

      // Also update phase status to in_progress if not already
      const phaseStatus = phase.status === 'available' ? 'in_progress' : phase.status;

      return {
        phases: {
          ...state.phases,
          [phaseId]: {
            ...phase,
            status: phaseStatus,
            workflows,
            startedAt: phase.startedAt || new Date().toISOString(),
          },
        },
      };
    });
  },

  completeWorkflow: (workflowId, artifactPath) => {
    set((state) => {
      // Find which phase this workflow belongs to
      const workflow = BMAD_WORKFLOWS[workflowId];
      if (!workflow) return state;

      const phaseId = workflow.phase;
      const phase = state.phases[phaseId];
      if (!phase) return state;

      const workflows = phase.workflows.map((wf) =>
        wf.workflowId === workflowId
          ? {
              ...wf,
              status: 'completed' as WorkflowStatus,
              completedAt: new Date().toISOString(),
              artifactPath,
              humanReviewStatus: wf.humanReviewRequired ? 'pending' as const : undefined,
            }
          : wf
      );

      // Check if all required workflows are complete
      const allRequiredComplete = workflows.every((wf) => {
        const wfDef = BMAD_WORKFLOWS[wf.workflowId];
        if (!wfDef.required) return true;
        return wf.status === 'completed' || wf.status === 'skipped';
      });

      // If all required complete, set phase to review (awaiting gate approval)
      const newPhaseStatus = allRequiredComplete && phase.status === 'in_progress' ? 'review' : phase.status;

      return {
        phases: {
          ...state.phases,
          [phaseId]: {
            ...phase,
            status: newPhaseStatus as PhaseStatus,
            workflows,
          },
        },
      };
    });
  },

  failWorkflow: (workflowId, error) => {
    set((state) => {
      const workflow = BMAD_WORKFLOWS[workflowId];
      if (!workflow) return state;

      const phaseId = workflow.phase;
      const phase = state.phases[phaseId];
      if (!phase) return state;

      const workflows = phase.workflows.map((wf) =>
        wf.workflowId === workflowId
          ? { ...wf, status: 'failed' as WorkflowStatus, error }
          : wf
      );

      return {
        phases: {
          ...state.phases,
          [phaseId]: { ...phase, workflows },
        },
      };
    });
  },

  skipWorkflow: (workflowId) => {
    set((state) => {
      const workflow = BMAD_WORKFLOWS[workflowId];
      if (!workflow || workflow.required) return state; // Can't skip required workflows

      const phaseId = workflow.phase;
      const phase = state.phases[phaseId];
      if (!phase) return state;

      const workflows = phase.workflows.map((wf) =>
        wf.workflowId === workflowId
          ? { ...wf, status: 'skipped' as WorkflowStatus }
          : wf
      );

      return {
        phases: {
          ...state.phases,
          [phaseId]: { ...phase, workflows },
        },
      };
    });
  },

  // ============================================
  // Gate Management Actions
  // ============================================

  updateGateStatus: (fromPhase, gateStatus) => {
    set((state) => {
      const phase = state.phases[fromPhase];
      if (!phase) return state;

      return {
        phases: {
          ...state.phases,
          [fromPhase]: { ...phase, gateStatus },
        },
      };
    });
  },

  approveGate: (fromPhase, decidedBy) => {
    const phase = get().phases[fromPhase];
    if (!phase) return;

    const gateStatus: GateStatus = {
      fromPhase,
      toPhase: (fromPhase + 1) as BmadPhaseId,
      status: 'approved',
      checklist: phase.gateStatus?.checklist || [],
      decision: {
        type: 'approve',
        decidedBy,
        decidedAt: new Date().toISOString(),
      },
    };

    get().updateGateStatus(fromPhase, gateStatus);
    get().updatePhaseStatus(fromPhase, 'completed');
  },

  rejectGate: (fromPhase, reason, decidedBy) => {
    const phase = get().phases[fromPhase];
    if (!phase) return;

    const gateStatus: GateStatus = {
      fromPhase,
      toPhase: (fromPhase + 1) as BmadPhaseId,
      status: 'rejected',
      checklist: phase.gateStatus?.checklist || [],
      decision: {
        type: 'reject',
        decidedBy,
        decidedAt: new Date().toISOString(),
        reason,
      },
    };

    get().updateGateStatus(fromPhase, gateStatus);
    // Phase stays in 'review' status, workflows may need to be redone
  },

  // ============================================
  // Regression Actions
  // ============================================

  initiateRegression: (fromPhase, toPhase, reason, triggeredBy) => {
    if (!get().canRegressTo(toPhase)) return;

    const regression: PhaseRegression = {
      id: `regression-${Date.now()}`,
      projectId: get().projectId || '',
      fromPhase,
      toPhase,
      reason,
      triggeredBy,
      triggeredAt: new Date().toISOString(),
      preserveArtifacts: true,
      status: 'pending',
    };

    set({ activeRegression: regression });

    // Reset phases between toPhase and fromPhase
    set((state) => {
      const updatedPhases = { ...state.phases };
      
      for (let i = toPhase; i <= fromPhase; i++) {
        const phaseId = i as BmadPhaseId;
        const phase = updatedPhases[phaseId];
        if (phase) {
          // Reset workflows to pending (but keep artifact paths)
          const workflows = phase.workflows.map((wf) => ({
            ...wf,
            status: 'pending' as WorkflowStatus,
            humanReviewStatus: undefined,
            error: undefined,
          }));

          updatedPhases[phaseId] = {
            ...phase,
            status: i === toPhase ? 'in_progress' : 'locked',
            workflows,
            gateStatus: undefined,
            completedAt: undefined,
          };
        }
      }

      return {
        phases: updatedPhases,
        currentPhase: toPhase,
        activeView: 'current',
      };
    });
  },

  completeRegression: () => {
    set((state) => ({
      activeRegression: state.activeRegression
        ? { ...state.activeRegression, status: 'completed' }
        : null,
    }));
    
    // Clear after a brief delay
    setTimeout(() => set({ activeRegression: null }), 1000);
  },

  cancelRegression: () => {
    set({ activeRegression: null });
  },

  // ============================================
  // Sprint Management Actions
  // ============================================

  setCurrentSprint: (sprint) => {
    set({ currentSprint: sprint });
  },

  updateSprintStory: (storyId, updates) => {
    set((state) => {
      if (!state.currentSprint) return state;

      const stories = state.currentSprint.stories.map((story) =>
        story.id === storyId ? { ...story, ...updates } : story
      );

      return {
        currentSprint: { ...state.currentSprint, stories },
      };
    });
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

  getPhase: (phaseId) => get().phases[phaseId],

  getWorkflow: (workflowId) => {
    const phases = get().phases;
    for (const phaseId of BMAD_PHASE_IDS) {
      const phase = phases[phaseId];
      if (phase) {
        const workflow = phase.workflows.find((wf) => wf.workflowId === workflowId);
        if (workflow) return workflow;
      }
    }
    return undefined;
  },

  getPhaseProgress: (phaseId) => {
    const phase = get().phases[phaseId];
    if (!phase) return { completed: 0, total: 0, percentage: 0 };

    const total = phase.workflows.length;
    const completed = phase.workflows.filter(
      (wf) => wf.status === 'completed' || wf.status === 'skipped'
    ).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  },

  canStartPhase: (phaseId) => {
    const phase = get().phases[phaseId];
    if (!phase) return false;
    return phase.status === 'available' || phase.status === 'in_progress';
  },

  canRegressTo: (targetPhase) => {
    const currentPhase = get().currentPhase;
    const validTargets = REGRESSION_TARGETS[currentPhase];
    return validTargets.includes(targetPhase);
  },

  getPendingReviews: () => {
    const phases = get().phases;
    const pending: WorkflowInstance[] = [];

    for (const phaseId of BMAD_PHASE_IDS) {
      const phase = phases[phaseId];
      if (phase) {
        phase.workflows.forEach((wf) => {
          if (wf.humanReviewRequired && wf.status === 'completed' && wf.humanReviewStatus === 'pending') {
            pending.push(wf);
          }
        });
      }
    }

    return pending;
  },
}));

// ============================================
// Utility Functions (for IPC handlers)
// ============================================

export async function loadProjectPhases(projectPath: string): Promise<void> {
  return usePhaseStore.getState().loadProjectPhases(projectPath);
}

export function getPhaseStatus(phaseId: BmadPhaseId): PhaseInstance | undefined {
  return usePhaseStore.getState().getPhase(phaseId);
}

export function getCurrentPhase(): BmadPhaseId {
  return usePhaseStore.getState().currentPhase;
}
