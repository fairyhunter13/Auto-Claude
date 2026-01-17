/**
 * Phase Dashboard Component
 * 
 * Visual dashboard showing the 4 BMAD phases with status and navigation.
 * Story 3.1, 3.2, 3.3, 3.6
 */

import { useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  FileText,
  Boxes,
  Code,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhaseStore, type PhaseInfo } from '../stores/phase-store';
import { PhaseDetail } from './PhaseDetail';
import type { BmadPhase } from '../types';

// Phase icons mapping
const PHASE_ICONS: Record<BmadPhase, typeof Search> = {
  analysis: Search,
  planning: FileText,
  solutioning: Boxes,
  implementation: Code,
};

// Status colors
const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-500',
  in_progress: 'text-blue-500',
  pending: 'text-muted-foreground',
  blocked: 'text-red-500',
  skipped: 'text-yellow-500',
};

const STATUS_BG: Record<string, string> = {
  completed: 'bg-green-500/10 border-green-500/20',
  in_progress: 'bg-blue-500/10 border-blue-500/20',
  pending: 'bg-muted/50',
  blocked: 'bg-red-500/10 border-red-500/20',
  skipped: 'bg-yellow-500/10 border-yellow-500/20',
};

interface PhaseDashboardProps {
  projectPath: string;
  onWorkflowStart?: (workflowId: string, phase: BmadPhase) => void;
}

export function PhaseDashboard({ projectPath, onWorkflowStart }: PhaseDashboardProps) {
  const {
    loadStatus,
    refreshStatus,
    getPhases,
    getCurrentPhase,
    getRecommendedWorkflow,
    expandedPhase,
    expandPhase,
    isLoading,
    error,
  } = usePhaseStore();

  // Load status on mount
  useEffect(() => {
    loadStatus(projectPath);
  }, [projectPath, loadStatus]);

  const phases = getPhases();
  const currentPhase = getCurrentPhase();
  const recommended = getRecommendedWorkflow();

  // Handle phase card click
  const handlePhaseClick = useCallback((phase: BmadPhase) => {
    expandPhase(expandedPhase === phase ? null : phase);
  }, [expandedPhase, expandPhase]);

  // Handle recommended workflow click
  const handleRecommendedClick = useCallback(() => {
    if (recommended) {
      expandPhase(recommended.phase);
      if (onWorkflowStart) {
        onWorkflowStart(recommended.workflow.id, recommended.phase);
      }
    }
  }, [recommended, expandPhase, onWorkflowStart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => loadStatus(projectPath)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // If a phase is expanded, show detail view
  if (expandedPhase) {
    return (
      <PhaseDetail
        phase={expandedPhase}
        onBack={() => expandPhase(null)}
        onWorkflowStart={onWorkflowStart}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with recommended action */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">BMAD Phases</h2>
          <p className="text-muted-foreground">
            {currentPhase 
              ? `Currently in ${phases.find(p => p.id === currentPhase)?.name || currentPhase}`
              : 'Ready to begin'
            }
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refreshStatus}
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Recommended next action */}
      {recommended && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Recommended Next</p>
                <p className="text-sm text-muted-foreground">
                  {recommended.workflow.name} in {phases.find(p => p.id === recommended.phase)?.name}
                </p>
              </div>
            </div>
            <Button onClick={handleRecommendedClick}>
              Start Workflow
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Phase cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {phases.map((phase, index) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            phaseNumber={index + 1}
            isCurrent={phase.id === currentPhase}
            onClick={() => handlePhaseClick(phase.id)}
          />
        ))}
      </div>

      {/* Progress overview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center gap-3">
                <span className="text-sm font-medium w-32 truncate">
                  {index + 1}. {phase.name}
                </span>
                <Progress 
                  value={phase.totalWorkflows > 0 
                    ? (phase.completedWorkflows / phase.totalWorkflows) * 100 
                    : 0
                  } 
                  className="flex-1 h-2"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {phase.completedWorkflows}/{phase.totalWorkflows}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface PhaseCardProps {
  phase: PhaseInfo;
  phaseNumber: number;
  isCurrent: boolean;
  onClick: () => void;
}

function PhaseCard({ phase, phaseNumber, isCurrent, onClick }: PhaseCardProps) {
  const Icon = PHASE_ICONS[phase.id];
  const statusColor = STATUS_COLORS[phase.status] || STATUS_COLORS.pending;
  const statusBg = STATUS_BG[phase.status] || STATUS_BG.pending;

  const StatusIcon = phase.status === 'completed' 
    ? CheckCircle2 
    : phase.status === 'in_progress'
    ? Loader2
    : phase.status === 'blocked'
    ? Lock
    : Circle;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isCurrent && 'ring-2 ring-primary',
        statusBg
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              phase.status === 'completed' ? 'bg-green-500/20' : 'bg-muted'
            )}>
              <Icon className={cn('h-5 w-5', statusColor)} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Phase {phaseNumber}: {phase.name}
                {phase.optional && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Optional
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                {phase.description}
              </CardDescription>
            </div>
          </div>
          <StatusIcon className={cn(
            'h-5 w-5',
            statusColor,
            phase.status === 'in_progress' && 'animate-spin'
          )} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Progress 
              value={(phase.completedWorkflows / phase.totalWorkflows) * 100} 
              className="w-24 h-1.5"
            />
            <span className="text-xs text-muted-foreground">
              {phase.completedWorkflows}/{phase.totalWorkflows} workflows
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
