/**
 * BMadPhaseBoard Component
 * Main container for the BMAD methodology phase-based view
 * Displays timeline at top with workspace below (phase detail or sprint kanban)
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, RotateCcw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/use-toast';
import { PhaseTimeline } from './PhaseTimeline';
import { PhaseDetail } from './PhaseDetail';
import { WorkflowCard } from './WorkflowCard';
import { HumanReviewDialog } from './HumanReviewDialog';
import { KanbanBoard } from '../KanbanBoard';
import { usePhaseStore } from '../../stores/phase-store';
import { useHumanReviewStore, createWorkflowReviewCheckpoint } from '../../stores/human-review-store';
import { BMAD_PHASES, BMAD_WORKFLOWS } from '../../../shared/constants';
import type { BmadPhaseId, WorkflowId, Task } from '../../../shared/types';
import type { WorkflowProgressEvent, WorkflowExitEvent, StatusChangeEvent } from '../../../preload/api/bmad-api';

// ============================================
// Types
// ============================================

interface BMadPhaseBoardProps {
  projectId: string;
  projectPath: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onNewTaskClick?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// ============================================
// BMadPhaseBoard Component
// ============================================

export const BMadPhaseBoard = memo(function BMadPhaseBoard({
  projectId,
  projectPath,
  tasks,
  onTaskClick,
  onNewTaskClick,
  onRefresh,
  isRefreshing,
}: BMadPhaseBoardProps) {
  const { t } = useTranslation('bmad');
  
  // Phase store
  const {
    currentPhase,
    activeView,
    phases,
    totalProgress,
    isLoading: phaseLoading,
    error: phaseError,
    activeRegression,
    loadProjectPhases,
    setActiveView,
    startWorkflow,
    completeWorkflow,
    skipWorkflow,
    approveGate,
    initiateRegression,
    completeRegression,
  } = usePhaseStore();

  // Human review store
  const {
    pendingReviews,
    activeReview,
    isSubmitting,
    loadReviewQueue,
    openReview,
    closeReview,
    approveReview,
    requestChanges,
    regressReview,
    addReviewCheckpoint,
  } = useHumanReviewStore();

  // Local state
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);
  const [workflowProgress, setWorkflowProgress] = useState<string | null>(null);
  
  // Toast for notifications
  const { toast } = useToast();
  
  // Ref to track mounted state for async operations
  const isMountedRef = useRef(true);

  // Load phases on mount
  useEffect(() => {
    if (projectId) {
      loadProjectPhases(projectPath);
      loadReviewQueue(projectId);
    }
  }, [projectId, projectPath, loadProjectPhases, loadReviewQueue]);

  // Subscribe to workflow events
  useEffect(() => {
    if (!window.electronAPI?.bmad) {
      console.warn('[BMadPhaseBoard] BMAD API not available');
      return;
    }

    const bmadApi = window.electronAPI.bmad;

    // Handle workflow progress updates
    const unsubProgress = bmadApi.onWorkflowProgress((event: WorkflowProgressEvent) => {
      if (!isMountedRef.current) return;
      
      console.log('[BMadPhaseBoard] Workflow progress:', event);
      setWorkflowProgress(event.message || `Running ${event.workflowId}...`);
      
      // Update phase store if status changed
      if (event.status === 'completed') {
        completeWorkflow(event.workflowId as WorkflowId);
      }
      // Note: 'failed' status is handled by onWorkflowExit for more reliable detection
    });

    // Handle workflow exit
    const unsubExit = bmadApi.onWorkflowExit((event: WorkflowExitEvent) => {
      if (!isMountedRef.current) return;
      
      console.log('[BMadPhaseBoard] Workflow exit:', event);
      setRunningWorkflowId(null);
      setWorkflowProgress(null);
      
      if (event.success) {
        // Workflow completed successfully
        const workflowId = event.workflowId as WorkflowId;
        const workflow = BMAD_WORKFLOWS[workflowId];
        
        if (workflow) {
          // Complete the workflow in the store
          completeWorkflow(workflowId);
          
          // Show success toast
          toast({
            title: 'Workflow Completed',
            description: `${workflow.name} completed successfully`,
            duration: 3000,
          });
          
          // Reload phases to get updated status from disk
          loadProjectPhases(projectPath);
        }
      } else {
        // Workflow failed
        toast({
          title: 'Workflow Failed',
          description: `Workflow exited with code ${event.exitCode}`,
          variant: 'destructive',
          duration: 5000,
        });
      }
    });

    // Handle status changes from file system (external changes)
    const unsubStatus = bmadApi.onStatusChanged((event: StatusChangeEvent) => {
      if (!isMountedRef.current) return;
      
      console.log('[BMadPhaseBoard] Status changed:', event);
      // Reload phases to sync with file system
      loadProjectPhases(projectPath);
    });

    // Cleanup subscriptions on unmount
    return () => {
      isMountedRef.current = false;
      unsubProgress();
      unsubExit();
      unsubStatus();
    };
  }, [projectPath, loadProjectPhases, completeWorkflow, toast]);

  // Get current phase instance
  const currentPhaseInstance = phases[currentPhase];
  const viewingPhase = activeView === 'current' ? currentPhase : activeView;
  const viewingPhaseInstance = phases[viewingPhase as BmadPhaseId];

  // Check if we're viewing the sprint kanban (Phase 4 and current)
  const showSprintKanban = viewingPhase === 4 && (activeView === 'current' || activeView === 4);

  // Handle phase navigation
  const handlePhaseClick = useCallback((phaseId: BmadPhaseId) => {
    if (phaseId === currentPhase) {
      setActiveView('current');
    } else {
      setActiveView(phaseId);
    }
  }, [currentPhase, setActiveView]);

  // Handle workflow actions
  const handleWorkflowStart = useCallback(async (workflowId: WorkflowId) => {
    const workflow = BMAD_WORKFLOWS[workflowId];
    if (!workflow) return;

    setRunningWorkflowId(workflowId);
    startWorkflow(workflow.phase, workflowId);

    try {
      // Call the IPC to start the workflow
      if (window.electronAPI?.bmad?.startWorkflow) {
        const result = await window.electronAPI.bmad.startWorkflow(projectPath, workflowId);
        if (!result.success) {
          console.error('[BMadPhaseBoard] Failed to start workflow:', result.error);
        }
      }
    } catch (error) {
      console.error('[BMadPhaseBoard] Error starting workflow:', error);
    }
  }, [projectPath, startWorkflow]);

  const handleWorkflowComplete = useCallback((workflowId: WorkflowId, artifactPath?: string) => {
    completeWorkflow(workflowId, artifactPath);
    setRunningWorkflowId(null);

    // Add to review queue if human review required
    const workflow = BMAD_WORKFLOWS[workflowId];
    if (workflow?.humanReviewRequired) {
      const checkpoint = createWorkflowReviewCheckpoint(
        projectId,
        workflow.phase,
        workflowId,
        workflow.name,
        workflow.agent,
        artifactPath
      );
      addReviewCheckpoint(checkpoint);
    }
  }, [projectId, completeWorkflow, addReviewCheckpoint]);

  const handleWorkflowView = useCallback(async (workflowId: string, artifactPath?: string) => {
    if (!artifactPath) {
      toast({
        title: 'No Artifact',
        description: 'This workflow has not produced an artifact yet.',
        variant: 'default',
        duration: 3000,
      });
      return;
    }

    // Build full path - artifacts are relative to project path
    const fullPath = artifactPath.startsWith('/') 
      ? artifactPath 
      : `${projectPath}/${artifactPath}`;

    try {
      const result = await window.electronAPI.openPath(fullPath);
      if (!result.success) {
        toast({
          title: 'Failed to Open',
          description: result.error || 'Could not open the artifact file.',
          variant: 'destructive',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('[BMadPhaseBoard] Error opening artifact:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while opening the file.',
        variant: 'destructive',
        duration: 4000,
      });
    }
  }, [projectPath, toast]);

  const handleWorkflowSkip = useCallback((workflowId: WorkflowId) => {
    skipWorkflow(workflowId);
  }, [skipWorkflow]);

  const handleWorkflowReview = useCallback((workflowId: string) => {
    const review = pendingReviews.find(
      (r) => r.itemType === 'workflow' && r.itemId === workflowId
    );
    if (review) {
      openReview(review.id);
    }
  }, [pendingReviews, openReview]);

  // Handle human review decisions
  const handleApprove = useCallback((checkpointId: string, feedback?: string) => {
    approveReview(checkpointId, feedback);
  }, [approveReview]);

  const handleRequestChanges = useCallback((
    checkpointId: string,
    feedback: string,
    requestedChanges: string[],
    sendBackTo: 'in_progress' | 'ai_review'
  ) => {
    requestChanges(checkpointId, feedback, requestedChanges, sendBackTo);
  }, [requestChanges]);

  const handleRegress = useCallback((
    checkpointId: string,
    targetPhase: BmadPhaseId,
    reason: string,
    workflowsToRerun?: WorkflowId[]
  ) => {
    regressReview(checkpointId, targetPhase, reason, workflowsToRerun);
    
    // Initiate phase regression
    const checkpoint = pendingReviews.find((r) => r.id === checkpointId);
    if (checkpoint) {
      initiateRegression(checkpoint.phase, targetPhase, reason, 'user');
    }
  }, [regressReview, pendingReviews, initiateRegression]);

  // Handle back navigation from phase detail
  const handleBackToCurrent = useCallback(() => {
    setActiveView('current');
  }, [setActiveView]);

  // Render loading state
  if (phaseLoading && Object.keys(phases).length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render error state
  if (phaseError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t('phases.errorTitle')}</AlertTitle>
        <AlertDescription>{phaseError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Active Regression Warning */}
      {activeRegression && activeRegression.status !== 'completed' && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <RotateCcw className="h-4 w-4" />
          <AlertTitle>{t('phases.regressionInProgress')}</AlertTitle>
          <AlertDescription>
            {t('phases.regressionDescription', {
              from: BMAD_PHASES[activeRegression.fromPhase].displayName,
              to: BMAD_PHASES[activeRegression.toPhase].displayName,
            })}
          </AlertDescription>
        </Alert>
      )}

      {/* Workflow Progress Banner */}
      {runningWorkflowId && workflowProgress && (
        <Alert className="mx-4 mt-4 border-info bg-info/10">
          <RefreshCw className="h-4 w-4 animate-spin text-info" />
          <AlertTitle className="text-info">Workflow Running</AlertTitle>
          <AlertDescription className="text-info/80">
            {workflowProgress}
          </AlertDescription>
        </Alert>
      )}

      {/* Phase Timeline Header */}
      <div className="p-4 border-b">
        <PhaseTimeline
          phases={phases}
          currentPhase={currentPhase}
          activeView={activeView}
          onPhaseClick={handlePhaseClick}
          totalProgress={totalProgress}
        />
      </div>

      {/* Workspace Area */}
      <div className="flex-1 overflow-hidden">
        {showSprintKanban ? (
          // Phase 4: Show Sprint Kanban
          <div className="h-full flex flex-col">
            {/* Phase 4 header with workflows for sprint planning, etc. */}
            {currentPhaseInstance && (
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    {t('phases.phase4Workflows')}
                  </h3>
                  {onRefresh && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRefresh}
                      disabled={isRefreshing}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                      {isRefreshing ? t('common:buttons.refreshing') : t('phases.refresh')}
                    </Button>
                  )}
                </div>
                
                {/* Show non-story workflows (sprint planning, etc.) */}
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {currentPhaseInstance.workflows
                    .filter((wf) => wf.workflowId === 'sprint-planning')
                    .map((workflow) => (
                      <div key={workflow.id} className="min-w-[280px]">
                        <WorkflowCard
                          workflow={workflow}
                          onStart={() => handleWorkflowStart(workflow.workflowId)}
                          onView={() => handleWorkflowView(workflow.workflowId, workflow.artifactPath)}
                          isRunning={runningWorkflowId === workflow.workflowId}
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Sprint Kanban */}
            <div className="flex-1 overflow-hidden">
              <KanbanBoard
                tasks={tasks}
                onTaskClick={onTaskClick}
                onNewTaskClick={onNewTaskClick}
                onRefresh={onRefresh}
                isRefreshing={isRefreshing}
              />
            </div>
          </div>
        ) : viewingPhaseInstance ? (
          // Non-Phase 4 or viewing historical phase: Show Phase Detail
          <PhaseDetail
            phase={viewingPhaseInstance}
            phaseId={viewingPhase as BmadPhaseId}
            onBack={handleBackToCurrent}
            onWorkflowStart={handleWorkflowStart}
            onWorkflowView={handleWorkflowView}
            onWorkflowSkip={handleWorkflowSkip}
            onWorkflowReview={handleWorkflowReview}
            runningWorkflowId={runningWorkflowId}
          />
        ) : (
          // Fallback: No phase data
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {t('phases.noPhaseData')}
          </div>
        )}
      </div>

      {/* Human Review Dialog */}
      <HumanReviewDialog
        open={activeReview !== null}
        checkpoint={activeReview}
        onClose={closeReview}
        onApprove={handleApprove}
        onRequestChanges={handleRequestChanges}
        onRegress={handleRegress}
        isSubmitting={isSubmitting}
      />
    </div>
  );
});

export default BMadPhaseBoard;
