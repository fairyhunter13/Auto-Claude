/**
 * BMAD Phase Store
 * 
 * Zustand store for phase dashboard state and navigation.
 * Tracks workflow status and provides phase management actions.
 */

import { create } from 'zustand';
import type {
  BmadPhase,
  BmadWorkflowStatus,
  WorkflowStatusValue,
  PhaseStatus,
  WorkflowEntry,
  WorkflowDefinition,
} from '../types';
import { PHASE_METADATA, BMAD_PHASES } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PhaseInfo {
  id: BmadPhase;
  name: string;
  description: string;
  optional: boolean;
  status: WorkflowStatusValue;
  completedWorkflows: number;
  totalWorkflows: number;
  completedAt?: string;
}

export interface WorkflowInfo extends WorkflowDefinition {
  status: WorkflowStatusValue;
  completedAt?: string;
  artifactPath?: string;
  note?: string;
  isBlocked: boolean;
  blockedBy: string[];
}

export interface PhaseStoreState {
  // Project context
  projectPath: string | null;
  
  // Status data
  workflowStatus: BmadWorkflowStatus | null;
  isLoading: boolean;
  error: string | null;

  // Navigation state
  expandedPhase: BmadPhase | null;
  selectedWorkflow: string | null;

  // Actions
  setProjectPath: (path: string | null) => void;
  loadStatus: (projectPath: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
  
  // Phase navigation
  expandPhase: (phase: BmadPhase | null) => void;
  selectWorkflow: (workflowId: string | null) => void;
  
  // Phase operations
  resetPhase: (phase: BmadPhase) => Promise<boolean>;
  canAdvanceToPhase: (phase: BmadPhase) => { allowed: boolean; blockers: string[] };
  
  // Workflow operations
  updateWorkflowStatus: (
    phase: BmadPhase,
    workflowId: string,
    status: WorkflowStatusValue,
    options?: { artifactPath?: string; note?: string }
  ) => Promise<boolean>;

  // Selectors
  getPhases: () => PhaseInfo[];
  getCurrentPhase: () => BmadPhase | null;
  getPhaseWorkflows: (phase: BmadPhase) => WorkflowInfo[];
  getRecommendedWorkflow: () => { phase: BmadPhase; workflow: WorkflowInfo } | null;
  isPhaseComplete: (phase: BmadPhase) => boolean;
  isPhaseBlocked: (phase: BmadPhase) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Definitions (matching main process types.ts)
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  // Phase 1: Analysis
  { id: 'brainstorm-project', name: 'Brainstorm Project', description: 'Ideation and brainstorming', phase: 'analysis', agent: 'analyst', command: '/bmad:bmm:workflows:brainstorming', optional: true },
  { id: 'research', name: 'Research', description: 'Market and technical research', phase: 'analysis', agent: 'analyst', command: '/bmad:bmm:workflows:research', optional: true },
  { id: 'product-brief', name: 'Create Product Brief', description: 'High-level product concept', phase: 'analysis', agent: 'analyst', command: '/bmad:bmm:workflows:create-product-brief', outputFile: 'product-brief.md', optional: true },
  
  // Phase 2: Planning
  { id: 'prd', name: 'Create PRD', description: 'Product Requirements Document', phase: 'planning', agent: 'pm', command: '/bmad:bmm:workflows:create-prd', outputFile: 'prd.md', optional: false },
  { id: 'ux-design', name: 'Create UX Design', description: 'UX design document', phase: 'planning', agent: 'ux-designer', command: '/bmad:bmm:workflows:create-ux-design', outputFile: 'ux-design.md', optional: true },
  
  // Phase 3: Solutioning
  { id: 'architecture', name: 'Create Architecture', description: 'System architecture', phase: 'solutioning', agent: 'architect', command: '/bmad:bmm:workflows:create-architecture', outputFile: 'architecture.md', optional: false, dependsOn: ['prd'] },
  { id: 'epics', name: 'Create Epics & Stories', description: 'Epic breakdown', phase: 'solutioning', agent: 'pm', command: '/bmad:bmm:workflows:create-epics-and-stories', outputFile: 'epics.md', optional: false, dependsOn: ['prd', 'architecture'] },
  { id: 'test-design', name: 'Test Design', description: 'Test strategy', phase: 'solutioning', agent: 'tea', command: '/bmad:bmm:workflows:test-design', outputFile: 'test-design.md', optional: true },
  { id: 'implementation-readiness', name: 'Implementation Readiness', description: 'Gate check', phase: 'solutioning', agent: 'architect', command: '/bmad:bmm:workflows:implementation-readiness', outputFile: 'implementation-readiness-report.md', optional: false, dependsOn: ['prd', 'architecture', 'epics'] },
  
  // Phase 4: Implementation
  { id: 'sprint-planning', name: 'Sprint Planning', description: 'Plan current sprint', phase: 'implementation', agent: 'sm', command: '/bmad:bmm:workflows:sprint-planning', outputFile: 'sprint-status.yaml', optional: false, dependsOn: ['epics'] },
  { id: 'create-story', name: 'Create Story', description: 'Detailed story spec', phase: 'implementation', agent: 'sm', command: '/bmad:bmm:workflows:create-story', optional: false, dependsOn: ['sprint-planning'] },
  { id: 'dev-story', name: 'Dev Story', description: 'Implement story', phase: 'implementation', agent: 'dev', command: '/bmad:bmm:workflows:dev-story', optional: false, dependsOn: ['create-story'] },
  { id: 'code-review', name: 'Code Review', description: 'Review code', phase: 'implementation', agent: 'dev', command: '/bmad:bmm:workflows:code-review', optional: false, dependsOn: ['dev-story'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const usePhaseStore = create<PhaseStoreState>((set, get) => ({
  // Initial state
  projectPath: null,
  workflowStatus: null,
  isLoading: false,
  error: null,
  expandedPhase: null,
  selectedWorkflow: null,

  setProjectPath: (path) => set({ projectPath: path }),

  loadStatus: async (projectPath: string) => {
    set({ isLoading: true, error: null, projectPath });
    try {
      // Initialize status manager
      await window.electronAPI.bmad.initStatus(projectPath);
      
      // Get current status
      const result = await window.electronAPI.bmad.getStatus(projectPath);
      if (result.success) {
        set({ workflowStatus: result.data, isLoading: false });
      } else {
        set({ error: result.error.message, isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load status',
        isLoading: false,
      });
    }
  },

  refreshStatus: async () => {
    const { projectPath } = get();
    if (!projectPath) return;
    
    try {
      const result = await window.electronAPI.bmad.getStatus(projectPath);
      if (result.success) {
        set({ workflowStatus: result.data });
      }
    } catch (error) {
      console.error('[PhaseStore] Failed to refresh status:', error);
    }
  },

  expandPhase: (phase) => set({ expandedPhase: phase, selectedWorkflow: null }),
  
  selectWorkflow: (workflowId) => set({ selectedWorkflow: workflowId }),

  resetPhase: async (phase: BmadPhase) => {
    const { projectPath, workflowStatus } = get();
    if (!projectPath || !workflowStatus) return false;

    try {
      // Get phases to reset (this phase and all subsequent)
      const phaseIndex = BMAD_PHASES.indexOf(phase);
      const phasesToReset = BMAD_PHASES.slice(phaseIndex);

      // Reset each workflow in each phase
      for (const p of phasesToReset) {
        const phaseWorkflows = WORKFLOW_DEFINITIONS.filter(w => w.phase === p);
        for (const workflow of phaseWorkflows) {
          await window.electronAPI.bmad.updateStatus(
            projectPath,
            p,
            workflow.id,
            'pending',
            { note: `Reset from ${phase} phase` }
          );
        }
      }

      // Refresh status
      await get().refreshStatus();
      return true;
    } catch (error) {
      console.error('[PhaseStore] Failed to reset phase:', error);
      return false;
    }
  },

  canAdvanceToPhase: (targetPhase: BmadPhase) => {
    const { workflowStatus } = get();
    if (!workflowStatus) return { allowed: false, blockers: ['No status loaded'] };

    const targetIndex = BMAD_PHASES.indexOf(targetPhase);
    const blockers: string[] = [];

    // Phase 1 (Analysis) can always be skipped
    if (targetIndex === 0) return { allowed: true, blockers: [] };

    // Check all previous required phases
    for (let i = 1; i < targetIndex; i++) {
      const phase = BMAD_PHASES[i];
      const phaseStatus = workflowStatus.phases[phase];
      
      // Get required workflows for this phase
      const requiredWorkflows = WORKFLOW_DEFINITIONS.filter(
        w => w.phase === phase && !w.optional
      );

      for (const workflow of requiredWorkflows) {
        const status = phaseStatus?.workflows[workflow.id]?.status;
        if (status !== 'completed') {
          blockers.push(`${PHASE_METADATA[phase].name}: ${workflow.name} not completed`);
        }
      }
    }

    return { allowed: blockers.length === 0, blockers };
  },

  updateWorkflowStatus: async (phase, workflowId, status, options) => {
    const { projectPath } = get();
    if (!projectPath) return false;

    try {
      const result = await window.electronAPI.bmad.updateStatus(
        projectPath,
        phase,
        workflowId,
        status,
        options
      );
      
      if (result.success) {
        set({ workflowStatus: result.data });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PhaseStore] Failed to update workflow status:', error);
      return false;
    }
  },

  // Selectors
  getPhases: () => {
    const { workflowStatus } = get();
    
    return BMAD_PHASES.map(phaseId => {
      const meta = PHASE_METADATA[phaseId];
      const phaseStatus = workflowStatus?.phases[phaseId];
      const workflows = WORKFLOW_DEFINITIONS.filter(w => w.phase === phaseId);
      
      // Count completed workflows
      let completedCount = 0;
      let totalRequired = 0;
      
      for (const workflow of workflows) {
        if (!workflow.optional) totalRequired++;
        const status = phaseStatus?.workflows[workflow.id]?.status;
        if (status === 'completed') completedCount++;
      }

      // Determine phase status
      let status: WorkflowStatusValue = 'pending';
      if (phaseStatus?.status) {
        status = phaseStatus.status;
      } else if (completedCount === workflows.length && workflows.length > 0) {
        status = 'completed';
      } else if (completedCount > 0) {
        status = 'in_progress';
      }

      return {
        id: phaseId,
        name: meta.name,
        description: meta.description,
        optional: meta.optional,
        status,
        completedWorkflows: completedCount,
        totalWorkflows: workflows.length,
      };
    });
  },

  getCurrentPhase: () => {
    const { workflowStatus } = get();
    return workflowStatus?.current_phase || null;
  },

  getPhaseWorkflows: (phase: BmadPhase) => {
    const { workflowStatus } = get();
    const phaseStatus = workflowStatus?.phases[phase];
    
    return WORKFLOW_DEFINITIONS.filter(w => w.phase === phase).map(workflow => {
      const entry = phaseStatus?.workflows[workflow.id];
      
      // Check if blocked by dependencies
      const blockedBy: string[] = [];
      if (workflow.dependsOn) {
        for (const depId of workflow.dependsOn) {
          const depWorkflow = WORKFLOW_DEFINITIONS.find(w => w.id === depId);
          if (depWorkflow) {
            const depPhaseStatus = workflowStatus?.phases[depWorkflow.phase];
            const depStatus = depPhaseStatus?.workflows[depId]?.status;
            if (depStatus !== 'completed') {
              blockedBy.push(depWorkflow.name);
            }
          }
        }
      }

      return {
        ...workflow,
        status: entry?.status || 'pending',
        completedAt: entry?.completed_at,
        artifactPath: entry?.artifact_path,
        note: entry?.note,
        isBlocked: blockedBy.length > 0,
        blockedBy,
      };
    });
  },

  getRecommendedWorkflow: () => {
    const { workflowStatus } = get();
    if (!workflowStatus) return null;

    // Find first incomplete required workflow across phases
    for (const phase of BMAD_PHASES) {
      // Skip analysis for recommendation (it's optional)
      if (phase === 'analysis') continue;

      const workflows = get().getPhaseWorkflows(phase);
      
      for (const workflow of workflows) {
        if (!workflow.optional && workflow.status !== 'completed' && !workflow.isBlocked) {
          return { phase, workflow };
        }
      }
    }

    return null;
  },

  isPhaseComplete: (phase: BmadPhase) => {
    const phases = get().getPhases();
    const phaseInfo = phases.find(p => p.id === phase);
    return phaseInfo?.status === 'completed';
  },

  isPhaseBlocked: (phase: BmadPhase) => {
    const { canAdvanceToPhase } = get();
    const { allowed } = canAdvanceToPhase(phase);
    return !allowed;
  },
}));

// Subscribe to status change events
export function initializePhaseStoreListeners(): () => void {
  const unsubscribe = window.electronAPI.bmad.onStatusChanged((event) => {
    usePhaseStore.setState({ workflowStatus: event.status });
  });
  return unsubscribe;
}
