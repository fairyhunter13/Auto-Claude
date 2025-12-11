import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Moon, Sun, Monitor } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Separator } from './ui/separator';
import { useSettingsStore, saveSettings, loadSettings } from '../stores/settings-store';
import { AVAILABLE_MODELS } from '../../shared/constants';
import type { AppSettings as AppSettingsType } from '../../shared/types';

interface AppSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const currentSettings = useSettingsStore((state) => state.settings);
  const [settings, setSettings] = useState<AppSettingsType>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    window.electronAPI.getAppVersion().then(setVersion);
  }, []);

  // Sync with store
  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const success = await saveSettings(settings);
      if (success) {
        // Apply theme immediately
        applyTheme(settings.theme);
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

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
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

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Settings
          </DialogTitle>
          <DialogDescription>
            Configure global application settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Appearance</h3>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') =>
                  setSettings({ ...settings, theme: value })
                }
              >
                <SelectTrigger id="theme">
                  <SelectValue>
                    <span className="flex items-center gap-2">
                      {getThemeIcon(settings.theme)}
                      {settings.theme === 'system'
                        ? 'System'
                        : settings.theme === 'dark'
                        ? 'Dark'
                        : 'Light'}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </span>
                  </SelectItem>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Default Agent Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Default Agent Settings</h3>

            <div className="space-y-2">
              <Label htmlFor="defaultModel">Default Model</Label>
              <Select
                value={settings.defaultModel}
                onValueChange={(value) =>
                  setSettings({ ...settings, defaultModel: value })
                }
              >
                <SelectTrigger id="defaultModel">
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

            <div className="space-y-2">
              <Label htmlFor="defaultParallelism">Default Parallelism</Label>
              <Input
                id="defaultParallelism"
                type="number"
                min={1}
                max={8}
                value={settings.defaultParallelism}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultParallelism: parseInt(e.target.value) || 1
                  })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Paths */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Paths</h3>

            <div className="space-y-2">
              <Label htmlFor="pythonPath">Python Path</Label>
              <Input
                id="pythonPath"
                placeholder="python3 (default)"
                value={settings.pythonPath || ''}
                onChange={(e) =>
                  setSettings({ ...settings, pythonPath: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Path to Python executable (leave empty for default)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="autoBuildPath">Auto-Build Path</Label>
              <Input
                id="autoBuildPath"
                placeholder="auto-build (default)"
                value={settings.autoBuildPath || ''}
                onChange={(e) =>
                  setSettings({ ...settings, autoBuildPath: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Relative path to auto-build directory in projects
              </p>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Default Notifications</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>On Task Complete</Label>
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
                <Label>On Task Failed</Label>
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
                <Label>On Review Needed</Label>
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
                <Label>Sound</Label>
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
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Version */}
          {version && (
            <div className="text-xs text-muted-foreground text-center">
              Version {version}
            </div>
          )}
        </div>

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
