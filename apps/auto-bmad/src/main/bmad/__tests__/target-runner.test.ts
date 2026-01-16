/**
 * Unit tests for Target Runner
 * Tests target-based BMAD workflow execution
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

// Test directories
const TEST_DIR = '/tmp/target-runner-test';
const BMAD_PATH = path.join(TEST_DIR, '_bmad');
const CONFIG_PATH = path.join(BMAD_PATH, 'bmm/config');

// Mock target registry content
const MOCK_REGISTRY = {
  targets: {
    prd: {
      phase: 2,
      workflow: 'prd',
      workflow_path: '2-plan-workflows/prd',
      agent: 'pm',
      description: 'Product Requirements Document',
      output: { type: 'file', path: 'prd.md' },
      required: true,
    },
    architecture: {
      phase: 3,
      workflow: 'create-architecture',
      workflow_path: '3-solutioning/create-architecture',
      agent: 'architect',
      description: 'System architecture',
      output: { type: 'file', path: 'architecture.md' },
      required: true,
    },
    epics: {
      phase: 3,
      workflow: 'create-epics-and-stories',
      workflow_path: '3-solutioning/create-epics-and-stories',
      agent: 'pm',
      description: 'Epics breakdown',
      output: { type: 'directory', path: 'epics/' },
      required: true,
    },
    'gate-check': {
      phase: 3,
      workflow: 'check-implementation-readiness',
      workflow_path: '3-solutioning/check-implementation-readiness',
      agent: 'architect',
      description: 'Gate check',
      output: { type: 'validation', artifact: null },
      required: true,
    },
    auto: {
      phase: null,
      workflow: null,
      agent: null,
      description: 'Full automation',
      output: { type: 'completion', artifact: null },
    },
  },
  dependencies: {
    prd: { optional: ['brief', 'research'] },
    architecture: { required: ['prd'], optional: ['ux-design'] },
    epics: { required: ['prd', 'architecture'] },
    'gate-check': { required: ['prd', 'architecture', 'epics'] },
  },
  execution_order: {
    phase_2: { order: ['prd', 'ux-design'], required: true },
    phase_3: { order: ['architecture', 'test-design', 'epics', 'gate-check'], required: true },
  },
};

// Setup test directories
function setupTestDirs(): void {
  mkdirSync(CONFIG_PATH, { recursive: true });
  writeFileSync(
    path.join(CONFIG_PATH, 'target-registry.yaml'),
    yaml.dump(MOCK_REGISTRY)
  );
}

// Cleanup test directories
function cleanupTestDirs(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('TargetRunner', () => {
  beforeEach(() => {
    cleanupTestDirs();
    setupTestDirs();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestDirs();
    vi.clearAllMocks();
  });

  describe('loadTargetRegistry', () => {
    it('should load target registry from YAML file', async () => {
      const { loadTargetRegistry, clearRegistryCache } = await import('../target-runner');
      clearRegistryCache();
      
      const registry = await loadTargetRegistry(BMAD_PATH);
      
      expect(registry).toBeDefined();
      expect(registry.targets).toBeDefined();
      expect(registry.targets.prd).toBeDefined();
      expect(registry.targets.prd.phase).toBe(2);
    });

    it('should throw error for missing registry file', async () => {
      const { loadTargetRegistry, clearRegistryCache } = await import('../target-runner');
      clearRegistryCache();
      
      await expect(loadTargetRegistry('/nonexistent/path')).rejects.toThrow();
    });
  });

  describe('isValidBmadTarget', () => {
    it('should return true for valid targets', async () => {
      const { isValidBmadTarget } = await import('../target-runner');
      
      expect(isValidBmadTarget('prd')).toBe(true);
      expect(isValidBmadTarget('architecture')).toBe(true);
      expect(isValidBmadTarget('auto')).toBe(true);
      expect(isValidBmadTarget('epics')).toBe(true);
    });

    it('should return false for invalid targets', async () => {
      const { isValidBmadTarget } = await import('../target-runner');
      
      expect(isValidBmadTarget('invalid')).toBe(false);
      expect(isValidBmadTarget('')).toBe(false);
      expect(isValidBmadTarget('random-target')).toBe(false);
    });
  });

  describe('getTargetDisplayName', () => {
    it('should return human-readable names', async () => {
      const { getTargetDisplayName } = await import('../target-runner');
      
      expect(getTargetDisplayName('prd')).toBe('PRD (Product Requirements)');
      expect(getTargetDisplayName('architecture')).toBe('Architecture');
      expect(getTargetDisplayName('auto')).toBe('Full Automation');
    });
  });

  describe('getTargetPhase', () => {
    it('should return correct phase numbers', async () => {
      const { getTargetPhase } = await import('../target-runner');
      
      expect(getTargetPhase('prd')).toBe(2);
      expect(getTargetPhase('architecture')).toBe(3);
      expect(getTargetPhase('sprint-ready')).toBe(4);
      expect(getTargetPhase('research')).toBe(1);
    });

    it('should return null for non-phase targets', async () => {
      const { getTargetPhase } = await import('../target-runner');
      
      expect(getTargetPhase('quick-spec')).toBe(null);
      expect(getTargetPhase('auto')).toBe(null);
    });
  });

  describe('groupTargetsByPhase', () => {
    it('should group targets correctly', async () => {
      const { groupTargetsByPhase } = await import('../target-runner');
      
      const groups = groupTargetsByPhase();
      
      expect(groups[1]).toContain('research');
      expect(groups[1]).toContain('brief');
      expect(groups[2]).toContain('prd');
      expect(groups[3]).toContain('architecture');
      expect(groups[4]).toContain('sprint-ready');
    });
  });

  describe('TargetRunner', () => {
    describe('plan', () => {
      it('should create execution plan for single target', async () => {
        const { TargetRunner, clearRegistryCache } = await import('../target-runner');
        clearRegistryCache();
        
        const runner = new TargetRunner({
          projectPath: TEST_DIR,
          bmadPath: BMAD_PATH,
          target: 'architecture',
        });
        
        const plan = await runner.plan();
        
        expect(plan.target).toBe('architecture');
        expect(plan.executionOrder).toContain('prd');
        expect(plan.executionOrder).toContain('architecture');
        expect(plan.executionOrder.indexOf('prd')).toBeLessThan(
          plan.executionOrder.indexOf('architecture')
        );
      });

      it('should include all required dependencies in execution order', async () => {
        const { TargetRunner, clearRegistryCache } = await import('../target-runner');
        clearRegistryCache();
        
        const runner = new TargetRunner({
          projectPath: TEST_DIR,
          bmadPath: BMAD_PATH,
          target: 'gate-check',
        });
        
        const plan = await runner.plan();
        
        // Gate check requires prd, architecture, epics
        expect(plan.executionOrder).toContain('prd');
        expect(plan.executionOrder).toContain('architecture');
        expect(plan.executionOrder).toContain('epics');
        expect(plan.executionOrder).toContain('gate-check');
        
        // Order should be: prd -> architecture -> epics -> gate-check
        const prdIdx = plan.executionOrder.indexOf('prd');
        const archIdx = plan.executionOrder.indexOf('architecture');
        const epicsIdx = plan.executionOrder.indexOf('epics');
        const gateIdx = plan.executionOrder.indexOf('gate-check');
        
        expect(prdIdx).toBeLessThan(archIdx);
        expect(archIdx).toBeLessThan(epicsIdx);
        expect(epicsIdx).toBeLessThan(gateIdx);
      });
    });

    describe('getTargetDefinition', () => {
      it('should return target definition', async () => {
        const { TargetRunner, clearRegistryCache } = await import('../target-runner');
        clearRegistryCache();
        
        const runner = new TargetRunner({
          projectPath: TEST_DIR,
          bmadPath: BMAD_PATH,
          target: 'prd',
        });
        
        // Need to plan first to load registry
        await runner.plan();
        
        const def = runner.getTargetDefinition('prd');
        
        expect(def).toBeDefined();
        expect(def?.phase).toBe(2);
        expect(def?.agent).toBe('pm');
        expect(def?.required).toBe(true);
      });
    });

    describe('getTargetDependencies', () => {
      it('should return target dependencies', async () => {
        const { TargetRunner, clearRegistryCache } = await import('../target-runner');
        clearRegistryCache();
        
        const runner = new TargetRunner({
          projectPath: TEST_DIR,
          bmadPath: BMAD_PATH,
          target: 'architecture',
        });
        
        await runner.plan();
        
        const deps = runner.getTargetDependencies('architecture');
        
        expect(deps.required).toContain('prd');
        expect(deps.optional).toContain('ux-design');
      });
    });

    describe('isTargetReady', () => {
      it('should return true when all dependencies are met', async () => {
        const { TargetRunner, clearRegistryCache } = await import('../target-runner');
        clearRegistryCache();
        
        const runner = new TargetRunner({
          projectPath: TEST_DIR,
          bmadPath: BMAD_PATH,
          target: 'architecture',
        });
        
        await runner.plan();
        
        const completed = new Set(['prd'] as const);
        expect(runner.isTargetReady('architecture', completed as Set<any>)).toBe(true);
      });

      it('should return false when dependencies are missing', async () => {
        const { TargetRunner, clearRegistryCache } = await import('../target-runner');
        clearRegistryCache();
        
        const runner = new TargetRunner({
          projectPath: TEST_DIR,
          bmadPath: BMAD_PATH,
          target: 'architecture',
        });
        
        await runner.plan();
        
        const completed = new Set<string>();
        expect(runner.isTargetReady('architecture', completed as Set<any>)).toBe(false);
      });
    });
  });
});
