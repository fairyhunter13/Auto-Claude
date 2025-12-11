import { ScrollArea } from './ui/scroll-area';
import { TaskCard } from './TaskCard';
import { TASK_STATUS_COLUMNS, TASK_STATUS_LABELS } from '../../shared/constants';
import { cn } from '../lib/utils';
import type { Task, TaskStatus } from '../../shared/types';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks.filter((task) => task.status === status);
  };

  const getColumnColor = (status: TaskStatus): string => {
    switch (status) {
      case 'backlog':
        return 'bg-gray-100 dark:bg-gray-800/50';
      case 'in_progress':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'ai_review':
        return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'human_review':
        return 'bg-purple-50 dark:bg-purple-900/20';
      case 'done':
        return 'bg-green-50 dark:bg-green-900/20';
      default:
        return 'bg-gray-100 dark:bg-gray-800/50';
    }
  };

  const getColumnBorderColor = (status: TaskStatus): string => {
    switch (status) {
      case 'backlog':
        return 'border-gray-300 dark:border-gray-700';
      case 'in_progress':
        return 'border-blue-300 dark:border-blue-700';
      case 'ai_review':
        return 'border-yellow-300 dark:border-yellow-700';
      case 'human_review':
        return 'border-purple-300 dark:border-purple-700';
      case 'done':
        return 'border-green-300 dark:border-green-700';
      default:
        return 'border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      {TASK_STATUS_COLUMNS.map((status) => {
        const columnTasks = getTasksByStatus(status);

        return (
          <div
            key={status}
            className={cn(
              'flex w-72 flex-shrink-0 flex-col rounded-lg border-t-4',
              getColumnColor(status),
              getColumnBorderColor(status)
            )}
          >
            {/* Column header */}
            <div className="flex items-center justify-between p-3">
              <h2 className="font-semibold text-sm">
                {TASK_STATUS_LABELS[status]}
              </h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs font-medium">
                {columnTasks.length}
              </span>
            </div>

            {/* Task list */}
            <ScrollArea className="flex-1 px-3 pb-3">
              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                    No tasks
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
