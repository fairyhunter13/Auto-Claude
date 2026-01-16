/**
 * Unit tests for Language Detector
 * Tests 4-tier language resolution system
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';

// Test directories
const TEST_DIR = '/tmp/language-detector-test';
const PROJECT_PATH = path.join(TEST_DIR, 'test-project');
const BMAD_PATH = path.join(PROJECT_PATH, '_bmad');
const KNOWLEDGE_PATH = path.join(BMAD_PATH, 'bmm/testarch/knowledge');

// Mock detection rules
const MOCK_DETECTION_RULES = {
  detection_rules: [
    {
      language: 'typescript',
      display_name: 'TypeScript',
      priority: 100,
      indicators: {
        required_any: [
          { type: 'file', pattern: 'tsconfig.json' },
        ],
        optional: [
          { type: 'glob', pattern: '**/*.ts' },
        ],
      },
      test_framework_default: 'vitest',
      test_frameworks_available: [
        {
          id: 'vitest',
          name: 'Vitest',
          description: 'Fast unit testing',
          test_command: 'npm test',
          test_pattern: '**/*.test.ts',
        },
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
        optional: [
          { type: 'glob', pattern: '**/*.py' },
        ],
      },
      test_framework_default: 'pytest',
      test_frameworks_available: [
        {
          id: 'pytest',
          name: 'pytest',
          description: 'Python testing',
          test_command: 'pytest',
          test_pattern: '**/test_*.py',
        },
      ],
      strategy_file: 'languages/python/_strategy.md',
    },
  ],
  global_exclusions: [
    '**/node_modules/**',
    '**/.git/**',
  ],
  detection_settings: {
    max_depth: 5,
    allow_polyglot: true,
  },
};

// Mock family index
const MOCK_FAMILY_INDEX = {
  families: {
    'c-family': {
      display_name: 'C-Family Languages',
      syntax_patterns: [
        { pattern: '\\{[^}]*\\}', weight: 2, description: 'Curly braces' },
        { pattern: ';\\s*$', weight: 3, description: 'Semicolons' },
      ],
      min_confidence: 0.6,
      strategy_file: 'families/c-family.md',
    },
    'ml-family': {
      display_name: 'ML-Family Languages',
      syntax_patterns: [
        { pattern: '\\blet\\s+\\w+\\s*=', weight: 4, description: 'Let bindings' },
        { pattern: '\\|>', weight: 5, description: 'Pipe operator' },
      ],
      min_confidence: 0.5,
      strategy_file: 'families/ml-family.md',
    },
  },
  inference_settings: {
    min_total_weight: 8,
    min_patterns_matched: 3,
    sample_lines: 200,
  },
};

// Setup test directories and files
function setupTestProject(files: Record<string, string> = {}): void {
  // Create directories
  mkdirSync(path.join(KNOWLEDGE_PATH, 'languages'), { recursive: true });
  mkdirSync(path.join(KNOWLEDGE_PATH, 'families'), { recursive: true });
  mkdirSync(path.join(PROJECT_PATH, 'src'), { recursive: true });
  
  // Write detection rules
  writeFileSync(
    path.join(KNOWLEDGE_PATH, 'languages/_detection-rules.yaml'),
    yaml.dump(MOCK_DETECTION_RULES)
  );
  
  // Write family index
  writeFileSync(
    path.join(KNOWLEDGE_PATH, 'families/_index.yaml'),
    yaml.dump(MOCK_FAMILY_INDEX)
  );
  
  // Write project files
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(PROJECT_PATH, filePath);
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }
}

// Cleanup
function cleanupTestDirs(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('LanguageDetector', () => {
  beforeEach(() => {
    cleanupTestDirs();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestDirs();
    vi.clearAllMocks();
  });

  describe('Tier 1: Direct Language Match', () => {
    it('should detect TypeScript project', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
        'src/index.ts': 'export const hello = "world";',
        'src/utils.ts': 'export function add(a: number, b: number) { return a + b; }',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      expect(result.primaryLanguage).toBeDefined();
      expect(result.primaryLanguage?.language).toBe('typescript');
      expect(result.primaryLanguage?.tier).toBe(1);
      expect(result.primaryLanguage?.confidenceLevel).toBe('high');
    });

    it('should detect Python project', async () => {
      setupTestProject({
        'requirements.txt': 'pytest\nflask',
        'src/main.py': 'def hello(): print("Hello")',
        'src/utils.py': 'def add(a, b): return a + b',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      expect(result.primaryLanguage).toBeDefined();
      expect(result.primaryLanguage?.language).toBe('python');
      expect(result.primaryLanguage?.tier).toBe(1);
    });

    it('should detect polyglot project', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
        'requirements.txt': 'pytest',
        'src/index.ts': 'export const x = 1;',
        'scripts/build.py': 'import subprocess',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      expect(result.isPolyglot).toBe(true);
      expect(result.allLanguages.length).toBeGreaterThan(1);
    });
  });

  describe('Unknown Extensions', () => {
    it('should report unknown extensions', async () => {
      setupTestProject({
        'src/main.zig': 'const std = @import("std");',
        'src/utils.zig': 'fn add(a: i32, b: i32) i32 { return a + b; }',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      const result = await detector.detect();
      
      expect(result.unknownExtensions).toContain('.zig');
      expect(result.discoveryNeeded).toBe(true);
    });
  });

  describe('Test Framework Detection', () => {
    it('should return available test frameworks', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
        'src/index.ts': 'export const x = 1;',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      await detector.detect();
      
      const frameworks = detector.getTestFrameworks('typescript');
      
      expect(frameworks).toBeDefined();
      expect(frameworks.length).toBeGreaterThan(0);
      expect(frameworks[0].name).toBe('Vitest');
    });
  });

  describe('Strategy Paths', () => {
    it('should return correct strategy path for known language', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      await detector.detect();
      
      const strategyPath = detector.getStrategyPath('typescript');
      
      expect(strategyPath).toContain('languages/typescript/_strategy.md');
    });

    it('should return family strategy path', async () => {
      setupTestProject({});
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      
      const familyPath = detector.getFamilyStrategyPath('c-family');
      
      expect(familyPath).toContain('families/c-family.md');
    });

    it('should return universal fallback path', async () => {
      setupTestProject({});
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      
      const fallbackPath = detector.getUniversalFallbackPath();
      
      expect(fallbackPath).toContain('universal/universal-fallback.md');
    });
  });

  describe('Cache', () => {
    it('should cache detection results', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      
      const result1 = await detector.detect();
      const result2 = await detector.detect();
      
      // Should be the same cached result
      expect(result1).toBe(result2);
    });

    it('should clear cache when requested', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
      });
      
      const { LanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector = new LanguageDetector(PROJECT_PATH, BMAD_PATH);
      
      const result1 = await detector.detect();
      detector.clearCache();
      const result2 = await detector.detect();
      
      // Should be different objects (both valid though)
      expect(result1).not.toBe(result2);
      expect(result1.primaryLanguage?.language).toBe(result2.primaryLanguage?.language);
    });
  });

  describe('Factory Function', () => {
    it('should return same instance for same path', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
      });
      
      const { getLanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector1 = getLanguageDetector(PROJECT_PATH, BMAD_PATH);
      const detector2 = getLanguageDetector(PROJECT_PATH, BMAD_PATH);
      
      expect(detector1).toBe(detector2);
    });

    it('should return new instance for different path', async () => {
      setupTestProject({
        'tsconfig.json': '{}',
      });
      
      const OTHER_PROJECT = path.join(TEST_DIR, 'other-project');
      mkdirSync(OTHER_PROJECT, { recursive: true });
      
      const { getLanguageDetector, clearLanguageDetector } = await import('../language-detector');
      clearLanguageDetector();
      
      const detector1 = getLanguageDetector(PROJECT_PATH, BMAD_PATH);
      const detector2 = getLanguageDetector(OTHER_PROJECT, BMAD_PATH);
      
      expect(detector1).not.toBe(detector2);
    });
  });
});
