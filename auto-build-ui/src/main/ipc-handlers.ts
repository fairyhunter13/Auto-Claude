import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { IPC_CHANNELS, DEFAULT_APP_SETTINGS, AUTO_BUILD_PATHS } from '../shared/constants';
import type {
  Project,
  ProjectSettings,
  Task,
  AppSettings,
  IPCResult,
  TaskStartOptions,
  ImplementationPlan
} from '../shared/types';
import { projectStore } from './project-store';
import { fileWatcher } from './file-watcher';
import { AgentManager } from './agent-manager';

/**
 * Setup all IPC handlers
 */
export function setupIpcHandlers(
  agentManager: AgentManager,
  getMainWindow: () => BrowserWindow | null
): void {
  // ============================================
  // Project Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_ADD,
    async (_, projectPath: string): Promise<IPCResult<Project>> => {
      try {
        // Validate path exists
        if (!existsSync(projectPath)) {
          return { success: false, error: 'Directory does not exist' };
        }

        const project = projectStore.addProject(projectPath);
        return { success: true, data: project };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_REMOVE,
    async (_, projectId: string): Promise<IPCResult> => {
      const success = projectStore.removeProject(projectId);
      return { success };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_LIST,
    async (): Promise<IPCResult<Project[]>> => {
      const projects = projectStore.getProjects();
      return { success: true, data: projects };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.PROJECT_UPDATE_SETTINGS,
    async (
      _,
      projectId: string,
      settings: Partial<ProjectSettings>
    ): Promise<IPCResult> => {
      const project = projectStore.updateProjectSettings(projectId, settings);
      if (project) {
        return { success: true };
      }
      return { success: false, error: 'Project not found' };
    }
  );

  // ============================================
  // Task Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.TASK_LIST,
    async (_, projectId: string): Promise<IPCResult<Task[]>> => {
      const tasks = projectStore.getTasks(projectId);
      return { success: true, data: tasks };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.TASK_CREATE,
    async (
      _,
      projectId: string,
      title: string,
      description: string
    ): Promise<IPCResult<Task>> => {
      const project = projectStore.getProject(projectId);
      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      // Generate a unique task ID for tracking
      const taskId = `task-${Date.now()}`;

      // Start spec creation via agent manager
      agentManager.startSpecCreation(taskId, project.path, description);

      // Create a placeholder task
      const task: Task = {
        id: taskId,
        specId: '', // Will be assigned after spec creation
        projectId,
        title,
        description,
        status: 'backlog',
        chunks: [],
        logs: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return { success: true, data: task };
    }
  );

  ipcMain.on(
    IPC_CHANNELS.TASK_START,
    (_, taskId: string, options?: TaskStartOptions) => {
      const mainWindow = getMainWindow();
      if (!mainWindow) return;

      // Find task and project
      const projects = projectStore.getProjects();
      let task: Task | undefined;
      let project: Project | undefined;

      for (const p of projects) {
        const tasks = projectStore.getTasks(p.id);
        task = tasks.find((t) => t.id === taskId || t.specId === taskId);
        if (task) {
          project = p;
          break;
        }
      }

      if (!task || !project) {
        mainWindow.webContents.send(
          IPC_CHANNELS.TASK_ERROR,
          taskId,
          'Task or project not found'
        );
        return;
      }

      // Start file watcher for this task
      const specDir = path.join(
        project.path,
        AUTO_BUILD_PATHS.SPECS_DIR,
        task.specId
      );
      fileWatcher.watch(taskId, specDir);

      // Start task execution
      agentManager.startTaskExecution(
        taskId,
        project.path,
        task.specId,
        {
          parallel: options?.parallel ?? project.settings.parallelEnabled,
          workers: options?.workers ?? project.settings.maxWorkers
        }
      );

      // Notify status change
      mainWindow.webContents.send(
        IPC_CHANNELS.TASK_STATUS_CHANGE,
        taskId,
        'in_progress'
      );
    }
  );

  ipcMain.on(IPC_CHANNELS.TASK_STOP, (_, taskId: string) => {
    agentManager.killTask(taskId);
    fileWatcher.unwatch(taskId);

    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(
        IPC_CHANNELS.TASK_STATUS_CHANGE,
        taskId,
        'backlog'
      );
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.TASK_REVIEW,
    async (
      _,
      taskId: string,
      approved: boolean,
      feedback?: string
    ): Promise<IPCResult> => {
      // Find task and project
      const projects = projectStore.getProjects();
      let task: Task | undefined;
      let project: Project | undefined;

      for (const p of projects) {
        const tasks = projectStore.getTasks(p.id);
        task = tasks.find((t) => t.id === taskId || t.specId === taskId);
        if (task) {
          project = p;
          break;
        }
      }

      if (!task || !project) {
        return { success: false, error: 'Task not found' };
      }

      const specDir = path.join(
        project.path,
        AUTO_BUILD_PATHS.SPECS_DIR,
        task.specId
      );

      if (approved) {
        // Write approval to QA report
        const qaReportPath = path.join(specDir, AUTO_BUILD_PATHS.QA_REPORT);
        writeFileSync(
          qaReportPath,
          `# QA Review\n\nStatus: APPROVED\n\nReviewed at: ${new Date().toISOString()}\n`
        );

        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send(
            IPC_CHANNELS.TASK_STATUS_CHANGE,
            taskId,
            'done'
          );
        }
      } else {
        // Write feedback for QA fixer
        const fixRequestPath = path.join(specDir, 'QA_FIX_REQUEST.md');
        writeFileSync(
          fixRequestPath,
          `# QA Fix Request\n\nStatus: REJECTED\n\n## Feedback\n\n${feedback || 'No feedback provided'}\n\nCreated at: ${new Date().toISOString()}\n`
        );

        // Restart QA process
        agentManager.startQAProcess(taskId, project.path, task.specId);

        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send(
            IPC_CHANNELS.TASK_STATUS_CHANGE,
            taskId,
            'in_progress'
          );
        }
      }

      return { success: true };
    }
  );

  // ============================================
  // Settings Operations
  // ============================================

  const settingsPath = path.join(app.getPath('userData'), 'settings.json');

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET,
    async (): Promise<IPCResult<AppSettings>> => {
      if (existsSync(settingsPath)) {
        try {
          const content = readFileSync(settingsPath, 'utf-8');
          const settings = JSON.parse(content);
          return { success: true, data: { ...DEFAULT_APP_SETTINGS, ...settings } };
        } catch {
          return { success: true, data: DEFAULT_APP_SETTINGS as AppSettings };
        }
      }
      return { success: true, data: DEFAULT_APP_SETTINGS as AppSettings };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_SAVE,
    async (_, settings: Partial<AppSettings>): Promise<IPCResult> => {
      try {
        let currentSettings = DEFAULT_APP_SETTINGS;
        if (existsSync(settingsPath)) {
          const content = readFileSync(settingsPath, 'utf-8');
          currentSettings = { ...currentSettings, ...JSON.parse(content) };
        }

        const newSettings = { ...currentSettings, ...settings };
        writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));

        // Apply Python path if changed
        if (settings.pythonPath || settings.autoBuildPath) {
          agentManager.configure(settings.pythonPath, settings.autoBuildPath);
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save settings'
        };
      }
    }
  );

  // ============================================
  // Dialog Operations
  // ============================================

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_SELECT_DIRECTORY,
    async (): Promise<string | null> => {
      const mainWindow = getMainWindow();
      if (!mainWindow) return null;

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Project Directory'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    }
  );

  // ============================================
  // App Info
  // ============================================

  ipcMain.handle(IPC_CHANNELS.APP_VERSION, async (): Promise<string> => {
    return app.getVersion();
  });

  // ============================================
  // Agent Manager Events → Renderer
  // ============================================

  agentManager.on('log', (taskId: string, log: string) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_LOG, taskId, log);
    }
  });

  agentManager.on('error', (taskId: string, error: string) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_ERROR, taskId, error);
    }
  });

  agentManager.on('exit', (taskId: string, code: number | null) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      // Stop file watcher
      fileWatcher.unwatch(taskId);

      // Determine new status based on exit code
      const newStatus = code === 0 ? 'ai_review' : 'human_review';
      mainWindow.webContents.send(
        IPC_CHANNELS.TASK_STATUS_CHANGE,
        taskId,
        newStatus
      );
    }
  });

  // ============================================
  // File Watcher Events → Renderer
  // ============================================

  fileWatcher.on('progress', (taskId: string, plan: ImplementationPlan) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_PROGRESS, taskId, plan);
    }
  });

  fileWatcher.on('error', (taskId: string, error: string) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.TASK_ERROR, taskId, error);
    }
  });
}
