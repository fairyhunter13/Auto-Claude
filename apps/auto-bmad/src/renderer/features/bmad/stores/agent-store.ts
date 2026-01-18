/**
 * Agent Store
 * 
 * Zustand store for managing BMAD agents in the renderer.
 * Provides agent list, filtering, and active agent tracking.
 * Story 5.1, 5.2, 5.4
 */

import { create } from 'zustand';
import type { AgentDefinition } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentModule = 'all' | 'bmm' | 'cis' | 'core' | 'bmb';

interface AgentState {
  // Agent data
  agents: AgentDefinition[];
  isLoading: boolean;
  error: string | null;

  // Filtering
  moduleFilter: AgentModule;

  // Active agent (during workflow execution)
  activeAgentId: string | null;

  // Selected agent (for details panel)
  selectedAgentId: string | null;

  // Actions
  loadAgents: (projectPath: string) => Promise<void>;
  setModuleFilter: (module: AgentModule) => void;
  setActiveAgent: (agentId: string | null) => void;
  selectAgent: (agentId: string | null) => void;
  clearError: () => void;

  // Computed
  getFilteredAgents: () => AgentDefinition[];
  getAgentById: (id: string) => AgentDefinition | undefined;
  getActiveAgent: () => AgentDefinition | undefined;
  getSelectedAgent: () => AgentDefinition | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  agents: [],
  isLoading: false,
  error: null,
  moduleFilter: 'all',
  activeAgentId: null,
  selectedAgentId: null,

  // Load all agents for a project
  loadAgents: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.bmad.loadAllAgents(projectPath);
      
      if (result.success) {
        set({ agents: result.data, isLoading: false });
      } else {
        set({ 
          error: result.error.message, 
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load agents',
        isLoading: false 
      });
    }
  },

  // Set module filter
  setModuleFilter: (module: AgentModule) => {
    set({ moduleFilter: module });
  },

  // Set active agent (during workflow execution)
  setActiveAgent: (agentId: string | null) => {
    set({ activeAgentId: agentId });
  },

  // Select agent for details panel
  selectAgent: (agentId: string | null) => {
    set({ selectedAgentId: agentId });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Get filtered agents based on module filter
  getFilteredAgents: () => {
    const { agents, moduleFilter } = get();
    
    if (moduleFilter === 'all') {
      return agents;
    }
    
    return agents.filter(agent => agent.module === moduleFilter);
  },

  // Get agent by ID
  getAgentById: (id: string) => {
    return get().agents.find(agent => agent.id === id);
  },

  // Get currently active agent
  getActiveAgent: () => {
    const { agents, activeAgentId } = get();
    if (!activeAgentId) return undefined;
    return agents.find(agent => agent.id === activeAgentId);
  },

  // Get selected agent for details
  getSelectedAgent: () => {
    const { agents, selectedAgentId } = get();
    if (!selectedAgentId) return undefined;
    return agents.find(agent => agent.id === selectedAgentId);
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors (for use with useBmadStore workflow state)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sync active agent with workflow execution state
 */
export function syncActiveAgentWithWorkflow(
  workflowAgentId: string | null,
  isRunning: boolean
) {
  if (isRunning && workflowAgentId) {
    useAgentStore.getState().setActiveAgent(workflowAgentId);
  } else {
    useAgentStore.getState().setActiveAgent(null);
  }
}
