/**
 * Agent Card Component
 * 
 * Displays a single BMAD agent with avatar, name, role, and status.
 * Supports active state indication during workflow execution.
 * Story 5.1, 5.2
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { AgentDefinition } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Icons/Avatars
// ─────────────────────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<string, string> = {
  // BMM agents
  'pm': '📋',
  'architect': '🏗️',
  'analyst': '🔍',
  'ux-designer': '🎨',
  'sm': '📊',
  'dev': '💻',
  'tea': '🧪',
  'tech-writer': '📝',
  'quick-flow-solo-dev': '⚡',
  // Core
  'bmad-master': '🎯',
  // CIS agents
  'brainstorming-coach': '💡',
  'creative-problem-solver': '🧩',
  'design-thinking-coach': '🎯',
  'innovation-strategist': '🚀',
  'presentation-master': '🎤',
  'storyteller': '📖',
  // BMB agents
  'agent-builder': '🔧',
  'module-builder': '📦',
  'workflow-builder': '⚙️',
};

const AGENT_COLORS: Record<string, string> = {
  // BMM agents - blue tones
  'pm': 'bg-blue-500',
  'architect': 'bg-slate-600',
  'analyst': 'bg-cyan-500',
  'ux-designer': 'bg-pink-500',
  'sm': 'bg-indigo-500',
  'dev': 'bg-green-500',
  'tea': 'bg-purple-500',
  'tech-writer': 'bg-amber-500',
  'quick-flow-solo-dev': 'bg-yellow-500',
  // Core
  'bmad-master': 'bg-red-500',
  // CIS agents - orange/yellow tones
  'brainstorming-coach': 'bg-orange-400',
  'creative-problem-solver': 'bg-rose-400',
  'design-thinking-coach': 'bg-fuchsia-500',
  'innovation-strategist': 'bg-violet-500',
  'presentation-master': 'bg-teal-500',
  'storyteller': 'bg-emerald-500',
  // BMB agents - gray tones
  'agent-builder': 'bg-zinc-500',
  'module-builder': 'bg-stone-500',
  'workflow-builder': 'bg-neutral-500',
};

const MODULE_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  'bmm': { label: 'BMM', variant: 'default' },
  'cis': { label: 'CIS', variant: 'secondary' },
  'core': { label: 'Core', variant: 'outline' },
  'bmb': { label: 'BMB', variant: 'secondary' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: AgentDefinition;
  isActive?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export const AgentCard = memo(function AgentCard({
  agent,
  isActive = false,
  isSelected = false,
  onClick,
}: AgentCardProps) {
  const icon = AGENT_ICONS[agent.id] || '🤖';
  const bgColor = AGENT_COLORS[agent.id] || 'bg-gray-500';
  const moduleBadge = MODULE_BADGES[agent.module] || { label: agent.module.toUpperCase(), variant: 'outline' as const };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50',
        isSelected && 'ring-2 ring-primary border-primary',
        isActive && 'ring-2 ring-green-500 border-green-500 shadow-green-500/20 shadow-lg'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className={cn('h-12 w-12 text-2xl', bgColor)}>
            <AvatarFallback className="bg-transparent text-white">
              {icon}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {agent.name}
              </h3>
              {isActive && (
                <Badge variant="default" className="bg-green-500 text-white text-xs animate-pulse">
                  Active
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground truncate">
              {agent.role}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={moduleBadge.variant} className="text-xs">
                {moduleBadge.label}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {agent.id}
              </span>
            </div>
          </div>
        </div>

        {/* Description (if available) */}
        {agent.description && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

export default AgentCard;
