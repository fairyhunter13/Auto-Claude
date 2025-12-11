import { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileCode,
  Terminal
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { cn, calculateProgress, formatRelativeTime } from '../lib/utils';
import { CHUNK_STATUS_COLORS, TASK_STATUS_LABELS } from '../../shared/constants';
import { startTask, stopTask, submitReview } from '../stores/task-store';
import type { Task, Chunk } from '../../shared/types';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
}

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const logsEndRef = useRef<HTMLDivElement>(null);

  const progress = calculateProgress(task.chunks);
  const isRunning = task.status === 'in_progress';
  const needsReview = task.status === 'human_review';

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (activeTab === 'logs' && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [task.logs, activeTab]);

  const handleStartStop = () => {
    if (isRunning) {
      stopTask(task.id);
    } else {
      startTask(task.id);
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    await submitReview(task.id, true);
    setIsSubmitting(false);
    onClose();
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      return;
    }
    setIsSubmitting(true);
    await submitReview(task.id, false, feedback);
    setIsSubmitting(false);
    setFeedback('');
  };

  const getChunkStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex h-full w-96 flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-semibold text-lg truncate">{task.title}</h2>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {task.specId}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="flex border-b px-4">
          <TabsTrigger
            value="overview"
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              activeTab === 'overview'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="chunks"
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              activeTab === 'chunks'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Chunks ({task.chunks.length})
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              activeTab === 'logs'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Description */}
              {task.description && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">{task.description}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatRelativeTime(task.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatRelativeTime(task.updatedAt)}</span>
                </div>
              </div>

              {/* Human Review Section */}
              {needsReview && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
                  <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    Review Required
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Please review the changes and provide feedback if needed.
                  </p>
                  <Textarea
                    placeholder="Enter feedback for rejection (optional for approval)..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="mb-3"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      onClick={handleApprove}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={isSubmitting || !feedback.trim()}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Chunks Tab */}
        <TabsContent value="chunks" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {task.chunks.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No chunks defined yet
                </div>
              ) : (
                task.chunks.map((chunk, index) => (
                  <div
                    key={chunk.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      chunk.status === 'in_progress' && 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20',
                      chunk.status === 'completed' && 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20',
                      chunk.status === 'failed' && 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {getChunkStatusIcon(chunk.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium truncate">
                            {chunk.id}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {chunk.description}
                        </p>
                        {chunk.files && chunk.files.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {chunk.files.map((file) => (
                              <Badge
                                key={file}
                                variant="secondary"
                                className="text-xs"
                              >
                                <FileCode className="mr-1 h-3 w-3" />
                                {file.split('/').pop()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              {task.logs && task.logs.length > 0 ? (
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {task.logs.join('')}
                  <div ref={logsEndRef} />
                </pre>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <Terminal className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No logs yet</p>
                  <p className="text-xs mt-1">Logs will appear here when the task runs</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Actions */}
      <div className="p-4">
        {(task.status === 'backlog' || task.status === 'in_progress') && (
          <Button
            className="w-full"
            variant={isRunning ? 'destructive' : 'default'}
            onClick={handleStartStop}
          >
            {isRunning ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Task
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Task
              </>
            )}
          </Button>
        )}
        {task.status === 'done' && (
          <div className="text-center text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="mx-auto mb-1 h-6 w-6" />
            Task completed successfully
          </div>
        )}
      </div>
    </div>
  );
}
