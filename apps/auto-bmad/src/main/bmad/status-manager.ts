/**
 * BMAD Status Manager
 * 
 * Manages the bmm-workflow-status.yaml file for tracking BMAD workflow progress.
 * Provides atomic saves and file watching for external changes.
 */

import { readFile, writeFile, mkdir, access, constants, rename } from 'fs/promises';
import { join, dirname, resolve } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { watch, type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { 
  BmadWorkflowStatus, 
  BmadWorkflowStatusSchema,
  BmadPhase,
  WorkflowStatusValue,
  IpcResult, 
  successResult, 
  errorResult,
  StatusChangeEvent
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Path Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the path to the workflow status file
 */
export function getStatusPath(projectPath: string): string {
  return join(projectPath, '_bmad-output', 'planning-artifacts', 'bmm-workflow-status.yaml');
}

/**
 * Check if status file exists
 */
export async function hasStatusFile(projectPath: string): Promise<boolean> {
  const statusPath = getStatusPath(projectPath);
  try {
    await access(statusPath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Manager Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * StatusManager handles reading, writing, and watching the BMAD workflow status file.
 * Implements atomic writes to prevent data corruption.
 * Uses a write queue to serialize concurrent operations and prevent race conditions.
 */
export class StatusManager extends EventEmitter {
  private projectPath: string;
  private statusPath: string;
  private watcher: FSWatcher | null = null;
  private cachedStatus: BmadWorkflowStatus | null = null;
  private isWriting = false;
  
  // Write queue for serializing concurrent operations
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(projectPath: string) {
    super();
    this.projectPath = resolve(projectPath);
    this.statusPath = getStatusPath(this.projectPath);
  }

  /**
   * Get the current project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Initialize the status manager
   * Creates the status file if it doesn't exist or if the existing file is corrupted
   * @param projectName - Optional project name for the new status
   * @param force - If true, overwrite existing file even if it exists
   */
  async initialize(projectName?: string, force: boolean = false): Promise<IpcResult<BmadWorkflowStatus>> {
    const exists = await hasStatusFile(this.projectPath);
    
    if (!exists || force) {
      // Create default status
      const defaultStatus = this.createDefaultStatus(projectName);
      const writeResult = await this.write(defaultStatus);
      if (!writeResult.success) {
        return writeResult as IpcResult<BmadWorkflowStatus>;
      }
      this.cachedStatus = defaultStatus;
      return successResult(defaultStatus);
    }

    // Try to load existing status
    const readResult = await this.read();
    
    // If read fails (corrupted file), recreate the status file
    if (!readResult.success) {
      console.warn(`[StatusManager] Existing status file is corrupted, recreating: ${readResult.error.message}`);
      const defaultStatus = this.createDefaultStatus(projectName);
      const writeResult = await this.write(defaultStatus);
      if (!writeResult.success) {
        return writeResult as IpcResult<BmadWorkflowStatus>;
      }
      this.cachedStatus = defaultStatus;
      return successResult(defaultStatus);
    }
    
    return readResult;
  }

  /**
   * Read the workflow status from file
   */
  async read(): Promise<IpcResult<BmadWorkflowStatus>> {
    try {
      // Check if file exists
      try {
        await access(this.statusPath, constants.R_OK);
      } catch {
        return errorResult(
          'STATUS_NOT_FOUND',
          `Status file not found: ${this.statusPath}`
        );
      }

      const content = await readFile(this.statusPath, 'utf-8');
      
      // Parse YAML
      let rawStatus: unknown;
      try {
        rawStatus = parseYaml(content);
      } catch (parseError) {
        return errorResult(
          'STATUS_PARSE_ERROR',
          `Failed to parse status YAML: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
        );
      }

      // Validate with Zod
      const validationResult = BmadWorkflowStatusSchema.safeParse(rawStatus);
      if (!validationResult.success) {
        const issues = validationResult.error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        return errorResult(
          'STATUS_VALIDATION_ERROR',
          `Status validation failed: ${issues}`
        );
      }

      this.cachedStatus = validationResult.data;
      return successResult(validationResult.data);

    } catch (error) {
      return errorResult(
        'STATUS_READ_ERROR',
        `Failed to read status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Write workflow status to file with atomic save
   */
  async write(status: BmadWorkflowStatus): Promise<IpcResult<void>> {
    // Validate the status before writing
    const validationResult = BmadWorkflowStatusSchema.safeParse(status);
    if (!validationResult.success) {
      const issues = validationResult.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return errorResult(
        'STATUS_VALIDATION_ERROR',
        `Invalid status data: ${issues}`
      );
    }

    this.isWriting = true;
    try {
      // Ensure directory exists
      const dir = dirname(this.statusPath);
      await mkdir(dir, { recursive: true });

      // Generate YAML header comment
      const header = `# BMAD Workflow Status - ${status.project_name}
# Generated: ${new Date().toISOString().split('T')[0]}
# Last Updated: ${new Date().toISOString().split('T')[0]}

`;
      
      // Convert to YAML
      const yamlContent = header + stringifyYaml(validationResult.data, {
        indent: 2,
        lineWidth: 120,
      });

      // Atomic write: write to temp file, then rename
      const tempPath = `${this.statusPath}.tmp.${Date.now()}`;
      await writeFile(tempPath, yamlContent, 'utf-8');
      await rename(tempPath, this.statusPath);

      this.cachedStatus = validationResult.data;
      return successResult(undefined);

    } catch (error) {
      return errorResult(
        'STATUS_WRITE_ERROR',
        `Failed to write status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Update a specific workflow status
   * Uses a write queue to serialize concurrent operations and prevent race conditions
   */
  async updateWorkflowStatus(
    phase: BmadPhase,
    workflowId: string,
    status: WorkflowStatusValue,
    options?: {
      artifactPath?: string;
      note?: string;
      result?: string;
      currentStory?: string;
    }
  ): Promise<IpcResult<BmadWorkflowStatus>> {
    // Queue this operation to prevent race conditions
    return new Promise((resolve) => {
      this.writeQueue = this.writeQueue.then(async () => {
        const result = await this.doUpdateWorkflowStatus(phase, workflowId, status, options);
        resolve(result);
      }).catch(async (error) => {
        // Even if previous operation failed, continue with this one
        const result = await this.doUpdateWorkflowStatus(phase, workflowId, status, options);
        resolve(result);
      });
    });
  }

  /**
   * Internal method to perform the actual workflow status update
   */
  private async doUpdateWorkflowStatus(
    phase: BmadPhase,
    workflowId: string,
    status: WorkflowStatusValue,
    options?: {
      artifactPath?: string;
      note?: string;
      result?: string;
      currentStory?: string;
    }
  ): Promise<IpcResult<BmadWorkflowStatus>> {
    // Read current status
    const readResult = await this.read();
    if (!readResult.success) {
      return readResult;
    }

    const currentStatus = readResult.data;

    // Ensure phase exists
    if (!currentStatus.phases[phase]) {
      currentStatus.phases[phase] = {
        status: 'pending',
        workflows: {},
      };
    }

    // Update workflow entry
    currentStatus.phases[phase]!.workflows[workflowId] = {
      status,
      ...(status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(options?.artifactPath && { artifact_path: options.artifactPath }),
      ...(options?.note && { note: options.note }),
      ...(options?.result && { result: options.result }),
      ...(options?.currentStory && { current_story: options.currentStory }),
    };

    // Update phase status based on workflows
    const phaseWorkflows = currentStatus.phases[phase]!.workflows;
    const allCompleted = Object.values(phaseWorkflows).every(w => w.status === 'completed' || w.status === 'skipped');
    const anyInProgress = Object.values(phaseWorkflows).some(w => w.status === 'in_progress');
    
    currentStatus.phases[phase]!.status = allCompleted 
      ? 'completed' 
      : anyInProgress 
        ? 'in_progress' 
        : 'pending';

    // Write updated status
    const writeResult = await this.write(currentStatus);
    if (!writeResult.success) {
      return writeResult as IpcResult<BmadWorkflowStatus>;
    }

    // Emit change event
    this.emitStatusChange(currentStatus);

    return successResult(currentStatus);
  }

  /**
   * Get cached status (for quick access without file I/O)
   */
  getCachedStatus(): BmadWorkflowStatus | null {
    return this.cachedStatus;
  }

  /**
   * Start watching the status file for external changes
   */
  startWatching(): void {
    if (this.watcher) {
      return; // Already watching
    }

    this.watcher = watch(this.statusPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('change', async () => {
      // Ignore changes we made ourselves
      if (this.isWriting) {
        return;
      }

      console.log('[StatusManager] External change detected, reloading...');
      const result = await this.read();
      if (result.success) {
        this.emitStatusChange(result.data);
      }
    });

    this.watcher.on('error', (error) => {
      console.error('[StatusManager] Watcher error:', error);
    });

    console.log('[StatusManager] Started watching status file');
  }

  /**
   * Stop watching the status file
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[StatusManager] Stopped watching status file');
    }
  }

  /**
   * Emit a status change event
   */
  private emitStatusChange(status: BmadWorkflowStatus): void {
    const event: StatusChangeEvent = {
      type: 'status-change',
      status,
    };
    this.emit('status-change', event);
  }

  /**
   * Create default status for a new project
   */
  private createDefaultStatus(projectName?: string): BmadWorkflowStatus {
    return {
      project_name: projectName || this.projectPath.split('/').pop() || 'Unnamed Project',
      project_type: 'greenfield',
      current_phase: 'analysis',
      phases: {
        analysis: {
          status: 'pending',
          workflows: {},
        },
        planning: {
          status: 'pending',
          workflows: {},
        },
        solutioning: {
          status: 'pending',
          workflows: {},
        },
        implementation: {
          status: 'pending',
          workflows: {},
        },
      },
    };
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.stopWatching();
    this.removeAllListeners();
    this.cachedStatus = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance Management
// ─────────────────────────────────────────────────────────────────────────────

let activeManager: StatusManager | null = null;

/**
 * Get or create a StatusManager for a project
 */
export function getStatusManager(projectPath: string): StatusManager {
  const resolvedPath = resolve(projectPath);
  
  // If we have an active manager for a different project, dispose it
  if (activeManager && activeManager.getProjectPath() !== resolvedPath) {
    activeManager.dispose().catch(console.error);
    activeManager = null;
  }

  // Create new manager if needed
  if (!activeManager) {
    activeManager = new StatusManager(resolvedPath);
  }

  return activeManager;
}

/**
 * Dispose the active status manager
 */
export async function disposeStatusManager(): Promise<void> {
  if (activeManager) {
    await activeManager.dispose();
    activeManager = null;
  }
}
