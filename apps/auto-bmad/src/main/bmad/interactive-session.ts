/**
 * Interactive Session Manager
 * 
 * Manages OpenCode CLI sessions for Interactive Mode (Epic 7).
 * Provides chat-based interaction with BMAD agents.
 * 
 * Stories: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { resolve, join } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { 
  IpcResult, 
  successResult, 
  errorResult,
  BMAD_WORKFLOWS,
  BMAD_AGENTS,
} from './types';
import { debugLogger } from '../debug-logger';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentId?: string;
  agentName?: string;
  isStreaming?: boolean;
  workflowId?: string;
}

export interface ChatSession {
  id: string;
  projectPath: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  activeAgentId?: string;
}

export interface InteractiveSessionOptions {
  /** Preferred agent ID to use */
  agentId?: string;
  /** Model to use (defaults to anthropic/claude-sonnet-4-20250514) */
  model?: string;
  /** Callback for stdout data */
  onStdout?: (data: string) => void;
  /** Callback for stderr data */
  onStderr?: (data: string) => void;
}

export interface SendMessageOptions {
  /** Agent to route message to (via @mention) */
  agentId?: string;
  /** Workflow to execute (via slash command) */
  workflowCommand?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514';
const CHAT_HISTORY_DIR = '_bmad-output/chat-history';

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Find OpenCode CLI executable
 */
async function findOpenCode(): Promise<string | null> {
  const candidates = [
    join(process.env.HOME || '', '.opencode', 'bin', 'opencode'),
    'opencode',
    '/usr/local/bin/opencode',
    '/usr/bin/opencode',
    join(process.env.HOME || '', '.local', 'bin', 'opencode'),
    join(process.env.HOME || '', 'go', 'bin', 'opencode'),
  ];

  if (process.platform === 'win32') {
    candidates.push(
      'opencode.cmd',
      'opencode.exe',
      join(process.env.LOCALAPPDATA || '', 'Programs', 'opencode', 'opencode.exe'),
    );
  }

  if (process.platform === 'darwin') {
    candidates.push(
      '/opt/homebrew/bin/opencode',
      '/usr/local/Cellar/opencode/bin/opencode',
    );
  }

  for (const candidate of candidates) {
    try {
      const result = await new Promise<boolean>((resolve) => {
        const proc = spawn(candidate, ['--version'], {
          stdio: 'pipe',
          timeout: 5000,
        });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
      });

      if (result) {
        return candidate;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Parse @mentions from message
 */
export function parseAgentMention(message: string): { agentId: string | null; cleanMessage: string } {
  // Match @agentId or @"agent name" at the start of message
  const mentionMatch = message.match(/^@(\w+[-\w]*)\s*/i);
  
  if (mentionMatch) {
    const mentionedAgent = mentionMatch[1].toLowerCase();
    // Check if it's a valid agent
    const agent = BMAD_AGENTS.find(a => 
      a.id.toLowerCase() === mentionedAgent ||
      a.name.toLowerCase() === mentionedAgent
    );
    
    if (agent) {
      return {
        agentId: agent.id,
        cleanMessage: message.slice(mentionMatch[0].length).trim(),
      };
    }
  }
  
  return { agentId: null, cleanMessage: message };
}

/**
 * Parse slash commands from message
 */
export function parseSlashCommand(message: string): { workflowId: string | null; command: string | null } {
  // Match /command at the start of message
  const commandMatch = message.match(/^\/(\w+[-\w]*)/i);
  
  if (commandMatch) {
    const command = commandMatch[1].toLowerCase();
    
    // Map common shortcuts to workflow IDs
    const workflowMap: Record<string, string> = {
      'prd': 'prd',
      'architecture': 'architecture',
      'arch': 'architecture',
      'epics': 'epics',
      'stories': 'epics',
      'ux': 'ux-design',
      'ux-design': 'ux-design',
      'sprint': 'sprint-planning',
      'sprint-planning': 'sprint-planning',
      'story': 'create-story',
      'create-story': 'create-story',
      'dev': 'dev-story',
      'dev-story': 'dev-story',
      'review': 'code-review',
      'code-review': 'code-review',
      'brief': 'product-brief',
      'product-brief': 'product-brief',
      'research': 'research',
      'brainstorm': 'brainstorm-project',
      'test': 'test-design',
      'test-design': 'test-design',
      'gate': 'implementation-readiness',
      'gate-check': 'implementation-readiness',
      'implementation-readiness': 'implementation-readiness',
    };
    
    const workflowId = workflowMap[command];
    if (workflowId) {
      const workflow = BMAD_WORKFLOWS.find(w => w.id === workflowId);
      if (workflow) {
        return { workflowId, command: workflow.command };
      }
    }
  }
  
  return { workflowId: null, command: null };
}

/**
 * Get all available slash commands
 */
export function getAvailableCommands(): Array<{ command: string; description: string; workflowId: string }> {
  return BMAD_WORKFLOWS.map(w => ({
    command: `/${w.id}`,
    description: w.description,
    workflowId: w.id,
  }));
}

/**
 * Get all mentionable agents
 */
export function getMentionableAgents(): Array<{ id: string; name: string; role: string }> {
  return BMAD_AGENTS.map(a => ({
    id: a.id,
    name: a.name,
    role: a.role,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Session Class
// ─────────────────────────────────────────────────────────────────────────────

export class InteractiveSession extends EventEmitter {
  private projectPath: string;
  private session: ChatSession;
  private activeProcess: ChildProcess | null = null;
  private openCodePath: string | null = null;
  private currentAgentId: string | null = null;
  private streamBuffer: string = '';

  constructor(projectPath: string, sessionId?: string) {
    super();
    this.projectPath = resolve(projectPath);
    
    // Create or restore session
    this.session = {
      id: sessionId || generateId(),
      projectPath: this.projectPath,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.session.id;
  }

  /**
   * Get all messages
   */
  getMessages(): ChatMessage[] {
    return [...this.session.messages];
  }

  /**
   * Initialize the session
   */
  async initialize(options: InteractiveSessionOptions = {}): Promise<IpcResult<void>> {
    debugLogger.interactive('Initializing interactive session', {
      projectPath: this.projectPath,
      sessionId: this.session.id,
    });

    // Find OpenCode CLI
    this.openCodePath = await findOpenCode();
    
    if (!this.openCodePath) {
      return errorResult(
        'OPENCODE_NOT_FOUND',
        'OpenCode CLI not found. Please install OpenCode or ensure it is in your PATH.'
      );
    }

    // Set initial agent if specified
    if (options.agentId) {
      this.currentAgentId = options.agentId;
    }

    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: generateId(),
      role: 'system',
      content: `Welcome to Interactive Mode! You can chat with BMAD agents about your project.

**Tips:**
- Use @agent to mention a specific agent (e.g., @winston, @john, @mary)
- Use /command to run workflows (e.g., /prd, /architecture, /sprint)
- Type your message to chat with the active agent

**Available Agents:** ${BMAD_AGENTS.slice(0, 5).map(a => `${a.name} (${a.role})`).join(', ')}...`,
      timestamp: new Date(),
    };

    this.session.messages.push(welcomeMessage);
    this.emit('message', welcomeMessage);

    return successResult(undefined);
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    content: string,
    options: SendMessageOptions = {}
  ): Promise<IpcResult<ChatMessage>> {
    if (!this.openCodePath) {
      return errorResult('NOT_INITIALIZED', 'Session not initialized');
    }

    // Parse @mentions
    const { agentId: mentionedAgent, cleanMessage } = parseAgentMention(content);
    
    // Parse slash commands
    const { workflowId, command: workflowCommand } = parseSlashCommand(content);

    // Determine which agent to use
    const targetAgentId = options.agentId || mentionedAgent || this.currentAgentId || 'pm';
    const agent = BMAD_AGENTS.find(a => a.id === targetAgentId);

    // Create user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    this.session.messages.push(userMessage);
    this.session.updatedAt = new Date();
    this.emit('message', userMessage);

    // Create placeholder for assistant response
    const assistantMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      agentId: targetAgentId,
      agentName: agent?.name || targetAgentId,
      isStreaming: true,
      workflowId: workflowId || undefined,
    };

    this.session.messages.push(assistantMessage);
    this.emit('message', assistantMessage);

    try {
      // Build OpenCode command
      const args: string[] = ['run'];

      // Add agent
      args.push('--agent', targetAgentId);

      // Add model
      args.push('--model', DEFAULT_MODEL);

      // Determine the message to send
      let messageToSend = cleanMessage || content;
      if (workflowCommand) {
        // Use the workflow command
        messageToSend = workflowCommand;
      }

      args.push(messageToSend);

      // Set up environment
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        BMAD_PROJECT_PATH: this.projectPath,
        PWD: this.projectPath,
        OPENCODE_PERMISSION: JSON.stringify({ "*": "allow" }),
      };

      debugLogger.interactive('Sending message to OpenCode', {
        agent: targetAgentId,
        args,
        workflowId,
      });

      // Spawn OpenCode process
      this.activeProcess = spawn(this.openCodePath, args, {
        cwd: this.projectPath,
        env: env as NodeJS.ProcessEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.streamBuffer = '';

      // Handle stdout - stream response
      this.activeProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.streamBuffer += text;
        
        // Update assistant message content
        assistantMessage.content = this.streamBuffer;
        this.emit('stream', { messageId: assistantMessage.id, chunk: text, content: this.streamBuffer });
      });

      // Handle stderr
      this.activeProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        debugLogger.interactive('stderr: ' + text.substring(0, 200));
      });

      // Wait for process to complete
      await new Promise<void>((resolve, reject) => {
        this.activeProcess?.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`OpenCode exited with code ${code}`));
          }
        });

        this.activeProcess?.on('error', (err) => {
          reject(err);
        });
      });

      // Finalize message
      assistantMessage.content = this.streamBuffer || '(No response)';
      assistantMessage.isStreaming = false;
      this.session.updatedAt = new Date();
      
      this.emit('message-complete', assistantMessage);
      this.activeProcess = null;

      return successResult(assistantMessage);

    } catch (error) {
      // Update message with error
      assistantMessage.content = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      assistantMessage.isStreaming = false;
      
      this.emit('message-complete', assistantMessage);
      this.activeProcess = null;

      return errorResult(
        'MESSAGE_ERROR',
        error instanceof Error ? error.message : 'Failed to send message'
      );
    }
  }

  /**
   * Cancel the current response
   */
  cancelResponse(): void {
    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = null;
      this.emit('cancelled');
    }
  }

  /**
   * Set the active agent
   */
  setActiveAgent(agentId: string): void {
    const agent = BMAD_AGENTS.find(a => a.id === agentId);
    if (agent) {
      this.currentAgentId = agentId;
      this.session.activeAgentId = agentId;
      this.emit('agent-changed', agent);
    }
  }

  /**
   * Clear chat history
   */
  clearHistory(): void {
    this.session.messages = [];
    this.session.updatedAt = new Date();
    this.emit('history-cleared');
  }

  /**
   * Save session to disk
   */
  async saveSession(): Promise<IpcResult<void>> {
    try {
      const historyDir = join(this.projectPath, CHAT_HISTORY_DIR);
      
      // Ensure directory exists
      if (!existsSync(historyDir)) {
        await mkdir(historyDir, { recursive: true });
      }

      const filePath = join(historyDir, `${this.session.id}.json`);
      
      await writeFile(filePath, JSON.stringify({
        ...this.session,
        messages: this.session.messages.map(m => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
        createdAt: this.session.createdAt.toISOString(),
        updatedAt: this.session.updatedAt.toISOString(),
      }, null, 2));

      debugLogger.interactive('Session saved', { 
        sessionId: this.session.id,
        messageCount: this.session.messages.length,
      });

      return successResult(undefined);

    } catch (error) {
      return errorResult(
        'SAVE_ERROR',
        error instanceof Error ? error.message : 'Failed to save session'
      );
    }
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId: string): Promise<IpcResult<ChatSession>> {
    try {
      const filePath = join(this.projectPath, CHAT_HISTORY_DIR, `${sessionId}.json`);
      
      if (!existsSync(filePath)) {
        return errorResult('SESSION_NOT_FOUND', `Session ${sessionId} not found`);
      }

      const data = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);

      this.session = {
        ...parsed,
        messages: parsed.messages.map((m: Record<string, unknown>) => ({
          ...m,
          timestamp: new Date(m.timestamp as string),
        })),
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };

      return successResult(this.session);

    } catch (error) {
      return errorResult(
        'LOAD_ERROR',
        error instanceof Error ? error.message : 'Failed to load session'
      );
    }
  }

  /**
   * List all saved sessions
   */
  async listSessions(): Promise<IpcResult<Array<{ id: string; createdAt: Date; messageCount: number }>>> {
    try {
      const historyDir = join(this.projectPath, CHAT_HISTORY_DIR);
      
      if (!existsSync(historyDir)) {
        return successResult([]);
      }

      const { readdir } = await import('fs/promises');
      const files = await readdir(historyDir);
      
      const sessions: Array<{ id: string; createdAt: Date; messageCount: number }> = [];
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const data = await readFile(join(historyDir, file), 'utf-8');
            const parsed = JSON.parse(data);
            sessions.push({
              id: parsed.id,
              createdAt: new Date(parsed.createdAt),
              messageCount: parsed.messages.length,
            });
          } catch {
            // Skip invalid files
          }
        }
      }

      // Sort by creation date, newest first
      sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return successResult(sessions);

    } catch (error) {
      return errorResult(
        'LIST_ERROR',
        error instanceof Error ? error.message : 'Failed to list sessions'
      );
    }
  }

  /**
   * Dispose of the session
   */
  dispose(): void {
    this.cancelResponse();
    this.removeAllListeners();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Manager (Singleton)
// ─────────────────────────────────────────────────────────────────────────────

let activeSession: InteractiveSession | null = null;

/**
 * Get or create an interactive session for a project
 */
export function getInteractiveSession(projectPath: string): InteractiveSession {
  const resolvedPath = resolve(projectPath);

  if (activeSession && activeSession['projectPath'] === resolvedPath) {
    return activeSession;
  }

  // Dispose previous session
  if (activeSession) {
    activeSession.dispose();
  }

  activeSession = new InteractiveSession(resolvedPath);
  return activeSession;
}

/**
 * Dispose the active session
 */
export function disposeInteractiveSession(): void {
  if (activeSession) {
    activeSession.dispose();
    activeSession = null;
  }
}
