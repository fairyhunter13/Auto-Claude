/**
 * Workflow List Component
 * 
 * Displays all BMAD workflows organized by phase.
 * Story 4.2
 */

import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  CheckCircle2,
  Circle,
  Lock,
  Loader2,
  User,
  FileText,
  Search,
  Boxes,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBmadStore } from '../stores/bmad-store';
import { usePhaseStore } from '../stores/phase-store';
import { PHASE_METADATA, type BmadPhase, type WorkflowDefinition } from '../types';

// Phase icons
const PHASE_ICONS: Record<BmadPhase, typeof Search> = {
  analysis: Search,
  planning: FileText,
  solutioning: Boxes,
  implementation: Code,
};

// Agent names
const AGENT_NAMES: Record<string, string> = {
  analyst: 'Mary',
  pm: 'John',
  architect: 'Winston',
  'ux-designer': 'Sally',
  sm: 'Bob',
  dev: 'Amelia',
  tea: 'Murat',
};

interface WorkflowListProps {
  onWorkflowSelect: (workflow: WorkflowDefinition, phase: BmadPhase) => void;
  selectedWorkflowId?: string | null;
  className?: string;
}

export function WorkflowList({
  onWorkflowSelect,
  selectedWorkflowId,
  className,
}: WorkflowListProps) {
  const { workflows, activeWorkflowId, isWorkflowRunning } = useBmadStore();
  const { getPhaseWorkflows, getPhases } = usePhaseStore();
  const phases = getPhases();

  // Group workflows by phase
  const workflowsByPhase = useMemo(() => {
    const grouped: Record<BmadPhase, ReturnType<typeof getPhaseWorkflows>> = {
      analysis: getPhaseWorkflows('analysis'),
      planning: getPhaseWorkflows('planning'),
      solutioning: getPhaseWorkflows('solutioning'),
      implementation: getPhaseWorkflows('implementation'),
    };
    return grouped;
  }, [getPhaseWorkflows]);

  // Handle workflow click
  const handleWorkflowClick = useCallback((workflow: WorkflowDefinition, phase: BmadPhase) => {
    onWorkflowSelect(workflow, phase);
  }, [onWorkflowSelect]);

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Workflows</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0">
        <Tabs defaultValue="all" className="h-full flex flex-col">
          <TabsList className="mx-4 grid grid-cols-5 h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {(['analysis', 'planning', 'solutioning', 'implementation'] as BmadPhase[]).map((phase, i) => {
              const Icon = PHASE_ICONS[phase];
              return (
                <TabsTrigger key={phase} value={phase} className="text-xs gap-1" title={PHASE_METADATA[phase].name}>
                  <Icon className="h-3 w-3" />
                  {i + 1}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* All workflows */}
          <TabsContent value="all" className="flex-1 min-h-0 mt-2">
            <ScrollArea className="h-full px-4 pb-4">
              {(['analysis', 'planning', 'solutioning', 'implementation'] as BmadPhase[]).map((phase, phaseIndex) => {
                const phaseWorkflows = workflowsByPhase[phase];
                const phaseInfo = phases.find(p => p.id === phase);
                const Icon = PHASE_ICONS[phase];

                return (
                  <div key={phase} className="mb-4">
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-background py-1">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Phase {phaseIndex + 1}: {PHASE_METADATA[phase].name}
                      </span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {phaseInfo?.completedWorkflows}/{phaseInfo?.totalWorkflows}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {phaseWorkflows.map(workflow => (
                        <WorkflowItem
                          key={workflow.id}
                          workflow={workflow}
                          phase={phase}
                          isSelected={selectedWorkflowId === workflow.id}
                          isRunning={activeWorkflowId === workflow.id && isWorkflowRunning}
                          onClick={() => handleWorkflowClick(workflow, phase)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </TabsContent>

          {/* Per-phase tabs */}
          {(['analysis', 'planning', 'solutioning', 'implementation'] as BmadPhase[]).map(phase => (
            <TabsContent key={phase} value={phase} className="flex-1 min-h-0 mt-2">
              <ScrollArea className="h-full px-4 pb-4">
                <div className="space-y-1">
                  {workflowsByPhase[phase].map(workflow => (
                    <WorkflowItem
                      key={workflow.id}
                      workflow={workflow}
                      phase={phase}
                      isSelected={selectedWorkflowId === workflow.id}
                      isRunning={activeWorkflowId === workflow.id && isWorkflowRunning}
                      onClick={() => handleWorkflowClick(workflow, phase)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Item Component
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowItemProps {
  workflow: {
    id: string;
    name: string;
    description: string;
    agent: string;
    optional: boolean;
    status: string;
    isBlocked: boolean;
    blockedBy: string[];
    outputFile?: string;
  };
  phase: BmadPhase;
  isSelected: boolean;
  isRunning: boolean;
  onClick: () => void;
}

function WorkflowItem({ workflow, phase, isSelected, isRunning, onClick }: WorkflowItemProps) {
  const StatusIcon = workflow.status === 'completed' 
    ? CheckCircle2 
    : isRunning
    ? Loader2
    : workflow.isBlocked
    ? Lock
    : Circle;

  const statusColor = workflow.status === 'completed'
    ? 'text-green-500'
    : isRunning
    ? 'text-blue-500'
    : workflow.isBlocked
    ? 'text-red-500'
    : 'text-muted-foreground';

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-muted',
        workflow.isBlocked && 'opacity-60'
      )}
      onClick={onClick}
    >
      <StatusIcon className={cn(
        'h-4 w-4 shrink-0',
        statusColor,
        isRunning && 'animate-spin'
      )} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm truncate',
            isSelected && 'font-medium'
          )}>
            {workflow.name}
          </span>
          {workflow.optional && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              Optional
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {AGENT_NAMES[workflow.agent] || workflow.agent}
          </span>
          {workflow.isBlocked && (
            <span className="text-red-500 truncate">
              Blocked
            </span>
          )}
        </div>
      </div>

      {workflow.status === 'completed' && (
        <Badge className="bg-green-500 text-xs shrink-0">Done</Badge>
      )}
    </div>
  );
}
