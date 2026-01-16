/**
 * BMAD Feature Types
 * 
 * Re-exports types from the preload API for use in renderer components.
 */

export type {
  BmadPhase,
  WorkflowStatusValue,
  BmadConfig,
  WorkflowEntry,
  PhaseStatus,
  BmadWorkflowStatus,
  WorkflowDefinition,
  AgentDefinition,
  ArtifactInfo,
  IpcResult,
  StatusChangeEvent,
  ArtifactChangeEvent,
  WorkflowProgressEvent,
  WorkflowExitEvent,
} from '../../../../preload/api/bmad-api';

// Re-export phase constants
export const BMAD_PHASES = ['analysis', 'planning', 'solutioning', 'implementation'] as const;

// Phase metadata
export interface PhaseMetadata {
  id: BmadPhase;
  name: string;
  description: string;
  icon: string;
  optional: boolean;
}

export const PHASE_METADATA: Record<BmadPhase, PhaseMetadata> = {
  analysis: {
    id: 'analysis',
    name: 'Analysis',
    description: 'Discovery and research phase',
    icon: 'Search',
    optional: true,
  },
  planning: {
    id: 'planning',
    name: 'Planning',
    description: 'Product requirements and design',
    icon: 'FileText',
    optional: false,
  },
  solutioning: {
    id: 'solutioning',
    name: 'Solutioning',
    description: 'Architecture and epic breakdown',
    icon: 'Boxes',
    optional: false,
  },
  implementation: {
    id: 'implementation',
    name: 'Implementation',
    description: 'Sprint planning and development',
    icon: 'Code',
    optional: false,
  },
};

// Import the type for local use
import type { BmadPhase } from '../../../../preload/api/bmad-api';
