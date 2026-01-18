/**
 * ArtifactsView Component
 * 
 * Main view for BMAD artifact management providing:
 * - List of all generated artifacts
 * - Markdown preview with formatting
 * - Metadata display
 * - Export and edit functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  FolderOpen,
  Edit,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  X,
  Search,
  Filter,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MarkdownPreview } from './MarkdownPreview';
import { ArtifactMetadata, type ArtifactMetadataInfo } from './ArtifactMetadata';
import { ArtifactEditor } from './ArtifactEditor';
import {
  useArtifactStore,
  loadArtifacts,
  loadArtifactContent,
  saveArtifactContent,
  exportArtifact,
  copyArtifactToClipboard,
  type ArtifactFile,
} from '../stores/artifact-store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactsViewProps {
  projectPath: string;
}

type FilterType = 'all' | 'planning' | 'implementation';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ArtifactsView({ projectPath }: ArtifactsViewProps) {
  const { t } = useTranslation(['artifacts', 'common']);
  const { toast } = useToast();

  // Store state
  const {
    artifacts,
    isLoading,
    error,
    selectedArtifact,
    selectedContent,
    isLoadingContent,
    viewMode,
    selectArtifact,
    setViewMode,
  } = useArtifactStore();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load artifacts on mount
  useEffect(() => {
    if (projectPath) {
      loadArtifacts(projectPath);
    }
  }, [projectPath]);

  // Load content when artifact selected
  useEffect(() => {
    if (selectedArtifact) {
      loadArtifactContent(selectedArtifact.path);
    }
  }, [selectedArtifact]);

  // Filter artifacts
  const filteredArtifacts = artifacts.filter((artifact) => {
    // Filter by type
    if (filterType !== 'all' && artifact.type !== filterType) {
      return false;
    }
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        artifact.name.toLowerCase().includes(query) ||
        (artifact.workflow && artifact.workflow.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // Group artifacts by type
  const planningArtifacts = filteredArtifacts.filter((a) => a.type === 'planning');
  const implementationArtifacts = filteredArtifacts.filter((a) => a.type === 'implementation');

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadArtifacts(projectPath);
    setIsRefreshing(false);
  }, [projectPath]);

  const handleArtifactClick = useCallback((artifact: ArtifactFile) => {
    selectArtifact(artifact);
  }, [selectArtifact]);

  const handleBackToList = useCallback(() => {
    selectArtifact(null);
    setViewMode('list');
  }, [selectArtifact, setViewMode]);

  const handleEdit = useCallback(() => {
    setViewMode('edit');
  }, [setViewMode]);

  const handleSave = useCallback(async (content: string) => {
    if (!selectedArtifact) return;
    
    const success = await saveArtifactContent(selectedArtifact.path, content);
    if (success) {
      toast({
        title: 'Saved',
        description: 'Artifact saved successfully',
      });
      setViewMode('preview');
      // Reload content to reflect changes
      await loadArtifactContent(selectedArtifact.path);
      // Refresh artifact list to update metadata
      await loadArtifacts(projectPath);
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save artifact',
        variant: 'destructive',
      });
    }
  }, [selectedArtifact, projectPath, setViewMode, toast]);

  const handleCancelEdit = useCallback(() => {
    setViewMode('preview');
  }, [setViewMode]);

  const handleExport = useCallback(async () => {
    if (!selectedArtifact || !selectedContent) return;
    
    const success = await exportArtifact(selectedArtifact.path, selectedContent);
    if (success) {
      toast({
        title: 'Exported',
        description: 'Artifact exported successfully',
      });
    }
  }, [selectedArtifact, selectedContent, toast]);

  const handleCopy = useCallback(async () => {
    if (!selectedContent) return;
    
    const success = await copyArtifactToClipboard(selectedContent);
    if (success) {
      toast({
        title: 'Copied',
        description: 'Artifact copied to clipboard',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  }, [selectedContent, toast]);

  const handleOpenInEditor = useCallback(async () => {
    if (!selectedArtifact) return;
    
    try {
      // Use shell.openPath to open the file in the system's default editor
      const { shell } = window.require?.('electron') || {};
      if (shell?.openPath) {
        await shell.openPath(selectedArtifact.path);
      } else {
        // Fallback: copy path to clipboard
        await navigator.clipboard.writeText(selectedArtifact.path);
        toast({
          title: 'Path copied',
          description: 'File path copied to clipboard. Open it in your editor.',
        });
      }
    } catch (error) {
      // Fallback: copy path to clipboard
      await navigator.clipboard.writeText(selectedArtifact.path);
      toast({
        title: 'Path copied',
        description: 'File path copied to clipboard. Open it in your editor.',
      });
    }
  }, [selectedArtifact, toast]);

  // Render loading state
  if (isLoading && artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render edit mode
  if (viewMode === 'edit' && selectedArtifact && selectedContent !== null) {
    return (
      <ArtifactEditor
        content={selectedContent}
        filePath={selectedArtifact.path}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        className="h-full"
      />
    );
  }

  // Render preview mode
  if (viewMode === 'preview' && selectedArtifact) {
    const metadataInfo: ArtifactMetadataInfo = {
      name: selectedArtifact.name,
      path: selectedArtifact.path,
      type: selectedArtifact.type,
      workflow: selectedArtifact.workflow,
      createdAt: selectedArtifact.createdAt,
      modifiedAt: selectedArtifact.modifiedAt,
      size: selectedArtifact.size,
    };

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{selectedArtifact.name}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedArtifact.type === 'planning' ? 'Planning Artifact' : 'Implementation Artifact'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenInEditor}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
            <Button size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Markdown Preview */}
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-4xl">
              {isLoadingContent ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedContent ? (
                <MarkdownPreview content={selectedContent} />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Unable to load content
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Metadata Sidebar */}
          <div className="w-72 border-l bg-muted/10">
            <ScrollArea className="h-full">
              <div className="p-4">
                <h3 className="text-sm font-semibold mb-4">Artifact Details</h3>
                <ArtifactMetadata artifact={metadataInfo} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    );
  }

  // Render list mode (default)
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 border-b">
        <div>
          <h1 className="text-xl font-semibold">Artifacts</h1>
          <p className="text-sm text-muted-foreground">
            {filteredArtifacts.length} artifact{filteredArtifacts.length !== 1 ? 's' : ''} generated
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 border-b bg-muted/30">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search artifacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artifacts</SelectItem>
            <SelectItem value="planning">Planning Only</SelectItem>
            <SelectItem value="implementation">Implementation Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-destructive/10 border-b border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Artifact List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {filteredArtifacts.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterType !== 'all'
                  ? 'No artifacts match your filters'
                  : 'No artifacts generated yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Run BMAD workflows to generate artifacts
              </p>
            </div>
          ) : (
            <>
              {/* Planning Artifacts */}
              {planningArtifacts.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Planning Artifacts ({planningArtifacts.length})
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {planningArtifacts.map((artifact) => (
                      <ArtifactCard
                        key={artifact.path}
                        artifact={artifact}
                        onClick={() => handleArtifactClick(artifact)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Implementation Artifacts */}
              {implementationArtifacts.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Implementation Artifacts ({implementationArtifacts.length})
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {implementationArtifacts.map((artifact) => (
                      <ArtifactCard
                        key={artifact.path}
                        artifact={artifact}
                        onClick={() => handleArtifactClick(artifact)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Card
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactCardProps {
  artifact: ArtifactFile;
  onClick: () => void;
}

function ArtifactCard({ artifact, onClick }: ArtifactCardProps) {
  // Format workflow name
  const workflowName = artifact.workflow
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Format date
  const dateStr = artifact.modifiedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(artifact.modifiedAt)
    : null;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        'group'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0',
              artifact.type === 'planning'
                ? 'bg-blue-500/10 text-blue-600'
                : 'bg-green-500/10 text-green-600'
            )}
          >
            <FileText className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate group-hover:text-primary transition-colors">
              {artifact.name}
            </p>
            {workflowName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {workflowName}
              </p>
            )}
            {dateStr && (
              <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
            )}
          </div>

          <Badge
            variant="outline"
            className={cn(
              'text-[10px] flex-shrink-0',
              artifact.type === 'planning'
                ? 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                : 'bg-green-500/10 text-green-600 border-green-500/30'
            )}
          >
            {artifact.type === 'planning' ? 'Plan' : 'Impl'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
