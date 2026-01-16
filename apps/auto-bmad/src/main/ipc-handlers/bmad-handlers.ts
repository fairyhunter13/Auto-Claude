/**
 * BMAD IPC Handlers
 * 
 * IPC handlers for BMAD methodology operations.
 * Provides communication between renderer and main process for BMAD features.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import {
  // Config
  loadBmadConfig,
  getDefaultConfig,
  hasBmadConfig,
  isBmadProject,
  
  // Status
  getStatusManager,
  hasStatusFile,
  
  // Artifacts
  getArtifactWatcher,
  
  // Workflow
  getWorkflowRunner,
  isOpenCodeAvailable,
  
  // Agents
  loadAgent,
  loadAllAgents,
  getBaseAgents,
  getAgentsByModule,
  
  // Types
  BmadPhase,
  WorkflowStatusValue,
  IpcResult,
  successResult,
  errorResult,
  disposeBmadResources,
} from '../bmad';

import {
  bmadProjectManager,
  type BmadProject,
  type CreateProjectOptions,
  type ImportProjectOptions,
  type BmadProjectValidation,
} from '../bmad/project-manager';

// ─────────────────────────────────────────────────────────────────────────────
// Handler Registration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Register all BMAD IPC handlers
 */
export function registerBmadHandlers(
  getMainWindow: () => BrowserWindow | null
): void {
  // ───────────────────────────────────────────────────────────────────────────
  // Project Detection
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check if a directory is a BMAD project
   */
  ipcMain.handle('bmad:is-project', async (_, projectPath: string) => {
    return isBmadProject(projectPath);
  });

  /**
   * Check if a project has BMAD configuration
   */
  ipcMain.handle('bmad:has-config', async (_, projectPath: string) => {
    return hasBmadConfig(projectPath);
  });

  /**
   * Check if a project has a status file
   */
  ipcMain.handle('bmad:has-status', async (_, projectPath: string) => {
    return hasStatusFile(projectPath);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get BMAD configuration for a project
   */
  ipcMain.handle('bmad:get-config', async (_, projectPath: string) => {
    return loadBmadConfig(projectPath);
  });

  /**
   * Get default BMAD configuration
   */
  ipcMain.handle('bmad:get-default-config', async (_, projectPath: string, projectName?: string) => {
    return successResult(getDefaultConfig(projectPath, projectName));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Status Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialize status manager for a project
   */
  ipcMain.handle('bmad:init-status', async (_, projectPath: string, projectName?: string) => {
    const manager = getStatusManager(projectPath);
    const result = await manager.initialize(projectName);
    
    if (result.success) {
      // Start watching for external changes
      manager.startWatching();
      
      // Forward status changes to renderer
      manager.on('status-change', (event) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('bmad:status-changed', event);
        }
      });
    }
    
    return result;
  });

  /**
   * Get current workflow status
   */
  ipcMain.handle('bmad:get-status', async (_, projectPath: string) => {
    const manager = getStatusManager(projectPath);
    return manager.read();
  });

  /**
   * Update a workflow status
   */
  ipcMain.handle('bmad:update-status', async (
    _,
    projectPath: string,
    phase: BmadPhase,
    workflowId: string,
    status: WorkflowStatusValue,
    options?: {
      artifactPath?: string;
      note?: string;
      result?: string;
      currentStory?: string;
    }
  ) => {
    const manager = getStatusManager(projectPath);
    return manager.updateWorkflowStatus(phase, workflowId, status, options);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Artifact Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialize artifact watcher for a project
   */
  ipcMain.handle('bmad:init-artifacts', async (_, projectPath: string) => {
    const watcher = getArtifactWatcher(projectPath);
    const result = await watcher.initialize();
    
    if (result.success) {
      // Forward artifact changes to renderer
      watcher.on('artifact-change', (event) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('bmad:artifact-changed', event);
        }
      });
    }
    
    return result;
  });

  /**
   * List all artifacts
   */
  ipcMain.handle('bmad:list-artifacts', async (_, projectPath: string) => {
    const watcher = getArtifactWatcher(projectPath);
    return watcher.scanArtifacts();
  });

  /**
   * Get artifacts by type
   */
  ipcMain.handle('bmad:get-artifacts-by-type', async (
    _,
    projectPath: string,
    type: 'planning' | 'implementation'
  ) => {
    const watcher = getArtifactWatcher(projectPath);
    return successResult(watcher.getArtifactsByType(type));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Workflow Execution
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check if OpenCode CLI is available
   */
  ipcMain.handle('bmad:check-opencode', async () => {
    const available = await isOpenCodeAvailable();
    return successResult({ available });
  });

  /**
   * Initialize workflow runner for a project
   */
  ipcMain.handle('bmad:init-workflow-runner', async (_, projectPath: string) => {
    const runner = getWorkflowRunner(projectPath);
    const result = await runner.initialize();
    
    if (result.success) {
      // Forward workflow events to renderer
      runner.on('progress', (event) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('bmad:workflow-progress', event);
        }
      });
      
      runner.on('stdout', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('bmad:workflow-stdout', data);
        }
      });
      
      runner.on('stderr', (data) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('bmad:workflow-stderr', data);
        }
      });
      
      runner.on('exit', (result) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          mainWindow.webContents.send('bmad:workflow-exit', result);
        }
      });
    }
    
    return result;
  });

  /**
   * Get all workflow definitions
   */
  ipcMain.handle('bmad:get-workflows', async (_, projectPath: string) => {
    const runner = getWorkflowRunner(projectPath);
    return successResult(runner.getAllWorkflows());
  });

  /**
   * Get workflows for a specific phase
   */
  ipcMain.handle('bmad:get-workflows-for-phase', async (
    _,
    projectPath: string,
    phase: BmadPhase
  ) => {
    const runner = getWorkflowRunner(projectPath);
    return successResult(runner.getWorkflowsForPhase(phase));
  });

  /**
   * Start a workflow
   */
  ipcMain.handle('bmad:start-workflow', async (
    _,
    projectPath: string,
    workflowId: string,
    options?: {
      args?: string[];
      env?: Record<string, string>;
    }
  ) => {
    const runner = getWorkflowRunner(projectPath);
    return runner.startWorkflow(workflowId, options);
  });

  /**
   * Cancel the running workflow
   */
  ipcMain.handle('bmad:cancel-workflow', async (_, projectPath: string) => {
    const runner = getWorkflowRunner(projectPath);
    return runner.cancelWorkflow();
  });

  /**
   * Check if a workflow is running
   */
  ipcMain.handle('bmad:is-workflow-running', async (_, projectPath: string) => {
    const runner = getWorkflowRunner(projectPath);
    return successResult({
      running: runner.isRunning(),
      workflowId: runner.getActiveWorkflowId(),
    });
  });

  /**
   * Write to the running workflow's stdin
   */
  ipcMain.handle('bmad:write-to-workflow', async (
    _,
    projectPath: string,
    data: string
  ) => {
    const runner = getWorkflowRunner(projectPath);
    const success = runner.writeToWorkflow(data);
    return success
      ? successResult(undefined)
      : errorResult('WORKFLOW_WRITE_ERROR', 'No workflow running or stdin not available');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Agent Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get all base agent definitions
   */
  ipcMain.handle('bmad:get-agents', async () => {
    return successResult(getBaseAgents());
  });

  /**
   * Get agents by module
   */
  ipcMain.handle('bmad:get-agents-by-module', async (
    _,
    module: 'bmm' | 'cis' | 'core'
  ) => {
    return successResult(getAgentsByModule(module));
  });

  /**
   * Load all agents with details from files
   */
  ipcMain.handle('bmad:load-all-agents', async (_, projectPath: string) => {
    return loadAllAgents(projectPath);
  });

  /**
   * Load a single agent's details
   */
  ipcMain.handle('bmad:load-agent', async (
    _,
    projectPath: string,
    agentId: string
  ) => {
    return loadAgent(projectPath, agentId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Dispose all BMAD resources
   */
  ipcMain.handle('bmad:dispose', async () => {
    await disposeBmadResources();
    return successResult(undefined);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Project Management (Epic 2)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Show folder picker dialog
   */
  ipcMain.handle('bmad:select-folder', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) {
      return errorResult('NO_WINDOW', 'Main window not available');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Project Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return successResult({ canceled: true, path: null });
    }

    return successResult({ canceled: false, path: result.filePaths[0] });
  });

  /**
   * Validate a directory as a BMAD project
   */
  ipcMain.handle('bmad:validate-project', async (_, projectPath: string): Promise<IpcResult<BmadProjectValidation>> => {
    const validation = bmadProjectManager.validateProject(projectPath);
    return successResult(validation);
  });

  /**
   * Create a new BMAD project
   */
  ipcMain.handle('bmad:create-project', async (_, options: CreateProjectOptions): Promise<IpcResult<BmadProject>> => {
    const result = await bmadProjectManager.createProject(options);
    if (result.success && result.project) {
      return successResult(result.project);
    }
    return errorResult('CREATE_PROJECT_ERROR', result.error || 'Failed to create project');
  });

  /**
   * Import an existing BMAD project
   */
  ipcMain.handle('bmad:import-project', async (_, options: ImportProjectOptions): Promise<IpcResult<BmadProject>> => {
    const result = await bmadProjectManager.importProject(options);
    if (result.success && result.project) {
      return successResult(result.project);
    }
    return errorResult('IMPORT_PROJECT_ERROR', result.error || 'Failed to import project');
  });

  /**
   * Get all BMAD projects
   */
  ipcMain.handle('bmad:get-projects', async (): Promise<IpcResult<BmadProject[]>> => {
    const projects = bmadProjectManager.getProjects();
    return successResult(projects);
  });

  /**
   * Get a project by ID
   */
  ipcMain.handle('bmad:get-project', async (_, projectId: string): Promise<IpcResult<BmadProject | undefined>> => {
    const project = bmadProjectManager.getProject(projectId);
    return successResult(project);
  });

  /**
   * Get recent projects
   */
  ipcMain.handle('bmad:get-recent-projects', async (): Promise<IpcResult<BmadProject[]>> => {
    const projects = bmadProjectManager.getRecentProjects();
    return successResult(projects);
  });

  /**
   * Open a project (updates last opened time)
   */
  ipcMain.handle('bmad:open-project', async (_, projectId: string): Promise<IpcResult<BmadProject | undefined>> => {
    const project = bmadProjectManager.openProject(projectId);
    return successResult(project);
  });

  /**
   * Remove a project from the store
   */
  ipcMain.handle('bmad:remove-project', async (_, projectId: string): Promise<IpcResult<boolean>> => {
    const success = bmadProjectManager.removeProject(projectId);
    return successResult(success);
  });

  /**
   * Update a project
   */
  ipcMain.handle('bmad:update-project', async (
    _,
    projectId: string,
    updates: Partial<Pick<BmadProject, 'name' | 'currentPhase'>>
  ): Promise<IpcResult<BmadProject | undefined>> => {
    const project = bmadProjectManager.updateProject(projectId, updates);
    return successResult(project);
  });

  /**
   * Get global BMAD settings
   */
  ipcMain.handle('bmad:get-settings', async () => {
    return successResult(bmadProjectManager.getSettings());
  });

  /**
   * Update global BMAD settings
   */
  ipcMain.handle('bmad:update-settings', async (_, settings: { opencodePath?: string; defaultCommunicationLanguage?: string }) => {
    bmadProjectManager.updateSettings(settings);
    return successResult(undefined);
  });

  console.log('[IPC] BMAD handlers registered');
}
