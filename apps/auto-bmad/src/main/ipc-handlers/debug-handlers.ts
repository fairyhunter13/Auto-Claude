/**
 * Debug IPC Handlers
 *
 * Handles debug-related IPC operations:
 * - Getting debug info for bug reports
 * - Opening logs folder
 * - Copying debug info to clipboard
 * - Listing log files
 * - Debug Logger runtime control (enable/disable, get logs, config)
 */

import { ipcMain, shell, clipboard, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import {
  getSystemInfo,
  getLogsPath,
  getRecentErrors,
  generateDebugReport,
  listLogFiles,
  logger
} from '../app-logger';
import { debugLogger, type DebugLoggerConfig, type DebugLogEntry, type DebugCategory, type DebugLevel } from '../debug-logger';
import type { DebugLoggerStats } from '../../shared/types/settings';

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

/**
 * Register debug-related IPC handlers
 */
export function registerDebugHandlers(): void {
  // Get comprehensive debug info
  ipcMain.handle(IPC_CHANNELS.DEBUG_GET_INFO, async (): Promise<DebugInfo> => {
    logger.info('Debug info requested');
    return {
      systemInfo: getSystemInfo(),
      recentErrors: getRecentErrors(20),
      logsPath: getLogsPath(),
      debugReport: generateDebugReport()
    };
  });

  // Open logs folder in system file explorer
  ipcMain.handle(IPC_CHANNELS.DEBUG_OPEN_LOGS_FOLDER, async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const logsPath = getLogsPath();
      logger.info('Opening logs folder:', logsPath);
      await shell.openPath(logsPath);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to open logs folder:', error);
      return { success: false, error: errorMessage };
    }
  });

  // Copy debug info to clipboard
  ipcMain.handle(IPC_CHANNELS.DEBUG_COPY_DEBUG_INFO, async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const debugReport = generateDebugReport();
      clipboard.writeText(debugReport);
      logger.info('Debug info copied to clipboard');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to copy debug info:', error);
      return { success: false, error: errorMessage };
    }
  });

  // Get recent errors
  ipcMain.handle(IPC_CHANNELS.DEBUG_GET_RECENT_ERRORS, async (_, maxCount?: number): Promise<string[]> => {
    return getRecentErrors(maxCount ?? 20);
  });

  // List log files
  ipcMain.handle(IPC_CHANNELS.DEBUG_LIST_LOG_FILES, async (): Promise<LogFileInfo[]> => {
    const files = listLogFiles();
    return files.map(f => ({
      ...f,
      modified: f.modified.toISOString()
    }));
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Debug Logger Runtime Controls
  // ─────────────────────────────────────────────────────────────────────────────

  // Enable/disable debug logger
  ipcMain.handle(
    IPC_CHANNELS.DEBUG_LOGGER_SET_ENABLED, 
    async (_, enabled: boolean): Promise<{ success: boolean }> => {
      if (enabled) {
        debugLogger.enable();
      } else {
        debugLogger.disable();
      }
      logger.info(`Debug logger ${enabled ? 'enabled' : 'disabled'}`);
      return { success: true };
    }
  );

  // Get debug logger config
  ipcMain.handle(
    IPC_CHANNELS.DEBUG_LOGGER_GET_CONFIG, 
    async (): Promise<DebugLoggerConfig> => {
      return debugLogger.getConfig();
    }
  );

  // Set debug logger config
  ipcMain.handle(
    IPC_CHANNELS.DEBUG_LOGGER_SET_CONFIG, 
    async (_, config: Partial<DebugLoggerConfig>): Promise<{ success: boolean }> => {
      debugLogger.configure(config);
      return { success: true };
    }
  );

  // Get recent debug logs
  ipcMain.handle(
    IPC_CHANNELS.DEBUG_LOGGER_GET_LOGS, 
    async (_, count?: number, category?: DebugCategory): Promise<DebugLogEntry[]> => {
      const logs = debugLogger.getRecentLogs(count, category);
      // Convert Date to string for serialization
      return logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })) as unknown as DebugLogEntry[];
    }
  );

  // Clear debug logs
  ipcMain.handle(
    IPC_CHANNELS.DEBUG_LOGGER_CLEAR_LOGS, 
    async (): Promise<{ success: boolean }> => {
      debugLogger.clearBuffer();
      return { success: true };
    }
  );

  // Get debug logger stats
  ipcMain.handle(
    IPC_CHANNELS.DEBUG_LOGGER_GET_STATS, 
    async (): Promise<DebugLoggerStats> => {
      return debugLogger.getStats();
    }
  );

  logger.info('Debug IPC handlers registered');
}

/**
 * Setup debug logger event forwarding to renderer
 * Call this after the main window is created
 */
export function setupDebugLoggerForwarding(getMainWindow: () => BrowserWindow | null): void {
  // Forward log entries to renderer when debug mode is enabled
  debugLogger.on('log', (entry: DebugLogEntry) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.DEBUG_LOGGER_LOG_ENTRY, {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
      });
    }
  });

  // Forward config changes to renderer
  debugLogger.on('config-changed', (config: DebugLoggerConfig) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.DEBUG_LOGGER_CONFIG_CHANGED, config);
    }
  });

  logger.info('Debug logger event forwarding configured');
}
