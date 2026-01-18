/**
 * Comprehensive Unit Tests for BMAD Core Modules
 *
 * Tests all BMAD functionality without requiring OpenCode CLI.
 * These tests validate the internal logic of all BMAD modules.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import * as yaml from 'yaml';

// Mock modules before importing
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Import modules after mocking
import {
  loadBmadConfig,
  getDefaultConfig,
  getConfigPath,
  hasBmadConfig,
  isBmadProject,
} from '../config-loader';

import {
  StatusManager,
  getStatusManager,
  disposeStatusManager,
  getStatusPath,
  hasStatusFile,
} from '../status-manager';

import {
  isValidBmadTarget,
  getTargetDisplayName,
  getTargetPhase,
  groupTargetsByPhase,
  loadTargetRegistry,
  clearRegistryCache,
} from '../target-runner';

import {
  BMAD_WORKFLOWS,
  BMAD_AGENTS,
  BMAD_PHASES,
  type BmadPhase,
  type WorkflowDefinition,
  type BmadTarget,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Test Setup
// ─────────────────────────────────────────────────────────────────────────────

const TEST_DIR = '/tmp/bmad-unit-tests';
const TEST_PROJECT_DIR = path.join(TEST_DIR, 'test-project');

function createTestProject(options: {
  withConfig?: boolean;
  withStatus?: boolean;
  withTargetRegistry?: boolean;
} = {}): void {
  // Clean up
  if (existsSync(TEST_PROJECT_DIR)) {
    rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
  }

  // Create directories
  mkdirSync(path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config'), { recursive: true });
  mkdirSync(path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts'), { recursive: true });
  mkdirSync(path.join(TEST_PROJECT_DIR, '_bmad-output', 'implementation-artifacts'), { recursive: true });

  // Create config if requested
  if (options.withConfig !== false) {
    const config = {
      project_name: 'Test Project',
      user_skill_level: 'intermediate',
      planning_artifacts: '{project-root}/_bmad-output/planning-artifacts',
      implementation_artifacts: '{project-root}/_bmad-output/implementation-artifacts',
      project_knowledge: '{project-root}/docs',
      tea_use_mcp_enhancements: false,
      tea_use_playwright_utils: false,
      user_name: 'Test User',
      communication_language: 'English',
      document_output_language: 'English',
      output_folder: '{project-root}/_bmad-output',
    };
    writeFileSync(
      path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config.yaml'),
      yaml.stringify(config)
    );
  }

  // Create status if requested
  if (options.withStatus !== false) {
    const status = {
      project_name: 'Test Project',
      project_type: 'greenfield',
      current_phase: 'planning',
      phases: {
        analysis: { status: 'completed', workflows: {} },
        planning: {
          status: 'in_progress',
          workflows: {
            prd: { status: 'pending' },
            'ux-design': { status: 'skipped' },
          },
        },
        solutioning: { status: 'pending', workflows: {} },
        implementation: { status: 'pending', workflows: {} },
      },
    };
    writeFileSync(
      path.join(TEST_PROJECT_DIR, '_bmad-output', 'planning-artifacts', 'bmm-workflow-status.yaml'),
      yaml.stringify(status)
    );
  }

  // Create target registry if requested
  if (options.withTargetRegistry) {
    const registry = {
      targets: {
        prd: {
          phase: 2,
          workflow: 'prd',
          workflow_path: '_bmad/bmm/workflows/2-plan-workflows/prd',
          agent: 'pm',
          description: 'Create PRD',
          output: { type: 'file', path: 'prd.md' },
          required: true,
        },
        architecture: {
          phase: 3,
          workflow: 'create-architecture',
          workflow_path: '_bmad/bmm/workflows/3-solutioning/create-architecture',
          agent: 'architect',
          description: 'Create architecture',
          output: { type: 'file', path: 'architecture.md' },
          required: true,
        },
      },
      dependencies: {
        prd: { required: [], optional: [] },
        architecture: { required: ['prd'], optional: [] },
      },
      execution_order: {
        phase_1: { order: ['research', 'brief'], required: false },
        phase_2: { order: ['prd', 'ux-design'], required: true },
        phase_3: { order: ['architecture', 'epics', 'gate-check'], required: true },
        phase_4: { order: ['sprint-ready'], story_cycle: { order: ['story-ready', 'implemented', 'reviewed'], repeat_until: 'all_stories_complete' }, epic_completion: { order: ['retro'], trigger: 'epic_complete' } },
      },
    };
    writeFileSync(
      path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config', 'target-registry.yaml'),
      yaml.stringify(registry)
    );
  }
}

function cleanupTestProject(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Loader Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Config Loader', () => {
  beforeEach(() => {
    createTestProject({ withConfig: true });
  });

  afterEach(() => {
    cleanupTestProject();
  });

  describe('getConfigPath', () => {
    it('should return correct config path', () => {
      const configPath = getConfigPath(TEST_PROJECT_DIR);
      expect(configPath).toBe(path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config.yaml'));
    });
  });

  describe('hasBmadConfig', () => {
    it('should return true when config exists', async () => {
      const result = await hasBmadConfig(TEST_PROJECT_DIR);
      expect(result).toBe(true);
    });

    it('should return false when config does not exist', async () => {
      const result = await hasBmadConfig('/non/existent/path');
      expect(result).toBe(false);
    });
  });

  describe('isBmadProject', () => {
    it('should return true for BMAD project', async () => {
      const result = await isBmadProject(TEST_PROJECT_DIR);
      expect(result).toBe(true);
    });

    it('should return false for non-BMAD project', async () => {
      const result = await isBmadProject('/tmp');
      expect(result).toBe(false);
    });
  });

  describe('loadBmadConfig', () => {
    it('should load and parse config successfully', async () => {
      const result = await loadBmadConfig(TEST_PROJECT_DIR);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Test Project');
        expect(result.data.user_name).toBe('Test User');
        expect(result.data.user_skill_level).toBe('intermediate');
      }
    });

    it('should resolve path variables', async () => {
      const result = await loadBmadConfig(TEST_PROJECT_DIR);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.planning_artifacts).toContain(TEST_PROJECT_DIR);
        expect(result.data.output_folder).toContain(TEST_PROJECT_DIR);
      }
    });

    it('should return error for missing config', async () => {
      const result = await loadBmadConfig('/non/existent/path');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFIG_NOT_FOUND');
      }
    });

    it('should return error for invalid YAML', async () => {
      writeFileSync(
        path.join(TEST_PROJECT_DIR, '_bmad', 'bmm', 'config.yaml'),
        'invalid: yaml: content: [unclosed'
      );

      const result = await loadBmadConfig(TEST_PROJECT_DIR);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFIG_PARSE_ERROR');
      }
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default config with project name', () => {
      const config = getDefaultConfig(TEST_PROJECT_DIR, 'Custom Name');

      expect(config.project_name).toBe('Custom Name');
      expect(config.user_skill_level).toBe('intermediate');
      expect(config.tea_use_mcp_enhancements).toBe(false);
    });

    it('should derive project name from path', () => {
      const config = getDefaultConfig(TEST_PROJECT_DIR);

      expect(config.project_name).toBe('test-project');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Status Manager Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Status Manager', () => {
  beforeEach(async () => {
    createTestProject({ withStatus: true });
    await disposeStatusManager();
  });

  afterEach(async () => {
    await disposeStatusManager();
    cleanupTestProject();
  });

  describe('getStatusPath', () => {
    it('should return correct status path', () => {
      const statusPath = getStatusPath(TEST_PROJECT_DIR);
      expect(statusPath).toContain('bmm-workflow-status.yaml');
    });
  });

  describe('hasStatusFile', () => {
    it('should return true when status file exists', async () => {
      const result = await hasStatusFile(TEST_PROJECT_DIR);
      expect(result).toBe(true);
    });

    it('should return false when status file does not exist', async () => {
      const result = await hasStatusFile('/non/existent/path');
      expect(result).toBe(false);
    });
  });

  describe('StatusManager.read', () => {
    it('should read and parse status file', async () => {
      const manager = getStatusManager(TEST_PROJECT_DIR);
      const result = await manager.read();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Test Project');
        expect(result.data.current_phase).toBe('planning');
        expect(result.data.project_type).toBe('greenfield');
      }
    });

    it('should return error for missing file', async () => {
      const manager = new StatusManager('/non/existent/path');
      const result = await manager.read();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATUS_NOT_FOUND');
      }
    });
  });

  describe('StatusManager.write', () => {
    it('should write status file atomically', async () => {
      const manager = getStatusManager(TEST_PROJECT_DIR);

      const status = {
        project_name: 'Updated Project',
        project_type: 'greenfield' as const,
        current_phase: 'solutioning' as const,
        phases: {
          analysis: { status: 'completed' as const, workflows: {} },
          planning: { status: 'completed' as const, workflows: {} },
          solutioning: { status: 'in_progress' as const, workflows: {} },
          implementation: { status: 'pending' as const, workflows: {} },
        },
      };

      const writeResult = await manager.write(status);
      expect(writeResult.success).toBe(true);

      const readResult = await manager.read();
      expect(readResult.success).toBe(true);
      if (readResult.success) {
        expect(readResult.data.project_name).toBe('Updated Project');
        expect(readResult.data.current_phase).toBe('solutioning');
      }
    });
  });

  describe('StatusManager.updateWorkflowStatus', () => {
    it('should update specific workflow status', async () => {
      const manager = getStatusManager(TEST_PROJECT_DIR);

      const result = await manager.updateWorkflowStatus('planning', 'prd', 'completed', {
        artifactPath: 'prd.md',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.planning?.workflows.prd?.status).toBe('completed');
        expect(result.data.phases.planning?.workflows.prd?.artifact_path).toBe('prd.md');
      }
    });

    it('should create phase if not exists', async () => {
      const manager = getStatusManager(TEST_PROJECT_DIR);

      const result = await manager.updateWorkflowStatus('solutioning', 'architecture', 'in_progress');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.solutioning?.workflows.architecture?.status).toBe('in_progress');
      }
    });
  });

  describe('StatusManager.getCachedStatus', () => {
    it('should return null before reading', () => {
      const manager = new StatusManager(TEST_PROJECT_DIR);
      expect(manager.getCachedStatus()).toBeNull();
    });

    it('should return cached status after reading', async () => {
      const manager = getStatusManager(TEST_PROJECT_DIR);
      await manager.read();

      const cached = manager.getCachedStatus();
      expect(cached).not.toBeNull();
      expect(cached?.project_name).toBe('Test Project');
    });
  });

  describe('StatusManager.initialize', () => {
    it('should create default status if file does not exist', async () => {
      // Remove status file
      rmSync(getStatusPath(TEST_PROJECT_DIR), { force: true });

      const manager = new StatusManager(TEST_PROJECT_DIR);
      const result = await manager.initialize('New Project');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('New Project');
        expect(result.data.current_phase).toBe('analysis');
      }
    });

    it('should load existing status if file exists', async () => {
      const manager = new StatusManager(TEST_PROJECT_DIR);
      const result = await manager.initialize();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Test Project');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Target Runner Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Target Runner', () => {
  beforeEach(() => {
    clearRegistryCache();
    createTestProject({ withTargetRegistry: true });
  });

  afterEach(() => {
    clearRegistryCache();
    cleanupTestProject();
  });

  describe('isValidBmadTarget', () => {
    it('should return true for valid targets', () => {
      expect(isValidBmadTarget('prd')).toBe(true);
      expect(isValidBmadTarget('architecture')).toBe(true);
      expect(isValidBmadTarget('epics')).toBe(true);
      expect(isValidBmadTarget('sprint-ready')).toBe(true);
      expect(isValidBmadTarget('auto')).toBe(true);
    });

    it('should return false for invalid targets', () => {
      expect(isValidBmadTarget('invalid')).toBe(false);
      expect(isValidBmadTarget('')).toBe(false);
      expect(isValidBmadTarget('PRD')).toBe(false); // Case sensitive
    });
  });

  describe('getTargetDisplayName', () => {
    it('should return human-readable names', () => {
      expect(getTargetDisplayName('prd')).toBe('PRD (Product Requirements)');
      expect(getTargetDisplayName('architecture')).toBe('Architecture');
      expect(getTargetDisplayName('gate-check')).toBe('Implementation Readiness');
      expect(getTargetDisplayName('sprint-ready')).toBe('Sprint Planning');
    });
  });

  describe('getTargetPhase', () => {
    it('should return correct phase numbers', () => {
      expect(getTargetPhase('research')).toBe(1);
      expect(getTargetPhase('brief')).toBe(1);
      expect(getTargetPhase('prd')).toBe(2);
      expect(getTargetPhase('architecture')).toBe(3);
      expect(getTargetPhase('epics')).toBe(3);
      expect(getTargetPhase('sprint-ready')).toBe(4);
    });

    it('should return null for targets without phase', () => {
      expect(getTargetPhase('auto')).toBeNull();
    });
  });

  describe('groupTargetsByPhase', () => {
    it('should group targets correctly', () => {
      const groups = groupTargetsByPhase();

      expect(groups[1]).toContain('research');
      expect(groups[1]).toContain('brief');
      expect(groups[2]).toContain('prd');
      expect(groups[2]).toContain('ux-design');
      expect(groups[3]).toContain('architecture');
      expect(groups[3]).toContain('epics');
      expect(groups[4]).toContain('sprint-ready');
      expect(groups[4]).toContain('implemented');
    });
  });

  describe('loadTargetRegistry', () => {
    it('should load and cache registry', async () => {
      const registry = await loadTargetRegistry(path.join(TEST_PROJECT_DIR, '_bmad'));

      expect(registry.targets).toBeDefined();
      expect(registry.dependencies).toBeDefined();
      expect(registry.execution_order).toBeDefined();
    });

    it('should return cached registry on subsequent calls', async () => {
      const registry1 = await loadTargetRegistry(path.join(TEST_PROJECT_DIR, '_bmad'));
      const registry2 = await loadTargetRegistry(path.join(TEST_PROJECT_DIR, '_bmad'));

      expect(registry1).toBe(registry2); // Same reference (cached)
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Types and Constants Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('BMAD Types and Constants', () => {
  describe('BMAD_PHASES', () => {
    it('should have all 4 phases', () => {
      expect(BMAD_PHASES).toHaveLength(4);
      expect(BMAD_PHASES).toContain('analysis');
      expect(BMAD_PHASES).toContain('planning');
      expect(BMAD_PHASES).toContain('solutioning');
      expect(BMAD_PHASES).toContain('implementation');
    });

    it('should be in correct order', () => {
      expect(BMAD_PHASES[0]).toBe('analysis');
      expect(BMAD_PHASES[1]).toBe('planning');
      expect(BMAD_PHASES[2]).toBe('solutioning');
      expect(BMAD_PHASES[3]).toBe('implementation');
    });
  });

  describe('BMAD_WORKFLOWS', () => {
    it('should have workflows for all phases', () => {
      const phases = new Set(BMAD_WORKFLOWS.map((w) => w.phase));
      expect(phases.size).toBe(4);
    });

    it('should have required workflows', () => {
      const required = BMAD_WORKFLOWS.filter((w) => !w.optional);
      expect(required.length).toBeGreaterThan(5);

      // Check key required workflows
      const requiredIds = required.map((w) => w.id);
      expect(requiredIds).toContain('prd');
      expect(requiredIds).toContain('architecture');
      expect(requiredIds).toContain('epics');
      expect(requiredIds).toContain('implementation-readiness');
    });

    it('should have correct agents assigned', () => {
      const prd = BMAD_WORKFLOWS.find((w) => w.id === 'prd');
      expect(prd?.agent).toBe('pm');

      const arch = BMAD_WORKFLOWS.find((w) => w.id === 'architecture');
      expect(arch?.agent).toBe('architect');

      const tea = BMAD_WORKFLOWS.find((w) => w.id === 'test-design');
      expect(tea?.agent).toBe('tea');

      const dev = BMAD_WORKFLOWS.find((w) => w.id === 'dev-story');
      expect(dev?.agent).toBe('dev');
    });

    it('should have valid commands', () => {
      for (const workflow of BMAD_WORKFLOWS) {
        expect(workflow.command).toMatch(/^\/bmad:/);
        expect(workflow.command).toContain('workflows');
      }
    });

    it('should have dependencies defined correctly', () => {
      const arch = BMAD_WORKFLOWS.find((w) => w.id === 'architecture');
      expect(arch?.dependsOn).toContain('prd');

      const epics = BMAD_WORKFLOWS.find((w) => w.id === 'epics');
      expect(epics?.dependsOn).toContain('prd');
      expect(epics?.dependsOn).toContain('architecture');
    });
  });

  describe('BMAD_AGENTS', () => {
    it('should have all required agents', () => {
      // We now have 19 agents across 4 modules
      expect(BMAD_AGENTS.length).toBe(19);

      const agentIds = BMAD_AGENTS.map((a) => a.id);
      
      // Core module (1)
      expect(agentIds).toContain('bmad-master');
      
      // BMM module (9)
      expect(agentIds).toContain('analyst');
      expect(agentIds).toContain('architect');
      expect(agentIds).toContain('dev');
      expect(agentIds).toContain('pm');
      expect(agentIds).toContain('quick-flow-solo-dev');
      expect(agentIds).toContain('sm');
      expect(agentIds).toContain('tea');
      expect(agentIds).toContain('tech-writer');
      expect(agentIds).toContain('ux-designer');
      
      // CIS module (6)
      expect(agentIds).toContain('brainstorming-coach');
      expect(agentIds).toContain('creative-problem-solver');
      expect(agentIds).toContain('design-thinking-coach');
      expect(agentIds).toContain('innovation-strategist');
      expect(agentIds).toContain('presentation-master');
      expect(agentIds).toContain('storyteller');
      
      // BMB module (3)
      expect(agentIds).toContain('agent-builder');
      expect(agentIds).toContain('module-builder');
      expect(agentIds).toContain('workflow-builder');
    });

    it('should have names and roles', () => {
      for (const agent of BMAD_AGENTS) {
        expect(agent.name).toBeTruthy();
        expect(agent.role).toBeTruthy();
        // Agents can be from any of the 4 modules: core, bmm, cis, bmb
        expect(['core', 'bmm', 'cis', 'bmb']).toContain(agent.module);
      }
    });

    it('should have all 19 agents across all modules', () => {
      expect(BMAD_AGENTS.length).toBe(19);
      
      // Verify module distribution
      const byModule = BMAD_AGENTS.reduce((acc, agent) => {
        acc[agent.module] = (acc[agent.module] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      expect(byModule['core']).toBe(1);   // bmad-master
      expect(byModule['bmm']).toBe(9);    // analyst, architect, dev, pm, quick-flow-solo-dev, sm, tea, tech-writer, ux-designer
      expect(byModule['cis']).toBe(6);    // brainstorming-coach, creative-problem-solver, design-thinking-coach, innovation-strategist, presentation-master, storyteller
      expect(byModule['bmb']).toBe(3);    // agent-builder, module-builder, workflow-builder
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Definition Validation Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Workflow Definition Validation', () => {
  it('should have unique workflow IDs', () => {
    const ids = BMAD_WORKFLOWS.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid output files for completed artifacts', () => {
    const withOutputs = BMAD_WORKFLOWS.filter((w) => w.outputFile);

    for (const workflow of withOutputs) {
      expect(workflow.outputFile).toMatch(/\.(md|yaml)$/);
    }
  });

  it('should map all required workflows to phases', () => {
    const requiredByPhase: Record<BmadPhase, number> = {
      analysis: 0,
      planning: 0,
      solutioning: 0,
      implementation: 0,
    };

    for (const workflow of BMAD_WORKFLOWS) {
      if (!workflow.optional) {
        requiredByPhase[workflow.phase]++;
      }
    }

    // Phase 1 is optional (0 required)
    expect(requiredByPhase.analysis).toBe(0);

    // Phase 2 has at least 1 required (PRD)
    expect(requiredByPhase.planning).toBeGreaterThanOrEqual(1);

    // Phase 3 has multiple required
    expect(requiredByPhase.solutioning).toBeGreaterThanOrEqual(3);

    // Phase 4 has multiple required
    expect(requiredByPhase.implementation).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration-like Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Module Integration', () => {
  beforeEach(() => {
    createTestProject({ withConfig: true, withStatus: true });
  });

  afterEach(async () => {
    await disposeStatusManager();
    cleanupTestProject();
  });

  it('should load config and status together', async () => {
    const configResult = await loadBmadConfig(TEST_PROJECT_DIR);
    expect(configResult.success).toBe(true);

    const manager = getStatusManager(TEST_PROJECT_DIR);
    const statusResult = await manager.read();
    expect(statusResult.success).toBe(true);

    if (configResult.success && statusResult.success) {
      // Both should have the same project name
      expect(configResult.data.project_name).toBe(statusResult.data.project_name);
    }
  });

  it('should update status based on workflow definitions', async () => {
    const manager = getStatusManager(TEST_PROJECT_DIR);

    // Simulate completing a workflow from BMAD_WORKFLOWS
    const prdWorkflow = BMAD_WORKFLOWS.find((w) => w.id === 'prd');
    expect(prdWorkflow).toBeDefined();

    const result = await manager.updateWorkflowStatus(
      prdWorkflow!.phase,
      prdWorkflow!.id,
      'completed',
      { artifactPath: prdWorkflow!.outputFile }
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases.planning?.workflows.prd?.status).toBe('completed');
    }
  });
});
