/**
 * ChatView Component
 * 
 * Main chat interface for Interactive Mode.
 * Displays messages, handles input, and manages agent selection.
 * 
 * Stories: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Bot, Loader2, AlertCircle, History, X, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { useChatStore } from '../stores/chat-store';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatViewProps {
  projectPath: string;
}

// Agent options for selector
const AGENT_OPTIONS = [
  { id: 'pm', name: 'John', role: 'Product Manager', emoji: '📋' },
  { id: 'architect', name: 'Winston', role: 'Architect', emoji: '🏗️' },
  { id: 'analyst', name: 'Mary', role: 'Business Analyst', emoji: '📊' },
  { id: 'dev', name: 'Amelia', role: 'Developer', emoji: '💻' },
  { id: 'sm', name: 'Bob', role: 'Scrum Master', emoji: '🏃' },
  { id: 'tea', name: 'Murat', role: 'Test Architect', emoji: '🧪' },
  { id: 'ux-designer', name: 'Sally', role: 'UX Designer', emoji: '🎨' },
  { id: 'tech-writer', name: 'Alex', role: 'Technical Writer', emoji: '📚' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatView({ projectPath }: ChatViewProps) {
  const { t } = useTranslation(['navigation', 'common']);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Chat store state
  const {
    messages,
    isInitialized,
    isLoading,
    error,
    activeAgentId,
    isSending,
    initialize,
    sendMessage,
    setActiveAgent,
    clearHistory,
    clearError,
  } = useChatStore();

  // Initialize session on mount
  useEffect(() => {
    if (!isInitialized && projectPath) {
      initialize(projectPath);
    }
  }, [projectPath, isInitialized, initialize]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle send message
  const handleSend = useCallback((content: string) => {
    if (content.trim()) {
      sendMessage(content);
    }
  }, [sendMessage]);

  // Handle agent change
  const handleAgentChange = useCallback((agentId: string) => {
    setActiveAgent(agentId);
  }, [setActiveAgent]);

  // Get active agent info
  const activeAgent = AGENT_OPTIONS.find(a => a.id === activeAgentId) || AGENT_OPTIONS[0];

  // Loading state
  if (isLoading && !isInitialized) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Starting Interactive Mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Interactive Mode</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent Selector */}
          <Select value={activeAgentId || 'pm'} onValueChange={handleAgentChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{activeAgent.emoji}</span>
                  <span>{activeAgent.name}</span>
                  <span className="text-muted-foreground">({activeAgent.role})</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AGENT_OPTIONS.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <span className="flex items-center gap-2">
                    <span>{agent.emoji}</span>
                    <span>{agent.name}</span>
                    <span className="text-muted-foreground text-sm">({agent.role})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear History */}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearHistory}
            title="Clear chat history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={clearError}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="flex flex-col gap-4 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <h3 className="font-medium text-foreground mb-2">
                Welcome to Interactive Mode
              </h3>
              <p className="max-w-md text-sm">
                Chat with BMAD agents about your project. Use <code className="bg-muted px-1 rounded">@agent</code> to mention specific agents
                or <code className="bg-muted px-1 rounded">/command</code> to run workflows.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-3">
                  <code className="text-primary">@winston</code>
                  <p className="mt-1 text-muted-foreground">Ask the Architect</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <code className="text-primary">/prd</code>
                  <p className="mt-1 text-muted-foreground">Create PRD</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <code className="text-primary">@john</code>
                  <p className="mt-1 text-muted-foreground">Ask the PM</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <code className="text-primary">/sprint</code>
                  <p className="mt-1 text-muted-foreground">Sprint Planning</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          
          {/* Scroll anchor */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <ChatInput
          onSend={handleSend}
          disabled={isSending}
          placeholder={`Message ${activeAgent.name} (${activeAgent.role})...`}
        />
        {isSending && (
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>{activeAgent.name} is thinking...</span>
          </div>
        )}
      </div>
    </div>
  );
}
