/**
 * Gate Check Manager Tests
 * 
 * Unit tests for the implementation-readiness gate check system.
 * Tests FR41-FR44: Gate check features
 * 
 * @story 9.2 - Backend Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { readFile, stat } from 'fs/promises';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
}));

// Mock status manager
vi.mock('../status-manager', () => ({
  getStatusManager: vi.fn(() => ({
    read: vi.fn(),
    updateWorkflowStatus: vi.fn(),
  })),
}));

// Mock debug logger
vi.mock('../../debug-logger', () => ({
  debugLogger: {
    bmad: vi.fn(),
  },
}));

// Import after mocks
import { 
  GateCheckManager, 
  getGateCheckManager, 
  disposeGateCheckManager,
  GateCheckItem,
  GateCheckResult,
} from '../gate-check-manager';
import { getStatusManager } from '../status-manager';

const mockExistsSync = vi.mocked(existsSync);
const mockReadFile = vi.mocked(readFile);
const mockStat = vi.mocked(stat);
const mockGetStatusManager = vi.mocked(getStatusManager);

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

function setupMockArtifacts(artifacts: { [key: string]: { exists: boolean; content?: string; size?: number } }) {
  mockExistsSync.mockImplementation((path: unknown) => {
    const pathStr = String(path);
    for (const [key, value] of Object.entries(artifacts)) {
      if (pathStr.includes(key)) {
        return value.exists;
      }
    }
    return false;
  });

  mockReadFile.mockImplementation(async (path: unknown) => {
    const pathStr = String(path);
    for (const [key, value] of Object.entries(artifacts)) {
      if (pathStr.includes(key) && value.content) {
        return value.content;
      }
    }
    throw new Error('File not found');
  });

  mockStat.mockImplementation(async () => {
    return { size: 1024 } as unknown as Awaited<ReturnType<typeof stat>>;
  });
}

function setupMockWorkflowStatus(status: unknown) {
  mockGetStatusManager.mockReturnValue({
    read: vi.fn().mockResolvedValue({ success: true, data: status }),
    updateWorkflowStatus: vi.fn().mockResolvedValue({ success: true }),
  } as unknown as ReturnType<typeof getStatusManager>);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR41 - Run Gate Check Before Phase 4
// ─────────────────────────────────────────────────────────────────────────────

describe('FR41: Run Gate Check Before Phase 4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeGateCheckManager();
  });

  afterEach(() => {
    disposeGateCheckManager();
  });

  it('should run gate check and return results', async () => {
    setupMockArtifacts({
      'prd.md': { exists: true, content: 'A'.repeat(200), size: 2048 },
      'architecture.md': { exists: true, content: 'B'.repeat(200), size: 3072 },
      'epics/index.md': { exists: true, content: 'C'.repeat(200), size: 1024 },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { workflows: { architecture: { status: 'completed' }, epics: { status: 'completed' } } },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeDefined();
      expect(result.data.items.length).toBeGreaterThan(0);
      expect(result.data.checkedAt).toBeDefined();
    }
  });

  it('should check for PRD artifact', async () => {
    setupMockArtifacts({
      'prd.md': { exists: true, content: 'PRD content here'.repeat(20), size: 1024 },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      const prdItem = result.data.items.find((i: GateCheckItem) => i.id === 'prd');
      expect(prdItem).toBeDefined();
      expect(prdItem?.status).toBe('pass');
    } else {
      expect.fail('Gate check should succeed');
    }
  });

  it('should check for Architecture artifact', async () => {
    setupMockArtifacts({
      'architecture.md': { exists: true, content: 'Architecture content'.repeat(20), size: 2048 },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: { architecture: { status: 'completed' } } },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      const archItem = result.data.items.find((i: GateCheckItem) => i.id === 'architecture');
      expect(archItem).toBeDefined();
    }
  });

  it('should check for Epics artifact in multiple locations', async () => {
    // Test epics.md
    setupMockArtifacts({
      'epics.md': { exists: true, content: 'Epics content'.repeat(20), size: 1024 },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: { epics: { status: 'completed' } } },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      const epicsItem = result.data.items.find((i: GateCheckItem) => i.id === 'epics');
      expect(epicsItem).toBeDefined();
    }
  });

  it('should check optional UX design artifact', async () => {
    setupMockArtifacts({
      'ux-design.md': { exists: false },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      const uxItem = result.data.items.find((i: GateCheckItem) => i.id === 'ux-design');
      expect(uxItem).toBeDefined();
      expect(uxItem?.status).toBe('skipped'); // Optional, so skipped not failed
    }
  });

  it('should check workflow status completion', async () => {
    setupMockArtifacts({});

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { 
          workflows: { 
            architecture: { status: 'completed' }, 
            epics: { status: 'completed' } 
          } 
        },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      const statusItem = result.data.items.find((i: GateCheckItem) => i.id === 'workflow-status');
      expect(statusItem).toBeDefined();
      expect(statusItem?.status).toBe('pass');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR42 - View Gate Check Results
// ─────────────────────────────────────────────────────────────────────────────

describe('FR42: View Gate Check Results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeGateCheckManager();
  });

  it('should return summary with counts', async () => {
    setupMockArtifacts({
      'prd.md': { exists: true, content: 'PRD'.repeat(100), size: 1024 },
      'architecture.md': { exists: false },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.total).toBeGreaterThan(0);
      expect(typeof result.data.summary.passed).toBe('number');
      expect(typeof result.data.summary.failed).toBe('number');
      expect(typeof result.data.summary.warnings).toBe('number');
      expect(typeof result.data.summary.skipped).toBe('number');
    }
  });

  it('should return blocking issues list', async () => {
    setupMockArtifacts({
      'prd.md': { exists: false },
      'architecture.md': { exists: false },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      expect(result.data.blockingIssues).toBeDefined();
      expect(result.data.blockingIssues.length).toBeGreaterThan(0);
    }
  });

  it('should store last result', async () => {
    setupMockArtifacts({
      'prd.md': { exists: true, content: 'PRD'.repeat(100), size: 1024 },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    const lastResult = manager.getLastResult();
    expect(lastResult).not.toBeNull();
    expect(lastResult?.checkedAt).toBeDefined();
  });

  it('should emit event on gate check complete', async () => {
    setupMockArtifacts({});

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const eventHandler = vi.fn();
    manager.on('gate-check-complete', eventHandler);

    await manager.runGateCheck();

    expect(eventHandler).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR43 - Block Phase 4 on Failure
// ─────────────────────────────────────────────────────────────────────────────

describe('FR43: Block Phase 4 on Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeGateCheckManager();
  });

  it('should block Phase 4 if no gate check has been run', () => {
    const manager = new GateCheckManager('/test/project');
    expect(manager.shouldBlockPhase4()).toBe(true);
  });

  it('should block Phase 4 if gate check failed', async () => {
    setupMockArtifacts({
      'prd.md': { exists: false }, // Missing required artifact
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    expect(manager.shouldBlockPhase4()).toBe(true);
    expect(manager.getBlockingReasons().length).toBeGreaterThan(0);
  });

  it('should not block Phase 4 if gate check passed', async () => {
    setupMockArtifacts({
      'prd.md': { exists: true, content: 'PRD content'.repeat(20), size: 2048 },
      'architecture.md': { exists: true, content: 'Arch content'.repeat(20), size: 3072 },
      'epics/index.md': { exists: true, content: 'Epics content'.repeat(20), size: 1024 },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { 
          workflows: { 
            architecture: { status: 'completed' }, 
            epics: { status: 'completed' } 
          } 
        },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    expect(manager.shouldBlockPhase4()).toBe(false);
    expect(manager.getBlockingReasons()).toHaveLength(0);
  });

  it('should return blocking reasons', async () => {
    setupMockArtifacts({
      'prd.md': { exists: false },
      'architecture.md': { exists: false },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    const reasons = manager.getBlockingReasons();
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.some((r: string) => r.includes('PRD') || r.includes('Product'))).toBe(true);
  });

  it('should fail if required artifact content is too short', async () => {
    setupMockArtifacts({
      'prd.md': { exists: true, content: 'Too short', size: 9 }, // Less than 100 chars
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: { prd: { status: 'completed' } } },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    const prdItem = manager.getLastResult()?.items.find((i: GateCheckItem) => i.id === 'prd');
    expect(prdItem?.status).toBe('fail');
    expect(prdItem?.message).toContain('incomplete');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR44 - Override Gate Check
// ─────────────────────────────────────────────────────────────────────────────

describe('FR44: Override Gate Check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeGateCheckManager();
  });

  it('should allow override with correct confirmation', async () => {
    setupMockArtifacts({
      'prd.md': { exists: false },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    const overrideResult = await manager.overrideGateCheck({
      confirmation: 'I UNDERSTAND',
      reason: 'Testing in development',
      timestamp: new Date(),
    });

    expect(overrideResult.success).toBe(true);
    expect(manager.isGateOverridden()).toBe(true);
    expect(manager.shouldBlockPhase4()).toBe(false);
  });

  it('should reject override with incorrect confirmation', async () => {
    setupMockArtifacts({
      'prd.md': { exists: false },
    });

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    const overrideResult = await manager.overrideGateCheck({
      confirmation: 'i understand', // Wrong case
      timestamp: new Date(),
    });

    expect(overrideResult.success).toBe(false);
    if (!overrideResult.success) {
      expect(overrideResult.error.code).toBe('INVALID_CONFIRMATION');
    }
    expect(manager.isGateOverridden()).toBe(false);
  });

  it('should update workflow status when overridden', async () => {
    const mockUpdateStatus = vi.fn().mockResolvedValue({ success: true });
    mockGetStatusManager.mockReturnValue({
      read: vi.fn().mockResolvedValue({ 
        success: true, 
        data: { phases: { planning: { workflows: {} }, solutioning: { workflows: {} } } } 
      }),
      updateWorkflowStatus: mockUpdateStatus,
    } as unknown as ReturnType<typeof getStatusManager>);

    setupMockArtifacts({});

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    await manager.overrideGateCheck({
      confirmation: 'I UNDERSTAND',
      reason: 'Development override',
      timestamp: new Date(),
    });

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'solutioning',
      'implementation-readiness',
      'completed',
      expect.objectContaining({
        result: 'OVERRIDDEN',
        note: expect.stringContaining('Development override'),
      })
    );
  });

  it('should emit event when overridden', async () => {
    setupMockArtifacts({});

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    const eventHandler = vi.fn();
    manager.on('gate-override', eventHandler);

    await manager.overrideGateCheck({
      confirmation: 'I UNDERSTAND',
      timestamp: new Date(),
    });

    expect(eventHandler).toHaveBeenCalled();
  });

  it('should be able to reset override', async () => {
    setupMockArtifacts({});

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    await manager.overrideGateCheck({
      confirmation: 'I UNDERSTAND',
      timestamp: new Date(),
    });

    expect(manager.isGateOverridden()).toBe(true);

    manager.resetOverride();

    expect(manager.isGateOverridden()).toBe(false);
    expect(manager.getLastResult()?.overridden).toBe(false);
  });

  it('should emit event when override is reset', async () => {
    setupMockArtifacts({});

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    await manager.runGateCheck();

    await manager.overrideGateCheck({
      confirmation: 'I UNDERSTAND',
      timestamp: new Date(),
    });

    const eventHandler = vi.fn();
    manager.on('gate-override-reset', eventHandler);

    manager.resetOverride();

    expect(eventHandler).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Singleton Management
// ─────────────────────────────────────────────────────────────────────────────

describe('Gate Check Manager Singleton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeGateCheckManager();
  });

  afterEach(() => {
    disposeGateCheckManager();
  });

  it('should return same instance for same project path', () => {
    const manager1 = getGateCheckManager('/test/project');
    const manager2 = getGateCheckManager('/test/project');
    expect(manager1).toBe(manager2);
  });

  it('should create new instance for different project path', () => {
    const manager1 = getGateCheckManager('/test/project1');
    const manager2 = getGateCheckManager('/test/project2');
    expect(manager1).not.toBe(manager2);
  });

  it('should dispose manager correctly', () => {
    const manager = getGateCheckManager('/test/project');
    disposeGateCheckManager();
    
    // Getting manager again should create a new instance
    const newManager = getGateCheckManager('/test/project');
    expect(newManager).not.toBe(manager);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Error Handling
// ─────────────────────────────────────────────────────────────────────────────

describe('Gate Check Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    disposeGateCheckManager();
  });

  it('should handle file read errors gracefully', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockRejectedValue(new Error('Permission denied'));

    setupMockWorkflowStatus({
      phases: {
        planning: { workflows: {} },
        solutioning: { workflows: {} },
      },
    });

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    // Should not throw, but should mark item as failed
    expect(result.success).toBe(true);
    if (result.success) {
      const prdItem = result.data.items.find((i: GateCheckItem) => i.id === 'prd');
      expect(prdItem?.status).toBe('fail');
      expect(prdItem?.message).toContain('Permission denied');
    }
  });

  it('should handle status manager read failure', async () => {
    setupMockArtifacts({});

    mockGetStatusManager.mockReturnValue({
      read: vi.fn().mockResolvedValue({ 
        success: false, 
        error: { message: 'Failed to read status' } 
      }),
      updateWorkflowStatus: vi.fn(),
    } as unknown as ReturnType<typeof getStatusManager>);

    const manager = new GateCheckManager('/test/project');
    const result = await manager.runGateCheck();

    if (result.success) {
      const statusItem = result.data.items.find((i: GateCheckItem) => i.id === 'workflow-status');
      expect(statusItem?.status).toBe('fail');
      expect(statusItem?.message).toContain('Could not read');
    }
  });
});
