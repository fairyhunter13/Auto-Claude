/**
 * Workflow Runner Component
 * 
 * Combined view with workflow list and execution panel.
 * Main entry point for workflow execution UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable';
import { useBmadStore } from '../stores/bmad-store';
import { usePhaseStore } from '../stores/phase-store';
import { WorkflowList } from './WorkflowList';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';
import type { WorkflowDefinition, BmadPhase } from '../types';

interface WorkflowRunnerProps {
  projectPath: string;
  /** Pre-select a workflow */
  initialWorkflowId?: string;
  /** Pre-select a phase */
  initialPhase?: BmadPhase;
  className?: string;
}

export function WorkflowRunner({
  projectPath,
  initialWorkflowId,
  initialPhase,
  className,
}: WorkflowRunnerProps) {
  const { initialize, isInitialized, workflows } = useBmadStore();
  const { loadStatus } = usePhaseStore();

  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<BmadPhase | null>(null);

  // Initialize stores on mount
  useEffect(() => {
    if (projectPath) {
      initialize(projectPath);
      loadStatus(projectPath);
    }
  }, [projectPath, initialize, loadStatus]);

  // Set initial selection
  useEffect(() => {
    if (initialWorkflowId && workflows.length > 0) {
      const workflow = workflows.find(w => w.id === initialWorkflowId);
      if (workflow) {
        setSelectedWorkflow(workflow);
        setSelectedPhase(workflow.phase);
      }
    } else if (initialPhase && workflows.length > 0) {
      // Select first workflow in the phase
      const workflow = workflows.find(w => w.phase === initialPhase);
      if (workflow) {
        setSelectedWorkflow(workflow);
        setSelectedPhase(initialPhase);
      }
    }
  }, [initialWorkflowId, initialPhase, workflows]);

  // Handle workflow selection
  const handleWorkflowSelect = useCallback((workflow: WorkflowDefinition, phase: BmadPhase) => {
    setSelectedWorkflow(workflow);
    setSelectedPhase(phase);
  }, []);

  return (
    <div className={className}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Workflow list panel */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <WorkflowList
            onWorkflowSelect={handleWorkflowSelect}
            selectedWorkflowId={selectedWorkflow?.id}
            className="h-full border-0 rounded-none"
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Execution panel */}
        <ResizablePanel defaultSize={70}>
          <WorkflowExecutionPanel
            workflow={selectedWorkflow}
            phase={selectedPhase}
            className="h-full border-0 rounded-none"
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
