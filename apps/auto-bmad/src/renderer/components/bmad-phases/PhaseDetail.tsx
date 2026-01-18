/**
 * PhaseDetail Component
 * Shows detailed view of a specific phase including workflows and gate status
 */

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Clock,
  ChevronLeft,
  FileText,
  AlertCircle,
  History,
  User,
  SkipForward,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';
import { WorkflowCard } from './WorkflowCard';
import { BMAD_PHASES } from '../../../shared/constants';
import type { PhaseInstance, BmadPhaseId, WorkflowInstance, WorkflowId } from '../../../shared/types';

// ============================================
// Types
// ============================================

interface PhaseDetailProps {
  phase: PhaseInstance;
  phaseId: BmadPhaseId;
  onBack: () => void;
  onWorkflowStart?: (workflowId: WorkflowId) => void;
  onWorkflowView?: (workflowId: string, artifactPath?: string) => void;
  onWorkflowEdit?: (workflowId: string) => void;
  onWorkflowSkip?: (workflowId: WorkflowId) => void;
  onWorkflowReview?: (workflowId: string) => void;
  runningWorkflowId?: string | null;
}

// ============================================
// PhaseDetail Component
// ============================================

export const PhaseDetail = memo(function PhaseDetail({
  phase,
  phaseId,
  onBack,
  onWorkflowStart,
  onWorkflowView,
  onWorkflowEdit,
  onWorkflowSkip,
  onWorkflowReview,
  runningWorkflowId,
}: PhaseDetailProps) {
  const { t } = useTranslation('bmad');
  const phaseDef = BMAD_PHASES[phaseId];

  // Calculate phase statistics
  const stats = useMemo(() => {
    const total = phase.workflows.length;
    const completed = phase.workflows.filter((wf) => wf.status === 'completed').length;
    const skipped = phase.workflows.filter((wf) => wf.status === 'skipped').length;
    const inProgress = phase.workflows.filter((wf) => wf.status === 'in_progress').length;
    const pending = phase.workflows.filter((wf) => wf.status === 'pending').length;
    const failed = phase.workflows.filter((wf) => wf.status === 'failed').length;
    const percentage = total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0;

    return { total, completed, skipped, inProgress, pending, failed, percentage };
  }, [phase.workflows]);

  // Group workflows by status
  const groupedWorkflows = useMemo(() => {
    const groups: Record<string, WorkflowInstance[]> = {
      in_progress: [],
      pending: [],
      completed: [],
      skipped: [],
      failed: [],
    };

    phase.workflows.forEach((wf) => {
      if (groups[wf.status]) {
        groups[wf.status].push(wf);
      }
    });

    return groups;
  }, [phase.workflows]);

  const getStatusBadge = () => {
    switch (phase.status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            <Check className="h-3 w-3 mr-1" />
            {t('phases.status.completed')}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
            <Clock className="h-3 w-3 mr-1 animate-pulse" />
            {t('phases.status.inProgress')}
          </Badge>
        );
      case 'skipped':
        return (
          <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-muted">
            <SkipForward className="h-3 w-3 mr-1" />
            {t('phases.status.skipped')}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('phases.backToCurrent')}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                Phase {phaseId}: {phaseDef.displayName}
              </h2>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">{phaseDef.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Check className="h-4 w-4 text-success" />
            <span>{stats.completed} {t('phases.completed')}</span>
          </div>
          {stats.skipped > 0 && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <SkipForward className="h-4 w-4" />
              <span>{stats.skipped} {t('phases.skipped')}</span>
            </div>
          )}
          {stats.inProgress > 0 && (
            <div className="flex items-center gap-1.5 text-warning">
              <Clock className="h-4 w-4" />
              <span>{stats.inProgress} {t('phases.inProgress')}</span>
            </div>
          )}
          <Badge variant="secondary">{stats.percentage}%</Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* In Progress Workflows */}
          {groupedWorkflows.in_progress.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('phases.workflowsInProgress')}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedWorkflows.in_progress.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onView={() => onWorkflowView?.(workflow.workflowId, workflow.artifactPath)}
                    isRunning={runningWorkflowId === workflow.workflowId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending Workflows */}
          {groupedWorkflows.pending.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('phases.workflowsPending')}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedWorkflows.pending.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onStart={() => onWorkflowStart?.(workflow.workflowId)}
                    onSkip={() => onWorkflowSkip?.(workflow.workflowId)}
                    disabled={phase.status === 'completed' || phase.status === 'skipped'}
                    isRunning={runningWorkflowId === workflow.workflowId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed Workflows */}
          {groupedWorkflows.completed.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-2">
                <Check className="h-4 w-4" />
                {t('phases.workflowsCompleted')}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedWorkflows.completed.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onView={() => onWorkflowView?.(workflow.workflowId, workflow.artifactPath)}
                    onEdit={() => onWorkflowEdit?.(workflow.workflowId)}
                    onReview={
                      workflow.humanReviewRequired && workflow.humanReviewStatus === 'pending'
                        ? () => onWorkflowReview?.(workflow.workflowId)
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Skipped Workflows */}
          {groupedWorkflows.skipped.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <SkipForward className="h-4 w-4" />
                {t('phases.workflowsSkipped')}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedWorkflows.skipped.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Failed Workflows */}
          {groupedWorkflows.failed.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t('phases.workflowsFailed')}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {groupedWorkflows.failed.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onStart={() => onWorkflowStart?.(workflow.workflowId)}
                    isRunning={runningWorkflowId === workflow.workflowId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Gate Review History */}
          {phase.gateStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t('phases.gateReviewHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('phases.gateStatus')}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        phase.gateStatus.status === 'approved' && 'bg-success/10 text-success border-success/30',
                        phase.gateStatus.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/30',
                        phase.gateStatus.status === 'pending' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {t(`phases.gateStatus${phase.gateStatus.status.charAt(0).toUpperCase() + phase.gateStatus.status.slice(1)}`)}
                    </Badge>
                  </div>

                  {phase.gateStatus.decision && (
                    <>
                      <Separator />
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{t('phases.decidedBy')}: {phase.gateStatus.decision.decidedBy}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{new Date(phase.gateStatus.decision.decidedAt).toLocaleString()}</span>
                        </div>
                        {phase.gateStatus.decision.reason && (
                          <div className="p-2 rounded bg-muted/50 text-muted-foreground">
                            <p className="text-xs italic">"{phase.gateStatus.decision.reason}"</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Phase Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('phases.timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {phase.startedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('phases.startedAt')}</span>
                    <span>{new Date(phase.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {phase.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('phases.completedAt')}</span>
                    <span>{new Date(phase.completedAt).toLocaleString()}</span>
                  </div>
                )}
                {phase.skippedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('phases.skippedAt')}</span>
                    <span>{new Date(phase.skippedAt).toLocaleString()}</span>
                  </div>
                )}
                {phase.skippedReason && (
                  <div className="p-2 rounded bg-muted/50 text-muted-foreground mt-2">
                    <p className="text-xs">{t('phases.skippedReason')}: {phase.skippedReason}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
});

export default PhaseDetail;
