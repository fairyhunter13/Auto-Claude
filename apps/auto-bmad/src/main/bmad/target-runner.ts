/**
 * Target Runner for BMAD Workflow Execution
 * 
 * Executes BMAD workflows based on target values.
 * Implements the flexible execution model where users can stop at any target.
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
  onProgress?: (event: TargetProgressEvent) => void;
  onComplete?: (event: TargetCompleteEvent) => void;
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

  constructor(options: TargetRunnerOptions) {
    this.options = options;
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
    await this.loadRegistry();

    try {
      const plan = await this.plan();
      
      this.emitProgress({
        currentTarget: plan.target,
        currentPhase: 0,
        totalTargets: plan.executionOrder.length,
        completedTargets: 0,
        message: `Starting execution plan for target: ${plan.target}`,
      });

      // Execute each target in order
      for (let i = 0; i < plan.executionOrder.length; i++) {
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
        await this.executeTarget(currentTarget);
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

  private async executeTarget(target: BmadTarget): Promise<void> {
    const def = this.getTargetDefinition(target);
    if (!def) {
      throw new Error(`No definition for target: ${target}`);
    }

    // Build the workflow command
    const command = this.buildWorkflowCommand(target, def);
    
    // Execute via workflow runner (this would integrate with existing workflow-runner.ts)
    // For now, we'll just log the intent
    console.log(`Would execute workflow for target ${target}:`, command);
    
    // In actual implementation, this would call:
    // await workflowRunner.execute(command, { yoloMode: this.options.yoloMode });
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
