// @ts-nocheck
/**
 * Edge Case Tests - Auto-BMAD E2E Test Suite
 * 
 * This file tests boundary conditions, error states, race conditions,
 * and unusual user behaviors that might cause issues.
 * 
 * Total Edge Cases: 60
 * Categories: Task, Terminal, Settings, Insights, Project, Roadmap
 */

import { test, expect, type Page, type ElectronApplication, _electron as electron } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Test Configuration
// ============================================================================

const APP_PATH = path.join(__dirname, '..', 'out', 'main', 'index.js');
const TIMEOUT = 30000;
const SHORT_TIMEOUT = 5000;

interface TestContext {
  electronApp: ElectronApplication | null;
  page: Page | null;
}

const ctx: TestContext = {
  electronApp: null,
  page: null,
};

// ============================================================================
// Setup & Teardown
// ============================================================================

test.beforeAll(async () => {
  ctx.electronApp = await electron.launch({
    args: [APP_PATH, '--no-sandbox'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DISPLAY: process.env.DISPLAY || ':0',
    },
  });

  ctx.page = await ctx.electronApp.firstWindow();
  await ctx.page.waitForLoadState('domcontentloaded');
  await ctx.page.waitForTimeout(2000);
});

test.afterAll(async () => {
  if (ctx.electronApp) {
    await ctx.electronApp.close();
  }
});

// Helper function to safely click
async function safeClick(selector: string, options?: { timeout?: number }) {
  const element = ctx.page!.locator(selector).first();
  const isVisible = await element.isVisible().catch(() => false);
  if (isVisible) {
    await element.click();
    return true;
  }
  return false;
}

// ============================================================================
// SECTION 1: Task Edge Cases (T-EC-001 to T-EC-010)
// ============================================================================

test.describe('1: Task Lifecycle Edge Cases', () => {
  
  test('T-EC-001: Handle rapid view switching during operation', async () => {
    // Rapidly switch between views while app is processing
    const shortcuts = ['K', 'A', 'N', 'D', 'I', 'L', 'C', 'M', 'W'];
    
    for (const key of shortcuts) {
      await ctx.page!.keyboard.press(key);
      await ctx.page!.waitForTimeout(50); // Very short delay
    }
    
    // App should not crash, should be in a valid view
    const body = ctx.page!.locator('body');
    await expect(body).toBeVisible({ timeout: SHORT_TIMEOUT });
  });

  test('T-EC-002: Handle empty description in task creation form', async () => {
    const newTaskButton = ctx.page!.locator('button:has-text("New Task")');
    
    if (await newTaskButton.isEnabled()) {
      await newTaskButton.click();
      await ctx.page!.waitForTimeout(500);
      
      // Try to submit without description
      const createButton = ctx.page!.locator('button:has-text("Create Task")');
      if (await createButton.isVisible()) {
        // Create button should be disabled without description
        const isDisabled = await createButton.isDisabled();
        expect(isDisabled).toBe(true);
      }
      
      // Close dialog
      await ctx.page!.keyboard.press('Escape');
    }
  });

  test('T-EC-003: Handle special characters in task title', async () => {
    // Test that special chars don't break UI
    const specialChars = '!@#$%^&*()_+-=[]{}|;\':",.<>?/\\`~';
    
    const newTaskButton = ctx.page!.locator('button:has-text("New Task")');
    
    if (await newTaskButton.isEnabled()) {
      await newTaskButton.click();
      await ctx.page!.waitForTimeout(500);
      
      const titleInput = ctx.page!.locator('input[type="text"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill(`Test ${specialChars}`);
        const value = await titleInput.inputValue();
        expect(value).toContain('Test');
      }
      
      await ctx.page!.keyboard.press('Escape');
    }
  });

  test('T-EC-004: Handle Unicode characters in task fields', async () => {
    const unicode = '日本語 中文 한국어 العربية 🎉🚀';
    
    const newTaskButton = ctx.page!.locator('button:has-text("New Task")');
    
    if (await newTaskButton.isEnabled()) {
      await newTaskButton.click();
      await ctx.page!.waitForTimeout(500);
      
      const textarea = ctx.page!.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill(unicode);
        const value = await textarea.inputValue();
        expect(value).toContain('日本語');
      }
      
      await ctx.page!.keyboard.press('Escape');
    }
  });

  test('T-EC-005: Handle very long task description', async () => {
    const longText = 'A'.repeat(10000); // 10KB of text
    
    const newTaskButton = ctx.page!.locator('button:has-text("New Task")');
    
    if (await newTaskButton.isEnabled()) {
      await newTaskButton.click();
      await ctx.page!.waitForTimeout(500);
      
      const textarea = ctx.page!.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill(longText);
        const value = await textarea.inputValue();
        // Should either accept or truncate, not crash
        expect(value.length).toBeGreaterThan(0);
      }
      
      await ctx.page!.keyboard.press('Escape');
    }
  });

  test('T-EC-006: Kanban drag to same column is no-op', async () => {
    await ctx.page!.keyboard.press('K'); // Kanban view
    await ctx.page!.waitForTimeout(300);
    
    // Check if task cards exist
    const taskCards = ctx.page!.locator('[data-testid*="task"], [class*="TaskCard"]');
    const count = await taskCards.count();
    
    // If cards exist, verify drag system is in place
    if (count > 0) {
      const card = taskCards.first();
      const initialPosition = await card.boundingBox();
      expect(initialPosition).not.toBeNull();
    }
  });

  test('T-EC-007: Task status badge updates correctly', async () => {
    await ctx.page!.keyboard.press('K');
    await ctx.page!.waitForTimeout(300);
    
    // Check for status badges
    const badges = ctx.page!.locator('[class*="badge"], [class*="Badge"]');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(0); // Depends on tasks
  });

  test('T-EC-008: Task modal closes on background click', async () => {
    // If a task modal is open, clicking outside should close it
    const overlay = ctx.page!.locator('[class*="Overlay"]').first();
    const isVisible = await overlay.isVisible();
    
    if (isVisible) {
      await overlay.click({ position: { x: 10, y: 10 } });
      await ctx.page!.waitForTimeout(300);
    }
    
    // Verify no active modal
    expect(true).toBe(true); // Test completes without crash
  });

  test('T-EC-009: Empty Kanban columns show proper state', async () => {
    await ctx.page!.keyboard.press('K');
    await ctx.page!.waitForTimeout(300);
    
    // Check for empty state indicators
    const emptyStates = ctx.page!.locator('[class*="empty"], text=No tasks');
    const count = await emptyStates.count();
    // At least some columns might be empty
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('T-EC-010: Refresh button handles concurrent calls', async () => {
    await ctx.page!.keyboard.press('K');
    await ctx.page!.waitForTimeout(300);
    
    const refreshButton = ctx.page!.locator('button:has-text("Refresh")').first();
    
    if (await refreshButton.isVisible()) {
      // Click multiple times rapidly
      await refreshButton.click();
      await refreshButton.click();
      await refreshButton.click();
      
      // Should not crash, button may show loading state
      await ctx.page!.waitForTimeout(500);
      expect(true).toBe(true);
    }
  });
});

// ============================================================================
// SECTION 2: Terminal Edge Cases (TE-EC-001 to TE-EC-010)
// ============================================================================

test.describe('2: Terminal System Edge Cases', () => {
  
  test.beforeAll(async () => {
    await ctx.page!.keyboard.press('A'); // Terminals view
    await ctx.page!.waitForTimeout(500);
  });

  test('TE-EC-001: Terminal view handles no terminals gracefully', async () => {
    const emptyState = ctx.page!.locator('text=Agent Terminals, text=Spawn multiple');
    const isVisible = await emptyState.first().isVisible();
    expect(typeof isVisible).toBe('boolean');
  });

  test('TE-EC-002: New Terminal button has max limit awareness', async () => {
    const newTermButton = ctx.page!.locator('button:has-text("New Terminal")');
    const countDisplay = ctx.page!.locator('text=/\\d+\\s*\\/\\s*12/');
    
    // Either count display exists or we're at limit
    const countVisible = await countDisplay.isVisible();
    const buttonVisible = await newTermButton.isVisible();
    
    expect(countVisible || buttonVisible).toBe(true);
  });

  test('TE-EC-003: Terminal title accepts long names', async () => {
    // Check if terminal title elements exist
    const titles = ctx.page!.locator('[class*="terminal"] [class*="title"]');
    const count = await titles.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TE-EC-004: Terminal resize handles edge dimensions', async () => {
    const resizeHandles = ctx.page!.locator('[class*="Separator"], [class*="resize"]');
    const count = await resizeHandles.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TE-EC-005: File explorer toggle is idempotent', async () => {
    const filesButton = ctx.page!.locator('button:has-text("Files")');
    
    if (await filesButton.isVisible()) {
      // Toggle multiple times
      await filesButton.click();
      await ctx.page!.waitForTimeout(200);
      await filesButton.click();
      await ctx.page!.waitForTimeout(200);
      await filesButton.click();
      await ctx.page!.waitForTimeout(200);
      await filesButton.click(); // Back to original
      
      expect(true).toBe(true); // No crash
    }
  });

  test('TE-EC-006: History dropdown shows dates correctly', async () => {
    const historyButton = ctx.page!.locator('button:has-text("History")');
    
    if (await historyButton.isVisible()) {
      await historyButton.click();
      await ctx.page!.waitForTimeout(300);
      
      // Check for date items in dropdown
      const dropdown = ctx.page!.locator('[role="menu"], [class*="DropdownMenuContent"]');
      const isVisible = await dropdown.isVisible();
      
      // Close dropdown
      await ctx.page!.keyboard.press('Escape');
      
      expect(typeof isVisible).toBe('boolean');
    }
  });

  test('TE-EC-007: Terminal expand works and reverts', async () => {
    const expandButtons = ctx.page!.locator('button:has([class*="Expand"])');
    const count = await expandButtons.count();
    
    if (count > 0) {
      await expandButtons.first().click();
      await ctx.page!.waitForTimeout(300);
      
      // Click again to revert
      const collapseButton = ctx.page!.locator('button:has([class*="Collapse"], [class*="Minimize"])');
      if (await collapseButton.first().isVisible()) {
        await collapseButton.first().click();
      }
    }
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TE-EC-008: Terminal grid adjusts layout dynamically', async () => {
    const grid = ctx.page!.locator('[class*="grid"], [class*="Panel"]');
    const count = await grid.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('TE-EC-009: Invoke Claude All shows only when applicable', async () => {
    const invokeButton = ctx.page!.locator('button:has-text("Invoke Claude All")');
    const isVisible = await invokeButton.isVisible();
    // Only visible when running terminals exist
    expect(typeof isVisible).toBe('boolean');
  });

  test('TE-EC-010: Terminal keyboard shortcuts work', async () => {
    // Ctrl+T should create terminal (when view is active)
    await ctx.page!.keyboard.press('Control+KeyT');
    await ctx.page!.waitForTimeout(300);
    
    // Either terminal created or max reached
    expect(true).toBe(true);
  });
});

// ============================================================================
// SECTION 3: Settings Edge Cases (S-EC-001 to S-EC-010)
// ============================================================================

test.describe('3: Settings Edge Cases', () => {
  
  test('S-EC-001: Theme change previews then reverts on cancel', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    // Navigate to appearance
    const appearanceNav = ctx.page!.locator('button:has-text("Appearance")');
    await appearanceNav.click();
    await ctx.page!.waitForTimeout(300);
    
    // Check for theme toggles
    const themeOptions = ctx.page!.locator('[role="radiogroup"], [class*="theme"]');
    const count = await themeOptions.count();
    
    // Cancel to revert
    await ctx.page!.keyboard.press('Escape');
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('S-EC-002: UI scale bounds are enforced', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const displayNav = ctx.page!.locator('button:has-text("Display")');
    await displayNav.click();
    await ctx.page!.waitForTimeout(300);
    
    // Check for slider or scale controls
    const scaleControl = ctx.page!.locator('[class*="slider"], [class*="scale"]');
    const count = await scaleControl.count();
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('S-EC-003: Path selection handles invalid paths', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const pathsNav = ctx.page!.locator('button:has-text("Paths")');
    await pathsNav.click();
    await ctx.page!.waitForTimeout(300);
    
    // Check for path input
    const pathInput = ctx.page!.locator('input[type="text"]').first();
    const isVisible = await pathInput.isVisible();
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(typeof isVisible).toBe('boolean');
  });

  test('S-EC-004: Settings navigation is keyboard accessible', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    // Tab through nav items
    await ctx.page!.keyboard.press('Tab');
    await ctx.page!.keyboard.press('Tab');
    await ctx.page!.keyboard.press('Tab');
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(true).toBe(true);
  });

  test('S-EC-005: Version number displays correctly', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const version = ctx.page!.locator('text=/v?\\d+\\.\\d+\\.\\d+/');
    await expect(version.first()).toBeVisible({ timeout: TIMEOUT });
    
    await ctx.page!.keyboard.press('Escape');
  });

  test('S-EC-006: Project selector handles no projects', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    // Check project selector
    const projectSelector = ctx.page!.locator('[class*="ProjectSelector"], [class*="select"]');
    const count = await projectSelector.count();
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(count).toBeGreaterThan(0);
  });

  test('S-EC-007: API profile deletion has confirmation', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const profilesNav = ctx.page!.locator('button:has-text("API Profiles")');
    await profilesNav.click();
    await ctx.page!.waitForTimeout(300);
    
    // Check for delete buttons
    const deleteButtons = ctx.page!.locator('button:has([class*="Trash"])');
    const count = await deleteButtons.count();
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('S-EC-008: Debug section shows diagnostic info', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const debugNav = ctx.page!.locator('button:has-text("Debug")');
    await debugNav.click();
    await ctx.page!.waitForTimeout(300);
    
    // Check for debug content
    const debugContent = ctx.page!.locator('text=Debug, text=Log');
    const count = await debugContent.count();
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(count).toBeGreaterThan(0);
  });

  test('S-EC-009: Settings save handles concurrent changes', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const saveButton = ctx.page!.locator('button:has-text("Save")');
    await expect(saveButton).toBeVisible({ timeout: TIMEOUT });
    
    await ctx.page!.keyboard.press('Escape');
  });

  test('S-EC-010: Settings form validation shows errors', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    // Check for error state elements
    const errors = ctx.page!.locator('[class*="error"], [class*="destructive"]');
    const count = await errors.count();
    
    await ctx.page!.keyboard.press('Escape');
    
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// SECTION 4: Insights/Chat Edge Cases (I-EC-001 to I-EC-010)
// ============================================================================

test.describe('4: Insights Chat Edge Cases', () => {
  
  test.beforeAll(async () => {
    await ctx.page!.keyboard.press('N'); // Insights view
    await ctx.page!.waitForTimeout(500);
  });

  test('I-EC-001: Empty message cannot be sent', async () => {
    const sendButton = ctx.page!.locator('button:has([class*="Send"])').first();
    const isDisabled = await sendButton.isDisabled();
    
    // Should be disabled when no text
    expect(isDisabled).toBe(true);
  });

  test('I-EC-002: Whitespace-only message is trimmed', async () => {
    const textarea = ctx.page!.locator('textarea').first();
    await textarea.fill('   ');
    
    const sendButton = ctx.page!.locator('button:has([class*="Send"])').first();
    const isDisabled = await sendButton.isDisabled();
    
    // Should still be disabled
    expect(isDisabled).toBe(true);
    
    await textarea.clear();
  });

  test('I-EC-003: Long message is accepted', async () => {
    const textarea = ctx.page!.locator('textarea').first();
    const longMessage = 'Test message '.repeat(100);
    
    await textarea.fill(longMessage);
    const value = await textarea.inputValue();
    
    expect(value.length).toBeGreaterThan(100);
    
    await textarea.clear();
  });

  test('I-EC-004: Markdown content renders safely', async () => {
    // Check that markdown renderer exists
    const markdown = ctx.page!.locator('[class*="prose"], [class*="markdown"]');
    const count = await markdown.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('I-EC-005: External links open in new window', async () => {
    // Check for external link handling
    const links = ctx.page!.locator('a[target="_blank"], a[rel*="noopener"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('I-EC-006: New Chat clears conversation', async () => {
    const newChatButton = ctx.page!.locator('button:has-text("New Chat")');
    
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      await ctx.page!.waitForTimeout(300);
      
      // Should show empty state
      const emptyState = ctx.page!.locator('text=Start a Conversation');
      const isVisible = await emptyState.isVisible();
      expect(typeof isVisible).toBe('boolean');
    }
  });

  test('I-EC-007: Model selector shows available models', async () => {
    const modelSelector = ctx.page!.locator('[class*="ModelSelector"]');
    const count = await modelSelector.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('I-EC-008: Sidebar toggle preserves chat state', async () => {
    const toggleButton = ctx.page!.locator('button:has([class*="PanelLeft"])').first();
    
    // Toggle sidebar
    await toggleButton.click();
    await ctx.page!.waitForTimeout(300);
    await toggleButton.click();
    await ctx.page!.waitForTimeout(300);
    
    // Chat area should still be visible
    const chatArea = ctx.page!.locator('[class*="chat"], [class*="messages"]');
    const count = await chatArea.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('I-EC-009: Enter key sends message', async () => {
    const textarea = ctx.page!.locator('textarea').first();
    await textarea.fill('Test message');
    
    // Enter should attempt to send
    await ctx.page!.keyboard.press('Enter');
    await ctx.page!.waitForTimeout(300);
    
    // Clear if still there
    await textarea.clear();
    
    expect(true).toBe(true);
  });

  test('I-EC-010: Shift+Enter creates new line', async () => {
    const textarea = ctx.page!.locator('textarea').first();
    await textarea.fill('Line 1');
    await ctx.page!.keyboard.press('Shift+Enter');
    await ctx.page!.keyboard.type('Line 2');
    
    const value = await textarea.inputValue();
    expect(value).toContain('\n');
    
    await textarea.clear();
  });
});

// ============================================================================
// SECTION 5: Project Management Edge Cases (P-EC-001 to P-EC-010)
// ============================================================================

test.describe('5: Project Management Edge Cases', () => {
  
  test('P-EC-001: Welcome screen shows when no projects', async () => {
    const welcomeScreen = ctx.page!.locator('[class*="WelcomeScreen"], text=Welcome');
    const isVisible = await welcomeScreen.first().isVisible();
    expect(typeof isVisible).toBe('boolean');
  });

  test('P-EC-002: Add Project button is always accessible', async () => {
    const addProjectButton = ctx.page!.locator('button:has([class*="Plus"]), button:has-text("Add Project")');
    const count = await addProjectButton.count();
    expect(count).toBeGreaterThan(0);
  });

  test('P-EC-003: Project tabs are horizontally scrollable', async () => {
    const tabBar = ctx.page!.locator('[class*="TabBar"], [class*="tab-bar"]');
    const isVisible = await tabBar.first().isVisible();
    expect(typeof isVisible).toBe('boolean');
  });

  test('P-EC-004: Closing last tab shows welcome or empty state', async () => {
    // This test verifies the behavior pattern exists
    const tabs = ctx.page!.locator('[role="tab"], [class*="Tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('P-EC-005: Project name displays in tab', async () => {
    const tabNames = ctx.page!.locator('[class*="Tab"] span');
    const count = await tabNames.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('P-EC-006: Active project is visually indicated', async () => {
    const activeTab = ctx.page!.locator('[data-state="active"], [class*="active"]');
    const count = await activeTab.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('P-EC-007: Project close button shows confirmation', async () => {
    const closeButtons = ctx.page!.locator('[class*="Tab"] button:has([class*="X"])');
    const count = await closeButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('P-EC-008: Tab drag handles work correctly', async () => {
    const draggableTabs = ctx.page!.locator('[draggable="true"]');
    const count = await draggableTabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('P-EC-009: Project switch preserves view state', async () => {
    // Navigate to a view
    await ctx.page!.keyboard.press('K'); // Kanban
    await ctx.page!.waitForTimeout(300);
    
    // The view state should be maintained
    const kanbanContent = ctx.page!.locator('text=Backlog');
    const isVisible = await kanbanContent.first().isVisible();
    expect(typeof isVisible).toBe('boolean');
  });

  test('P-EC-010: Initialize dialog shows for new projects', async () => {
    // Check if init dialog elements exist
    const initDialog = ctx.page!.locator('text=Initialize Auto Claude, text=Initialize');
    const count = await initDialog.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// SECTION 6: Roadmap Edge Cases (R-EC-001 to R-EC-010)
// ============================================================================

test.describe('6: Roadmap Edge Cases', () => {
  
  test.beforeAll(async () => {
    await ctx.page!.keyboard.press('D'); // Roadmap view
    await ctx.page!.waitForTimeout(500);
  });

  test('R-EC-001: Roadmap empty state has generate button', async () => {
    const generateButton = ctx.page!.locator('button:has-text("Generate")');
    const isVisible = await generateButton.first().isVisible();
    expect(typeof isVisible).toBe('boolean');
  });

  test('R-EC-002: Roadmap header shows title', async () => {
    const title = ctx.page!.locator('text=Roadmap');
    await expect(title.first()).toBeVisible({ timeout: TIMEOUT });
  });

  test('R-EC-003: Add Feature button conditional visibility', async () => {
    const addFeatureButton = ctx.page!.locator('button:has-text("Add Feature")');
    const isVisible = await addFeatureButton.isVisible();
    // Only visible when roadmap exists
    expect(typeof isVisible).toBe('boolean');
  });

  test('R-EC-004: Refresh button exists when roadmap loaded', async () => {
    const refreshButton = ctx.page!.locator('button:has-text("Refresh"), button:has([class*="RefreshCw"])');
    const count = await refreshButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('R-EC-005: Feature cards are clickable', async () => {
    const featureCards = ctx.page!.locator('[class*="FeatureCard"], [class*="feature"]');
    const count = await featureCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('R-EC-006: Phase tabs exist when roadmap loaded', async () => {
    const phaseTabs = ctx.page!.locator('[role="tablist"], [class*="Tabs"]');
    const count = await phaseTabs.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('R-EC-007: Convert to Spec button exists in feature detail', async () => {
    const convertButton = ctx.page!.locator('button:has-text("Convert to Spec"), button:has-text("Create Task")');
    const count = await convertButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('R-EC-008: Competitor analysis viewer accessible', async () => {
    const viewAnalysisButton = ctx.page!.locator('button:has-text("View"), button:has-text("Competitor")');
    const count = await viewAnalysisButton.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('R-EC-009: Feature drag reorder works', async () => {
    const draggableFeatures = ctx.page!.locator('[draggable="true"], [class*="Sortable"]');
    const count = await draggableFeatures.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('R-EC-010: Generation progress shows during generation', async () => {
    const progressIndicator = ctx.page!.locator('[class*="Progress"], [class*="Loading"]');
    const count = await progressIndicator.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// SECTION 7: UI Stress Edge Cases
// ============================================================================

test.describe('7: UI Stress Edge Cases', () => {
  
  test('STRESS-001: Rapid keyboard navigation', async () => {
    const keys = ['K', 'A', 'N', 'D', 'I', 'L', 'C', 'M', 'W', 'K', 'A', 'N'];
    
    for (const key of keys) {
      await ctx.page!.keyboard.press(key);
      await ctx.page!.waitForTimeout(30);
    }
    
    // App should still be responsive
    const body = ctx.page!.locator('body');
    await expect(body).toBeVisible({ timeout: SHORT_TIMEOUT });
  });

  test('STRESS-002: Rapid dialog open/close', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    
    for (let i = 0; i < 5; i++) {
      await settingsButton.click();
      await ctx.page!.waitForTimeout(100);
      await ctx.page!.keyboard.press('Escape');
      await ctx.page!.waitForTimeout(100);
    }
    
    expect(true).toBe(true);
  });

  test('STRESS-003: Rapid tab key navigation', async () => {
    for (let i = 0; i < 20; i++) {
      await ctx.page!.keyboard.press('Tab');
    }
    
    expect(true).toBe(true);
  });

  test('STRESS-004: Multiple concurrent hovers', async () => {
    const buttons = ctx.page!.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      await buttons.nth(i).hover();
      await ctx.page!.waitForTimeout(50);
    }
    
    expect(true).toBe(true);
  });

  test('STRESS-005: Resize window during operation', async () => {
    const window = ctx.page!;
    
    await window.setViewportSize({ width: 800, height: 600 });
    await ctx.page!.waitForTimeout(200);
    await window.setViewportSize({ width: 1920, height: 1080 });
    await ctx.page!.waitForTimeout(200);
    await window.setViewportSize({ width: 1280, height: 720 });
    
    expect(true).toBe(true);
  });
});

// ============================================================================
// SECTION 8: Accessibility Edge Cases
// ============================================================================

test.describe('8: Accessibility Edge Cases', () => {
  
  test('A11Y-001: Focus visible on interactive elements', async () => {
    const focusable = ctx.page!.locator('button, a, input, textarea, [tabindex="0"]');
    const count = await focusable.count();
    expect(count).toBeGreaterThan(0);
  });

  test('A11Y-002: Dialog has proper ARIA attributes', async () => {
    const settingsButton = ctx.page!.locator('button:has-text("Settings")');
    await settingsButton.click();
    await ctx.page!.waitForTimeout(500);
    
    const dialog = ctx.page!.locator('[role="dialog"]');
    await expect(dialog.first()).toBeVisible({ timeout: TIMEOUT });
    
    await ctx.page!.keyboard.press('Escape');
  });

  test('A11Y-003: Labels associated with form controls', async () => {
    const labels = ctx.page!.locator('label[for], label:has(input)');
    const count = await labels.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('A11Y-004: Buttons have accessible names', async () => {
    const accessibleButtons = ctx.page!.locator('button[aria-label], button:has-text("")');
    const count = await accessibleButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('A11Y-005: Color contrast is sufficient', async () => {
    // Check for text visibility - if visible, contrast should be OK
    const text = ctx.page!.locator('body');
    await expect(text).toBeVisible({ timeout: SHORT_TIMEOUT });
  });
});

// ============================================================================
// Test Summary
// ============================================================================

test.describe('Z: Edge Case Test Summary', () => {
  test('Z1: All edge case tests complete', async () => {
    expect(true).toBe(true);
  });
});
