/**
 * OpenCode CLI Handlers
 *
 * IPC handlers for OpenCode CLI version checking and installation.
 * Provides functionality to:
 * - Check installed vs latest version
 * - Open terminal with installation command
 * - Manage multiple OpenCode installations
 */

import { ipcMain } from 'electron';
import { execFileSync, spawn, execFile } from 'child_process';
import { existsSync, promises as fsPromises } from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { IPC_CHANNELS, DEFAULT_APP_SETTINGS } from '../../shared/constants';
import type { IPCResult } from '../../shared/types';
import type { OpenCodeVersionInfo, OpenCodeInstallationList, OpenCodeInstallationInfo } from '../../shared/types/cli';
import { readSettingsFile, writeSettingsFile } from '../settings-utils';
import { isSecurePath } from '../utils/windows-paths';
import semver from 'semver';

const execFileAsync = promisify(execFile);

// Cache for latest version (avoid hammering GitHub API)
let cachedLatestVersion: { version: string; timestamp: number } | null = null;
let cachedVersionList: { versions: string[]; timestamp: number } | null = null;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const VERSION_LIST_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour for version list

// GitHub repo for OpenCode releases
const OPENCODE_GITHUB_REPO = 'opencode-ai/opencode';

/**
 * Get OpenCode detection paths for the current platform
 */
function getOpenCodeDetectionPaths(homeDir: string): {
  homebrewPaths: string[];
  platformPaths: string[];
  goInstallPath: string;
} {
  const homebrewPaths = [
    '/opt/homebrew/bin/opencode', // Apple Silicon
    '/usr/local/bin/opencode',    // Intel Mac
  ];

  const goInstallPath = path.join(homeDir, 'go', 'bin', 'opencode');

  const platformPaths = process.platform === 'win32'
    ? [
        path.join(homeDir, 'AppData', 'Local', 'Programs', 'opencode', 'opencode.exe'),
        path.join(homeDir, '.local', 'bin', 'opencode.exe'),
        path.join(homeDir, 'go', 'bin', 'opencode.exe'),
        'C:\\Program Files\\OpenCode\\opencode.exe',
        'C:\\Program Files (x86)\\OpenCode\\opencode.exe',
      ]
    : [
        path.join(homeDir, '.local', 'bin', 'opencode'),
        path.join(homeDir, 'bin', 'opencode'),
        goInstallPath,
        '/usr/local/bin/opencode',
        '/usr/bin/opencode',
      ];

  return { homebrewPaths, platformPaths, goInstallPath };
}

/**
 * Validate an OpenCode CLI path and get its version
 * @param cliPath - Path to the OpenCode CLI executable
 * @returns Tuple of [isValid, version or null]
 */
async function validateOpenCodeCliAsync(cliPath: string): Promise<[boolean, string | null]> {
  try {
    const isWindows = process.platform === 'win32';

    // Security validation: reject paths with shell metacharacters or directory traversal
    if (isWindows && !isSecurePath(cliPath)) {
      throw new Error(`OpenCode CLI path failed security validation: ${cliPath}`);
    }

    // Augment PATH with the CLI directory for proper resolution
    const cliDir = path.dirname(cliPath);
    const env = {
      ...process.env,
      PATH: cliDir ? `${cliDir}${path.delimiter}${process.env.PATH || ''}` : process.env.PATH,
    };

    const result = await execFileAsync(cliPath, ['--version'], {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
      env,
    });

    const version = String(result.stdout).trim();
    // OpenCode version format: "opencode vX.Y.Z" or "vX.Y.Z"
    const match = version.match(/v?(\d+\.\d+\.\d+)/);
    return [true, match ? match[1] : version.split('\n')[0]];
  } catch (error) {
    console.warn('[OpenCode] CLI validation failed for', cliPath, ':', error);
    return [false, null];
  }
}

/**
 * Scan all known locations for OpenCode CLI installations.
 * Returns all found installations with their paths, versions, and sources.
 */
async function scanOpenCodeInstallations(activePath: string | null): Promise<OpenCodeInstallationInfo[]> {
  const installations: OpenCodeInstallationInfo[] = [];
  const seenPaths = new Set<string>();
  const homeDir = os.homedir();
  const isWindows = process.platform === 'win32';

  const detectionPaths = getOpenCodeDetectionPaths(homeDir);

  const addInstallation = async (
    cliPath: string,
    source: OpenCodeInstallationInfo['source']
  ) => {
    const normalizedPath = path.resolve(cliPath);
    if (seenPaths.has(normalizedPath)) return;

    if (!existsSync(cliPath)) return;

    if (!isSecurePath(cliPath)) {
      console.warn('[OpenCode] Rejecting insecure path:', cliPath);
      return;
    }

    const [isValid, version] = await validateOpenCodeCliAsync(cliPath);
    if (!isValid) return;

    seenPaths.add(normalizedPath);
    installations.push({
      path: normalizedPath,
      version,
      source,
      isActive: activePath ? path.resolve(activePath) === normalizedPath : false,
    });
  };

  // 1. Check user-configured path first (if set)
  if (activePath && existsSync(activePath)) {
    await addInstallation(activePath, 'user-config');
  }

  // 2. Check Go install location (most common for OpenCode)
  await addInstallation(detectionPaths.goInstallPath, 'go-install');

  // 3. Check system PATH via which/where
  try {
    if (isWindows) {
      const result = await execFileAsync('where', ['opencode'], { timeout: 5000 });
      const paths = result.stdout.trim().split('\n').filter(p => p.trim());
      for (const p of paths) {
        await addInstallation(p.trim(), 'system-path');
      }
    } else {
      const result = await execFileAsync('which', ['-a', 'opencode'], { timeout: 5000 });
      const paths = result.stdout.trim().split('\n').filter(p => p.trim());
      for (const p of paths) {
        await addInstallation(p.trim(), 'system-path');
      }
    }
  } catch {
    // which/where failed, continue with other methods
  }

  // 4. Homebrew paths (macOS)
  if (process.platform === 'darwin') {
    for (const p of detectionPaths.homebrewPaths) {
      await addInstallation(p, 'homebrew');
    }
  }

  // 5. Platform-specific standard locations
  for (const p of detectionPaths.platformPaths) {
    await addInstallation(p, 'system-path');
  }

  // Mark the first installation as active if none is explicitly active
  if (installations.length > 0 && !installations.some(i => i.isActive)) {
    installations[0].isActive = true;
  }

  return installations;
}

/**
 * Fetch the latest version of OpenCode from GitHub releases
 */
async function fetchLatestVersion(): Promise<string> {
  if (cachedLatestVersion && Date.now() - cachedLatestVersion.timestamp < CACHE_DURATION_MS) {
    return cachedLatestVersion.version;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${OPENCODE_GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Auto-BMAD',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const tagName = data.tag_name;
    
    if (!tagName || typeof tagName !== 'string') {
      throw new Error('Invalid version format from GitHub releases');
    }

    // Strip 'v' prefix if present
    const version = tagName.replace(/^v/, '');

    cachedLatestVersion = { version, timestamp: Date.now() };
    return version;
  } catch (error) {
    console.error('[OpenCode] Failed to fetch latest version:', error);
    if (cachedLatestVersion) {
      return cachedLatestVersion.version;
    }
    throw error;
  }
}

/**
 * Fetch available versions of OpenCode from GitHub releases
 * Returns versions sorted by semver descending (newest first)
 */
async function fetchAvailableVersions(): Promise<string[]> {
  if (cachedVersionList && Date.now() - cachedVersionList.timestamp < VERSION_LIST_CACHE_DURATION_MS) {
    return cachedVersionList.versions;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${OPENCODE_GITHUB_REPO}/releases?per_page=20`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Auto-BMAD',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const releases = await response.json();
    const versions = releases
      .map((r: { tag_name: string }) => r.tag_name?.replace(/^v/, ''))
      .filter((v: string) => v && semver.valid(v))
      .sort((a: string, b: string) => semver.rcompare(a, b));

    if (versions.length === 0) {
      throw new Error('No valid versions found in GitHub releases');
    }

    cachedVersionList = { versions, timestamp: Date.now() };
    return versions;
  } catch (error) {
    console.error('[OpenCode] Failed to fetch available versions:', error);
    if (cachedVersionList) {
      return cachedVersionList.versions;
    }
    throw error;
  }
}

/**
 * Get the platform-specific install command for OpenCode
 * OpenCode is installed via Go: go install github.com/opencode-ai/opencode@latest
 */
function getInstallCommand(isUpdate: boolean): string {
  // OpenCode uses Go install
  const goInstallCmd = 'go install github.com/opencode-ai/opencode@latest';
  
  if (process.platform === 'win32') {
    // Windows: Check Go first, then install
    return `where go >nul 2>&1 && (${goInstallCmd}) || (echo "Go is required. Install from https://go.dev/dl/" && exit 1)`;
  } else {
    // macOS/Linux
    return `command -v go >/dev/null 2>&1 && ${goInstallCmd} || echo "Go is required. Install from https://go.dev/dl/"`;
  }
}

/**
 * Get the platform-specific install command for a specific version of OpenCode
 */
function getInstallVersionCommand(version: string): string {
  const goInstallCmd = `go install github.com/opencode-ai/opencode@v${version}`;
  
  if (process.platform === 'win32') {
    return `where go >nul 2>&1 && (${goInstallCmd}) || (echo "Go is required. Install from https://go.dev/dl/" && exit 1)`;
  } else {
    return `command -v go >/dev/null 2>&1 && ${goInstallCmd} || echo "Go is required. Install from https://go.dev/dl/"`;
  }
}

/**
 * Escape single quotes in a string for use in AppleScript
 */
export function escapeAppleScriptString(str: string): string {
  return str.replace(/'/g, "'\\''");
}

/**
 * Escape a string for safe use in PowerShell -Command context.
 */
export function escapePowerShellCommand(str: string): string {
  return str
    .replace(/`/g, '``')
    .replace(/"/g, '`"')
    .replace(/\$/g, '`$')
    .replace(/\(/g, '`(')
    .replace(/\)/g, '`)')
    .replace(/;/g, '`;')
    .replace(/&/g, '`&')
    .replace(/\r/g, '`r')
    .replace(/\n/g, '`n');
}

/**
 * Open a terminal with the given command
 * Uses the user's preferred terminal from settings
 */
export async function openTerminalWithCommand(command: string): Promise<void> {
  const platform = process.platform;
  const settings = readSettingsFile();
  const preferredTerminal = settings?.preferredTerminal as string | undefined;

  console.log('[OpenCode] Platform:', platform);
  console.log('[OpenCode] Preferred terminal:', preferredTerminal);

  if (platform === 'darwin') {
    const escapedCommand = escapeAppleScriptString(command);
    const terminalId = preferredTerminal?.toLowerCase() || 'terminal';

    console.log('[OpenCode] Using terminal:', terminalId);

    let script: string;

    if (terminalId === 'iterm2') {
      script = `
        tell application "iTerm"
          activate
          create window with default profile
          tell current session of current window
            write text "${escapedCommand}"
          end tell
        end tell
      `;
    } else if (terminalId === 'kitty') {
      spawn('kitty', ['--', 'bash', '-c', command], { detached: true, stdio: 'ignore' }).unref();
      return;
    } else if (terminalId === 'alacritty') {
      spawn('open', ['-a', 'Alacritty', '--args', '-e', 'bash', '-c', command], { detached: true, stdio: 'ignore' }).unref();
      return;
    } else if (terminalId === 'wezterm') {
      spawn('wezterm', ['start', '--', 'bash', '-c', command], { detached: true, stdio: 'ignore' }).unref();
      return;
    } else {
      // Default: Terminal.app
      script = `
        tell application "Terminal"
          do script "${escapedCommand}"
          activate
        end tell
      `;
    }

    console.log('[OpenCode] Running AppleScript...');
    execFileSync('osascript', ['-e', script], { stdio: 'pipe' });

  } else if (platform === 'win32') {
    const terminalId = preferredTerminal?.toLowerCase() || 'powershell';
    const { exec } = require('child_process');
    const escapedCommand = escapePowerShellCommand(command);

    const runWindowsCommand = (cmdString: string): Promise<void> => {
      return new Promise((resolve) => {
        console.log(`[OpenCode] Executing: ${cmdString}`);
        const child = exec(cmdString, { windowsHide: false });
        child.unref?.();
        setTimeout(() => resolve(), 300);
      });
    };

    if (terminalId === 'windowsterminal') {
      await runWindowsCommand(`wt new-tab powershell -NoExit -Command "${escapedCommand}"`);
    } else {
      await runWindowsCommand(`start powershell -NoExit -Command "${escapedCommand}"`);
    }

  } else {
    // Linux
    const terminalId = preferredTerminal?.toLowerCase() || '';
    const bashCommand = `${command}; exec bash`;

    const terminals: Array<{ cmd: string; args: string[] }> = [
      { cmd: 'gnome-terminal', args: ['--', 'bash', '-c', bashCommand] },
      { cmd: 'konsole', args: ['-e', 'bash', '-c', bashCommand] },
      { cmd: 'xfce4-terminal', args: ['-e', `bash -c "${bashCommand}"`] },
      { cmd: 'kitty', args: ['--', 'bash', '-c', bashCommand] },
      { cmd: 'alacritty', args: ['-e', 'bash', '-c', bashCommand] },
      { cmd: 'xterm', args: ['-e', 'bash', '-c', bashCommand] },
    ];

    // Try preferred terminal first
    if (terminalId === 'gnometerminal') {
      spawn('gnome-terminal', ['--', 'bash', '-c', bashCommand], { detached: true, stdio: 'ignore' }).unref();
      return;
    } else if (terminalId === 'konsole') {
      spawn('konsole', ['-e', 'bash', '-c', bashCommand], { detached: true, stdio: 'ignore' }).unref();
      return;
    } else if (terminalId === 'kitty') {
      spawn('kitty', ['--', 'bash', '-c', bashCommand], { detached: true, stdio: 'ignore' }).unref();
      return;
    }

    // Auto-detect
    for (const { cmd, args } of terminals) {
      try {
        spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
        console.log('[OpenCode] Opened terminal:', cmd);
        return;
      } catch {
        continue;
      }
    }

    throw new Error('No supported terminal emulator found');
  }
}

/**
 * Register OpenCode IPC handlers
 */
export function registerOpenCodeHandlers(): void {
  // Check OpenCode version
  ipcMain.handle(
    IPC_CHANNELS.OPENCODE_CHECK_VERSION,
    async (): Promise<IPCResult<OpenCodeVersionInfo>> => {
      try {
        console.log('[OpenCode] Checking version...');

        // Scan for installations
        const settings = readSettingsFile();
        const activePath = settings?.opencodePath as string | undefined;
        const installations = await scanOpenCodeInstallations(activePath || null);
        
        const activeInstall = installations.find(i => i.isActive);
        const installed = activeInstall?.version || null;
        
        console.log('[OpenCode] Installed version:', installed);

        // Fetch latest version from GitHub
        let latest: string;
        try {
          console.log('[OpenCode] Fetching latest version from GitHub...');
          latest = await fetchLatestVersion();
          console.log('[OpenCode] Latest version:', latest);
        } catch (error) {
          console.warn('[OpenCode] Failed to fetch latest version:', error);
          return {
            success: true,
            data: {
              installed,
              latest: 'unknown',
              isOutdated: false,
              path: activeInstall?.path,
              detectionResult: {
                found: !!installed,
                path: activeInstall?.path,
                version: installed || undefined,
                source: activeInstall?.source || 'fallback',
                message: installed ? `OpenCode ${installed} found` : 'OpenCode not found',
              },
            },
          };
        }

        // Compare versions
        let isOutdated = false;
        if (installed && latest !== 'unknown') {
          try {
            const cleanInstalled = installed.replace(/^v/, '');
            const cleanLatest = latest.replace(/^v/, '');
            isOutdated = semver.lt(cleanInstalled, cleanLatest);
          } catch {
            isOutdated = false;
          }
        }

        console.log('[OpenCode] Check complete:', { installed, latest, isOutdated });
        return {
          success: true,
          data: {
            installed,
            latest,
            isOutdated,
            path: activeInstall?.path,
            detectionResult: {
              found: !!installed,
              path: activeInstall?.path,
              version: installed || undefined,
              source: activeInstall?.source || 'fallback',
              message: installed ? `OpenCode ${installed} found` : 'OpenCode not found',
            },
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenCode] Check failed:', errorMsg, error);
        return {
          success: false,
          error: `Failed to check OpenCode version: ${errorMsg}`,
        };
      }
    }
  );

  // Install OpenCode (open terminal with install command)
  ipcMain.handle(
    IPC_CHANNELS.OPENCODE_INSTALL,
    async (): Promise<IPCResult<{ command: string }>> => {
      try {
        const settings = readSettingsFile();
        const activePath = settings?.opencodePath as string | undefined;
        const installations = await scanOpenCodeInstallations(activePath || null);
        const isUpdate = installations.length > 0;

        const command = getInstallCommand(isUpdate);
        console.log('[OpenCode] Install command:', command);
        console.log('[OpenCode] Opening terminal...');
        await openTerminalWithCommand(command);
        console.log('[OpenCode] Terminal opened successfully');

        return {
          success: true,
          data: { command },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenCode] Install failed:', errorMsg, error);
        return {
          success: false,
          error: `Failed to open terminal for installation: ${errorMsg}`,
        };
      }
    }
  );

  // Get available OpenCode versions
  ipcMain.handle(
    IPC_CHANNELS.OPENCODE_GET_VERSIONS,
    async (): Promise<IPCResult<{ versions: string[] }>> => {
      try {
        console.log('[OpenCode] Fetching available versions...');
        const versions = await fetchAvailableVersions();
        console.log('[OpenCode] Found', versions.length, 'versions');
        return {
          success: true,
          data: { versions },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenCode] Failed to fetch versions:', errorMsg, error);
        return {
          success: false,
          error: `Failed to fetch available versions: ${errorMsg}`,
        };
      }
    }
  );

  // Install a specific version of OpenCode
  ipcMain.handle(
    IPC_CHANNELS.OPENCODE_INSTALL_VERSION,
    async (_event, version: string): Promise<IPCResult<{ command: string; version: string }>> => {
      try {
        if (!version || typeof version !== 'string') {
          throw new Error('Invalid version specified');
        }

        if (!semver.valid(version)) {
          throw new Error(`Invalid version format: ${version}`);
        }

        console.log('[OpenCode] Installing version:', version);
        const command = getInstallVersionCommand(version);
        console.log('[OpenCode] Install command:', command);
        console.log('[OpenCode] Opening terminal...');
        await openTerminalWithCommand(command);
        console.log('[OpenCode] Terminal opened successfully');

        return {
          success: true,
          data: { command, version },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenCode] Install version failed:', errorMsg, error);
        return {
          success: false,
          error: `Failed to install version: ${errorMsg}`,
        };
      }
    }
  );

  // Get all OpenCode CLI installations found on the system
  ipcMain.handle(
    IPC_CHANNELS.OPENCODE_GET_INSTALLATIONS,
    async (): Promise<IPCResult<OpenCodeInstallationList>> => {
      try {
        console.log('[OpenCode] Scanning for installations...');

        const settings = readSettingsFile();
        const activePath = settings?.opencodePath as string | undefined;

        const installations = await scanOpenCodeInstallations(activePath || null);
        console.log('[OpenCode] Found', installations.length, 'installations');

        return {
          success: true,
          data: {
            installations,
            activePath: activePath || (installations.length > 0 ? installations[0].path : null),
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenCode] Failed to scan installations:', errorMsg, error);
        return {
          success: false,
          error: `Failed to scan OpenCode installations: ${errorMsg}`,
        };
      }
    }
  );

  // Set the active OpenCode CLI path
  ipcMain.handle(
    IPC_CHANNELS.OPENCODE_SET_ACTIVE_PATH,
    async (_event, cliPath: string): Promise<IPCResult<{ path: string }>> => {
      try {
        console.log('[OpenCode] Setting active path:', cliPath);

        if (!isSecurePath(cliPath)) {
          throw new Error('Invalid path: contains potentially unsafe characters');
        }

        const normalizedPath = path.resolve(cliPath);

        if (!existsSync(normalizedPath)) {
          throw new Error('OpenCode CLI not found at specified path');
        }

        const [isValid, version] = await validateOpenCodeCliAsync(normalizedPath);
        if (!isValid) {
          throw new Error('OpenCode CLI at specified path is not valid or not executable');
        }

        // Save to settings
        const currentSettings = readSettingsFile() || {};
        const mergedSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...currentSettings,
          opencodePath: normalizedPath,
        } as Record<string, unknown>;
        writeSettingsFile(mergedSettings);

        console.log('[OpenCode] Active path set:', normalizedPath, 'version:', version);

        return {
          success: true,
          data: { path: normalizedPath },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[OpenCode] Failed to set active path:', errorMsg, error);
        return {
          success: false,
          error: `Failed to set active OpenCode path: ${errorMsg}`,
        };
      }
    }
  );

  console.warn('[IPC] OpenCode handlers registered');
}
