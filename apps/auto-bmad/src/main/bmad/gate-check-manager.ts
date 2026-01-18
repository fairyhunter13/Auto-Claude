/**
 * Gate Check Manager
 * 
 * Manages implementation-readiness gate checks before Phase 4.
 * Validates that planning is complete before development.
 * 
 * Stories: 8.1, 8.2, 8.3, 8.4
 */

import { existsSync } from 'fs';
import { readFile, stat } from 'fs/promises';
import { join, resolve } from 'path';
import { EventEmitter } from 'events';
import { 
  IpcResult, 
  successResult, 
  errorResult,
  BmadWorkflowStatus,
} from './types';
import { getStatusManager } from './status-manager';
import { debugLogger } from '../debug-logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GateCheckItem {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: 'pass' | 'fail' | 'warning' | 'skipped';
  message?: string;
  artifactPath?: string;
  details?: string[];
}

export interface GateCheckResult {
  passed: boolean;
  overridden: boolean;
  overriddenAt?: Date;
  overriddenBy?: string;
  checkedAt: Date;
  items: GateCheckItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
  blockingIssues: string[];
}

export interface GateCheckOverride {
  confirmation: string;
  reason?: string;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_CONFIRMATION = 'I UNDERSTAND';

const PLANNING_ARTIFACTS = {
  prd: {
    path: 'prd.md',
    name: 'Product Requirements Document',
    required: true,
  },
  architecture: {
    path: 'architecture.md',
    name: 'System Architecture',
    required: true,
  },
  epics: {
    paths: ['epics.md', 'epics/index.md'],
    name: 'Epics & Stories',
    required: true,
  },
  uxDesign: {
    path: 'ux-design.md',
    name: 'UX Design',
    required: false,
  },
  testDesign: {
    path: 'test-design.md',
    name: 'Test Design',
    required: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Gate Check Manager Class
// ─────────────────────────────────────────────────────────────────────────────

export class GateCheckManager extends EventEmitter {
  private projectPath: string;
  private planningArtifactsPath: string;
  private lastResult: GateCheckResult | null = null;
  private isOverridden: boolean = false;

  constructor(projectPath: string) {
    super();
    this.projectPath = resolve(projectPath);
    this.planningArtifactsPath = join(this.projectPath, '_bmad-output', 'planning-artifacts');
  }

  /**
   * Get the last gate check result
   */
  getLastResult(): GateCheckResult | null {
    return this.lastResult;
  }

  /**
   * Check if gate has been overridden
   */
  isGateOverridden(): boolean {
    return this.isOverridden;
  }

  /**
   * Run the implementation-readiness gate check
   */
  async runGateCheck(): Promise<IpcResult<GateCheckResult>> {
    debugLogger.bmad('Running gate check', { projectPath: this.projectPath });
    
    const items: GateCheckItem[] = [];
    const blockingIssues: string[] = [];

    try {
      // Check PRD
      const prdCheck = await this.checkArtifact(
        'prd',
        PLANNING_ARTIFACTS.prd.name,
        PLANNING_ARTIFACTS.prd.path,
        PLANNING_ARTIFACTS.prd.required
      );
      items.push(prdCheck);
      if (prdCheck.status === 'fail' && prdCheck.required) {
        blockingIssues.push(`${prdCheck.name} is missing or incomplete`);
      }

      // Check Architecture
      const archCheck = await this.checkArtifact(
        'architecture',
        PLANNING_ARTIFACTS.architecture.name,
        PLANNING_ARTIFACTS.architecture.path,
        PLANNING_ARTIFACTS.architecture.required
      );
      items.push(archCheck);
      if (archCheck.status === 'fail' && archCheck.required) {
        blockingIssues.push(`${archCheck.name} is missing or incomplete`);
      }

      // Check Epics (can be in multiple locations)
      const epicsCheck = await this.checkMultipleArtifact(
        'epics',
        PLANNING_ARTIFACTS.epics.name,
        PLANNING_ARTIFACTS.epics.paths,
        PLANNING_ARTIFACTS.epics.required
      );
      items.push(epicsCheck);
      if (epicsCheck.status === 'fail' && epicsCheck.required) {
        blockingIssues.push(`${epicsCheck.name} is missing or incomplete`);
      }

      // Check UX Design (optional)
      const uxCheck = await this.checkArtifact(
        'ux-design',
        PLANNING_ARTIFACTS.uxDesign.name,
        PLANNING_ARTIFACTS.uxDesign.path,
        PLANNING_ARTIFACTS.uxDesign.required
      );
      items.push(uxCheck);

      // Check Test Design (optional)
      const testCheck = await this.checkArtifact(
        'test-design',
        PLANNING_ARTIFACTS.testDesign.name,
        PLANNING_ARTIFACTS.testDesign.path,
        PLANNING_ARTIFACTS.testDesign.required
      );
      items.push(testCheck);

      // Check workflow status
      const statusCheck = await this.checkWorkflowStatus();
      items.push(statusCheck);
      if (statusCheck.status === 'fail') {
        blockingIssues.push(...(statusCheck.details || []));
      }

      // Calculate summary
      const summary = {
        total: items.length,
        passed: items.filter(i => i.status === 'pass').length,
        failed: items.filter(i => i.status === 'fail').length,
        warnings: items.filter(i => i.status === 'warning').length,
        skipped: items.filter(i => i.status === 'skipped').length,
      };

      const passed = blockingIssues.length === 0;

      this.lastResult = {
        passed,
        overridden: this.isOverridden,
        checkedAt: new Date(),
        items,
        summary,
        blockingIssues,
      };

      this.emit('gate-check-complete', this.lastResult);
      
      debugLogger.bmad('Gate check complete', { 
        passed, 
        summary,
        blockingIssues,
      });

      return successResult(this.lastResult);

    } catch (error) {
      return errorResult(
        'GATE_CHECK_ERROR',
        error instanceof Error ? error.message : 'Failed to run gate check'
      );
    }
  }

  /**
   * Check a single artifact
   */
  private async checkArtifact(
    id: string,
    name: string,
    relativePath: string,
    required: boolean
  ): Promise<GateCheckItem> {
    const fullPath = join(this.planningArtifactsPath, relativePath);
    
    if (!existsSync(fullPath)) {
      return {
        id,
        name,
        description: `Check if ${name} exists`,
        required,
        status: required ? 'fail' : 'skipped',
        message: required ? `${name} not found` : `${name} not created (optional)`,
      };
    }

    try {
      const stats = await stat(fullPath);
      const content = await readFile(fullPath, 'utf-8');
      
      // Basic content validation
      const isValid = content.trim().length > 100; // At least 100 chars
      
      if (!isValid) {
        return {
          id,
          name,
          description: `Check if ${name} is complete`,
          required,
          status: required ? 'fail' : 'warning',
          message: `${name} appears to be incomplete`,
          artifactPath: fullPath,
        };
      }

      return {
        id,
        name,
        description: `Check if ${name} exists and is complete`,
        required,
        status: 'pass',
        message: `${name} found (${Math.round(stats.size / 1024)}KB)`,
        artifactPath: fullPath,
      };

    } catch (error) {
      return {
        id,
        name,
        description: `Check if ${name} is readable`,
        required,
        status: 'fail',
        message: `Failed to read ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check artifact that could be in multiple locations
   */
  private async checkMultipleArtifact(
    id: string,
    name: string,
    relativePaths: string[],
    required: boolean
  ): Promise<GateCheckItem> {
    for (const relativePath of relativePaths) {
      const fullPath = join(this.planningArtifactsPath, relativePath);
      
      if (existsSync(fullPath)) {
        return this.checkArtifact(id, name, relativePath, required);
      }
    }

    return {
      id,
      name,
      description: `Check if ${name} exists`,
      required,
      status: required ? 'fail' : 'skipped',
      message: required ? `${name} not found` : `${name} not created (optional)`,
    };
  }

  /**
   * Check workflow status for Phase 2 and 3 completion
   */
  private async checkWorkflowStatus(): Promise<GateCheckItem> {
    const statusManager = getStatusManager(this.projectPath);
    const statusResult = await statusManager.read();

    if (!statusResult.success) {
      return {
        id: 'workflow-status',
        name: 'Workflow Status',
        description: 'Check if Phase 2 and 3 workflows are complete',
        required: true,
        status: 'fail',
        message: 'Could not read workflow status',
      };
    }

    const status = statusResult.data;
    const details: string[] = [];

    // Check Phase 2 (Planning)
    const planningPhase = status.phases.planning;
    if (!planningPhase) {
      details.push('Phase 2 (Planning) not started');
    } else {
      const prdStatus = planningPhase.workflows?.['prd']?.status;
      if (prdStatus !== 'completed') {
        details.push('PRD workflow not completed');
      }
    }

    // Check Phase 3 (Solutioning)
    const solutioningPhase = status.phases.solutioning;
    if (!solutioningPhase) {
      details.push('Phase 3 (Solutioning) not started');
    } else {
      const archStatus = solutioningPhase.workflows?.['architecture']?.status;
      const epicsStatus = solutioningPhase.workflows?.['epics']?.status;
      
      if (archStatus !== 'completed') {
        details.push('Architecture workflow not completed');
      }
      if (epicsStatus !== 'completed') {
        details.push('Epics workflow not completed');
      }
    }

    if (details.length > 0) {
      return {
        id: 'workflow-status',
        name: 'Workflow Status',
        description: 'Check if Phase 2 and 3 workflows are complete',
        required: true,
        status: 'fail',
        message: 'Some required workflows are incomplete',
        details,
      };
    }

    return {
      id: 'workflow-status',
      name: 'Workflow Status',
      description: 'Check if Phase 2 and 3 workflows are complete',
      required: true,
      status: 'pass',
      message: 'All required workflows complete',
    };
  }

  /**
   * Override the gate check with confirmation
   */
  async overrideGateCheck(override: GateCheckOverride): Promise<IpcResult<GateCheckResult>> {
    debugLogger.bmad('Gate check override requested', { 
      confirmation: override.confirmation,
      reason: override.reason,
    });

    // Validate confirmation text
    if (override.confirmation !== REQUIRED_CONFIRMATION) {
      return errorResult(
        'INVALID_CONFIRMATION',
        `Invalid confirmation. You must type "${REQUIRED_CONFIRMATION}" to proceed.`
      );
    }

    this.isOverridden = true;

    // Update last result with override info
    if (this.lastResult) {
      this.lastResult = {
        ...this.lastResult,
        overridden: true,
        overriddenAt: override.timestamp,
        passed: true, // Override makes it pass
      };
    }

    // Update workflow status to record override
    const statusManager = getStatusManager(this.projectPath);
    await statusManager.updateWorkflowStatus(
      'solutioning',
      'implementation-readiness',
      'completed',
      {
        result: 'OVERRIDDEN',
        note: `Gate check overridden by user. Reason: ${override.reason || 'Not provided'}`,
      }
    );

    this.emit('gate-override', override);
    
    debugLogger.bmad('Gate check overridden', { reason: override.reason });

    return successResult(this.lastResult!);
  }

  /**
   * Reset override (for testing or re-running gate check)
   */
  resetOverride(): void {
    this.isOverridden = false;
    if (this.lastResult) {
      this.lastResult.overridden = false;
      this.lastResult.overriddenAt = undefined;
    }
    this.emit('gate-override-reset');
  }

  /**
   * Check if Phase 4 should be blocked
   */
  shouldBlockPhase4(): boolean {
    if (this.isOverridden) {
      return false;
    }

    if (!this.lastResult) {
      return true; // Block if no gate check has been run
    }

    return !this.lastResult.passed;
  }

  /**
   * Get blocking reasons
   */
  getBlockingReasons(): string[] {
    if (!this.lastResult) {
      return ['Gate check has not been run'];
    }

    if (this.lastResult.passed || this.isOverridden) {
      return [];
    }

    return this.lastResult.blockingIssues;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance Management
// ─────────────────────────────────────────────────────────────────────────────

let activeManager: GateCheckManager | null = null;

/**
 * Get or create a GateCheckManager for a project
 */
export function getGateCheckManager(projectPath: string): GateCheckManager {
  const resolvedPath = resolve(projectPath);

  if (activeManager && (activeManager as any).projectPath === resolvedPath) {
    return activeManager;
  }

  activeManager = new GateCheckManager(resolvedPath);
  return activeManager;
}

/**
 * Dispose the active gate check manager
 */
export function disposeGateCheckManager(): void {
  if (activeManager) {
    activeManager.removeAllListeners();
    activeManager = null;
  }
}
