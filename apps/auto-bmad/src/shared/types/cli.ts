/**
 * CLI Tool Types
 *
 * Shared types for CLI tool detection and management.
 * Used by both main process (cli-tool-manager) and renderer process (Settings UI).
 */

/**
 * Result of tool detection operation
 * Contains path, version, and metadata about detection source
 */
export interface ToolDetectionResult {
  found: boolean;
  path?: string;
  version?: string;
  source:
    | 'user-config'
    | 'venv'
    | 'homebrew'
    | 'nvm'
    | 'system-path'
    | 'bundled'
    | 'fallback'
    | 'go-install';
  message: string;
}

/**
 * OpenCode CLI version information
 * Used for version checking and update prompts
 */
export interface OpenCodeVersionInfo {
  /** Currently installed version, null if not installed */
  installed: string | null;
  /** Latest version available from GitHub releases */
  latest: string;
  /** True if installed version is older than latest */
  isOutdated: boolean;
  /** Path to OpenCode CLI binary if found */
  path?: string;
  /** Full detection result with source information */
  detectionResult: ToolDetectionResult;
}

/**
 * Available OpenCode CLI versions
 * Used for version rollback feature
 */
export interface OpenCodeVersionList {
  /** List of available versions, sorted newest first */
  versions: string[];
}

/**
 * Information about a detected OpenCode CLI installation
 * Used for displaying available installations and allowing user selection
 */
export interface OpenCodeInstallationInfo {
  /** Full path to the OpenCode CLI executable */
  path: string;
  /** Version string if detected, null if validation failed */
  version: string | null;
  /** Source of detection (user-config, homebrew, system-path, go-install, etc.) */
  source: ToolDetectionResult['source'];
  /** Whether this is the currently active/configured installation */
  isActive: boolean;
}

/**
 * List of all detected OpenCode CLI installations
 */
export interface OpenCodeInstallationList {
  /** All detected OpenCode CLI installations */
  installations: OpenCodeInstallationInfo[];
  /** Path to the currently active installation (from settings or auto-detected) */
  activePath: string | null;
}

// Legacy aliases for backwards compatibility during migration
/** @deprecated Use OpenCodeVersionInfo instead */
export type ClaudeCodeVersionInfo = OpenCodeVersionInfo;
/** @deprecated Use OpenCodeVersionList instead */
export type ClaudeCodeVersionList = OpenCodeVersionList;
/** @deprecated Use OpenCodeInstallationInfo instead */
export type ClaudeInstallationInfo = OpenCodeInstallationInfo;
/** @deprecated Use OpenCodeInstallationList instead */
export type ClaudeInstallationList = OpenCodeInstallationList;
