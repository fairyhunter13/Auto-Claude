import { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Settings,
  Trash2,
  ChevronDown,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from './ui/tooltip';
import { cn } from '../lib/utils';
import { useProjectStore, addProject, removeProject } from '../stores/project-store';
import { useSettingsStore, saveSettings } from '../stores/settings-store';
import type { Project } from '../../shared/types';

interface SidebarProps {
  onSettingsClick: () => void;
  onNewTaskClick: () => void;
}

export function Sidebar({ onSettingsClick, onNewTaskClick }: SidebarProps) {
  const projects = useProjectStore((state) => state.projects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const selectProject = useProjectStore((state) => state.selectProject);
  const settings = useSettingsStore((state) => state.settings);

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const handleAddProject = async () => {
    const path = await window.electronAPI.selectDirectory();
    if (path) {
      await addProject(path);
    }
  };

  const handleRemoveProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeProject(projectId);
  };

  const handleSelectProject = (project: Project) => {
    selectProject(project.id);
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ theme: newTheme });

    // Apply theme to document
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isDark = settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <TooltipProvider>
      <div className="flex h-full w-64 flex-col border-r bg-card">
        {/* Header with drag area */}
        <div className="electron-drag flex h-14 items-center justify-between px-4">
          <span className="electron-no-drag text-lg font-semibold">Auto-Build</span>
          <div className="electron-no-drag flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {isDark ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Separator />

        {/* Projects section */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-medium text-muted-foreground">Projects</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddProject}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add project</TooltipContent>
          </Tooltip>
        </div>

        {/* Project list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {projects.length === 0 ? (
              <div className="px-2 py-8 text-center text-sm text-muted-foreground">
                <FolderOpen className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>No projects yet</p>
                <p className="mt-1 text-xs">Click + to add a project</p>
              </div>
            ) : (
              projects.map((project) => (
                <div key={project.id}>
                  <div
                    className={cn(
                      'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent',
                      selectedProjectId === project.id && 'bg-accent'
                    )}
                    onClick={() => handleSelectProject(project)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProject(project.id);
                      }}
                    >
                      {expandedProjects.has(project.id) ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{project.name}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => handleRemoveProject(project.id, e)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove project</TooltipContent>
                    </Tooltip>
                  </div>
                  {expandedProjects.has(project.id) && (
                    <div className="ml-6 mt-1 space-y-1">
                      <div className="text-xs text-muted-foreground truncate px-2">
                        {project.path}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* New Task button */}
        <div className="p-4">
          <Button className="w-full" onClick={onNewTaskClick} disabled={!selectedProjectId}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
