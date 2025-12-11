import { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Settings,
  Trash2,
  Moon,
  Sun,
  LayoutGrid,
  Terminal,
  Map,
  BookOpen,
  Wrench
} from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
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

export type SidebarView = 'kanban' | 'terminals' | 'roadmap' | 'context' | 'agent-tools';

interface SidebarProps {
  onSettingsClick: () => void;
  onNewTaskClick: () => void;
  activeView?: SidebarView;
  onViewChange?: (view: SidebarView) => void;
}

interface NavItem {
  id: SidebarView;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
}

const projectNavItems: NavItem[] = [
  { id: 'kanban', label: 'Kanban Board', icon: LayoutGrid, shortcut: 'K' },
  { id: 'terminals', label: 'Agent Terminals', icon: Terminal, shortcut: 'A' }
];

const toolsNavItems: NavItem[] = [
  { id: 'roadmap', label: 'Roadmap', icon: Map, shortcut: 'D' },
  { id: 'context', label: 'Context', icon: BookOpen, shortcut: 'C' },
  { id: 'agent-tools', label: 'Agent Tools', icon: Wrench, shortcut: 'T' }
];

export function Sidebar({
  onSettingsClick,
  onNewTaskClick,
  activeView = 'kanban',
  onViewChange
}: SidebarProps) {
  const projects = useProjectStore((state) => state.projects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const selectProject = useProjectStore((state) => state.selectProject);
  const settings = useSettingsStore((state) => state.settings);

  const [isAddingProject, setIsAddingProject] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const handleAddProject = async () => {
    setIsAddingProject(true);
    try {
      const path = await window.electronAPI.selectDirectory();
      if (path) {
        await addProject(path);
      }
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleRemoveProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await removeProject(projectId);
  };

  const handleProjectChange = (projectId: string) => {
    if (projectId === '__add_new__') {
      handleAddProject();
    } else {
      selectProject(projectId);
    }
  };

  const toggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    saveSettings({ theme: newTheme });

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleNavClick = (view: SidebarView) => {
    onViewChange?.(view);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = activeView === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleNavClick(item.id)}
        disabled={!selectedProjectId}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
          'hover:bg-accent hover:text-accent-foreground',
          'disabled:pointer-events-none disabled:opacity-50',
          isActive && 'bg-accent text-accent-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {item.shortcut && (
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded-md border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            {item.shortcut}
          </kbd>
        )}
      </button>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-full w-64 flex-col bg-sidebar border-r border-border">
        {/* Header with drag area - extra top padding for macOS traffic lights */}
        <div className="electron-drag flex h-14 items-center justify-between px-4 pt-6">
          <span className="electron-no-drag text-lg font-bold text-primary">Auto-Build</span>
          <div className="electron-no-drag flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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

        <Separator className="mt-2" />

        {/* Project Selector Dropdown */}
        <div className="px-4 py-4">
          <Select
            value={selectedProjectId || ''}
            onValueChange={handleProjectChange}
          >
            <SelectTrigger className="w-full [&_span]:truncate">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Select a project..." className="truncate min-w-0 flex-1" />
              </div>
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
              {projects.length === 0 ? (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  <p>No projects yet</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="relative flex items-center">
                    <SelectItem value={project.id} className="flex-1 pr-10">
                      <span className="truncate" title={`${project.name} - ${project.path}`}>
                        {project.name}
                      </span>
                    </SelectItem>
                    <button
                      type="button"
                      className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        removeProject(project.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ))
              )}
              <Separator className="my-1" />
              <SelectItem value="__add_new__">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>Add Project...</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Project path - shown when project is selected */}
          {selectedProject && (
            <div className="mt-2">
              <span className="truncate block text-xs text-muted-foreground" title={selectedProject.path}>
                {selectedProject.path}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="px-3 py-4">
            {/* Project Section */}
            <div className="mb-6">
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project
              </h3>
              <nav className="space-y-1">
                {projectNavItems.map(renderNavItem)}
              </nav>
            </div>

            {/* Tools Section */}
            <div>
              <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tools
              </h3>
              <nav className="space-y-1">
                {toolsNavItems.map(renderNavItem)}
              </nav>
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* New Task button */}
        <div className="p-4">
          <Button
            className="w-full"
            onClick={onNewTaskClick}
            disabled={!selectedProjectId}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
