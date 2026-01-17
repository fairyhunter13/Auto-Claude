/**
 * Debug API for renderer process
 *
 * Provides access to debugging features:
 * - Get debug info for bug reports
 * - Open logs folder
 * - Copy debug info to clipboard
 * - List log files
 * - Runtime debug logger control
 */

import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants';
import { invokeIpc } from './ipc-utils';
import type { 
  DebugLogEntry, 
  DebugLoggerConfig, 
  DebugLoggerStats,
  DebugCategory 
} from '../../../shared/types/settings';

export interface DebugInfo {
  systemInfo: Record<string, string>;
  recentErrors: string[];
  logsPath: string;
  debugReport: string;
}

export interface LogFileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export interface DebugResult {
  success: boolean;
  error?: string;
}

/**
 * Debug API interface exposed to renderer
 */
export interface DebugAPI {
  // Existing debug info methods
  getDebugInfo: () => Promise<DebugInfo>;
  openLogsFolder: () => Promise<DebugResult>;
  copyDebugInfo: () => Promise<DebugResult>;
  getRecentErrors: (maxCount?: number) => Promise<string[]>;
  listLogFiles: () => Promise<LogFileInfo[]>;
  
  // Debug Logger runtime control
  logger: {
    setEnabled: (enabled: boolean) => Promise<DebugResult>;
    getConfig: () => Promise<DebugLoggerConfig>;
    setConfig: (config: Partial<DebugLoggerConfig>) => Promise<DebugResult>;
    getLogs: (count?: number, category?: DebugCategory) => Promise<DebugLogEntry[]>;
    clearLogs: () => Promise<DebugResult>;
    getStats: () => Promise<DebugLoggerStats>;
    // Event subscriptions
    onLogEntry: (callback: (entry: DebugLogEntry) => void) => () => void;
    onConfigChanged: (callback: (config: DebugLoggerConfig) => void) => () => void;
  };
}

/**
 * Creates the Debug API implementation
 */
export const createDebugAPI = (): DebugAPI => ({
  getDebugInfo: (): Promise<DebugInfo> =>
    invokeIpc(IPC_CHANNELS.DEBUG_GET_INFO),

  openLogsFolder: (): Promise<DebugResult> =>
    invokeIpc(IPC_CHANNELS.DEBUG_OPEN_LOGS_FOLDER),

  copyDebugInfo: (): Promise<DebugResult> =>
    invokeIpc(IPC_CHANNELS.DEBUG_COPY_DEBUG_INFO),

  getRecentErrors: (maxCount?: number): Promise<string[]> =>
    invokeIpc(IPC_CHANNELS.DEBUG_GET_RECENT_ERRORS, maxCount),

  listLogFiles: (): Promise<LogFileInfo[]> =>
    invokeIpc(IPC_CHANNELS.DEBUG_LIST_LOG_FILES),

  // Debug Logger runtime control
  logger: {
    setEnabled: (enabled: boolean): Promise<DebugResult> =>
      invokeIpc(IPC_CHANNELS.DEBUG_LOGGER_SET_ENABLED, enabled),

    getConfig: (): Promise<DebugLoggerConfig> =>
      invokeIpc(IPC_CHANNELS.DEBUG_LOGGER_GET_CONFIG),

    setConfig: (config: Partial<DebugLoggerConfig>): Promise<DebugResult> =>
      invokeIpc(IPC_CHANNELS.DEBUG_LOGGER_SET_CONFIG, config),

    getLogs: (count?: number, category?: DebugCategory): Promise<DebugLogEntry[]> =>
      invokeIpc(IPC_CHANNELS.DEBUG_LOGGER_GET_LOGS, count, category),

    clearLogs: (): Promise<DebugResult> =>
      invokeIpc(IPC_CHANNELS.DEBUG_LOGGER_CLEAR_LOGS),

    getStats: (): Promise<DebugLoggerStats> =>
      invokeIpc(IPC_CHANNELS.DEBUG_LOGGER_GET_STATS),

    // Subscribe to log entries (returns unsubscribe function)
    onLogEntry: (callback: (entry: DebugLogEntry) => void): (() => void) => {
      const handler = (_: unknown, entry: DebugLogEntry) => callback(entry);
      ipcRenderer.on(IPC_CHANNELS.DEBUG_LOGGER_LOG_ENTRY, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DEBUG_LOGGER_LOG_ENTRY, handler);
    },

    // Subscribe to config changes (returns unsubscribe function)
    onConfigChanged: (callback: (config: DebugLoggerConfig) => void): (() => void) => {
      const handler = (_: unknown, config: DebugLoggerConfig) => callback(config);
      ipcRenderer.on(IPC_CHANNELS.DEBUG_LOGGER_CONFIG_CHANGED, handler);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.DEBUG_LOGGER_CONFIG_CHANGED, handler);
    },
  },
});
