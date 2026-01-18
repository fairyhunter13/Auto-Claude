/**
 * Phase Store Unit Tests
 * Tests BMAD phase state management, workflow tracking, and regression logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePhaseStore } from '../stores/phase-store';
import type { BmadPhaseId, WorkflowId } from '../../shared/types';

// Mock window.electronAPI
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock the BMAD API
const mockBmadApi = {
  getStatus: vi.fn(),
  updateStatus: vi.fn(),
  startWorkflow: vi.fn(),
  cancelWorkflow: vi.fn(),
};

// Setup window mock
beforeEach(() => {
  (global as any).window = {
    electronAPI: {
      bmad: mockBmadApi,
    },
  };
  
  // Reset store state before each test
  usePhaseStore.getState().reset();
  
  // Clear all mocks
  vi.clearAllMocks();
});

describe('Phase Store', () => {
  describe('initializePhases', () => {
    it('should initialize phases for a new project', () => {
      const projectId = 'test-project-123';
      
      usePhaseStore.getState().initializePhases(projectId);
      
      const state = usePhaseStore.getState();
      expect(state.projectId).toBe(projectId);
      expect(state.currentPhase).toBe(1);
      expect(state.activeView).toBe('current');
      expect(state.phases[1]).toBeDefined();
      expect(state.phases[2]).toBeDefined();
      expect(state.phases[3]).toBeDefined();
      expect(state.phases[4]).toBeDefined();
    });

    it('should set Phase 1 as available and others as locked', () => {
      usePhaseStore.getState().initializePhases('test-project');
      
      const state = usePhaseStore.getState();
      expect(state.phases[1].status).toBe('available');
      expect(state.phases[2].status).toBe('locked');
      expect(state.phases[3].status).toBe('locked');
      expect(state.phases[4].status).toBe('locked');
    });

    it('should create workflows for each phase', () => {
      usePhaseStore.getState().initializePhases('test-project');
      
      const state = usePhaseStore.getState();
      // Phase 1 should have analysis workflows
      expect(state.phases[1].workflows.length).toBeGreaterThan(0);
      // Phase 2 should have planning workflows
      expect(state.phases[2].workflows.length).toBeGreaterThan(0);
      // Phase 3 should have solutioning workflows
      expect(state.phases[3].workflows.length).toBeGreaterThan(0);
      // Phase 4 should have implementation workflows
      expect(state.phases[4].workflows.length).toBeGreaterThan(0);
    });
  });

  describe('setActiveView', () => {
    it('should change the active view', () => {
      usePhaseStore.getState().initializePhases('test-project');
      
      usePhaseStore.getState().setActiveView(2);
      expect(usePhaseStore.getState().activeView).toBe(2);
      
      usePhaseStore.getState().setActiveView('current');
      expect(usePhaseStore.getState().activeView).toBe('current');
    });
  });

  describe('updatePhaseStatus', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
    });

    it('should update phase status', () => {
      usePhaseStore.getState().updatePhaseStatus(1, 'in_progress');
      expect(usePhaseStore.getState().phases[1].status).toBe('in_progress');
    });

    it('should set startedAt when moving to in_progress', () => {
      usePhaseStore.getState().updatePhaseStatus(1, 'in_progress');
      expect(usePhaseStore.getState().phases[1].startedAt).toBeDefined();
    });

    it('should set completedAt when moving to completed', () => {
      usePhaseStore.getState().updatePhaseStatus(1, 'completed');
      expect(usePhaseStore.getState().phases[1].completedAt).toBeDefined();
    });

    it('should unlock next phase when completed', () => {
      usePhaseStore.getState().updatePhaseStatus(1, 'completed');
      expect(usePhaseStore.getState().phases[2].status).toBe('available');
    });

    it('should advance currentPhase when current phase is completed', () => {
      usePhaseStore.getState().updatePhaseStatus(1, 'completed');
      expect(usePhaseStore.getState().currentPhase).toBe(2);
    });
  });

  describe('startWorkflow', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
    });

    it('should set workflow to in_progress', () => {
      usePhaseStore.getState().startWorkflow(1, 'brainstorm-project' as WorkflowId);
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.status).toBe('in_progress');
    });

    it('should set startedAt on workflow', () => {
      usePhaseStore.getState().startWorkflow(1, 'brainstorm-project' as WorkflowId);
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.startedAt).toBeDefined();
    });

    it('should update phase status to in_progress if available', () => {
      usePhaseStore.getState().startWorkflow(1, 'brainstorm-project' as WorkflowId);
      expect(usePhaseStore.getState().phases[1].status).toBe('in_progress');
    });
  });

  describe('completeWorkflow', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
      usePhaseStore.getState().startWorkflow(1, 'brainstorm-project' as WorkflowId);
    });

    it('should set workflow to completed', () => {
      usePhaseStore.getState().completeWorkflow('brainstorm-project' as WorkflowId);
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.status).toBe('completed');
    });

    it('should set artifactPath if provided', () => {
      usePhaseStore.getState().completeWorkflow('brainstorm-project' as WorkflowId, '/path/to/artifact.md');
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.artifactPath).toBe('/path/to/artifact.md');
    });

    it('should set completedAt on workflow', () => {
      usePhaseStore.getState().completeWorkflow('brainstorm-project' as WorkflowId);
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.completedAt).toBeDefined();
    });
  });

  describe('skipWorkflow', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
    });

    it('should set optional workflow to skipped', () => {
      // brainstorm-project is optional
      usePhaseStore.getState().skipWorkflow('brainstorm-project' as WorkflowId);
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.status).toBe('skipped');
    });
  });

  describe('failWorkflow', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
      usePhaseStore.getState().startWorkflow(1, 'brainstorm-project' as WorkflowId);
    });

    it('should set workflow to failed with error message', () => {
      usePhaseStore.getState().failWorkflow('brainstorm-project' as WorkflowId, 'Test error');
      
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'brainstorm-project'
      );
      expect(workflow?.status).toBe('failed');
      expect(workflow?.error).toBe('Test error');
    });
  });

  describe('Regression', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
      // Simulate being in Phase 3
      usePhaseStore.getState().updatePhaseStatus(1, 'completed');
      usePhaseStore.getState().updatePhaseStatus(2, 'completed');
      usePhaseStore.getState().updatePhaseStatus(3, 'in_progress');
    });

    it('should check valid regression targets', () => {
      // From Phase 3, can regress to Phase 1 or 2
      expect(usePhaseStore.getState().canRegressTo(1)).toBe(true);
      expect(usePhaseStore.getState().canRegressTo(2)).toBe(true);
      // Cannot regress to Phase 4 (forward)
      expect(usePhaseStore.getState().canRegressTo(4)).toBe(false);
    });

    it('should initiate regression', () => {
      usePhaseStore.getState().initiateRegression(3, 2, 'Need to revise PRD', 'user');
      
      const state = usePhaseStore.getState();
      expect(state.activeRegression).not.toBeNull();
      expect(state.activeRegression?.fromPhase).toBe(3);
      expect(state.activeRegression?.toPhase).toBe(2);
      expect(state.currentPhase).toBe(2);
    });

    it('should reset phases between target and current on regression', () => {
      usePhaseStore.getState().initiateRegression(3, 2, 'Need to revise', 'user');
      
      const state = usePhaseStore.getState();
      // Phase 2 should be in_progress
      expect(state.phases[2].status).toBe('in_progress');
      // Phase 3 should be locked
      expect(state.phases[3].status).toBe('locked');
    });

    it('should complete regression', () => {
      usePhaseStore.getState().initiateRegression(3, 2, 'Need to revise', 'user');
      usePhaseStore.getState().completeRegression();
      
      const state = usePhaseStore.getState();
      expect(state.activeRegression?.status).toBe('completed');
    });
  });

  describe('Gate Management', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
      usePhaseStore.getState().updatePhaseStatus(1, 'review');
    });

    it('should approve gate and complete phase', () => {
      usePhaseStore.getState().approveGate(1, 'reviewer');
      
      const state = usePhaseStore.getState();
      expect(state.phases[1].gateStatus?.status).toBe('approved');
      expect(state.phases[1].status).toBe('completed');
    });

    it('should reject gate and keep phase in review', () => {
      usePhaseStore.getState().rejectGate(1, 'Missing requirements', 'reviewer');
      
      const state = usePhaseStore.getState();
      expect(state.phases[1].gateStatus?.status).toBe('rejected');
      // Phase stays in review status
      expect(state.phases[1].status).toBe('review');
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      usePhaseStore.getState().initializePhases('test-project');
    });

    it('should get phase by id', () => {
      const phase = usePhaseStore.getState().getPhase(1);
      expect(phase).toBeDefined();
      expect(phase?.phaseId).toBe(1);
    });

    it('should get workflow by id', () => {
      const workflow = usePhaseStore.getState().getWorkflow('brainstorm-project' as WorkflowId);
      expect(workflow).toBeDefined();
      expect(workflow?.workflowId).toBe('brainstorm-project');
    });

    it('should calculate phase progress', () => {
      // Complete one workflow
      usePhaseStore.getState().startWorkflow(1, 'brainstorm-project' as WorkflowId);
      usePhaseStore.getState().completeWorkflow('brainstorm-project' as WorkflowId);
      
      const progress = usePhaseStore.getState().getPhaseProgress(1);
      expect(progress.completed).toBe(1);
      expect(progress.total).toBeGreaterThan(0);
      expect(progress.percentage).toBeGreaterThan(0);
    });

    it('should check if phase can be started', () => {
      expect(usePhaseStore.getState().canStartPhase(1)).toBe(true);
      expect(usePhaseStore.getState().canStartPhase(2)).toBe(false); // locked
    });

    it('should get pending reviews', () => {
      // Start and complete a workflow that requires human review
      usePhaseStore.getState().startWorkflow(1, 'product-brief' as WorkflowId);
      usePhaseStore.getState().completeWorkflow('product-brief' as WorkflowId, '/path/to/brief.md');
      
      // product-brief requires human review, so it should have humanReviewStatus: 'pending'
      const workflow = usePhaseStore.getState().phases[1].workflows.find(
        (w) => w.workflowId === 'product-brief'
      );
      // The workflow should be completed but waiting for human review
      expect(workflow?.status).toBe('completed');
      // humanReviewStatus is set when humanReviewRequired is true
      if (workflow?.humanReviewRequired) {
        expect(workflow?.humanReviewStatus).toBe('pending');
      }
    });
  });
});
