import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { ScrollArea } from './ui/scroll-area';
import { TaskCard } from './TaskCard';
import { SortableTaskCard } from './SortableTaskCard';
import { TASK_STATUS_COLUMNS, TASK_STATUS_LABELS } from '../../shared/constants';
import { cn } from '../lib/utils';
import { useTaskStore } from '../stores/task-store';
import type { Task, TaskStatus } from '../../shared/types';

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

interface DroppableColumnProps {
  status: TaskStatus;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  isOver: boolean;
}

function DroppableColumn({ status, tasks, onTaskClick, isOver }: DroppableColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status
  });

  const taskIds = tasks.map((t) => t.id);

  const getColumnColor = (): string => {
    return 'bg-secondary/20 backdrop-blur-sm border border-white/5';
  };

  const getColumnBorderColor = (): string => {
    switch (status) {
      case 'backlog':
        return 'border-t-muted-foreground/30';
      case 'in_progress':
        return 'border-t-blue-500/70 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.2)]';
      case 'ai_review':
        return 'border-t-amber-500/70 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.2)]';
      case 'human_review':
        return 'border-t-purple-500/70 shadow-[inset_0_1px_0_0_rgba(168,85,247,0.2)]';
      case 'done':
        return 'border-t-green-500/70 shadow-[inset_0_1px_0_0_rgba(34,197,94,0.2)]';
      default:
        return 'border-t-gray-500/30';
    }
  };

  return (
    <div
      className={cn(
        'flex w-72 flex-shrink-0 flex-col rounded-lg border-t-4 transition-colors',
        getColumnColor(),
        getColumnBorderColor(),
        isOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between p-3">
        <h2 className="font-semibold text-sm">
          {TASK_STATUS_LABELS[status]}
        </h2>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-xs font-medium">
          {tasks.length}
        </span>
      </div>

      {/* Droppable task list */}
      <div ref={setNodeRef} className="flex-1 min-h-0">
        <ScrollArea className="h-full px-3 pb-3">
          <SortableContext
            items={taskIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[100px]">
              {tasks.length === 0 ? (
                <div
                  className={cn(
                    'rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground transition-colors',
                    isOver && 'border-primary/50 bg-primary/5'
                  )}
                >
                  {isOver ? 'Drop here' : 'No tasks'}
                </div>
              ) : (
                tasks.map((task) => (
                  <SortableTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onTaskClick }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8 // 8px movement required before drag starts
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      ai_review: [],
      human_review: [],
      done: []
    };

    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = over.id as string;

    // Check if over a column
    if (TASK_STATUS_COLUMNS.includes(overId as TaskStatus)) {
      setOverColumnId(overId);
      return;
    }

    // Check if over a task - get its column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      setOverColumnId(overTask.status);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumnId(null);

    if (!over) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    if (TASK_STATUS_COLUMNS.includes(overId as TaskStatus)) {
      const newStatus = overId as TaskStatus;
      const task = tasks.find((t) => t.id === activeTaskId);

      if (task && task.status !== newStatus) {
        updateTaskStatus(activeTaskId, newStatus);
      }
      return;
    }

    // Check if dropped on another task - move to that task's column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      const task = tasks.find((t) => t.id === activeTaskId);
      if (task && task.status !== overTask.status) {
        updateTaskStatus(activeTaskId, overTask.status);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {TASK_STATUS_COLUMNS.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={onTaskClick}
            isOver={overColumnId === status}
          />
        ))}
      </div>

      {/* Drag overlay - shows the card being dragged */}
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
