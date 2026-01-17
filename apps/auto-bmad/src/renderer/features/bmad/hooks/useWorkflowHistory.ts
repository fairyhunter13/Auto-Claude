/**
 * useWorkflowHistory Hook
 * 
 * Persists workflow terminal output history across sessions.
 * Uses electron-store via IPC for persistence.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useBmadStore } from '../stores/bmad-store';

interface WorkflowHistoryEntry {
  workflowId: string;
  workflowName: string;
  startedAt: string;
  completedAt?: string;
  success?: boolean;
  output: string[];
}

interface WorkflowHistory {
  projectPath: string;
  entries: WorkflowHistoryEntry[];
  maxEntries: number;
}

const MAX_HISTORY_ENTRIES = 10;
const MAX_OUTPUT_LINES = 1000;

/**
 * Hook for managing workflow execution history persistence
 */
export function useWorkflowHistory() {
  const projectPath = useBmadStore(state => state.projectPath);
  const activeWorkflowId = useBmadStore(state => state.activeWorkflowId);
  const workflowOutput = useBmadStore(state => state.workflowOutput);
  const workflows = useBmadStore(state => state.workflows);
  const isWorkflowRunning = useBmadStore(state => state.isWorkflowRunning);

  const currentEntryRef = useRef<WorkflowHistoryEntry | null>(null);

  // Start tracking a new workflow execution
  useEffect(() => {
    if (!activeWorkflowId || !projectPath) return;

    const workflow = workflows.find(w => w.id === activeWorkflowId);
    if (!workflow) return;

    // Create new history entry
    currentEntryRef.current = {
      workflowId: activeWorkflowId,
      workflowName: workflow.name,
      startedAt: new Date().toISOString(),
      output: [],
    };
  }, [activeWorkflowId, projectPath, workflows]);

  // Track output as it arrives
  useEffect(() => {
    if (!currentEntryRef.current || !isWorkflowRunning) return;

    // Update output (truncate if too long)
    currentEntryRef.current.output = workflowOutput.slice(-MAX_OUTPUT_LINES);
  }, [workflowOutput, isWorkflowRunning]);

  // Save history when workflow completes
  useEffect(() => {
    if (isWorkflowRunning || !currentEntryRef.current || !projectPath) return;

    const entry = currentEntryRef.current;
    if (!entry.workflowId) return;

    // Mark completion
    entry.completedAt = new Date().toISOString();
    entry.success = workflowOutput.length > 0; // Simple heuristic

    // Save to storage
    saveHistoryEntry(projectPath, entry);

    // Clear ref
    currentEntryRef.current = null;
  }, [isWorkflowRunning, projectPath, workflowOutput.length]);

  // Load history on mount
  const loadHistory = useCallback(async (): Promise<WorkflowHistoryEntry[]> => {
    if (!projectPath) return [];

    try {
      const result = await window.electronAPI.getSettings();
      if (result.success && result.data) {
        const key = `bmad-workflow-history-${hashPath(projectPath)}`;
        const history = (result.data as unknown as Record<string, WorkflowHistory>)[key];
        return history?.entries || [];
      }
    } catch (error) {
      console.error('[WorkflowHistory] Failed to load history:', error);
    }
    return [];
  }, [projectPath]);

  // Clear history
  const clearHistory = useCallback(async () => {
    if (!projectPath) return;

    try {
      const key = `bmad-workflow-history-${hashPath(projectPath)}`;
      await window.electronAPI.saveSettings({ [key]: null } as any);
    } catch (error) {
      console.error('[WorkflowHistory] Failed to clear history:', error);
    }
  }, [projectPath]);

  return {
    loadHistory,
    clearHistory,
  };
}

// Helper to save a history entry
async function saveHistoryEntry(projectPath: string, entry: WorkflowHistoryEntry) {
  try {
    const key = `bmad-workflow-history-${hashPath(projectPath)}`;
    
    // Load existing history
    const result = await window.electronAPI.getSettings();
    let history: WorkflowHistory = {
      projectPath,
      entries: [],
      maxEntries: MAX_HISTORY_ENTRIES,
    };

    if (result.success && result.data) {
      const existingHistory = (result.data as unknown as Record<string, WorkflowHistory>)[key];
      if (existingHistory) {
        history = existingHistory;
      }
    }

    // Add new entry at the beginning
    history.entries.unshift(entry);

    // Trim to max entries
    if (history.entries.length > MAX_HISTORY_ENTRIES) {
      history.entries = history.entries.slice(0, MAX_HISTORY_ENTRIES);
    }

    // Save
    await window.electronAPI.saveSettings({ [key]: history } as any);
  } catch (error) {
    console.error('[WorkflowHistory] Failed to save history:', error);
  }
}

// Simple hash function for project path (to use as storage key)
function hashPath(path: string): string {
  let hash = 0;
  for (let i = 0; i < path.length; i++) {
    const char = path.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
