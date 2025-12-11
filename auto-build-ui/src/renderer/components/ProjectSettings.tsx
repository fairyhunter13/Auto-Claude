import { useState, useEffect } from 'react';
import { Settings2, Save, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Separator } from './ui/separator';
import { updateProjectSettings } from '../stores/project-store';
import { AVAILABLE_MODELS, MEMORY_BACKENDS } from '../../shared/constants';
import type { Project, ProjectSettings as ProjectSettingsType } from '../../shared/types';

interface ProjectSettingsProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettings({ project, open, onOpenChange }: ProjectSettingsProps) {
  const [settings, setSettings] = useState<ProjectSettingsType>(project.settings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset settings when project changes
  useEffect(() => {
    setSettings(project.settings);
  }, [project]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const success = await updateProjectSettings(project.id, settings);
      if (success) {
        onOpenChange(false);
      } else {
        setError('Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Project Settings
          </DialogTitle>
          <DialogDescription>
            Configure settings for {project.name}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="py-4 space-y-6">
            {/* Agent Settings */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Agent Configuration</h3>
              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Select
                  value={settings.model}
                  onValueChange={(value) => setSettings({ ...settings, model: value })}
                >
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-normal">Parallel Execution</Label>
                  <p className="text-xs text-muted-foreground">
                    Run multiple chunks simultaneously
                  </p>
                </div>
                <Switch
                  checked={settings.parallelEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, parallelEnabled: checked })
                  }
                />
              </div>
              {settings.parallelEnabled && (
                <div className="space-y-1.5">
                  <Label htmlFor="workers">Max Workers</Label>
                  <Input
                    id="workers"
                    type="number"
                    min={1}
                    max={8}
                    value={settings.maxWorkers}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxWorkers: parseInt(e.target.value) || 1
                      })
                    }
                  />
                </div>
              )}
            </section>

            <Separator />

            {/* Memory Settings */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Memory Backend</h3>
              <div className="space-y-1.5">
                <Label htmlFor="memoryBackend">Backend</Label>
                <Select
                  value={settings.memoryBackend}
                  onValueChange={(value: 'file' | 'graphiti') =>
                    setSettings({ ...settings, memoryBackend: value })
                  }
                >
                  <SelectTrigger id="memoryBackend">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_BACKENDS.map((backend) => (
                      <SelectItem key={backend.value} value={backend.value}>
                        {backend.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Separator />

            {/* Linear Integration */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Linear Integration</h3>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-normal">Sync to Linear</Label>
                  <p className="text-xs text-muted-foreground">
                    Create and update Linear issues
                  </p>
                </div>
                <Switch
                  checked={settings.linearSync}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, linearSync: checked })
                  }
                />
              </div>
              {settings.linearSync && (
                <div className="space-y-1.5">
                  <Label htmlFor="linearTeamId">Team ID</Label>
                  <Input
                    id="linearTeamId"
                    placeholder="Enter Linear team ID"
                    value={settings.linearTeamId || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, linearTeamId: e.target.value })
                    }
                  />
                </div>
              )}
            </section>

            <Separator />

            {/* Notifications */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">On Task Complete</Label>
                  <Switch
                    checked={settings.notifications.onTaskComplete}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          onTaskComplete: checked
                        }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">On Task Failed</Label>
                  <Switch
                    checked={settings.notifications.onTaskFailed}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          onTaskFailed: checked
                        }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">On Review Needed</Label>
                  <Switch
                    checked={settings.notifications.onReviewNeeded}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          onReviewNeeded: checked
                        }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal">Sound</Label>
                  <Switch
                    checked={settings.notifications.sound}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          sound: checked
                        }
                      })
                    }
                  />
                </div>
              </div>
            </section>

            {/* Error */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
