/**
 * WorkflowCard Component
 * Displays a workflow within a phase, showing status, agent, and actions
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Play,
  Check,
  Clock,
  SkipForward,
  AlertCircle,
  Eye,
  FileText,
  Edit,
  Loader2,
  User,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';
import {
  BMAD_WORKFLOWS,
  BMAD_AGENTS,
  WORKFLOW_STATUS_COLORS,
} from '../../../shared/constants';
import type { WorkflowInstance, WorkflowId, WorkflowStatus } from '../../../shared/types';

// ============================================
// Types
// ============================================

interface WorkflowCardProps {
  workflow: WorkflowInstance;
  onStart?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onSkip?: () => void;
  onReview?: () => void;
  isRunning?: boolean;
  disabled?: boolean;
}

// ============================================
// Status Icons
// ============================================

const STATUS_ICONS: Record<WorkflowStatus, typeof Check> = {
  pending: Clock,
  in_progress: Loader2,
  completed: Check,
  skipped: SkipForward,
  blocked: AlertCircle,
  failed: AlertCircle,
};

// ============================================
// WorkflowCard Component
// ============================================

export const WorkflowCard = memo(function WorkflowCard({
  workflow,
  onStart,
  onView,
  onEdit,
  onSkip,
  onReview,
  isRunning = false,
  disabled = false,
}: WorkflowCardProps) {
  const { t } = useTranslation('bmad');
  
  const workflowDef = BMAD_WORKFLOWS[workflow.workflowId];
  const agentDef = BMAD_AGENTS[workflow.agent];
  const StatusIcon = STATUS_ICONS[workflow.status];

  if (!workflowDef) {
    return null;
  }

  const getStatusBadge = () => {
    const colorClass = WORKFLOW_STATUS_COLORS[workflow.status] || 'bg-muted text-muted-foreground';
    
    return (
      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', colorClass)}>
        {t(`workflows.status.${workflow.status}`)}
      </Badge>
    );
  };

  const getCardStyle = () => {
    switch (workflow.status) {
      case 'completed':
        return 'border-success/30 bg-success/5';
      case 'in_progress':
        return 'border-warning/30 bg-warning/5';
      case 'failed':
      case 'blocked':
        return 'border-destructive/30 bg-destructive/5';
      case 'skipped':
        return 'border-muted/50 bg-muted/10 opacity-60';
      default:
        return 'border-border bg-card';
    }
  };

  const showStartButton = workflow.status === 'pending' && !disabled;
  const showViewButton = workflow.status === 'completed' && workflow.artifactPath;
  const showSkipButton = workflow.status === 'pending' && !workflowDef.required && !disabled;
  const showReviewButton = workflow.status === 'completed' && 
    workflow.humanReviewRequired && 
    workflow.humanReviewStatus === 'pending';

  return (
    <Card className={cn('transition-all duration-200', getCardStyle())}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon 
              className={cn(
                'h-4 w-4',
                workflow.status === 'in_progress' && 'animate-spin',
                workflow.status === 'completed' && 'text-success',
                workflow.status === 'failed' && 'text-destructive',
                workflow.status === 'pending' && 'text-muted-foreground'
              )} 
            />
            <h4 className="font-medium text-sm">{workflowDef.name}</h4>
          </div>
          {getStatusBadge()}
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {workflowDef.description}
        </p>

        {/* Agent */}
        {agentDef && (
          <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{agentDef.displayName}</span>
            <span className="text-muted-foreground/50">({agentDef.title})</span>
          </div>
        )}

        {/* Human Review Pending Badge */}
        {showReviewButton && (
          <div className="mb-3">
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
              <Eye className="h-3 w-3 mr-1" />
              {t('workflows.humanReviewPending')}
            </Badge>
          </div>
        )}

        {/* Error message */}
        {workflow.error && (
          <div className="mb-3 p-2 rounded bg-destructive/10 border border-destructive/20">
            <p className="text-xs text-destructive">{workflow.error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {showStartButton && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs"
                  onClick={onStart}
                  disabled={isRunning || disabled}
                >
                  {isRunning ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
                  )}
                  {t('workflows.actions.start')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('workflows.actions.startTooltip')}</TooltipContent>
            </Tooltip>
          )}

          {showViewButton && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={onView}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {t('workflows.actions.view')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('workflows.actions.viewTooltip')}</TooltipContent>
            </Tooltip>
          )}

          {showViewButton && onEdit && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={onEdit}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {t('workflows.actions.edit')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('workflows.actions.editTooltip')}</TooltipContent>
            </Tooltip>
          )}

          {showSkipButton && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={onSkip}
                >
                  <SkipForward className="h-3 w-3 mr-1" />
                  {t('workflows.actions.skip')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('workflows.actions.skipTooltip')}</TooltipContent>
            </Tooltip>
          )}

          {showReviewButton && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                  onClick={onReview}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {t('workflows.actions.review')}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('workflows.actions.reviewTooltip')}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Completion info */}
        {workflow.completedAt && (
          <p className="text-[10px] text-muted-foreground mt-2">
            {t('workflows.completedAt')}: {new Date(workflow.completedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

export default WorkflowCard;
