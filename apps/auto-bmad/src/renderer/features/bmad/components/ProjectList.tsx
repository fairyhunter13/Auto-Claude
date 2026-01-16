/**
 * Project List Component
 * 
 * Displays a list of BMAD projects with filtering and actions.
 */

import { useCallback, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import {
  FolderOpen,
  MoreVertical,
  Trash2,
  Settings,
  Clock,
  GitBranch,
  Plus,
  Import,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';
import { useBmadProjectStore, type BmadProject } from '../stores/project-store';

// Phase colors
const PHASE_COLORS: Record<string, string> = {
  analysis: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  planning: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  solutioning: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  implementation: 'bg-green-500/10 text-green-500 border-green-500/20',
};

// Phase labels
const PHASE_LABELS: Record<string, string> = {
  analysis: 'Phase 1: Analysis',
  planning: 'Phase 2: Planning',
  solutioning: 'Phase 3: Solutioning',
  implementation: 'Phase 4: Implementation',
};

interface ProjectListProps {
  onProjectSelect?: (project: BmadProject) => void;
}

export function ProjectList({ onProjectSelect }: ProjectListProps) {
  const {
    projects,
    selectedProjectId,
    selectProject,
    removeProject,
    openCreateDialog,
    openImportDialog,
  } = useBmadProjectStore();

  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const deleteProject = projects.find(p => p.id === deleteProjectId);

  // Sort projects by last opened
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => 
      b.lastOpenedAt.getTime() - a.lastOpenedAt.getTime()
    );
  }, [projects]);

  // Format date
  const formatDate = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
      }
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
    return date.toLocaleDateString();
  }, []);

  // Handle project click
  const handleProjectClick = useCallback(async (project: BmadProject) => {
    const selected = await selectProject(project.id);
    if (selected && onProjectSelect) {
      onProjectSelect(selected);
    }
  }, [selectProject, onProjectSelect]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteProjectId) {
      await removeProject(deleteProjectId);
      setDeleteProjectId(null);
    }
  }, [deleteProjectId, removeProject]);

  // Open in file explorer
  const handleOpenInExplorer = useCallback((projectPath: string) => {
    // Use shell.openPath via IPC
    window.electronAPI?.openPath?.(projectPath);
  }, []);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <FolderOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create a new BMAD project or import an existing one to get started.
        </p>
        <div className="flex gap-3">
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button variant="outline" onClick={openImportDialog}>
            <Import className="mr-2 h-4 w-4" />
            Import Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Projects</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
            <Button size="sm" variant="outline" onClick={openImportDialog}>
              <Import className="mr-2 h-4 w-4" />
              Import
            </Button>
          </div>
        </div>

        {/* Project cards */}
        <div className="grid gap-3">
          {sortedProjects.map((project) => (
            <Card
              key={project.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedProjectId === project.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleProjectClick(project)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="truncate text-xs">
                      {project.path}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInExplorer(project.path);
                      }}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in Explorer
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteProjectId(project.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-4 text-sm">
                  {/* Phase badge */}
                  <Badge 
                    variant="outline" 
                    className={PHASE_COLORS[project.currentPhase] || ''}
                  >
                    {PHASE_LABELS[project.currentPhase] || project.currentPhase}
                  </Badge>

                  {/* Project type */}
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span className="capitalize text-xs">{project.projectType}</span>
                  </div>

                  {/* Last opened */}
                  <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="text-xs">{formatDate(project.lastOpenedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deleteProject?.name}</strong> from Auto-BMAD.
              The project files will NOT be deleted from disk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
