/**
 * Target Runner for BMAD Workflow Execution
 * 
 * Executes BMAD workflows based on target values.
 * Implements the flexible execution model where users can stop at any target.
 * Integrates with WorkflowRunner and Load Balancer for execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type {
  BmadTarget,
  BmadSubTarget,
  TargetDefinition,
  TargetDependencies,
  TargetRegistry,
  BmadPhase,
  WorkflowStatusValue,
} from './types';
import { 
  WorkflowRunner, 
  getWorkflowRunner, 
  type WorkflowRunOptions 
} from './workflow-runner';
import type { OpenCodeProfile } from './opencode-load-balancer';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TARGET_REGISTRY_PATH = '_bmad/bmm/config/target-registry.yaml';

// ─────────────────────────────────────────────────────────────────────────────
// Target Registry Loader
// ─────────────────────────────────────────────────────────────────────────────

let registryCache: TargetRegistry | null = null;

export async function loadTargetRegistry(bmadPath: string): Promise<TargetRegistry> {
  if (registryCache) return registryCache;

  const registryPath = path.join(bmadPath, 'bmm/config/target-registry.yaml');
  
  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    registryCache = yaml.load(content) as TargetRegistry;
    return registryCache;
  } catch (error) {
    console.error('Failed to load target registry:', error);
    throw new Error(`Failed to load target registry from ${registryPath}`);
  }
}

export function clearRegistryCache(): void {
  registryCache = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Target Runner Class
// ─────────────────────────────────────────────────────────────────────────────

export interface TargetRunnerOptions {
  projectPath: string;
  bmadPath: string;
  target: BmadTarget;
  yoloMode?: boolean;
  /** Enable load balancing across multiple OpenCode profiles */
  useLoadBalancing?: boolean;
  /** Preferred OpenCode profile when load balancing */
  preferredProfile?: OpenCodeProfile;
  /** Enable automatic retry on rate limiting */
  retryOnRateLimit?: boolean;
  /** Additional arguments to pass to OpenCode */
  additionalArgs?: string[];
  onProgress?: (event: TargetProgressEvent) => void;
  onComplete?: (event: TargetCompleteEvent) => void;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export interface TargetProgressEvent {
  type: 'progress';
  currentTarget: BmadTarget;
  currentPhase: number;
  totalTargets: number;
  completedTargets: number;
  message: string;
}

export interface TargetCompleteEvent {
  type: 'complete';
  target: BmadTarget;
  success: boolean;
  outputPath?: string;
  duration: number;
  error?: string;
  /** Profile used for execution (when load balancing) */
  profile?: OpenCodeProfile;
  /** Whether execution was rate limited */
  rateLimited?: boolean;
}

export interface TargetExecutionPlan {
  target: BmadTarget;
  requiredTargets: BmadTarget[];
  optionalTargets: BmadTarget[];
  executionOrder: BmadTarget[];
  estimatedSteps: number;
}

export class TargetRunner {
  private options: TargetRunnerOptions;
  private registry: TargetRegistry | null = null;
  private completedTargets: Set<BmadTarget> = new Set();
  private startTime: number = 0;
  private workflowRunner: WorkflowRunner | null = null;
  private cancelled: boolean = false;

  constructor(options: TargetRunnerOptions) {
    this.options = options;
  }

  /**
   * Initialize the workflow runner with optional load balancing
   */
  private async initializeRunner(): Promise<void> {
    if (this.workflowRunner) return;

    this.workflowRunner = getWorkflowRunner(this.options.projectPath);
    await this.workflowRunner.initialize();

    // Enable load balancing if requested
    if (this.options.useLoadBalancing) {
      await this.workflowRunner.enableLoadBalancing();
    }
  }

  /**
   * Plan the execution for a target
   */
  async plan(): Promise<TargetExecutionPlan> {
    await this.loadRegistry();

    const target = this.options.target;
    const targetDef = this.getTargetDefinition(target);

    if (!targetDef && target !== 'auto') {
      throw new Error(`Unknown target: ${target}`);
    }

    // Get dependencies
    const deps = this.registry!.dependencies[target] || {};
    const requiredTargets = deps.required || [];
    const optionalTargets = deps.optional || [];

    // Build execution order
    const executionOrder = this.buildExecutionOrder(target, requiredTargets);

    return {
      target,
      requiredTargets,
      optionalTargets,
      executionOrder,
      estimatedSteps: executionOrder.length,
    };
  }

  /**
   * Execute the target
   */
  async execute(): Promise<TargetCompleteEvent> {
    this.startTime = Date.now();
    this.cancelled = false;
    
    await this.loadRegistry();
    await this.initializeRunner();

    try {
      const plan = await this.plan();
      
      this.emitProgress({
        currentTarget: plan.target,
        currentPhase: 0,
        totalTargets: plan.executionOrder.length,
        completedTargets: 0,
        message: `Starting execution plan for target: ${plan.target}`,
      });

      let lastProfile: OpenCodeProfile | undefined;
      let wasRateLimited = false;

      // Execute each target in order
      for (let i = 0; i < plan.executionOrder.length; i++) {
        // Check if cancelled
        if (this.cancelled) {
          throw new Error('Execution cancelled by user');
        }

        const currentTarget = plan.executionOrder[i];
        
        // Skip if already completed
        if (this.completedTargets.has(currentTarget)) {
          continue;
        }

        this.emitProgress({
          currentTarget,
          currentPhase: this.getTargetPhase(currentTarget),
          totalTargets: plan.executionOrder.length,
          completedTargets: i,
          message: `Executing: ${currentTarget}`,
        });

        // Execute the workflow for this target
        const result = await this.executeTarget(currentTarget);
        
        if (result.rateLimited) {
          wasRateLimited = true;
        }
        if (result.profile) {
          lastProfile = result.profile;
        }
        
        if (!result.success) {
          throw new Error(result.error || `Failed to execute target: ${currentTarget}`);
        }
        
        this.completedTargets.add(currentTarget);

        // Check if this is our final target
        if (currentTarget === plan.target) {
          break;
        }
      }

      const result: TargetCompleteEvent = {
        type: 'complete',
        target: plan.target,
        success: true,
        duration: Date.now() - this.startTime,
        outputPath: this.getTargetOutput(plan.target),
        profile: lastProfile,
        rateLimited: wasRateLimited,
      };

      this.options.onComplete?.(result);
      return result;

    } catch (error) {
      const result: TargetCompleteEvent = {
        type: 'complete',
        target: this.options.target,
        success: false,
        duration: Date.now() - this.startTime,
        error: error instanceof Error ? error.message : String(error),
      };

      this.options.onComplete?.(result);
      return result;
    }
  }

  /**
   * Cancel the current execution
   */
  cancel(): void {
    this.cancelled = true;
    if (this.workflowRunner) {
      this.workflowRunner.cancelWorkflow().catch(console.error);
    }
  }

  /**
   * Check if a target is valid
   */
  isValidTarget(target: string): target is BmadTarget {
    if (!this.registry) return false;
    return target in this.registry.targets || target === 'auto';
  }

  /**
   * Get all available targets
   */
  getAvailableTargets(): BmadTarget[] {
    if (!this.registry) return [];
    return Object.keys(this.registry.targets) as BmadTarget[];
  }

  /**
   * Get target definition
   */
  getTargetDefinition(target: BmadTarget): TargetDefinition | null {
    if (!this.registry) return null;
    return this.registry.targets[target] || null;
  }

  /**
   * Get target dependencies
   */
  getTargetDependencies(target: BmadTarget): TargetDependencies {
    if (!this.registry) return {};
    return this.registry.dependencies[target] || {};
  }

  /**
   * Check if target is ready (all dependencies met)
   */
  isTargetReady(target: BmadTarget, completedTargets: Set<BmadTarget>): boolean {
    const deps = this.getTargetDependencies(target);
    const required = deps.required || [];
    return required.every(dep => completedTargets.has(dep));
  }

  /**
   * Get targets by phase
   */
  getTargetsByPhase(phase: number): BmadTarget[] {
    if (!this.registry) return [];
    return Object.entries(this.registry.targets)
      .filter(([_, def]) => def.phase === phase)
      .map(([target]) => target as BmadTarget);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ─────────────────────────────────────────────────────────────────────────────

  private async loadRegistry(): Promise<void> {
    if (this.registry) return;
    this.registry = await loadTargetRegistry(this.options.bmadPath);
  }

  private buildExecutionOrder(target: BmadTarget, required: BmadTarget[]): BmadTarget[] {
    const order: BmadTarget[] = [];
    const visited = new Set<BmadTarget>();

    // Recursive function to add dependencies first
    const addWithDeps = (t: BmadTarget) => {
      if (visited.has(t)) return;
      visited.add(t);

      // Add dependencies first
      const deps = this.registry!.dependencies[t];
      if (deps?.required) {
        for (const dep of deps.required) {
          addWithDeps(dep);
        }
      }

      order.push(t);
    };

    // If auto mode, add all required phases
    if (target === 'auto') {
      // Phase 2 (required)
      addWithDeps('prd');
      // Phase 3 (required)
      addWithDeps('architecture');
      addWithDeps('epics');
      addWithDeps('gate-check');
      // Phase 4
      addWithDeps('sprint-ready');
    } else {
      addWithDeps(target);
    }

    return order;
  }

  private async executeTarget(target: BmadTarget): Promise<{ success: boolean; error?: string; profile?: OpenCodeProfile; rateLimited?: boolean }> {
    const def = this.getTargetDefinition(target);
    if (!def) {
      return { success: false, error: `No definition for target: ${target}` };
    }

    if (!this.workflowRunner) {
      return { success: false, error: 'WorkflowRunner not initialized' };
    }

    // Map target to workflow ID
    const workflowId = this.getWorkflowIdForTarget(target);
    if (!workflowId) {
      return { success: false, error: `No workflow mapped for target: ${target}` };
    }

    // Build workflow run options
    const runOptions: WorkflowRunOptions = {
      yoloMode: this.options.yoloMode,
      useLoadBalancing: this.options.useLoadBalancing,
      preferredProfile: this.options.preferredProfile,
      retryOnRateLimit: this.options.retryOnRateLimit,
      args: this.options.additionalArgs,
      onStdout: this.options.onStdout,
      onStderr: this.options.onStderr,
    };

    // Wait for workflow completion
    return new Promise((resolve) => {
      let resolved = false;

      const handleExit = (event: { success: boolean; exitCode: number; profile?: OpenCodeProfile; rateLimited?: boolean }) => {
        if (resolved) return;
        resolved = true;
        
        this.workflowRunner?.removeListener('exit', handleExit);
        this.workflowRunner?.removeListener('error', handleError);

        resolve({
          success: event.success,
          profile: event.profile,
          rateLimited: event.rateLimited,
          error: event.success ? undefined : `Workflow exited with code ${event.exitCode}`,
        });
      };

      const handleError = (error: Error) => {
        if (resolved) return;
        resolved = true;
        
        this.workflowRunner?.removeListener('exit', handleExit);
        this.workflowRunner?.removeListener('error', handleError);

        resolve({
          success: false,
          error: error.message,
        });
      };

      this.workflowRunner!.on('exit', handleExit);
      this.workflowRunner!.on('error', handleError);

      // Start the workflow
      this.workflowRunner!.startWorkflow(workflowId, runOptions)
        .then((result) => {
          if (!result.success) {
            if (!resolved) {
              resolved = true;
              this.workflowRunner?.removeListener('exit', handleExit);
              this.workflowRunner?.removeListener('error', handleError);
              resolve({ success: false, error: result.error?.message });
            }
          }
        })
        .catch((err) => {
          if (!resolved) {
            resolved = true;
            this.workflowRunner?.removeListener('exit', handleExit);
            this.workflowRunner?.removeListener('error', handleError);
            resolve({ success: false, error: err.message });
          }
        });
    });
  }

  /**
   * Map a target to its corresponding workflow ID
   */
  private getWorkflowIdForTarget(target: BmadTarget): string | null {
    // Map targets to workflow IDs (these match the ids in BMAD_WORKFLOWS)
    const workflowMap: Partial<Record<BmadTarget, string>> = {
      'research': 'research',
      'brief': 'product-brief',
      'brainstorm': 'brainstorm-project',
      'prd': 'prd',
      'ux-design': 'ux-design',
      'architecture': 'architecture',
      'test-design': 'test-design',
      'epics': 'epics',
      'gate-check': 'implementation-readiness',
      'sprint-ready': 'sprint-planning',
      'story-ready': 'create-story',
      'implemented': 'dev-story',
      'reviewed': 'code-review',
    };
    return workflowMap[target] || null;
  }

  private buildWorkflowCommand(target: BmadTarget, def: TargetDefinition): string {
    // Map target to workflow command
    const commandMap: Partial<Record<BmadTarget, string>> = {
      'research': '/bmad:bmm:workflows:research',
      'brief': '/bmad:bmm:workflows:create-product-brief',
      'brainstorm': '/bmad:core:workflows:brainstorming',
      'prd': '/bmad:bmm:workflows:prd',
      'ux-design': '/bmad:bmm:workflows:create-ux-design',
      'architecture': '/bmad:bmm:workflows:create-architecture',
      'test-design': '/bmad:bmm:workflows:testarch:test-design',
      'epics': '/bmad:bmm:workflows:create-epics-and-stories',
      'gate-check': '/bmad:bmm:workflows:check-implementation-readiness',
      'sprint-ready': '/bmad:bmm:workflows:sprint-planning',
      'story-ready': '/bmad:bmm:workflows:create-story',
      'implemented': '/bmad:bmm:workflows:dev-story',
      'reviewed': '/bmad:bmm:workflows:code-review',
      'retro': '/bmad:bmm:workflows:retrospective',
      'test-framework': '/bmad:bmm:workflows:testarch:framework',
      'test-framework-polyglot': '/bmad:bmm:workflows:testarch:framework-polyglot',
      'atdd': '/bmad:bmm:workflows:testarch:atdd',
      'test-coverage': '/bmad:bmm:workflows:testarch:automate',
      'test-reviewed': '/bmad:bmm:workflows:testarch:test-review',
      'trace': '/bmad:bmm:workflows:testarch:trace',
      'nfr-tested': '/bmad:bmm:workflows:testarch:nfr-assess',
      'ci': '/bmad:bmm:workflows:testarch:ci',
      'quick-spec': '/bmad:bmm:workflows:quick-spec',
      'quick-dev': '/bmad:bmm:workflows:quick-dev',
      'documented': '/bmad:bmm:workflows:document-project',
    };

    return commandMap[target] || `/bmad:bmm:workflows:${def.workflow}`;
  }

  private getTargetPhase(target: BmadTarget): number {
    const def = this.getTargetDefinition(target);
    return def?.phase || 0;
  }

  private getTargetOutput(target: BmadTarget): string | undefined {
    const def = this.getTargetDefinition(target);
    return def?.output?.path;
  }

  private emitProgress(event: Omit<TargetProgressEvent, 'type'>): void {
    this.options.onProgress?.({ type: 'progress', ...event });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a target string
 */
export function isValidBmadTarget(target: string): target is BmadTarget {
  const validTargets: BmadTarget[] = [
    'research', 'brief', 'brainstorm',
    'prd', 'ux-design',
    'architecture', 'test-design', 'epics', 'gate-check',
    'sprint-ready', 'story-ready', 'implemented', 'reviewed', 'retro',
    'test-framework', 'test-framework-polyglot', 'atdd', 'test-coverage',
    'test-reviewed', 'trace', 'nfr-tested', 'ci',
    'quick-spec', 'quick-dev',
    'documented',
    'auto',
  ];
  return validTargets.includes(target as BmadTarget);
}

/**
 * Get human-readable target name
 */
export function getTargetDisplayName(target: BmadTarget): string {
  const displayNames: Record<BmadTarget, string> = {
    'research': 'Research',
    'brief': 'Product Brief',
    'brainstorm': 'Brainstorm',
    'prd': 'PRD (Product Requirements)',
    'ux-design': 'UX Design',
    'architecture': 'Architecture',
    'test-design': 'Test Design',
    'epics': 'Epics & Stories',
    'gate-check': 'Implementation Readiness',
    'sprint-ready': 'Sprint Planning',
    'story-ready': 'Story Preparation',
    'implemented': 'Story Implementation',
    'reviewed': 'Code Review',
    'retro': 'Retrospective',
    'test-framework': 'Test Framework Setup',
    'test-framework-polyglot': 'Polyglot Test Framework',
    'atdd': 'Acceptance Tests (ATDD)',
    'test-coverage': 'Test Automation',
    'test-reviewed': 'Test Quality Review',
    'trace': 'Traceability Matrix',
    'nfr-tested': 'NFR Assessment',
    'ci': 'CI Pipeline',
    'quick-spec': 'Quick Spec',
    'quick-dev': 'Quick Dev',
    'documented': 'Project Documentation',
    'auto': 'Full Automation',
  };
  return displayNames[target] || target;
}

/**
 * Get target phase number
 */
export function getTargetPhase(target: BmadTarget): number | null {
  const phaseMap: Partial<Record<BmadTarget, number>> = {
    'research': 1, 'brief': 1, 'brainstorm': 1,
    'prd': 2, 'ux-design': 2,
    'architecture': 3, 'test-design': 3, 'epics': 3, 'gate-check': 3,
    'sprint-ready': 4, 'story-ready': 4, 'implemented': 4, 'reviewed': 4, 'retro': 4,
    'test-framework': 4, 'test-framework-polyglot': 4, 'atdd': 4, 'test-coverage': 4,
    'test-reviewed': 4, 'trace': 4, 'nfr-tested': 4, 'ci': 4,
  };
  return phaseMap[target] ?? null;
}

/**
 * Group targets by phase
 */
export function groupTargetsByPhase(): Record<number, BmadTarget[]> {
  return {
    1: ['research', 'brief', 'brainstorm'],
    2: ['prd', 'ux-design'],
    3: ['architecture', 'test-design', 'epics', 'gate-check'],
    4: [
      'sprint-ready', 'story-ready', 'implemented', 'reviewed', 'retro',
      'test-framework', 'test-framework-polyglot', 'atdd', 'test-coverage',
      'test-reviewed', 'trace', 'nfr-tested', 'ci',
    ],
  };
}
