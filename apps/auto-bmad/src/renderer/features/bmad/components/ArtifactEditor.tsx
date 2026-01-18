/**
 * ArtifactEditor Component
 * 
 * A markdown editor for editing BMAD artifacts with:
 * - Syntax-aware editing
 * - Live preview toggle
 * - Save/Cancel actions
 * - Unsaved changes warning
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Save,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { MarkdownPreview } from './MarkdownPreview';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ArtifactEditorProps {
  content: string;
  filePath: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ArtifactEditor({
  content: initialContent,
  filePath,
  onSave,
  onCancel,
  className,
}: ArtifactEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track if content has changed
  const hasChanges = content !== initialContent;

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !isSaving) {
          handleSave();
        }
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isSaving]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(content);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [content, onSave]);

  const handleCancel = useCallback(() => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onCancel();
    }
  }, [hasChanges, onCancel]);

  const handleDiscardChanges = useCallback(() => {
    setShowDiscardDialog(false);
    onCancel();
  }, [onCancel]);

  const handleRevert = useCallback(() => {
    setContent(initialContent);
    setSaveError(null);
  }, [initialContent]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Editing:</span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded">
            {filePath.split('/').pop()}
          </code>
          {hasChanges && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-500/30 bg-yellow-500/10">
              <AlertCircle className="h-3 w-3 mr-1" />
              Unsaved
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-1"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-4 w-4" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Preview
              </>
            )}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Revert button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevert}
            disabled={!hasChanges || isSaving}
            className="gap-1"
          >
            <Undo2 className="h-4 w-4" />
            Revert
          </Button>

          {/* Cancel button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isSaving}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>

          {/* Save button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="gap-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {saveError && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/30">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          // Split view: Editor + Preview
          <div className="flex h-full">
            {/* Editor */}
            <div className="flex-1 h-full border-r">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={cn(
                  'h-full resize-none rounded-none border-0 focus-visible:ring-0',
                  'font-mono text-sm leading-relaxed',
                  'p-4'
                )}
                placeholder="Enter markdown content..."
              />
            </div>

            {/* Preview */}
            <div className="flex-1 h-full overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <MarkdownPreview content={content} />
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          // Editor only
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={cn(
              'h-full resize-none rounded-none border-0 focus-visible:ring-0',
              'font-mono text-sm leading-relaxed',
              'p-4'
            )}
            placeholder="Enter markdown content..."
          />
        )}
      </div>

      {/* Discard changes dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
