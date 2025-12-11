import { useState, useEffect } from 'react';
import { TooltipProvider } from './components/ui/tooltip';
import { Sidebar } from './components/Sidebar';
import { KanbanBoard } from './components/KanbanBoard';
import { TaskDetailPanel } from './components/TaskDetailPanel';
import { TaskCreationWizard } from './components/TaskCreationWizard';
import { AppSettingsDialog } from './components/AppSettings';
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
        />

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="electron-drag flex h-14 items-center justify-between border-b px-6">
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
          </header>

          {/* Kanban board */}
          <main className="flex-1 overflow-hidden">
            {selectedProject ? (
              <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} />
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
      </div>
    </TooltipProvider>
  );
}
