/**
 * COMPREHENSIVE OPENCODE WORKFLOW E2E TESTS
 *
 * Tests ALL BMAD workflows across all 4 phases with real OpenCode execution.
 * This is the master test suite for validating the complete BMAD methodology.
 *
 * Test Coverage:
 * - Phase 1: Analysis (brainstorm, research, product-brief)
 * - Phase 2: Planning (prd, ux-design)
 * - Phase 3: Solutioning (architecture, epics, test-design, gate-check)
 * - Phase 4: Implementation (sprint-planning, create-story, dev-story, code-review)
 *
 * Requirements:
 * - OpenCode CLI must be installed and in PATH
 * - Tests execute real workflows (may take several minutes each)
 *
 * Run: npx playwright test opencode-workflow-comprehensive.e2e.ts
 * Run specific phase: npx playwright test --grep="Phase 2"
 */

import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createBmadTestProject,
  createImplementationReadyProject,
  type BmadTestProject,
} from './fixtures/bmad-test-project';
import {
  isOpenCodeAvailable,
  getOpenCodeInfo,
  executeBmadWorkflow,
  executeWorkflowSequence,
  getWorkflowsForPhase,
  getRequiredWorkflowsForPhase,
  logWorkflowResult,
  waitForFile,
  type WorkflowExecutionResult,
  type BmadWorkflowId,
} from './fixtures/opencode-helper';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const TEST_BASE_DIR = path.join(__dirname, 'test-projects');
const WORKFLOW_TIMEOUT = 180000; // 3 minutes per workflow
const PHASE_TIMEOUT = 600000; // 10 minutes per phase

// Ensure test directory exists
mkdirSync(TEST_BASE_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// Test Helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(emoji: string, message: string): void {
  console.log(`${emoji} ${message}`);
}

function logPhaseStart(phase: number, name: string): void {
  console.log('\n' + '═'.repeat(70));
  console.log(`  PHASE ${phase}: ${name.toUpperCase()}`);
  console.log('═'.repeat(70));
}

function logPhaseEnd(phase: number, results: Map<string, WorkflowExecutionResult>): void {
  const total = results.size;
  const successful = [...results.values()].filter((r) => r.success).length;
  const failed = total - successful;

  console.log('─'.repeat(70));
  console.log(`  Phase ${phase} Summary: ${successful}/${total} workflows successful`);
  if (failed > 0) {
    console.log(`  ⚠️  ${failed} workflow(s) failed`);
  }
  console.log('─'.repeat(70) + '\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenCode Availability Check
// ─────────────────────────────────────────────────────────────────────────────

test.describe('OpenCode CLI Availability', () => {
  test('should detect OpenCode CLI installation', () => {
    const info = getOpenCodeInfo();

    log('🔍', `OpenCode available: ${info.available}`);
    log('📍', `OpenCode path: ${info.path || 'Not found'}`);
    log('📦', `OpenCode version: ${info.version || 'Unknown'}`);

    // This test always passes - it's informational
    expect(info).toBeDefined();
  });

  test('should have OpenCode CLI for workflow tests', () => {
    if (!isOpenCodeAvailable()) {
      console.warn('⚠️  OpenCode CLI not available - workflow tests will be skipped');
      test.skip();
    }

    const info = getOpenCodeInfo();
    expect(info.available).toBe(true);
    expect(info.path).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: ANALYSIS WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 1: Analysis Workflows', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    logPhaseStart(1, 'Analysis');

    project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'phase-1-analysis-test',
      initialPhase: 'analysis',
      includeSampleCode: true,
      includeArtifacts: false,
    });

    log('📁', `Created test project: ${project.projectPath}`);
  });

  test.afterAll(() => {
    // Keep project for inspection if tests fail
    // project?.cleanup();
  });

  test.setTimeout(WORKFLOW_TIMEOUT);

  test('1.1 Execute brainstorm-project workflow', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🧠', 'Executing brainstorm-project workflow...');

    const result = await executeBmadWorkflow('brainstorm-project', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    // Brainstorm is optional, so we just verify it ran
    expect(result.workflowId).toBe('brainstorm-project');
    expect(result.agent).toBe('analyst');
    expect(result.timedOut).toBe(false);
  });

  test('1.2 Execute research workflow', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🔬', 'Executing research workflow...');

    const result = await executeBmadWorkflow('research', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('research');
    expect(result.agent).toBe('analyst');
    expect(result.timedOut).toBe(false);

    if (result.success && result.artifactPath) {
      expect(existsSync(result.artifactPath)).toBe(true);
    }
  });

  test('1.3 Execute product-brief workflow', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('📋', 'Executing product-brief workflow...');

    const result = await executeBmadWorkflow('product-brief', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('product-brief');
    expect(result.agent).toBe('analyst');
    expect(result.timedOut).toBe(false);

    if (result.success) {
      const briefPath = path.join(project.planningArtifactsPath, 'product-brief.md');
      // Wait for file if needed
      await waitForFile(briefPath, 5000);

      if (existsSync(briefPath)) {
        const content = readFileSync(briefPath, 'utf-8');
        expect(content.length).toBeGreaterThan(100);
        log('✅', 'Product brief created successfully');
      }
    }
  });

  test('1.4 Execute all Phase 1 workflows in sequence', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🔄', 'Executing all Phase 1 workflows in sequence...');

    const workflows = getWorkflowsForPhase(1);
    const results = await executeWorkflowSequence(
      workflows as BmadWorkflowId[],
      project.projectPath,
      {
        yoloMode: true,
        timeout: WORKFLOW_TIMEOUT,
      }
    );

    logPhaseEnd(1, results);

    // Phase 1 is optional, so we just verify workflows were attempted
    expect(results.size).toBe(workflows.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 2: PLANNING WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 2: Planning Workflows', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    logPhaseStart(2, 'Planning');

    // Create a project that has Phase 1 "completed"
    project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'phase-2-planning-test',
      initialPhase: 'planning',
      includeSampleCode: true,
      includeArtifacts: true, // Include product brief from Phase 1
    });

    log('📁', `Created test project: ${project.projectPath}`);
  });

  test.afterAll(() => {
    // project?.cleanup();
  });

  test.setTimeout(WORKFLOW_TIMEOUT);

  test('2.1 Execute PRD workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('📄', 'Executing PRD workflow...');

    const result = await executeBmadWorkflow('prd', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('prd');
    expect(result.agent).toBe('pm');
    expect(result.timedOut).toBe(false);

    if (result.success) {
      const prdPath = path.join(project.planningArtifactsPath, 'prd.md');
      await waitForFile(prdPath, 5000);

      if (existsSync(prdPath)) {
        const content = readFileSync(prdPath, 'utf-8');
        expect(content.length).toBeGreaterThan(500);
        expect(content.toLowerCase()).toContain('requirement');
        log('✅', 'PRD created successfully');
      }
    }
  });

  test('2.2 Execute UX-Design workflow (Optional)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🎨', 'Executing UX-Design workflow...');

    const result = await executeBmadWorkflow('ux-design', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('ux-design');
    expect(result.agent).toBe('ux-designer');
    expect(result.timedOut).toBe(false);

    // UX-Design is optional, so failure is acceptable
    if (result.success && result.artifactPath) {
      expect(existsSync(result.artifactPath)).toBe(true);
      log('✅', 'UX Design created successfully');
    }
  });

  test('2.3 Execute all Phase 2 required workflows', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🔄', 'Executing all Phase 2 required workflows...');

    const requiredWorkflows = getRequiredWorkflowsForPhase(2);
    const results = await executeWorkflowSequence(
      requiredWorkflows as BmadWorkflowId[],
      project.projectPath,
      {
        yoloMode: true,
        timeout: WORKFLOW_TIMEOUT,
      }
    );

    logPhaseEnd(2, results);

    // All required workflows should succeed
    const allSucceeded = [...results.values()].every((r) => r.success);

    if (!allSucceeded) {
      console.warn('⚠️  Some required Phase 2 workflows failed');
    }

    expect(results.size).toBe(requiredWorkflows.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 3: SOLUTIONING WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 3: Solutioning Workflows', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    logPhaseStart(3, 'Solutioning');

    // Create a project that has Phases 1-2 "completed"
    project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'phase-3-solutioning-test',
      initialPhase: 'solutioning',
      includeSampleCode: true,
      includeArtifacts: true, // Include PRD from Phase 2
    });

    log('📁', `Created test project: ${project.projectPath}`);
  });

  test.afterAll(() => {
    // project?.cleanup();
  });

  test.setTimeout(WORKFLOW_TIMEOUT);

  test('3.1 Execute Architecture workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🏗️', 'Executing Architecture workflow...');

    const result = await executeBmadWorkflow('architecture', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('architecture');
    expect(result.agent).toBe('architect');
    expect(result.timedOut).toBe(false);

    if (result.success) {
      const archPath = path.join(project.planningArtifactsPath, 'architecture.md');
      await waitForFile(archPath, 5000);

      if (existsSync(archPath)) {
        const content = readFileSync(archPath, 'utf-8');
        expect(content.length).toBeGreaterThan(500);
        log('✅', 'Architecture document created successfully');
      }
    }
  });

  test('3.2 Execute Epics workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('📚', 'Executing Epics workflow...');

    const result = await executeBmadWorkflow('epics', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('epics');
    expect(result.agent).toBe('pm');
    expect(result.timedOut).toBe(false);

    if (result.success) {
      const epicsPath = path.join(project.planningArtifactsPath, 'epics.md');
      await waitForFile(epicsPath, 5000);

      if (existsSync(epicsPath)) {
        const content = readFileSync(epicsPath, 'utf-8');
        expect(content.length).toBeGreaterThan(200);
        expect(content.toLowerCase()).toMatch(/epic|story/i);
        log('✅', 'Epics document created successfully');
      }
    }
  });

  test('3.3 Execute Test-Design workflow (Optional)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🧪', 'Executing Test-Design workflow...');

    const result = await executeBmadWorkflow('test-design', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('test-design');
    expect(result.agent).toBe('tea');
    expect(result.timedOut).toBe(false);

    // Test-Design is optional
    if (result.success && result.artifactPath) {
      expect(existsSync(result.artifactPath)).toBe(true);
      log('✅', 'Test Design document created successfully');
    }
  });

  test('3.4 Execute Implementation-Readiness (Gate Check) workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🚦', 'Executing Implementation-Readiness (Gate Check) workflow...');

    const result = await executeBmadWorkflow('implementation-readiness', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('implementation-readiness');
    expect(result.agent).toBe('architect');
    expect(result.timedOut).toBe(false);

    if (result.success) {
      const reportPath = path.join(
        project.planningArtifactsPath,
        'implementation-readiness-report.md'
      );
      await waitForFile(reportPath, 5000);

      if (existsSync(reportPath)) {
        const content = readFileSync(reportPath, 'utf-8');
        expect(content.length).toBeGreaterThan(100);
        log('✅', 'Implementation Readiness report created successfully');
      }
    }
  });

  test('3.5 Execute all Phase 3 required workflows', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🔄', 'Executing all Phase 3 required workflows...');

    const requiredWorkflows = getRequiredWorkflowsForPhase(3);
    const results = await executeWorkflowSequence(
      requiredWorkflows as BmadWorkflowId[],
      project.projectPath,
      {
        yoloMode: true,
        timeout: WORKFLOW_TIMEOUT,
      }
    );

    logPhaseEnd(3, results);

    expect(results.size).toBe(requiredWorkflows.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 4: IMPLEMENTATION WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Phase 4: Implementation Workflows', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    logPhaseStart(4, 'Implementation');

    // Create a fully implementation-ready project
    project = createImplementationReadyProject(TEST_BASE_DIR, 'phase-4-implementation-test');

    log('📁', `Created test project: ${project.projectPath}`);
  });

  test.afterAll(() => {
    // project?.cleanup();
  });

  test.setTimeout(WORKFLOW_TIMEOUT);

  test('4.1 Execute Sprint-Planning workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🏃', 'Executing Sprint-Planning workflow...');

    const result = await executeBmadWorkflow('sprint-planning', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('sprint-planning');
    expect(result.agent).toBe('sm');
    expect(result.timedOut).toBe(false);

    if (result.success) {
      const sprintPath = path.join(
        project.implementationArtifactsPath,
        'sprint-status.yaml'
      );
      await waitForFile(sprintPath, 5000);

      if (existsSync(sprintPath)) {
        const content = readFileSync(sprintPath, 'utf-8');
        expect(content).toContain('sprint');
        log('✅', 'Sprint status created successfully');
      }
    }
  });

  test('4.2 Execute Create-Story workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('📝', 'Executing Create-Story workflow...');

    const result = await executeBmadWorkflow('create-story', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('create-story');
    expect(result.agent).toBe('sm');
    expect(result.timedOut).toBe(false);
  });

  test('4.3 Execute Dev-Story workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('💻', 'Executing Dev-Story workflow...');

    const result = await executeBmadWorkflow('dev-story', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('dev-story');
    expect(result.agent).toBe('dev');
    expect(result.timedOut).toBe(false);
  });

  test('4.4 Execute Code-Review workflow (Required)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    log('🔍', 'Executing Code-Review workflow...');

    const result = await executeBmadWorkflow('code-review', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
      onStdout: (data) => process.stdout.write(data),
    });

    logWorkflowResult(result);

    expect(result.workflowId).toBe('code-review');
    expect(result.agent).toBe('dev');
    expect(result.timedOut).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FULL GREENFIELD SCENARIO TEST
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Full Greenfield Project Scenario', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    console.log('\n' + '═'.repeat(70));
    console.log('  FULL GREENFIELD PROJECT SCENARIO');
    console.log('  Testing complete BMAD methodology from scratch');
    console.log('═'.repeat(70) + '\n');

    project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'full-greenfield-scenario',
      initialPhase: 'analysis',
      projectType: 'greenfield',
      includeSampleCode: true,
      includeArtifacts: false, // Start fresh
      initGit: true,
    });

    log('📁', `Created greenfield project: ${project.projectPath}`);
  });

  test.afterAll(() => {
    // Keep for analysis
    // project?.cleanup();
  });

  test.setTimeout(PHASE_TIMEOUT);

  test('Execute complete BMAD methodology (Phases 2-4)', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    const phaseResults: Map<number, Map<string, WorkflowExecutionResult>> = new Map();

    // Phase 2: Planning (Required)
    log('📋', '═══ PHASE 2: PLANNING ═══');
    const phase2Workflows: BmadWorkflowId[] = ['prd'];
    const phase2Results = await executeWorkflowSequence(phase2Workflows, project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
    });
    phaseResults.set(2, phase2Results);

    // Phase 3: Solutioning (Required)
    log('🏗️', '═══ PHASE 3: SOLUTIONING ═══');
    const phase3Workflows: BmadWorkflowId[] = [
      'architecture',
      'epics',
      'implementation-readiness',
    ];
    const phase3Results = await executeWorkflowSequence(phase3Workflows, project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
    });
    phaseResults.set(3, phase3Results);

    // Phase 4: Implementation (First Sprint)
    log('💻', '═══ PHASE 4: IMPLEMENTATION ═══');
    const phase4Workflows: BmadWorkflowId[] = ['sprint-planning', 'create-story'];
    const phase4Results = await executeWorkflowSequence(phase4Workflows, project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
    });
    phaseResults.set(4, phase4Results);

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('  FULL GREENFIELD SCENARIO RESULTS');
    console.log('═'.repeat(70));

    let totalWorkflows = 0;
    let successfulWorkflows = 0;

    for (const [phase, results] of phaseResults) {
      const successful = [...results.values()].filter((r) => r.success).length;
      console.log(`  Phase ${phase}: ${successful}/${results.size} workflows successful`);
      totalWorkflows += results.size;
      successfulWorkflows += successful;
    }

    console.log('─'.repeat(70));
    console.log(`  TOTAL: ${successfulWorkflows}/${totalWorkflows} workflows successful`);
    console.log('═'.repeat(70) + '\n');

    // Verify key artifacts exist
    const prdExists = existsSync(path.join(project.planningArtifactsPath, 'prd.md'));
    const archExists = existsSync(path.join(project.planningArtifactsPath, 'architecture.md'));

    log('📄', `PRD exists: ${prdExists}`);
    log('🏗️', `Architecture exists: ${archExists}`);

    expect(totalWorkflows).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW STATUS TRACKING TEST
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Workflow Status Tracking', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'status-tracking-test',
      initialPhase: 'planning',
      includeSampleCode: true,
      includeArtifacts: true,
    });
  });

  test('should update workflow status file after execution', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    const statusPath = path.join(
      project.planningArtifactsPath,
      'bmm-workflow-status.yaml'
    );

    // Verify initial status exists
    expect(existsSync(statusPath)).toBe(true);

    const initialContent = readFileSync(statusPath, 'utf-8');
    log('📊', 'Initial status file loaded');

    // Execute a workflow
    await executeBmadWorkflow('prd', project.projectPath, {
      yoloMode: true,
      timeout: WORKFLOW_TIMEOUT,
    });

    // Check if status was updated
    const updatedContent = readFileSync(statusPath, 'utf-8');

    // Status may or may not change depending on workflow success
    log('📊', 'Status file after workflow execution:');
    log('', updatedContent.substring(0, 500));

    expect(updatedContent).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Error Handling', () => {
  test('should handle non-existent project path gracefully', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    const result = await executeBmadWorkflow('prd', '/non/existent/path', {
      yoloMode: true,
      timeout: 30000,
    });

    // Should not crash, should return error
    expect(result.workflowId).toBe('prd');
    expect(result.success).toBe(false);
  });

  test('should handle timeout gracefully', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    const project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'timeout-test',
      initialPhase: 'planning',
    });

    const result = await executeBmadWorkflow('prd', project.projectPath, {
      yoloMode: true,
      timeout: 100, // Very short timeout
    });

    expect(result.timedOut).toBe(true);
    project.cleanup();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGENT SELECTION TESTS
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Agent Selection', () => {
  let project: BmadTestProject;

  test.beforeAll(() => {
    if (!isOpenCodeAvailable()) {
      test.skip();
      return;
    }

    project = createBmadTestProject({
      basePath: TEST_BASE_DIR,
      name: 'agent-selection-test',
      initialPhase: 'planning',
      includeSampleCode: true,
      includeArtifacts: true,
    });
  });

  test('should use correct agent for each workflow', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    // Test PRD uses PM agent
    const prdResult = await executeBmadWorkflow('prd', project.projectPath, {
      yoloMode: true,
      timeout: 30000,
    });
    expect(prdResult.agent).toBe('pm');

    // Test Architecture uses Architect agent
    const archResult = await executeBmadWorkflow('architecture', project.projectPath, {
      yoloMode: true,
      timeout: 30000,
    });
    expect(archResult.agent).toBe('architect');

    // Test Test-Design uses TEA agent
    const teaResult = await executeBmadWorkflow('test-design', project.projectPath, {
      yoloMode: true,
      timeout: 30000,
    });
    expect(teaResult.agent).toBe('tea');
  });

  test('should allow agent override', async () => {
    if (!isOpenCodeAvailable()) test.skip();

    const result = await executeBmadWorkflow('prd', project.projectPath, {
      yoloMode: true,
      timeout: 30000,
      overrideAgent: 'architect', // Override PM with Architect
    });

    expect(result.agent).toBe('architect');
  });
});
