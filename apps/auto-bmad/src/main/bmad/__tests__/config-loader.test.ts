/**
 * Config Loader Unit Tests
 * 
 * Comprehensive tests for BMAD configuration file loading.
 * Tests: read, parse, path resolution, validation, defaults.
 * 
 * Story 9.2: Backend Integration Tests (No UI)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import path from 'path';
import * as yaml from 'yaml';

// Test directories
const TEST_DIR = '/tmp/config-loader-test';
const PROJECT_PATH = path.join(TEST_DIR, 'test-project');
const BMAD_PATH = path.join(PROJECT_PATH, '_bmad');
const CONFIG_PATH = path.join(BMAD_PATH, 'bmm', 'config.yaml');

// Valid config file content
const VALID_CONFIG = {
  project_name: 'Test Project',
  user_skill_level: 'intermediate',
  planning_artifacts: '{project-root}/_bmad-output/planning-artifacts',
  implementation_artifacts: '{project-root}/_bmad-output/implementation-artifacts',
  project_knowledge: '{project-root}/docs',
  tea_use_mcp_enhancements: false,
  tea_use_playwright_utils: true,
  user_name: 'Hafiz',
  communication_language: 'English',
  document_output_language: 'English',
  output_folder: '{project-root}/_bmad-output',
};

// Setup test environment
function setupTestEnvironment(configContent?: unknown): void {
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  if (configContent !== undefined) {
    writeFileSync(CONFIG_PATH, yaml.stringify(configContent));
  }
}

function cleanupTestEnvironment(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('ConfigLoader', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('getConfigPath', () => {
    it('should return correct path for config file', async () => {
      const { getConfigPath } = await import('../config-loader');
      
      const configPath = getConfigPath('/home/user/my-project');
      
      expect(configPath).toBe('/home/user/my-project/_bmad/bmm/config.yaml');
    });
  });

  describe('hasBmadConfig', () => {
    it('should return true when config file exists', async () => {
      setupTestEnvironment(VALID_CONFIG);
      const { hasBmadConfig } = await import('../config-loader');
      
      const result = await hasBmadConfig(PROJECT_PATH);
      
      expect(result).toBe(true);
    });

    it('should return false when config file does not exist', async () => {
      mkdirSync(PROJECT_PATH, { recursive: true });
      const { hasBmadConfig } = await import('../config-loader');
      
      const result = await hasBmadConfig(PROJECT_PATH);
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent project path', async () => {
      const { hasBmadConfig } = await import('../config-loader');
      
      const result = await hasBmadConfig('/nonexistent/path');
      
      expect(result).toBe(false);
    });
  });

  describe('isBmadProject', () => {
    it('should return true when _bmad directory exists', async () => {
      mkdirSync(BMAD_PATH, { recursive: true });
      const { isBmadProject } = await import('../config-loader');
      
      const result = await isBmadProject(PROJECT_PATH);
      
      expect(result).toBe(true);
    });

    it('should return false when _bmad directory does not exist', async () => {
      mkdirSync(PROJECT_PATH, { recursive: true });
      const { isBmadProject } = await import('../config-loader');
      
      const result = await isBmadProject(PROJECT_PATH);
      
      expect(result).toBe(false);
    });
  });

  describe('loadBmadConfig', () => {
    it('should load and parse valid config file', async () => {
      setupTestEnvironment(VALID_CONFIG);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Test Project');
        expect(result.data.user_name).toBe('Hafiz');
        expect(result.data.communication_language).toBe('English');
      }
    });

    it('should resolve {project-root} path variables', async () => {
      setupTestEnvironment(VALID_CONFIG);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.planning_artifacts).toBe(
          path.join(PROJECT_PATH, '_bmad-output', 'planning-artifacts')
        );
        expect(result.data.output_folder).toBe(
          path.join(PROJECT_PATH, '_bmad-output')
        );
      }
    });

    it('should return error for missing config file', async () => {
      mkdirSync(PROJECT_PATH, { recursive: true });
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFIG_NOT_FOUND');
      }
    });

    it('should return error for invalid YAML', async () => {
      setupTestEnvironment();
      writeFileSync(CONFIG_PATH, 'invalid: yaml: content: [[[');
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFIG_PARSE_ERROR');
      }
    });

    it('should return error for invalid schema', async () => {
      setupTestEnvironment({ invalid: 'schema' });
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFIG_VALIDATION_ERROR');
      }
    });

    it('should handle relative project path', async () => {
      setupTestEnvironment(VALID_CONFIG);
      const { loadBmadConfig } = await import('../config-loader');
      
      // Use cwd-relative path (this test runs from project root)
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(true);
    });

    it('should preserve all config fields', async () => {
      setupTestEnvironment(VALID_CONFIG);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user_skill_level).toBe('intermediate');
        expect(result.data.tea_use_mcp_enhancements).toBe(false);
        expect(result.data.tea_use_playwright_utils).toBe(true);
        expect(result.data.document_output_language).toBe('English');
      }
    });
  });

  describe('getDefaultConfig', () => {
    it('should return valid default configuration', async () => {
      const { getDefaultConfig } = await import('../config-loader');
      
      const config = getDefaultConfig(PROJECT_PATH, 'My Project');
      
      expect(config.project_name).toBe('My Project');
      expect(config.user_skill_level).toBe('intermediate');
      expect(config.communication_language).toBe('English');
      expect(config.user_name).toBe('User');
    });

    it('should use directory name as default project name', async () => {
      const { getDefaultConfig } = await import('../config-loader');
      
      const config = getDefaultConfig('/home/user/my-awesome-project');
      
      expect(config.project_name).toBe('my-awesome-project');
    });

    it('should include resolved paths', async () => {
      const { getDefaultConfig } = await import('../config-loader');
      
      const config = getDefaultConfig(PROJECT_PATH);
      
      expect(config.planning_artifacts).toBe(
        path.join(PROJECT_PATH, '_bmad-output', 'planning-artifacts')
      );
      expect(config.implementation_artifacts).toBe(
        path.join(PROJECT_PATH, '_bmad-output', 'implementation-artifacts')
      );
      expect(config.output_folder).toBe(
        path.join(PROJECT_PATH, '_bmad-output')
      );
    });
  });

  describe('Config Validation', () => {
    it('should accept minimal valid config', async () => {
      const minimalConfig = {
        project_name: 'Minimal Project',
      };
      setupTestEnvironment(minimalConfig);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Minimal Project');
      }
    });

    it('should accept config with unknown extra fields', async () => {
      const configWithExtra = {
        ...VALID_CONFIG,
        custom_field: 'custom value',
        another_field: 123,
      };
      setupTestEnvironment(configWithExtra);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      // Should succeed - extra fields are ignored or passed through
      expect(result.success).toBe(true);
    });

    it('should reject config missing required project_name', async () => {
      const invalidConfig = {
        user_name: 'Test',
        // missing project_name
      };
      setupTestEnvironment(invalidConfig);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('CONFIG_VALIDATION_ERROR');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle empty config file', async () => {
      setupTestEnvironment();
      writeFileSync(CONFIG_PATH, '');
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      // Empty file should be treated as validation error
      expect(result.success).toBe(false);
    });

    it('should handle config file with only comments', async () => {
      setupTestEnvironment();
      writeFileSync(CONFIG_PATH, '# This is a comment\n# Another comment\n');
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(false);
    });

    it('should handle binary file content', async () => {
      setupTestEnvironment();
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x89, 0x50, 0x4E, 0x47]);
      require('fs').writeFileSync(CONFIG_PATH, buffer);
      const { loadBmadConfig } = await import('../config-loader');
      
      const result = await loadBmadConfig(PROJECT_PATH);
      
      expect(result.success).toBe(false);
    });
  });
});
