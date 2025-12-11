import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type {
  Project,
  ProjectSettings,
  Task,
  AppSettings,
  IPCResult,
  TaskStartOptions,
  TaskStatus,
  ImplementationPlan,
  ElectronAPI
} from '../shared/types';

// Expose a secure API to the renderer process
const electronAPI: ElectronAPI = {
  // ============================================
  // Project Operations
  // ============================================

  addProject: (projectPath: string): Promise<IPCResult<Project>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_ADD, projectPath),

  removeProject: (projectId: string): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_REMOVE, projectId),

  getProjects: (): Promise<IPCResult<Project[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_LIST),

  updateProjectSettings: (
    projectId: string,
    settings: Partial<ProjectSettings>
  ): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE_SETTINGS, projectId, settings),

  // ============================================
  // Task Operations
  // ============================================

  getTasks: (projectId: string): Promise<IPCResult<Task[]>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TASK_LIST, projectId),

  createTask: (
    projectId: string,
    title: string,
    description: string
  ): Promise<IPCResult<Task>> =>
    ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, projectId, title, description),

  startTask: (taskId: string, options?: TaskStartOptions): void =>
    ipcRenderer.send(IPC_CHANNELS.TASK_START, taskId, options),

  stopTask: (taskId: string): void =>
    ipcRenderer.send(IPC_CHANNELS.TASK_STOP, taskId),

  submitReview: (
    taskId: string,
    approved: boolean,
    feedback?: string
  ): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.TASK_REVIEW, taskId, approved, feedback),

  // ============================================
  // Event Listeners (main → renderer)
  // ============================================

  onTaskProgress: (
    callback: (taskId: string, plan: ImplementationPlan) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      taskId: string,
      plan: ImplementationPlan
    ): void => {
      callback(taskId, plan);
    };
    ipcRenderer.on(IPC_CHANNELS.TASK_PROGRESS, handler);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TASK_PROGRESS, handler);
    };
  },

  onTaskError: (
    callback: (taskId: string, error: string) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      taskId: string,
      error: string
    ): void => {
      callback(taskId, error);
    };
    ipcRenderer.on(IPC_CHANNELS.TASK_ERROR, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TASK_ERROR, handler);
    };
  },

  onTaskLog: (
    callback: (taskId: string, log: string) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      taskId: string,
      log: string
    ): void => {
      callback(taskId, log);
    };
    ipcRenderer.on(IPC_CHANNELS.TASK_LOG, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TASK_LOG, handler);
    };
  },

  onTaskStatusChange: (
    callback: (taskId: string, status: TaskStatus) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      taskId: string,
      status: TaskStatus
    ): void => {
      callback(taskId, status);
    };
    ipcRenderer.on(IPC_CHANNELS.TASK_STATUS_CHANGE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TASK_STATUS_CHANGE, handler);
    };
  },

  // ============================================
  // App Settings
  // ============================================

  getSettings: (): Promise<IPCResult<AppSettings>> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),

  saveSettings: (settings: Partial<AppSettings>): Promise<IPCResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE, settings),

  // ============================================
  // Dialog Operations
  // ============================================

  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.DIALOG_SELECT_DIRECTORY),

  // ============================================
  // App Info
  // ============================================

  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_VERSION)
};

// Expose to renderer via contextBridge
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
