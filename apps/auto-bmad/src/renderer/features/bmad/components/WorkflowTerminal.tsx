/**
 * WorkflowTerminal Component
 * 
 * Displays BMAD workflow execution output in a terminal-like interface.
 * Shows real-time output from OpenCode workflow execution.
 */

import { useRef, useEffect } from 'react';
import { Play, Square, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useBmadStore } from '../stores/bmad-store';
import { useWorkflowTerminal } from '../hooks/useWorkflowTerminal';
import type { WorkflowDefinition } from '../types';

interface WorkflowTerminalProps {
  /** CSS class name */
  className?: string;
  /** Whether the terminal is expanded */
  isExpanded?: boolean;
  /** Toggle expand callback */
  onToggleExpand?: () => void;
}

export function WorkflowTerminal({
  className,
  isExpanded = false,
  onToggleExpand,
}: WorkflowTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // BMAD store state
  const isWorkflowRunning = useBmadStore(state => state.isWorkflowRunning);
  const activeWorkflowId = useBmadStore(state => state.activeWorkflowId);
  const workflows = useBmadStore(state => state.workflows);
  const cancelWorkflow = useBmadStore(state => state.cancelWorkflow);
  const clearWorkflowOutput = useBmadStore(state => state.clearWorkflowOutput);
  const isOpenCodeAvailable = useBmadStore(state => state.isOpenCodeAvailable);

  // Workflow terminal hook
  const { clear, fit } = useWorkflowTerminal({
    containerRef,
    autoScroll: true,
  });

  // Get active workflow details
  const activeWorkflow: WorkflowDefinition | undefined = activeWorkflowId
    ? workflows.find(w => w.id === activeWorkflowId)
    : undefined;

  // Fit terminal when expanded state changes
  useEffect(() => {
    // Small delay to allow container to resize
    const timeout = setTimeout(() => {
      fit();
    }, 100);
    return () => clearTimeout(timeout);
  }, [isExpanded, fit]);

  // Handle cancel
  const handleCancel = async () => {
    await cancelWorkflow();
  };

  // Handle clear
  const handleClear = () => {
    clear();
    clearWorkflowOutput();
  };

  return (
    <div className={cn(
      'flex flex-col bg-[#0B0B0F] rounded-lg border border-border overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isWorkflowRunning ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/30'
          )} />
          <span className="text-sm font-medium text-foreground">
            {activeWorkflow ? (
              <>
                <span className="text-muted-foreground">Running:</span>{' '}
                {activeWorkflow.name}
              </>
            ) : (
              'Workflow Output'
            )}
          </span>
          {!isOpenCodeAvailable && (
            <span className="text-xs text-amber-500 ml-2">
              (OpenCode not found)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isWorkflowRunning ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Square className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2"
              disabled={isWorkflowRunning}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              className="h-7 w-7"
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={containerRef}
        className="flex-1 p-2 min-h-[200px]"
        style={{ minHeight: isExpanded ? '400px' : '200px' }}
      />
    </div>
  );
}
