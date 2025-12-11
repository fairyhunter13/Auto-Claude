import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Files and directories to exclude when copying auto-build
 */
const EXCLUDE_PATTERNS = [
  '__pycache__',
  '.DS_Store',
  '*.pyc',
  '.env',
  'specs',
  '.git'
];

/**
 * Files to preserve during updates (never overwrite)
 */
const PRESERVE_ON_UPDATE = [
  'specs',
  '.env'
];

/**
 * Version metadata stored in .auto-build/.version.json
 */
export interface VersionMetadata {
  version: string;
  sourceHash: string;
  sourcePath: string;
  initializedAt: string;
  updatedAt: string;
}

/**
 * Result of initialization or update operation
 */
export interface InitializationResult {
  success: boolean;
  error?: string;
  version?: string;
  wasUpdate?: boolean;
}

/**
 * Result of version check
 */
export interface VersionCheckResult {
  isInitialized: boolean;
  currentVersion?: string;
  sourceVersion?: string;
  updateAvailable: boolean;
  sourcePath?: string;
}

/**
 * Check if a file/directory matches exclusion patterns
 */
function shouldExclude(name: string): boolean {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.startsWith('*')) {
      // Wildcard pattern (e.g., *.pyc)
      const ext = pattern.slice(1);
      if (name.endsWith(ext)) return true;
    } else if (name === pattern) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a file/directory should be preserved during updates
 */
function shouldPreserve(name: string): boolean {
  return PRESERVE_ON_UPDATE.includes(name);
}

/**
 * Recursively copy directory with exclusions
 */
function copyDirectoryRecursive(
  src: string,
  dest: string,
  isUpdate: boolean = false
): void {
  // Create destination directory if it doesn't exist
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Skip excluded files/directories
    if (shouldExclude(entry.name)) {
      continue;
    }

    // During updates, skip preserved files/directories if they exist
    if (isUpdate && shouldPreserve(entry.name) && existsSync(destPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, isUpdate);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Calculate hash of directory contents for version comparison
 */
function calculateDirectoryHash(dirPath: string): string {
  const hash = crypto.createHash('sha256');

  function processDirectory(currentPath: string): void {
    if (!existsSync(currentPath)) return;

    const entries = readdirSync(currentPath, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip excluded items for hash calculation
      if (shouldExclude(entry.name)) {
        continue;
      }

      if (entry.isDirectory()) {
        hash.update(`dir:${entry.name}`);
        processDirectory(fullPath);
      } else {
        const content = readFileSync(fullPath);
        hash.update(`file:${entry.name}:${content.length}`);
        hash.update(content);
      }
    }
  }

  processDirectory(dirPath);
  return hash.digest('hex').slice(0, 16); // Use first 16 chars for brevity
}

/**
 * Read version from VERSION file in auto-build source
 */
function readSourceVersion(sourcePath: string): string {
  const versionFile = path.join(sourcePath, 'VERSION');
  if (existsSync(versionFile)) {
    return readFileSync(versionFile, 'utf-8').trim();
  }
  return '0.0.0';
}

/**
 * Read version metadata from initialized project
 */
function readVersionMetadata(autoBuildPath: string): VersionMetadata | null {
  const metadataPath = path.join(autoBuildPath, '.version.json');
  if (existsSync(metadataPath)) {
    try {
      return JSON.parse(readFileSync(metadataPath, 'utf-8'));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Write version metadata to initialized project
 */
function writeVersionMetadata(
  autoBuildPath: string,
  metadata: VersionMetadata
): void {
  const metadataPath = path.join(autoBuildPath, '.version.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * Check if .env file has been modified from example
 */
export function hasCustomEnv(autoBuildPath: string): boolean {
  const envPath = path.join(autoBuildPath, '.env');
  const envExamplePath = path.join(autoBuildPath, '.env.example');

  if (!existsSync(envPath)) {
    return false;
  }

  if (!existsSync(envExamplePath)) {
    return true; // Has .env but no example to compare
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const exampleContent = readFileSync(envExamplePath, 'utf-8');

  // Simple check: if .env differs from .env.example, it's customized
  return envContent !== exampleContent;
}

/**
 * Check version status for a project
 * If an existing auto-build folder is found without version metadata,
 * create a retroactive .version.json to enable future update tracking.
 */
export function checkVersion(
  projectPath: string,
  sourcePath: string
): VersionCheckResult {
  // Check for both .auto-build and auto-build folders
  const dotAutoBuildPath = path.join(projectPath, '.auto-build');
  const autoBuildPath = path.join(projectPath, 'auto-build');

  let installedPath: string | null = null;
  if (existsSync(dotAutoBuildPath)) {
    installedPath = dotAutoBuildPath;
  } else if (existsSync(autoBuildPath)) {
    installedPath = autoBuildPath;
  }

  if (!installedPath) {
    return {
      isInitialized: false,
      updateAvailable: false
    };
  }

  let metadata = readVersionMetadata(installedPath);

  if (!metadata && existsSync(sourcePath)) {
    // Has folder but no version metadata - create retroactive metadata
    // This allows existing projects to participate in the update system
    const sourceVersion = readSourceVersion(sourcePath);
    const installedHash = calculateDirectoryHash(installedPath);
    const now = new Date().toISOString();

    metadata = {
      version: sourceVersion,
      sourceHash: installedHash, // Use installed hash as baseline
      sourcePath,
      initializedAt: now,
      updatedAt: now
    };

    // Write the retroactive metadata
    writeVersionMetadata(installedPath, metadata);
  }

  if (!metadata) {
    // Still no metadata (source doesn't exist) - legacy or manual install
    return {
      isInitialized: true,
      updateAvailable: false, // Can't determine without source
      sourcePath: installedPath
    };
  }

  // Check if source exists
  if (!existsSync(sourcePath)) {
    return {
      isInitialized: true,
      currentVersion: metadata.version,
      updateAvailable: false,
      sourcePath: installedPath
    };
  }

  const sourceVersion = readSourceVersion(sourcePath);
  const sourceHash = calculateDirectoryHash(sourcePath);

  return {
    isInitialized: true,
    currentVersion: metadata.version,
    sourceVersion,
    updateAvailable: metadata.sourceHash !== sourceHash,
    sourcePath: installedPath
  };
}

/**
 * Initialize auto-build in a project
 */
export function initializeProject(
  projectPath: string,
  sourcePath: string
): InitializationResult {
  // Validate source exists
  if (!existsSync(sourcePath)) {
    return {
      success: false,
      error: `Auto-build source not found at: ${sourcePath}`
    };
  }

  // Validate project path exists
  if (!existsSync(projectPath)) {
    return {
      success: false,
      error: `Project directory not found: ${projectPath}`
    };
  }

  // Check if already initialized
  const dotAutoBuildPath = path.join(projectPath, '.auto-build');
  const autoBuildPath = path.join(projectPath, 'auto-build');

  if (existsSync(dotAutoBuildPath) || existsSync(autoBuildPath)) {
    return {
      success: false,
      error: 'Project already has auto-build initialized'
    };
  }

  try {
    // Copy files to .auto-build
    copyDirectoryRecursive(sourcePath, dotAutoBuildPath, false);

    // Create specs directory
    const specsDir = path.join(dotAutoBuildPath, 'specs');
    if (!existsSync(specsDir)) {
      mkdirSync(specsDir, { recursive: true });
    }

    // Create .gitkeep in specs
    writeFileSync(path.join(specsDir, '.gitkeep'), '');

    // Copy .env.example to .env if .env doesn't exist
    const envExamplePath = path.join(dotAutoBuildPath, '.env.example');
    const envPath = path.join(dotAutoBuildPath, '.env');
    if (existsSync(envExamplePath) && !existsSync(envPath)) {
      copyFileSync(envExamplePath, envPath);
    }

    // Write version metadata
    const version = readSourceVersion(sourcePath);
    const sourceHash = calculateDirectoryHash(sourcePath);
    const now = new Date().toISOString();

    writeVersionMetadata(dotAutoBuildPath, {
      version,
      sourceHash,
      sourcePath,
      initializedAt: now,
      updatedAt: now
    });

    return {
      success: true,
      version,
      wasUpdate: false
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during initialization'
    };
  }
}

/**
 * Update auto-build in a project
 */
export function updateProject(
  projectPath: string,
  sourcePath: string
): InitializationResult {
  // Validate source exists
  if (!existsSync(sourcePath)) {
    return {
      success: false,
      error: `Auto-build source not found at: ${sourcePath}`
    };
  }

  // Find existing auto-build folder
  const dotAutoBuildPath = path.join(projectPath, '.auto-build');
  const autoBuildPath = path.join(projectPath, 'auto-build');

  let targetPath: string;
  if (existsSync(dotAutoBuildPath)) {
    targetPath = dotAutoBuildPath;
  } else if (existsSync(autoBuildPath)) {
    targetPath = autoBuildPath;
  } else {
    return {
      success: false,
      error: 'No auto-build folder found to update'
    };
  }

  try {
    // Copy files with preservation of specs/ and .env
    copyDirectoryRecursive(sourcePath, targetPath, true);

    // Update version metadata
    const version = readSourceVersion(sourcePath);
    const sourceHash = calculateDirectoryHash(sourcePath);
    const existingMetadata = readVersionMetadata(targetPath);
    const now = new Date().toISOString();

    writeVersionMetadata(targetPath, {
      version,
      sourceHash,
      sourcePath,
      initializedAt: existingMetadata?.initializedAt || now,
      updatedAt: now
    });

    return {
      success: true,
      version,
      wasUpdate: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during update'
    };
  }
}

/**
 * Get the auto-build folder path for a project (either .auto-build or auto-build)
 */
export function getAutoBuildPath(projectPath: string): string | null {
  const dotAutoBuildPath = path.join(projectPath, '.auto-build');
  const autoBuildPath = path.join(projectPath, 'auto-build');

  if (existsSync(dotAutoBuildPath)) {
    return '.auto-build';
  } else if (existsSync(autoBuildPath)) {
    return 'auto-build';
  }
  return null;
}
