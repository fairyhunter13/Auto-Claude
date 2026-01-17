/**
 * WorkflowTerminalPanel Component
 * 
 * Resizable panel wrapper for the BMAD workflow terminal.
 * Provides drag handles for resizing and panel management.
 */

import { useState, useCallback } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelSize } from 'react-resizable-panels';
import { WorkflowTerminal } from './WorkflowTerminal';

interface WorkflowTerminalPanelProps {
  /** CSS class name */
  className?: string;
  /** Default panel size (percentage) */
  defaultSize?: number;
  /** Minimum panel size (percentage) */
  minSize?: number;
  /** Maximum panel size (percentage) */
  maxSize?: number;
  /** Whether panel is collapsible */
  collapsible?: boolean;
  /** Callback when panel is collapsed */
  onCollapse?: () => void;
  /** Callback when panel is expanded */
  onExpand?: () => void;
}

/**
 * Resize handle component with visual indicator
 */
function ResizeHandle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        'group relative flex items-center justify-center',
        'h-2 bg-transparent hover:bg-primary/10 transition-colors',
        'cursor-row-resize',
        className
      )}
    >
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal className="h-3 w-3 text-muted-foreground" />
      </div>
      {/* Visual line indicator */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-border group-hover:bg-primary/30 transition-colors" />
    </PanelResizeHandle>
  );
}

export function WorkflowTerminalPanel({
  className,
  defaultSize = 30,
  minSize = 15,
  maxSize = 70,
  collapsible = true,
  onCollapse,
  onExpand,
}: WorkflowTerminalPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [panelSize, setPanelSize] = useState(defaultSize);

  // Handle panel resize
  const handleResize = useCallback((size: PanelSize) => {
    setPanelSize(size.asPercentage ?? defaultSize);
  }, [defaultSize]);

  // Handle expand toggle
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
    if (!isExpanded) {
      onExpand?.();
    } else {
      onCollapse?.();
    }
  }, [isExpanded, onExpand, onCollapse]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <PanelGroup orientation="vertical" className="h-full">
        {/* Main content area (placeholder for other panels) */}
        <Panel defaultSize={100 - defaultSize} minSize={30}>
          <div className="h-full" />
        </Panel>

        <ResizeHandle />

        {/* Workflow Terminal Panel */}
        <Panel
          defaultSize={defaultSize}
          minSize={isExpanded ? 50 : minSize}
          maxSize={isExpanded ? 90 : maxSize}
          collapsible={collapsible}
          onResize={handleResize}
        >
          <WorkflowTerminal
            className="h-full"
            isExpanded={isExpanded}
            onToggleExpand={handleToggleExpand}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}

/**
 * Standalone workflow terminal with integrated resize handle
 * For use when terminal is part of a larger layout
 */
export function StandaloneWorkflowTerminal({
  className,
  onResize,
}: {
  className?: string;
  onResize?: (height: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Resize handle at top */}
      <div
        className={cn(
          'flex items-center justify-center cursor-row-resize',
          'h-2 bg-transparent hover:bg-primary/10 transition-colors',
          'border-t border-border'
        )}
      >
        <div className="flex items-center gap-0.5 opacity-30 hover:opacity-100 transition-opacity">
          <GripHorizontal className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

      {/* Terminal */}
      <WorkflowTerminal
        className="flex-1"
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
}
