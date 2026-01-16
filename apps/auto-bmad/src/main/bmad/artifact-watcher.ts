/**
 * BMAD Artifact Watcher
 * 
 * Watches the _bmad-output directory for changes to artifacts.
 * Provides real-time updates when artifacts are created, modified, or deleted.
 */

import { stat, readdir, access, constants } from 'fs/promises';
import { join, relative, extname, basename, resolve } from 'path';
import { watch, type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { 
  ArtifactInfo, 
  ArtifactChangeEvent,
  IpcResult,
  successResult,
  errorResult
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the path to the BMAD output directory
 */
export function getOutputPath(projectPath: string): string {
  return join(projectPath, '_bmad-output');
}

/**
 * Get the path to planning artifacts
 */
export function getPlanningArtifactsPath(projectPath: string): string {
  return join(projectPath, '_bmad-output', 'planning-artifacts');
}

/**
 * Get the path to implementation artifacts
 */
export function getImplementationArtifactsPath(projectPath: string): string {
  return join(projectPath, '_bmad-output', 'implementation-artifacts');
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Type Detection
// ─────────────────────────────────────────────────────────────────────────────

// Known artifact files and their associated workflows
const ARTIFACT_WORKFLOW_MAP: Record<string, string> = {
  'product-brief.md': 'product-brief',
  'product-brief-*.md': 'product-brief',
  'prd.md': 'prd',
  'ux-design.md': 'ux-design',
  'architecture.md': 'architecture',
  'epics.md': 'epics',
  'test-design.md': 'test-design',
  'implementation-readiness-report.md': 'implementation-readiness',
  'sprint-status.yaml': 'sprint-planning',
  'bmm-workflow-status.yaml': 'status',
};

/**
 * Determine the artifact type based on path
 */
function getArtifactType(filePath: string, projectPath: string): 'planning' | 'implementation' {
  const relativePath = relative(projectPath, filePath);
  if (relativePath.includes('implementation-artifacts')) {
    return 'implementation';
  }
  return 'planning';
}

/**
 * Determine the workflow that generates this artifact
 */
function getWorkflowForArtifact(filename: string): string | undefined {
  // Check exact match first
  if (ARTIFACT_WORKFLOW_MAP[filename]) {
    return ARTIFACT_WORKFLOW_MAP[filename];
  }

  // Check pattern matches (e.g., product-brief-*.md)
  for (const [pattern, workflow] of Object.entries(ARTIFACT_WORKFLOW_MAP)) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      if (regex.test(filename)) {
        return workflow;
      }
    }
  }

  return undefined;
}

/**
 * Create ArtifactInfo from a file path
 */
async function createArtifactInfo(filePath: string, projectPath: string): Promise<ArtifactInfo | null> {
  try {
    const stats = await stat(filePath);
    const filename = basename(filePath);
    
    return {
      path: filePath,
      name: filename,
      type: getArtifactType(filePath, projectPath),
      workflow: getWorkflowForArtifact(filename),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      size: stats.size,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Watcher Class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported file extensions for artifacts
 */
const SUPPORTED_EXTENSIONS = ['.md', '.yaml', '.yml'];

/**
 * ArtifactWatcher monitors _bmad-output for artifact changes
 */
export class ArtifactWatcher extends EventEmitter {
  private projectPath: string;
  private outputPath: string;
  private watcher: FSWatcher | null = null;
  private artifacts: Map<string, ArtifactInfo> = new Map();

  constructor(projectPath: string) {
    super();
    this.projectPath = resolve(projectPath);
    this.outputPath = getOutputPath(this.projectPath);
  }

  /**
   * Get the current project path
   */
  getProjectPath(): string {
    return this.projectPath;
  }

  /**
   * Initialize the watcher and scan existing artifacts
   */
  async initialize(): Promise<IpcResult<ArtifactInfo[]>> {
    // Scan existing artifacts
    const scanResult = await this.scanArtifacts();
    if (!scanResult.success) {
      return scanResult;
    }

    // Start watching
    this.startWatching();

    return successResult(scanResult.data);
  }

  /**
   * Scan all existing artifacts in the output directory
   */
  async scanArtifacts(): Promise<IpcResult<ArtifactInfo[]>> {
    this.artifacts.clear();

    try {
      // Check if output directory exists
      try {
        await access(this.outputPath, constants.R_OK);
      } catch {
        // Output directory doesn't exist yet, return empty list
        return successResult([]);
      }

      // Scan both planning and implementation directories
      const planningPath = getPlanningArtifactsPath(this.projectPath);
      const implementationPath = getImplementationArtifactsPath(this.projectPath);

      const artifacts: ArtifactInfo[] = [];

      // Scan planning artifacts
      await this.scanDirectory(planningPath, artifacts);

      // Scan implementation artifacts
      await this.scanDirectory(implementationPath, artifacts);

      // Cache all artifacts
      for (const artifact of artifacts) {
        this.artifacts.set(artifact.path, artifact);
      }

      return successResult(artifacts);

    } catch (error) {
      return errorResult(
        'ARTIFACT_SCAN_ERROR',
        `Failed to scan artifacts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Recursively scan a directory for artifacts
   */
  private async scanDirectory(dirPath: string, artifacts: ArtifactInfo[]): Promise<void> {
    try {
      await access(dirPath, constants.R_OK);
    } catch {
      return; // Directory doesn't exist
    }

    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories (e.g., epics/, stories/)
        await this.scanDirectory(fullPath, artifacts);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const info = await createArtifactInfo(fullPath, this.projectPath);
          if (info) {
            artifacts.push(info);
          }
        }
      }
    }
  }

  /**
   * Get all cached artifacts
   */
  getArtifacts(): ArtifactInfo[] {
    return Array.from(this.artifacts.values());
  }

  /**
   * Get artifacts filtered by type
   */
  getArtifactsByType(type: 'planning' | 'implementation'): ArtifactInfo[] {
    return this.getArtifacts().filter(a => a.type === type);
  }

  /**
   * Get a specific artifact by path
   */
  getArtifact(filePath: string): ArtifactInfo | undefined {
    return this.artifacts.get(filePath);
  }

  /**
   * Start watching the output directory
   */
  startWatching(): void {
    if (this.watcher) {
      return; // Already watching
    }

    // Watch both planning and implementation directories
    const watchPaths = [
      getPlanningArtifactsPath(this.projectPath),
      getImplementationArtifactsPath(this.projectPath),
    ];

    this.watcher = watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/*.tmp.*', // Ignore our atomic write temp files
      ],
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', async (filePath) => {
      const ext = extname(filePath);
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return;
      }

      const info = await createArtifactInfo(filePath, this.projectPath);
      if (info) {
        this.artifacts.set(filePath, info);
        this.emitChange('add', filePath, info);
      }
    });

    this.watcher.on('change', async (filePath) => {
      const ext = extname(filePath);
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return;
      }

      const info = await createArtifactInfo(filePath, this.projectPath);
      if (info) {
        this.artifacts.set(filePath, info);
        this.emitChange('change', filePath, info);
      }
    });

    this.watcher.on('unlink', (filePath) => {
      const ext = extname(filePath);
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        return;
      }

      const existing = this.artifacts.get(filePath);
      this.artifacts.delete(filePath);
      this.emitChange('unlink', filePath, existing);
    });

    this.watcher.on('error', (error) => {
      console.error('[ArtifactWatcher] Error:', error);
    });

    console.log('[ArtifactWatcher] Started watching artifacts');
  }

  /**
   * Stop watching
   */
  async stopWatching(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('[ArtifactWatcher] Stopped watching artifacts');
    }
  }

  /**
   * Emit an artifact change event
   */
  private emitChange(
    action: 'add' | 'change' | 'unlink',
    path: string,
    artifact?: ArtifactInfo
  ): void {
    const event: ArtifactChangeEvent = {
      type: 'artifact-change',
      action,
      path,
      artifact,
    };
    this.emit('artifact-change', event);
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.stopWatching();
    this.removeAllListeners();
    this.artifacts.clear();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance Management
// ─────────────────────────────────────────────────────────────────────────────

let activeWatcher: ArtifactWatcher | null = null;

/**
 * Get or create an ArtifactWatcher for a project
 */
export function getArtifactWatcher(projectPath: string): ArtifactWatcher {
  const resolvedPath = resolve(projectPath);
  
  // If we have an active watcher for a different project, dispose it
  if (activeWatcher && activeWatcher.getProjectPath() !== resolvedPath) {
    activeWatcher.dispose().catch(console.error);
    activeWatcher = null;
  }

  // Create new watcher if needed
  if (!activeWatcher) {
    activeWatcher = new ArtifactWatcher(resolvedPath);
  }

  return activeWatcher;
}

/**
 * Dispose the active artifact watcher
 */
export async function disposeArtifactWatcher(): Promise<void> {
  if (activeWatcher) {
    await activeWatcher.dispose();
    activeWatcher = null;
  }
}
