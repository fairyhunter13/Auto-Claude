/**
 * Import Project Dialog
 * 
 * Dialog for importing an existing BMAD project.
 * Validates that the folder contains _bmad/ directory.
 */

import { useState, useCallback } from 'react';
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
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Folder, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useBmadProjectStore, type BmadProjectValidation } from '../stores/project-store';

interface ImportProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProjectDialog({ open, onOpenChange }: ImportProjectDialogProps) {
  const { importProject, isLoading, error, setError } = useBmadProjectStore();

  // Form state
  const [folderPath, setFolderPath] = useState('');
  const [validation, setValidation] = useState<BmadProjectValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setFolderPath('');
      setValidation(null);
      setError(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange, setError]);

  // Validate folder
  const validateFolder = useCallback(async (path: string) => {
    if (!path) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const result = await window.electronAPI.bmad.validateProject(path);
      if (result.success) {
        setValidation(result.data);
      } else {
        setValidation(null);
        setError(result.error.message);
      }
    } catch (err) {
      console.error('[ImportProjectDialog] Failed to validate folder:', err);
      setValidation(null);
    } finally {
      setIsValidating(false);
    }
  }, [setError]);

  // Select folder
  const handleSelectFolder = useCallback(async () => {
    try {
      const result = await window.electronAPI.bmad.selectFolder();
      if (result.success && !result.data.canceled && result.data.path) {
        setFolderPath(result.data.path);
        setError(null);
        await validateFolder(result.data.path);
      }
    } catch (err) {
      console.error('[ImportProjectDialog] Failed to select folder:', err);
    }
  }, [validateFolder, setError]);

  // Handle manual path input
  const handlePathChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const path = e.target.value;
    setFolderPath(path);
    setValidation(null);
  }, []);

  // Validate on blur
  const handlePathBlur = useCallback(() => {
    if (folderPath) {
      validateFolder(folderPath);
    }
  }, [folderPath, validateFolder]);

  // Import project
  const handleImport = useCallback(async () => {
    if (!folderPath || !validation?.valid) {
      return;
    }

    const project = await importProject(folderPath);
    if (project) {
      handleOpenChange(false);
    }
  }, [folderPath, validation, importProject, handleOpenChange]);

  const canImport = folderPath.length > 0 && validation?.valid && !isValidating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Existing BMAD Project</DialogTitle>
          <DialogDescription>
            Select a folder containing an existing BMAD project. The folder must have a _bmad/ directory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project Folder */}
          <div className="grid gap-2">
            <Label htmlFor="folder">Project Folder</Label>
            <div className="flex gap-2">
              <Input
                id="folder"
                value={folderPath}
                onChange={handlePathChange}
                onBlur={handlePathBlur}
                placeholder="/path/to/existing/project"
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
          </div>

          {/* Validation Status */}
          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating project structure...
            </div>
          )}

          {validation && !isValidating && (
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium">Project Validation</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  {validation.hasBmadDir ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={validation.hasBmadDir ? '' : 'text-red-500'}>
                    _bmad/ directory {validation.hasBmadDir ? 'found' : 'missing'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {validation.hasBmadOutput ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span className="text-muted-foreground">
                    _bmad-output/ directory {validation.hasBmadOutput ? 'found' : 'will be created'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {validation.hasConfigFile ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span className="text-muted-foreground">
                    config.yaml {validation.hasConfigFile ? 'found' : 'not found'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {validation.hasStatusFile ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border-2 border-muted" />
                  )}
                  <span className="text-muted-foreground">
                    Workflow status {validation.hasStatusFile ? 'found' : 'will be initialized'}
                  </span>
                </li>
              </ul>

              {validation.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-500">
                  {validation.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}

              {validation.valid && (
                <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                  This is a valid BMAD project and can be imported.
                </p>
              )}
            </div>
          )}

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
            onClick={handleImport}
            disabled={!canImport || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Project'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
