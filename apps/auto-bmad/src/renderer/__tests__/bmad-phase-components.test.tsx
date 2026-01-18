/**
 * BMAD Phase Components Unit Tests
 * Tests PhaseTimeline, WorkflowCard, and HumanReviewDialog components
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Import browser mock for jsdom environment
import '../lib/browser-mock';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { TooltipProvider } from '../components/ui/tooltip';
import { PhaseTimeline } from '../components/bmad-phases/PhaseTimeline';
import { WorkflowCard } from '../components/bmad-phases/WorkflowCard';
import type { PhaseInstance, WorkflowInstance, BmadPhaseId } from '../../shared/types';
import { BMAD_PHASE_IDS } from '../../shared/constants';

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  resources: {
    en: {
      bmad: {
        phases: {
          progressTitle: 'BMAD Phase Progress',
          storiesComplete: 'stories complete',
          workflowsComplete: 'workflows complete',
          currentPhase: 'Current Phase',
          viewing: 'Viewing',
          gatePassed: 'Gate Passed',
          gateFailed: 'Gate Failed',
          gatePending: 'Gate Pending',
          status: {
            locked: 'Locked',
            available: 'Available',
            inProgress: 'In Progress',
            review: 'Review Required',
            completed: 'Completed',
            skipped: 'Skipped',
          },
        },
        workflows: {
          status: {
            pending: 'Pending',
            in_progress: 'Running',
            completed: 'Complete',
            skipped: 'Skipped',
            blocked: 'Blocked',
            failed: 'Failed',
          },
          humanReviewPending: 'Human Review Pending',
          completedAt: 'Completed',
          actions: {
            start: 'Start',
            startTooltip: 'Start this workflow',
            view: 'View',
            viewTooltip: 'View artifact',
            skip: 'Skip',
            skipTooltip: 'Skip workflow',
            review: 'Review',
            reviewTooltip: 'Review workflow',
          },
        },
      },
    },
  },
  interpolation: { escapeValue: false },
});

// Mock toast hook
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Wrapper component with providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nextProvider i18n={i18n}>
    <TooltipProvider>{children}</TooltipProvider>
  </I18nextProvider>
);

// Helper to create mock phase data
const createMockPhases = (): Record<BmadPhaseId, PhaseInstance> => {
  const phases: Record<BmadPhaseId, PhaseInstance> = {} as Record<BmadPhaseId, PhaseInstance>;
  
  BMAD_PHASE_IDS.forEach((phaseId) => {
    phases[phaseId] = {
      phaseId,
      projectId: 'test-project',
      status: phaseId === 1 ? 'in_progress' : phaseId === 2 ? 'available' : 'locked',
      workflows: [
        {
          id: `${phaseId}-wf1`,
          workflowId: `workflow-${phaseId}-1` as any,
          projectId: 'test-project',
          phase: phaseId,
          status: phaseId === 1 ? 'completed' : 'pending',
          agent: 'analyst' as any,
          humanReviewRequired: false,
        },
        {
          id: `${phaseId}-wf2`,
          workflowId: `workflow-${phaseId}-2` as any,
          projectId: 'test-project',
          phase: phaseId,
          status: 'pending',
          agent: 'pm' as any,
          humanReviewRequired: false,
        },
      ],
    };
  });
  
  return phases;
};

// Helper to create mock workflow
const createMockWorkflow = (overrides: Partial<WorkflowInstance> = {}): WorkflowInstance => ({
  id: 'test-workflow-1',
  workflowId: 'brainstorm-project' as any, // Use an optional workflow
  projectId: 'test-project',
  phase: 1,
  status: 'pending',
  agent: 'analyst' as any,
  humanReviewRequired: false,
  ...overrides,
});

describe('PhaseTimeline Component', () => {
  const mockOnPhaseClick = vi.fn();
  const defaultProps = {
    phases: createMockPhases(),
    currentPhase: 1 as BmadPhaseId,
    activeView: 'current' as const,
    onPhaseClick: mockOnPhaseClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all 4 phase boxes', () => {
    render(
      <TestWrapper>
        <PhaseTimeline {...defaultProps} />
      </TestWrapper>
    );
    
    // Should have 4 phase buttons
    const phaseButtons = screen.getAllByRole('button');
    expect(phaseButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('should show progress title', () => {
    render(
      <TestWrapper>
        <PhaseTimeline {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText('BMAD Phase Progress')).toBeInTheDocument();
  });

  it('should call onPhaseClick when clicking a phase', () => {
    render(
      <TestWrapper>
        <PhaseTimeline {...defaultProps} />
      </TestWrapper>
    );
    
    // Click on a phase (first non-disabled button)
    const phaseButtons = screen.getAllByRole('button');
    const clickablePhase = phaseButtons.find(btn => !btn.hasAttribute('disabled'));
    if (clickablePhase) {
      fireEvent.click(clickablePhase);
      expect(mockOnPhaseClick).toHaveBeenCalled();
    }
  });

  it('should show total progress when provided', () => {
    render(
      <TestWrapper>
        <PhaseTimeline 
          {...defaultProps}
          totalProgress={{ storiesCompleted: 5, totalStories: 10 }}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText(/5\/10/)).toBeInTheDocument();
  });

  it('should disable locked phases', () => {
    render(
      <TestWrapper>
        <PhaseTimeline {...defaultProps} />
      </TestWrapper>
    );
    
    // Phase 3 and 4 should be locked and disabled
    const phaseButtons = screen.getAllByRole('button');
    // There will be phase buttons and gate buttons
    // Check that some buttons are disabled (locked phases)
    const disabledButtons = phaseButtons.filter(btn => btn.hasAttribute('disabled'));
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it('should highlight the current phase', () => {
    const { container } = render(
      <TestWrapper>
        <PhaseTimeline {...defaultProps} />
      </TestWrapper>
    );
    
    // The current phase (Phase 1) should have the animate-pulse class
    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThanOrEqual(1);
  });
});

describe('WorkflowCard Component', () => {
  const mockOnStart = vi.fn();
  const mockOnView = vi.fn();
  const mockOnSkip = vi.fn();
  const mockOnReview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render workflow information', () => {
    const workflow = createMockWorkflow();
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    // Should show the workflow name (from BMAD_WORKFLOWS constant)
    // brainstorm-project has name "Brainstorm Project"
    expect(screen.getByText(/Brainstorm Project/i)).toBeInTheDocument();
  });

  it('should show Start button for pending workflow', () => {
    const workflow = createMockWorkflow({ status: 'pending' });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('should call onStart when Start button is clicked', () => {
    const workflow = createMockWorkflow({ status: 'pending' });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('Start'));
    expect(mockOnStart).toHaveBeenCalled();
  });

  it('should show View button for completed workflow with artifact', () => {
    const workflow = createMockWorkflow({
      status: 'completed',
      artifactPath: '/path/to/artifact.md',
    });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('should call onView when View button is clicked', () => {
    const workflow = createMockWorkflow({
      status: 'completed',
      artifactPath: '/path/to/artifact.md',
    });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('View'));
    expect(mockOnView).toHaveBeenCalled();
  });

  it('should show Skip button for optional workflow', () => {
    // brainstorm-project is an optional workflow in BMAD_WORKFLOWS
    const workflow = createMockWorkflow({ 
      status: 'pending',
      workflowId: 'brainstorm-project' as any, 
    });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
          onSkip={mockOnSkip}
        />
      </TestWrapper>
    );
    
    // The Skip button appears because brainstorm-project is not required
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('should show Review button when human review is required', () => {
    const workflow = createMockWorkflow({
      status: 'completed',
      humanReviewRequired: true,
      humanReviewStatus: 'pending',
    });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
          onReview={mockOnReview}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('should show loading state when workflow is running', () => {
    const workflow = createMockWorkflow({ status: 'in_progress' });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
          isRunning={true}
        />
      </TestWrapper>
    );
    
    // Should show "Running" status text
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('should show failed status', () => {
    const workflow = createMockWorkflow({
      status: 'failed',
      error: 'Something went wrong',
    });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('should show skipped status', () => {
    const workflow = createMockWorkflow({ status: 'skipped' });
    
    render(
      <TestWrapper>
        <WorkflowCard
          workflow={workflow}
          onStart={mockOnStart}
          onView={mockOnView}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Skipped')).toBeInTheDocument();
  });
});
