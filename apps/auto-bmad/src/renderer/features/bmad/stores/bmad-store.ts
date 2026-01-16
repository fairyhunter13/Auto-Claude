/**
 * BMAD Store
 * 
 * Zustand store for BMAD methodology state in the renderer.
 * Syncs with main process via IPC and listens for real-time updates.
 */

import { create } from 'zustand';
import type {
  BmadConfig,
  BmadWorkflowStatus,
  WorkflowDefinition,
  AgentDefinition,
  ArtifactInfo,
  BmadPhase,
  WorkflowStatusValue,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────────────────────────────────────

interface BmadState {
  // Project context
  projectPath: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Configuration
  config: BmadConfig | null;

  // Workflow status
  status: BmadWorkflowStatus | null;

  // Workflows
  workflows: WorkflowDefinition[];
  
  // Agents
  agents: AgentDefinition[];

  // Artifacts
  artifacts: ArtifactInfo[];

  // Active workflow
  activeWorkflowId: string | null;
  isWorkflowRunning: boolean;
  workflowOutput: string[];

  // OpenCode CLI availability
  isOpenCodeAvailable: boolean;

  // Actions
  initialize: (projectPath: string) => Promise<void>;
  dispose: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshArtifacts: () => Promise<void>;
  
  // Status updates
  setStatus: (status: BmadWorkflowStatus) => void;
  
  // Workflow actions
  startWorkflow: (workflowId: string) => Promise<void>;
  cancelWorkflow: () => Promise<void>;
  appendWorkflowOutput: (data: string) => void;
  clearWorkflowOutput: () => void;

  // Artifact updates
  setArtifacts: (artifacts: ArtifactInfo[]) => void;
  addArtifact: (artifact: ArtifactInfo) => void;
  updateArtifact: (path: string, artifact: ArtifactInfo) => void;
  removeArtifact: (path: string) => void;

  // Computed selectors
  getCurrentPhase: () => BmadPhase | null;
  getPhaseStatus: (phase: BmadPhase) => WorkflowStatusValue;
  getWorkflowsForPhase: (phase: BmadPhase) => WorkflowDefinition[];
  getNextRecommendedWorkflow: () => WorkflowDefinition | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

// Unsubscribe functions for IPC events
let unsubscribers: (() => void)[] = [];

export const useBmadStore = create<BmadState>((set, get) => ({
  // Initial state
  projectPath: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  config: null,
  status: null,
  workflows: [],
  agents: [],
  artifacts: [],
  activeWorkflowId: null,
  isWorkflowRunning: false,
  workflowOutput: [],
  isOpenCodeAvailable: false,

  // Initialize BMAD for a project
  initialize: async (projectPath: string) => {
    set({ isLoading: true, error: null, projectPath });

    try {
      const api = window.electronAPI.bmad;

      // Check if this is a BMAD project
      const isBmad = await api.isProject(projectPath);
      if (!isBmad) {
        set({
          isLoading: false,
          isInitialized: false,
          error: 'Not a BMAD project (missing _bmad directory)',
        });
        return;
      }

      // Check OpenCode CLI availability
      const openCodeResult = await api.checkOpenCode();
      const isOpenCodeAvailable = openCodeResult.success && openCodeResult.data.available;

      // Load config
      const configResult = await api.getConfig(projectPath);
      if (!configResult.success) {
        // Use default config if not found
        const defaultResult = await api.getDefaultConfig(projectPath);
        if (defaultResult.success) {
          set({ config: defaultResult.data });
        }
      } else {
        set({ config: configResult.data });
      }

      // Initialize status (creates default if not exists)
      const statusResult = await api.initStatus(projectPath);
      if (statusResult.success) {
        set({ status: statusResult.data });
      }

      // Initialize artifact watcher
      const artifactsResult = await api.initArtifacts(projectPath);
      if (artifactsResult.success) {
        set({ artifacts: artifactsResult.data });
      }

      // Load workflows
      const workflowsResult = await api.getWorkflows(projectPath);
      if (workflowsResult.success) {
        set({ workflows: workflowsResult.data });
      }

      // Load agents
      const agentsResult = await api.loadAllAgents(projectPath);
      if (agentsResult.success) {
        set({ agents: agentsResult.data });
      }

      // Initialize workflow runner
      if (isOpenCodeAvailable) {
        await api.initWorkflowRunner(projectPath);
      }

      // Setup IPC event listeners
      unsubscribers.push(
        api.onStatusChanged((event) => {
          set({ status: event.status });
        })
      );

      unsubscribers.push(
        api.onArtifactChanged((event) => {
          const { action, path, artifact } = event;
          const state = get();
          
          if (action === 'add' && artifact) {
            set({ artifacts: [...state.artifacts, artifact] });
          } else if (action === 'change' && artifact) {
            set({
              artifacts: state.artifacts.map(a => 
                a.path === path ? artifact : a
              ),
            });
          } else if (action === 'unlink') {
            set({
              artifacts: state.artifacts.filter(a => a.path !== path),
            });
          }
        })
      );

      unsubscribers.push(
        api.onWorkflowProgress((event) => {
          set({
            activeWorkflowId: event.status === 'in_progress' ? event.workflowId : null,
            isWorkflowRunning: event.status === 'in_progress',
          });
        })
      );

      unsubscribers.push(
        api.onWorkflowStdout((data) => {
          const state = get();
          set({ workflowOutput: [...state.workflowOutput, data] });
        })
      );

      unsubscribers.push(
        api.onWorkflowStderr((data) => {
          const state = get();
          set({ workflowOutput: [...state.workflowOutput, `\x1b[31m${data}\x1b[0m`] });
        })
      );

      unsubscribers.push(
        api.onWorkflowExit((event) => {
          set({
            activeWorkflowId: null,
            isWorkflowRunning: false,
          });
          // Refresh status after workflow completes
          get().refreshStatus();
        })
      );

      set({
        isLoading: false,
        isInitialized: true,
        isOpenCodeAvailable,
      });

    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize BMAD',
      });
    }
  },

  // Dispose BMAD resources
  dispose: async () => {
    // Unsubscribe from IPC events
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];

    // Call main process dispose
    try {
      await window.electronAPI.bmad.dispose();
    } catch (error) {
      console.error('[BmadStore] Failed to dispose:', error);
    }

    // Reset state
    set({
      projectPath: null,
      isInitialized: false,
      isLoading: false,
      error: null,
      config: null,
      status: null,
      workflows: [],
      agents: [],
      artifacts: [],
      activeWorkflowId: null,
      isWorkflowRunning: false,
      workflowOutput: [],
  isOpenCodeAvailable: false,
    });
  },

  // Refresh status from file
  refreshStatus: async () => {
    const { projectPath } = get();
    if (!projectPath) return;

    const result = await window.electronAPI.bmad.getStatus(projectPath);
    if (result.success) {
      set({ status: result.data });
    }
  },

  // Refresh artifacts
  refreshArtifacts: async () => {
    const { projectPath } = get();
    if (!projectPath) return;

    const result = await window.electronAPI.bmad.listArtifacts(projectPath);
    if (result.success) {
      set({ artifacts: result.data });
    }
  },

  // Set status (from IPC event)
  setStatus: (status) => {
    set({ status });
  },

  // Start a workflow
  startWorkflow: async (workflowId: string) => {
    const { projectPath, isWorkflowRunning } = get();
    if (!projectPath || isWorkflowRunning) return;

    set({ 
      activeWorkflowId: workflowId, 
      isWorkflowRunning: true,
      workflowOutput: [],
    });

    const result = await window.electronAPI.bmad.startWorkflow(projectPath, workflowId);
    if (!result.success) {
      set({
        activeWorkflowId: null,
        isWorkflowRunning: false,
        error: result.error.message,
      });
    }
  },

  // Cancel running workflow
  cancelWorkflow: async () => {
    const { projectPath, isWorkflowRunning } = get();
    if (!projectPath || !isWorkflowRunning) return;

    await window.electronAPI.bmad.cancelWorkflow(projectPath);
    set({
      activeWorkflowId: null,
      isWorkflowRunning: false,
    });
  },

  // Append to workflow output
  appendWorkflowOutput: (data: string) => {
    set(state => ({
      workflowOutput: [...state.workflowOutput, data],
    }));
  },

  // Clear workflow output
  clearWorkflowOutput: () => {
    set({ workflowOutput: [] });
  },

  // Artifact management
  setArtifacts: (artifacts) => set({ artifacts }),
  
  addArtifact: (artifact) => {
    set(state => ({
      artifacts: [...state.artifacts, artifact],
    }));
  },

  updateArtifact: (path, artifact) => {
    set(state => ({
      artifacts: state.artifacts.map(a => 
        a.path === path ? artifact : a
      ),
    }));
  },

  removeArtifact: (path) => {
    set(state => ({
      artifacts: state.artifacts.filter(a => a.path !== path),
    }));
  },

  // Selectors
  getCurrentPhase: () => {
    const { status } = get();
    return status?.current_phase || null;
  },

  getPhaseStatus: (phase: BmadPhase) => {
    const { status } = get();
    return status?.phases[phase]?.status || 'pending';
  },

  getWorkflowsForPhase: (phase: BmadPhase) => {
    const { workflows } = get();
    return workflows.filter(w => w.phase === phase);
  },

  getNextRecommendedWorkflow: () => {
    const { status, workflows } = get();
    if (!status) return null;

    // Find the next incomplete required workflow
    for (const workflow of workflows) {
      if (workflow.optional) continue;

      const phaseStatus = status.phases[workflow.phase];
      const workflowStatus = phaseStatus?.workflows[workflow.id];
      
      if (!workflowStatus || workflowStatus.status === 'pending') {
        // Check dependencies
        const depsComplete = (workflow.dependsOn || []).every(depId => {
          const depWorkflow = workflows.find(w => w.id === depId);
          if (!depWorkflow) return true;
          
          const depPhaseStatus = status.phases[depWorkflow.phase];
          const depStatus = depPhaseStatus?.workflows[depId];
          return depStatus?.status === 'completed' || depStatus?.status === 'skipped';
        });

        if (depsComplete) {
          return workflow;
        }
      }
    }

    return null;
  },
}));
