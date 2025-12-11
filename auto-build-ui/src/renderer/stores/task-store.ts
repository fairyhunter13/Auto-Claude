import { create } from 'zustand';
import type { Task, TaskStatus, ImplementationPlan, Chunk } from '../../shared/types';

interface TaskState {
  tasks: Task[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  updateTaskFromPlan: (taskId: string, plan: ImplementationPlan) => void;
  appendLog: (taskId: string, log: string) => void;
  selectTask: (taskId: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTasks: () => void;

  // Selectors
  getSelectedTask: () => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTaskId: null,
  isLoading: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, task]
    })),

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId || t.specId === taskId ? { ...t, ...updates } : t
      )
    })),

  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId || t.specId === taskId
          ? { ...t, status, updatedAt: new Date() }
          : t
      )
    })),

  updateTaskFromPlan: (taskId, plan) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id !== taskId && t.specId !== taskId) return t;

        // Extract chunks from plan
        const chunks: Chunk[] = plan.phases.flatMap((phase) =>
          phase.chunks.map((chunk) => ({
            id: chunk.id,
            title: chunk.description,
            description: chunk.description,
            status: chunk.status,
            files: [],
            verification: chunk.verification
          }))
        );

        // Determine status based on chunks
        const allCompleted = chunks.every((c) => c.status === 'completed');
        const anyInProgress = chunks.some((c) => c.status === 'in_progress');
        const anyFailed = chunks.some((c) => c.status === 'failed');

        let status: TaskStatus = t.status;
        if (allCompleted) {
          status = 'ai_review';
        } else if (anyFailed) {
          status = 'human_review';
        } else if (anyInProgress || chunks.some((c) => c.status === 'completed')) {
          status = 'in_progress';
        }

        return {
          ...t,
          title: plan.feature || t.title,
          chunks,
          status,
          updatedAt: new Date()
        };
      })
    })),

  appendLog: (taskId, log) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId || t.specId === taskId
          ? { ...t, logs: [...(t.logs || []), log] }
          : t
      )
    })),

  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearTasks: () => set({ tasks: [], selectedTaskId: null }),

  getSelectedTask: () => {
    const state = get();
    return state.tasks.find((t) => t.id === state.selectedTaskId);
  },

  getTasksByStatus: (status) => {
    const state = get();
    return state.tasks.filter((t) => t.status === status);
  }
}));

/**
 * Load tasks for a project
 */
export async function loadTasks(projectId: string): Promise<void> {
  const store = useTaskStore.getState();
  store.setLoading(true);
  store.setError(null);

  try {
    const result = await window.electronAPI.getTasks(projectId);
    if (result.success && result.data) {
      store.setTasks(result.data);
    } else {
      store.setError(result.error || 'Failed to load tasks');
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
  } finally {
    store.setLoading(false);
  }
}

/**
 * Create a new task
 */
export async function createTask(
  projectId: string,
  title: string,
  description: string
): Promise<Task | null> {
  const store = useTaskStore.getState();

  try {
    const result = await window.electronAPI.createTask(projectId, title, description);
    if (result.success && result.data) {
      store.addTask(result.data);
      return result.data;
    } else {
      store.setError(result.error || 'Failed to create task');
      return null;
    }
  } catch (error) {
    store.setError(error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Start a task
 */
export function startTask(taskId: string, options?: { parallel?: boolean; workers?: number }): void {
  window.electronAPI.startTask(taskId, options);
}

/**
 * Stop a task
 */
export function stopTask(taskId: string): void {
  window.electronAPI.stopTask(taskId);
}

/**
 * Submit review for a task
 */
export async function submitReview(
  taskId: string,
  approved: boolean,
  feedback?: string
): Promise<boolean> {
  const store = useTaskStore.getState();

  try {
    const result = await window.electronAPI.submitReview(taskId, approved, feedback);
    if (result.success) {
      store.updateTaskStatus(taskId, approved ? 'done' : 'in_progress');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
