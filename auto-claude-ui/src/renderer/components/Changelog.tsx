import { useEffect, useState } from 'react';
import {
  FileText,
  RefreshCw,
  Copy,
  Save,
  AlertCircle,
  CheckCircle,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible';
import { useProjectStore } from '../stores/project-store';
import {
  useChangelogStore,
  loadChangelogData,
  generateChangelog,
  saveChangelog,
  copyChangelogToClipboard
} from '../stores/changelog-store';
import {
  CHANGELOG_FORMAT_LABELS,
  CHANGELOG_FORMAT_DESCRIPTIONS,
  CHANGELOG_AUDIENCE_LABELS,
  CHANGELOG_AUDIENCE_DESCRIPTIONS,
  CHANGELOG_STAGE_LABELS
} from '../../shared/constants';
import type {
  ChangelogFormat,
  ChangelogAudience,
  ChangelogTask
} from '../../shared/types';
import { cn } from '../lib/utils';

export function Changelog() {
  const selectedProjectId = useProjectStore((state) => state.selectedProjectId);

  const doneTasks = useChangelogStore((state) => state.doneTasks);
  const selectedTaskIds = useChangelogStore((state) => state.selectedTaskIds);
  const existingChangelog = useChangelogStore((state) => state.existingChangelog);
  const version = useChangelogStore((state) => state.version);
  const date = useChangelogStore((state) => state.date);
  const format = useChangelogStore((state) => state.format);
  const audience = useChangelogStore((state) => state.audience);
  const customInstructions = useChangelogStore((state) => state.customInstructions);
  const generationProgress = useChangelogStore((state) => state.generationProgress);
  const generatedChangelog = useChangelogStore((state) => state.generatedChangelog);
  const isGenerating = useChangelogStore((state) => state.isGenerating);
  const error = useChangelogStore((state) => state.error);

  const toggleTaskSelection = useChangelogStore((state) => state.toggleTaskSelection);
  const selectAllTasks = useChangelogStore((state) => state.selectAllTasks);
  const deselectAllTasks = useChangelogStore((state) => state.deselectAllTasks);
  const setVersion = useChangelogStore((state) => state.setVersion);
  const setDate = useChangelogStore((state) => state.setDate);
  const setFormat = useChangelogStore((state) => state.setFormat);
  const setAudience = useChangelogStore((state) => state.setAudience);
  const setCustomInstructions = useChangelogStore((state) => state.setCustomInstructions);
  const updateGeneratedChangelog = useChangelogStore((state) => state.updateGeneratedChangelog);
  const setError = useChangelogStore((state) => state.setError);
  const setIsGenerating = useChangelogStore((state) => state.setIsGenerating);
  const setGenerationProgress = useChangelogStore((state) => state.setGenerationProgress);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Load data when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadChangelogData(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Set up event listeners for generation
  useEffect(() => {
    const cleanupProgress = window.electronAPI.onChangelogGenerationProgress(
      (projectId, progress) => {
        if (projectId === selectedProjectId) {
          setGenerationProgress(progress);
        }
      }
    );

    const cleanupComplete = window.electronAPI.onChangelogGenerationComplete(
      (projectId, result) => {
        if (projectId === selectedProjectId) {
          setIsGenerating(false);
          if (result.success) {
            updateGeneratedChangelog(result.changelog);
            setGenerationProgress({
              stage: 'complete',
              progress: 100,
              message: 'Changelog generated successfully!'
            });
          } else {
            setError(result.error || 'Generation failed');
          }
        }
      }
    );

    const cleanupError = window.electronAPI.onChangelogGenerationError(
      (projectId, errorMsg) => {
        if (projectId === selectedProjectId) {
          setIsGenerating(false);
          setError(errorMsg);
          setGenerationProgress({
            stage: 'error',
            progress: 0,
            message: errorMsg,
            error: errorMsg
          });
        }
      }
    );

    return () => {
      cleanupProgress();
      cleanupComplete();
      cleanupError();
    };
  }, [selectedProjectId]);

  const handleGenerate = () => {
    if (selectedProjectId) {
      generateChangelog(selectedProjectId);
    }
  };

  const handleSave = async () => {
    if (selectedProjectId) {
      const success = await saveChangelog(selectedProjectId, 'prepend');
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    }
  };

  const handleCopy = () => {
    const success = copyChangelogToClipboard();
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const canGenerate = selectedTaskIds.length > 0 && !isGenerating;
  const canSave = generatedChangelog.length > 0 && !isGenerating;

  if (!selectedProjectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No Project Selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Select a project from the sidebar to generate changelogs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Changelog Generator</h1>
            <p className="text-sm text-muted-foreground">
              Generate release notes from completed tasks
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedProjectId && loadChangelogData(selectedProjectId)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Configuration */}
          <div className="w-96 flex-shrink-0 border-r border-border overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Version & Date */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Release Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="version">Version</Label>
                      <Input
                        id="version"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                  </div>
                  {existingChangelog?.lastVersion && (
                    <p className="text-xs text-muted-foreground">
                      Previous version: {existingChangelog.lastVersion}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Format & Audience */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Output Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select
                      value={format}
                      onValueChange={(value) => setFormat(value as ChangelogFormat)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANGELOG_FORMAT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div>
                              <div>{label}</div>
                              <div className="text-xs text-muted-foreground">
                                {CHANGELOG_FORMAT_DESCRIPTIONS[value]}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Audience</Label>
                    <Select
                      value={audience}
                      onValueChange={(value) => setAudience(value as ChangelogAudience)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANGELOG_AUDIENCE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div>
                              <div>{label}</div>
                              <div className="text-xs text-muted-foreground">
                                {CHANGELOG_AUDIENCE_DESCRIPTIONS[value]}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Task Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      Tasks to Include ({selectedTaskIds.length}/{doneTasks.length})
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllTasks}
                        className="h-7 px-2 text-xs"
                      >
                        All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAllTasks}
                        className="h-7 px-2 text-xs"
                      >
                        None
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    {doneTasks.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No completed tasks found.
                        <br />
                        Complete tasks in the Kanban board to include them here.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {doneTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            isSelected={selectedTaskIds.includes(task.id)}
                            onToggle={() => toggleTaskSelection(task.id)}
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    Advanced Options
                    {showAdvanced ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="instructions">Custom Instructions</Label>
                        <Textarea
                          id="instructions"
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          placeholder="Add any special instructions for the AI..."
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Optional. Guide the AI on tone, specific details to include, etc.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Generate Button */}
              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Changelog
                  </>
                )}
              </Button>

              {/* Progress */}
              {generationProgress && isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{CHANGELOG_STAGE_LABELS[generationProgress.stage]}</span>
                    <span>{generationProgress.progress}%</span>
                  </div>
                  <Progress value={generationProgress.progress} />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <span className="text-destructive">{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <h2 className="font-medium">Preview</h2>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      disabled={!canSave}
                    >
                      {copySuccess ? (
                        <CheckCircle className="mr-2 h-4 w-4 text-success" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy to clipboard</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSave}
                      disabled={!canSave}
                    >
                      {saveSuccess ? (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {saveSuccess ? 'Saved!' : 'Save to CHANGELOG.md'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Prepend to CHANGELOG.md in project root
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-hidden p-6">
              {generatedChangelog ? (
                <Textarea
                  className="h-full w-full resize-none font-mono text-sm"
                  value={generatedChangelog}
                  onChange={(e) => updateGeneratedChangelog(e.target.value)}
                  placeholder="Generated changelog will appear here..."
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
                    <p className="mt-4 text-sm text-muted-foreground">
                      Select tasks and click "Generate Changelog" to create release notes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

interface TaskItemProps {
  task: ChangelogTask;
  isSelected: boolean;
  onToggle: () => void;
}

function TaskItem({ task, isSelected, onToggle }: TaskItemProps) {
  const completedDate = new Date(task.completedAt).toLocaleDateString();

  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{task.title}</span>
          {task.hasSpecs && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Has Specs
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground truncate mt-1">
            {task.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Completed: {completedDate}
        </p>
      </div>
    </label>
  );
}
