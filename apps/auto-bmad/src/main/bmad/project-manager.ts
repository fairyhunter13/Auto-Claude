/**
 * BMAD Project Manager
 * 
 * Handles BMAD-specific project operations:
 * - Creating new BMAD projects
 * - Importing existing BMAD projects  
 * - Validating BMAD project structure
 * - Initializing bmm-workflow-status.yaml
 * - Language detection for TEA polyglot support
 */

import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import YAML from 'yaml';
import type { BmadConfig, BmadWorkflowStatus, DetectedLanguage } from './types';
import { BmadConfigSchema, BmadWorkflowStatusSchema } from './types';
import { getLanguageDetector } from './language-detector';

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Project Types
// ─────────────────────────────────────────────────────────────────────────────

export type BmadProjectType = 'greenfield' | 'brownfield';

export interface BmadProject {
  id: string;
  name: string;
  path: string;
  projectType: BmadProjectType;
  currentPhase: 'analysis' | 'planning' | 'solutioning' | 'implementation';
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt: Date;
  /** Detected languages in the project (for TEA polyglot support) */
  detectedLanguages?: DetectedLanguage[];
  /** Primary language of the project */
  primaryLanguage?: string;
}

export interface CreateProjectOptions {
  name: string;
  path: string;
  projectType: BmadProjectType;
  communicationLanguage?: string;
  userSkillLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ImportProjectOptions {
  path: string;
  /** Skip language detection during import */
  skipLanguageDetection?: boolean;
}

export interface BmadProjectValidation {
  valid: boolean;
  hasBmadDir: boolean;
  hasBmadOutput: boolean;
  hasStatusFile: boolean;
  hasConfigFile: boolean;
  errors: string[];
  /** Detected languages (if language detection was performed) */
  detectedLanguages?: DetectedLanguage[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Data Structure
// ─────────────────────────────────────────────────────────────────────────────

interface BmadStoreData {
  projects: BmadProject[];
  recentProjectIds: string[];
  settings: {
    opencodePath?: string;
    defaultCommunicationLanguage?: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BMAD Project Store (Singleton)
// ─────────────────────────────────────────────────────────────────────────────

export class BmadProjectManager {
  private storePath: string;
  private data: BmadStoreData;

  constructor() {
    const userDataPath = app.getPath('userData');
    const storeDir = path.join(userDataPath, 'bmad-store');

    if (!existsSync(storeDir)) {
      mkdirSync(storeDir, { recursive: true });
    }

    this.storePath = path.join(storeDir, 'bmad-projects.json');
    this.data = this.load();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────

  private load(): BmadStoreData {
    if (existsSync(this.storePath)) {
      try {
        const content = readFileSync(this.storePath, 'utf-8');
        const data = JSON.parse(content);
        // Convert date strings to Date objects
        data.projects = data.projects.map((p: BmadProject) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          lastOpenedAt: new Date(p.lastOpenedAt),
        }));
        return data;
      } catch (error) {
        console.error('[BmadProjectManager] Failed to load store:', error);
        return { projects: [], recentProjectIds: [], settings: {} };
      }
    }
    return { projects: [], recentProjectIds: [], settings: {} };
  }

  private save(): void {
    try {
      writeFileSync(this.storePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('[BmadProjectManager] Failed to save store:', error);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project Validation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate if a directory is a valid BMAD project
   */
  validateProject(projectPath: string): BmadProjectValidation {
    const validation: BmadProjectValidation = {
      valid: false,
      hasBmadDir: false,
      hasBmadOutput: false,
      hasStatusFile: false,
      hasConfigFile: false,
      errors: [],
    };

    // Check base directory exists
    if (!existsSync(projectPath)) {
      validation.errors.push('Project directory does not exist');
      return validation;
    }

    // Check for _bmad directory
    const bmadDir = path.join(projectPath, '_bmad');
    validation.hasBmadDir = existsSync(bmadDir);
    if (!validation.hasBmadDir) {
      validation.errors.push('Missing _bmad directory - not a BMAD project');
    }

    // Check for _bmad-output directory
    const bmadOutput = path.join(projectPath, '_bmad-output');
    validation.hasBmadOutput = existsSync(bmadOutput);

    // Check for bmm-workflow-status.yaml
    const statusFile = path.join(bmadOutput, 'planning-artifacts', 'bmm-workflow-status.yaml');
    validation.hasStatusFile = existsSync(statusFile);

    // Check for config.yaml
    const configFile = path.join(bmadDir, 'bmm', 'config.yaml');
    validation.hasConfigFile = existsSync(configFile);

    // A valid BMAD project must have _bmad directory (core requirement)
    validation.valid = validation.hasBmadDir;

    return validation;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Project Operations
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create a new BMAD project
   * 
   * This creates:
   * - _bmad-output/planning-artifacts/ directory
   * - _bmad-output/implementation-artifacts/ directory
   * - bmm-workflow-status.yaml with initial state
   * - Updates _bmad/bmm/config.yaml with project settings
   */
  async createProject(options: CreateProjectOptions): Promise<{ success: boolean; project?: BmadProject; error?: string }> {
    try {
      const { name, path: projectPath, projectType, communicationLanguage, userSkillLevel } = options;

      // Validate project path exists
      if (!existsSync(projectPath)) {
        return { success: false, error: 'Project directory does not exist' };
      }

      // Check if already a BMAD project
      const validation = this.validateProject(projectPath);
      if (!validation.hasBmadDir) {
        return { success: false, error: 'Directory must contain _bmad/ folder. Copy BMAD framework files first.' };
      }

      // Check if project already in our store
      const existingProject = this.data.projects.find(p => p.path === projectPath);
      if (existingProject) {
        // Update last opened and return existing
        existingProject.lastOpenedAt = new Date();
        existingProject.updatedAt = new Date();
        this.save();
        return { success: true, project: existingProject };
      }

      // Create _bmad-output directories
      const planningDir = path.join(projectPath, '_bmad-output', 'planning-artifacts');
      const implDir = path.join(projectPath, '_bmad-output', 'implementation-artifacts');

      if (!existsSync(planningDir)) {
        mkdirSync(planningDir, { recursive: true });
      }
      if (!existsSync(implDir)) {
        mkdirSync(implDir, { recursive: true });
      }

      // Initialize bmm-workflow-status.yaml
      const statusFilePath = path.join(planningDir, 'bmm-workflow-status.yaml');
      if (!existsSync(statusFilePath)) {
        const initialStatus: BmadWorkflowStatus = {
          project_name: name,
          project_type: projectType,
          current_phase: 'analysis',
          phases: {
            analysis: {
              status: 'pending',
              workflows: {
                'brainstorm-project': { status: 'pending' },
                'research': { status: 'pending' },
                'product-brief': { status: 'pending' },
              },
            },
            planning: {
              status: 'pending',
              workflows: {
                'prd': { status: 'pending' },
                'ux-design': { status: 'pending' },
              },
            },
            solutioning: {
              status: 'pending',
              workflows: {
                'architecture': { status: 'pending' },
                'epics': { status: 'pending' },
                'test-design': { status: 'pending' },
                'implementation-readiness': { status: 'pending' },
              },
            },
            implementation: {
              status: 'pending',
              workflows: {
                'sprint-planning': { status: 'pending' },
                'create-story': { status: 'pending' },
                'dev-story': { status: 'pending' },
                'code-review': { status: 'pending' },
              },
            },
          },
        };

        const statusYaml = YAML.stringify(initialStatus);
        writeFileSync(statusFilePath, statusYaml, 'utf-8');
      }

      // Update config.yaml with project settings
      const configPath = path.join(projectPath, '_bmad', 'bmm', 'config.yaml');
      if (existsSync(configPath)) {
        try {
          const configContent = readFileSync(configPath, 'utf-8');
          const config = YAML.parse(configContent) as Record<string, unknown>;
          
          // Update config values
          config.project_name = name;
          if (communicationLanguage) {
            config.communication_language = communicationLanguage;
            config.document_output_language = communicationLanguage;
          }
          if (userSkillLevel) {
            config.user_skill_level = userSkillLevel;
          }

          writeFileSync(configPath, YAML.stringify(config), 'utf-8');
        } catch (error) {
          console.warn('[BmadProjectManager] Failed to update config.yaml:', error);
          // Non-fatal - continue with project creation
        }
      }

      // Create project entry
      const now = new Date();
      const project: BmadProject = {
        id: uuidv4(),
        name,
        path: projectPath,
        projectType,
        currentPhase: 'analysis',
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };

      this.data.projects.push(project);
      this.addToRecent(project.id);
      this.save();

      console.log('[BmadProjectManager] Created project:', project.name);
      return { success: true, project };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BmadProjectManager] Failed to create project:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Import an existing BMAD project
   */
  async importProject(options: ImportProjectOptions): Promise<{ success: boolean; project?: BmadProject; error?: string }> {
    try {
      const { path: projectPath, skipLanguageDetection } = options;

      // Validate it's a BMAD project
      const validation = this.validateProject(projectPath);
      if (!validation.valid) {
        return { 
          success: false, 
          error: validation.errors.join('. ') || 'Not a valid BMAD project'
        };
      }

      // Check if already in store
      const existingProject = this.data.projects.find(p => p.path === projectPath);
      if (existingProject) {
        existingProject.lastOpenedAt = new Date();
        existingProject.updatedAt = new Date();
        this.addToRecent(existingProject.id);
        
        // Update language detection if not skipped
        if (!skipLanguageDetection && !existingProject.detectedLanguages) {
          const languages = await this.detectProjectLanguages(projectPath);
          if (languages.length > 0) {
            existingProject.detectedLanguages = languages;
            const sorted = [...languages].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
            existingProject.primaryLanguage = sorted[0]?.language;
          }
        }
        
        this.save();
        return { success: true, project: existingProject };
      }

      // Read project name from config or status file
      let projectName = path.basename(projectPath);
      let projectType: BmadProjectType = 'greenfield';
      let currentPhase: BmadProject['currentPhase'] = 'analysis';

      // Try to read from status file
      if (validation.hasStatusFile) {
        try {
          const statusPath = path.join(projectPath, '_bmad-output', 'planning-artifacts', 'bmm-workflow-status.yaml');
          const statusContent = readFileSync(statusPath, 'utf-8');
          const status = YAML.parse(statusContent);
          
          if (status.project_name) projectName = status.project_name;
          if (status.project_type) projectType = status.project_type;
          if (status.current_phase) currentPhase = status.current_phase;
        } catch (error) {
          console.warn('[BmadProjectManager] Failed to read status file:', error);
        }
      }

      // Fallback to config file
      if (validation.hasConfigFile && projectName === path.basename(projectPath)) {
        try {
          const configPath = path.join(projectPath, '_bmad', 'bmm', 'config.yaml');
          const configContent = readFileSync(configPath, 'utf-8');
          const config = YAML.parse(configContent);
          
          if (config.project_name) projectName = config.project_name;
        } catch (error) {
          console.warn('[BmadProjectManager] Failed to read config file:', error);
        }
      }

      // Detect languages in the project
      let detectedLanguages: DetectedLanguage[] | undefined;
      let primaryLanguage: string | undefined;
      
      if (!skipLanguageDetection) {
        detectedLanguages = await this.detectProjectLanguages(projectPath);
        if (detectedLanguages.length > 0) {
          const sorted = [...detectedLanguages].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
          primaryLanguage = sorted[0]?.language;
        }
      }

      // Create project entry
      const now = new Date();
      const project: BmadProject = {
        id: uuidv4(),
        name: projectName,
        path: projectPath,
        projectType,
        currentPhase,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        detectedLanguages,
        primaryLanguage,
      };

      this.data.projects.push(project);
      this.addToRecent(project.id);
      this.save();

      console.log('[BmadProjectManager] Imported project:', project.name, 
        primaryLanguage ? `(primary language: ${primaryLanguage})` : '');
      return { success: true, project };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[BmadProjectManager] Failed to import project:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Get all projects sorted by last opened
   */
  getProjects(): BmadProject[] {
    // Validate projects still exist on disk
    const validProjects = this.data.projects.filter(p => existsSync(p.path));
    
    if (validProjects.length !== this.data.projects.length) {
      this.data.projects = validProjects;
      this.data.recentProjectIds = this.data.recentProjectIds.filter(
        id => validProjects.some(p => p.id === id)
      );
      this.save();
    }

    // Sort by last opened (most recent first)
    return [...validProjects].sort((a, b) => 
      b.lastOpenedAt.getTime() - a.lastOpenedAt.getTime()
    );
  }

  /**
   * Get a project by ID
   */
  getProject(projectId: string): BmadProject | undefined {
    return this.data.projects.find(p => p.id === projectId);
  }

  /**
   * Get recent projects (up to 10)
   */
  getRecentProjects(): BmadProject[] {
    return this.data.recentProjectIds
      .map(id => this.data.projects.find(p => p.id === id))
      .filter((p): p is BmadProject => p !== undefined)
      .slice(0, 10);
  }

  /**
   * Update project's last opened time
   */
  openProject(projectId: string): BmadProject | undefined {
    const project = this.data.projects.find(p => p.id === projectId);
    if (project) {
      project.lastOpenedAt = new Date();
      this.addToRecent(projectId);
      this.save();
    }
    return project;
  }

  /**
   * Remove a project from the store (does not delete files)
   */
  removeProject(projectId: string): boolean {
    const index = this.data.projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      this.data.projects.splice(index, 1);
      this.data.recentProjectIds = this.data.recentProjectIds.filter(id => id !== projectId);
      this.save();
      return true;
    }
    return false;
  }

  /**
   * Update project properties
   */
  updateProject(projectId: string, updates: Partial<Pick<BmadProject, 'name' | 'currentPhase'>>): BmadProject | undefined {
    const project = this.data.projects.find(p => p.id === projectId);
    if (project) {
      if (updates.name) project.name = updates.name;
      if (updates.currentPhase) project.currentPhase = updates.currentPhase;
      project.updatedAt = new Date();
      this.save();
    }
    return project;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Language Detection
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Detect languages in a project
   */
  async detectProjectLanguages(projectPath: string): Promise<DetectedLanguage[]> {
    try {
      const detector = getLanguageDetector();
      const bmadPath = path.join(projectPath, '_bmad');
      
      // Initialize detector if needed
      if (!detector.isInitialized()) {
        await detector.initialize(bmadPath);
      }
      
      const result = await detector.detectLanguages(projectPath);
      return result.languages;
    } catch (error) {
      console.warn('[BmadProjectManager] Language detection failed:', error);
      return [];
    }
  }

  /**
   * Update a project's detected languages
   */
  async updateProjectLanguages(projectId: string): Promise<DetectedLanguage[]> {
    const project = this.data.projects.find(p => p.id === projectId);
    if (!project) {
      return [];
    }

    const languages = await this.detectProjectLanguages(project.path);
    
    if (languages.length > 0) {
      project.detectedLanguages = languages;
      // Set primary language to the one with highest confidence
      const sorted = [...languages].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
      project.primaryLanguage = sorted[0]?.language;
      project.updatedAt = new Date();
      this.save();
    }

    return languages;
  }

  /**
   * Get detected languages for a project
   */
  getProjectLanguages(projectId: string): DetectedLanguage[] {
    const project = this.data.projects.find(p => p.id === projectId);
    return project?.detectedLanguages || [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────────────────

  getSettings(): BmadStoreData['settings'] {
    return { ...this.data.settings };
  }

  updateSettings(settings: Partial<BmadStoreData['settings']>): void {
    this.data.settings = { ...this.data.settings, ...settings };
    this.save();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────────────────────────

  private addToRecent(projectId: string): void {
    // Remove if already in list
    this.data.recentProjectIds = this.data.recentProjectIds.filter(id => id !== projectId);
    // Add to front
    this.data.recentProjectIds.unshift(projectId);
    // Keep only 10
    this.data.recentProjectIds = this.data.recentProjectIds.slice(0, 10);
  }
}

// Singleton instance
export const bmadProjectManager = new BmadProjectManager();
