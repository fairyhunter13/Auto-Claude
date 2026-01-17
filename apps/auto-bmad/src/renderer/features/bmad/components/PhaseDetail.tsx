/**
 * Phase Detail Component
 * 
 * Expanded view of a single phase showing all workflows.
 * Story 3.3, 3.4, 3.5
 */

import { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  AlertTriangle,
  RotateCcw,
  FileText,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhaseStore, type WorkflowInfo } from '../stores/phase-store';
import { PHASE_METADATA, type BmadPhase } from '../types';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  completed: 'text-green-500',
  in_progress: 'text-blue-500',
  pending: 'text-muted-foreground',
  blocked: 'text-red-500',
  skipped: 'text-yellow-500',
};

// Agent display names
const AGENT_NAMES: Record<string, string> = {
  analyst: 'Mary (Analyst)',
  pm: 'John (PM)',
  architect: 'Winston (Architect)',
  'ux-designer': 'Sally (UX)',
  sm: 'Bob (Scrum Master)',
  dev: 'Amelia (Developer)',
  tea: 'Murat (Test Architect)',
};

interface PhaseDetailProps {
  phase: BmadPhase;
  onBack: () => void;
  onWorkflowStart?: (workflowId: string, phase: BmadPhase) => void;
}

export function PhaseDetail({ phase, onBack, onWorkflowStart }: PhaseDetailProps) {
  const {
    getPhaseWorkflows,
    getPhases,
    canAdvanceToPhase,
    resetPhase,
    isPhaseComplete,
  } = usePhaseStore();

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const phaseInfo = getPhases().find(p => p.id === phase);
  const workflows = getPhaseWorkflows(phase);
  const metadata = PHASE_METADATA[phase];
  const { allowed: canAdvance, blockers } = canAdvanceToPhase(phase);
  const isComplete = isPhaseComplete(phase);

  // Handle workflow start
  const handleWorkflowStart = useCallback((workflow: WorkflowInfo) => {
    if (onWorkflowStart && !workflow.isBlocked) {
      onWorkflowStart(workflow.id, phase);
    }
  }, [onWorkflowStart, phase]);

  // Handle phase reset
  const handleReset = useCallback(async () => {
    setIsResetting(true);
    try {
      await resetPhase(phase);
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
  }, [resetPhase, phase]);

  // Format timestamp
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              Phase {PHASE_METADATA[phase] ? Object.keys(PHASE_METADATA).indexOf(phase) + 1 : '?'}: {metadata.name}
            </h2>
            <p className="text-muted-foreground">{metadata.description}</p>
          </div>
        </div>
        
        {/* Phase actions */}
        <div className="flex items-center gap-2">
          {isComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Phase
            </Button>
          )}
        </div>
      </div>

      {/* Phase prerequisite warning */}
      {!canAdvance && phase !== 'analysis' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Prerequisites Not Met</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Complete the following before starting this phase:</p>
            <ul className="list-disc list-inside text-sm">
              {blockers.map((blocker, i) => (
                <li key={i}>{blocker}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Phase status summary */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{phaseInfo?.completedWorkflows || 0}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">{phaseInfo?.totalWorkflows || 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold">
                {workflows.filter(w => !w.optional).length}
              </p>
              <p className="text-xs text-muted-foreground">Required</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              'text-sm px-3 py-1',
              phaseInfo?.status === 'completed' && 'bg-green-500/10 text-green-500 border-green-500/20',
              phaseInfo?.status === 'in_progress' && 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            )}
          >
            {phaseInfo?.status === 'completed' ? 'Complete' : 
             phaseInfo?.status === 'in_progress' ? 'In Progress' : 'Not Started'}
          </Badge>
        </CardContent>
      </Card>

      {/* Workflow list */}
      <div className="space-y-3">
        <h3 className="font-semibold">Workflows</h3>
        {workflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onStart={() => handleWorkflowStart(workflow)}
            formatTime={formatTime}
          />
        ))}
      </div>

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset {metadata.name} Phase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all workflows in {metadata.name} and subsequent phases as incomplete.
              Generated artifacts will NOT be deleted.
              <br /><br />
              You will need to re-run workflows to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Phase'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowCardProps {
  workflow: WorkflowInfo;
  onStart: () => void;
  formatTime: (timestamp?: string) => string | null;
}

function WorkflowCard({ workflow, onStart, formatTime }: WorkflowCardProps) {
  const statusColor = STATUS_COLORS[workflow.status] || STATUS_COLORS.pending;
  const completedTime = formatTime(workflow.completedAt);

  const StatusIcon = workflow.status === 'completed' 
    ? CheckCircle2 
    : workflow.status === 'in_progress'
    ? Loader2
    : workflow.isBlocked
    ? Lock
    : Circle;

  return (
    <Card className={cn(
      'transition-colors',
      workflow.isBlocked && 'opacity-60',
      workflow.status === 'completed' && 'bg-green-500/5 border-green-500/20'
    )}>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-4">
          <StatusIcon className={cn(
            'h-5 w-5',
            statusColor,
            workflow.status === 'in_progress' && 'animate-spin'
          )} />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{workflow.name}</span>
              {workflow.optional && (
                <Badge variant="outline" className="text-xs">Optional</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{workflow.description}</p>
            
            {/* Metadata row */}
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {AGENT_NAMES[workflow.agent] || workflow.agent}
              </span>
              {workflow.outputFile && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {workflow.outputFile}
                </span>
              )}
              {completedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {completedTime}
                </span>
              )}
            </div>

            {/* Blocked message */}
            {workflow.isBlocked && (
              <p className="text-xs text-red-500 mt-1">
                Blocked by: {workflow.blockedBy.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Action button */}
        <div>
          {workflow.status === 'completed' ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Done
            </Badge>
          ) : workflow.status === 'in_progress' ? (
            <Badge variant="secondary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Running
            </Badge>
          ) : (
            <Button
              size="sm"
              disabled={workflow.isBlocked}
              onClick={onStart}
            >
              <Play className="mr-1 h-3 w-3" />
              Start
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
