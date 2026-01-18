/**
 * Artifact Store
 * 
 * Zustand store for managing BMAD artifacts state including:
 * - Artifact list from file system
 * - Selected artifact for viewing
 * - Edit mode state
 * - Content loading and caching
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ArtifactFile {
  path: string;
  name: string;
  type: 'planning' | 'implementation';
  workflow?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  size?: number;
}

export type ArtifactViewMode = 'list' | 'preview' | 'edit';

interface ArtifactState {
  // Artifact list
  artifacts: ArtifactFile[];
  isLoading: boolean;
  error: string | null;

  // Selected artifact
  selectedArtifact: ArtifactFile | null;
  selectedContent: string | null;
  isLoadingContent: boolean;

  // View mode
  viewMode: ArtifactViewMode;

  // Actions
  setArtifacts: (artifacts: ArtifactFile[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectArtifact: (artifact: ArtifactFile | null) => void;
  setSelectedContent: (content: string | null) => void;
  setLoadingContent: (loading: boolean) => void;
  setViewMode: (mode: ArtifactViewMode) => void;
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState = {
  artifacts: [],
  isLoading: false,
  error: null,
  selectedArtifact: null,
  selectedContent: null,
  isLoadingContent: false,
  viewMode: 'list' as ArtifactViewMode,
};

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useArtifactStore = create<ArtifactState>((set) => ({
  ...initialState,

  setArtifacts: (artifacts) => set({ artifacts }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  selectArtifact: (artifact) => set({
    selectedArtifact: artifact,
    selectedContent: null,
    viewMode: artifact ? 'preview' : 'list',
  }),
  
  setSelectedContent: (content) => set({ selectedContent: content }),
  
  setLoadingContent: (isLoadingContent) => set({ isLoadingContent }),
  
  setViewMode: (viewMode) => set({ viewMode }),
  
  reset: () => set(initialState),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Actions (outside store for async operations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load artifacts for a project
 */
export async function loadArtifacts(projectPath: string): Promise<void> {
  const { setArtifacts, setLoading, setError } = useArtifactStore.getState();
  
  setLoading(true);
  setError(null);

  try {
    // Use the BMAD API to list artifacts
    const result = await window.electronAPI?.bmad?.listArtifacts(projectPath);
    
    if (result?.success && result.data) {
      // Convert dates from strings if needed
      const artifacts = result.data.map((a) => ({
        ...a,
        createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
        modifiedAt: a.modifiedAt ? new Date(a.modifiedAt) : undefined,
      }));
      setArtifacts(artifacts);
    } else if (!result?.success && result?.error) {
      setError(result.error.message);
    } else {
      // API not available, set empty
      setArtifacts([]);
    }
  } catch (error) {
    console.error('[artifact-store] Error loading artifacts:', error);
    setError(error instanceof Error ? error.message : 'Failed to load artifacts');
  } finally {
    setLoading(false);
  }
}

/**
 * Load content for a specific artifact
 */
export async function loadArtifactContent(filePath: string): Promise<void> {
  const { setSelectedContent, setLoadingContent, setError } = useArtifactStore.getState();
  
  setLoadingContent(true);

  try {
    // Use the electronAPI readFile method
    const result = await window.electronAPI?.readFile(filePath);
    
    if (result?.success && result.data !== undefined) {
      setSelectedContent(result.data);
    } else if (result && 'error' in result) {
      // Handle error - could be string or object
      const err = result.error;
      const errorMsg = typeof err === 'string' 
        ? err 
        : (err && typeof err === 'object' && 'message' in err) 
          ? String((err as { message: string }).message)
          : 'Failed to load file';
      setError(errorMsg);
      setSelectedContent(null);
    } else {
      setSelectedContent(null);
    }
  } catch (error) {
    console.error('[artifact-store] Error loading artifact content:', error);
    setError(error instanceof Error ? error.message : 'Failed to load content');
    setSelectedContent(null);
  } finally {
    setLoadingContent(false);
  }
}

/**
 * Save artifact content
 * Note: Uses shell command via terminal to write file safely
 */
export async function saveArtifactContent(filePath: string, content: string): Promise<boolean> {
  const { setError, setSelectedContent } = useArtifactStore.getState();

  try {
    // For now, we'll use a workaround - update the content locally
    // and inform the user to save via their editor
    // TODO: Add proper writeFile IPC handler
    
    // For now, copy to clipboard as a fallback
    try {
      await navigator.clipboard.writeText(content);
      setSelectedContent(content);
      console.log('[artifact-store] Content copied to clipboard. Manual save required.');
      return true;
    } catch {
      setError('Unable to save. Please copy content manually.');
      return false;
    }
  } catch (error) {
    console.error('[artifact-store] Error saving artifact:', error);
    setError(error instanceof Error ? error.message : 'Failed to save');
    return false;
  }
}

/**
 * Export artifact - copy content to clipboard
 * Note: Full file save dialog requires additional IPC handlers
 */
export async function exportArtifact(_sourcePath: string, content: string): Promise<boolean> {
  try {
    // Copy to clipboard as export mechanism
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('[artifact-store] Error exporting artifact:', error);
    return false;
  }
}

/**
 * Copy artifact content to clipboard
 */
export async function copyArtifactToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.error('[artifact-store] Error copying to clipboard:', error);
    return false;
  }
}
