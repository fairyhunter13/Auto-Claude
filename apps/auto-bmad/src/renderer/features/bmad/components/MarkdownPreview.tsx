/**
 * MarkdownPreview Component
 * 
 * Renders markdown content with proper formatting, syntax highlighting,
 * and responsive styling. Uses react-markdown with GFM support.
 */

import { useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  // Memoize the markdown rendering for performance
  const renderedContent = useMemo(() => {
    return (
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="scroll-m-20 text-3xl font-bold tracking-tight mt-8 mb-4 first:mt-0 border-b pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-8 mb-3 first:mt-0 border-b pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="scroll-m-20 text-xl font-semibold tracking-tight mt-6 mb-2">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="scroll-m-20 text-lg font-semibold tracking-tight mt-4 mb-2">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="scroll-m-20 text-base font-semibold tracking-tight mt-4 mb-1">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="scroll-m-20 text-sm font-semibold tracking-tight mt-4 mb-1">
              {children}
            </h6>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="leading-7 [&:not(:first-child)]:mt-4">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="my-4 ml-6 list-disc [&>li]:mt-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 ml-6 list-decimal [&>li]:mt-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="mt-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Code
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            
            if (isInline) {
              return (
                <code
                  className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <code
                className={cn(
                  'block relative rounded-lg bg-zinc-950 dark:bg-zinc-900 p-4 font-mono text-sm overflow-x-auto',
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-lg bg-zinc-950 dark:bg-zinc-900 text-zinc-100">
              {children}
            </pre>
          ),

          // Table
          table: ({ children }) => (
            <div className="my-6 w-full overflow-auto">
              <table className="w-full border-collapse border border-border">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border transition-colors hover:bg-muted/30">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="border border-border px-4 py-2 text-left font-semibold [&[align=center]]:text-center [&[align=right]]:text-right">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right">
              {children}
            </td>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {children}
            </a>
          ),

          // Images
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              className="rounded-lg border max-w-full h-auto my-4"
              loading="lazy"
            />
          ),

          // Horizontal rule
          hr: () => <hr className="my-8 border-border" />,

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold">{children}</strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),

          // Delete/Strikethrough
          del: ({ children }) => (
            <del className="line-through text-muted-foreground">{children}</del>
          ),
        }}
      >
        {content}
      </Markdown>
    );
  }, [content]);

  return (
    <div
      className={cn(
        'prose prose-zinc dark:prose-invert max-w-none',
        'prose-headings:font-semibold',
        'prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      {renderedContent}
    </div>
  );
}
