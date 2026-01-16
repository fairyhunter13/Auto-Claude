/**
 * Helper utilities for Electron E2E tests
 * Provides utilities for launching and interacting with the Electron app
 * 
 * WAYLAND FIX: Uses X11/XWayland flags to avoid white screen issue
 * on Wayland compositors (GNOME, KDE, etc.)
 */
import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ElectronTestContext {
  app: ElectronApplication;
  page: Page;
}

/**
 * Detect if running on Wayland
 */
function isWayland(): boolean {
  return !!(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland');
}

/**
 * Launch the Electron application for testing
 * 
 * On Wayland systems, uses X11/XWayland flags to ensure proper rendering.
 * This fixes the white screen issue where Electron windows show blank content
 * when launched via Playwright on Wayland compositors.
 */
export async function launchElectronApp(): Promise<ElectronTestContext> {
  // Path to the built Electron app
  const appPath = path.join(__dirname, '..');

  // Base args for all platforms
  const args = [appPath];
  
  // Wayland-specific args to force X11/XWayland rendering
  // This fixes the white screen issue on Wayland compositors
  if (isWayland()) {
    args.push(
      '--no-sandbox',
      '--ozone-platform=x11',
      '--disable-gpu-compositing',
      '--in-process-gpu'
    );
  }

  const app = await electron.launch({
    args,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // Use test-specific user data directory
      ELECTRON_USER_DATA_PATH: '/tmp/auto-claude-ui-e2e',
      // Wayland-specific env vars for X11 fallback
      ...(isWayland() && {
        GDK_BACKEND: 'x11',
        ELECTRON_OZONE_PLATFORM_HINT: 'x11',
        DISPLAY: process.env.DISPLAY || ':0',
      }),
    }
  });

  // Wait for the main window to open
  const page = await app.firstWindow();

  // Wait for the app to be ready
  await page.waitForLoadState('domcontentloaded');
  
  // Extra wait on Wayland for renderer to stabilize
  if (isWayland()) {
    await page.waitForTimeout(2000);
  }

  return { app, page };
}

/**
 * Close the Electron application
 */
export async function closeElectronApp(app: ElectronApplication): Promise<void> {
  await app.close();
}

/**
 * Wait for the app to be in a stable state
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for the main content to be visible
  await page.waitForSelector('[data-testid="app-container"]', {
    timeout: 30000,
    state: 'visible'
  }).catch(() => {
    // If no testid, wait for any substantial content
    return page.waitForSelector('body', { timeout: 30000 });
  });
}

/**
 * Take a screenshot for debugging
 */
export async function takeDebugScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `./e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * Mock IPC responses for testing
 */
export function createMockIpcHandler(app: ElectronApplication): {
  mockProjectAdd: (response: unknown) => Promise<void>;
  mockProjectList: (projects: unknown[]) => Promise<void>;
  mockTaskCreate: (response: unknown) => Promise<void>;
  mockTaskList: (tasks: unknown[]) => Promise<void>;
} {
  return {
    async mockProjectAdd(response: unknown) {
      await app.evaluate(
        ({ ipcMain }, response) => {
          ipcMain.handle('project:add', () => response);
        },
        response
      );
    },

    async mockProjectList(projects: unknown[]) {
      await app.evaluate(
        ({ ipcMain }, projects) => {
          ipcMain.handle('project:list', () => ({
            success: true,
            data: projects
          }));
        },
        projects
      );
    },

    async mockTaskCreate(response: unknown) {
      await app.evaluate(
        ({ ipcMain }, response) => {
          ipcMain.handle('task:create', () => response);
        },
        response
      );
    },

    async mockTaskList(tasks: unknown[]) {
      await app.evaluate(
        ({ ipcMain }, tasks) => {
          ipcMain.handle('task:list', () => ({
            success: true,
            data: tasks
          }));
        },
        tasks
      );
    }
  };
}
