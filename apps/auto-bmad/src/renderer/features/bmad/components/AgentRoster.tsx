/**
 * Agent Roster Component
 * 
 * Displays all BMAD agents in a grid with filtering by module.
 * Supports active agent indication and selection for details panel.
 * Story 5.1, 5.2, 5.4
 */

import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentStore, type AgentModule } from '../stores/agent-store';
import { useBmadStore } from '../stores/bmad-store';
import { AgentCard } from './AgentCard';
import { AgentDetailsPanel } from './AgentDetailsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Module Filter Options
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_OPTIONS: { value: AgentModule; label: string; description: string }[] = [
  { value: 'all', label: 'All Agents', description: 'Show all 19 BMAD agents' },
  { value: 'bmm', label: 'BMM', description: 'BMAD Method Module (9 agents)' },
  { value: 'cis', label: 'CIS', description: 'Creative Innovation System (6 agents)' },
  { value: 'core', label: 'Core', description: 'Core utility agents (1 agent)' },
  { value: 'bmb', label: 'BMB', description: 'BMAD Builder Module (3 agents)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentRosterProps {
  projectPath: string;
}

export function AgentRoster({ projectPath }: AgentRosterProps) {
  const {
    isLoading,
    error,
    moduleFilter,
    activeAgentId,
    selectedAgentId,
    loadAgents,
    setModuleFilter,
    selectAgent,
    getFilteredAgents,
    clearError,
  } = useAgentStore();

  // Get workflow state to track active agent
  const { isWorkflowRunning, activeWorkflowId } = useBmadStore();
  const workflows = useBmadStore((state) => state.workflows);

  // Find current workflow's agent
  const currentWorkflowAgent = activeWorkflowId
    ? workflows.find((w) => w.id === activeWorkflowId)?.agent
    : null;

  // Sync active agent with workflow state
  useEffect(() => {
    if (isWorkflowRunning && currentWorkflowAgent) {
      useAgentStore.getState().setActiveAgent(currentWorkflowAgent);
    } else {
      useAgentStore.getState().setActiveAgent(null);
    }
  }, [isWorkflowRunning, currentWorkflowAgent]);

  // Load agents on mount
  useEffect(() => {
    loadAgents(projectPath);
  }, [projectPath, loadAgents]);

  // Get filtered agents
  const filteredAgents = getFilteredAgents();
  const selectedAgent = filteredAgents.find((a) => a.id === selectedAgentId);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadAgents(projectPath);
  }, [projectPath, loadAgents]);

  // Handle agent selection
  const handleAgentClick = useCallback((agentId: string) => {
    selectAgent(selectedAgentId === agentId ? null : agentId);
  }, [selectedAgentId, selectAgent]);

  // Handle close details panel
  const handleCloseDetails = useCallback(() => {
    selectAgent(null);
  }, [selectAgent]);

  // Count agents by module
  const allAgents = useAgentStore((state) => state.agents);
  const agentCounts = {
    all: allAgents.length,
    bmm: allAgents.filter((a) => a.module === 'bmm').length,
    cis: allAgents.filter((a) => a.module === 'cis').length,
    core: allAgents.filter((a) => a.module === 'core').length,
    bmb: allAgents.filter((a) => a.module === 'bmb').length,
  };

  return (
    <div className="h-full flex">
      {/* Main roster area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Agent Roster</h1>
              <p className="text-sm text-muted-foreground">
                {filteredAgents.length} agents
                {moduleFilter !== 'all' && ` in ${moduleFilter.toUpperCase()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Agent Indicator */}
            {activeAgentId && (
              <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                <span className="mr-1">Active:</span>
                {allAgents.find((a) => a.id === activeAgentId)?.name || activeAgentId}
              </Badge>
            )}

            {/* Module Filter */}
            <Select
              value={moduleFilter}
              onValueChange={(value) => setModuleFilter(value as AgentModule)}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{option.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {agentCounts[option.value]}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={clearError}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Agent Grid */}
        {!isLoading && (
          <ScrollArea className="flex-1 px-6 py-4">
            {filteredAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p>No agents found</p>
                {moduleFilter !== 'all' && (
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setModuleFilter('all')}
                  >
                    Show all agents
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    isActive={agent.id === activeAgentId}
                    isSelected={agent.id === selectedAgentId}
                    onClick={() => handleAgentClick(agent.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </div>

      {/* Details Panel (slide in from right) */}
      {selectedAgent && (
        <>
          <Separator orientation="vertical" />
          <AgentDetailsPanel
            agent={selectedAgent}
            isActive={selectedAgent.id === activeAgentId}
            onClose={handleCloseDetails}
          />
        </>
      )}
    </div>
  );
}

export default AgentRoster;
