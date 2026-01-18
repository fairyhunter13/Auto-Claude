/**
 * ArtifactMetadata Component
 * 
 * Displays metadata about a BMAD artifact including:
 * - File name and path
 * - Created/modified dates
 * - File size
 * - Associated workflow
 * - Artifact type (planning/implementation)
 */

import { useMemo } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  HardDrive,
  Workflow,
  FolderOpen,
  Tag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ArtifactMetadataInfo {
  name: string;
  path: string;
  type: 'planning' | 'implementation';
  workflow?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  size?: number;
}

interface ArtifactMetadataProps {
  artifact: ArtifactMetadataInfo;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getWorkflowDisplayName(workflow?: string): string {
  const WORKFLOW_NAMES: Record<string, string> = {
    'product-brief': 'Product Brief',
    'prd': 'PRD',
    'ux-design': 'UX Design',
    'architecture': 'Architecture',
    'epics': 'Epics & Stories',
    'test-design': 'Test Design',
    'implementation-readiness': 'Implementation Readiness',
    'sprint-planning': 'Sprint Planning',
    'status': 'Status File',
  };
  
  if (!workflow) return 'Unknown';
  return WORKFLOW_NAMES[workflow] || workflow.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getRelativePath(fullPath: string): string {
  // Extract the path relative to _bmad-output
  const match = fullPath.match(/_bmad-output[/\\](.+)/);
  return match ? match[1] : fullPath;
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

interface MetadataRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}

function MetadataRow({ icon: Icon, label, value }: MetadataRowProps) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function ArtifactMetadata({ artifact, className }: ArtifactMetadataProps) {
  const relativePath = useMemo(() => getRelativePath(artifact.path), [artifact.path]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with badges */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={artifact.type === 'planning' ? 'default' : 'secondary'}
            className={cn(
              artifact.type === 'planning'
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                : 'bg-green-500/10 text-green-600 border-green-500/30'
            )}
          >
            <Tag className="h-3 w-3 mr-1" />
            {artifact.type === 'planning' ? 'Planning' : 'Implementation'}
          </Badge>
          {artifact.workflow && (
            <Badge variant="outline">
              <Workflow className="h-3 w-3 mr-1" />
              {getWorkflowDisplayName(artifact.workflow)}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* File info */}
      <div className="space-y-0">
        <MetadataRow
          icon={FileText}
          label="File Name"
          value={<span className="font-mono text-xs">{artifact.name}</span>}
        />
        
        <MetadataRow
          icon={FolderOpen}
          label="Location"
          value={
            <span className="font-mono text-xs text-muted-foreground break-all">
              {relativePath}
            </span>
          }
        />

        {artifact.size !== undefined && (
          <MetadataRow
            icon={HardDrive}
            label="File Size"
            value={formatFileSize(artifact.size)}
          />
        )}
      </div>

      <Separator />

      {/* Timestamps */}
      <div className="space-y-0">
        {artifact.createdAt && (
          <MetadataRow
            icon={Calendar}
            label="Created"
            value={
              <span title={formatDate(artifact.createdAt)}>
                {formatRelativeTime(artifact.createdAt)}
              </span>
            }
          />
        )}

        {artifact.modifiedAt && (
          <MetadataRow
            icon={Clock}
            label="Last Modified"
            value={
              <span title={formatDate(artifact.modifiedAt)}>
                {formatRelativeTime(artifact.modifiedAt)}
              </span>
            }
          />
        )}
      </div>
    </div>
  );
}
