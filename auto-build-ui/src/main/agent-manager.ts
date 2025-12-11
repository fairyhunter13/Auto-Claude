import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

interface AgentProcess {
  taskId: string;
  process: ChildProcess;
  startedAt: Date;
}

export interface AgentManagerEvents {
  log: (taskId: string, log: string) => void;
  error: (taskId: string, error: string) => void;
  exit: (taskId: string, code: number | null) => void;
}

/**
 * Manages Python subprocess spawning for auto-build agents
 */
export class AgentManager extends EventEmitter {
  private processes: Map<string, AgentProcess> = new Map();
  private pythonPath: string = 'python3';
  private autoBuildPath: string = '';

  constructor() {
    super();
  }

  /**
   * Configure paths for Python and auto-build
   */
  configure(pythonPath?: string, autoBuildPath?: string): void {
    if (pythonPath) {
      this.pythonPath = pythonPath;
    }
    if (autoBuildPath) {
      this.autoBuildPath = autoBuildPath;
    }
  }

  /**
   * Start spec creation process
   */
  startSpecCreation(
    taskId: string,
    projectPath: string,
    taskDescription: string
  ): void {
    const autoBuildDir = path.join(projectPath, 'auto-build');
    const specRunnerPath = path.join(autoBuildDir, 'spec_runner.py');

    const args = [specRunnerPath, '--task', taskDescription];

    this.spawnProcess(taskId, projectPath, args);
  }

  /**
   * Start task execution (run.py)
   */
  startTaskExecution(
    taskId: string,
    projectPath: string,
    specId: string,
    options: { parallel?: boolean; workers?: number } = {}
  ): void {
    const autoBuildDir = path.join(projectPath, 'auto-build');
    const runPath = path.join(autoBuildDir, 'run.py');

    const args = [runPath, '--spec', specId];

    if (options.parallel && options.workers) {
      args.push('--parallel', options.workers.toString());
    }

    this.spawnProcess(taskId, projectPath, args);
  }

  /**
   * Start QA process
   */
  startQAProcess(
    taskId: string,
    projectPath: string,
    specId: string
  ): void {
    const autoBuildDir = path.join(projectPath, 'auto-build');
    const runPath = path.join(autoBuildDir, 'run.py');

    const args = [runPath, '--spec', specId, '--qa'];

    this.spawnProcess(taskId, projectPath, args);
  }

  /**
   * Spawn a Python process
   */
  private spawnProcess(
    taskId: string,
    cwd: string,
    args: string[]
  ): void {
    // Kill existing process for this task if any
    this.killTask(taskId);

    const process = spawn(this.pythonPath, args, {
      cwd,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1' // Ensure real-time output
      }
    });

    this.processes.set(taskId, {
      taskId,
      process,
      startedAt: new Date()
    });

    // Handle stdout
    process.stdout?.on('data', (data: Buffer) => {
      const log = data.toString();
      this.emit('log', taskId, log);
    });

    // Handle stderr
    process.stderr?.on('data', (data: Buffer) => {
      const log = data.toString();
      // Some Python output goes to stderr (like progress bars)
      // so we treat it as log, not error
      this.emit('log', taskId, log);
    });

    // Handle process exit
    process.on('exit', (code) => {
      this.processes.delete(taskId);
      this.emit('exit', taskId, code);
    });

    // Handle process error
    process.on('error', (err) => {
      this.processes.delete(taskId);
      this.emit('error', taskId, err.message);
    });
  }

  /**
   * Kill a specific task's process
   */
  killTask(taskId: string): boolean {
    const agentProcess = this.processes.get(taskId);
    if (agentProcess) {
      try {
        // Send SIGTERM first for graceful shutdown
        agentProcess.process.kill('SIGTERM');

        // Force kill after timeout
        setTimeout(() => {
          if (!agentProcess.process.killed) {
            agentProcess.process.kill('SIGKILL');
          }
        }, 5000);

        this.processes.delete(taskId);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Kill all running processes
   */
  async killAll(): Promise<void> {
    const killPromises = Array.from(this.processes.keys()).map((taskId) => {
      return new Promise<void>((resolve) => {
        this.killTask(taskId);
        resolve();
      });
    });
    await Promise.all(killPromises);
  }

  /**
   * Check if a task is running
   */
  isRunning(taskId: string): boolean {
    return this.processes.has(taskId);
  }

  /**
   * Get all running task IDs
   */
  getRunningTasks(): string[] {
    return Array.from(this.processes.keys());
  }
}
