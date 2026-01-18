/**
 * Chat Store
 * 
 * Zustand store for managing Interactive Mode chat state.
 * Provides message management, session handling, and agent tracking.
 * 
 * Stories: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  module: 'bmm' | 'cis' | 'core' | 'bmb';
  description?: string;
}

// Local copy of agents and workflows for renderer use
const BMAD_AGENTS: AgentDefinition[] = [
  { id: 'bmad-master', name: 'BMAD Master', role: 'Master Orchestrator', module: 'core' },
  { id: 'analyst', name: 'Mary', role: 'Business Analyst', module: 'bmm' },
  { id: 'architect', name: 'Winston', role: 'Architect', module: 'bmm' },
  { id: 'dev', name: 'Amelia', role: 'Developer', module: 'bmm' },
  { id: 'pm', name: 'John', role: 'Product Manager', module: 'bmm' },
  { id: 'quick-flow-solo-dev', name: 'Quick Dev', role: 'Solo Developer', module: 'bmm' },
  { id: 'sm', name: 'Bob', role: 'Scrum Master', module: 'bmm' },
  { id: 'tea', name: 'Murat', role: 'Test Architect', module: 'bmm' },
  { id: 'tech-writer', name: 'Alex', role: 'Technical Writer', module: 'bmm' },
  { id: 'ux-designer', name: 'Sally', role: 'UX Designer', module: 'bmm' },
  { id: 'brainstorming-coach', name: 'Brainstorm Coach', role: 'Ideation Facilitator', module: 'cis' },
  { id: 'creative-problem-solver', name: 'Problem Solver', role: 'Creative Problem Solver', module: 'cis' },
  { id: 'design-thinking-coach', name: 'Design Coach', role: 'Design Thinking Facilitator', module: 'cis' },
  { id: 'innovation-strategist', name: 'Innovation Strategist', role: 'Innovation Strategist', module: 'cis' },
  { id: 'presentation-master', name: 'Presentation Master', role: 'Presentation Expert', module: 'cis' },
  { id: 'storyteller', name: 'Storyteller', role: 'Narrative Designer', module: 'cis' },
];

interface WorkflowDef {
  id: string;
  description: string;
  agent: string;
}

const BMAD_WORKFLOWS: WorkflowDef[] = [
  { id: 'brainstorm-project', description: 'Ideation and brainstorming', agent: 'analyst' },
  { id: 'research', description: 'Market and technical research', agent: 'analyst' },
  { id: 'product-brief', description: 'High-level product concept', agent: 'analyst' },
  { id: 'prd', description: 'Product Requirements Document', agent: 'pm' },
  { id: 'ux-design', description: 'UX design document', agent: 'ux-designer' },
  { id: 'architecture', description: 'System architecture design', agent: 'architect' },
  { id: 'epics', description: 'Epic and story breakdown', agent: 'pm' },
  { id: 'test-design', description: 'Test strategy and plan', agent: 'tea' },
  { id: 'implementation-readiness', description: 'Gate check for implementation', agent: 'architect' },
  { id: 'sprint-planning', description: 'Sprint planning session', agent: 'sm' },
  { id: 'create-story', description: 'Create detailed story spec', agent: 'sm' },
  { id: 'dev-story', description: 'Implement user story', agent: 'dev' },
  { id: 'code-review', description: 'Review implemented code', agent: 'dev' },
];

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

export interface SlashCommand {
  command: string;
  description: string;
  workflowId: string;
  agent: string;
}

interface ChatState {
  // Session state
  sessionId: string | null;
  projectPath: string | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // Messages
  messages: ChatMessage[];

  // Input state
  inputValue: string;
  isSending: boolean;

  // Agent state
  activeAgentId: string | null;
  mentionedAgentId: string | null;

  // Autocomplete state
  showSlashCommands: boolean;
  showAgentMentions: boolean;
  autocompleteFilter: string;

  // History
  savedSessions: Array<{ id: string; createdAt: Date; messageCount: number }>;

  // Actions
  initialize: (projectPath: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  cancelResponse: () => void;
  setInputValue: (value: string) => void;
  setActiveAgent: (agentId: string) => void;
  clearHistory: () => void;
  saveSession: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSavedSessions: (projectPath: string) => Promise<void>;
  clearError: () => void;

  // Autocomplete helpers
  getFilteredCommands: () => SlashCommand[];
  getFilteredAgents: () => AgentDefinition[];
  updateAutocomplete: (value: string) => void;
  selectCommand: (command: SlashCommand) => void;
  selectAgentMention: (agent: AgentDefinition) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Available commands and agents
// ─────────────────────────────────────────────────────────────────────────────

const SLASH_COMMANDS: SlashCommand[] = BMAD_WORKFLOWS.map(w => ({
  command: `/${w.id}`,
  description: w.description,
  workflowId: w.id,
  agent: w.agent,
}));

// Common shortcuts
const COMMAND_SHORTCUTS: SlashCommand[] = [
  { command: '/prd', description: 'Create Product Requirements Document', workflowId: 'prd', agent: 'pm' },
  { command: '/arch', description: 'Create System Architecture', workflowId: 'architecture', agent: 'architect' },
  { command: '/sprint', description: 'Start Sprint Planning', workflowId: 'sprint-planning', agent: 'sm' },
  { command: '/story', description: 'Create User Story', workflowId: 'create-story', agent: 'sm' },
  { command: '/dev', description: 'Implement Story', workflowId: 'dev-story', agent: 'dev' },
  { command: '/review', description: 'Code Review', workflowId: 'code-review', agent: 'dev' },
  { command: '/gate', description: 'Run Implementation Readiness Check', workflowId: 'implementation-readiness', agent: 'architect' },
  { command: '/brief', description: 'Create Product Brief', workflowId: 'product-brief', agent: 'analyst' },
  { command: '/ux', description: 'Create UX Design', workflowId: 'ux-design', agent: 'ux-designer' },
];

// Merge shortcuts with full commands, shortcuts first
const ALL_COMMANDS = [...COMMAND_SHORTCUTS, ...SLASH_COMMANDS.filter(
  c => !COMMAND_SHORTCUTS.some(s => s.workflowId === c.workflowId)
)];

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  sessionId: null,
  projectPath: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  messages: [],
  inputValue: '',
  isSending: false,
  activeAgentId: null,
  mentionedAgentId: null,
  showSlashCommands: false,
  showAgentMentions: false,
  autocompleteFilter: '',
  savedSessions: [],

  // Initialize a new session
  initialize: async (projectPath: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.bmad.initInteractiveSession(projectPath);
      
      if (result.success) {
        set({
          sessionId: result.data.sessionId,
          messages: result.data.messages || [],
          isInitialized: true,
          isLoading: false,
          activeAgentId: 'pm', // Default to PM
          projectPath: projectPath,
        });
      } else {
        set({
          error: result.error.message,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize session',
        isLoading: false,
      });
    }
  },

  // Send a message
  sendMessage: async (content: string) => {
    const state = get();
    if (!state.sessionId || state.isSending) return;

    set({ isSending: true, error: null });

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set(s => ({ 
      messages: [...s.messages, userMessage],
      inputValue: '',
      showSlashCommands: false,
      showAgentMentions: false,
    }));

    try {
      // Determine agent from @mention
      let agentId = state.activeAgentId;
      const mentionMatch = content.match(/^@(\w+[-\w]*)/i);
      if (mentionMatch) {
        const mentioned = mentionMatch[1].toLowerCase();
        const agent = BMAD_AGENTS.find(a => 
          a.id.toLowerCase() === mentioned ||
          a.name.toLowerCase() === mentioned
        );
        if (agent) {
          agentId = agent.id;
        }
      }

      // Add placeholder for assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        agentId: agentId || 'pm',
        agentName: BMAD_AGENTS.find(a => a.id === agentId)?.name || 'Assistant',
        isStreaming: true,
      };

      set(s => ({ messages: [...s.messages, assistantMessage] }));

      // Send to main process
      const result = await window.electronAPI.bmad.sendChatMessage(content, { agentId: agentId || undefined });

      if (result.success) {
        // Update the assistant message with the response
        set(s => ({
          messages: s.messages.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: result.data.content, isStreaming: false }
              : m
          ),
          isSending: false,
        }));
      } else {
        // Update with error
        set(s => ({
          messages: s.messages.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: `Error: ${result.error.message}`, isStreaming: false }
              : m
          ),
          isSending: false,
          error: result.error.message,
        }));
      }
    } catch (error) {
      set({
        isSending: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  },

  // Cancel current response
  cancelResponse: () => {
    window.electronAPI.bmad.cancelChatResponse?.();
    set({ isSending: false });
  },

  // Set input value and update autocomplete
  setInputValue: (value: string) => {
    const state = get();
    state.updateAutocomplete(value);
    set({ inputValue: value });
  },

  // Set active agent
  setActiveAgent: (agentId: string) => {
    set({ activeAgentId: agentId });
    window.electronAPI.bmad.setActiveAgent?.(agentId);
  },

  // Clear chat history
  clearHistory: () => {
    set({ messages: [] });
    window.electronAPI.bmad.clearChatHistory?.();
  },

  // Save current session
  saveSession: async () => {
    try {
      await window.electronAPI.bmad.saveChatSession?.();
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  // Load a saved session
  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.bmad.loadChatSession?.(sessionId);
      
      if (result?.success) {
        set({
          sessionId: result.data.id,
          messages: result.data.messages,
          activeAgentId: result.data.activeAgentId,
          isLoading: false,
        });
      } else {
        set({
          error: result?.error?.message || 'Failed to load session',
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load session',
        isLoading: false,
      });
    }
  },

  // Load list of saved sessions
  loadSavedSessions: async (_projectPath?: string) => {
    const projectPath = _projectPath || get().projectPath;
    if (!projectPath) return;
    
    try {
      const result = await window.electronAPI.bmad.listChatSessions?.(projectPath);
      
      if (result?.success) {
        set({ savedSessions: result.data });
      }
    } catch (error) {
      console.error('Failed to load saved sessions:', error);
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Get filtered slash commands for autocomplete
  getFilteredCommands: () => {
    const { autocompleteFilter } = get();
    if (!autocompleteFilter) return ALL_COMMANDS.slice(0, 10);
    
    const filter = autocompleteFilter.toLowerCase();
    return ALL_COMMANDS.filter(c => 
      c.command.toLowerCase().includes(filter) ||
      c.description.toLowerCase().includes(filter)
    ).slice(0, 10);
  },

  // Get filtered agents for autocomplete
  getFilteredAgents: () => {
    const { autocompleteFilter } = get();
    if (!autocompleteFilter) return BMAD_AGENTS.slice(0, 10) as unknown as AgentDefinition[];
    
    const filter = autocompleteFilter.toLowerCase();
    return BMAD_AGENTS.filter(a => 
      a.id.toLowerCase().includes(filter) ||
      a.name.toLowerCase().includes(filter) ||
      a.role.toLowerCase().includes(filter)
    ).slice(0, 10) as unknown as AgentDefinition[];
  },

  // Update autocomplete state based on input
  updateAutocomplete: (value: string) => {
    // Check for slash command
    if (value.startsWith('/')) {
      set({
        showSlashCommands: true,
        showAgentMentions: false,
        autocompleteFilter: value.slice(1),
      });
      return;
    }

    // Check for @mention
    if (value.startsWith('@')) {
      set({
        showSlashCommands: false,
        showAgentMentions: true,
        autocompleteFilter: value.slice(1),
      });
      return;
    }

    // Check for @mention in the middle of text
    const mentionMatch = value.match(/@(\w*)$/);
    if (mentionMatch) {
      set({
        showSlashCommands: false,
        showAgentMentions: true,
        autocompleteFilter: mentionMatch[1],
      });
      return;
    }

    // No autocomplete
    set({
      showSlashCommands: false,
      showAgentMentions: false,
      autocompleteFilter: '',
    });
  },

  // Select a command from autocomplete
  selectCommand: (command: SlashCommand) => {
    set({
      inputValue: command.command + ' ',
      showSlashCommands: false,
      autocompleteFilter: '',
    });
  },

  // Select an agent from autocomplete
  selectAgentMention: (agent: AgentDefinition) => {
    const { inputValue } = get();
    
    // Replace @partial with @agentId
    const newValue = inputValue.replace(/@\w*$/, `@${agent.id} `);
    
    set({
      inputValue: newValue,
      showAgentMentions: false,
      autocompleteFilter: '',
      mentionedAgentId: agent.id,
    });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectMessages = (state: ChatState) => state.messages;
export const selectIsStreaming = (state: ChatState) => 
  state.messages.some(m => m.isStreaming);
export const selectActiveAgent = (state: ChatState) => 
  BMAD_AGENTS.find(a => a.id === state.activeAgentId);
