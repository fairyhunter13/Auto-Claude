/**
 * useArtifacts Hook
 * 
 * Connects the ArtifactDashboard to real artifact data from the main process.
 * Subscribes to artifact changes and provides loading/error states.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Artifact, ArtifactStatus } from '../components/ArtifactDashboard';
import type { BmadTarget } from '../components/TargetSelector';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactInfo {
  path: string;
  name: string;
  type: 'planning' | 'implementation';
  workflow?: string;
  createdAt: Date;
  modifiedAt: Date;
  size: number;
}

interface ArtifactChangeEvent {
  type: 'artifact-change';
  action: 'add' | 'change' | 'unlink';
  path: string;
  artifact?: ArtifactInfo;
}

interface UseArtifactsOptions {
  projectPath: string | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseArtifactsReturn {
  artifacts: Artifact[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Mapping
// ─────────────────────────────────────────────────────────────────────────────

const WORKFLOW_TO_TARGET: Record<string, BmadTarget> = {
  'product-brief': 'brief',
  'research': 'research',
  'brainstorm-project': 'brainstorm',
  'prd': 'prd',
  'ux-design': 'ux-design',
  'architecture': 'architecture',
  'test-design': 'test-design',
  'epics': 'epics',
  'implementation-readiness': 'gate-check',
  'sprint-planning': 'sprint-ready',
  'create-story': 'story-ready',
  'dev-story': 'implemented',
  'code-review': 'reviewed',
};

const TARGET_TO_PHASE: Record<BmadTarget, number> = {
  'research': 1, 'brief': 1, 'brainstorm': 1,
  'prd': 2, 'ux-design': 2,
  'architecture': 3, 'test-design': 3, 'epics': 3, 'gate-check': 3,
  'sprint-ready': 4, 'story-ready': 4, 'implemented': 4, 'reviewed': 4, 'retro': 4,
  'test-framework': 4, 'test-framework-polyglot': 4, 'atdd': 4, 'test-coverage': 4,
  'test-reviewed': 4, 'trace': 4, 'nfr-tested': 4, 'ci': 4,
  'quick-spec': 0, 'quick-dev': 0, 'documented': 0, 'auto': 0,
};

const REQUIRED_ARTIFACTS: BmadTarget[] = ['prd', 'architecture', 'epics', 'gate-check', 'sprint-ready'];

function mapArtifactInfoToArtifact(info: ArtifactInfo): Artifact {
  const target = info.workflow ? WORKFLOW_TO_TARGET[info.workflow] || 'research' : 'research';
  
  return {
    id: info.path,
    name: info.name,
    target,
    phase: TARGET_TO_PHASE[target] || 0,
    status: 'completed' as ArtifactStatus, // If we have the file, it's completed
    path: info.path,
    createdAt: info.createdAt,
    modifiedAt: info.modifiedAt,
    size: info.size,
    required: REQUIRED_ARTIFACTS.includes(target),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook Implementation
// ─────────────────────────────────────────────────────────────────────────────

export function useArtifacts({
  projectPath,
  autoRefresh = true,
  refreshInterval = 30000,
}: UseArtifactsOptions): UseArtifactsReturn {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch artifacts from main process
  const fetchArtifacts = useCallback(async () => {
    if (!projectPath) {
      setArtifacts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call IPC to get artifacts
      // @ts-expect-error - window.api is injected by preload
      const result = await window.api?.bmad?.getArtifacts(projectPath);
      
      if (result?.success && result.data) {
        const mappedArtifacts = result.data.map(mapArtifactInfoToArtifact);
        setArtifacts(mappedArtifacts);
      } else if (result?.error) {
        setError(result.error.message);
      } else {
        // Fallback: use mock data if API not available
        setArtifacts(createPendingArtifacts());
      }
    } catch (err) {
      console.error('[useArtifacts] Error fetching artifacts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch artifacts');
      // Use pending artifacts as fallback
      setArtifacts(createPendingArtifacts());
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  // Initial fetch
  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  // Subscribe to artifact changes
  useEffect(() => {
    if (!projectPath) return;

    // @ts-expect-error - window.api is injected by preload
    const unsubscribe = window.api?.bmad?.onArtifactChange?.((event: ArtifactChangeEvent) => {
      if (event.action === 'add' && event.artifact) {
        setArtifacts(prev => {
          const existing = prev.find(a => a.path === event.path);
          if (existing) {
            return prev.map(a => 
              a.path === event.path 
                ? mapArtifactInfoToArtifact(event.artifact!) 
                : a
            );
          }
          return [...prev, mapArtifactInfoToArtifact(event.artifact!)];
        });
      } else if (event.action === 'change' && event.artifact) {
        setArtifacts(prev => 
          prev.map(a => 
            a.path === event.path 
              ? mapArtifactInfoToArtifact(event.artifact!) 
              : a
          )
        );
      } else if (event.action === 'unlink') {
        setArtifacts(prev => prev.filter(a => a.path !== event.path));
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [projectPath]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !projectPath) return;

    const interval = setInterval(fetchArtifacts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, projectPath, refreshInterval, fetchArtifacts]);

  return {
    artifacts,
    isLoading,
    error,
    refresh: fetchArtifacts,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pending Artifacts Template
// ─────────────────────────────────────────────────────────────────────────────

function createPendingArtifacts(): Artifact[] {
  return [
    // Phase 1 (Optional)
    { id: 'research', name: 'Research Findings', target: 'research', phase: 1, status: 'pending', path: 'research-findings.md', required: false },
    { id: 'brief', name: 'Product Brief', target: 'brief', phase: 1, status: 'pending', path: 'product-brief.md', required: false },
    
    // Phase 2 (Required)
    { id: 'prd', name: 'PRD', target: 'prd', phase: 2, status: 'pending', path: 'prd.md', required: true },
    { id: 'ux', name: 'UX Design', target: 'ux-design', phase: 2, status: 'pending', path: 'ux-design.md', required: false },
    
    // Phase 3 (Required)
    { id: 'arch', name: 'Architecture', target: 'architecture', phase: 3, status: 'pending', path: 'architecture.md', required: true },
    { id: 'epics', name: 'Epics & Stories', target: 'epics', phase: 3, status: 'pending', path: 'epics/', required: true },
    { id: 'gate', name: 'Gate Check', target: 'gate-check', phase: 3, status: 'blocked', required: true },
    
    // Phase 4 (Required)
    { id: 'sprint', name: 'Sprint Status', target: 'sprint-ready', phase: 4, status: 'pending', path: 'sprint-status.yaml', required: true },
  ];
}

export { createPendingArtifacts };
