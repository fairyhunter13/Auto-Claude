/**
 * BMAD Project Store
 * 
 * Zustand store for BMAD project management.
 * Handles project creation, import, and selection.
 */

import { create } from 'zustand';
import type {
  BmadProject,
  BmadProjectType,
  CreateProjectOptions,
  BmadProjectValidation,
  BmadSettings,
} from '../../../../preload/api/bmad-api';

// Re-export types for convenience
export type { BmadProject, BmadProjectType, CreateProjectOptions, BmadProjectValidation, BmadSettings };

interface BmadProjectState {
  // Project list
  projects: BmadProject[];
  recentProjects: BmadProject[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  // Dialog state
  isCreateDialogOpen: boolean;
  isImportDialogOpen: boolean;

  // Actions
  loadProjects: () => Promise<void>;
  loadRecentProjects: () => Promise<void>;
  selectProject: (projectId: string | null) => Promise<BmadProject | undefined>;
  createProject: (options: CreateProjectOptions) => Promise<BmadProject | null>;
  importProject: (path: string) => Promise<BmadProject | null>;
  removeProject: (projectId: string) => Promise<boolean>;
  updateProject: (projectId: string, updates: Partial<Pick<BmadProject, 'name' | 'currentPhase'>>) => Promise<BmadProject | undefined>;
  
  // Dialog actions
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;

  // Selectors
  getSelectedProject: () => BmadProject | undefined;
  getProjectById: (id: string) => BmadProject | undefined;

  // Settings
  settings: BmadSettings;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<BmadSettings>) => Promise<void>;
  
  // Helpers
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useBmadProjectStore = create<BmadProjectState>((set, get) => ({
  // Initial state
  projects: [],
  recentProjects: [],
  selectedProjectId: null,
  isLoading: false,
  error: null,
  isCreateDialogOpen: false,
  isImportDialogOpen: false,
  settings: {},

  // Load all projects
  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.bmad.getProjects();
      if (result.success) {
        // Convert date strings back to Date objects
        const projects = result.data.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          lastOpenedAt: new Date(p.lastOpenedAt),
        }));
        set({ projects, isLoading: false });
      } else {
        set({ error: result.error.message, isLoading: false });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load projects',
        isLoading: false 
      });
    }
  },

  // Load recent projects
  loadRecentProjects: async () => {
    try {
      const result = await window.electronAPI.bmad.getRecentProjects();
      if (result.success) {
        const recentProjects = result.data.map(p => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          lastOpenedAt: new Date(p.lastOpenedAt),
        }));
        set({ recentProjects });
      }
    } catch (error) {
      console.error('[BmadProjectStore] Failed to load recent projects:', error);
    }
  },

  // Select a project
  selectProject: async (projectId: string | null) => {
    if (!projectId) {
      set({ selectedProjectId: null });
      return undefined;
    }

    try {
      const result = await window.electronAPI.bmad.openProject(projectId);
      if (result.success && result.data) {
        const project = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          lastOpenedAt: new Date(result.data.lastOpenedAt),
        };
        
        // Update project in list
        set(state => ({
          selectedProjectId: projectId,
          projects: state.projects.map(p => p.id === projectId ? project : p),
        }));
        
        // Reload recent projects
        get().loadRecentProjects();
        
        return project;
      }
    } catch (error) {
      console.error('[BmadProjectStore] Failed to select project:', error);
    }
    return undefined;
  },

  // Create a new project
  createProject: async (options: CreateProjectOptions) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.bmad.createProject(options);
      if (result.success) {
        const project = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          lastOpenedAt: new Date(result.data.lastOpenedAt),
        };
        
        set(state => ({
          projects: [project, ...state.projects],
          selectedProjectId: project.id,
          isLoading: false,
          isCreateDialogOpen: false,
        }));
        
        // Reload recent projects
        get().loadRecentProjects();
        
        return project;
      } else {
        set({ error: result.error.message, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false 
      });
      return null;
    }
  },

  // Import an existing project
  importProject: async (path: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.bmad.importProject({ path });
      if (result.success) {
        const project = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          lastOpenedAt: new Date(result.data.lastOpenedAt),
        };
        
        set(state => ({
          projects: [project, ...state.projects.filter(p => p.id !== project.id)],
          selectedProjectId: project.id,
          isLoading: false,
          isImportDialogOpen: false,
        }));
        
        // Reload recent projects
        get().loadRecentProjects();
        
        return project;
      } else {
        set({ error: result.error.message, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to import project',
        isLoading: false 
      });
      return null;
    }
  },

  // Remove a project
  removeProject: async (projectId: string) => {
    try {
      const result = await window.electronAPI.bmad.removeProject(projectId);
      if (result.success && result.data) {
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
          selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
        }));
        
        // Reload recent projects
        get().loadRecentProjects();
        
        return true;
      }
    } catch (error) {
      console.error('[BmadProjectStore] Failed to remove project:', error);
    }
    return false;
  },

  // Update a project
  updateProject: async (projectId: string, updates) => {
    try {
      const result = await window.electronAPI.bmad.updateProject(projectId, updates);
      if (result.success && result.data) {
        const project = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
          lastOpenedAt: new Date(result.data.lastOpenedAt),
        };
        
        set(state => ({
          projects: state.projects.map(p => p.id === projectId ? project : p),
        }));
        
        return project;
      }
    } catch (error) {
      console.error('[BmadProjectStore] Failed to update project:', error);
    }
    return undefined;
  },

  // Dialog actions
  openCreateDialog: () => set({ isCreateDialogOpen: true, error: null }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  openImportDialog: () => set({ isImportDialogOpen: true, error: null }),
  closeImportDialog: () => set({ isImportDialogOpen: false }),

  // Selectors
  getSelectedProject: () => {
    const state = get();
    return state.projects.find(p => p.id === state.selectedProjectId);
  },

  getProjectById: (id: string) => {
    return get().projects.find(p => p.id === id);
  },

  // Settings
  loadSettings: async () => {
    try {
      const result = await window.electronAPI.bmad.getSettings();
      if (result.success) {
        set({ settings: result.data });
      }
    } catch (error) {
      console.error('[BmadProjectStore] Failed to load settings:', error);
    }
  },

  updateSettings: async (settings: Partial<BmadSettings>) => {
    try {
      await window.electronAPI.bmad.updateSettings(settings);
      set(state => ({
        settings: { ...state.settings, ...settings }
      }));
    } catch (error) {
      console.error('[BmadProjectStore] Failed to update settings:', error);
    }
  },

  // Helpers
  setError: (error: string | null) => set({ error }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
}));

// Initialize store on module load
export async function initializeBmadProjectStore(): Promise<void> {
  const store = useBmadProjectStore.getState();
  await Promise.all([
    store.loadProjects(),
    store.loadRecentProjects(),
    store.loadSettings(),
  ]);
}
