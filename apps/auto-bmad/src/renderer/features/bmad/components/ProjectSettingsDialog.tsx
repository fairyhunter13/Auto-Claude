/**
 * Project Settings Dialog
 * 
 * Dialog for configuring BMAD project settings.
 * Updates _bmad/bmm/config.yaml with user preferences.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { AlertCircle, Loader2, Folder, Save } from 'lucide-react';
import { useBmadProjectStore, type BmadProject, type BmadSettings } from '../stores/project-store';

interface ProjectSettingsDialogProps {
  project: BmadProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectSettingsDialog({ project, open, onOpenChange }: ProjectSettingsDialogProps) {
  const { settings, updateSettings, updateProject } = useBmadProjectStore();
  
  // Local state for editing
  const [projectName, setProjectName] = useState('');
  const [opencodePath, setOpencodePath] = useState('');
  const [communicationLanguage, setCommunicationLanguage] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when dialog opens or project changes
  useEffect(() => {
    if (project && open) {
      setProjectName(project.name);
      setOpencodePath(settings.opencodePath || '');
      setCommunicationLanguage(settings.defaultCommunicationLanguage || 'English');
      setError(null);
    }
  }, [project, open, settings]);

  // Handle close
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Browse for OpenCode CLI
  const handleBrowseOpenCode = useCallback(async () => {
    try {
      const result = await window.electronAPI.bmad.selectFolder();
      if (result.success && !result.data.canceled && result.data.path) {
        setOpencodePath(result.data.path);
      }
    } catch (err) {
      console.error('[ProjectSettingsDialog] Failed to select folder:', err);
    }
  }, []);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!project) return;

    setIsSaving(true);
    setError(null);

    try {
      // Update project name if changed
      if (projectName !== project.name) {
        await updateProject(project.id, { name: projectName });
      }

      // Update global settings
      const newSettings: Partial<BmadSettings> = {};
      if (opencodePath !== settings.opencodePath) {
        newSettings.opencodePath = opencodePath;
      }
      if (communicationLanguage !== settings.defaultCommunicationLanguage) {
        newSettings.defaultCommunicationLanguage = communicationLanguage;
      }

      if (Object.keys(newSettings).length > 0) {
        await updateSettings(newSettings);
      }

      // TODO: Also update project-level config.yaml via IPC
      // await window.electronAPI.bmad.updateProjectConfig(project.path, {
      //   communication_language: communicationLanguage,
      // });

      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  }, [project, projectName, opencodePath, communicationLanguage, settings, updateProject, updateSettings, handleOpenChange]);

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Project Settings</DialogTitle>
          <DialogDescription>
            Configure settings for {project.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 pt-4">
            {/* Project Name */}
            <div className="grid gap-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                disabled={isSaving}
              />
            </div>

            {/* Project Path (read-only) */}
            <div className="grid gap-2">
              <Label htmlFor="projectPath">Project Path</Label>
              <Input
                id="projectPath"
                value={project.path}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Communication Language */}
            <div className="grid gap-2">
              <Label htmlFor="language">Communication Language</Label>
              <Select
                value={communicationLanguage}
                onValueChange={setCommunicationLanguage}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Indonesian">Indonesian</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                  <SelectItem value="Japanese">Japanese</SelectItem>
                  <SelectItem value="Chinese">Chinese</SelectItem>
                  <SelectItem value="Korean">Korean</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Language used for agent communication and document output.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 pt-4">
            {/* OpenCode CLI Path */}
            <div className="grid gap-2">
              <Label htmlFor="opencodePath">OpenCode CLI Path</Label>
              <div className="flex gap-2">
                <Input
                  id="opencodePath"
                  value={opencodePath}
                  onChange={(e) => setOpencodePath(e.target.value)}
                  placeholder="Leave empty to use PATH"
                  className="flex-1"
                  disabled={isSaving}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBrowseOpenCode}
                  disabled={isSaving}
                >
                  <Folder className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Path to the OpenCode CLI executable. Leave empty to use the default from your system PATH.
              </p>
            </div>

            {/* Output Folder (read-only info) */}
            <div className="grid gap-2">
              <Label>Output Folder</Label>
              <Input
                value="_bmad-output/"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Planning and implementation artifacts are stored in this folder.
              </p>
            </div>

            {/* Project Type (read-only) */}
            <div className="grid gap-2">
              <Label>Project Type</Label>
              <Input
                value={project.projectType === 'greenfield' ? 'Greenfield (new project)' : 'Brownfield (existing codebase)'}
                disabled
                className="bg-muted capitalize"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
