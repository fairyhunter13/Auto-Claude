/**
 * OpenCode API for renderer process
 *
 * Provides access to OpenCode CLI management:
 * - Check installed vs latest version
 * - Install or update OpenCode
 * - Get available versions for rollback
 * - Install specific version
 */

import { IPC_CHANNELS } from '../../../shared/constants';
import type { OpenCodeVersionInfo, OpenCodeVersionList, OpenCodeInstallationList } from '../../../shared/types/cli';
import { invokeIpc } from './ipc-utils';

/**
 * Result of OpenCode installation attempt
 */
export interface OpenCodeInstallResult {
  success: boolean;
  data?: {
    command: string;
  };
  error?: string;
}

/**
 * Result of version check
 */
export interface OpenCodeVersionResult {
  success: boolean;
  data?: OpenCodeVersionInfo;
  error?: string;
}

/**
 * Result of fetching available versions
 */
export interface OpenCodeVersionsResult {
  success: boolean;
  data?: OpenCodeVersionList;
  error?: string;
}

/**
 * Result of installing a specific version
 */
export interface OpenCodeInstallVersionResult {
  success: boolean;
  data?: {
    command: string;
    version: string;
  };
  error?: string;
}

/**
 * Result of getting installations
 */
export interface OpenCodeInstallationsResult {
  success: boolean;
  data?: OpenCodeInstallationList;
  error?: string;
}

/**
 * Result of setting active path
 */
export interface OpenCodeSetActivePathResult {
  success: boolean;
  data?: {
    path: string;
  };
  error?: string;
}

/**
 * OpenCode API interface exposed to renderer
 */
export interface OpenCodeAPI {
  /**
   * Check OpenCode CLI version status
   * Returns installed version, latest version, and whether update is available
   */
  checkOpenCodeVersion: () => Promise<OpenCodeVersionResult>;

  /**
   * Install or update OpenCode CLI
   * Opens the user's terminal with the install command
   */
  installOpenCode: () => Promise<OpenCodeInstallResult>;

  /**
   * Get available OpenCode CLI versions
   * Returns list of versions sorted newest first
   */
  getOpenCodeVersions: () => Promise<OpenCodeVersionsResult>;

  /**
   * Install a specific version of OpenCode CLI
   * Opens the user's terminal with the install command for the specified version
   */
  installOpenCodeVersion: (version: string) => Promise<OpenCodeInstallVersionResult>;

  /**
   * Get all OpenCode CLI installations found on the system
   * Returns list of installations with paths, versions, and sources
   */
  getOpenCodeInstallations: () => Promise<OpenCodeInstallationsResult>;

  /**
   * Set the active OpenCode CLI path
   * Updates settings and refreshes detection
   */
  setOpenCodeActivePath: (cliPath: string) => Promise<OpenCodeSetActivePathResult>;
}

/**
 * Creates the OpenCode API implementation
 */
export const createOpenCodeAPI = (): OpenCodeAPI => ({
  checkOpenCodeVersion: (): Promise<OpenCodeVersionResult> =>
    invokeIpc(IPC_CHANNELS.OPENCODE_CHECK_VERSION),

  installOpenCode: (): Promise<OpenCodeInstallResult> =>
    invokeIpc(IPC_CHANNELS.OPENCODE_INSTALL),

  getOpenCodeVersions: (): Promise<OpenCodeVersionsResult> =>
    invokeIpc(IPC_CHANNELS.OPENCODE_GET_VERSIONS),

  installOpenCodeVersion: (version: string): Promise<OpenCodeInstallVersionResult> =>
    invokeIpc(IPC_CHANNELS.OPENCODE_INSTALL_VERSION, version),

  getOpenCodeInstallations: (): Promise<OpenCodeInstallationsResult> =>
    invokeIpc(IPC_CHANNELS.OPENCODE_GET_INSTALLATIONS),

  setOpenCodeActivePath: (cliPath: string): Promise<OpenCodeSetActivePathResult> =>
    invokeIpc(IPC_CHANNELS.OPENCODE_SET_ACTIVE_PATH, cliPath),
});
