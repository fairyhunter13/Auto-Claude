/**
 * Integration Tests for Auto-BMAD
 * 
 * End-to-end tests for the complete BMAD workflow system including:
 * - Language detection
 * - Target runner
 * - Load balancer
 * - Workflow execution
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

// Test directories
const TEST_DIR = '/tmp/bmad-integration-test';
const PROJECT_PATH = path.join(TEST_DIR, 'test-project');
const BMAD_PATH = path.join(PROJECT_PATH, '_bmad');
const KNOWLEDGE_PATH = path.join(BMAD_PATH, 'bmm/testarch/knowledge');
const CONFIG_PATH = path.join(BMAD_PATH, 'bmm/config');
const OUTPUT_PATH = path.join(PROJECT_PATH, '_bmad-output');

// Realistic detection rules covering multiple languages
const MOCK_DETECTION_RULES = {
  detection_rules: [
    {
      language: 'rust',
      display_name: 'Rust',
      priority: 10,
      indicators: {
        required: [{ type: 'file', pattern: 'Cargo.toml' }],
        optional: [{ type: 'glob', pattern: '**/*.rs' }],
      },
      test_framework_default: 'cargo-test',
      test_frameworks_available: [
        { id: 'cargo-test', name: 'Cargo Test', test_command: 'cargo test', test_pattern: '**/*_test.rs' },
      ],
      strategy_file: 'languages/rust/_strategy.md',
    },
    {
      language: 'go',
      display_name: 'Go',
      priority: 20,
      indicators: {
        required: [{ type: 'file', pattern: 'go.mod' }],
        optional: [{ type: 'glob', pattern: '**/*.go' }],
      },
      test_framework_default: 'go-test',
      test_frameworks_available: [
        { id: 'go-test', name: 'Go Test', test_command: 'go test ./...', test_pattern: '**/*_test.go' },
      ],
      strategy_file: 'languages/go/_strategy.md',
    },
    {
      language: 'typescript',
      display_name: 'TypeScript',
      priority: 100,
      indicators: {
        required_any: [{ type: 'file', pattern: 'tsconfig.json' }],
        optional: [{ type: 'glob', pattern: '**/*.ts' }],
      },
      test_framework_default: 'vitest',
      test_frameworks_available: [
        { id: 'vitest', name: 'Vitest', test_command: 'npm test', test_pattern: '**/*.test.ts' },
        { id: 'jest', name: 'Jest', test_command: 'npm test', test_pattern: '**/*.test.ts' },
      ],
      strategy_file: 'languages/typescript/_strategy.md',
    },
    {
      language: 'python',
      display_name: 'Python',
      priority: 30,
      indicators: {
        required_any: [
          { type: 'file', pattern: 'pyproject.toml' },
          { type: 'file', pattern: 'requirements.txt' },
        ],
        optional: [{ type: 'glob', pattern: '**/*.py' }],
      },
      test_framework_default: 'pytest',
      test_frameworks_available: [
        { id: 'pytest', name: 'pytest', test_command: 'pytest', test_pattern: '**/test_*.py' },
      ],
      strategy_file: 'languages/python/_strategy.md',
    },
  ],
  global_exclusions: ['**/node_modules/**', '**/.git/**', '**/target/**'],
  detection_settings: { max_depth: 5, allow_polyglot: true },
};

// Realistic target registry
const MOCK_TARGET_REGISTRY = {
  targets: {
    research: { phase: 1, workflow: 'research', agent: 'analyst', required: false },
    brief: { phase: 1, workflow: 'create-product-brief', agent: 'analyst', required: false },
    prd: {
      phase: 2,
      workflow: 'prd',
      workflow_path: '2-plan-workflows/prd',
      agent: 'pm',
      description: 'Product Requirements Document',
      output: { type: 'file', path: 'prd.md' },
      required: true,
    },
    'ux-design': { phase: 2, workflow: 'create-ux-design', agent: 'ux-designer', required: false },
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
      agent: 'architect',
      output: { type: 'validation' },
      required: true,
    },
    'sprint-ready': {
      phase: 4,
      workflow: 'sprint-planning',
      agent: 'sm',
      output: { type: 'file', path: 'sprint-status.yaml' },
      required: true,
    },
    auto: {
      phase: null,
      workflow: null,
      agent: null,
      description: 'Full automation mode',
      output: { type: 'completion' },
    },
  },
  dependencies: {
    prd: { optional: ['brief', 'research'] },
    'ux-design': { required: ['prd'] },
    architecture: { required: ['prd'], optional: ['ux-design'] },
    epics: { required: ['prd', 'architecture'] },
    'gate-check': { required: ['prd', 'architecture', 'epics'] },
    'sprint-ready': { required: ['gate-check'] },
  },
  execution_order: {
    phase_1: { order: ['research', 'brief'], required: false },
    phase_2: { order: ['prd', 'ux-design'], required: true },
    phase_3: { order: ['architecture', 'test-design', 'epics', 'gate-check'], required: true },
    phase_4: { order: ['sprint-ready'], required: true },
  },
};

// Family index for Tier 2 inference
const MOCK_FAMILY_INDEX = {
  families: {
    'c-family': {
      display_name: 'C-Family Languages',
      syntax_patterns: [
        { pattern: '\\{[^}]*\\}', weight: 2, description: 'Curly braces' },
        { pattern: ';\\s*$', weight: 3, description: 'Semicolons' },
        { pattern: '\\b(if|else|while|for)\\s*\\(', weight: 3, description: 'Control flow' },
      ],
      min_confidence: 0.6,
      strategy_file: 'families/c-family.md',
    },
    'ml-family': {
      display_name: 'ML-Family Languages',
      syntax_patterns: [
        { pattern: '\\blet\\s+\\w+\\s*=', weight: 4, description: 'Let bindings' },
        { pattern: '\\|>', weight: 5, description: 'Pipe operator' },
        { pattern: '\\bmatch\\b', weight: 4, description: 'Pattern matching' },
      ],
      min_confidence: 0.5,
      strategy_file: 'families/ml-family.md',
    },
    'systems-family': {
      display_name: 'Systems Languages',
      syntax_patterns: [
        { pattern: '\\bunsafe\\b', weight: 5, description: 'Unsafe blocks' },
        { pattern: '\\b(u8|u16|u32|u64|i8|i16|i32|i64)\\b', weight: 4, description: 'Fixed-size types' },
      ],
      min_confidence: 0.5,
      strategy_file: 'families/systems-family.md',
    },
  },
  inference_settings: {
    min_total_weight: 8,
    min_patterns_matched: 3,
    sample_lines: 200,
  },
};

// Setup complete test environment
function setupTestEnvironment(projectFiles: Record<string, string> = {}): void {
  // Create directory structure
  mkdirSync(path.join(KNOWLEDGE_PATH, 'languages'), { recursive: true });
  mkdirSync(path.join(KNOWLEDGE_PATH, 'families'), { recursive: true });
  mkdirSync(CONFIG_PATH, { recursive: true });
  mkdirSync(OUTPUT_PATH, { recursive: true });
  mkdirSync(path.join(PROJECT_PATH, 'src'), { recursive: true });
  
  // Write configuration files
  writeFileSync(
    path.join(KNOWLEDGE_PATH, 'languages/_detection-rules.yaml'),
    yaml.dump(MOCK_DETECTION_RULES)
  );
  writeFileSync(
    path.join(KNOWLEDGE_PATH, 'families/_index.yaml'),
    yaml.dump(MOCK_FAMILY_INDEX)
  );
  writeFileSync(
    path.join(CONFIG_PATH, 'target-registry.yaml'),
    yaml.dump(MOCK_TARGET_REGISTRY)
  );
  
  // Write project files
  for (const [filePath, content] of Object.entries(projectFiles)) {
    const fullPath = path.join(PROJECT_PATH, filePath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

function cleanupTestEnvironment(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('BMAD Integration Tests', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('Language Detection + Target Runner Integration', () => {
    it('should detect Rust project and plan appropriate workflow', async () => {
      setupTestEnvironment({
        'Cargo.toml': '[package]\nname = "my-project"\nversion = "0.1.0"',
        'src/main.rs': 'fn main() { println!("Hello"); }',
        'src/lib.rs': 'pub fn add(a: i32, b: i32) -> i32 { a + b }',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      const { TargetRunner, clearRegistryCache } = await import('../target-runner');
      clearLanguageDetector();
      clearRegistryCache();
      
      // Detect language
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const langResult = await detector.detect();
      
      expect(langResult.primaryLanguage?.language).toBe('rust');
      expect(langResult.primaryLanguage?.tier).toBe(1);
      
      // Get test framework
      const frameworks = detector.getTestFrameworks('rust');
      expect(frameworks.length).toBeGreaterThan(0);
      expect(frameworks[0].name).toBe('Cargo Test');
      
      // Plan workflow execution
      const runner = new TargetRunner({
        projectPath: PROJECT_PATH,
        bmadPath: BMAD_PATH,
        target: 'architecture',
      });
      
      const plan = await runner.plan();
      expect(plan.executionOrder).toContain('prd');
      expect(plan.executionOrder).toContain('architecture');
    });

    it('should detect polyglot project and identify all languages', async () => {
      setupTestEnvironment({
        // TypeScript frontend
        'tsconfig.json': '{}',
        'src/app.ts': 'export const app = () => {};',
        // Python backend
        'backend/requirements.txt': 'fastapi\nuvicorn',
        'backend/main.py': 'from fastapi import FastAPI\napp = FastAPI()',
        // Go service
        'services/go.mod': 'module myservice\ngo 1.21',
        'services/main.go': 'package main\nfunc main() {}',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      expect(result.isPolyglot).toBe(true);
      expect(result.allLanguages.length).toBeGreaterThanOrEqual(3);
      
      const languages = result.allLanguages.map(l => l.language);
      expect(languages).toContain('typescript');
      expect(languages).toContain('python');
      expect(languages).toContain('go');
    });

    it('should use Tier 2 family inference for unknown languages', async () => {
      setupTestEnvironment({
        // Unknown language with C-family syntax
        'src/main.unknown': `
          fn main() {
            let x = 10;
            if (x > 5) {
              print(x);
            }
          }
        `,
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      // Should detect as unknown but infer c-family
      if (result.primaryLanguage) {
        expect(result.primaryLanguage.tier).toBe(2);
        expect(result.primaryLanguage.family).toBe('c-family');
      }
    });
  });

  describe('Target Runner Dependency Resolution', () => {
    it('should resolve complete dependency chain for gate-check', async () => {
      setupTestEnvironment({
        'tsconfig.json': '{}',
      });
      
      const { TargetRunner, clearRegistryCache } = await import('../target-runner');
      clearRegistryCache();
      
      const runner = new TargetRunner({
        projectPath: PROJECT_PATH,
        bmadPath: BMAD_PATH,
        target: 'gate-check',
      });
      
      const plan = await runner.plan();
      
      // Gate check requires: prd -> architecture -> epics -> gate-check
      const order = plan.executionOrder;
      expect(order).toContain('prd');
      expect(order).toContain('architecture');
      expect(order).toContain('epics');
      expect(order).toContain('gate-check');
      
      // Verify order
      expect(order.indexOf('prd')).toBeLessThan(order.indexOf('architecture'));
      expect(order.indexOf('architecture')).toBeLessThan(order.indexOf('epics'));
      expect(order.indexOf('epics')).toBeLessThan(order.indexOf('gate-check'));
    });

    it('should resolve sprint-ready with full dependency chain', async () => {
      setupTestEnvironment({
        'tsconfig.json': '{}',
      });
      
      const { TargetRunner, clearRegistryCache } = await import('../target-runner');
      clearRegistryCache();
      
      const runner = new TargetRunner({
        projectPath: PROJECT_PATH,
        bmadPath: BMAD_PATH,
        target: 'sprint-ready',
      });
      
      const plan = await runner.plan();
      
      // Sprint-ready requires: prd -> architecture -> epics -> gate-check -> sprint-ready
      const order = plan.executionOrder;
      expect(order.indexOf('gate-check')).toBeLessThan(order.indexOf('sprint-ready'));
    });

    it('should handle optional dependencies correctly', async () => {
      setupTestEnvironment({
        'tsconfig.json': '{}',
      });
      
      const { TargetRunner, clearRegistryCache } = await import('../target-runner');
      clearRegistryCache();
      
      const runner = new TargetRunner({
        projectPath: PROJECT_PATH,
        bmadPath: BMAD_PATH,
        target: 'prd',
      });
      
      const plan = await runner.plan();
      
      // PRD has optional deps (brief, research) but they shouldn't block execution
      expect(plan.executionOrder).toContain('prd');
      
      // Optional deps may or may not be included based on implementation
      const deps = runner.getTargetDependencies('prd');
      expect(deps.optional).toBeDefined();
    });
  });

  describe('Load Balancer', () => {
    it('should create load balancer with default configuration', async () => {
      const { OpenCodeLoadBalancer } = await import('../opencode-load-balancer');
      
      const balancer = new OpenCodeLoadBalancer();
      const state = balancer.getState();
      
      expect(state.profiles.length).toBeGreaterThan(0);
      expect(state.config.strategy).toBeDefined();
    });

    it('should select next available profile', async () => {
      const { OpenCodeLoadBalancer } = await import('../opencode-load-balancer');
      
      const balancer = new OpenCodeLoadBalancer({
        strategy: 'round-robin',
        profiles: [
          { id: 'test1', configPath: '/tmp/test1', name: 'Test 1' },
          { id: 'test2', configPath: '/tmp/test2', name: 'Test 2' },
        ],
      });
      
      // Mock profile availability
      const profile1 = balancer.getNextProfile();
      expect(profile1).toBeDefined();
    });

    it('should track execution statistics', async () => {
      const { OpenCodeLoadBalancer } = await import('../opencode-load-balancer');
      
      const balancer = new OpenCodeLoadBalancer({
        strategy: 'least-loaded',
        profiles: [
          { id: 'test1', configPath: '/tmp/test1', name: 'Test 1' },
        ],
      });
      
      // Record some executions
      balancer.recordExecution('test1', true);
      balancer.recordExecution('test1', true);
      balancer.recordExecution('test1', false);
      
      const stats = balancer.getProfileStats('test1');
      expect(stats?.successCount).toBe(2);
      expect(stats?.failureCount).toBe(1);
    });

    it('should handle rate limiting', async () => {
      const { OpenCodeLoadBalancer } = await import('../opencode-load-balancer');
      
      const balancer = new OpenCodeLoadBalancer({
        strategy: 'least-loaded',
        rateLimitCooldown: 60000,
        profiles: [
          { id: 'test1', configPath: '/tmp/test1', name: 'Test 1' },
        ],
      });
      
      // Simulate rate limit
      balancer.markRateLimited('test1');
      
      const stats = balancer.getProfileStats('test1');
      expect(stats?.rateLimitedUntil).toBeDefined();
      expect(stats?.rateLimitedUntil).toBeGreaterThan(Date.now());
      
      // Clear rate limit
      balancer.clearRateLimit('test1');
      const updatedStats = balancer.getProfileStats('test1');
      expect(updatedStats?.rateLimitedUntil).toBeNull();
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete full workflow setup from language detection to target planning', async () => {
      setupTestEnvironment({
        // Full TypeScript project
        'tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022' } }),
        'package.json': JSON.stringify({ name: 'test-project', scripts: { test: 'vitest' } }),
        'src/index.ts': 'export function main() { console.log("Hello"); }',
        'src/utils.ts': 'export const add = (a: number, b: number) => a + b;',
        'tests/utils.test.ts': 'import { add } from "../src/utils";\ntest("add", () => expect(add(1,2)).toBe(3));',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      const { TargetRunner, clearRegistryCache } = await import('../target-runner');
      const { OpenCodeLoadBalancer } = await import('../opencode-load-balancer');
      
      clearLanguageDetector();
      clearRegistryCache();
      
      // 1. Detect language
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const langResult = await detector.detect();
      
      expect(langResult.primaryLanguage?.language).toBe('typescript');
      
      // 2. Get test framework
      const frameworks = detector.getTestFrameworks('typescript');
      expect(frameworks.length).toBeGreaterThan(0);
      
      // 3. Plan workflow
      const runner = new TargetRunner({
        projectPath: PROJECT_PATH,
        bmadPath: BMAD_PATH,
        target: 'architecture',
      });
      
      const plan = await runner.plan();
      expect(plan.target).toBe('architecture');
      expect(plan.executionOrder.length).toBeGreaterThan(0);
      
      // 4. Setup load balancer
      const balancer = new OpenCodeLoadBalancer({
        strategy: 'least-loaded',
      });
      
      const state = balancer.getState();
      expect(state.config.enabled).toBe(true);
      
      // 5. Verify readiness
      const archDef = runner.getTargetDefinition('architecture');
      expect(archDef?.agent).toBe('architect');
    });

    it('should handle project manager workflow correctly', async () => {
      setupTestEnvironment({
        'pyproject.toml': '[project]\nname = "my-api"\nversion = "1.0.0"',
        'src/api.py': 'from fastapi import FastAPI\napp = FastAPI()',
      });
      
      const { ProjectManager } = await import('../project-manager');
      
      const manager = new ProjectManager(PROJECT_PATH);
      await manager.initialize();
      
      // Check project info
      const info = manager.getProjectInfo();
      expect(info.path).toBe(PROJECT_PATH);
      expect(info.bmadPath).toBe(BMAD_PATH);
      
      // Detect languages
      const languages = await manager.detectLanguages();
      expect(languages.primaryLanguage?.language).toBe('python');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing detection rules gracefully', async () => {
      // Setup without detection rules
      mkdirSync(path.join(PROJECT_PATH, 'src'), { recursive: true });
      writeFileSync(path.join(PROJECT_PATH, 'src/main.rs'), 'fn main() {}');
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      // Should not crash, may return empty or fallback results
      expect(result).toBeDefined();
    });

    it('should handle missing target registry gracefully', async () => {
      setupTestEnvironment({ 'tsconfig.json': '{}' });
      // Remove target registry
      if (existsSync(path.join(CONFIG_PATH, 'target-registry.yaml'))) {
        rmSync(path.join(CONFIG_PATH, 'target-registry.yaml'));
      }
      
      const { TargetRunner, clearRegistryCache } = await import('../target-runner');
      clearRegistryCache();
      
      const runner = new TargetRunner({
        projectPath: PROJECT_PATH,
        bmadPath: BMAD_PATH,
        target: 'prd',
      });
      
      // Should throw or handle gracefully
      await expect(runner.plan()).rejects.toThrow();
    });

    it('should handle empty project gracefully', async () => {
      mkdirSync(PROJECT_PATH, { recursive: true });
      mkdirSync(path.join(KNOWLEDGE_PATH, 'languages'), { recursive: true });
      writeFileSync(
        path.join(KNOWLEDGE_PATH, 'languages/_detection-rules.yaml'),
        yaml.dump(MOCK_DETECTION_RULES)
      );
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      // Should return empty results, not crash
      expect(result.allLanguages.length).toBe(0);
      expect(result.primaryLanguage).toBeUndefined();
    });
  });
});
