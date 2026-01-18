/**
 * ChatMessage Component
 * 
 * Renders individual chat messages with agent avatars and formatting.
 * Supports user messages, assistant responses, and system messages.
 * 
 * Stories: 7.2
 */

import { memo } from 'react';
import { User, Bot, Info, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { ChatMessage as ChatMessageType } from '../stores/chat-store';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatMessageProps {
  message: ChatMessageType;
}

// Agent emoji map
const AGENT_EMOJIS: Record<string, string> = {
  'pm': '📋',
  'architect': '🏗️',
  'analyst': '📊',
  'dev': '💻',
  'sm': '🏃',
  'tea': '🧪',
  'ux-designer': '🎨',
  'tech-writer': '📚',
  'bmad-master': '🧙',
  'brainstorming-coach': '🧠',
  'creative-problem-solver': '🔬',
  'design-thinking-coach': '🎨',
  'innovation-strategist': '⚡',
  'presentation-master': '🎨',
  'storyteller': '📖',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  // Get agent emoji
  const agentEmoji = message.agentId ? AGENT_EMOJIS[message.agentId] || '🤖' : '🤖';

  // Format timestamp
  const formattedTime = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(message.timestamp));

  // System message style
  if (isSystem) {
    return (
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Info className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="text-sm text-muted-foreground">System</div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MessageContent content={message.content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <span>{agentEmoji}</span>
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1',
          isUser && 'items-end'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-2 text-xs text-muted-foreground',
            isUser && 'flex-row-reverse'
          )}
        >
          <span className="font-medium">
            {isUser ? 'You' : message.agentName || 'Assistant'}
          </span>
          <span>{formattedTime}</span>
          {message.workflowId && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
              /{message.workflowId}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <MessageContent content={message.content} isUser={isUser} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Message Content (with markdown-like formatting)
// ─────────────────────────────────────────────────────────────────────────────

interface MessageContentProps {
  content: string;
  isUser?: boolean;
}

function MessageContent({ content, isUser }: MessageContentProps) {
  // Simple formatting for chat messages
  // Bold: **text**
  // Code: `code`
  // Links: [text](url)
  
  const formattedContent = content
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-muted/50 px-1 rounded text-xs">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return (
    <div
      className={cn(
        'text-sm whitespace-pre-wrap',
        isUser && '[&_code]:bg-primary-foreground/20'
      )}
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  );
}
