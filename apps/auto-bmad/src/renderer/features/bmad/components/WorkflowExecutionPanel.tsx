/**
 * Workflow Execution Panel
 * 
 * Main panel for workflow execution with terminal and controls.
 * Stories 4.1, 4.3, 4.4, 4.5, 4.6
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Play,
  Square,
  Trash2,
  Maximize2,
  Minimize2,
  Terminal,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBmadStore } from '../stores/bmad-store';
import { useWorkflowTerminal } from '../hooks/useWorkflowTerminal';
import type { WorkflowDefinition, BmadPhase } from '../types';

// Agent display names
const AGENT_NAMES: Record<string, string> = {
  analyst: 'Mary',
  pm: 'John',
  architect: 'Winston',
  'ux-designer': 'Sally',
  sm: 'Bob',
  dev: 'Amelia',
  tea: 'Murat',
};

interface WorkflowExecutionPanelProps {
  workflow: WorkflowDefinition | null;
  phase: BmadPhase | null;
  onClose?: () => void;
  className?: string;
}

export function WorkflowExecutionPanel({
  workflow,
  phase,
  onClose,
  className,
}: WorkflowExecutionPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const {
    isWorkflowRunning,
    activeWorkflowId,
    isOpenCodeAvailable,
    startWorkflow,
    cancelWorkflow,
    clearWorkflowOutput,
    workflowOutput,
  } = useBmadStore();

  const { clear, fit } = useWorkflowTerminal({
    containerRef,
    autoScroll: true,
  });

  // Track elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isWorkflowRunning && workflow?.id === activeWorkflowId) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    } else {
      startTimeRef.current = null;
      setElapsedTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorkflowRunning, activeWorkflowId, workflow?.id]);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle start workflow
  const handleStart = useCallback(async () => {
    if (!workflow) return;
    clearWorkflowOutput();
    clear();
    await startWorkflow(workflow.id);
  }, [workflow, startWorkflow, clearWorkflowOutput, clear]);

  // Handle cancel workflow
  const handleCancel = useCallback(async () => {
    await cancelWorkflow();
    setShowCancelDialog(false);
  }, [cancelWorkflow]);

  // Handle clear terminal
  const handleClear = useCallback(() => {
    clearWorkflowOutput();
    clear();
  }, [clearWorkflowOutput, clear]);

  // Handle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    // Refit terminal after animation
    setTimeout(() => fit(), 300);
  }, [fit]);

  // Determine status
  const isRunning = isWorkflowRunning && activeWorkflowId === workflow?.id;
  const hasOutput = workflowOutput.length > 0;

  if (!workflow) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardContent className="flex-1 flex items-center justify-center text-muted-foreground py-12">
          <div className="text-center">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a workflow to execute</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        'flex flex-col transition-all',
        isExpanded && 'fixed inset-4 z-50',
        className
      )}>
        {/* Header */}
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {workflow.name}
                {isRunning && (
                  <Badge variant="secondary" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {AGENT_NAMES[workflow.agent] || workflow.agent}
                </span>
                {isRunning && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(elapsedTime)}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {!isWorkflowRunning && !isRunning && (
              <Button
                size="sm"
                onClick={handleStart}
                disabled={!isOpenCodeAvailable}
                title={!isOpenCodeAvailable ? 'OpenCode CLI not available' : undefined}
              >
                <Play className="mr-1 h-4 w-4" />
                Start
              </Button>
            )}
            
            {isRunning && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
              >
                <Square className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={handleClear}
              disabled={isRunning || !hasOutput}
              title="Clear output"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={handleToggleExpand}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {/* OpenCode warning */}
        {!isOpenCodeAvailable && (
          <div className="mx-4 mb-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-sm text-yellow-600 dark:text-yellow-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>OpenCode CLI not found. Install it to execute workflows.</span>
          </div>
        )}

        {/* Terminal */}
        <CardContent className="flex-1 min-h-0 pb-4">
          <div
            ref={containerRef}
            className="h-full min-h-[300px] rounded-md overflow-hidden bg-[#0B0B0F]"
          />
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will terminate the running {workflow.name} workflow.
              Any partial progress may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Running</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Workflow
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
