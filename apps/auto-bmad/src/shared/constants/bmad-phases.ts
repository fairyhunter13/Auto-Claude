/**
 * BMAD Phase Constants
 * Defines all phases, workflows, and their relationships for the BMAD methodology
 */

import type {
  BmadPhase,
  BmadPhaseId,
  BmadPhaseName,
  WorkflowDefinition,
  WorkflowId,
  AgentId,
} from '../types/bmad-phase';

// ============================================
// Phase Definitions
// ============================================

export const BMAD_PHASES: Record<BmadPhaseId, BmadPhase> = {
  1: {
    id: 1,
    name: 'analysis',
    displayName: 'Analysis',
    description: 'Optional discovery phase for brainstorming, research, and product brief creation',
    required: false,
    icon: 'search',
  },
  2: {
    id: 2,
    name: 'planning',
    displayName: 'Planning',
    description: 'Core planning phase for PRD and UX design',
    required: true,
    icon: 'clipboard-list',
  },
  3: {
    id: 3,
    name: 'solutioning',
    displayName: 'Solutioning',
    description: 'Technical design phase for architecture, epics, and implementation readiness',
    required: true,
    icon: 'code',
  },
  4: {
    id: 4,
    name: 'implementation',
    displayName: 'Implementation',
    description: 'Sprint-based development with story creation, development, and code review',
    required: true,
    icon: 'rocket',
  },
};

export const BMAD_PHASE_IDS: BmadPhaseId[] = [1, 2, 3, 4];

export const BMAD_PHASE_NAMES: BmadPhaseName[] = ['analysis', 'planning', 'solutioning', 'implementation'];

// ============================================
// Workflow Definitions
// ============================================

export const BMAD_WORKFLOWS: Record<WorkflowId, WorkflowDefinition> = {
  // Phase 1: Analysis
  'brainstorm-project': {
    id: 'brainstorm-project',
    phase: 1,
    name: 'Brainstorm Project',
    description: 'Guided project brainstorming session with final report',
    agent: 'analyst',
    command: '/bmad:bmm:workflows:brainstorming',
    required: false,
    outputArtifact: 'brainstorming-report.md',
    humanReviewRequired: false,
  },
  'research': {
    id: 'research',
    phase: 1,
    name: 'Research',
    description: 'Market, domain, competitive, or technical research',
    agent: 'analyst',
    command: '/bmad:bmm:workflows:research',
    required: false,
    outputArtifact: 'research-findings.md',
    humanReviewRequired: false,
  },
  'product-brief': {
    id: 'product-brief',
    phase: 1,
    name: 'Product Brief',
    description: 'Create a Product Brief as input for PRD',
    agent: 'analyst',
    command: '/bmad:bmm:workflows:create-product-brief',
    required: false,
    outputArtifact: 'product-brief.md',
    humanReviewRequired: true,
  },

  // Phase 2: Planning
  'prd': {
    id: 'prd',
    phase: 2,
    name: 'PRD',
    description: 'Create Product Requirements Document with FRs and NFRs',
    agent: 'pm',
    command: '/bmad:bmm:workflows:create-prd',
    required: true,
    outputArtifact: 'prd.md',
    humanReviewRequired: true,
  },
  'create-ux-design': {
    id: 'create-ux-design',
    phase: 2,
    name: 'UX Design',
    description: 'Create UX design document (if project has UI)',
    agent: 'ux-designer',
    command: '/bmad:bmm:workflows:create-ux-design',
    required: false,
    conditional: 'if_has_ui',
    outputArtifact: 'ux-design.md',
    humanReviewRequired: true,
  },

  // Phase 3: Solutioning
  'create-architecture': {
    id: 'create-architecture',
    phase: 3,
    name: 'Architecture',
    description: 'Create system architecture document',
    agent: 'architect',
    command: '/bmad:bmm:workflows:create-architecture',
    required: true,
    outputArtifact: 'architecture.md',
    humanReviewRequired: true,
  },
  'create-epics-and-stories': {
    id: 'create-epics-and-stories',
    phase: 3,
    name: 'Epics & Stories',
    description: 'Break down PRD into implementable epics and stories',
    agent: 'pm',
    command: '/bmad:bmm:workflows:create-epics-and-stories',
    required: true,
    outputArtifact: 'epics.md',
    humanReviewRequired: true,
  },
  'test-design': {
    id: 'test-design',
    phase: 3,
    name: 'Test Design',
    description: 'System-level testability review',
    agent: 'tea',
    command: '/bmad:bmm:workflows:test-design',
    required: false,
    outputArtifact: 'test-design.md',
    humanReviewRequired: false,
  },
  'implementation-readiness': {
    id: 'implementation-readiness',
    phase: 3,
    name: 'Implementation Readiness',
    description: 'Gate check validating PRD + Architecture + Epics',
    agent: 'architect',
    command: '/bmad:bmm:workflows:implementation-readiness',
    required: true,
    outputArtifact: 'implementation-readiness-report.md',
    humanReviewRequired: true,
    isGate: true,
  },

  // Phase 4: Implementation
  'sprint-planning': {
    id: 'sprint-planning',
    phase: 4,
    name: 'Sprint Planning',
    description: 'Create sprint plan for current epic',
    agent: 'sm',
    command: '/bmad:bmm:workflows:sprint-planning',
    required: true,
    outputArtifact: 'sprint-status.yaml',
    humanReviewRequired: false,
  },
  'create-story': {
    id: 'create-story',
    phase: 4,
    name: 'Create Story',
    description: 'Prepare a story for development',
    agent: 'sm',
    command: '/bmad:bmm:workflows:create-story',
    required: true,
    humanReviewRequired: false,
  },
  'dev-story': {
    id: 'dev-story',
    phase: 4,
    name: 'Dev Story',
    description: 'Implement a prepared story',
    agent: 'dev',
    command: '/bmad:bmm:workflows:dev-story',
    required: true,
    humanReviewRequired: true,
  },
  'code-review': {
    id: 'code-review',
    phase: 4,
    name: 'Code Review',
    description: 'Review completed story implementation',
    agent: 'dev',
    command: '/bmad:bmm:workflows:code-review',
    required: true,
    humanReviewRequired: true,
  },
};

// ============================================
// Phase-Workflow Mappings
// ============================================

export const PHASE_WORKFLOWS: Record<BmadPhaseId, WorkflowId[]> = {
  1: ['brainstorm-project', 'research', 'product-brief'],
  2: ['prd', 'create-ux-design'],
  3: ['create-architecture', 'create-epics-and-stories', 'test-design', 'implementation-readiness'],
  4: ['sprint-planning', 'create-story', 'dev-story', 'code-review'],
};

// ============================================
// Agent Definitions
// ============================================

export const BMAD_AGENTS: Record<AgentId, { name: string; displayName: string; icon: string; title: string }> = {
  'analyst': {
    name: 'analyst',
    displayName: 'Mary',
    icon: 'chart-bar',
    title: 'Business Analyst',
  },
  'pm': {
    name: 'pm',
    displayName: 'John',
    icon: 'clipboard',
    title: 'Product Manager',
  },
  'architect': {
    name: 'architect',
    displayName: 'Winston',
    icon: 'building',
    title: 'Architect',
  },
  'ux-designer': {
    name: 'ux-designer',
    displayName: 'Sally',
    icon: 'palette',
    title: 'UX Designer',
  },
  'sm': {
    name: 'sm',
    displayName: 'Bob',
    icon: 'users',
    title: 'Scrum Master',
  },
  'dev': {
    name: 'dev',
    displayName: 'Amelia',
    icon: 'code',
    title: 'Developer',
  },
  'tea': {
    name: 'tea',
    displayName: 'Murat',
    icon: 'flask',
    title: 'Test Architect',
  },
};

// ============================================
// Phase Status Colors
// ============================================

export const PHASE_STATUS_COLORS: Record<string, string> = {
  locked: 'bg-muted text-muted-foreground border-muted',
  available: 'bg-info/10 text-info border-info/30',
  in_progress: 'bg-warning/10 text-warning border-warning/30',
  review: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  completed: 'bg-success/10 text-success border-success/30',
  skipped: 'bg-muted/50 text-muted-foreground/50 border-muted/50',
};

export const PHASE_STATUS_ICONS: Record<string, string> = {
  locked: 'lock',
  available: 'circle',
  in_progress: 'loader',
  review: 'eye',
  completed: 'check-circle',
  skipped: 'skip-forward',
};

// ============================================
// Workflow Status Colors
// ============================================

export const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  skipped: 'bg-muted/50 text-muted-foreground/50',
  blocked: 'bg-destructive/10 text-destructive',
  failed: 'bg-destructive/10 text-destructive',
};

// ============================================
// Gate Checklist Templates
// ============================================

export const GATE_CHECKLISTS: Record<string, { category: string; description: string; required: boolean; autoValidated: boolean }[]> = {
  'phase-1-to-2': [
    { category: 'Product Brief', description: 'Product brief is complete and reviewed', required: false, autoValidated: false },
    { category: 'Research', description: 'Relevant research has been conducted', required: false, autoValidated: false },
  ],
  'phase-2-to-3': [
    { category: 'PRD', description: 'PRD contains all functional requirements', required: true, autoValidated: true },
    { category: 'PRD', description: 'PRD contains all non-functional requirements', required: true, autoValidated: true },
    { category: 'PRD', description: 'User journeys are clearly defined', required: true, autoValidated: false },
    { category: 'UX', description: 'UX design is complete (if applicable)', required: false, autoValidated: true },
  ],
  'phase-3-to-4': [
    { category: 'Architecture', description: 'System architecture document is complete', required: true, autoValidated: true },
    { category: 'Architecture', description: 'Technology choices are justified', required: true, autoValidated: false },
    { category: 'Epics', description: 'All PRD requirements are covered by epics', required: true, autoValidated: false },
    { category: 'Epics', description: 'Stories have clear acceptance criteria', required: true, autoValidated: false },
    { category: 'Readiness', description: 'Implementation readiness check passed', required: true, autoValidated: true },
  ],
};

// ============================================
// Regression Rules
// ============================================

export const REGRESSION_TARGETS: Record<BmadPhaseId, BmadPhaseId[]> = {
  1: [], // Cannot regress from Phase 1
  2: [1], // Can regress to Phase 1
  3: [1, 2], // Can regress to Phase 1 or 2
  4: [2, 3], // Can regress to Phase 2 or 3 (not 1, too far back)
};

export const REGRESSION_REASONS: Record<string, string[]> = {
  'to-phase-1': [
    'Product vision needs clarification',
    'Additional research required',
    'Market conditions changed',
  ],
  'to-phase-2': [
    'Requirements are incomplete or unclear',
    'User journeys need revision',
    'UX design needs rework',
    'Scope needs adjustment',
  ],
  'to-phase-3': [
    'Architecture issues discovered during implementation',
    'Epic/story definitions need refinement',
    'Technical constraints changed',
    'Performance requirements not achievable with current design',
  ],
};
