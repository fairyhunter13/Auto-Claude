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

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  module: 'bmm' | 'cis' | 'core';
  description?: string;
  principles?: string[];
  communicationStyle?: string;
}

// Agent definitions from AGENTS.md
export const BMAD_AGENTS: AgentDefinition[] = [
  {
    id: 'pm',
    name: 'John',
    role: 'Product Manager',
    module: 'bmm',
    description: 'Creates PRD, manages epics and stories',
  },
  {
    id: 'architect',
    name: 'Winston',
    role: 'Architect',
    module: 'bmm',
    description: 'Designs system architecture, performs gate checks',
  },
  {
    id: 'analyst',
    name: 'Mary',
    role: 'Business Analyst',
    module: 'bmm',
    description: 'Conducts research, creates product briefs',
  },
  {
    id: 'ux-designer',
    name: 'Sally',
    role: 'UX Designer',
    module: 'bmm',
    description: 'Creates UX designs and user flows',
  },
  {
    id: 'sm',
    name: 'Bob',
    role: 'Scrum Master',
    module: 'bmm',
    description: 'Manages sprints, prepares stories',
  },
  {
    id: 'dev',
    name: 'Amelia',
    role: 'Developer',
    module: 'bmm',
    description: 'Implements features and code',
  },
  {
    id: 'tea',
    name: 'Murat',
    role: 'Test Architect',
    module: 'bmm',
    description: 'Designs test strategies',
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
