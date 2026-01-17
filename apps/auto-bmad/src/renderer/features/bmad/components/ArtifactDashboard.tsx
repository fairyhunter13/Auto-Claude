/**
 * Artifact Dashboard Component
 * 
 * Displays BMAD artifacts organized by target/phase completion.
 * Shows what has been created and what's pending.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Circle,
  FileText,
  FolderOpen,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Boxes,
  Code,
  TestTube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BmadTarget } from './TargetSelector';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ArtifactStatus = 'completed' | 'in_progress' | 'pending' | 'skipped' | 'blocked';

export interface Artifact {
  id: string;
  name: string;
  target: BmadTarget;
  phase: number;
  status: ArtifactStatus;
  path?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  size?: number;
  required: boolean;
}

export interface ArtifactGroup {
  phase: number;
  phaseName: string;
  artifacts: Artifact[];
  completedCount: number;
  totalCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_NAMES: Record<number, string> = {
  1: 'Analysis',
  2: 'Planning',
  3: 'Solutioning',
  4: 'Implementation',
};

const PHASE_ICONS: Record<number, typeof Search> = {
  1: Search,
  2: FileText,
  3: Boxes,
  4: Code,
};

const STATUS_COLORS: Record<ArtifactStatus, string> = {
  completed: 'text-green-500',
  in_progress: 'text-blue-500',
  pending: 'text-muted-foreground',
  skipped: 'text-yellow-500',
  blocked: 'text-red-500',
};

const STATUS_BG: Record<ArtifactStatus, string> = {
  completed: 'bg-green-500/10',
  in_progress: 'bg-blue-500/10',
  pending: 'bg-muted/30',
  skipped: 'bg-yellow-500/10',
  blocked: 'bg-red-500/10',
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactDashboardProps {
  artifacts: Artifact[];
  isLoading?: boolean;
  onArtifactClick?: (artifact: Artifact) => void;
  onOpenInEditor?: (path: string) => void;
  className?: string;
}

export function ArtifactDashboard({
  artifacts,
  isLoading = false,
  onArtifactClick,
  onOpenInEditor,
  className,
}: ArtifactDashboardProps) {
  // Group artifacts by phase
  const groups = useMemo(() => {
    const groupMap = new Map<number, Artifact[]>();
    
    for (const artifact of artifacts) {
      const phase = artifact.phase || 0;
      if (!groupMap.has(phase)) {
        groupMap.set(phase, []);
      }
      groupMap.get(phase)!.push(artifact);
    }

    const result: ArtifactGroup[] = [];
    for (const [phase, phaseArtifacts] of groupMap) {
      result.push({
        phase,
        phaseName: PHASE_NAMES[phase] || `Phase ${phase}`,
        artifacts: phaseArtifacts,
        completedCount: phaseArtifacts.filter(a => a.status === 'completed').length,
        totalCount: phaseArtifacts.length,
      });
    }

    return result.sort((a, b) => a.phase - b.phase);
  }, [artifacts]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    const completed = artifacts.filter(a => a.status === 'completed').length;
    const total = artifacts.length;
    return total > 0 ? (completed / total) * 100 : 0;
  }, [artifacts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-48 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No artifacts yet</p>
          <p className="text-sm text-muted-foreground">
            Run a workflow to generate artifacts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Artifact Progress</CardTitle>
            <Badge variant="outline">
              {artifacts.filter(a => a.status === 'completed').length}/{artifacts.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{Math.round(overallProgress)}% complete</span>
            <span>
              {artifacts.filter(a => a.status === 'in_progress').length} in progress
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Phase Groups */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {groups.map((group) => (
            <PhaseGroup
              key={group.phase}
              group={group}
              onArtifactClick={onArtifactClick}
              onOpenInEditor={onOpenInEditor}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase Group
// ─────────────────────────────────────────────────────────────────────────────

interface PhaseGroupProps {
  group: ArtifactGroup;
  onArtifactClick?: (artifact: Artifact) => void;
  onOpenInEditor?: (path: string) => void;
}

function PhaseGroup({ group, onArtifactClick, onOpenInEditor }: PhaseGroupProps) {
  const Icon = PHASE_ICONS[group.phase] || FileText;
  const isComplete = group.completedCount === group.totalCount;

  return (
    <Card className={cn(isComplete && 'border-green-500/30')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              isComplete ? 'bg-green-500/20' : 'bg-muted'
            )}>
              <Icon className={cn('h-4 w-4', isComplete && 'text-green-500')} />
            </div>
            <div>
              <CardTitle className="text-sm">
                Phase {group.phase}: {group.phaseName}
              </CardTitle>
              <CardDescription className="text-xs">
                {group.completedCount}/{group.totalCount} artifacts
              </CardDescription>
            </div>
          </div>
          {isComplete && (
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {group.artifacts.map((artifact) => (
            <ArtifactRow
              key={artifact.id}
              artifact={artifact}
              onClick={() => onArtifactClick?.(artifact)}
              onOpenInEditor={onOpenInEditor}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Row
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactRowProps {
  artifact: Artifact;
  onClick?: () => void;
  onOpenInEditor?: (path: string) => void;
}

function ArtifactRow({ artifact, onClick, onOpenInEditor }: ArtifactRowProps) {
  const StatusIcon = artifact.status === 'completed'
    ? CheckCircle2
    : artifact.status === 'in_progress'
    ? Loader2
    : artifact.status === 'blocked'
    ? AlertCircle
    : Circle;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-md cursor-pointer',
        'hover:bg-accent/50 transition-colors',
        STATUS_BG[artifact.status]
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <StatusIcon
          className={cn(
            'h-4 w-4 flex-shrink-0',
            STATUS_COLORS[artifact.status],
            artifact.status === 'in_progress' && 'animate-spin'
          )}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {artifact.name}
            {artifact.required && (
              <Badge variant="secondary" className="ml-2 text-[10px] h-4">
                Required
              </Badge>
            )}
          </p>
          {artifact.path && (
            <p className="text-xs text-muted-foreground truncate">
              {artifact.path}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {artifact.status === 'completed' && artifact.modifiedAt && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(artifact.modifiedAt)}
          </span>
        )}
        {artifact.path && onOpenInEditor && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInEditor(artifact.path!);
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Summary
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactSummaryProps {
  artifacts: Artifact[];
  className?: string;
}

export function ArtifactSummary({ artifacts, className }: ArtifactSummaryProps) {
  const completed = artifacts.filter(a => a.status === 'completed').length;
  const inProgress = artifacts.filter(a => a.status === 'in_progress').length;
  const pending = artifacts.filter(a => a.status === 'pending').length;

  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <span className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        {completed}
      </span>
      {inProgress > 0 && (
        <span className="flex items-center gap-1 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {inProgress}
        </span>
      )}
      <span className="flex items-center gap-1 text-muted-foreground">
        <Circle className="h-4 w-4" />
        {pending}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

/**
 * Create mock artifacts for testing
 */
export function createMockArtifacts(): Artifact[] {
  return [
    // Phase 1
    { id: 'research', name: 'Research Findings', target: 'research', phase: 1, status: 'completed', path: 'research-findings.md', required: false, createdAt: new Date(), modifiedAt: new Date() },
    { id: 'brief', name: 'Product Brief', target: 'brief', phase: 1, status: 'completed', path: 'product-brief.md', required: false, createdAt: new Date(), modifiedAt: new Date() },
    
    // Phase 2
    { id: 'prd', name: 'PRD', target: 'prd', phase: 2, status: 'completed', path: 'prd.md', required: true, createdAt: new Date(), modifiedAt: new Date() },
    { id: 'ux', name: 'UX Design', target: 'ux-design', phase: 2, status: 'in_progress', path: 'ux-design.md', required: false },
    
    // Phase 3
    { id: 'arch', name: 'Architecture', target: 'architecture', phase: 3, status: 'pending', path: 'architecture.md', required: true },
    { id: 'epics', name: 'Epics & Stories', target: 'epics', phase: 3, status: 'pending', path: 'epics/', required: true },
    { id: 'gate', name: 'Gate Check', target: 'gate-check', phase: 3, status: 'blocked', required: true },
    
    // Phase 4
    { id: 'sprint', name: 'Sprint Status', target: 'sprint-ready', phase: 4, status: 'pending', path: 'sprint-status.yaml', required: true },
  ];
}
