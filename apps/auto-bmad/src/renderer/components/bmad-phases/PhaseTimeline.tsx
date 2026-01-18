/**
 * PhaseTimeline Component
 * Displays a horizontal timeline of BMAD phases with progress indicators
 * Clicking a phase shows its details in the workspace below
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ClipboardList,
  Code2,
  Rocket,
  Check,
  Lock,
  Loader2,
  Eye,
  SkipForward,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import {
  BMAD_PHASES,
  BMAD_PHASE_IDS,
  PHASE_STATUS_COLORS,
} from '../../../shared/constants';
import type { BmadPhaseId, PhaseStatus, PhaseInstance } from '../../../shared/types';

// ============================================
// Types
// ============================================

interface PhaseTimelineProps {
  phases: Record<BmadPhaseId, PhaseInstance>;
  currentPhase: BmadPhaseId;
  activeView: BmadPhaseId | 'current';
  onPhaseClick: (phaseId: BmadPhaseId) => void;
  totalProgress?: {
    storiesCompleted: number;
    totalStories: number;
  };
}

interface PhaseBoxProps {
  phaseId: BmadPhaseId;
  phase: PhaseInstance;
  isActive: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

// ============================================
// Icons mapping
// ============================================

const PHASE_ICONS: Record<BmadPhaseId, typeof Search> = {
  1: Search,
  2: ClipboardList,
  3: Code2,
  4: Rocket,
};

const STATUS_ICONS: Record<PhaseStatus, typeof Check> = {
  locked: Lock,
  available: Loader2,
  in_progress: Loader2,
  review: Eye,
  completed: Check,
  skipped: SkipForward,
};

// ============================================
// Phase Box Component
// ============================================

const PhaseBox = memo(function PhaseBox({
  phaseId,
  phase,
  isActive,
  isCurrent,
  onClick,
}: PhaseBoxProps) {
  const { t } = useTranslation('bmad');
  const phaseDef = BMAD_PHASES[phaseId];
  const PhaseIcon = PHASE_ICONS[phaseId];
  const StatusIcon = STATUS_ICONS[phase.status];

  // Calculate progress for this phase
  const completedWorkflows = phase.workflows.filter(
    (wf) => wf.status === 'completed' || wf.status === 'skipped'
  ).length;
  const totalWorkflows = phase.workflows.length;
  const progressPercentage = totalWorkflows > 0 
    ? Math.round((completedWorkflows / totalWorkflows) * 100) 
    : 0;

  const getStatusColor = () => {
    switch (phase.status) {
      case 'completed':
        return 'border-success bg-success/10 text-success';
      case 'in_progress':
        return 'border-warning bg-warning/10 text-warning';
      case 'review':
        return 'border-purple-500 bg-purple-500/10 text-purple-400';
      case 'available':
        return 'border-info bg-info/10 text-info';
      case 'skipped':
        return 'border-muted bg-muted/50 text-muted-foreground/50';
      case 'locked':
      default:
        return 'border-muted bg-muted/30 text-muted-foreground/50';
    }
  };

  const getStatusBadge = () => {
    switch (phase.status) {
      case 'completed':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-success/10 text-success border-success/30">{t('phases.status.completed')}</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30">{t('phases.status.inProgress')}</Badge>;
      case 'review':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-400 border-purple-500/30">{t('phases.status.review')}</Badge>;
      case 'available':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-info/10 text-info border-info/30">{t('phases.status.available')}</Badge>;
      case 'skipped':
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground/50 border-muted">{t('phases.status.skipped')}</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30 text-muted-foreground/50 border-muted">{t('phases.status.locked')}</Badge>;
    }
  };

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={phase.status === 'locked'}
          className={cn(
            'relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 min-w-[120px]',
            getStatusColor(),
            isActive && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            isCurrent && phase.status !== 'completed' && 'animate-pulse',
            phase.status !== 'locked' && 'hover:scale-105 cursor-pointer',
            phase.status === 'locked' && 'cursor-not-allowed opacity-60'
          )}
        >
          {/* Phase number and icon */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">{phaseId}</span>
            <PhaseIcon className="h-4 w-4" />
          </div>

          {/* Phase name */}
          <span className="text-xs font-semibold uppercase tracking-wider">
            {phaseDef.displayName}
          </span>

          {/* Status icon */}
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border">
            <StatusIcon 
              className={cn(
                'h-3 w-3',
                phase.status === 'in_progress' && 'animate-spin'
              )} 
            />
          </div>

          {/* Progress bar (for in_progress phases) */}
          {(phase.status === 'in_progress' || phase.status === 'review') && totalWorkflows > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/50 rounded-b-lg overflow-hidden">
              <div 
                className="h-full bg-current transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <div className="space-y-1">
          <p className="font-semibold">{phaseDef.displayName}</p>
          <p className="text-xs text-muted-foreground">{phaseDef.description}</p>
          {totalWorkflows > 0 && (
            <p className="text-xs">
              {completedWorkflows}/{totalWorkflows} {t('phases.workflowsComplete')}
            </p>
          )}
          {getStatusBadge()}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

// ============================================
// Gate Indicator Component
// ============================================

interface GateIndicatorProps {
  fromPhase: BmadPhaseId;
  status: 'pending' | 'passed' | 'failed';
  onClick?: () => void;
}

const GateIndicator = memo(function GateIndicator({
  fromPhase,
  status,
  onClick,
}: GateIndicatorProps) {
  const { t } = useTranslation('bmad');

  const getGateStyle = () => {
    switch (status) {
      case 'passed':
        return 'bg-success text-success-foreground';
      case 'failed':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded-full transition-all',
            getGateStyle(),
            onClick && 'hover:scale-110 cursor-pointer'
          )}
        >
          {status === 'passed' ? (
            <Check className="h-3 w-3" />
          ) : status === 'failed' ? (
            <span className="text-[10px] font-bold">!</span>
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {status === 'passed' 
            ? t('phases.gatePassed') 
            : status === 'failed' 
            ? t('phases.gateFailed') 
            : t('phases.gatePending')}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

// ============================================
// Main PhaseTimeline Component
// ============================================

export const PhaseTimeline = memo(function PhaseTimeline({
  phases,
  currentPhase,
  activeView,
  onPhaseClick,
  totalProgress,
}: PhaseTimelineProps) {
  const { t } = useTranslation('bmad');

  // Calculate overall progress
  const overallProgressPercentage = totalProgress && totalProgress.totalStories > 0
    ? Math.round((totalProgress.storiesCompleted / totalProgress.totalStories) * 100)
    : 0;

  // Get gate status between phases
  const getGateStatus = (fromPhaseId: BmadPhaseId): 'pending' | 'passed' | 'failed' => {
    const fromPhase = phases[fromPhaseId];
    if (!fromPhase) return 'pending';
    
    if (fromPhase.status === 'completed' || fromPhase.status === 'skipped') {
      return 'passed';
    }
    if (fromPhase.gateStatus?.status === 'rejected') {
      return 'failed';
    }
    return 'pending';
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm border rounded-lg p-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t('phases.progressTitle')}
        </h3>
        {totalProgress && totalProgress.totalStories > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {totalProgress.storiesCompleted}/{totalProgress.totalStories} {t('phases.storiesComplete')}
            </span>
            <Badge variant="secondary" className="text-xs">
              {overallProgressPercentage}%
            </Badge>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-center gap-2">
        {BMAD_PHASE_IDS.map((phaseId, index) => {
          const phase = phases[phaseId];
          if (!phase) return null;

          const isActive = activeView === phaseId || (activeView === 'current' && phaseId === currentPhase);
          const isCurrent = phaseId === currentPhase;

          return (
            <div key={phaseId} className="flex items-center">
              <PhaseBox
                phaseId={phaseId}
                phase={phase}
                isActive={isActive}
                isCurrent={isCurrent}
                onClick={() => onPhaseClick(phaseId)}
              />
              
              {/* Gate indicator between phases */}
              {index < BMAD_PHASE_IDS.length - 1 && (
                <div className="flex items-center px-2">
                  <div className="w-4 h-0.5 bg-muted" />
                  <GateIndicator
                    fromPhase={phaseId}
                    status={getGateStatus(phaseId)}
                  />
                  <div className="w-4 h-0.5 bg-muted" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active phase indicator */}
      <div className="flex justify-center mt-3">
        <p className="text-xs text-muted-foreground">
          {activeView === 'current' ? (
            <>
              {t('phases.viewing')}: <span className="font-semibold text-foreground">{t('phases.currentPhase')}</span>
            </>
          ) : (
            <>
              {t('phases.viewing')}: <span className="font-semibold text-foreground">{BMAD_PHASES[activeView as BmadPhaseId]?.displayName}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
});

export default PhaseTimeline;
