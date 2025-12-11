import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { TooltipProvider } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from './components/ui/tooltip';
import { Sidebar, type SidebarView } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TaskCreationWizard } from './components/TaskCreationWizard';
import { AppSettingsDialog } from './components/AppSettings';
import { ProjectSettings } from './components/ProjectSettings';
import { useProjectStore, loadProjects } from './stores/project-store';
import { useTaskStore, loadTasks } from './stores/task-store';
import { useSettingsStore, loadSettings } from './stores/settings-store';
import { useIpcListeners } from './hooks/useIpc';
import type { Task } from '../shared/types';

export function App() {
  // Load IPC listeners for real-time updates
  useIpcListeners();

  // Stores
  const projects = useProjectStore((state) => state.projects);
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);
  const tasks = useTaskStore((state) => state.tasks);
  const settings = useSettingsStore((state) => state.settings);

  // UI State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskDialogOpen, setIsNewTaskDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState<SidebarView>('kanban');

  // Get selected project
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Initial load
  useEffect(() => {
    loadProjects();
    loadSettings();
  }, []);

  // Load tasks when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
      setSelectedTask(null); // Clear selection on project change
    } else {
      useTaskStore.getState().clearTasks();
    }
  }, [selectedProjectId]);

  // Apply theme on load
  useEffect(() => {
    const applyTheme = () => {
      if (settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings.theme === 'system') {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [settings.theme]);

  // Update selected task when tasks change (for real-time updates)
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find(
        (t) => t.id === selectedTask.id || t.specId === selectedTask.specId
      );
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasks, selectedTask?.id, selectedTask?.specId]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseTaskDetail = () => {
    setSelectedTask(null);
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <Sidebar
          onSettingsClick={() => setIsSettingsDialogOpen(true)}
          onNewTaskClick={() => setIsNewTaskDialogOpen(true)}
          activeView={activeView}
          onViewChange={setActiveView}
        />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="electron-drag flex h-14 items-center justify-between glass border-b border-border/50 px-6">
            <div className="electron-no-drag">
              {selectedProject ? (
                <div>
                  <h1 className="font-semibold">{selectedProject.name}</h1>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {selectedProject.path}
                  </p>
                </div>
              ) : (
                <div className="text-muted-foreground">
                  Select a project to get started
                </div>
              )}
            </div>
            {selectedProject && (
              <div className="electron-no-drag">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsProjectSettingsOpen(true)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Project Settings</TooltipContent>
                </Tooltip>
              </div>
            )}
          </header>

          {/* Main content area */}
          <main className="flex-1 overflow-hidden">
            {selectedProject ? (
              <>
                {activeView === 'kanban' && (
                  <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} />
                )}
                {activeView === 'terminals' && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-lg font-medium">Agent Terminals</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Terminal view for running agents - Coming soon
                      </p>
                    </div>
                  </div>
                )}
                {activeView === 'roadmap' && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-lg font-medium">Roadmap</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Project roadmap and planning - Coming soon
                      </p>
                    </div>
                  </div>
                )}
                {activeView === 'context' && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-lg font-medium">Context</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Project context and documentation - Coming soon
                      </p>
                    </div>
                  </div>
                )}
                {activeView === 'agent-tools' && (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <h2 className="text-lg font-medium">Agent Tools</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Configure and manage agent tools - Coming soon
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h2 className="text-lg font-medium">Welcome to Auto-Build</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a project from the sidebar to start building with AI
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Task detail panel */}
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} onClose={handleCloseTaskDetail} />
        )}

        {/* Dialogs */}
        {selectedProjectId && (
          <TaskCreationWizard
            projectId={selectedProjectId}
            open={isNewTaskDialogOpen}
            onOpenChange={setIsNewTaskDialogOpen}
          />
        )}

        <AppSettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
        />

        {selectedProject && (
          <ProjectSettings
            project={selectedProject}
            open={isProjectSettingsOpen}
            onOpenChange={setIsProjectSettingsOpen}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
