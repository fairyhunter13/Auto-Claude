import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { TerminalCreateOptions } from '../shared/types';
import * as os from 'os';

interface TerminalProcess {
  id: string;
  pty: pty.IPty;
  isClaudeMode: boolean;
}

export class TerminalManager {
  private terminals: Map<string, TerminalProcess> = new Map();
  private getWindow: () => BrowserWindow | null;

  constructor(getWindow: () => BrowserWindow | null) {
    this.getWindow = getWindow;
  }

  /**
   * Create a new terminal process
   */
  async create(options: TerminalCreateOptions): Promise<{ success: boolean; error?: string }> {
    const { id, cwd, cols = 80, rows = 24 } = options;

    // Check if terminal already exists
    if (this.terminals.has(id)) {
      return { success: false, error: 'Terminal already exists' };
    }

    try {
      // Determine shell based on platform
      const shell = process.platform === 'win32'
        ? process.env.COMSPEC || 'cmd.exe'
        : process.env.SHELL || '/bin/zsh';

      // Get shell args
      const shellArgs = process.platform === 'win32' ? [] : ['--login'];

      // Spawn the pty process
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd: cwd || os.homedir(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        },
      });

      // Store the terminal
      this.terminals.set(id, {
        id,
        pty: ptyProcess,
        isClaudeMode: false,
      });

      // Handle data from terminal
      ptyProcess.onData((data) => {
        const win = this.getWindow();
        if (win) {
          win.webContents.send(IPC_CHANNELS.TERMINAL_OUTPUT, id, data);
        }
      });

      // Handle terminal exit
      ptyProcess.onExit(({ exitCode }) => {
        const win = this.getWindow();
        if (win) {
          win.webContents.send(IPC_CHANNELS.TERMINAL_EXIT, id, exitCode);
        }
        this.terminals.delete(id);
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create terminal',
      };
    }
  }

  /**
   * Destroy a terminal process
   */
  async destroy(id: string): Promise<{ success: boolean; error?: string }> {
    const terminal = this.terminals.get(id);
    if (!terminal) {
      return { success: false, error: 'Terminal not found' };
    }

    try {
      terminal.pty.kill();
      this.terminals.delete(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to destroy terminal',
      };
    }
  }

  /**
   * Send input to a terminal
   */
  write(id: string, data: string): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.pty.write(data);
    }
  }

  /**
   * Resize a terminal
   */
  resize(id: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.pty.resize(cols, rows);
    }
  }

  /**
   * Invoke Claude in a terminal
   */
  invokeClaude(id: string, cwd?: string): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.isClaudeMode = true;

      // Clear the terminal and invoke claude
      const cwdCommand = cwd ? `cd "${cwd}" && ` : '';
      terminal.pty.write(`${cwdCommand}claude\r`);

      // Notify the renderer about title change
      const win = this.getWindow();
      if (win) {
        win.webContents.send(IPC_CHANNELS.TERMINAL_TITLE_CHANGE, id, 'Claude');
      }
    }
  }

  /**
   * Kill all terminal processes
   */
  async killAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [id, terminal] of this.terminals) {
      promises.push(
        new Promise((resolve) => {
          try {
            terminal.pty.kill();
          } catch {
            // Ignore errors during cleanup
          }
          resolve();
        })
      );
    }

    await Promise.all(promises);
    this.terminals.clear();
  }

  /**
   * Get all active terminal IDs
   */
  getActiveTerminalIds(): string[] {
    return Array.from(this.terminals.keys());
  }

  /**
   * Check if a terminal is in Claude mode
   */
  isClaudeMode(id: string): boolean {
    const terminal = this.terminals.get(id);
    return terminal?.isClaudeMode ?? false;
  }
}
