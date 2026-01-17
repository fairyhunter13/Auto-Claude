/**
 * Debug Logger Service
 *
 * Centralized debug logging facility for Auto-BMAD.
 * Provides structured logging with categories, timestamps, and optional file persistence.
 *
 * Features:
 * - Category-based filtering (IPC, WORKFLOW, OPENCODE, BMAD, etc.)
 * - Toggle debug mode at runtime via settings or environment variable
 * - Structured log entries with timestamps and metadata
 * - In-memory ring buffer for recent logs (for UI display)
 * - Integration with electron-log for file persistence
 *
 * Usage:
 *   import { debugLogger } from './debug-logger';
 *   debugLogger.log('IPC', 'Handling project:add', { projectPath: '/path' });
 *   debugLogger.workflow('Starting brainstorming workflow', { agent: 'analyst' });
 */

import { logger as electronLogger } from './app-logger';
import { EventEmitter } from 'events';

// Debug log categories
export type DebugCategory =
  | 'IPC'           // IPC handler calls
  | 'WORKFLOW'      // BMAD workflow execution
  | 'OPENCODE'      // OpenCode CLI operations
  | 'BMAD'          // BMAD methodology operations
  | 'TERMINAL'      // Terminal operations
  | 'INSIGHTS'      // Insights/Conversation feature
  | 'TASK'          // Task operations
  | 'GIT'           // Git operations
  | 'SETTINGS'      // Settings changes
  | 'APP'           // General app events
  | 'E2E';          // E2E test markers

// Log level for filtering
export type DebugLevel = 'debug' | 'info' | 'warn' | 'error';

// Structured log entry
export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  category: DebugCategory;
  level: DebugLevel;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;  // For timed operations (ms)
  stack?: string;     // For errors
}

// Configuration for debug logger
export interface DebugLoggerConfig {
  enabled: boolean;
  categories: DebugCategory[];  // Empty = all categories
  level: DebugLevel;
  maxBufferSize: number;        // Max entries in ring buffer
  persistToFile: boolean;       // Also write to electron-log
}

// Default configuration
const DEFAULT_CONFIG: DebugLoggerConfig = {
  enabled: process.env.AUTO_BMAD_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  categories: [],  // All categories
  level: 'debug',
  maxBufferSize: 1000,
  persistToFile: true,
};

// Level priority for filtering
const LEVEL_PRIORITY: Record<DebugLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Debug Logger singleton class
 */
class DebugLogger extends EventEmitter {
  private config: DebugLoggerConfig;
  private buffer: DebugLogEntry[] = [];
  private idCounter = 0;
  private timers: Map<string, number> = new Map();

  constructor() {
    super();
    this.config = { ...DEFAULT_CONFIG };

    // Check for environment variable overrides
    if (process.env.AUTO_BMAD_DEBUG_CATEGORIES) {
      this.config.categories = process.env.AUTO_BMAD_DEBUG_CATEGORIES.split(',') as DebugCategory[];
    }
    if (process.env.AUTO_BMAD_DEBUG_LEVEL) {
      this.config.level = process.env.AUTO_BMAD_DEBUG_LEVEL as DebugLevel;
    }

    // Log initialization
    if (this.config.enabled) {
      electronLogger.info('[DebugLogger] Initialized with config:', {
        enabled: this.config.enabled,
        categories: this.config.categories.length > 0 ? this.config.categories : 'ALL',
        level: this.config.level,
      });
    }
  }

  /**
   * Update configuration at runtime
   */
  configure(config: Partial<DebugLoggerConfig>): void {
    this.config = { ...this.config, ...config };
    electronLogger.info('[DebugLogger] Configuration updated:', this.config);
    this.emit('config-changed', this.config);
  }

  /**
   * Enable debug mode
   */
  enable(): void {
    this.config.enabled = true;
    electronLogger.info('[DebugLogger] Debug mode ENABLED');
    this.emit('enabled');
  }

  /**
   * Disable debug mode
   */
  disable(): void {
    this.config.enabled = false;
    electronLogger.info('[DebugLogger] Debug mode DISABLED');
    this.emit('disabled');
  }

  /**
   * Check if debug mode is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): DebugLoggerConfig {
    return { ...this.config };
  }

  /**
   * Check if a category should be logged
   */
  private shouldLog(category: DebugCategory, level: DebugLevel): boolean {
    if (!this.config.enabled) return false;

    // Check level
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.config.level]) return false;

    // Check category filter
    if (this.config.categories.length > 0 && !this.config.categories.includes(category)) {
      return false;
    }

    return true;
  }

  /**
   * Core logging method
   */
  log(category: DebugCategory, message: string, data?: Record<string, unknown>, level: DebugLevel = 'debug'): void {
    if (!this.shouldLog(category, level)) return;

    const entry: DebugLogEntry = {
      id: `log-${++this.idCounter}`,
      timestamp: new Date(),
      category,
      level,
      message,
      data,
    };

    this.addToBuffer(entry);
    this.persistLog(entry);
    this.emit('log', entry);
  }

  /**
   * Add entry to ring buffer
   */
  private addToBuffer(entry: DebugLogEntry): void {
    this.buffer.push(entry);
    if (this.buffer.length > this.config.maxBufferSize) {
      this.buffer.shift();  // Remove oldest
    }
  }

  /**
   * Persist to electron-log if enabled
   */
  private persistLog(entry: DebugLogEntry): void {
    if (!this.config.persistToFile) return;

    const prefix = `[${entry.category}]`;
    const msg = entry.data
      ? `${prefix} ${entry.message} ${JSON.stringify(entry.data)}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        electronLogger.debug(msg);
        break;
      case 'info':
        electronLogger.info(msg);
        break;
      case 'warn':
        electronLogger.warn(msg);
        break;
      case 'error':
        electronLogger.error(msg, entry.stack);
        break;
    }
  }

  // ============================================
  // Convenience methods for each category
  // ============================================

  ipc(message: string, data?: Record<string, unknown>): void {
    this.log('IPC', message, data, 'debug');
  }

  workflow(message: string, data?: Record<string, unknown>): void {
    this.log('WORKFLOW', message, data, 'info');
  }

  opencode(message: string, data?: Record<string, unknown>): void {
    this.log('OPENCODE', message, data, 'info');
  }

  bmad(message: string, data?: Record<string, unknown>): void {
    this.log('BMAD', message, data, 'info');
  }

  terminal(message: string, data?: Record<string, unknown>): void {
    this.log('TERMINAL', message, data, 'debug');
  }

  insights(message: string, data?: Record<string, unknown>): void {
    this.log('INSIGHTS', message, data, 'debug');
  }

  task(message: string, data?: Record<string, unknown>): void {
    this.log('TASK', message, data, 'debug');
  }

  git(message: string, data?: Record<string, unknown>): void {
    this.log('GIT', message, data, 'debug');
  }

  settings(message: string, data?: Record<string, unknown>): void {
    this.log('SETTINGS', message, data, 'info');
  }

  app(message: string, data?: Record<string, unknown>): void {
    this.log('APP', message, data, 'info');
  }

  e2e(message: string, data?: Record<string, unknown>): void {
    this.log('E2E', message, data, 'info');
  }

  // ============================================
  // Error logging (always logged)
  // ============================================

  error(category: DebugCategory, message: string, error?: Error | unknown, data?: Record<string, unknown>): void {
    const entry: DebugLogEntry = {
      id: `log-${++this.idCounter}`,
      timestamp: new Date(),
      category,
      level: 'error',
      message,
      data,
      stack: error instanceof Error ? error.stack : undefined,
    };

    // Errors are always logged regardless of debug mode
    this.addToBuffer(entry);

    // Always persist errors
    const prefix = `[${entry.category}]`;
    electronLogger.error(`${prefix} ${message}`, error, data);

    this.emit('log', entry);
  }

  // ============================================
  // Timing operations
  // ============================================

  /**
   * Start a timer for measuring operation duration
   */
  startTimer(operationId: string): void {
    this.timers.set(operationId, Date.now());
  }

  /**
   * End a timer and log the duration
   */
  endTimer(operationId: string, category: DebugCategory, message: string, data?: Record<string, unknown>): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      this.log(category, `Timer '${operationId}' not found`, undefined, 'warn');
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operationId);

    if (this.shouldLog(category, 'info')) {
      const entry: DebugLogEntry = {
        id: `log-${++this.idCounter}`,
        timestamp: new Date(),
        category,
        level: 'info',
        message: `${message} (${duration}ms)`,
        data,
        duration,
      };

      this.addToBuffer(entry);
      this.persistLog(entry);
      this.emit('log', entry);
    }

    return duration;
  }

  // ============================================
  // Buffer access (for UI)
  // ============================================

  /**
   * Get recent log entries
   */
  getRecentLogs(count?: number, category?: DebugCategory): DebugLogEntry[] {
    let logs = [...this.buffer];

    if (category) {
      logs = logs.filter(e => e.category === category);
    }

    if (count) {
      logs = logs.slice(-count);
    }

    return logs;
  }

  /**
   * Clear the log buffer
   */
  clearBuffer(): void {
    this.buffer = [];
    this.emit('cleared');
  }

  /**
   * Get log statistics
   */
  getStats(): { total: number; byCategory: Record<string, number>; byLevel: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    const byLevel: Record<string, number> = {};

    for (const entry of this.buffer) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      byLevel[entry.level] = (byLevel[entry.level] || 0) + 1;
    }

    return {
      total: this.buffer.length,
      byCategory,
      byLevel,
    };
  }

  // ============================================
  // IPC Handler wrapper (for automatic logging)
  // ============================================

  /**
   * Wrap an IPC handler with automatic debug logging
   */
  wrapIpcHandler<T extends (...args: unknown[]) => unknown>(
    channel: string,
    handler: T
  ): T {
    const self = this;
    return (async (...args: unknown[]) => {
      const timerId = `ipc:${channel}:${Date.now()}`;
      self.startTimer(timerId);
      self.ipc(`[${channel}] called`, { args: args.length > 0 ? args : undefined });

      try {
        const result = await handler(...args);
        self.endTimer(timerId, 'IPC', `[${channel}] completed`);
        return result;
      } catch (error) {
        self.error('IPC', `[${channel}] failed`, error);
        throw error;
      }
    }) as T;
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();

// Export for convenience
export default debugLogger;
