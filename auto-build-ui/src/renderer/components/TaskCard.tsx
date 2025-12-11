import { Play, Square, Clock } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { cn, calculateProgress, formatRelativeTime } from '../lib/utils';
import { TASK_STATUS_COLORS, CHUNK_STATUS_COLORS } from '../../shared/constants';
import { startTask, stopTask } from '../stores/task-store';
import type { Task } from '../../shared/types';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const progress = calculateProgress(task.chunks);
  const isRunning = task.status === 'in_progress';

  const handleStartStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      stopTask(task.id);
    } else {
      startTask(task.id);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'info';
      case 'ai_review':
        return 'warning';
      case 'human_review':
        return 'purple';
      case 'done':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'Running';
      case 'ai_review':
        return 'AI Review';
      case 'human_review':
        return 'Needs Review';
      case 'done':
        return 'Complete';
      default:
        return 'Pending';
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isRunning && 'ring-2 ring-blue-500/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
          <Badge variant={getStatusBadgeVariant(task.status)} className="shrink-0">
            {getStatusLabel(task.status)}
          </Badge>
        </div>

        {/* Description */}
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Progress section */}
        {task.chunks.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                Progress
              </span>
              <span className="text-xs font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />

            {/* Chunk indicators */}
            <div className="mt-2 flex flex-wrap gap-1">
              {task.chunks.slice(0, 8).map((chunk) => (
                <div
                  key={chunk.id}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    CHUNK_STATUS_COLORS[chunk.status]
                  )}
                  title={`${chunk.title}: ${chunk.status}`}
                />
              ))}
              {task.chunks.length > 8 && (
                <span className="text-xs text-muted-foreground">
                  +{task.chunks.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(task.updatedAt)}</span>
          </div>

          {/* Action button */}
          {(task.status === 'backlog' || task.status === 'in_progress') && (
            <Button
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
              className="h-6 px-2"
              onClick={handleStartStop}
            >
              {isRunning ? (
                <>
                  <Square className="mr-1 h-3 w-3" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-1 h-3 w-3" />
                  Start
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
