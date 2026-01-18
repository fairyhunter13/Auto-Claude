/**
 * Agent Details Panel Component
 * 
 * Shows detailed information about a selected agent.
 * Story 5.3
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  X,
  MessageSquare,
  BookOpen,
  Workflow,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentDefinition } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Icons (duplicated from AgentCard for now)
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, string> = {
  'pm': '📋',
  'architect': '🏗️',
  'analyst': '🔍',
  'ux-designer': '🎨',
  'sm': '📊',
  'dev': '💻',
  'tea': '🧪',
  'tech-writer': '📝',
  'quick-flow-solo-dev': '⚡',
  'bmad-master': '🎯',
  'brainstorming-coach': '💡',
  'creative-problem-solver': '🧩',
  'design-thinking-coach': '🎯',
  'innovation-strategist': '🚀',
  'presentation-master': '🎤',
  'storyteller': '📖',
  'agent-builder': '🔧',
  'module-builder': '📦',
  'workflow-builder': '⚙️',
};

const AGENT_COLORS: Record<string, string> = {
  'pm': 'bg-blue-500',
  'architect': 'bg-slate-600',
  'analyst': 'bg-cyan-500',
  'ux-designer': 'bg-pink-500',
  'sm': 'bg-indigo-500',
  'dev': 'bg-green-500',
  'tea': 'bg-purple-500',
  'tech-writer': 'bg-amber-500',
  'quick-flow-solo-dev': 'bg-yellow-500',
  'bmad-master': 'bg-red-500',
  'brainstorming-coach': 'bg-orange-400',
  'creative-problem-solver': 'bg-rose-400',
  'design-thinking-coach': 'bg-fuchsia-500',
  'innovation-strategist': 'bg-violet-500',
  'presentation-master': 'bg-teal-500',
  'storyteller': 'bg-emerald-500',
  'agent-builder': 'bg-zinc-500',
  'module-builder': 'bg-stone-500',
  'workflow-builder': 'bg-neutral-500',
};

// Workflow associations by agent
const AGENT_WORKFLOWS: Record<string, string[]> = {
  'analyst': ['brainstorm-project', 'research', 'create-product-brief'],
  'pm': ['create-prd', 'create-epics-and-stories'],
  'ux-designer': ['create-ux-design'],
  'architect': ['create-architecture', 'implementation-readiness'],
  'sm': ['sprint-planning', 'create-story'],
  'dev': ['dev-story', 'code-review'],
  'tea': ['test-framework', 'test-design', 'test-automate', 'atdd', 'test-trace', 'nfr-assess', 'ci-scaffold', 'test-review'],
  'tech-writer': ['create-documentation'],
  'quick-flow-solo-dev': ['quick-flow'],
  'bmad-master': ['orchestrate'],
  'brainstorming-coach': ['brainstorm'],
  'creative-problem-solver': ['solve-problem'],
  'design-thinking-coach': ['design-thinking'],
  'innovation-strategist': ['innovate'],
  'presentation-master': ['create-presentation'],
  'storyteller': ['create-story'],
  'agent-builder': ['build-agent'],
  'module-builder': ['build-module'],
  'workflow-builder': ['build-workflow'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentDetailsPanelProps {
  agent: AgentDefinition;
  isActive?: boolean;
  onClose: () => void;
}

export const AgentDetailsPanel = memo(function AgentDetailsPanel({
  agent,
  isActive = false,
  onClose,
}: AgentDetailsPanelProps) {
  const icon = AGENT_ICONS[agent.id] || '🤖';
  const bgColor = AGENT_COLORS[agent.id] || 'bg-gray-500';
  const workflows = AGENT_WORKFLOWS[agent.id] || [];

  return (
    <div className="w-80 flex flex-col bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-foreground">Agent Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Agent Header */}
          <div className="flex items-center gap-4">
            <Avatar className={cn('h-16 w-16 text-3xl', bgColor)}>
              <AvatarFallback className="bg-transparent text-white">
                {icon}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{agent.name}</h3>
                {isActive && (
                  <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                    Active
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{agent.role}</p>
              <Badge variant="outline" className="mt-1 text-xs">
                {agent.module.toUpperCase()}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {agent.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Description</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {agent.description}
              </p>
            </div>
          )}

          {/* Communication Style */}
          {agent.communicationStyle && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Communication Style</h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {agent.communicationStyle}
              </p>
            </div>
          )}

          {/* Principles */}
          {agent.principles && agent.principles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Principles</h4>
              </div>
              <ul className="space-y-2">
                {agent.principles.map((principle, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary mt-1">•</span>
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Associated Workflows */}
          {workflows.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Workflow className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">Workflows</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {workflows.map((workflow) => (
                  <Badge key={workflow} variant="secondary" className="text-xs">
                    {workflow}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Agent ID */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Agent ID</span>
              <code className="font-mono bg-muted px-2 py-1 rounded">{agent.id}</code>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});

export default AgentDetailsPanel;
