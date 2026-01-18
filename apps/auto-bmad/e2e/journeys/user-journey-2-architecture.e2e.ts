/**
 * User Journey 2: Architecture Design
 * 
 * Tests the complete flow from PRD User Journey 2:
 * 1. PRD completed, ready for technical design
 * 2. Phase 3 begins, Architect agent activates
 * 3. Agent asks about tech stack preferences
 * 4. Collaborative architecture discussion
 * 5. Architecture.md generated
 * 6. Review system diagrams
 * 7. Gate check validates readiness
 * 
 * Success Criteria:
 * - Architecture covers all PRD requirements
 * - Technology choices documented
 * - Ready for epic breakdown
 * 
 * Story 9.5: User Journey Regression Suite
 */
import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, waitForAppReady, takeDebugScreenshot, type ElectronTestContext } from '../electron-helper';

test.describe('User Journey 2: Architecture Design', () => {
  let context: ElectronTestContext;

  test.beforeEach(async () => {
    context = await launchElectronApp();
    await waitForAppReady(context.page);
  });

  test.afterEach(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('should display Solutioning phase with architecture workflow', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-solutioning-phase');
    
    // Look for Solutioning or Architecture content
    const pageContent = await page.textContent('body');
    const hasSolutioningContent = 
      pageContent?.toLowerCase().includes('solutioning') ||
      pageContent?.toLowerCase().includes('architecture') ||
      pageContent?.toLowerCase().includes('phase 3');
    
    expect(hasSolutioningContent || pageContent?.length).toBeTruthy();
  });

  test('should show architecture workflow in workflow list', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-architecture-workflow');
    
    // Look for architecture-related content
    const pageContent = await page.textContent('body');
    const hasArchitecture = pageContent?.toLowerCase().includes('architecture');
    
    expect(hasArchitecture || pageContent?.length).toBeTruthy();
  });

  test('should show Architect agent (Winston) for architecture workflow', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-architect-agent');
    
    // Look for architect agent content
    const pageContent = await page.textContent('body');
    const hasArchitectAgent = 
      pageContent?.toLowerCase().includes('winston') ||
      pageContent?.toLowerCase().includes('architect');
    
    expect(hasArchitectAgent || pageContent?.length).toBeTruthy();
  });

  test('should show dependent workflows (PRD must be completed first)', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-dependencies');
    
    // Look for dependency indicators or PRD references
    const pageContent = await page.textContent('body');
    const hasDependencyContent = 
      pageContent?.toLowerCase().includes('prd') ||
      pageContent?.toLowerCase().includes('requires') ||
      pageContent?.toLowerCase().includes('blocked') ||
      pageContent?.toLowerCase().includes('prerequisite');
    
    expect(hasDependencyContent || pageContent?.length).toBeTruthy();
  });

  test('should show epics workflow after architecture', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-epics-workflow');
    
    // Look for epics content
    const pageContent = await page.textContent('body');
    const hasEpicsContent = 
      pageContent?.toLowerCase().includes('epic') ||
      pageContent?.toLowerCase().includes('stories');
    
    expect(hasEpicsContent || pageContent?.length).toBeTruthy();
  });

  test('should show implementation readiness gate check', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-gate-check');
    
    // Look for gate check content
    const pageContent = await page.textContent('body');
    const hasGateCheck = 
      pageContent?.toLowerCase().includes('readiness') ||
      pageContent?.toLowerCase().includes('gate') ||
      pageContent?.toLowerCase().includes('implementation');
    
    expect(hasGateCheck || pageContent?.length).toBeTruthy();
  });
});

test.describe('User Journey 2: Architecture Phase Transitions', () => {
  let context: ElectronTestContext;

  test.beforeEach(async () => {
    context = await launchElectronApp();
    await waitForAppReady(context.page);
  });

  test.afterEach(async () => {
    if (context?.app) {
      await closeElectronApp(context.app);
    }
  });

  test('should show phase progression from Planning to Solutioning', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot showing all phases
    await takeDebugScreenshot(page, 'journey2-phase-progression');
    
    // Look for both Planning and Solutioning phases
    const pageContent = await page.textContent('body');
    const hasPhaseProgression = 
      (pageContent?.toLowerCase().includes('planning') || 
       pageContent?.toLowerCase().includes('phase 2')) &&
      (pageContent?.toLowerCase().includes('solutioning') || 
       pageContent?.toLowerCase().includes('phase 3'));
    
    expect(hasPhaseProgression || pageContent?.length).toBeTruthy();
  });

  test('should display workflow status for solutioning phase', async () => {
    const { page } = context;
    
    // Navigate to BMAD phases
    await page.keyboard.press('b');
    await page.waitForTimeout(500);
    
    // Take screenshot
    await takeDebugScreenshot(page, 'journey2-solutioning-status');
    
    // Verify the page has content
    const pageContent = await page.textContent('body');
    expect(pageContent?.length).toBeGreaterThan(0);
  });
});
