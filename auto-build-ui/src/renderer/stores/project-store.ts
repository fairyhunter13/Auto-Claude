import { create } from 'zustand';
import type { Project, ProjectSettings } from '../../shared/types';

interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  selectProject: (projectId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getSelectedProject: () => Project | undefined;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project]
    })),

  removeProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      selectedProjectId:
        state.selectedProjectId === projectId ? null : state.selectedProjectId
    })),

  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates } : p
      )
    })),

  selectProject: (projectId) => set({ selectedProjectId: projectId }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  getSelectedProject: () => {
    const state = get();
    return state.projects.find((p) => p.id === state.selectedProjectId);
  }
}));

/**
 * Load projects from main process
 */
export async function loadProjects(): Promise<void> {
  const store = useProjectStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const result = await window.electronAPI.getProjects();
    if (result.success && result.data) {
      store.setProjects(result.data);
      // Select first project if none selected
      if (!store.selectedProjectId && result.data.length > 0) {
        store.selectProject(result.data[0].id);
      }
    } else {
      store.setError(result.error || 'Failed to load projects');
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setLoading(false);
  }
}

/**
 * Add a new project
 */
export async function addProject(projectPath: string): Promise<Project | null> {
  const store = useProjectStore.getState();

  try {
    const result = await window.electronAPI.addProject(projectPath);
    if (result.success && result.data) {
      store.addProject(result.data);
      store.selectProject(result.data.id);
      return result.data;
    } else {
      store.setError(result.error || 'Failed to add project');
      return null;
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Remove a project
 */
export async function removeProject(projectId: string): Promise<boolean> {
  const store = useProjectStore.getState();

  try {
    const result = await window.electronAPI.removeProject(projectId);
    if (result.success) {
      store.removeProject(projectId);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Update project settings
 */
export async function updateProjectSettings(
  projectId: string,
  settings: Partial<ProjectSettings>
): Promise<boolean> {
  const store = useProjectStore.getState();

  try {
    const result = await window.electronAPI.updateProjectSettings(
      projectId,
      settings
    );
    if (result.success) {
      const project = store.projects.find((p) => p.id === projectId);
      if (project) {
        store.updateProject(projectId, {
          settings: { ...project.settings, ...settings }
        });
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
