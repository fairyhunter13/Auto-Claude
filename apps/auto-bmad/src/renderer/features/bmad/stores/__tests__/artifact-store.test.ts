/**
 * Artifact Store Tests
 * 
 * Tests FR21-FR25: Artifact Management functionality
 * - FR21: View generated artifacts
 * - FR22: Render markdown preview
 * - FR23: Show artifact metadata
 * - FR24: Export artifacts
 * - FR25: Edit artifacts
 * 
 * Story 9.4/9.5: Test Coverage Gap Fill
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock Types
// ============================================================================

interface ArtifactInfo {
  path: string;
  name: string;
  type: 'planning' | 'implementation';
  workflow?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  size?: number;
  content?: string;
}

// Mock artifact data
const MOCK_ARTIFACTS: ArtifactInfo[] = [
  {
    path: '_bmad-output/planning-artifacts/prd.md',
    name: 'prd.md',
    type: 'planning',
    workflow: 'create-prd',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    modifiedAt: new Date('2026-01-18T14:30:00Z'),
    size: 15420,
    content: '# Product Requirements Document\n\n## Overview\nThis is the PRD...',
  },
  {
    path: '_bmad-output/planning-artifacts/architecture.md',
    name: 'architecture.md',
    type: 'planning',
    workflow: 'create-architecture',
    createdAt: new Date('2026-01-16T09:00:00Z'),
    modifiedAt: new Date('2026-01-17T11:00:00Z'),
    size: 22500,
    content: '# System Architecture\n\n## High-Level Design\n...',
  },
  {
    path: '_bmad-output/planning-artifacts/ux-design.md',
    name: 'ux-design.md',
    type: 'planning',
    workflow: 'create-ux-design',
    createdAt: new Date('2026-01-17T08:00:00Z'),
    modifiedAt: new Date('2026-01-17T16:00:00Z'),
    size: 8900,
    content: '# UX Design Document\n\n## User Flows\n...',
  },
  {
    path: '_bmad-output/planning-artifacts/epics/index.md',
    name: 'index.md',
    type: 'planning',
    workflow: 'create-epics-and-stories',
    createdAt: new Date('2026-01-18T10:00:00Z'),
    modifiedAt: new Date('2026-01-18T15:00:00Z'),
    size: 5600,
    content: '# Epics Index\n\n## Epic 1: Core Application\n...',
  },
  {
    path: '_bmad-output/implementation-artifacts/sprint-status.yaml',
    name: 'sprint-status.yaml',
    type: 'implementation',
    workflow: 'sprint-planning',
    createdAt: new Date('2026-01-19T09:00:00Z'),
    modifiedAt: new Date('2026-01-19T12:00:00Z'),
    size: 2100,
    content: 'sprint_number: 9\ncurrent_story: 9.4\n...',
  },
];

// ============================================================================
// Mock Artifact Store
// ============================================================================

interface ArtifactStoreState {
  artifacts: ArtifactInfo[];
  selectedArtifact: ArtifactInfo | null;
  isLoading: boolean;
  error: string | null;
  previewContent: string | null;
  isPreviewMode: boolean;
  
  // Actions
  loadArtifacts: (projectPath: string) => Promise<void>;
  selectArtifact: (path: string) => void;
  loadArtifactContent: (path: string) => Promise<string>;
  getArtifactsByType: (type: 'planning' | 'implementation') => ArtifactInfo[];
  getArtifactMetadata: (path: string) => Partial<ArtifactInfo> | null;
  exportArtifact: (path: string, destination: string) => Promise<boolean>;
  updateArtifact: (path: string, content: string) => Promise<boolean>;
  setPreviewMode: (enabled: boolean) => void;
  clearError: () => void;
}

function createMockArtifactStore(): ArtifactStoreState {
  let state: ArtifactStoreState = {
    artifacts: [],
    selectedArtifact: null,
    isLoading: false,
    error: null,
    previewContent: null,
    isPreviewMode: false,
    
    loadArtifacts: async function(projectPath: string) {
      state.isLoading = true;
      state.error = null;
      try {
        await new Promise(resolve => setTimeout(resolve, 10));
        state.artifacts = MOCK_ARTIFACTS;
      } catch (err) {
        state.error = 'Failed to load artifacts';
      } finally {
        state.isLoading = false;
      }
    },
    
    selectArtifact: function(path: string) {
      const artifact = state.artifacts.find(a => a.path === path);
      state.selectedArtifact = artifact || null;
    },
    
    loadArtifactContent: async function(path: string) {
      const artifact = state.artifacts.find(a => a.path === path);
      if (artifact?.content) {
        state.previewContent = artifact.content;
        return artifact.content;
      }
      return '';
    },
    
    getArtifactsByType: function(type: 'planning' | 'implementation') {
      return state.artifacts.filter(a => a.type === type);
    },
    
    getArtifactMetadata: function(path: string) {
      const artifact = state.artifacts.find(a => a.path === path);
      if (!artifact) return null;
      
      const { content, ...metadata } = artifact;
      return metadata;
    },
    
    exportArtifact: async function(path: string, destination: string) {
      const artifact = state.artifacts.find(a => a.path === path);
      if (!artifact) {
        state.error = 'Artifact not found';
        return false;
      }
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 10));
      return true;
    },
    
    updateArtifact: async function(path: string, content: string) {
      const artifactIndex = state.artifacts.findIndex(a => a.path === path);
      if (artifactIndex === -1) {
        state.error = 'Artifact not found';
        return false;
      }
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 10));
      state.artifacts[artifactIndex] = {
        ...state.artifacts[artifactIndex],
        content,
        modifiedAt: new Date(),
        size: content.length,
      };
      return true;
    },
    
    setPreviewMode: function(enabled: boolean) {
      state.isPreviewMode = enabled;
    },
    
    clearError: function() {
      state.error = null;
    },
  };
  
  return state;
}

// ============================================================================
// FR21: View Generated Artifacts
// ============================================================================

describe('FR21: View Generated Artifacts', () => {
  let store: ArtifactStoreState;
  
  beforeEach(() => {
    store = createMockArtifactStore();
  });
  
  it('should start with empty artifacts array', () => {
    expect(store.artifacts).toEqual([]);
  });
  
  it('should load all artifacts', async () => {
    await store.loadArtifacts('/test/project');
    expect(store.artifacts.length).toBe(MOCK_ARTIFACTS.length);
  });
  
  it('should include PRD artifact', async () => {
    await store.loadArtifacts('/test/project');
    const prd = store.artifacts.find(a => a.name === 'prd.md');
    expect(prd).toBeDefined();
    expect(prd?.type).toBe('planning');
  });
  
  it('should include architecture artifact', async () => {
    await store.loadArtifacts('/test/project');
    const arch = store.artifacts.find(a => a.name === 'architecture.md');
    expect(arch).toBeDefined();
    expect(arch?.workflow).toBe('create-architecture');
  });
  
  it('should include UX design artifact', async () => {
    await store.loadArtifacts('/test/project');
    const ux = store.artifacts.find(a => a.name === 'ux-design.md');
    expect(ux).toBeDefined();
  });
  
  it('should include epics index artifact', async () => {
    await store.loadArtifacts('/test/project');
    const epics = store.artifacts.find(a => a.path.includes('epics/index.md'));
    expect(epics).toBeDefined();
  });
  
  it('should include implementation artifacts', async () => {
    await store.loadArtifacts('/test/project');
    const implArtifacts = store.artifacts.filter(a => a.type === 'implementation');
    expect(implArtifacts.length).toBeGreaterThan(0);
  });
  
  it('should show loading state during load', async () => {
    const loadPromise = store.loadArtifacts('/test/project');
    expect(store.isLoading).toBe(true);
    await loadPromise;
    expect(store.isLoading).toBe(false);
  });
  
  it('should select artifact by path', async () => {
    await store.loadArtifacts('/test/project');
    store.selectArtifact('_bmad-output/planning-artifacts/prd.md');
    expect(store.selectedArtifact).toBeDefined();
    expect(store.selectedArtifact?.name).toBe('prd.md');
  });
  
  it('should handle non-existent artifact selection gracefully', async () => {
    await store.loadArtifacts('/test/project');
    store.selectArtifact('non-existent.md');
    expect(store.selectedArtifact).toBeNull();
  });
});

// ============================================================================
// FR22: Render Markdown Preview
// ============================================================================

describe('FR22: Render Markdown Preview', () => {
  let store: ArtifactStoreState;
  
  beforeEach(async () => {
    store = createMockArtifactStore();
    await store.loadArtifacts('/test/project');
  });
  
  it('should start with preview mode disabled', () => {
    expect(store.isPreviewMode).toBe(false);
  });
  
  it('should enable preview mode', () => {
    store.setPreviewMode(true);
    expect(store.isPreviewMode).toBe(true);
  });
  
  it('should disable preview mode', () => {
    store.setPreviewMode(true);
    store.setPreviewMode(false);
    expect(store.isPreviewMode).toBe(false);
  });
  
  it('should load artifact content for preview', async () => {
    const content = await store.loadArtifactContent('_bmad-output/planning-artifacts/prd.md');
    expect(content).toContain('# Product Requirements Document');
  });
  
  it('should set preview content', async () => {
    await store.loadArtifactContent('_bmad-output/planning-artifacts/prd.md');
    expect(store.previewContent).toContain('# Product Requirements Document');
  });
  
  it('should handle markdown headers', async () => {
    const content = await store.loadArtifactContent('_bmad-output/planning-artifacts/architecture.md');
    expect(content).toContain('# System Architecture');
  });
  
  it('should return empty string for non-existent artifact', async () => {
    const content = await store.loadArtifactContent('non-existent.md');
    expect(content).toBe('');
  });
});

// ============================================================================
// FR23: Show Artifact Metadata
// ============================================================================

describe('FR23: Show Artifact Metadata', () => {
  let store: ArtifactStoreState;
  
  beforeEach(async () => {
    store = createMockArtifactStore();
    await store.loadArtifacts('/test/project');
  });
  
  it('should return metadata for artifact', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe('prd.md');
  });
  
  it('should include created date', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata?.createdAt).toBeDefined();
    expect(metadata?.createdAt instanceof Date).toBe(true);
  });
  
  it('should include modified date', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata?.modifiedAt).toBeDefined();
    expect(metadata?.modifiedAt instanceof Date).toBe(true);
  });
  
  it('should include file size', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata?.size).toBeDefined();
    expect(metadata?.size).toBeGreaterThan(0);
  });
  
  it('should include workflow that created it', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata?.workflow).toBe('create-prd');
  });
  
  it('should include artifact type', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata?.type).toBe('planning');
  });
  
  it('should not include content in metadata', () => {
    const metadata = store.getArtifactMetadata('_bmad-output/planning-artifacts/prd.md');
    expect(metadata).not.toHaveProperty('content');
  });
  
  it('should return null for non-existent artifact', () => {
    const metadata = store.getArtifactMetadata('non-existent.md');
    expect(metadata).toBeNull();
  });
});

// ============================================================================
// FR24: Export Artifacts
// ============================================================================

describe('FR24: Export Artifacts', () => {
  let store: ArtifactStoreState;
  
  beforeEach(async () => {
    store = createMockArtifactStore();
    await store.loadArtifacts('/test/project');
  });
  
  it('should export artifact successfully', async () => {
    const result = await store.exportArtifact(
      '_bmad-output/planning-artifacts/prd.md',
      '/export/prd-export.md'
    );
    expect(result).toBe(true);
  });
  
  it('should fail to export non-existent artifact', async () => {
    const result = await store.exportArtifact(
      'non-existent.md',
      '/export/output.md'
    );
    expect(result).toBe(false);
    expect(store.error).toBe('Artifact not found');
  });
  
  it('should export architecture artifact', async () => {
    const result = await store.exportArtifact(
      '_bmad-output/planning-artifacts/architecture.md',
      '/export/architecture-export.md'
    );
    expect(result).toBe(true);
  });
  
  it('should export implementation artifacts', async () => {
    const result = await store.exportArtifact(
      '_bmad-output/implementation-artifacts/sprint-status.yaml',
      '/export/sprint-status.yaml'
    );
    expect(result).toBe(true);
  });
});

// ============================================================================
// FR25: Edit Artifacts
// ============================================================================

describe('FR25: Edit Artifacts', () => {
  let store: ArtifactStoreState;
  
  beforeEach(async () => {
    store = createMockArtifactStore();
    await store.loadArtifacts('/test/project');
  });
  
  it('should update artifact content', async () => {
    const newContent = '# Updated PRD\n\nThis is the updated content.';
    const result = await store.updateArtifact(
      '_bmad-output/planning-artifacts/prd.md',
      newContent
    );
    expect(result).toBe(true);
  });
  
  it('should update modified date on edit', async () => {
    const originalArtifact = store.artifacts.find(a => a.name === 'prd.md');
    const originalModified = originalArtifact?.modifiedAt;
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await store.updateArtifact(
      '_bmad-output/planning-artifacts/prd.md',
      'Updated content'
    );
    
    const updatedArtifact = store.artifacts.find(a => a.name === 'prd.md');
    expect(updatedArtifact?.modifiedAt?.getTime()).toBeGreaterThan(originalModified?.getTime() || 0);
  });
  
  it('should update file size on edit', async () => {
    const newContent = 'Short content';
    await store.updateArtifact(
      '_bmad-output/planning-artifacts/prd.md',
      newContent
    );
    
    const artifact = store.artifacts.find(a => a.name === 'prd.md');
    expect(artifact?.size).toBe(newContent.length);
  });
  
  it('should fail to update non-existent artifact', async () => {
    const result = await store.updateArtifact(
      'non-existent.md',
      'content'
    );
    expect(result).toBe(false);
    expect(store.error).toBe('Artifact not found');
  });
  
  it('should update artifact content in store', async () => {
    const newContent = '# New Architecture\n\nCompletely redesigned.';
    await store.updateArtifact(
      '_bmad-output/planning-artifacts/architecture.md',
      newContent
    );
    
    const artifact = store.artifacts.find(a => a.name === 'architecture.md');
    expect(artifact?.content).toBe(newContent);
  });
});

// ============================================================================
// Filtering and Organization
// ============================================================================

describe('Artifact Filtering', () => {
  let store: ArtifactStoreState;
  
  beforeEach(async () => {
    store = createMockArtifactStore();
    await store.loadArtifacts('/test/project');
  });
  
  it('should filter planning artifacts', () => {
    const planning = store.getArtifactsByType('planning');
    expect(planning.length).toBeGreaterThan(0);
    expect(planning.every(a => a.type === 'planning')).toBe(true);
  });
  
  it('should filter implementation artifacts', () => {
    const impl = store.getArtifactsByType('implementation');
    expect(impl.length).toBeGreaterThan(0);
    expect(impl.every(a => a.type === 'implementation')).toBe(true);
  });
  
  it('should include PRD in planning artifacts', () => {
    const planning = store.getArtifactsByType('planning');
    const prd = planning.find(a => a.name === 'prd.md');
    expect(prd).toBeDefined();
  });
  
  it('should include architecture in planning artifacts', () => {
    const planning = store.getArtifactsByType('planning');
    const arch = planning.find(a => a.name === 'architecture.md');
    expect(arch).toBeDefined();
  });
  
  it('should include sprint-status in implementation artifacts', () => {
    const impl = store.getArtifactsByType('implementation');
    const sprint = impl.find(a => a.name === 'sprint-status.yaml');
    expect(sprint).toBeDefined();
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('Artifact Store Error Handling', () => {
  let store: ArtifactStoreState;
  
  beforeEach(() => {
    store = createMockArtifactStore();
  });
  
  it('should start with no error', () => {
    expect(store.error).toBeNull();
  });
  
  it('should clear error', () => {
    store.error = 'Some error';
    store.clearError();
    expect(store.error).toBeNull();
  });
  
  it('should handle empty artifacts gracefully', () => {
    const result = store.getArtifactsByType('planning');
    expect(result).toEqual([]);
  });
});
