/**
 * Chat Store Tests
 * 
 * Unit tests for the Interactive Mode chat store.
 * Tests FR31-FR35: Interactive Mode features
 * 
 * @story 9.2 - Backend Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Setup
// ─────────────────────────────────────────────────────────────────────────────

// Mock the window.electronAPI
const mockElectronAPI = {
  bmad: {
    initInteractiveSession: vi.fn(),
    sendChatMessage: vi.fn(),
    cancelChatResponse: vi.fn(),
    setActiveAgent: vi.fn(),
    clearChatHistory: vi.fn(),
    saveChatSession: vi.fn(),
    loadChatSession: vi.fn(),
    listChatSessions: vi.fn(),
  },
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

// Import store after mocking
import { useChatStore, selectMessages, selectIsStreaming, selectActiveAgent } from '../chat-store';

// ─────────────────────────────────────────────────────────────────────────────
// Test Utilities
// ─────────────────────────────────────────────────────────────────────────────

function resetStore() {
  useChatStore.setState({
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
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR31 - Start Interactive Mode Session
// ─────────────────────────────────────────────────────────────────────────────

describe('FR31: Start Interactive Mode Session', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should initialize a new session successfully', async () => {
    mockElectronAPI.bmad.initInteractiveSession.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'test-session-123',
        messages: [],
      },
    });

    const { initialize } = useChatStore.getState();
    
    await act(async () => {
      await initialize('/test/project');
    });

    const state = useChatStore.getState();
    expect(state.sessionId).toBe('test-session-123');
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.projectPath).toBe('/test/project');
    expect(state.activeAgentId).toBe('pm'); // Default agent
  });

  it('should handle initialization with existing messages', async () => {
    const existingMessages = [
      { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: '2', role: 'assistant', content: 'Hi there!', timestamp: new Date() },
    ];

    mockElectronAPI.bmad.initInteractiveSession.mockResolvedValue({
      success: true,
      data: {
        sessionId: 'test-session-456',
        messages: existingMessages,
      },
    });

    const { initialize } = useChatStore.getState();
    
    await act(async () => {
      await initialize('/test/project');
    });

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0].content).toBe('Hello');
  });

  it('should handle initialization error', async () => {
    mockElectronAPI.bmad.initInteractiveSession.mockResolvedValue({
      success: false,
      error: { message: 'Failed to start session' },
    });

    const { initialize } = useChatStore.getState();
    
    await act(async () => {
      await initialize('/test/project');
    });

    const state = useChatStore.getState();
    expect(state.error).toBe('Failed to start session');
    expect(state.isInitialized).toBe(false);
  });

  it('should set loading state during initialization', async () => {
    let resolvePromise: (value: any) => void;
    mockElectronAPI.bmad.initInteractiveSession.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { initialize } = useChatStore.getState();
    
    // Start initialization
    const initPromise = initialize('/test/project');
    
    // Check loading state
    expect(useChatStore.getState().isLoading).toBe(true);
    
    // Complete initialization
    resolvePromise!({ success: true, data: { sessionId: 'test', messages: [] } });
    await initPromise;
    
    expect(useChatStore.getState().isLoading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR32 - Chat with AI Agents
// ─────────────────────────────────────────────────────────────────────────────

describe('FR32: Chat with AI Agents', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    // Set up initialized session
    useChatStore.setState({
      sessionId: 'test-session',
      isInitialized: true,
      activeAgentId: 'pm',
    });
  });

  it('should send a message and receive response', async () => {
    mockElectronAPI.bmad.sendChatMessage.mockResolvedValue({
      success: true,
      data: { content: 'Response from PM' },
    });

    const { sendMessage } = useChatStore.getState();
    
    await act(async () => {
      await sendMessage('Hello, can you help me?');
    });

    const state = useChatStore.getState();
    expect(state.messages).toHaveLength(2); // User + Assistant
    expect(state.messages[0].role).toBe('user');
    expect(state.messages[0].content).toBe('Hello, can you help me?');
    expect(state.messages[1].role).toBe('assistant');
    expect(state.messages[1].content).toBe('Response from PM');
  });

  it('should not send message if session not initialized', async () => {
    useChatStore.setState({ sessionId: null });

    const { sendMessage } = useChatStore.getState();
    
    await act(async () => {
      await sendMessage('Hello');
    });

    expect(mockElectronAPI.bmad.sendChatMessage).not.toHaveBeenCalled();
  });

  it('should not send message while already sending', async () => {
    useChatStore.setState({ isSending: true });

    const { sendMessage } = useChatStore.getState();
    
    await act(async () => {
      await sendMessage('Hello');
    });

    expect(mockElectronAPI.bmad.sendChatMessage).not.toHaveBeenCalled();
  });

  it('should handle message send error', async () => {
    mockElectronAPI.bmad.sendChatMessage.mockResolvedValue({
      success: false,
      error: { message: 'Network error' },
    });

    const { sendMessage } = useChatStore.getState();
    
    await act(async () => {
      await sendMessage('Hello');
    });

    const state = useChatStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isSending).toBe(false);
  });

  it('should clear input after sending', async () => {
    useChatStore.setState({ inputValue: 'Test message' });
    
    mockElectronAPI.bmad.sendChatMessage.mockResolvedValue({
      success: true,
      data: { content: 'Response' },
    });

    const { sendMessage } = useChatStore.getState();
    
    await act(async () => {
      await sendMessage('Test message');
    });

    expect(useChatStore.getState().inputValue).toBe('');
  });

  it('should cancel response', () => {
    useChatStore.setState({ isSending: true });

    const { cancelResponse } = useChatStore.getState();
    cancelResponse();

    expect(mockElectronAPI.bmad.cancelChatResponse).toHaveBeenCalled();
    expect(useChatStore.getState().isSending).toBe(false);
  });

  it('should set active agent', () => {
    const { setActiveAgent } = useChatStore.getState();
    setActiveAgent('architect');

    expect(useChatStore.getState().activeAgentId).toBe('architect');
    expect(mockElectronAPI.bmad.setActiveAgent).toHaveBeenCalledWith('architect');
  });

  it('should clear chat history', () => {
    useChatStore.setState({
      messages: [
        { id: '1', role: 'user', content: 'Hello', timestamp: new Date() },
      ],
    });

    const { clearHistory } = useChatStore.getState();
    clearHistory();

    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(mockElectronAPI.bmad.clearChatHistory).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR33 - Run Workflows via Slash Commands
// ─────────────────────────────────────────────────────────────────────────────

describe('FR33: Run Workflows via Slash Commands', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it('should show slash command autocomplete when typing /', () => {
    const { updateAutocomplete } = useChatStore.getState();
    updateAutocomplete('/');

    const state = useChatStore.getState();
    expect(state.showSlashCommands).toBe(true);
    expect(state.showAgentMentions).toBe(false);
  });

  it('should filter slash commands based on input', () => {
    const { updateAutocomplete, getFilteredCommands } = useChatStore.getState();
    updateAutocomplete('/prd');

    const commands = getFilteredCommands();
    expect(commands.some(c => c.command === '/prd')).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should select a slash command', () => {
    const { selectCommand } = useChatStore.getState();
    selectCommand({
      command: '/prd',
      description: 'Create Product Requirements Document',
      workflowId: 'prd',
      agent: 'pm',
    });

    const state = useChatStore.getState();
    expect(state.inputValue).toBe('/prd ');
    expect(state.showSlashCommands).toBe(false);
  });

  it('should include common shortcuts like /arch and /sprint', () => {
    const { updateAutocomplete, getFilteredCommands } = useChatStore.getState();
    updateAutocomplete('/');

    const commands = getFilteredCommands();
    const commandNames = commands.map(c => c.command);
    
    expect(commandNames).toContain('/prd');
    expect(commandNames).toContain('/arch');
    expect(commandNames).toContain('/sprint');
    expect(commandNames).toContain('/story');
    expect(commandNames).toContain('/gate');
  });

  it('should filter commands by description', () => {
    const { updateAutocomplete, getFilteredCommands } = useChatStore.getState();
    updateAutocomplete('/architecture');

    const commands = getFilteredCommands();
    expect(commands.some(c => c.workflowId === 'architecture')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR34 - @mention Specific Agents
// ─────────────────────────────────────────────────────────────────────────────

describe('FR34: @mention Specific Agents', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    useChatStore.setState({
      sessionId: 'test-session',
      isInitialized: true,
      activeAgentId: 'pm',
    });
  });

  it('should show agent mentions when typing @', () => {
    const { updateAutocomplete } = useChatStore.getState();
    updateAutocomplete('@');

    const state = useChatStore.getState();
    expect(state.showAgentMentions).toBe(true);
    expect(state.showSlashCommands).toBe(false);
  });

  it('should filter agents based on input', () => {
    const { updateAutocomplete, getFilteredAgents } = useChatStore.getState();
    updateAutocomplete('@win');

    const agents = getFilteredAgents();
    expect(agents.some(a => a.id === 'architect')).toBe(true); // Winston
  });

  it('should filter agents by name', () => {
    const { updateAutocomplete, getFilteredAgents } = useChatStore.getState();
    updateAutocomplete('@mary');

    const agents = getFilteredAgents();
    expect(agents.some(a => a.id === 'analyst')).toBe(true);
  });

  it('should filter agents by role', () => {
    const { updateAutocomplete, getFilteredAgents } = useChatStore.getState();
    updateAutocomplete('@architect');

    const agents = getFilteredAgents();
    expect(agents.some(a => a.role.toLowerCase().includes('architect'))).toBe(true);
  });

  it('should select an agent mention', () => {
    useChatStore.setState({ inputValue: '@win' });
    
    const { selectAgentMention } = useChatStore.getState();
    selectAgentMention({
      id: 'architect',
      name: 'Winston',
      role: 'Architect',
      module: 'bmm',
    });

    const state = useChatStore.getState();
    expect(state.inputValue).toBe('@architect ');
    expect(state.showAgentMentions).toBe(false);
    expect(state.mentionedAgentId).toBe('architect');
  });

  it('should detect @mention in message and send to correct agent', async () => {
    mockElectronAPI.bmad.sendChatMessage.mockResolvedValue({
      success: true,
      data: { content: 'Response from architect' },
    });

    const { sendMessage } = useChatStore.getState();
    
    await act(async () => {
      await sendMessage('@architect Please review the architecture');
    });

    expect(mockElectronAPI.bmad.sendChatMessage).toHaveBeenCalledWith(
      '@architect Please review the architecture',
      { agentId: 'architect' }
    );
  });

  it('should detect @mention in middle of text', () => {
    const { updateAutocomplete } = useChatStore.getState();
    updateAutocomplete('Please help @win');

    const state = useChatStore.getState();
    expect(state.showAgentMentions).toBe(true);
    expect(state.autocompleteFilter).toBe('win');
  });

  it('should include all BMAD agents', () => {
    const { updateAutocomplete, getFilteredAgents } = useChatStore.getState();
    updateAutocomplete('@');

    const agents = getFilteredAgents();
    const agentIds = agents.map(a => a.id);
    
    expect(agentIds).toContain('analyst');
    expect(agentIds).toContain('architect');
    expect(agentIds).toContain('pm');
    expect(agentIds).toContain('dev');
    expect(agentIds).toContain('sm');
    expect(agentIds).toContain('ux-designer');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: FR35 - Maintain Conversation History
// ─────────────────────────────────────────────────────────────────────────────

describe('FR35: Maintain Conversation History', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    useChatStore.setState({
      sessionId: 'test-session',
      projectPath: '/test/project',
      isInitialized: true,
    });
  });

  it('should save session', async () => {
    mockElectronAPI.bmad.saveChatSession.mockResolvedValue({ success: true });

    const { saveSession } = useChatStore.getState();
    
    await act(async () => {
      await saveSession();
    });

    expect(mockElectronAPI.bmad.saveChatSession).toHaveBeenCalled();
  });

  it('should load a saved session', async () => {
    const savedSession = {
      id: 'saved-session-1',
      messages: [
        { id: '1', role: 'user', content: 'Previous message', timestamp: new Date() },
      ],
      activeAgentId: 'architect',
    };

    mockElectronAPI.bmad.loadChatSession.mockResolvedValue({
      success: true,
      data: savedSession,
    });

    const { loadSession } = useChatStore.getState();
    
    await act(async () => {
      await loadSession('saved-session-1');
    });

    const state = useChatStore.getState();
    expect(state.sessionId).toBe('saved-session-1');
    expect(state.messages).toHaveLength(1);
    expect(state.activeAgentId).toBe('architect');
  });

  it('should handle load session error', async () => {
    mockElectronAPI.bmad.loadChatSession.mockResolvedValue({
      success: false,
      error: { message: 'Session not found' },
    });

    const { loadSession } = useChatStore.getState();
    
    await act(async () => {
      await loadSession('non-existent');
    });

    expect(useChatStore.getState().error).toBe('Session not found');
  });

  it('should load list of saved sessions', async () => {
    const sessions = [
      { id: 'session-1', createdAt: new Date(), messageCount: 5 },
      { id: 'session-2', createdAt: new Date(), messageCount: 10 },
    ];

    mockElectronAPI.bmad.listChatSessions.mockResolvedValue({
      success: true,
      data: sessions,
    });

    const { loadSavedSessions } = useChatStore.getState();
    
    await act(async () => {
      await loadSavedSessions('/test/project');
    });

    expect(useChatStore.getState().savedSessions).toHaveLength(2);
  });

  it('should clear error', () => {
    useChatStore.setState({ error: 'Some error' });

    const { clearError } = useChatStore.getState();
    clearError();

    expect(useChatStore.getState().error).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Selectors
// ─────────────────────────────────────────────────────────────────────────────

describe('Chat Store Selectors', () => {
  beforeEach(() => {
    resetStore();
  });

  it('selectMessages should return messages', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
    ];
    useChatStore.setState({ messages });

    const result = selectMessages(useChatStore.getState());
    expect(result).toEqual(messages);
  });

  it('selectIsStreaming should return true when any message is streaming', () => {
    useChatStore.setState({
      messages: [
        { id: '1', role: 'assistant' as const, content: '', timestamp: new Date(), isStreaming: true },
      ],
    });

    const result = selectIsStreaming(useChatStore.getState());
    expect(result).toBe(true);
  });

  it('selectIsStreaming should return false when no message is streaming', () => {
    useChatStore.setState({
      messages: [
        { id: '1', role: 'assistant' as const, content: 'Done', timestamp: new Date(), isStreaming: false },
      ],
    });

    const result = selectIsStreaming(useChatStore.getState());
    expect(result).toBe(false);
  });

  it('selectActiveAgent should return the active agent', () => {
    useChatStore.setState({ activeAgentId: 'architect' });

    const agent = selectActiveAgent(useChatStore.getState());
    expect(agent?.id).toBe('architect');
    expect(agent?.name).toBe('Winston');
  });

  it('selectActiveAgent should return undefined for invalid agent', () => {
    useChatStore.setState({ activeAgentId: 'invalid-agent' });

    const agent = selectActiveAgent(useChatStore.getState());
    expect(agent).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: Autocomplete Edge Cases
// ─────────────────────────────────────────────────────────────────────────────

describe('Autocomplete Edge Cases', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should hide autocomplete for regular text', () => {
    const { updateAutocomplete } = useChatStore.getState();
    updateAutocomplete('Hello world');

    const state = useChatStore.getState();
    expect(state.showSlashCommands).toBe(false);
    expect(state.showAgentMentions).toBe(false);
  });

  it('should limit filtered results to 10 items', () => {
    const { updateAutocomplete, getFilteredCommands, getFilteredAgents } = useChatStore.getState();
    
    updateAutocomplete('/');
    expect(getFilteredCommands().length).toBeLessThanOrEqual(10);

    updateAutocomplete('@');
    expect(getFilteredAgents().length).toBeLessThanOrEqual(10);
  });

  it('should handle empty filter', () => {
    const { getFilteredCommands, getFilteredAgents } = useChatStore.getState();
    
    expect(getFilteredCommands().length).toBeGreaterThan(0);
    expect(getFilteredAgents().length).toBeGreaterThan(0);
  });
});
