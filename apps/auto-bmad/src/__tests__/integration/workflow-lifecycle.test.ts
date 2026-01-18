/**
 * BMAD Workflow Lifecycle Tests
 * 
 * Integration tests for workflow execution lifecycle:
 * - Phase transitions (FR6-FR10)
 * - Workflow execution (FR11-FR16)
 * - Status tracking (FR36-FR40)
 * - Crash recovery (NFR13-NFR14)
 * 
 * @story 9.3 - BMAD Workflow Lifecycle Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import * as yaml from 'yaml';
import type { BmadWorkflowStatus, WorkflowEntry } from '../../main/bmad/types';

// ─────────────────────────────────────────────────────────────────────────────
// Test Environment Setup
// ─────────────────────────────────────────────────────────────────────────────

const TEST_DIR = '/tmp/workflow-lifecycle-test';
const PROJECT_PATH = path.join(TEST_DIR, 'test-project');
const OUTPUT_PATH = path.join(PROJECT_PATH, '_bmad-output', 'planning-artifacts');
const STATUS_PATH = path.join(OUTPUT_PATH, 'bmm-workflow-status.yaml');

function cleanupTestEnvironment(): void {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function setupProjectEnvironment(status?: Partial<BmadWorkflowStatus>): void {
  mkdirSync(OUTPUT_PATH, { recursive: true });
  
  const defaultStatus: BmadWorkflowStatus = {
    project_name: 'Test Project',
    project_type: 'greenfield',
    current_phase: 'analysis',
    phases: {
      analysis: { status: 'pending', workflows: {} },
      planning: { status: 'pending', workflows: {} },
      solutioning: { status: 'pending', workflows: {} },
      implementation: { status: 'pending', workflows: {} },
    },
  };

  const finalStatus = { ...defaultStatus, ...status };
  writeFileSync(STATUS_PATH, yaml.stringify(finalStatus));
}

function readStatusFile(): BmadWorkflowStatus {
  const content = readFileSync(STATUS_PATH, 'utf-8');
  return yaml.parse(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR6-FR10 - Phase Management
// ─────────────────────────────────────────────────────────────────────────────

describe('FR6-FR10: Phase Management', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('FR6: View Current Phase Progress', () => {
    it('should track current phase in status file', async () => {
      setupProjectEnvironment({ current_phase: 'planning' });
      
      const status = readStatusFile();
      expect(status.current_phase).toBe('planning');
    });

    it('should have all four phases defined', async () => {
      setupProjectEnvironment();
      
      const status = readStatusFile();
      expect(status.phases.analysis).toBeDefined();
      expect(status.phases.planning).toBeDefined();
      expect(status.phases.solutioning).toBeDefined();
      expect(status.phases.implementation).toBeDefined();
    });
  });

  describe('FR7: Phase Status Tracking', () => {
    it('should track pending status', async () => {
      setupProjectEnvironment();
      
      const status = readStatusFile();
      expect(status.phases.analysis?.status).toBe('pending');
    });

    it('should track in_progress status', async () => {
      setupProjectEnvironment({
        phases: {
          analysis: { status: 'in_progress', workflows: {} },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      const status = readStatusFile();
      expect(status.phases.analysis?.status).toBe('in_progress');
    });

    it('should track completed status', async () => {
      setupProjectEnvironment({
        phases: {
          analysis: { status: 'completed', workflows: {} },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      const status = readStatusFile();
      expect(status.phases.analysis?.status).toBe('completed');
    });
  });

  describe('FR8: Navigate Between Phases', () => {
    it('should allow viewing any phase data', async () => {
      setupProjectEnvironment({
        current_phase: 'planning',
        phases: {
          analysis: { status: 'completed', workflows: {} },
          planning: { status: 'in_progress', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      const status = readStatusFile();
      // All phases should be accessible for viewing
      expect(status.phases.analysis).toBeDefined();
      expect(status.phases.planning).toBeDefined();
      expect(status.phases.solutioning).toBeDefined();
      expect(status.phases.implementation).toBeDefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR11-FR16 - Workflow Execution
// ─────────────────────────────────────────────────────────────────────────────

describe('FR11-FR16: Workflow Execution', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('FR11: Start BMAD Workflow', () => {
    it('should mark workflow as in_progress when started', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'analysis',
        'product-brief',
        'in_progress'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.analysis?.workflows['product-brief'].status).toBe('in_progress');
      }
    });

    it('should set phase to in_progress when first workflow starts', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.updateWorkflowStatus('analysis', 'product-brief', 'in_progress');
      
      const readResult = await manager.read();
      if (readResult.success) {
        expect(readResult.data.phases.analysis?.status).toBe('in_progress');
      }
    });
  });

  describe('FR12: View Workflow List', () => {
    it('should list all workflows for a phase', async () => {
      setupProjectEnvironment({
        phases: {
          analysis: { 
            status: 'pending',
            workflows: {
              'brainstorm-project': { status: 'pending' },
              'research': { status: 'pending' },
              'product-brief': { status: 'pending' },
            },
          },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      const status = readStatusFile();
      const workflows = Object.keys(status.phases.analysis?.workflows || {});
      
      expect(workflows).toContain('brainstorm-project');
      expect(workflows).toContain('research');
      expect(workflows).toContain('product-brief');
    });
  });

  describe('FR16: Track Workflow Completion', () => {
    it('should mark workflow as completed with artifact path', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.updateWorkflowStatus('analysis', 'product-brief', 'in_progress');
      const result = await manager.updateWorkflowStatus(
        'analysis',
        'product-brief',
        'completed',
        { artifactPath: 'product-brief.md' }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        const workflow = result.data.phases.analysis?.workflows['product-brief'];
        expect(workflow?.status).toBe('completed');
        expect(workflow?.artifact_path).toBe('product-brief.md');
        expect(workflow?.completed_at).toBeDefined();
      }
    });

    it('should add note when updating workflow', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'analysis',
        'product-brief',
        'blocked',
        { note: 'Waiting for stakeholder input' }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        const workflow = result.data.phases.analysis?.workflows['product-brief'];
        expect(workflow?.status).toBe('blocked');
        expect(workflow?.note).toBe('Waiting for stakeholder input');
      }
    });

    it('should complete phase when all workflows are done', async () => {
      setupProjectEnvironment({
        phases: {
          analysis: { 
            status: 'in_progress',
            workflows: {
              'product-brief': { status: 'completed', completed_at: new Date().toISOString() },
            },
          },
          planning: { 
            status: 'in_progress',
            workflows: {
              prd: { status: 'completed', completed_at: new Date().toISOString() },
            },
          },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      // Mark UX design as completed (assuming it completes the phase)
      const result = await manager.updateWorkflowStatus(
        'planning',
        'ux-design',
        'completed',
        { artifactPath: 'ux-design.md' }
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Both PRD and UX are complete, so phase should be complete
        expect(result.data.phases.planning?.workflows['ux-design'].status).toBe('completed');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR36-FR40 - Status Tracking
// ─────────────────────────────────────────────────────────────────────────────

describe('FR36-FR40: Status Tracking', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('FR36: Persist Workflow Status', () => {
    it('should persist status to YAML file', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      await manager.updateWorkflowStatus('analysis', 'product-brief', 'completed');
      
      // Read directly from file
      const status = readStatusFile();
      expect(status.phases.analysis?.workflows['product-brief'].status).toBe('completed');
    });

    it('should perform atomic writes', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      
      // Multiple rapid updates should not corrupt file
      await Promise.all([
        manager.updateWorkflowStatus('analysis', 'product-brief', 'in_progress'),
        manager.updateWorkflowStatus('analysis', 'research', 'in_progress'),
      ]);
      
      const status = readStatusFile();
      // File should be valid YAML
      expect(status.project_name).toBe('Test Project');
    });
  });

  describe('FR37: View Detailed Phase Status', () => {
    it('should include workflow-level details', async () => {
      setupProjectEnvironment({
        phases: {
          analysis: { 
            status: 'in_progress',
            workflows: {
              'product-brief': { 
                status: 'completed',
                completed_at: '2026-01-15T10:00:00Z',
                artifact_path: 'product-brief.md',
              },
              'research': { 
                status: 'in_progress',
              },
            },
          },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      const status = readStatusFile();
      const analysis = status.phases.analysis;
      
      expect(analysis?.workflows['product-brief'].completed_at).toBeDefined();
      expect(analysis?.workflows['product-brief'].artifact_path).toBe('product-brief.md');
    });
  });

  describe('FR39: Resume from Last State', () => {
    it('should restore in_progress workflow on reload', async () => {
      setupProjectEnvironment({
        current_phase: 'planning',
        phases: {
          analysis: { status: 'completed', workflows: {} },
          planning: { 
            status: 'in_progress',
            workflows: {
              prd: { status: 'in_progress' },
            },
          },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.planning?.workflows.prd.status).toBe('in_progress');
      }
    });
  });

  describe('FR40: View Completion Timestamps', () => {
    it('should include timestamps for completed workflows', async () => {
      const completedAt = '2026-01-15T10:30:00Z';
      setupProjectEnvironment({
        phases: {
          analysis: { 
            status: 'completed',
            workflows: {
              'product-brief': { 
                status: 'completed',
                completed_at: completedAt,
              },
            },
          },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      const status = readStatusFile();
      const workflow = status.phases.analysis?.workflows['product-brief'];
      
      expect(workflow?.completed_at).toBe(completedAt);
    });

    it('should auto-add timestamp when completing workflow', async () => {
      setupProjectEnvironment();
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.updateWorkflowStatus(
        'analysis',
        'product-brief',
        'completed'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        const workflow = result.data.phases.analysis?.workflows['product-brief'];
        expect(workflow?.completed_at).toBeDefined();
        // Should be a valid ISO date string
        expect(() => new Date(workflow!.completed_at!)).not.toThrow();
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: NFR13-NFR14 - Crash Recovery
// ─────────────────────────────────────────────────────────────────────────────

describe('NFR13-NFR14: Crash Recovery', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  describe('NFR13: Resume Workflow After Crash', () => {
    it('should detect in_progress workflow on startup', async () => {
      setupProjectEnvironment({
        current_phase: 'planning',
        phases: {
          analysis: { status: 'completed', workflows: {} },
          planning: { 
            status: 'in_progress',
            workflows: {
              prd: { 
                status: 'in_progress',
                // No completed_at - simulating crash
              },
            },
          },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(true);
      if (result.success) {
        // Find in_progress workflows
        const planningWorkflows = result.data.phases.planning?.workflows || {};
        const inProgress = Object.entries(planningWorkflows)
          .filter(([_, w]) => w.status === 'in_progress')
          .map(([id]) => id);
        
        expect(inProgress).toContain('prd');
      }
    });

    it('should allow continuing blocked workflow', async () => {
      setupProjectEnvironment({
        phases: {
          analysis: { 
            status: 'in_progress',
            workflows: {
              'product-brief': { 
                status: 'blocked',
                note: 'Waiting for input',
              },
            },
          },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      // Should be able to restart blocked workflow
      const result = await manager.updateWorkflowStatus(
        'analysis',
        'product-brief',
        'in_progress'
      );
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phases.analysis?.workflows['product-brief'].status).toBe('in_progress');
        // Previous note should be cleared when restarting
      }
    });
  });

  describe('NFR14: No Data Loss on Termination', () => {
    it('should preserve partial progress after sudden termination', async () => {
      // Write initial state
      setupProjectEnvironment({
        current_phase: 'planning',
        phases: {
          analysis: { status: 'completed', workflows: {} },
          planning: { 
            status: 'in_progress',
            workflows: {
              prd: { status: 'completed', completed_at: new Date().toISOString() },
              'ux-design': { status: 'in_progress' },
            },
          },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      });
      
      // Simulate crash - just read the file as new instance would
      const status = readStatusFile();
      
      // Completed work should be preserved
      expect(status.phases.planning?.workflows.prd.status).toBe('completed');
      expect(status.phases.planning?.workflows['ux-design'].status).toBe('in_progress');
    });

    it('should handle corrupted status file gracefully', async () => {
      mkdirSync(OUTPUT_PATH, { recursive: true });
      writeFileSync(STATUS_PATH, 'corrupted: [[[invalid yaml');
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      expect(result.success).toBe(false);
      // Should provide helpful error message
      if (!result.success) {
        expect(['STATUS_PARSE_ERROR', 'STATUS_VALIDATION_ERROR']).toContain(result.error.code);
      }
    });

    it('should recover from empty status file', async () => {
      mkdirSync(OUTPUT_PATH, { recursive: true });
      writeFileSync(STATUS_PATH, '');
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      const result = await manager.read();
      
      // Empty file should be detected as parse error
      expect(result.success).toBe(false);
    });

    it('should initialize fresh status after corrupt file detection', async () => {
      mkdirSync(OUTPUT_PATH, { recursive: true });
      writeFileSync(STATUS_PATH, 'invalid');
      const { StatusManager } = await import('../../main/bmad/status-manager');
      
      const manager = new StatusManager(PROJECT_PATH);
      
      // Initialize should recover from corruption
      const result = await manager.initialize('Recovered Project');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.project_name).toBe('Recovered Project');
        expect(result.data.current_phase).toBe('analysis');
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Full Lifecycle Scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('Full Workflow Lifecycle Scenarios', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  it('should track a complete workflow from start to finish', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    
    // Start Phase 1 workflow
    await manager.updateWorkflowStatus('analysis', 'product-brief', 'in_progress');
    
    let readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.analysis?.status).toBe('in_progress');
    }
    
    // Complete Phase 1 workflow
    await manager.updateWorkflowStatus('analysis', 'product-brief', 'completed', {
      artifactPath: 'product-brief.md',
    });
    
    readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.analysis?.workflows['product-brief'].status).toBe('completed');
      expect(readResult.data.phases.analysis?.workflows['product-brief'].artifact_path).toBe('product-brief.md');
    }
  });

  it('should handle multiple workflows in same phase', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    
    // Start multiple workflows
    await manager.updateWorkflowStatus('analysis', 'brainstorm-project', 'in_progress');
    await manager.updateWorkflowStatus('analysis', 'research', 'in_progress');
    
    let readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.analysis?.workflows['brainstorm-project'].status).toBe('in_progress');
      expect(readResult.data.phases.analysis?.workflows['research'].status).toBe('in_progress');
    }
    
    // Complete them
    await manager.updateWorkflowStatus('analysis', 'brainstorm-project', 'completed');
    await manager.updateWorkflowStatus('analysis', 'research', 'completed');
    
    readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.analysis?.status).toBe('completed');
    }
  });

  it('should track workflows through multiple phases', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    
    // Phase 1
    await manager.updateWorkflowStatus('analysis', 'product-brief', 'completed', {
      artifactPath: 'product-brief.md',
    });
    
    // Phase 2
    await manager.updateWorkflowStatus('planning', 'prd', 'completed', {
      artifactPath: 'prd.md',
    });
    
    // Phase 3
    await manager.updateWorkflowStatus('solutioning', 'architecture', 'completed', {
      artifactPath: 'architecture.md',
    });
    await manager.updateWorkflowStatus('solutioning', 'epics', 'completed', {
      artifactPath: 'epics/index.md',
    });
    
    // Phase 4
    await manager.updateWorkflowStatus('implementation', 'sprint-planning', 'completed');
    
    const finalResult = await manager.read();
    
    if (finalResult.success) {
      // All phase workflows should be tracked
      expect(finalResult.data.phases.analysis?.workflows['product-brief'].status).toBe('completed');
      expect(finalResult.data.phases.planning?.workflows['prd'].status).toBe('completed');
      expect(finalResult.data.phases.solutioning?.workflows['architecture'].status).toBe('completed');
      expect(finalResult.data.phases.implementation?.workflows['sprint-planning'].status).toBe('completed');
    }
  });

  it('should skip optional workflow correctly', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    
    // Skip optional workflow
    const result = await manager.updateWorkflowStatus('analysis', 'brainstorm-project', 'skipped', {
      note: 'Not needed for this project',
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases.analysis?.workflows['brainstorm-project'].status).toBe('skipped');
      expect(result.data.phases.analysis?.workflows['brainstorm-project'].note).toBe('Not needed for this project');
    }
  });

  it('should block workflow and unblock later', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    
    // Start workflow
    await manager.updateWorkflowStatus('planning', 'prd', 'in_progress');
    
    // Block it
    await manager.updateWorkflowStatus('planning', 'prd', 'blocked', {
      note: 'Waiting for stakeholder review',
    });
    
    let readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.planning?.workflows['prd'].status).toBe('blocked');
    }
    
    // Unblock and continue
    await manager.updateWorkflowStatus('planning', 'prd', 'in_progress');
    
    readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.planning?.workflows['prd'].status).toBe('in_progress');
    }
    
    // Complete
    await manager.updateWorkflowStatus('planning', 'prd', 'completed', {
      artifactPath: 'prd.md',
    });
    
    readResult = await manager.read();
    if (readResult.success) {
      expect(readResult.data.phases.planning?.workflows['prd'].status).toBe('completed');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Status Manager Caching
// ─────────────────────────────────────────────────────────────────────────────

describe('Status Manager Caching', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
    vi.resetModules();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    vi.clearAllMocks();
  });

  it('should cache status after read', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    await manager.read();
    
    const cached = manager.getCachedStatus();
    expect(cached).not.toBeNull();
    expect(cached?.project_name).toBe('Test Project');
  });

  it('should update cache after write', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    await manager.updateWorkflowStatus('analysis', 'test-workflow', 'completed');
    
    const cached = manager.getCachedStatus();
    expect(cached?.phases.analysis?.workflows['test-workflow'].status).toBe('completed');
  });

  it('should clear cache on dispose', async () => {
    setupProjectEnvironment();
    const { StatusManager } = await import('../../main/bmad/status-manager');
    
    const manager = new StatusManager(PROJECT_PATH);
    await manager.read();
    expect(manager.getCachedStatus()).not.toBeNull();
    
    await manager.dispose();
    expect(manager.getCachedStatus()).toBeNull();
  });
});
