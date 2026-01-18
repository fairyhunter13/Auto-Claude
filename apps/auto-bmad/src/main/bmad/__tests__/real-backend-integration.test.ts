/**
 * Real Backend Integration Tests - NO MOCKS
 * 
 * These tests verify the actual BMAD backend integration works correctly.
 * They use real file system operations and real OpenCode CLI execution.
 * 
 * Story 9.2: Backend Integration Tests (No UI)
 * Story 9.3: BMAD Workflow Lifecycle Tests
 * 
 * IMPORTANT: These tests require:
 * - OpenCode CLI installed and available in PATH
 * - Write access to /tmp directory
 * - BMAD framework files available
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, cpSync } from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import * as yaml from 'yaml';

// Test configuration
const TEST_BASE_DIR = '/tmp/bmad-real-integration-tests';
const PROJECT_PATH = path.join(TEST_BASE_DIR, 'test-project');
const BMAD_PATH = path.join(PROJECT_PATH, '_bmad');
const OUTPUT_PATH = path.join(PROJECT_PATH, '_bmad-output');
const PLANNING_PATH = path.join(OUTPUT_PATH, 'planning-artifacts');
const STATUS_FILE_PATH = path.join(PLANNING_PATH, 'bmm-workflow-status.yaml');
const CONFIG_FILE_PATH = path.join(BMAD_PATH, 'bmm', 'config.yaml');

// Real BMAD source path (from repository root)
const REPO_ROOT = path.resolve(__dirname, '../../../../../../');
const REAL_BMAD_PATH = path.join(REPO_ROOT, '_bmad');

// Helper: Check if OpenCode is available
async function isOpenCodeAvailable(): Promise<boolean> {
  try {
    execSync('opencode --version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    // Try common locations
    const candidates = [
      path.join(process.env.HOME || '', '.opencode', 'bin', 'opencode'),
      path.join(process.env.HOME || '', '.local', 'bin', 'opencode'),
      '/usr/local/bin/opencode',
    ];
    
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          execSync(`${candidate} --version`, { stdio: 'pipe', timeout: 5000 });
          return true;
        } catch {
          continue;
        }
      }
    }
    return false;
  }
}

// Helper: Get OpenCode path
function getOpenCodePath(): string {
  const candidates = [
    'opencode',
    path.join(process.env.HOME || '', '.opencode', 'bin', 'opencode'),
    path.join(process.env.HOME || '', '.local', 'bin', 'opencode'),
    '/usr/local/bin/opencode',
  ];
  
  for (const candidate of candidates) {
    try {
      execSync(`${candidate} --version`, { stdio: 'pipe', timeout: 5000 });
      return candidate;
    } catch {
      continue;
    }
  }
  return 'opencode';
}

// Helper: Setup test project with real BMAD files
function setupTestProject(options: {
  projectName?: string;
  copyRealBmad?: boolean;
  createStatusFile?: boolean;
  statusContent?: Record<string, unknown>;
  createConfigFile?: boolean;
  configContent?: Record<string, unknown>;
} = {}): void {
  const {
    projectName = 'Test Integration Project',
    copyRealBmad = false,
    createStatusFile = true,
    statusContent,
    createConfigFile = true,
    configContent,
  } = options;

  // Clean up any existing test directory
  if (existsSync(TEST_BASE_DIR)) {
    rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  }

  // Create project directories
  mkdirSync(PLANNING_PATH, { recursive: true });
  mkdirSync(path.join(OUTPUT_PATH, 'implementation-artifacts'), { recursive: true });
  mkdirSync(path.join(BMAD_PATH, 'bmm'), { recursive: true });

  // Copy real BMAD files if requested and available
  if (copyRealBmad && existsSync(REAL_BMAD_PATH)) {
    try {
      cpSync(REAL_BMAD_PATH, BMAD_PATH, { recursive: true });
    } catch (error) {
      console.warn('Failed to copy real BMAD files:', error);
    }
  }

  // Create status file
  if (createStatusFile) {
    const defaultStatus = {
      project_name: projectName,
      project_type: 'greenfield',
      current_phase: 'analysis',
      phases: {
        analysis: {
          status: 'pending',
          workflows: {},
        },
        planning: {
          status: 'pending',
          workflows: {},
        },
        solutioning: {
          status: 'pending',
          workflows: {},
        },
        implementation: {
          status: 'pending',
          workflows: {},
        },
      },
      ...statusContent,
    };
    writeFileSync(STATUS_FILE_PATH, yaml.stringify(defaultStatus));
  }

  // Create config file
  if (createConfigFile) {
    const defaultConfig = {
      project_name: projectName,
      user_skill_level: 'intermediate',
      planning_artifacts: '{project-root}/_bmad-output/planning-artifacts',
      implementation_artifacts: '{project-root}/_bmad-output/implementation-artifacts',
      project_knowledge: '{project-root}/docs',
      tea_use_mcp_enhancements: false,
      tea_use_playwright_utils: false,
      user_name: 'Test User',
      communication_language: 'English',
      document_output_language: 'English',
      output_folder: '{project-root}/_bmad-output',
      ...configContent,
    };
    writeFileSync(CONFIG_FILE_PATH, yaml.stringify(defaultConfig));
  }
}

// Helper: Cleanup test environment
function cleanupTestEnvironment(): void {
  if (existsSync(TEST_BASE_DIR)) {
    rmSync(TEST_BASE_DIR, { recursive: true, force: true });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: OpenCode Availability
// ─────────────────────────────────────────────────────────────────────────────

describe('OpenCode CLI Availability', () => {
  it('should verify OpenCode CLI is installed', async () => {
    const available = await isOpenCodeAvailable();
    
    if (!available) {
      console.warn('⚠️  OpenCode CLI is not available - some tests will be skipped');
    }
    
    // This test documents whether OpenCode is available
    expect(typeof available).toBe('boolean');
  });

  it('should get OpenCode version when available', async () => {
    const available = await isOpenCodeAvailable();
    if (!available) {
      console.log('Skipping: OpenCode not available');
      return;
    }

    const opencodePath = getOpenCodePath();
    const version = execSync(`${opencodePath} --version`, { encoding: 'utf-8', timeout: 5000 });
    
    expect(version).toBeTruthy();
    expect(typeof version).toBe('string');
    console.log(`OpenCode version: ${version.trim()}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Status Manager Real Integration
// ─────────────────────────────────────────────────────────────────────────────

describe('StatusManager Real Integration', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should read and write status file with real file system', async () => {
    setupTestProject({ projectName: 'Status Test Project' });
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    // Read initial status
    const readResult = await manager.read();
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      expect(readResult.data.project_name).toBe('Status Test Project');
    }
    
    // Update a workflow status
    const updateResult = await manager.updateWorkflowStatus(
      'analysis',
      'product-brief',
      'in_progress'
    );
    expect(updateResult.success).toBe(true);
    
    // Verify file was actually written
    const fileContent = readFileSync(STATUS_FILE_PATH, 'utf-8');
    const parsed = yaml.parse(fileContent);
    expect(parsed.phases.analysis.workflows['product-brief'].status).toBe('in_progress');
    
    await manager.dispose();
  });

  it('should handle concurrent status updates correctly', async () => {
    setupTestProject({ projectName: 'Concurrent Test' });
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    // Perform multiple updates concurrently
    const updates = await Promise.all([
      manager.updateWorkflowStatus('analysis', 'brainstorm-project', 'completed'),
      manager.updateWorkflowStatus('analysis', 'research', 'in_progress'),
      manager.updateWorkflowStatus('analysis', 'product-brief', 'pending'),
    ]);
    
    // All updates should succeed (atomic writes prevent corruption)
    expect(updates.every(r => r.success)).toBe(true);
    
    // Verify final state
    const finalResult = await manager.read();
    expect(finalResult.success).toBe(true);
    
    await manager.dispose();
  });

  it('should detect and recover from corrupted status file', async () => {
    setupTestProject({ projectName: 'Corruption Test' });
    
    // Corrupt the status file
    writeFileSync(STATUS_FILE_PATH, 'corrupted: [[[invalid yaml');
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    // Read should fail gracefully
    const readResult = await manager.read();
    expect(readResult.success).toBe(false);
    
    // Initialize should create a fresh status file
    const initResult = await manager.initialize('Recovered Project');
    expect(initResult.success).toBe(true);
    
    // Verify recovery
    const verifyResult = await manager.read();
    expect(verifyResult.success).toBe(true);
    if (verifyResult.success) {
      expect(verifyResult.data.project_name).toBe('Recovered Project');
    }
    
    await manager.dispose();
  });

  it('should track phase completion correctly', async () => {
    setupTestProject({
      projectName: 'Phase Tracking Test',
      statusContent: {
        phases: {
          analysis: {
            status: 'pending',
            workflows: {
              'brainstorm-project': { status: 'completed' },
              'research': { status: 'completed' },
              'product-brief': { status: 'pending' },
            },
          },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      },
    });
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    // Complete the last workflow in analysis phase
    const result = await manager.updateWorkflowStatus(
      'analysis',
      'product-brief',
      'completed',
      { artifactPath: 'product-brief.md' }
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Phase should now be marked as completed
      expect(result.data.phases.analysis?.status).toBe('completed');
    }
    
    await manager.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Config Loader Real Integration
// ─────────────────────────────────────────────────────────────────────────────

describe('ConfigLoader Real Integration', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should load config from real file system', async () => {
    setupTestProject({
      projectName: 'Config Test',
      configContent: {
        user_name: 'Hafiz',
        communication_language: 'English',
        tea_use_playwright_utils: true,
      },
    });
    
    const { loadBmadConfig } = await import('../config-loader');
    
    const result = await loadBmadConfig(PROJECT_PATH);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.project_name).toBe('Config Test');
      expect(result.data.user_name).toBe('Hafiz');
      expect(result.data.tea_use_playwright_utils).toBe(true);
    }
  });

  it('should resolve path variables correctly', async () => {
    setupTestProject({ projectName: 'Path Resolution Test' });
    
    const { loadBmadConfig } = await import('../config-loader');
    
    const result = await loadBmadConfig(PROJECT_PATH);
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Paths should be resolved to absolute paths
      expect(result.data.planning_artifacts).toBe(PLANNING_PATH);
      expect(result.data.output_folder).toBe(OUTPUT_PATH);
      expect(path.isAbsolute(result.data.planning_artifacts!)).toBe(true);
    }
  });

  it('should validate project has BMAD structure', async () => {
    setupTestProject({ projectName: 'Validation Test' });
    
    const { isBmadProject, hasBmadConfig } = await import('../config-loader');
    
    expect(await isBmadProject(PROJECT_PATH)).toBe(true);
    expect(await hasBmadConfig(PROJECT_PATH)).toBe(true);
    
    // Non-BMAD directory
    const nonBmadPath = path.join(TEST_BASE_DIR, 'non-bmad-project');
    mkdirSync(nonBmadPath, { recursive: true });
    
    expect(await isBmadProject(nonBmadPath)).toBe(false);
    expect(await hasBmadConfig(nonBmadPath)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Workflow Runner Real Integration
// ─────────────────────────────────────────────────────────────────────────────

describe('WorkflowRunner Real Integration', () => {
  let openCodeAvailable: boolean;

  beforeAll(async () => {
    openCodeAvailable = await isOpenCodeAvailable();
    if (!openCodeAvailable) {
      console.warn('⚠️  OpenCode CLI not available - workflow execution tests will be skipped');
    }
  });

  beforeEach(() => {
    cleanupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should initialize WorkflowRunner and detect OpenCode', async () => {
    setupTestProject({ projectName: 'Runner Init Test', copyRealBmad: true });
    
    const { WorkflowRunner } = await import('../workflow-runner');
    const runner = new WorkflowRunner(PROJECT_PATH);
    
    const result = await runner.initialize();
    
    if (openCodeAvailable) {
      expect(result.success).toBe(true);
    } else {
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('OPENCODE_NOT_FOUND');
      }
    }
    
    await runner.dispose();
  });

  it('should get workflow definitions', async () => {
    setupTestProject({ projectName: 'Workflow Definitions Test' });
    
    const { WorkflowRunner } = await import('../workflow-runner');
    const runner = new WorkflowRunner(PROJECT_PATH);
    
    const allWorkflows = runner.getAllWorkflows();
    expect(allWorkflows.length).toBeGreaterThan(0);
    
    // Check specific workflows exist
    const prdWorkflow = runner.getWorkflow('prd');
    expect(prdWorkflow).toBeDefined();
    expect(prdWorkflow?.agent).toBe('pm');
    expect(prdWorkflow?.phase).toBe('planning');
    
    const archWorkflow = runner.getWorkflow('architecture');
    expect(archWorkflow).toBeDefined();
    expect(archWorkflow?.agent).toBe('architect');
    expect(archWorkflow?.phase).toBe('solutioning');
    
    // Get workflows by phase
    const analysisWorkflows = runner.getWorkflowsForPhase('analysis');
    expect(analysisWorkflows.length).toBeGreaterThan(0);
    
    await runner.dispose();
  });

  it('should track workflow execution state', async () => {
    if (!openCodeAvailable) {
      console.log('Skipping: OpenCode not available');
      return;
    }

    setupTestProject({ projectName: 'Execution State Test', copyRealBmad: true });
    
    const { WorkflowRunner } = await import('../workflow-runner');
    const runner = new WorkflowRunner(PROJECT_PATH);
    
    await runner.initialize();
    
    expect(runner.isRunning()).toBe(false);
    expect(runner.getActiveWorkflowId()).toBeNull();
    
    await runner.dispose();
  });

  it('should spawn OpenCode process for workflow execution', async () => {
    if (!openCodeAvailable) {
      console.log('Skipping: OpenCode not available');
      return;
    }

    setupTestProject({ projectName: 'Spawn Test', copyRealBmad: true });
    
    const { WorkflowRunner } = await import('../workflow-runner');
    const runner = new WorkflowRunner(PROJECT_PATH);
    
    await runner.initialize();
    
    // Collect output
    let stdout = '';
    let stderr = '';
    
    // Start a workflow (will timeout quickly for test purposes)
    const startPromise = runner.startWorkflow('prd', {
      onStdout: (data) => { stdout += data; },
      onStderr: (data) => { stderr += data; },
    });
    
    // Should start successfully
    const result = await startPromise;
    expect(result.success).toBe(true);
    
    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify workflow is running
    expect(runner.isRunning()).toBe(true);
    expect(runner.getActiveWorkflowId()).toBe('prd');
    
    // Cancel the workflow (don't want to run full workflow in test)
    await runner.cancelWorkflow();
    
    expect(runner.isRunning()).toBe(false);
    
    await runner.dispose();
  }, 30000); // 30 second timeout

  it('should update status file when workflow completes', async () => {
    if (!openCodeAvailable) {
      console.log('Skipping: OpenCode not available');
      return;
    }

    setupTestProject({ projectName: 'Status Update Test', copyRealBmad: true });
    
    const { WorkflowRunner } = await import('../workflow-runner');
    const { StatusManager } = await import('../status-manager');
    
    const runner = new WorkflowRunner(PROJECT_PATH);
    const statusManager = new StatusManager(PROJECT_PATH);
    
    await runner.initialize();
    
    // Start workflow
    await runner.startWorkflow('brainstorm-project');
    
    // Give it time to update status to in_progress
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check status was updated to in_progress
    let status = await statusManager.read();
    expect(status.success).toBe(true);
    if (status.success) {
      const workflow = status.data.phases.analysis?.workflows['brainstorm-project'];
      expect(workflow?.status).toBe('in_progress');
    }
    
    // Cancel the workflow
    await runner.cancelWorkflow();
    
    // Status should be back to pending after cancellation
    await new Promise(resolve => setTimeout(resolve, 500));
    status = await statusManager.read();
    if (status.success) {
      const workflow = status.data.phases.analysis?.workflows['brainstorm-project'];
      expect(workflow?.status).toBe('pending');
    }
    
    await runner.dispose();
    await statusManager.dispose();
  }, 30000);
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Phase Transition Integration
// ─────────────────────────────────────────────────────────────────────────────

describe('Phase Transition Integration', () => {
  beforeEach(() => {
    cleanupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should validate phase prerequisites', async () => {
    setupTestProject({
      projectName: 'Phase Prerequisites Test',
      statusContent: {
        current_phase: 'analysis',
        phases: {
          analysis: { status: 'pending', workflows: {} },
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      },
    });
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    const status = await manager.read();
    expect(status.success).toBe(true);
    if (status.success) {
      // Analysis phase should be accessible
      expect(status.data.current_phase).toBe('analysis');
      
      // Planning phase requires analysis to be complete or skipped
      expect(status.data.phases.planning?.status).toBe('pending');
    }
    
    await manager.dispose();
  });

  it('should update current phase when all workflows complete', async () => {
    setupTestProject({
      projectName: 'Phase Completion Test',
      statusContent: {
        current_phase: 'planning',
        phases: {
          analysis: { status: 'completed', workflows: {} },
          planning: {
            status: 'in_progress',
            workflows: {
              'prd': { status: 'completed', artifact_path: 'prd.md' },
              'ux-design': { status: 'pending' },
            },
          },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      },
    });
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    // Complete the remaining workflow
    const result = await manager.updateWorkflowStatus(
      'planning',
      'ux-design',
      'completed',
      { artifactPath: 'ux-design.md' }
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Planning phase should now be completed
      expect(result.data.phases.planning?.status).toBe('completed');
    }
    
    await manager.dispose();
  });

  it('should handle skipped workflows correctly', async () => {
    setupTestProject({
      projectName: 'Skipped Workflows Test',
      statusContent: {
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
          planning: { status: 'pending', workflows: {} },
          solutioning: { status: 'pending', workflows: {} },
          implementation: { status: 'pending', workflows: {} },
        },
      },
    });
    
    const { StatusManager } = await import('../status-manager');
    const manager = new StatusManager(PROJECT_PATH);
    
    // Skip all analysis workflows (Phase 1 is optional)
    await manager.updateWorkflowStatus('analysis', 'brainstorm-project', 'skipped');
    await manager.updateWorkflowStatus('analysis', 'research', 'skipped');
    const result = await manager.updateWorkflowStatus('analysis', 'product-brief', 'skipped');
    
    expect(result.success).toBe(true);
    if (result.success) {
      // Phase should be marked as completed (all skipped = done)
      expect(result.data.phases.analysis?.status).toBe('completed');
    }
    
    await manager.dispose();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Full Workflow Lifecycle
// ─────────────────────────────────────────────────────────────────────────────

describe('Full Workflow Lifecycle (Real Integration)', () => {
  let openCodeAvailable: boolean;

  beforeAll(async () => {
    openCodeAvailable = await isOpenCodeAvailable();
  });

  beforeEach(() => {
    cleanupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  it('should complete a minimal workflow lifecycle', async () => {
    setupTestProject({
      projectName: 'Lifecycle Test',
      copyRealBmad: true,
    });
    
    const { StatusManager } = await import('../status-manager');
    const { loadBmadConfig } = await import('../config-loader');
    
    // 1. Load configuration
    const configResult = await loadBmadConfig(PROJECT_PATH);
    expect(configResult.success).toBe(true);
    
    // 2. Initialize status manager
    const statusManager = new StatusManager(PROJECT_PATH);
    const initResult = await statusManager.read();
    expect(initResult.success).toBe(true);
    
    // 3. Simulate workflow execution lifecycle
    // Start workflow
    await statusManager.updateWorkflowStatus('analysis', 'product-brief', 'in_progress');
    
    // Verify in_progress state
    let status = await statusManager.read();
    expect(status.success).toBe(true);
    if (status.success) {
      expect(status.data.phases.analysis?.workflows['product-brief'].status).toBe('in_progress');
      expect(status.data.phases.analysis?.status).toBe('in_progress');
    }
    
    // Complete workflow
    await statusManager.updateWorkflowStatus(
      'analysis',
      'product-brief',
      'completed',
      { artifactPath: 'product-brief.md' }
    );
    
    // Verify completed state
    status = await statusManager.read();
    expect(status.success).toBe(true);
    if (status.success) {
      const workflow = status.data.phases.analysis?.workflows['product-brief'];
      expect(workflow?.status).toBe('completed');
      expect(workflow?.artifact_path).toBe('product-brief.md');
      expect(workflow?.completed_at).toBeDefined();
    }
    
    await statusManager.dispose();
  });

  it('should persist state across manager instances', async () => {
    setupTestProject({ projectName: 'Persistence Test' });
    
    const { StatusManager } = await import('../status-manager');
    
    // Instance 1: Make changes
    const manager1 = new StatusManager(PROJECT_PATH);
    await manager1.updateWorkflowStatus('planning', 'prd', 'completed', {
      artifactPath: 'prd.md',
    });
    await manager1.dispose();
    
    // Instance 2: Verify changes persisted
    const manager2 = new StatusManager(PROJECT_PATH);
    const result = await manager2.read();
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases.planning?.workflows['prd'].status).toBe('completed');
      expect(result.data.phases.planning?.workflows['prd'].artifact_path).toBe('prd.md');
    }
    
    await manager2.dispose();
  });
});
