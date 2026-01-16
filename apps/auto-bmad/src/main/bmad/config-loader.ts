/**
 * BMAD Configuration Loader
 * 
 * Loads and parses _bmad/bmm/config.yaml for project configuration.
 * Handles path variable substitution and validation.
 */

import { readFile, access, constants } from 'fs/promises';
import { join, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { 
  BmadConfig, 
  BmadConfigSchema, 
  IpcResult, 
  successResult, 
  errorResult 
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Path Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve path variables in configuration values
 * Supports: {project-root}
 */
function resolvePath(value: string, projectPath: string): string {
  return value.replace('{project-root}', projectPath);
}

/**
 * Resolve all path variables in a config object
 */
function resolveConfigPaths(config: BmadConfig, projectPath: string): BmadConfig {
  return {
    ...config,
    planning_artifacts: config.planning_artifacts 
      ? resolvePath(config.planning_artifacts, projectPath) 
      : join(projectPath, '_bmad-output', 'planning-artifacts'),
    implementation_artifacts: config.implementation_artifacts 
      ? resolvePath(config.implementation_artifacts, projectPath) 
      : join(projectPath, '_bmad-output', 'implementation-artifacts'),
    project_knowledge: config.project_knowledge 
      ? resolvePath(config.project_knowledge, projectPath) 
      : join(projectPath, 'docs'),
    output_folder: config.output_folder 
      ? resolvePath(config.output_folder, projectPath) 
      : join(projectPath, '_bmad-output'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Config File Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the path to the BMAD config file
 */
export function getConfigPath(projectPath: string): string {
  return join(projectPath, '_bmad', 'bmm', 'config.yaml');
}

/**
 * Check if a project has BMAD configuration
 */
export async function hasBmadConfig(projectPath: string): Promise<boolean> {
  const configPath = getConfigPath(projectPath);
  try {
    await access(configPath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory contains a BMAD-enabled project
 * (checks for _bmad directory)
 */
export async function isBmadProject(projectPath: string): Promise<boolean> {
  const bmadDir = join(projectPath, '_bmad');
  try {
    await access(bmadDir, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Loading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load and parse BMAD configuration from a project
 * 
 * @param projectPath - Absolute path to the project root
 * @returns Parsed and validated BmadConfig with resolved paths
 */
export async function loadBmadConfig(projectPath: string): Promise<IpcResult<BmadConfig>> {
  const absolutePath = resolve(projectPath);
  const configPath = getConfigPath(absolutePath);

  try {
    // Check if config file exists
    try {
      await access(configPath, constants.R_OK);
    } catch {
      return errorResult(
        'CONFIG_NOT_FOUND',
        `BMAD configuration not found at: ${configPath}`
      );
    }

    // Read the file
    const content = await readFile(configPath, 'utf-8');

    // Parse YAML
    let rawConfig: unknown;
    try {
      rawConfig = parseYaml(content);
    } catch (parseError) {
      return errorResult(
        'CONFIG_PARSE_ERROR',
        `Failed to parse YAML: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      );
    }

    // Validate with Zod
    const validationResult = BmadConfigSchema.safeParse(rawConfig);
    if (!validationResult.success) {
      const issues = validationResult.error.issues
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return errorResult(
        'CONFIG_VALIDATION_ERROR',
        `Configuration validation failed: ${issues}`
      );
    }

    // Resolve path variables
    const resolvedConfig = resolveConfigPaths(validationResult.data, absolutePath);

    return successResult(resolvedConfig);

  } catch (error) {
    return errorResult(
      'CONFIG_LOAD_ERROR',
      `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get default BMAD configuration for a project
 * Used when no config file exists
 */
export function getDefaultConfig(projectPath: string, projectName?: string): BmadConfig {
  const absolutePath = resolve(projectPath);
  const name = projectName || absolutePath.split('/').pop() || 'Unnamed Project';
  
  return {
    project_name: name,
    user_skill_level: 'intermediate',
    planning_artifacts: join(absolutePath, '_bmad-output', 'planning-artifacts'),
    implementation_artifacts: join(absolutePath, '_bmad-output', 'implementation-artifacts'),
    project_knowledge: join(absolutePath, 'docs'),
    tea_use_mcp_enhancements: false,
    tea_use_playwright_utils: false,
    user_name: 'User',
    communication_language: 'English',
    document_output_language: 'English',
    output_folder: join(absolutePath, '_bmad-output'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Writing (for future use)
// ─────────────────────────────────────────────────────────────────────────────

// Note: Config writing will be added when needed for project creation
// This ensures we maintain separation of concerns
