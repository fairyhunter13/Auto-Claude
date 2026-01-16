/**
 * BMAD Test Project Fixtures
 *
 * Creates complete, realistic BMAD project structures for comprehensive testing.
 * Supports all 4 BMAD phases and configurable project states.
 */

import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import * as yaml from 'js-yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BmadTestProjectOptions {
  /** Base directory for the test project */
  basePath: string;
  /** Project name */
  name?: string;
  /** Project type */
  projectType?: 'greenfield' | 'brownfield';
  /** Current BMAD phase to initialize */
  initialPhase?: 'analysis' | 'planning' | 'solutioning' | 'implementation';
  /** Include sample source code */
  includeSampleCode?: boolean;
  /** Include BMAD artifacts (PRD, Architecture, etc.) */
  includeArtifacts?: boolean;
  /** Programming language for the project */
  language?: 'typescript' | 'python' | 'go' | 'rust';
  /** Initialize git repository */
  initGit?: boolean;
  /** Create target registry */
  includeTargetRegistry?: boolean;
  /** User name for BMAD config */
  userName?: string;
}

export interface BmadTestProject {
  projectPath: string;
  bmadPath: string;
  outputPath: string;
  planningArtifactsPath: string;
  implementationArtifactsPath: string;
  cleanup: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory Structure Creation
// ─────────────────────────────────────────────────────────────────────────────

function createDirectoryStructure(projectPath: string): void {
  const directories = [
    // BMAD Framework
    path.join(projectPath, '_bmad', 'bmm', 'agents'),
    path.join(projectPath, '_bmad', 'bmm', 'config'),
    path.join(projectPath, '_bmad', 'bmm', 'workflows'),
    path.join(projectPath, '_bmad', 'bmm', 'testarch', 'knowledge', 'languages'),
    path.join(projectPath, '_bmad', 'core', 'agents'),
    path.join(projectPath, '_bmad', 'core', 'tasks'),
    path.join(projectPath, '_bmad', 'core', 'workflows'),
    path.join(projectPath, '_bmad', '_config'),
    // Output directories
    path.join(projectPath, '_bmad-output', 'planning-artifacts', 'epics'),
    path.join(projectPath, '_bmad-output', 'implementation-artifacts', 'stories'),
    // Source code
    path.join(projectPath, 'src'),
    path.join(projectPath, 'tests'),
    path.join(projectPath, 'docs'),
  ];

  directories.forEach(dir => mkdirSync(dir, { recursive: true }));
}

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Configuration Files
// ─────────────────────────────────────────────────────────────────────────────

function createBmadConfig(projectPath: string, options: BmadTestProjectOptions): void {
  const config = {
    project_name: options.name || 'Test BMAD Project',
    user_skill_level: 'intermediate',
    planning_artifacts: '{project-root}/_bmad-output/planning-artifacts',
    implementation_artifacts: '{project-root}/_bmad-output/implementation-artifacts',
    project_knowledge: '{project-root}/docs',
    tea_use_mcp_enhancements: false,
    tea_use_playwright_utils: false,
    user_name: options.userName || 'Test User',
    communication_language: 'English',
    document_output_language: 'English',
    output_folder: '{project-root}/_bmad-output',
  };

  writeFileSync(
    path.join(projectPath, '_bmad', 'bmm', 'config.yaml'),
    yaml.dump(config)
  );
}

function createWorkflowStatus(
  projectPath: string,
  options: BmadTestProjectOptions
): void {
  const status: Record<string, unknown> = {
    project_name: options.name || 'Test BMAD Project',
    project_type: options.projectType || 'greenfield',
    current_phase: options.initialPhase || 'analysis',
    phases: {
      analysis: {
        status: options.initialPhase === 'analysis' ? 'pending' : 'completed',
        workflows: {
          'brainstorm-project': { status: 'skipped' },
          research: { status: 'skipped' },
          'product-brief': {
            status: options.initialPhase === 'analysis' ? 'pending' : 'completed',
            ...(options.initialPhase !== 'analysis' && {
              completed_at: new Date().toISOString(),
              artifact_path: 'product-brief.md',
            }),
          },
        },
      },
      planning: {
        status: options.initialPhase === 'planning'
          ? 'in_progress'
          : options.initialPhase === 'analysis'
            ? 'pending'
            : 'completed',
        workflows: {
          prd: {
            status:
              options.initialPhase === 'planning' ||
              options.initialPhase === 'analysis'
                ? 'pending'
                : 'completed',
            ...(options.initialPhase !== 'analysis' &&
              options.initialPhase !== 'planning' && {
                completed_at: new Date().toISOString(),
                artifact_path: 'prd.md',
              }),
          },
          'ux-design': { status: 'skipped', note: 'Not applicable for this project' },
        },
      },
      solutioning: {
        status: options.initialPhase === 'solutioning'
          ? 'in_progress'
          : ['analysis', 'planning'].includes(options.initialPhase || '')
            ? 'pending'
            : 'completed',
        workflows: {
          architecture: {
            status:
              options.initialPhase === 'solutioning'
                ? 'pending'
                : ['analysis', 'planning'].includes(options.initialPhase || '')
                  ? 'pending'
                  : 'completed',
            ...(options.initialPhase === 'implementation' && {
              completed_at: new Date().toISOString(),
              artifact_path: 'architecture.md',
            }),
          },
          epics: {
            status:
              options.initialPhase === 'implementation' ? 'completed' : 'pending',
            ...(options.initialPhase === 'implementation' && {
              completed_at: new Date().toISOString(),
              artifact_path: 'epics.md',
            }),
          },
          'test-design': { status: 'pending' },
          'implementation-readiness': {
            status:
              options.initialPhase === 'implementation' ? 'completed' : 'pending',
            ...(options.initialPhase === 'implementation' && {
              completed_at: new Date().toISOString(),
              artifact_path: 'implementation-readiness-report.md',
              result: 'READY',
            }),
          },
        },
      },
      implementation: {
        status: options.initialPhase === 'implementation' ? 'in_progress' : 'pending',
        current_sprint: options.initialPhase === 'implementation' ? 1 : undefined,
        workflows: {
          'sprint-planning': {
            status:
              options.initialPhase === 'implementation' ? 'completed' : 'pending',
            ...(options.initialPhase === 'implementation' && {
              completed_at: new Date().toISOString(),
              artifact_path: '../implementation-artifacts/sprint-status.yaml',
            }),
          },
          'create-story': { status: 'pending' },
          'dev-story': { status: 'pending' },
          'code-review': { status: 'pending' },
        },
      },
    },
    next_workflow:
      options.initialPhase === 'implementation' ? 'create-story' : 'prd',
  };

  writeFileSync(
    path.join(
      projectPath,
      '_bmad-output',
      'planning-artifacts',
      'bmm-workflow-status.yaml'
    ),
    yaml.dump(status)
  );
}

function createTargetRegistry(projectPath: string): void {
  const registry = {
    targets: {
      research: {
        phase: 1,
        workflow: 'research',
        workflow_path: '_bmad/bmm/workflows/1-analysis/research',
        agent: 'analyst',
        description: 'Conduct market and technical research',
        output: { type: 'file', path: 'research-findings.md' },
        required: false,
      },
      brief: {
        phase: 1,
        workflow: 'create-product-brief',
        workflow_path: '_bmad/bmm/workflows/1-analysis/create-product-brief',
        agent: 'analyst',
        description: 'Create product brief document',
        output: { type: 'file', path: 'product-brief.md' },
        required: false,
      },
      prd: {
        phase: 2,
        workflow: 'prd',
        workflow_path: '_bmad/bmm/workflows/2-plan-workflows/prd',
        agent: 'pm',
        description: 'Create Product Requirements Document',
        output: { type: 'file', path: 'prd.md' },
        required: true,
      },
      'ux-design': {
        phase: 2,
        workflow: 'create-ux-design',
        workflow_path: '_bmad/bmm/workflows/2-plan-workflows/create-ux-design',
        agent: 'ux-designer',
        description: 'Create UX design document',
        output: { type: 'file', path: 'ux-design.md' },
        required: false,
        conditional: { field: 'has_ui', value: true },
      },
      architecture: {
        phase: 3,
        workflow: 'create-architecture',
        workflow_path: '_bmad/bmm/workflows/3-solutioning/create-architecture',
        agent: 'architect',
        description: 'Create system architecture document',
        output: { type: 'file', path: 'architecture.md' },
        required: true,
      },
      epics: {
        phase: 3,
        workflow: 'create-epics-and-stories',
        workflow_path: '_bmad/bmm/workflows/3-solutioning/create-epics-and-stories',
        agent: 'pm',
        description: 'Break down PRD into epics and stories',
        output: { type: 'directory', path: 'epics/', index: 'index.md' },
        required: true,
      },
      'gate-check': {
        phase: 3,
        workflow: 'implementation-readiness',
        workflow_path: '_bmad/bmm/workflows/3-solutioning/implementation-readiness',
        agent: 'architect',
        description: 'Validate implementation readiness',
        output: { type: 'validation', artifact: 'implementation-readiness-report.md' },
        required: true,
      },
      'sprint-ready': {
        phase: 4,
        workflow: 'sprint-planning',
        workflow_path: '_bmad/bmm/workflows/4-implementation/sprint-planning',
        agent: 'sm',
        description: 'Plan the current sprint',
        output: { type: 'file', path: 'sprint-status.yaml' },
        required: true,
      },
      'story-ready': {
        phase: 4,
        workflow: 'create-story',
        workflow_path: '_bmad/bmm/workflows/4-implementation/create-story',
        agent: 'sm',
        description: 'Create detailed story specification',
        output: { type: 'file' },
        required: true,
        repeatable: true,
      },
      implemented: {
        phase: 4,
        workflow: 'dev-story',
        workflow_path: '_bmad/bmm/workflows/4-implementation/dev-story',
        agent: 'dev',
        description: 'Implement user story',
        output: { type: 'code' },
        required: true,
        repeatable: true,
      },
      reviewed: {
        phase: 4,
        workflow: 'code-review',
        workflow_path: '_bmad/bmm/workflows/4-implementation/code-review',
        agent: 'dev',
        description: 'Review implemented code',
        output: { type: 'validation' },
        required: true,
        repeatable: true,
      },
      auto: {
        phase: null,
        workflow: null,
        workflow_path: '',
        agent: null,
        description: 'Run full automation through all required phases',
        output: { type: 'completion' },
        required: false,
      },
    },
    dependencies: {
      prd: { required: [], optional: ['brief', 'research'] },
      'ux-design': { required: ['prd'], optional: [] },
      architecture: { required: ['prd'], optional: ['ux-design'] },
      epics: { required: ['prd', 'architecture'], optional: [] },
      'gate-check': { required: ['prd', 'architecture', 'epics'], optional: [] },
      'sprint-ready': { required: ['epics', 'gate-check'], optional: [] },
      'story-ready': { required: ['sprint-ready'], optional: [] },
      implemented: { required: ['story-ready'], optional: [] },
      reviewed: { required: ['implemented'], optional: [] },
    },
    execution_order: {
      phase_1: { order: ['research', 'brief', 'brainstorm'], required: false },
      phase_2: { order: ['prd', 'ux-design'], required: true },
      phase_3: {
        order: ['architecture', 'test-design', 'epics', 'gate-check'],
        required: true,
      },
      phase_4: {
        order: ['sprint-ready'],
        story_cycle: {
          order: ['story-ready', 'implemented', 'reviewed'],
          repeat_until: 'all_stories_complete',
        },
        epic_completion: {
          order: ['retro'],
          trigger: 'epic_complete',
        },
      },
    },
  };

  writeFileSync(
    path.join(projectPath, '_bmad', 'bmm', 'config', 'target-registry.yaml'),
    yaml.dump(registry)
  );
}

function createLanguageDetectionRules(projectPath: string, language: string): void {
  const rules: Record<string, unknown> = {
    detection_rules: [],
    global_exclusions: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
    detection_settings: {
      max_depth: 5,
      allow_polyglot: true,
    },
  };

  if (language === 'typescript') {
    rules.detection_rules = [
      {
        language: 'typescript',
        display_name: 'TypeScript',
        priority: 100,
        indicators: {
          required_any: [
            { type: 'file', pattern: 'tsconfig.json' },
            { type: 'file', pattern: 'tsconfig.*.json' },
          ],
          optional: [
            { type: 'extension', pattern: '.ts' },
            { type: 'extension', pattern: '.tsx' },
          ],
        },
        test_framework_default: 'vitest',
        test_frameworks_available: [
          {
            id: 'vitest',
            name: 'Vitest',
            config_file: 'vitest.config.ts',
            test_command: 'npm test',
            test_pattern: '**/*.test.ts',
          },
          {
            id: 'jest',
            name: 'Jest',
            config_file: 'jest.config.js',
            test_command: 'npm test',
            test_pattern: '**/*.test.ts',
          },
        ],
        strategy_file: 'languages/typescript/_strategy.md',
        knowledge_fragments: ['typescript-patterns.md', 'node-patterns.md'],
      },
    ];
  } else if (language === 'python') {
    rules.detection_rules = [
      {
        language: 'python',
        display_name: 'Python',
        priority: 100,
        indicators: {
          required_any: [
            { type: 'file', pattern: 'pyproject.toml' },
            { type: 'file', pattern: 'setup.py' },
            { type: 'file', pattern: 'requirements.txt' },
          ],
          optional: [{ type: 'extension', pattern: '.py' }],
        },
        test_framework_default: 'pytest',
        test_frameworks_available: [
          {
            id: 'pytest',
            name: 'Pytest',
            config_file: 'pytest.ini',
            test_command: 'pytest',
            test_pattern: '**/test_*.py',
          },
        ],
        strategy_file: 'languages/python/_strategy.md',
        knowledge_fragments: ['python-patterns.md'],
      },
    ];
  } else if (language === 'go') {
    rules.detection_rules = [
      {
        language: 'go',
        display_name: 'Go',
        priority: 100,
        indicators: {
          required_any: [{ type: 'file', pattern: 'go.mod' }],
          optional: [{ type: 'extension', pattern: '.go' }],
        },
        test_framework_default: 'go-test',
        test_frameworks_available: [
          {
            id: 'go-test',
            name: 'Go Test',
            test_command: 'go test ./...',
            test_pattern: '**/*_test.go',
          },
        ],
        strategy_file: 'languages/go/_strategy.md',
        knowledge_fragments: ['go-patterns.md'],
      },
    ];
  }

  writeFileSync(
    path.join(
      projectPath,
      '_bmad',
      'bmm',
      'testarch',
      'knowledge',
      'languages',
      '_detection-rules.yaml'
    ),
    yaml.dump(rules)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sample Source Code
// ─────────────────────────────────────────────────────────────────────────────

function createTypescriptProject(projectPath: string): void {
  // package.json
  writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(
      {
        name: 'test-bmad-project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          build: 'tsc',
          test: 'vitest',
          dev: 'tsx src/index.ts',
        },
        dependencies: {},
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
          tsx: '^4.0.0',
        },
      },
      null,
      2
    )
  );

  // tsconfig.json
  writeFileSync(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: './dist',
          rootDir: './src',
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2
    )
  );

  // src/index.ts
  writeFileSync(
    path.join(projectPath, 'src', 'index.ts'),
    `/**
 * Main Entry Point
 * Test BMAD Project for E2E Testing
 */

export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// Main execution
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  console.log(greet('BMAD'));
  console.log('2 + 3 =', add(2, 3));
}
`
  );

  // src/utils.ts
  writeFileSync(
    path.join(projectPath, 'src', 'utils.ts'),
    `/**
 * Utility Functions
 */

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function isValidEmail(email: string): boolean {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
`
  );

  // tests/index.test.ts
  writeFileSync(
    path.join(projectPath, 'tests', 'index.test.ts'),
    `import { describe, it, expect } from 'vitest';
import { greet, add, multiply } from '../src/index';

describe('index', () => {
  describe('greet', () => {
    it('should return greeting with name', () => {
      expect(greet('World')).toBe('Hello, World!');
    });
  });

  describe('add', () => {
    it('should add two numbers', () => {
      expect(add(2, 3)).toBe(5);
      expect(add(-1, 1)).toBe(0);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(multiply(2, 3)).toBe(6);
      expect(multiply(-2, 3)).toBe(-6);
    });
  });
});
`
  );

  // tests/utils.test.ts
  writeFileSync(
    path.join(projectPath, 'tests', 'utils.test.ts'),
    `import { describe, it, expect } from 'vitest';
import { capitalize, isValidEmail, formatDate } from '../src/utils';

describe('utils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2026-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('2026-01-15');
    });
  });
});
`
  );

  // vitest.config.ts
  writeFileSync(
    path.join(projectPath, 'vitest.config.ts'),
    `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Artifacts
// ─────────────────────────────────────────────────────────────────────────────

function createBmadArtifacts(
  projectPath: string,
  options: BmadTestProjectOptions
): void {
  const artifactsPath = path.join(projectPath, '_bmad-output', 'planning-artifacts');

  // Product Brief
  writeFileSync(
    path.join(artifactsPath, 'product-brief.md'),
    `# Product Brief: ${options.name || 'Test Project'}

## Overview
A comprehensive test project for validating BMAD workflow execution.

## Problem Statement
Need to validate that all BMAD phases and workflows execute correctly with OpenCode integration.

## Proposed Solution
Create a full TypeScript project with proper structure and test the complete BMAD lifecycle.

## Target Users
- Developers using Auto-BMAD
- QA engineers testing the integration

## Key Features
1. Sample TypeScript codebase
2. Unit tests with Vitest
3. Full BMAD artifact structure

## Success Criteria
- All workflows execute without errors
- Artifacts are generated correctly
- Status tracking works properly
`
  );

  // PRD
  if (
    options.initialPhase &&
    ['solutioning', 'implementation'].includes(options.initialPhase)
  ) {
    writeFileSync(
      path.join(artifactsPath, 'prd.md'),
      `# Product Requirements Document

## Project: ${options.name || 'Test Project'}

## 1. Overview

### 1.1 Purpose
This document defines the requirements for the test BMAD project used in E2E testing.

### 1.2 Scope
- TypeScript-based project
- Unit testing with Vitest
- Full BMAD workflow integration

## 2. Functional Requirements

### FR-001: Core Functions
- **ID**: FR-001
- **Description**: Implement basic utility functions
- **Priority**: High
- **Acceptance Criteria**:
  - [ ] greet() returns formatted greeting
  - [ ] add() performs addition correctly
  - [ ] multiply() performs multiplication correctly

### FR-002: Utility Functions
- **ID**: FR-002
- **Description**: Implement string and date utilities
- **Priority**: Medium
- **Acceptance Criteria**:
  - [ ] capitalize() capitalizes first letter
  - [ ] formatDate() formats dates as YYYY-MM-DD
  - [ ] isValidEmail() validates email format

## 3. Non-Functional Requirements

### NFR-001: Test Coverage
- Minimum 80% code coverage
- All public functions must have unit tests

### NFR-002: Performance
- All functions should execute in < 10ms

## 4. Technical Constraints
- Node.js 20+
- TypeScript 5+
- ESM modules only
`
    );
  }

  // Architecture
  if (options.initialPhase === 'implementation') {
    writeFileSync(
      path.join(artifactsPath, 'architecture.md'),
      `# Architecture Document

## Project: ${options.name || 'Test Project'}

## 1. System Overview

### 1.1 Architecture Pattern
Simple modular TypeScript architecture with clear separation of concerns.

\`\`\`
src/
├── index.ts      # Main entry point, core functions
└── utils.ts      # Utility functions

tests/
├── index.test.ts # Tests for core functions
└── utils.test.ts # Tests for utilities
\`\`\`

## 2. Component Design

### 2.1 Core Module (index.ts)
- Entry point for the application
- Exports core business logic functions
- Can be run directly or imported as a module

### 2.2 Utilities Module (utils.ts)
- Helper functions for string manipulation
- Date formatting utilities
- Validation helpers

## 3. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20+ |
| Language | TypeScript | 5+ |
| Testing | Vitest | 1+ |
| Module System | ESM | - |

## 4. Data Flow

\`\`\`mermaid
graph LR
    A[Input] --> B[Core Functions]
    B --> C[Output]
    A --> D[Utilities]
    D --> B
\`\`\`

## 5. Build & Deployment

### 5.1 Build Process
1. TypeScript compilation via \`tsc\`
2. Output to \`dist/\` directory
3. ESM module format

### 5.2 Test Execution
- \`npm test\` runs Vitest suite
- Coverage reports generated automatically
`
    );

    // Epics
    writeFileSync(
      path.join(artifactsPath, 'epics.md'),
      `# Epics & Stories

## Epic 1: Core Functionality

### Story 1.1: Implement greet function
- **As a** user
- **I want** to call greet() with a name
- **So that** I get a personalized greeting

**Acceptance Criteria:**
- [ ] Returns "Hello, {name}!" format
- [ ] Handles empty string input
- [ ] Unit tests pass

### Story 1.2: Implement math functions
- **As a** user
- **I want** to perform basic math operations
- **So that** I can calculate values

**Acceptance Criteria:**
- [ ] add() returns sum of two numbers
- [ ] multiply() returns product of two numbers
- [ ] Handles negative numbers
- [ ] Unit tests pass

## Epic 2: Utilities

### Story 2.1: Implement string utilities
- **As a** developer
- **I want** string manipulation functions
- **So that** I can format text easily

**Acceptance Criteria:**
- [ ] capitalize() capitalizes first letter
- [ ] Handles edge cases (empty, single char)
- [ ] Unit tests pass

### Story 2.2: Implement validation utilities
- **As a** developer
- **I want** validation helper functions
- **So that** I can validate user input

**Acceptance Criteria:**
- [ ] isValidEmail() validates email format
- [ ] Returns boolean result
- [ ] Unit tests pass
`
    );

    // Implementation Readiness Report
    writeFileSync(
      path.join(artifactsPath, 'implementation-readiness-report.md'),
      `# Implementation Readiness Report

## Project: ${options.name || 'Test Project'}
## Date: ${new Date().toISOString().split('T')[0]}
## Status: READY

## Checklist

### PRD Review
- [x] All functional requirements defined
- [x] Acceptance criteria clear and testable
- [x] Non-functional requirements specified

### Architecture Review
- [x] Technology stack validated
- [x] Component design complete
- [x] Data flow documented

### Epic/Story Review
- [x] All epics linked to requirements
- [x] Stories have clear acceptance criteria
- [x] Estimates provided

### Risk Assessment
- [x] No blocking risks identified
- [x] Technical approach validated

## Recommendation
**PROCEED TO IMPLEMENTATION**

The project is ready for development. All prerequisites are met.
`
    );

    // Sprint Status
    writeFileSync(
      path.join(projectPath, '_bmad-output', 'implementation-artifacts', 'sprint-status.yaml'),
      yaml.dump({
        sprint_number: 1,
        sprint_goal: 'Implement core functionality',
        status: 'in_progress',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stories: [
          { id: 'story-1.1', title: 'Implement greet function', status: 'pending', points: 2 },
          { id: 'story-1.2', title: 'Implement math functions', status: 'pending', points: 3 },
          { id: 'story-2.1', title: 'Implement string utilities', status: 'pending', points: 2 },
          { id: 'story-2.2', title: 'Implement validation utilities', status: 'pending', points: 2 },
        ],
        velocity: 0,
        completed_points: 0,
        total_points: 9,
      })
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Manifest
// ─────────────────────────────────────────────────────────────────────────────

function createAgentManifest(projectPath: string): void {
  const manifest = `name,displayName,title,icon,role,identity,communicationStyle,principles,module,path
"analyst","Mary","Business Analyst","📊","Strategic Business Analyst","Senior analyst with expertise in research","Direct and analytical","Evidence-based analysis","bmm","_bmad/bmm/agents/analyst.md"
"pm","John","Product Manager","📋","Product Manager","8+ years product experience","Direct and data-sharp","User-centered design","bmm","_bmad/bmm/agents/pm.md"
"architect","Winston","Architect","🏗️","System Architect","Expert in distributed systems","Calm and pragmatic","Boring technology for stability","bmm","_bmad/bmm/agents/architect.md"
"ux-designer","Sally","UX Designer","🎨","UX Designer","7+ years creating experiences","Empathetic storyteller","User needs first","bmm","_bmad/bmm/agents/ux-designer.md"
"sm","Bob","Scrum Master","🏃","Scrum Master","Certified SM with tech background","Crisp and checklist-driven","Clear actionable stories","bmm","_bmad/bmm/agents/sm.md"
"dev","Amelia","Developer","💻","Senior Developer","Full-stack engineer","Ultra-succinct","Story file is truth","bmm","_bmad/bmm/agents/dev.md"
"tea","Murat","Test Architect","🧪","Master Test Architect","API and E2E testing expert","Risk-based approach","Quality gates backed by data","bmm","_bmad/bmm/agents/tea.md"
`;

  writeFileSync(path.join(projectPath, '_bmad', '_config', 'agent-manifest.csv'), manifest);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Factory Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a complete BMAD test project
 */
export function createBmadTestProject(
  options: BmadTestProjectOptions
): BmadTestProject {
  const projectPath = path.join(options.basePath, options.name || 'test-bmad-project');

  // Clean up existing
  if (existsSync(projectPath)) {
    rmSync(projectPath, { recursive: true, force: true });
  }

  // Create structure
  createDirectoryStructure(projectPath);

  // Create BMAD config files
  createBmadConfig(projectPath, options);
  createWorkflowStatus(projectPath, options);
  createAgentManifest(projectPath);

  if (options.includeTargetRegistry !== false) {
    createTargetRegistry(projectPath);
  }

  // Create language detection rules
  createLanguageDetectionRules(projectPath, options.language || 'typescript');

  // Create sample code
  if (options.includeSampleCode !== false) {
    if (options.language === 'typescript' || !options.language) {
      createTypescriptProject(projectPath);
    }
  }

  // Create BMAD artifacts
  if (options.includeArtifacts !== false) {
    createBmadArtifacts(projectPath, options);
  }

  // Initialize git
  if (options.initGit !== false) {
    try {
      execSync('git init', { cwd: projectPath, stdio: 'ignore' });
      execSync('git config user.email "e2e@test.local"', { cwd: projectPath, stdio: 'ignore' });
      execSync('git config user.name "E2E Test"', { cwd: projectPath, stdio: 'ignore' });
      // Create .gitignore
      writeFileSync(
        path.join(projectPath, '.gitignore'),
        `node_modules/
dist/
.env
*.log
`
      );
      execSync('git add .', { cwd: projectPath, stdio: 'ignore' });
      execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: 'ignore' });
    } catch {
      // Git init may fail in some environments
    }
  }

  return {
    projectPath,
    bmadPath: path.join(projectPath, '_bmad'),
    outputPath: path.join(projectPath, '_bmad-output'),
    planningArtifactsPath: path.join(projectPath, '_bmad-output', 'planning-artifacts'),
    implementationArtifactsPath: path.join(projectPath, '_bmad-output', 'implementation-artifacts'),
    cleanup: () => {
      if (existsSync(projectPath)) {
        rmSync(projectPath, { recursive: true, force: true });
      }
    },
  };
}

/**
 * Create a minimal BMAD project (faster for simple tests)
 */
export function createMinimalBmadProject(basePath: string, name?: string): BmadTestProject {
  return createBmadTestProject({
    basePath,
    name: name || 'minimal-bmad-test',
    includeSampleCode: false,
    includeArtifacts: false,
    initGit: false,
    initialPhase: 'analysis',
  });
}

/**
 * Create a project ready for implementation phase testing
 */
export function createImplementationReadyProject(
  basePath: string,
  name?: string
): BmadTestProject {
  return createBmadTestProject({
    basePath,
    name: name || 'implementation-ready-test',
    initialPhase: 'implementation',
    includeSampleCode: true,
    includeArtifacts: true,
    initGit: true,
  });
}
