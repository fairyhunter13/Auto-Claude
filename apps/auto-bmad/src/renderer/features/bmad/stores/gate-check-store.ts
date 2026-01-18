/**
 * Gate Check Store
 * 
 * Zustand store for managing gate check state in the renderer.
 * Tracks gate check results and override status.
 * 
 * Stories: 8.1, 8.2, 8.3, 8.4
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GateCheckItem {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  message?: string;
  artifactPath?: string;
  details?: string[];
}

export interface GateCheckResult {
  passed: boolean;
  overridden: boolean;
  overriddenAt?: Date;
  checkedAt: Date;
  items: GateCheckItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  blockingIssues: string[];
}

interface GateCheckState {
  // State
  result: GateCheckResult | null;
  isRunning: boolean;
  error: string | null;
  showOverrideDialog: boolean;
  overrideConfirmation: string;

  // Actions
  runGateCheck: (projectPath: string) => Promise<void>;
  override: (projectPath: string, confirmation: string, reason?: string) => Promise<boolean>;
  setShowOverrideDialog: (show: boolean) => void;
  setOverrideConfirmation: (confirmation: string) => void;
  clearError: () => void;
  reset: () => void;

  // Computed
  shouldBlockPhase4: () => boolean;
  getBlockingReasons: () => string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useGateCheckStore = create<GateCheckState>((set, get) => ({
  // Initial state
  result: null,
  isRunning: false,
  error: null,
  showOverrideDialog: false,
  overrideConfirmation: '',

  // Run gate check
  runGateCheck: async (projectPath: string) => {
    set({ isRunning: true, error: null });

    try {
      const result = await window.electronAPI.bmad.runGateCheck?.(projectPath);
      
      if (result?.success) {
        set({ 
          result: {
            ...result.data,
            checkedAt: new Date(result.data.checkedAt),
            overriddenAt: result.data.overriddenAt ? new Date(result.data.overriddenAt) : undefined,
          },
          isRunning: false,
        });
      } else {
        set({ 
          error: result?.error?.message || 'Failed to run gate check',
          isRunning: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to run gate check',
        isRunning: false,
      });
    }
  },

  // Override gate check
  override: async (projectPath: string, confirmation: string, reason?: string) => {
    set({ isRunning: true, error: null });

    try {
      const result = await window.electronAPI.bmad.overrideGateCheck?.(projectPath, {
        confirmation,
        reason,
        timestamp: new Date(),
      });

      if (result?.success) {
        set({
          result: {
            ...result.data,
            checkedAt: new Date(result.data.checkedAt),
            overriddenAt: result.data.overriddenAt ? new Date(result.data.overriddenAt) : undefined,
          },
          isRunning: false,
          showOverrideDialog: false,
          overrideConfirmation: '',
        });
        return true;
      } else {
        set({
          error: result?.error?.message || 'Failed to override gate check',
          isRunning: false,
        });
        return false;
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to override gate check',
        isRunning: false,
      });
      return false;
    }
  },

  // Set override dialog visibility
  setShowOverrideDialog: (show: boolean) => {
    set({ showOverrideDialog: show, overrideConfirmation: '', error: null });
  },

  // Set override confirmation text
  setOverrideConfirmation: (confirmation: string) => {
    set({ overrideConfirmation: confirmation });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Reset state
  reset: () => {
    set({
      result: null,
      isRunning: false,
      error: null,
      showOverrideDialog: false,
      overrideConfirmation: '',
    });
  },

  // Check if Phase 4 should be blocked
  shouldBlockPhase4: () => {
    const { result } = get();
    
    if (!result) {
      return true; // Block if no gate check has been run
    }

    if (result.overridden) {
      return false; // Override allows proceeding
    }

    return !result.passed;
  },

  // Get blocking reasons
  getBlockingReasons: () => {
    const { result } = get();

    if (!result) {
      return ['Gate check has not been run'];
    }

    if (result.passed || result.overridden) {
      return [];
    }

    return result.blockingIssues;
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectGateCheckResult = (state: GateCheckState) => state.result;
export const selectIsGateCheckRunning = (state: GateCheckState) => state.isRunning;
export const selectGateCheckPassed = (state: GateCheckState) => 
  state.result?.passed || state.result?.overridden || false;
