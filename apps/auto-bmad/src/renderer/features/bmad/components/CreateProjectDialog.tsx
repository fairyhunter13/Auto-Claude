/**
 * Create Project Dialog
 * 
 * Dialog for creating a new BMAD project.
 * Collects project name, type, and folder location.
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Folder, AlertCircle, Loader2 } from 'lucide-react';
import { useBmadProjectStore, type BmadProjectType, type CreateProjectOptions } from '../stores/project-store';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const { createProject, isLoading, error, setError } = useBmadProjectStore();

  // Form state
  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<BmadProjectType>('greenfield');
  const [folderPath, setFolderPath] = useState('');
  const [communicationLanguage, setCommunicationLanguage] = useState('English');
  const [userSkillLevel, setUserSkillLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setName('');
      setProjectType('greenfield');
      setFolderPath('');
      setCommunicationLanguage('English');
      setUserSkillLevel('intermediate');
      setValidationMessage(null);
      setError(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange, setError]);

  // Select folder
  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI.bmad.selectFolder();
      if (result.success && !result.data.canceled && result.data.path) {
        setFolderPath(result.data.path);
        setValidationMessage(null);
        
        // Validate the folder
        const validation = await window.electronAPI.bmad.validateProject(result.data.path);
        if (validation.success) {
          if (!validation.data.hasBmadDir) {
            setValidationMessage('Note: This folder does not have _bmad/ directory. You need to copy BMAD framework files first.');
          } else {
            setValidationMessage(null);
          }
        }
      }
    } catch (err) {
      console.error('[CreateProjectDialog] Failed to select folder:', err);
    }
  }, []);

  // Create project
  const handleCreate = useCallback(async () => {
    if (!name.trim() || !folderPath) {
      setError('Please fill in all required fields');
      return;
    }

    const options: CreateProjectOptions = {
      name: name.trim(),
      path: folderPath,
      projectType,
      communicationLanguage,
      userSkillLevel,
    };

    const project = await createProject(options);
    if (project) {
      handleOpenChange(false);
    }
  }, [name, folderPath, projectType, communicationLanguage, userSkillLevel, createProject, handleOpenChange, setError]);

  const isValid = name.trim().length > 0 && folderPath.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New BMAD Project</DialogTitle>
          <DialogDescription>
            Set up a new project using the BMAD methodology. The folder must contain the _bmad/ directory with BMAD framework files.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My BMAD Project"
              disabled={isLoading}
            />
          </div>

          {/* Project Folder */}
          <div className="grid gap-2">
            <Label htmlFor="folder">Project Folder *</Label>
            <div className="flex gap-2">
              <Input
                id="folder"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/path/to/project"
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectFolder}
                disabled={isLoading}
              >
                <Folder className="h-4 w-4" />
              </Button>
            </div>
            {validationMessage && (
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                {validationMessage}
              </p>
            )}
          </div>

          {/* Project Type */}
          <div className="grid gap-2">
            <Label>Project Type</Label>
            <RadioGroup
              value={projectType}
              onValueChange={(value) => setProjectType(value as BmadProjectType)}
              className="flex gap-4"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="greenfield" id="greenfield" />
                <Label htmlFor="greenfield" className="font-normal cursor-pointer">
                  Greenfield (new project)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="brownfield" id="brownfield" />
                <Label htmlFor="brownfield" className="font-normal cursor-pointer">
                  Brownfield (existing codebase)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Communication Language */}
          <div className="grid gap-2">
            <Label htmlFor="language">Communication Language</Label>
            <Select
              value={communicationLanguage}
              onValueChange={setCommunicationLanguage}
              disabled={isLoading}
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
          </div>

          {/* User Skill Level */}
          <div className="grid gap-2">
            <Label htmlFor="skill">User Skill Level</Label>
            <Select
              value={userSkillLevel}
              onValueChange={(value) => setUserSkillLevel(value as typeof userSkillLevel)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select skill level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This affects how detailed the AI agents' explanations will be.
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
