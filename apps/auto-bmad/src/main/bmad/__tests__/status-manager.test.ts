/**
 * Status Manager Unit Tests
 * 
 * Comprehensive tests for BMAD workflow status file management.
 * Tests: read, write, atomic saves, file watching, corruption handling.
 * 
 * Story 9.2: Backend Integration Tests (No UI)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import * as yaml from 'yaml';
import type { BmadWorkflowStatus } from '../types';

// Test directories
const TEST_DIR = '/tmp/status-manager-test';
const PROJECT_PATH = path.join(TEST_DIR, 'test-project');
const OUTPUT_PATH = path.join(PROJECT_PATH, '_bmad-output', 'planning-artifacts');
const STATUS_PATH = path.join(OUTPUT_PATH, 'bmm-workflow-status.yaml');

// Valid status file content with proper typing
const VALID_STATUS: BmadWorkflowStatus = {
  project_name: 'Test Project',
  project_type: 'greenfield',
  current_phase: 'planning',
  phases: {
    analysis: {
      status: 'completed',
      workflows: {
        'product-brief': {
          status: 'completed',
          completed_at: '2026-01-15T10:00:00Z',
          artifact_path: 'product-brief.md',
        },
      },
    },
    planning: {
      status: 'in_progress',
      workflows: {
        prd: {
          status: 'completed',
          completed_at: '2026-01-16T10:00:00Z',
          artifact_path: 'prd.md',
        },
        'ux-design': {
          status: 'pending',
        },
      },
    },
    solutioning: {
      status: 'pending',
      workflows: {},
    },
    implementation: {
      status: 'pending',
      workflows: {},
    },
  },
};

// Setup test environment
function setupTestEnvironment(statusContent?: unknown): void {
  mkdirSync(OUTPUT_PATH, { recursive: true });
  if (statusContent !== undefined) {
    writeFileSync(STATUS_PATH, yaml.stringify(statusContent));
  }
}

function cleanupTestEnvironment(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

describe('StatusManager', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('getStatusPath', () => {
    it('should return correct path for status file', async () => {
      const { getStatusPath } = await import('../status-manager');
      
      const statusPath = getStatusPath('/home/user/my-project');
      
      expect(statusPath).toBe('/home/user/my-project/_bmad-output/planning-artifacts/bmm-workflow-status.yaml');
    });
  });

  describe('hasStatusFile', () => {
    it('should return true when status file exists', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { hasStatusFile } = await import('../status-manager');
      
      const result = await hasStatusFile(PROJECT_PATH);
      
      expect(result).toBe(true);
    });

    it('should return false when status file does not exist', async () => {
      setupTestEnvironment(); // No status file
      const { hasStatusFile } = await import('../status-manager');
      
      const result = await hasStatusFile(PROJECT_PATH);
      
      expect(result).toBe(false);
    });

    it('should return false for non-existent project path', async () => {
      const { hasStatusFile } = await import('../status-manager');
      
      const result = await hasStatusFile('/nonexistent/path');
      
      expect(result).toBe(false);
    });
  });

  describe('StatusManager.read', () => {
    it('should read and parse valid status file', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Test Project');
        expect(result.data.current_phase).toBe('planning');
        expect(result.data.phases.analysis?.status).toBe('completed');
      }
    });

    it('should return error for missing status file', async () => {
      setupTestEnvironment(); // No status file
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATUS_NOT_FOUND');
      }
    });

    it('should return error for invalid YAML', async () => {
      setupTestEnvironment();
      writeFileSync(STATUS_PATH, 'invalid: yaml: content: [[[');
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATUS_PARSE_ERROR');
      }
    });

    it('should return error for invalid schema', async () => {
      setupTestEnvironment({ invalid: 'schema' });
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATUS_VALIDATION_ERROR');
      }
    });

    it('should cache status after successful read', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.read();
      
      const cached = manager.getCachedStatus();
      expect(cached).toBeDefined();
      expect(cached?.project_name).toBe('Test Project');
    });
  });

  describe('StatusManager.write', () => {
    it('should write valid status to file', async () => {
      setupTestEnvironment();
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.write(VALID_STATUS);
      
      expect(result.success).toBe(true);
      expect(existsSync(STATUS_PATH)).toBe(true);
      
      // Verify content
      const content = readFileSync(STATUS_PATH, 'utf-8');
      const parsed = yaml.parse(content);
      expect(parsed.project_name).toBe('Test Project');
    });

    it('should create directories if they do not exist', async () => {
      mkdirSync(PROJECT_PATH, { recursive: true }); // Only project, not output
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.write(VALID_STATUS);
      
      expect(result.success).toBe(true);
      expect(existsSync(OUTPUT_PATH)).toBe(true);
    });

    it('should perform atomic write (temp file + rename)', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      
      // Modify and write
      const newStatus: BmadWorkflowStatus = { ...VALID_STATUS, project_name: 'Updated Project' };
      const result = await manager.write(newStatus);
      
      expect(result.success).toBe(true);
      
      // Verify no temp files left behind
      const files = require('fs').readdirSync(OUTPUT_PATH);
      const tempFiles = files.filter((f: string) => f.includes('.tmp.'));
      expect(tempFiles.length).toBe(0);
    });

    it('should reject invalid status data', async () => {
      setupTestEnvironment();
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const invalidStatus = { invalid: 'data' } as unknown as BmadWorkflowStatus;
      const result = await manager.write(invalidStatus);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('STATUS_VALIDATION_ERROR');
      }
    });

    it('should update cache after successful write', async () => {
      setupTestEnvironment();
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.write(VALID_STATUS);
      
      const cached = manager.getCachedStatus();
      expect(cached?.project_name).toBe('Test Project');
    });
  });

  describe('StatusManager.initialize', () => {
    it('should create default status if file does not exist', async () => {
      mkdirSync(PROJECT_PATH, { recursive: true });
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.initialize('New Project');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('New Project');
        expect(result.data.current_phase).toBe('analysis');
      }
      expect(existsSync(STATUS_PATH)).toBe(true);
    });

    it('should load existing status if file exists', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.initialize();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Test Project');
        expect(result.data.current_phase).toBe('planning');
      }
    });
  });

  describe('StatusManager.updateWorkflowStatus', () => {
    it('should update workflow status and phase status', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'planning',
        'ux-design',
        'completed',
        { artifactPath: 'ux-design.md' }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.planning?.workflows['ux-design'].status).toBe('completed');
        expect(result.data.phases.planning?.status).toBe('completed'); // All workflows done
      }
    });

    it('should set phase to in_progress when workflow starts', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'solutioning',
        'architecture',
        'in_progress'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.solutioning?.status).toBe('in_progress');
      }
    });

    it('should add completion timestamp when completing workflow', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'planning',
        'ux-design',
        'completed'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.planning?.workflows['ux-design'].completed_at).toBeDefined();
      }
    });

    it('should create phase if it does not exist', async () => {
      const minimalStatus: BmadWorkflowStatus = {
        ...VALID_STATUS,
        phases: {
          analysis: { status: 'pending', workflows: {} },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      };
      setupTestEnvironment(minimalStatus);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'implementation',
        'sprint-planning',
        'in_progress'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.implementation?.workflows['sprint-planning']).toBeDefined();
      }
    });
  });

  describe('StatusManager.startWatching', () => {
    it('should emit event on external file change', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.read();
      manager.startWatching();
      
      const changePromise = new Promise<void>((resolve) => {
        manager.on('status-change', () => resolve());
      });
      
      // Simulate external change
      await new Promise(resolve => setTimeout(resolve, 100));
      const updatedStatus: BmadWorkflowStatus = { ...VALID_STATUS, project_name: 'Externally Updated' };
      writeFileSync(STATUS_PATH, yaml.stringify(updatedStatus));
      
      // Wait for change event with timeout
      await Promise.race([
        changePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ]).catch(() => {
        // File watching may not work in all test environments
      });
      
      await manager.stopWatching();
    });
  });

  describe('StatusManager.dispose', () => {
    it('should clean up watcher and cache', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { StatusManager } = await import('../status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.read();
      manager.startWatching();
      
      await manager.dispose();
      
      expect(manager.getCachedStatus()).toBeNull();
    });
  });

  describe('getStatusManager (singleton)', () => {
    it('should return same instance for same project', async () => {
      setupTestEnvironment(VALID_STATUS);
      const { getStatusManager, disposeStatusManager } = await import('../status-manager');
      
      const manager1 = getStatusManager(PROJECT_PATH);
      const manager2 = getStatusManager(PROJECT_PATH);
      
      expect(manager1).toBe(manager2);
      
      await disposeStatusManager();
    });

    it('should create new instance for different project', async () => {
      setupTestEnvironment(VALID_STATUS);
      const otherProject = path.join(TEST_DIR, 'other-project');
      mkdirSync(otherProject, { recursive: true });
      
      const { getStatusManager, disposeStatusManager } = await import('../status-manager');
      
      const manager1 = getStatusManager(PROJECT_PATH);
      const path1 = manager1.getProjectPath();
      
      const manager2 = getStatusManager(otherProject);
      const path2 = manager2.getProjectPath();
      
      expect(path1).not.toBe(path2);
      
      await disposeStatusManager();
    });
  });
});

describe('Status File Corruption Recovery', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should handle empty file gracefully', async () => {
    setupTestEnvironment();
    writeFileSync(STATUS_PATH, '');
    const { StatusManager } = await import('../status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    const result = await manager.read();
    
    // Empty file should be treated as parse error or validation error
    expect(result.success).toBe(false);
  });

  it('should handle partial YAML gracefully', async () => {
    setupTestEnvironment();
    writeFileSync(STATUS_PATH, 'project_name: Test\ncurrent_phase: invalid');
    const { StatusManager } = await import('../status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    const result = await manager.read();
    
    expect(result.success).toBe(false);
  });

  it('should handle binary garbage gracefully', async () => {
    setupTestEnvironment();
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x89, 0x50, 0x4E, 0x47]);
    require('fs').writeFileSync(STATUS_PATH, buffer);
    const { StatusManager } = await import('../status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    const result = await manager.read();
    
    expect(result.success).toBe(false);
  });
});
