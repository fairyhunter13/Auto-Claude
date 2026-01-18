/**
 * Gate Check Store Tests
 * 
 * Unit tests for the gate check renderer store.
 * Tests FR41-FR44: Gate check UI state management
 * 
 * @story 9.2 - Backend Integration Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────────────────────

const mockElectronAPI = {
  bmad: {
    runGateCheck: vi.fn(),
    overrideGateCheck: vi.fn(),
    shouldBlockPhase4: vi.fn(),
  },
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

// Import store after mocking
import { 
  useGateCheckStore,
  selectGateCheckResult,
  selectIsGateCheckRunning,
  selectGateCheckPassed,
} from '../gate-check-store';

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

function resetStore() {
  useGateCheckStore.setState({
    result: null,
    isRunning: false,
    error: null,
    showOverrideDialog: false,
    overrideConfirmation: '',
  });
}

function createMockGateCheckResult(passed: boolean, overridden = false) {
  return {
    passed,
    overridden,
    checkedAt: new Date().toISOString(),
    overriddenAt: overridden ? new Date().toISOString() : undefined,
    items: [
      {
        id: 'prd',
        name: 'Product Requirements Document',
        description: 'Check if PRD exists',
        required: true,
        status: passed ? 'pass' : 'fail',
        message: passed ? 'PRD found' : 'PRD not found',
      },
      {
        id: 'architecture',
        name: 'System Architecture',
        description: 'Check if architecture exists',
        required: true,
        status: passed ? 'pass' : 'fail',
        message: passed ? 'Architecture found' : 'Architecture not found',
      },
    ],
    summary: {
      total: 2,
      passed: passed ? 2 : 0,
      failed: passed ? 0 : 2,
      warnings: 0,
      skipped: 0,
    },
    blockingIssues: passed ? [] : ['PRD not found', 'Architecture not found'],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR41 - Run Gate Check
// ─────────────────────────────────────────────────────────────────────────────

describe('FR41: Run Gate Check from UI', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should run gate check successfully', async () => {
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.result).toBeDefined();
    expect(state.result?.passed).toBe(true);
    expect(state.isRunning).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should set loading state during gate check', async () => {
    let resolvePromise: (value: unknown) => void;
    mockElectronAPI.bmad.runGateCheck.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { runGateCheck } = useGateCheckStore.getState();
    
    const checkPromise = runGateCheck('/test/project');
    
    expect(useGateCheckStore.getState().isRunning).toBe(true);
    
    resolvePromise!({ success: true, data: createMockGateCheckResult(true) });
    await checkPromise;
    
    expect(useGateCheckStore.getState().isRunning).toBe(false);
  });

  it('should handle gate check error', async () => {
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: false,
      error: { message: 'Failed to run gate check' },
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.error).toBe('Failed to run gate check');
    expect(state.result).toBeNull();
  });

  it('should handle exception during gate check', async () => {
    mockElectronAPI.bmad.runGateCheck.mockRejectedValue(new Error('Network error'));

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isRunning).toBe(false);
  });

  it('should convert date strings to Date objects', async () => {
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.result?.checkedAt).toBeInstanceOf(Date);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR42 - Display Gate Check Results
// ─────────────────────────────────────────────────────────────────────────────

describe('FR42: Display Gate Check Results', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should store result items', async () => {
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.result?.items).toHaveLength(2);
    expect(state.result?.items[0].id).toBe('prd');
    expect(state.result?.items[1].id).toBe('architecture');
  });

  it('should store summary counts', async () => {
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.result?.summary.total).toBe(2);
    expect(state.result?.summary.failed).toBe(2);
  });

  it('should store blocking issues', async () => {
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const state = useGateCheckStore.getState();
    expect(state.result?.blockingIssues).toHaveLength(2);
    expect(state.result?.blockingIssues).toContain('PRD not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR43 - Block Phase 4 on Failure
// ─────────────────────────────────────────────────────────────────────────────

describe('FR43: Block Phase 4 on Failure', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should block Phase 4 when no gate check run', () => {
    const { shouldBlockPhase4 } = useGateCheckStore.getState();
    expect(shouldBlockPhase4()).toBe(true);
  });

  it('should block Phase 4 when gate check failed', async () => {
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const { shouldBlockPhase4 } = useGateCheckStore.getState();
    expect(shouldBlockPhase4()).toBe(true);
  });

  it('should not block Phase 4 when gate check passed', async () => {
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const { shouldBlockPhase4 } = useGateCheckStore.getState();
    expect(shouldBlockPhase4()).toBe(false);
  });

  it('should not block Phase 4 when overridden', async () => {
    const mockResult = createMockGateCheckResult(false, true); // Failed but overridden
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const { shouldBlockPhase4 } = useGateCheckStore.getState();
    expect(shouldBlockPhase4()).toBe(false);
  });

  it('should return blocking reasons', async () => {
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const { getBlockingReasons } = useGateCheckStore.getState();
    const reasons = getBlockingReasons();
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons).toContain('PRD not found');
  });

  it('should return "not run" reason when no check run', () => {
    const { getBlockingReasons } = useGateCheckStore.getState();
    const reasons = getBlockingReasons();
    expect(reasons).toContain('Gate check has not been run');
  });

  it('should return empty reasons when passed', async () => {
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();

    await act(async () => {
      await runGateCheck('/test/project');
    });

    const { getBlockingReasons } = useGateCheckStore.getState();
    expect(getBlockingReasons()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR44 - Override Gate Check
// ─────────────────────────────────────────────────────────────────────────────

describe('FR44: Override Gate Check', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should override gate check with correct confirmation', async () => {
    // First run gate check
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();
    await act(async () => {
      await runGateCheck('/test/project');
    });

    // Then override
    const overriddenResult = createMockGateCheckResult(false, true);
    mockElectronAPI.bmad.overrideGateCheck.mockResolvedValue({
      success: true,
      data: overriddenResult,
    });

    const { override } = useGateCheckStore.getState();
    
    let success = false;
    await act(async () => {
      success = await override('/test/project', 'I UNDERSTAND', 'Development testing');
    });

    expect(success).toBe(true);
    const state = useGateCheckStore.getState();
    expect(state.result?.overridden).toBe(true);
    expect(state.showOverrideDialog).toBe(false);
  });

  it('should reject override with incorrect confirmation', async () => {
    mockElectronAPI.bmad.overrideGateCheck.mockResolvedValue({
      success: false,
      error: { message: 'Invalid confirmation' },
    });

    const { override } = useGateCheckStore.getState();
    
    let success = true;
    await act(async () => {
      success = await override('/test/project', 'wrong', 'Some reason');
    });

    expect(success).toBe(false);
    const state = useGateCheckStore.getState();
    expect(state.error).toBe('Invalid confirmation');
  });

  it('should handle override exception', async () => {
    mockElectronAPI.bmad.overrideGateCheck.mockRejectedValue(new Error('Network error'));

    const { override } = useGateCheckStore.getState();
    
    let success = true;
    await act(async () => {
      success = await override('/test/project', 'I UNDERSTAND');
    });

    expect(success).toBe(false);
    expect(useGateCheckStore.getState().error).toBe('Network error');
  });

  it('should manage override dialog visibility', () => {
    const { setShowOverrideDialog } = useGateCheckStore.getState();
    
    setShowOverrideDialog(true);
    expect(useGateCheckStore.getState().showOverrideDialog).toBe(true);
    
    setShowOverrideDialog(false);
    expect(useGateCheckStore.getState().showOverrideDialog).toBe(false);
  });

  it('should clear error and confirmation when showing dialog', () => {
    useGateCheckStore.setState({
      error: 'Previous error',
      overrideConfirmation: 'previous text',
    });

    const { setShowOverrideDialog } = useGateCheckStore.getState();
    setShowOverrideDialog(true);

    const state = useGateCheckStore.getState();
    expect(state.error).toBeNull();
    expect(state.overrideConfirmation).toBe('');
  });

  it('should manage override confirmation text', () => {
    const { setOverrideConfirmation } = useGateCheckStore.getState();
    
    setOverrideConfirmation('I UNDER');
    expect(useGateCheckStore.getState().overrideConfirmation).toBe('I UNDER');
    
    setOverrideConfirmation('I UNDERSTAND');
    expect(useGateCheckStore.getState().overrideConfirmation).toBe('I UNDERSTAND');
  });

  it('should close dialog after successful override', async () => {
    useGateCheckStore.setState({ showOverrideDialog: true });

    const overriddenResult = createMockGateCheckResult(false, true);
    mockElectronAPI.bmad.overrideGateCheck.mockResolvedValue({
      success: true,
      data: overriddenResult,
    });

    const { override } = useGateCheckStore.getState();
    
    await act(async () => {
      await override('/test/project', 'I UNDERSTAND');
    });

    expect(useGateCheckStore.getState().showOverrideDialog).toBe(false);
    expect(useGateCheckStore.getState().overrideConfirmation).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Store Actions
// ─────────────────────────────────────────────────────────────────────────────

describe('Gate Check Store Actions', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should clear error', () => {
    useGateCheckStore.setState({ error: 'Some error' });

    const { clearError } = useGateCheckStore.getState();
    clearError();

    expect(useGateCheckStore.getState().error).toBeNull();
  });

  it('should reset state', async () => {
    // Set some state
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();
    await act(async () => {
      await runGateCheck('/test/project');
    });

    useGateCheckStore.setState({
      error: 'Some error',
      showOverrideDialog: true,
      overrideConfirmation: 'text',
    });

    // Reset
    const { reset } = useGateCheckStore.getState();
    reset();

    const state = useGateCheckStore.getState();
    expect(state.result).toBeNull();
    expect(state.isRunning).toBe(false);
    expect(state.error).toBeNull();
    expect(state.showOverrideDialog).toBe(false);
    expect(state.overrideConfirmation).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Selectors
// ─────────────────────────────────────────────────────────────────────────────

describe('Gate Check Store Selectors', () => {
  beforeEach(() => {
    resetStore();
  });

  it('selectGateCheckResult should return result', async () => {
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();
    await act(async () => {
      await runGateCheck('/test/project');
    });

    const result = selectGateCheckResult(useGateCheckStore.getState());
    expect(result).toBeDefined();
    expect(result?.passed).toBe(true);
  });

  it('selectIsGateCheckRunning should return running state', () => {
    useGateCheckStore.setState({ isRunning: true });
    expect(selectIsGateCheckRunning(useGateCheckStore.getState())).toBe(true);

    useGateCheckStore.setState({ isRunning: false });
    expect(selectIsGateCheckRunning(useGateCheckStore.getState())).toBe(false);
  });

  it('selectGateCheckPassed should return true when passed', async () => {
    const mockResult = createMockGateCheckResult(true);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();
    await act(async () => {
      await runGateCheck('/test/project');
    });

    expect(selectGateCheckPassed(useGateCheckStore.getState())).toBe(true);
  });

  it('selectGateCheckPassed should return true when overridden', async () => {
    const mockResult = createMockGateCheckResult(false, true); // Failed but overridden
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();
    await act(async () => {
      await runGateCheck('/test/project');
    });

    expect(selectGateCheckPassed(useGateCheckStore.getState())).toBe(true);
  });

  it('selectGateCheckPassed should return false when failed', async () => {
    const mockResult = createMockGateCheckResult(false);
    mockElectronAPI.bmad.runGateCheck.mockResolvedValue({
      success: true,
      data: mockResult,
    });

    const { runGateCheck } = useGateCheckStore.getState();
    await act(async () => {
      await runGateCheck('/test/project');
    });

    expect(selectGateCheckPassed(useGateCheckStore.getState())).toBe(false);
  });

  it('selectGateCheckPassed should return false when no result', () => {
    expect(selectGateCheckPassed(useGateCheckStore.getState())).toBe(false);
  });
});
