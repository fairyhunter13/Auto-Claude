/**
 * Project File Browser
 * 
 * Tree view of project files with emphasis on _bmad-output/ folder.
 * Allows opening files in external editor and shows git status.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  RefreshCw,
  ExternalLink,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BmadProject } from '../stores/project-store';

// File type icons
const FILE_ICONS: Record<string, typeof File> = {
  '.md': FileText,
  '.yaml': FileCode,
  '.yml': FileCode,
  '.json': FileCode,
  '.ts': FileCode,
  '.tsx': FileCode,
  '.js': FileCode,
  '.jsx': FileCode,
};

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
}

interface ProjectFileBrowserProps {
  project: BmadProject;
  className?: string;
  onFileSelect?: (filePath: string) => void;
}

export function ProjectFileBrowser({ project, className, onFileSelect }: ProjectFileBrowserProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Important paths to highlight
  const importantPaths = useMemo(() => new Set([
    '_bmad',
    '_bmad-output',
    '_bmad-output/planning-artifacts',
    '_bmad-output/implementation-artifacts',
  ]), []);

  // Load directory contents
  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const result = await window.electronAPI.listDirectory(dirPath);
      if (result.success && result.data) {
        return result.data.map(node => ({
          name: node.name,
          path: node.path,
          isDirectory: node.isDirectory,
        }));
      }
    } catch (err) {
      console.error('[ProjectFileBrowser] Failed to load directory:', dirPath, err);
    }
    return [];
  }, []);

  // Initial load
  useEffect(() => {
    const loadRoot = async () => {
      setIsLoading(true);
      try {
        const rootFiles = await loadDirectory(project.path);
        setFiles(rootFiles);
        
        // Auto-expand important directories
        const toExpand = new Set<string>();
        rootFiles.forEach(f => {
          if (f.isDirectory && importantPaths.has(f.name)) {
            toExpand.add(f.path);
          }
        });
        setExpandedPaths(toExpand);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRoot();
  }, [project.path, loadDirectory, importantPaths]);

  // Toggle directory expansion
  const toggleExpand = useCallback(async (node: FileNode) => {
    if (!node.isDirectory) return;

    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(node.path)) {
        next.delete(node.path);
      } else {
        next.add(node.path);
      }
      return next;
    });

    // Load children if not already loaded
    if (!node.children) {
      const children = await loadDirectory(node.path);
      setFiles(prev => updateNodeChildren(prev, node.path, children));
    }
  }, [loadDirectory]);

  // Update node children in tree
  const updateNodeChildren = (nodes: FileNode[], targetPath: string, children: FileNode[]): FileNode[] => {
    return nodes.map(node => {
      if (node.path === targetPath) {
        return { ...node, children };
      }
      if (node.children) {
        return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
      }
      return node;
    });
  };

  // Handle file click
  const handleFileClick = useCallback((node: FileNode) => {
    setSelectedPath(node.path);
    if (!node.isDirectory && onFileSelect) {
      onFileSelect(node.path);
    }
  }, [onFileSelect]);

  // Open in external editor
  const handleOpenExternal = useCallback((filePath: string) => {
    window.electronAPI?.openPath?.(filePath);
  }, []);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setExpandedPaths(new Set());
    try {
      const rootFiles = await loadDirectory(project.path);
      setFiles(rootFiles);
    } finally {
      setIsLoading(false);
    }
  }, [project.path, loadDirectory]);

  // Get relative path from project root
  const getRelativePath = useCallback((fullPath: string) => {
    if (fullPath.startsWith(project.path)) {
      return fullPath.slice(project.path.length + 1);
    }
    return fullPath;
  }, [project.path]);

  // Check if path is important
  const isImportantPath = useCallback((fullPath: string) => {
    const rel = getRelativePath(fullPath);
    return importantPaths.has(rel) || rel.startsWith('_bmad-output/');
  }, [getRelativePath, importantPaths]);

  // Render a file/folder node
  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;
    const relativePath = getRelativePath(node.path);
    const isImportant = isImportantPath(node.path);
    
    // Get file icon
    const ext = node.name.substring(node.name.lastIndexOf('.'));
    const FileIcon = node.isDirectory 
      ? (isExpanded ? FolderOpen : Folder)
      : (FILE_ICONS[ext] || File);

    return (
      <div key={node.path}>
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm',
            'hover:bg-muted/50',
            isSelected && 'bg-muted',
            isImportant && 'text-primary font-medium'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.isDirectory) {
              toggleExpand(node);
            }
            handleFileClick(node);
          }}
          onDoubleClick={() => {
            if (!node.isDirectory) {
              handleOpenExternal(node.path);
            }
          }}
        >
          {/* Expand/collapse icon for directories */}
          {node.isDirectory ? (
            <span className="w-4 h-4 flex items-center justify-center">
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
          ) : (
            <span className="w-4" />
          )}

          {/* File/folder icon */}
          <FileIcon className={cn(
            'h-4 w-4 shrink-0',
            node.isDirectory && isImportant && 'text-primary',
            !node.isDirectory && 'text-muted-foreground'
          )} />

          {/* Name */}
          <span className="truncate flex-1">{node.name}</span>

          {/* Important indicator */}
          {isImportant && relativePath === '_bmad-output' && (
            <Star className="h-3 w-3 text-yellow-500 shrink-0" />
          )}
        </div>

        {/* Children */}
        {node.isDirectory && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Sort files: directories first, then alphabetically
  const sortedFiles = useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1;
      }
      // Put _bmad directories at top
      const aIsBmad = a.name.startsWith('_bmad');
      const bIsBmad = b.name.startsWith('_bmad');
      if (aIsBmad !== bIsBmad) {
        return aIsBmad ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [files]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="font-medium text-sm">Files</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* File tree */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {sortedFiles.map(node => renderNode(node))}
        </div>
      </ScrollArea>

      {/* Footer with selected file info */}
      {selectedPath && (
        <div className="border-t px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate flex-1">
              {getRelativePath(selectedPath)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => handleOpenExternal(selectedPath)}
              title="Open in external editor"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
