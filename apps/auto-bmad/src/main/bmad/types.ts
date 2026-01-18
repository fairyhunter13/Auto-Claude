/**
 * BMAD Type Definitions
 * 
 * Type definitions for BMAD methodology support in Auto-BMAD.
 * Based on the BMAD 6.x specification and _bmad directory structure.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Configuration Schema (from _bmad/bmm/config.yaml)
// ─────────────────────────────────────────────────────────────────────────────

export const BmadConfigSchema = z.object({
  project_name: z.string(),
  user_skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('intermediate'),
  planning_artifacts: z.string().optional().default('{project-root}/_bmad-output/planning-artifacts'),
  implementation_artifacts: z.string().optional().default('{project-root}/_bmad-output/implementation-artifacts'),
  project_knowledge: z.string().optional().default('{project-root}/docs'),
  tea_use_mcp_enhancements: z.boolean().optional().default(false),
  tea_use_playwright_utils: z.boolean().optional().default(false),
  user_name: z.string().optional().default('User'),
  communication_language: z.string().optional().default('English'),
  document_output_language: z.string().optional().default('English'),
  output_folder: z.string().optional().default('{project-root}/_bmad-output'),
});

export type BmadConfig = z.infer<typeof BmadConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Status Schema (from bmm-workflow-status.yaml)
// ─────────────────────────────────────────────────────────────────────────────

export const WorkflowStatusValueSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'blocked',
]);

export type WorkflowStatusValue = z.infer<typeof WorkflowStatusValueSchema>;

export const WorkflowEntrySchema = z.object({
  status: WorkflowStatusValueSchema,
  completed_at: z.string().optional(),
  artifact_path: z.string().optional(),
  note: z.string().optional(),
  result: z.string().optional(),
  current_story: z.string().optional(),
});

export type WorkflowEntry = z.infer<typeof WorkflowEntrySchema>;

export const PhaseStatusSchema = z.object({
  status: WorkflowStatusValueSchema,
  current_sprint: z.number().optional(),
  workflows: z.record(z.string(), WorkflowEntrySchema),
});

export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;

export const BmadWorkflowStatusSchema = z.object({
  project_name: z.string(),
  project_type: z.enum(['greenfield', 'brownfield']).optional().default('greenfield'),
  current_phase: z.enum(['analysis', 'planning', 'solutioning', 'implementation']),
  phases: z.object({
    analysis: PhaseStatusSchema.optional(),
    planning: PhaseStatusSchema.optional(),
    solutioning: PhaseStatusSchema.optional(),
    implementation: PhaseStatusSchema.optional(),
  }),
  next_workflow: z.string().optional(),
  current_story: z.string().optional(),
});

export type BmadWorkflowStatus = z.infer<typeof BmadWorkflowStatusSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Phase Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type BmadPhase = 'analysis' | 'planning' | 'solutioning' | 'implementation';

export const BMAD_PHASES: readonly BmadPhase[] = [
  'analysis',
  'planning',
  'solutioning',
  'implementation',
] as const;

export interface PhaseDefinition {
  id: BmadPhase;
  name: string;
  description: string;
  optional: boolean;
  workflows: WorkflowDefinition[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Definitions
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  phase: BmadPhase;
  agent: string;
  command: string;
  outputFile?: string;
  optional: boolean;
  dependsOn?: string[];
}

// Workflow definitions matching AGENTS.md
export const BMAD_WORKFLOWS: WorkflowDefinition[] = [
  // Phase 1: Analysis (Optional)
  {
    id: 'brainstorm-project',
    name: 'Brainstorm Project',
    description: 'Ideation and brainstorming for project concepts',
    phase: 'analysis',
    agent: 'analyst',
    command: '/bmad:bmm:workflows:brainstorming',
    optional: true,
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Market and technical research',
    phase: 'analysis',
    agent: 'analyst',
    command: '/bmad:bmm:workflows:research',
    optional: true,
  },
  {
    id: 'product-brief',
    name: 'Create Product Brief',
    description: 'High-level product concept document',
    phase: 'analysis',
    agent: 'analyst',
    command: '/bmad:bmm:workflows:create-product-brief',
    outputFile: 'product-brief.md',
    optional: true,
  },

  // Phase 2: Planning (Required)
  {
    id: 'prd',
    name: 'Create PRD',
    description: 'Product Requirements Document with functional requirements',
    phase: 'planning',
    agent: 'pm',
    command: '/bmad:bmm:workflows:create-prd',
    outputFile: 'prd.md',
    optional: false,
  },
  {
    id: 'ux-design',
    name: 'Create UX Design',
    description: 'UX design document for user-facing applications',
    phase: 'planning',
    agent: 'ux-designer',
    command: '/bmad:bmm:workflows:create-ux-design',
    outputFile: 'ux-design.md',
    optional: true, // Only if has UI
  },

  // Phase 3: Solutioning (Required)
  {
    id: 'architecture',
    name: 'Create Architecture',
    description: 'System architecture and technical design',
    phase: 'solutioning',
    agent: 'architect',
    command: '/bmad:bmm:workflows:create-architecture',
    outputFile: 'architecture.md',
    optional: false,
    dependsOn: ['prd'],
  },
  {
    id: 'epics',
    name: 'Create Epics & Stories',
    description: 'Break down requirements into epics and user stories',
    phase: 'solutioning',
    agent: 'pm',
    command: '/bmad:bmm:workflows:create-epics-and-stories',
    outputFile: 'epics.md',
    optional: false,
    dependsOn: ['prd', 'architecture'],
  },
  {
    id: 'test-design',
    name: 'Test Design',
    description: 'Test strategy and test plan',
    phase: 'solutioning',
    agent: 'tea',
    command: '/bmad:bmm:workflows:test-design',
    outputFile: 'test-design.md',
    optional: true,
  },
  {
    id: 'implementation-readiness',
    name: 'Implementation Readiness',
    description: 'Gate check to validate readiness for implementation',
    phase: 'solutioning',
    agent: 'architect',
    command: '/bmad:bmm:workflows:implementation-readiness',
    outputFile: 'implementation-readiness-report.md',
    optional: false,
    dependsOn: ['prd', 'architecture', 'epics'],
  },

  // Phase 4: Implementation (Required)
  {
    id: 'sprint-planning',
    name: 'Sprint Planning',
    description: 'Plan the current sprint with selected stories',
    phase: 'implementation',
    agent: 'sm',
    command: '/bmad:bmm:workflows:sprint-planning',
    outputFile: 'sprint-status.yaml',
    optional: false,
    dependsOn: ['epics'],
  },
  {
    id: 'create-story',
    name: 'Create Story',
    description: 'Create detailed story specification',
    phase: 'implementation',
    agent: 'sm',
    command: '/bmad:bmm:workflows:create-story',
    optional: false,
    dependsOn: ['sprint-planning'],
  },
  {
    id: 'dev-story',
    name: 'Dev Story',
    description: 'Implement a user story',
    phase: 'implementation',
    agent: 'dev',
    command: '/bmad:bmm:workflows:dev-story',
    optional: false,
    dependsOn: ['create-story'],
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review implemented code',
    phase: 'implementation',
    agent: 'dev',
    command: '/bmad:bmm:workflows:code-review',
    optional: false,
    dependsOn: ['dev-story'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Agent Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type AgentModule = 'bmm' | 'cis' | 'core' | 'bmb';

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  module: AgentModule;
  description?: string;
  principles?: string[];
  communicationStyle?: string;
}

/**
 * All BMAD agents across all modules (19 total)
 * 
 * Core (1): bmad-master
 * BMM (9): analyst, architect, dev, pm, quick-flow-solo-dev, sm, tea, tech-writer, ux-designer
 * CIS (6): brainstorming-coach, creative-problem-solver, design-thinking-coach, innovation-strategist, presentation-master, storyteller
 * BMB (3): agent-builder, module-builder, workflow-builder
 */
export const BMAD_AGENTS: AgentDefinition[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Core Module (1 agent)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'bmad-master',
    name: 'BMAD Master',
    role: 'Master Orchestrator',
    module: 'core',
    description: 'Master agent for BMAD methodology orchestration',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BMM Module (9 agents) - BMAD Method Module
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'analyst',
    name: 'Mary',
    role: 'Business Analyst',
    module: 'bmm',
    description: 'Conducts research, creates product briefs, and brainstorms',
  },
  {
    id: 'architect',
    name: 'Winston',
    role: 'Architect',
    module: 'bmm',
    description: 'Designs system architecture, performs gate checks',
  },
  {
    id: 'dev',
    name: 'Amelia',
    role: 'Developer',
    module: 'bmm',
    description: 'Implements features and code',
  },
  {
    id: 'pm',
    name: 'John',
    role: 'Product Manager',
    module: 'bmm',
    description: 'Creates PRD, manages epics and stories',
  },
  {
    id: 'quick-flow-solo-dev',
    name: 'Quick Dev',
    role: 'Solo Developer',
    module: 'bmm',
    description: 'Fast-track development for small projects',
  },
  {
    id: 'sm',
    name: 'Bob',
    role: 'Scrum Master',
    module: 'bmm',
    description: 'Manages sprints, prepares stories',
  },
  {
    id: 'tea',
    name: 'Murat',
    role: 'Test Architect',
    module: 'bmm',
    description: 'Designs test strategies and frameworks',
  },
  {
    id: 'tech-writer',
    name: 'Alex',
    role: 'Technical Writer',
    module: 'bmm',
    description: 'Creates documentation and technical content',
  },
  {
    id: 'ux-designer',
    name: 'Sally',
    role: 'UX Designer',
    module: 'bmm',
    description: 'Creates UX designs and user flows',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CIS Module (6 agents) - Creative Innovation System
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'brainstorming-coach',
    name: 'Brainstorm Coach',
    role: 'Ideation Facilitator',
    module: 'cis',
    description: 'Facilitates brainstorming and ideation sessions',
  },
  {
    id: 'creative-problem-solver',
    name: 'Problem Solver',
    role: 'Creative Problem Solver',
    module: 'cis',
    description: 'Applies creative techniques to solve complex problems',
  },
  {
    id: 'design-thinking-coach',
    name: 'Design Coach',
    role: 'Design Thinking Facilitator',
    module: 'cis',
    description: 'Guides design thinking methodology and workshops',
  },
  {
    id: 'innovation-strategist',
    name: 'Innovation Strategist',
    role: 'Innovation Strategist',
    module: 'cis',
    description: 'Develops innovation strategies and roadmaps',
  },
  {
    id: 'presentation-master',
    name: 'Presentation Master',
    role: 'Presentation Expert',
    module: 'cis',
    description: 'Creates compelling presentations and pitches',
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    role: 'Narrative Designer',
    module: 'cis',
    description: 'Crafts compelling narratives and stories',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BMB Module (3 agents) - BMAD Builder Module
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'agent-builder',
    name: 'Agent Builder',
    role: 'Agent Creator',
    module: 'bmb',
    description: 'Creates and configures new BMAD agents',
  },
  {
    id: 'module-builder',
    name: 'Module Builder',
    role: 'Module Creator',
    module: 'bmb',
    description: 'Creates and configures new BMAD modules',
  },
  {
    id: 'workflow-builder',
    name: 'Workflow Builder',
    role: 'Workflow Creator',
    module: 'bmb',
    description: 'Creates and configures new BMAD workflows',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ArtifactInfo {
  path: string;
  name: string;
  type: 'planning' | 'implementation';
  workflow?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  size?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC Response Types
// ─────────────────────────────────────────────────────────────────────────────

export type IpcResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export function successResult<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

export function errorResult<T>(code: string, message: string): IpcResult<T> {
  return { success: false, error: { code, message } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusChangeEvent {
  type: 'status-change';
  status: BmadWorkflowStatus;
}

export interface ArtifactChangeEvent {
  type: 'artifact-change';
  action: 'add' | 'change' | 'unlink';
  path: string;
  artifact?: ArtifactInfo;
}

export interface WorkflowProgressEvent {
  type: 'workflow-progress';
  workflowId: string;
  phase: BmadPhase;
  status: WorkflowStatusValue;
  message?: string;
}

export type BmadEvent = StatusChangeEvent | ArtifactChangeEvent | WorkflowProgressEvent;

// ─────────────────────────────────────────────────────────────────────────────
// Target Registry Types (from _bmad/bmm/config/target-registry.yaml)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valid BMAD target values for workflow execution stopping points.
 * The `target` field determines where BMAD stops execution.
 */
export type BmadTarget =
  // Phase 1: Analysis
  | 'research'
  | 'brief'
  | 'brainstorm'
  // Phase 2: Planning
  | 'prd'
  | 'ux-design'
  // Phase 3: Solutioning
  | 'architecture'
  | 'test-design'
  | 'epics'
  | 'gate-check'
  // Phase 4: Implementation
  | 'sprint-ready'
  | 'story-ready'
  | 'implemented'
  | 'reviewed'
  | 'retro'
  // TEA Workflows
  | 'test-framework'
  | 'test-framework-polyglot'
  | 'atdd'
  | 'test-coverage'
  | 'test-reviewed'
  | 'trace'
  | 'nfr-tested'
  | 'ci'
  // Quick Flow
  | 'quick-spec'
  | 'quick-dev'
  // Utilities
  | 'documented'
  // Control
  | 'auto';

/**
 * Sub-targets that are created within parent workflows (e.g., diagrams)
 */
export type BmadSubTarget =
  | 'diagram'
  | 'flowchart'
  | 'dataflow'
  | 'wireframe';

/**
 * Output type for a target
 */
export type TargetOutputType = 'file' | 'directory' | 'code' | 'validation' | 'completion';

/**
 * Target definition from target-registry.yaml
 */
export interface TargetDefinition {
  phase: number | null;
  workflow: string | null;
  workflow_path: string;
  agent: string | null;
  description: string;
  output: {
    type: TargetOutputType;
    path?: string;
    artifact?: string | null;
    index?: string;
    alternatives?: string[];
  };
  required: boolean;
  repeatable?: boolean;
  standalone?: boolean;
  conditional?: {
    field: string;
    value: boolean | string;
  };
  sub_targets?: BmadSubTarget[];
}

/**
 * Sub-target definition
 */
export interface SubTargetDefinition {
  parent_targets: BmadTarget[];
  workflow: string;
  workflow_path: string;
  agent: string;
  description: string;
  output: {
    type: TargetOutputType;
    path: string;
  };
}

/**
 * Target dependency definition
 */
export interface TargetDependencies {
  required?: BmadTarget[];
  optional?: BmadTarget[];
}

/**
 * Complete target registry
 */
export interface TargetRegistry {
  targets: Record<BmadTarget, TargetDefinition>;
  sub_targets: Record<BmadSubTarget, SubTargetDefinition>;
  excluded: {
    cis_workflows: string[];
    bmb_workflows: string[];
    utility_workflows: string[];
    core_workflows: string[];
  };
  dependencies: Record<BmadTarget, TargetDependencies>;
  execution_order: {
    phase_1: { order: BmadTarget[]; required: boolean };
    phase_2: { order: BmadTarget[]; required: boolean };
    phase_3: { order: BmadTarget[]; required: boolean };
    phase_4: {
      order: BmadTarget[];
      story_cycle: { order: BmadTarget[]; repeat_until: string };
      epic_completion: { order: BmadTarget[]; trigger: string };
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Language Detection Types (for TEA polyglot support)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Known programming language families for Tier 2 inference
 */
export type LanguageFamily =
  | 'c-family'
  | 'ml-family'
  | 'lisp-family'
  | 'systems-family'
  | 'scripting-family'
  | 'logic-family';

/**
 * Tier levels for language resolution
 */
export type LanguageResolutionTier = 1 | 2 | 3 | 4;

/**
 * Confidence level for language detection
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'minimal';

/**
 * Detected language information
 */
export interface DetectedLanguage {
  language: string;
  displayName: string;
  tier: LanguageResolutionTier;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  priority?: number;
  family?: LanguageFamily;
  strategyFile?: string;
  testFramework?: string;
  testCommand?: string;
  testPattern?: string;
}

/**
 * Language detection result for a project
 */
export interface LanguageDetectionResult {
  primaryLanguage?: DetectedLanguage;
  allLanguages: DetectedLanguage[];
  isPolyglot: boolean;
  unknownExtensions: string[];
  discoveryNeeded: boolean;
}

/**
 * Test framework definition
 */
export interface TestFramework {
  id: string;
  name: string;
  description: string;
  configFile?: string;
  altConfigFiles?: string[];
  testCommand: string;
  testPattern: string;
}

/**
 * Language strategy from _detection-rules.yaml
 */
export interface LanguageStrategy {
  language: string;
  displayName: string;
  priority: number;
  indicators: {
    required?: { type: string; pattern: string }[];
    required_any?: { type: string; pattern: string }[];
    optional?: { type: string; pattern: string }[];
  };
  testFrameworkDefault: string;
  testFrameworksAvailable: TestFramework[];
  strategyFile: string;
  knowledgeFragments: string[];
  families?: LanguageFamily[];
}

/**
 * Family inference result
 */
export interface FamilyInferenceResult {
  family: LanguageFamily;
  confidence: number;
  matchedPatterns: { pattern: string; weight: number }[];
  totalWeight: number;
}

/**
 * Discovery mode settings
 */
export interface DiscoveryModeSettings {
  enabled: boolean;
  mode: 'auto' | 'prompt' | 'disabled';
  allowWebFetch: boolean;
  timeout: number;
  searchQueries: string[];
  provisionalPath: string;
}

/**
 * Discovery result from Tier 3
 */
export interface DiscoveryResult {
  language: string;
  confidence: number;
  sources: ('project_analysis' | 'web_research' | 'existing_tests')[];
  framework?: {
    name: string;
    testCommand: string;
    testPattern: string;
  };
  strategy: string;
  provisional: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Exit Event (enhanced)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowExitEvent {
  type: 'workflow-exit';
  workflowId: string;
  target?: BmadTarget;
  exitCode: number;
  success: boolean;
  outputPath?: string;
  duration: number;
}

// Re-export combined event type
export type BmadEventExtended = BmadEvent | WorkflowExitEvent;
