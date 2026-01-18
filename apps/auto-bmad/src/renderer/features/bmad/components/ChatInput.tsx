/**
 * ChatInput Component
 * 
 * Input field for Interactive Mode with slash command and @mention autocomplete.
 * 
 * Stories: 7.2, 7.3, 7.4
 */

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { Send, Slash, AtSign } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { useChatStore } from '../stores/chat-store';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Chat store for autocomplete
  const {
    inputValue,
    setInputValue,
    showSlashCommands,
    showAgentMentions,
    getFilteredCommands,
    getFilteredAgents,
    selectCommand,
    selectAgentMention,
  } = useChatStore();

  // Get filtered items
  const filteredCommands = getFilteredCommands();
  const filteredAgents = getFilteredAgents();

  // Reset selection when autocomplete changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [showSlashCommands, showAgentMentions]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, [setInputValue]);

  // Handle send
  const handleSend = useCallback(() => {
    if (inputValue.trim() && !disabled) {
      onSend(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, disabled, onSend, setInputValue]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocomplete navigation
    if (showSlashCommands || showAgentMentions) {
      const items = showSlashCommands ? filteredCommands : filteredAgents;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return;
      }
      
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (showSlashCommands && filteredCommands[selectedIndex]) {
          selectCommand(filteredCommands[selectedIndex]);
        } else if (showAgentMentions && filteredAgents[selectedIndex]) {
          selectAgentMention(filteredAgents[selectedIndex]);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        setInputValue('');
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (showSlashCommands && filteredCommands[selectedIndex]) {
          selectCommand(filteredCommands[selectedIndex]);
        } else if (showAgentMentions && filteredAgents[selectedIndex]) {
          selectAgentMention(filteredAgents[selectedIndex]);
        }
        return;
      }
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [
    showSlashCommands,
    showAgentMentions,
    filteredCommands,
    filteredAgents,
    selectedIndex,
    selectCommand,
    selectAgentMention,
    setInputValue,
    handleSend,
  ]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="relative">
      {/* Slash Command Autocomplete */}
      {showSlashCommands && filteredCommands.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-2 text-xs text-muted-foreground border-b border-border flex items-center gap-1">
            <Slash className="h-3 w-3" />
            <span>Commands</span>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.workflowId}
                className={cn(
                  'w-full flex items-start gap-3 rounded-md px-3 py-2 text-left text-sm',
                  'hover:bg-accent transition-colors',
                  index === selectedIndex && 'bg-accent'
                )}
                onClick={() => selectCommand(cmd)}
              >
                <code className="text-primary font-mono">{cmd.command}</code>
                <span className="text-muted-foreground">{cmd.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent Mention Autocomplete */}
      {showAgentMentions && filteredAgents.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-2 text-xs text-muted-foreground border-b border-border flex items-center gap-1">
            <AtSign className="h-3 w-3" />
            <span>Mention an agent</span>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredAgents.map((agent, index) => (
              <button
                key={agent.id}
                className={cn(
                  'w-full flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm',
                  'hover:bg-accent transition-colors',
                  index === selectedIndex && 'bg-accent'
                )}
                onClick={() => selectAgentMention(agent)}
              >
                <code className="text-primary font-mono">@{agent.id}</code>
                <span className="font-medium">{agent.name}</span>
                <span className="text-muted-foreground">({agent.role})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Field */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Type a message... (/ for commands, @ for agents)'}
            disabled={disabled}
            className="min-h-[44px] max-h-[200px] resize-none pr-10"
            rows={1}
          />
          
          {/* Quick action hints */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
            {!inputValue && (
              <>
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium">
                  /
                </kbd>
                <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium">
                  @
                </kbd>
              </>
            )}
          </div>
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          size="icon"
          className="h-11 w-11"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Help text */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <kbd className="rounded border border-border bg-muted px-1">Enter</kbd> to send,{' '}
          <kbd className="rounded border border-border bg-muted px-1">Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
