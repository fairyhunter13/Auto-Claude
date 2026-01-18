/**
 * Human Review Store Unit Tests
 * Tests human review checkpoint management and decision handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  useHumanReviewStore,
  createWorkflowReviewCheckpoint,
  createStoryReviewCheckpoint,
  createGateReviewCheckpoint,
} from '../stores/human-review-store';
import type { BmadPhaseId, WorkflowId, AgentId } from '../../shared/types';

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
  updateStatus: vi.fn().mockResolvedValue({ success: true }),
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
  useHumanReviewStore.getState().reset();
  
  // Clear all mocks
  vi.clearAllMocks();
});

describe('Human Review Store', () => {
  describe('addReviewCheckpoint', () => {
    it('should add a checkpoint to pending reviews', () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId,
        '/path/to/brief.md'
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      
      const state = useHumanReviewStore.getState();
      expect(state.pendingReviews).toHaveLength(1);
      expect(state.pendingReviews[0].itemId).toBe('product-brief');
    });
  });

  describe('removeReviewCheckpoint', () => {
    it('should remove a checkpoint from pending reviews', () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      expect(useHumanReviewStore.getState().pendingReviews).toHaveLength(1);
      
      useHumanReviewStore.getState().removeReviewCheckpoint(checkpoint.id);
      expect(useHumanReviewStore.getState().pendingReviews).toHaveLength(0);
    });
  });

  describe('openReview / closeReview', () => {
    it('should open a review by setting activeReview', () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      useHumanReviewStore.getState().openReview(checkpoint.id);
      
      const state = useHumanReviewStore.getState();
      expect(state.activeReview).not.toBeNull();
      expect(state.activeReview?.itemId).toBe('product-brief');
      expect(state.activeReview?.status).toBe('in_review');
    });

    it('should close the active review', () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      useHumanReviewStore.getState().openReview(checkpoint.id);
      useHumanReviewStore.getState().closeReview();
      
      expect(useHumanReviewStore.getState().activeReview).toBeNull();
    });
  });

  describe('approveReview', () => {
    it('should approve a review and move to completed', async () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      
      await useHumanReviewStore.getState().approveReview(checkpoint.id, 'Looks good!');
      
      const state = useHumanReviewStore.getState();
      expect(state.pendingReviews).toHaveLength(0);
      expect(state.completedReviews).toHaveLength(1);
      expect(state.completedReviews[0].status).toBe('approved');
      expect(state.completedReviews[0].decision?.type).toBe('approve');
      expect(state.completedReviews[0].decision?.feedback).toBe('Looks good!');
    });

    it('should call bmad:updateStatus IPC', async () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      await useHumanReviewStore.getState().approveReview(checkpoint.id);
      
      expect(mockBmadApi.updateStatus).toHaveBeenCalled();
    });
  });

  describe('requestChanges', () => {
    it('should mark review as changes_requested', async () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      
      await useHumanReviewStore.getState().requestChanges(
        checkpoint.id,
        'Please add more details',
        ['Add user personas', 'Include competitor analysis'],
        'in_progress'
      );
      
      const state = useHumanReviewStore.getState();
      expect(state.pendingReviews).toHaveLength(0);
      expect(state.completedReviews).toHaveLength(1);
      expect(state.completedReviews[0].status).toBe('changes_requested');
      expect(state.completedReviews[0].decision?.requestedChanges).toEqual([
        'Add user personas',
        'Include competitor analysis'
      ]);
    });
  });

  describe('regressReview', () => {
    it('should mark review as regressed with target phase', async () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        3,  // Phase 3 - solutioning
        'create-architecture' as WorkflowId,
        'Architecture',
        'architect' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      
      await useHumanReviewStore.getState().regressReview(
        checkpoint.id,
        2 as BmadPhaseId,  // Regress to Phase 2
        'Need to revise PRD first',
        ['prd' as WorkflowId]
      );
      
      const state = useHumanReviewStore.getState();
      expect(state.completedReviews).toHaveLength(1);
      expect(state.completedReviews[0].status).toBe('regressed');
      expect(state.completedReviews[0].decision?.regression?.targetPhase).toBe(2);
    });

    it('should reject invalid regression targets', async () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        2,  // Phase 2 - planning
        'prd' as WorkflowId,
        'PRD',
        'pm' as AgentId
      );
      
      useHumanReviewStore.getState().addReviewCheckpoint(checkpoint);
      
      // Try to regress from Phase 2 to Phase 4 (invalid - forward)
      await useHumanReviewStore.getState().regressReview(
        checkpoint.id,
        4 as BmadPhaseId,
        'Invalid regression'
      );
      
      // Should set an error
      const state = useHumanReviewStore.getState();
      expect(state.error).toBeTruthy();
      // Checkpoint should still be in pending
      expect(state.pendingReviews).toHaveLength(1);
    });
  });

  describe('Selectors', () => {
    beforeEach(() => {
      // Add checkpoints for different phases
      useHumanReviewStore.getState().addReviewCheckpoint(
        createWorkflowReviewCheckpoint('proj', 1, 'product-brief' as WorkflowId, 'Brief', 'analyst' as AgentId)
      );
      useHumanReviewStore.getState().addReviewCheckpoint(
        createWorkflowReviewCheckpoint('proj', 2, 'prd' as WorkflowId, 'PRD', 'pm' as AgentId)
      );
      useHumanReviewStore.getState().addReviewCheckpoint(
        createStoryReviewCheckpoint('proj', 'story-1', 'Story 1', 1, 1, 'dev' as AgentId)
      );
    });

    it('should get pending count', () => {
      expect(useHumanReviewStore.getState().getPendingCount()).toBe(3);
    });

    it('should get reviews by phase', () => {
      const phase1Reviews = useHumanReviewStore.getState().getReviewsByPhase(1);
      expect(phase1Reviews).toHaveLength(1);
      expect(phase1Reviews[0].itemId).toBe('product-brief');
    });

    it('should get reviews by type', () => {
      const workflowReviews = useHumanReviewStore.getState().getReviewsByType('workflow');
      expect(workflowReviews).toHaveLength(2);
      
      const storyReviews = useHumanReviewStore.getState().getReviewsByType('story');
      expect(storyReviews).toHaveLength(1);
    });

    it('should check if story is in review', () => {
      expect(useHumanReviewStore.getState().hasStoryInReview('story-1')).toBe(true);
      expect(useHumanReviewStore.getState().hasStoryInReview('story-999')).toBe(false);
    });
  });

  describe('Helper Functions', () => {
    it('should create workflow review checkpoint', () => {
      const checkpoint = createWorkflowReviewCheckpoint(
        'test-project',
        1,
        'product-brief' as WorkflowId,
        'Product Brief',
        'analyst' as AgentId,
        '/path/to/brief.md'
      );
      
      expect(checkpoint.id).toContain('review-test-project-product-brief');
      expect(checkpoint.projectId).toBe('test-project');
      expect(checkpoint.itemType).toBe('workflow');
      expect(checkpoint.itemId).toBe('product-brief');
      expect(checkpoint.phase).toBe(1);
      expect(checkpoint.status).toBe('pending');
      expect(checkpoint.artifacts).toHaveLength(1);
      expect(checkpoint.artifacts?.[0].path).toBe('/path/to/brief.md');
    });

    it('should create story review checkpoint', () => {
      const checkpoint = createStoryReviewCheckpoint(
        'test-project',
        'story-123',
        'Implement login',
        1,
        1,
        'dev' as AgentId,
        [{ path: 'src/login.ts', type: 'added' }]
      );
      
      expect(checkpoint.itemType).toBe('story');
      expect(checkpoint.phase).toBe(4);  // Stories are always in Phase 4
      expect(checkpoint.storyInfo?.epicId).toBe(1);
      expect(checkpoint.storyInfo?.sprintNumber).toBe(1);
      expect(checkpoint.changes).toHaveLength(1);
    });

    it('should create gate review checkpoint', () => {
      const checkpoint = createGateReviewCheckpoint(
        'test-project',
        1,
        2,
        ['product-brief' as WorkflowId],
        [
          { id: 'req-1', category: 'Requirements', description: 'All requirements documented', required: true, passed: true }
        ]
      );
      
      expect(checkpoint.itemType).toBe('gate');
      expect(checkpoint.gateInfo?.fromPhase).toBe(1);
      expect(checkpoint.gateInfo?.toPhase).toBe(2);
      expect(checkpoint.checklist).toHaveLength(1);
    });
  });
});
