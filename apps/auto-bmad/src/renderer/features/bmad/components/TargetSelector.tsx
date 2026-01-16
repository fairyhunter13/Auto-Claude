/**
 * Target Selector Component
 * 
 * Dropdown for selecting BMAD workflow targets.
 * Allows users to specify where they want BMAD to stop execution.
 */

import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Badge } from '@/shared/ui/badge';
import { 
  Search, 
  FileText, 
  Boxes, 
  Code, 
  TestTube,
  Zap,
  FileCheck,
  Play,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type BmadTarget =
  | 'research' | 'brief' | 'brainstorm'
  | 'prd' | 'ux-design'
  | 'architecture' | 'test-design' | 'epics' | 'gate-check'
  | 'sprint-ready' | 'story-ready' | 'implemented' | 'reviewed' | 'retro'
  | 'test-framework' | 'test-framework-polyglot' | 'atdd' | 'test-coverage'
  | 'test-reviewed' | 'trace' | 'nfr-tested' | 'ci'
  | 'quick-spec' | 'quick-dev'
  | 'documented'
  | 'auto';

interface TargetInfo {
  id: BmadTarget;
  name: string;
  description: string;
  phase: number | null;
  category: 'analysis' | 'planning' | 'solutioning' | 'implementation' | 'testing' | 'quickflow' | 'utility' | 'control';
  required?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Target Definitions
// ─────────────────────────────────────────────────────────────────────────────

const TARGETS: TargetInfo[] = [
  // Control
  { id: 'auto', name: 'Full Automation', description: 'Execute all required workflows', phase: null, category: 'control' },
  
  // Phase 1: Analysis
  { id: 'research', name: 'Research', description: 'Complete research workflow', phase: 1, category: 'analysis' },
  { id: 'brief', name: 'Product Brief', description: 'Create product brief', phase: 1, category: 'analysis' },
  { id: 'brainstorm', name: 'Brainstorm', description: 'Brainstorming session', phase: 1, category: 'analysis' },
  
  // Phase 2: Planning
  { id: 'prd', name: 'PRD', description: 'Product Requirements Document', phase: 2, category: 'planning', required: true },
  { id: 'ux-design', name: 'UX Design', description: 'UX design document', phase: 2, category: 'planning' },
  
  // Phase 3: Solutioning
  { id: 'architecture', name: 'Architecture', description: 'System architecture', phase: 3, category: 'solutioning', required: true },
  { id: 'test-design', name: 'Test Design', description: 'Test strategy document', phase: 3, category: 'solutioning' },
  { id: 'epics', name: 'Epics & Stories', description: 'Epic breakdown', phase: 3, category: 'solutioning', required: true },
  { id: 'gate-check', name: 'Gate Check', description: 'Implementation readiness', phase: 3, category: 'solutioning', required: true },
  
  // Phase 4: Implementation
  { id: 'sprint-ready', name: 'Sprint Planning', description: 'Sprint status ready', phase: 4, category: 'implementation', required: true },
  { id: 'story-ready', name: 'Story Prep', description: 'Story preparation', phase: 4, category: 'implementation' },
  { id: 'implemented', name: 'Implemented', description: 'Code complete', phase: 4, category: 'implementation' },
  { id: 'reviewed', name: 'Code Review', description: 'Review passed', phase: 4, category: 'implementation' },
  { id: 'retro', name: 'Retrospective', description: 'Epic retrospective', phase: 4, category: 'implementation' },
  
  // Testing
  { id: 'test-framework', name: 'Test Framework', description: 'Framework setup', phase: 4, category: 'testing' },
  { id: 'test-framework-polyglot', name: 'Polyglot Framework', description: 'Multi-language tests', phase: 4, category: 'testing' },
  { id: 'atdd', name: 'ATDD', description: 'Acceptance tests', phase: 4, category: 'testing' },
  { id: 'test-coverage', name: 'Test Coverage', description: 'Automation expanded', phase: 4, category: 'testing' },
  { id: 'test-reviewed', name: 'Test Review', description: 'Test quality review', phase: 4, category: 'testing' },
  { id: 'trace', name: 'Traceability', description: 'Traceability matrix', phase: 4, category: 'testing' },
  { id: 'nfr-tested', name: 'NFR Assessment', description: 'Non-functional tests', phase: 4, category: 'testing' },
  { id: 'ci', name: 'CI Pipeline', description: 'CI/CD setup', phase: 4, category: 'testing' },
  
  // Quick Flow
  { id: 'quick-spec', name: 'Quick Spec', description: 'Fast spec engineering', phase: null, category: 'quickflow' },
  { id: 'quick-dev', name: 'Quick Dev', description: 'Fast development', phase: null, category: 'quickflow' },
  
  // Utility
  { id: 'documented', name: 'Documentation', description: 'Project documented', phase: null, category: 'utility' },
];

const CATEGORY_LABELS: Record<string, string> = {
  control: 'Control',
  analysis: 'Phase 1: Analysis',
  planning: 'Phase 2: Planning',
  solutioning: 'Phase 3: Solutioning',
  implementation: 'Phase 4: Implementation',
  testing: 'Testing (TEA)',
  quickflow: 'Quick Flow',
  utility: 'Utilities',
};

const CATEGORY_ICONS: Record<string, typeof Search> = {
  control: Play,
  analysis: Search,
  planning: FileText,
  solutioning: Boxes,
  implementation: Code,
  testing: TestTube,
  quickflow: Zap,
  utility: FileCheck,
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface TargetSelectorProps {
  value: BmadTarget;
  onChange: (target: BmadTarget) => void;
  disabled?: boolean;
  showDescription?: boolean;
  className?: string;
}

export function TargetSelector({
  value,
  onChange,
  disabled = false,
  showDescription = true,
  className,
}: TargetSelectorProps) {
  const selectedTarget = useMemo(
    () => TARGETS.find(t => t.id === value),
    [value]
  );

  const groupedTargets = useMemo(() => {
    const groups: Record<string, TargetInfo[]> = {};
    for (const target of TARGETS) {
      if (!groups[target.category]) {
        groups[target.category] = [];
      }
      groups[target.category].push(target);
    }
    return groups;
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as BmadTarget)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select target...">
            {selectedTarget && (
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = CATEGORY_ICONS[selectedTarget.category];
                  return Icon && <Icon className="h-4 w-4 text-muted-foreground" />;
                })()}
                <span>{selectedTarget.name}</span>
                {selectedTarget.required && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    Required
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {Object.entries(groupedTargets).map(([category, targets]) => {
            const Icon = CATEGORY_ICONS[category];
            return (
              <SelectGroup key={category}>
                <SelectLabel className="flex items-center gap-2 text-xs uppercase tracking-wider">
                  {Icon && <Icon className="h-3 w-3" />}
                  {CATEGORY_LABELS[category]}
                </SelectLabel>
                {targets.map((target) => (
                  <SelectItem
                    key={target.id}
                    value={target.id}
                    className="pl-6"
                  >
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{target.name}</span>
                      <div className="flex items-center gap-1">
                        {target.phase && (
                          <Badge variant="outline" className="text-xs">
                            P{target.phase}
                          </Badge>
                        )}
                        {target.required && (
                          <Badge variant="secondary" className="text-xs">
                            Req
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
      
      {showDescription && selectedTarget && (
        <p className="text-xs text-muted-foreground pl-1">
          {selectedTarget.description}
          {selectedTarget.phase && ` (Phase ${selectedTarget.phase})`}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact Version
// ─────────────────────────────────────────────────────────────────────────────

interface TargetBadgeProps {
  target: BmadTarget;
  onClick?: () => void;
  className?: string;
}

export function TargetBadge({ target, onClick, className }: TargetBadgeProps) {
  const targetInfo = TARGETS.find(t => t.id === target);
  const Icon = targetInfo ? CATEGORY_ICONS[targetInfo.category] : Play;

  return (
    <Badge
      variant="outline"
      className={cn(
        'cursor-pointer hover:bg-accent',
        className
      )}
      onClick={onClick}
    >
      <Icon className="h-3 w-3 mr-1" />
      {targetInfo?.name || target}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getTargetInfo(target: BmadTarget): TargetInfo | undefined {
  return TARGETS.find(t => t.id === target);
}

export function getTargetsByPhase(phase: number): TargetInfo[] {
  return TARGETS.filter(t => t.phase === phase);
}

export function getRequiredTargets(): TargetInfo[] {
  return TARGETS.filter(t => t.required);
}
