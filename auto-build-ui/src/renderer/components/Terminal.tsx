import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { X, Sparkles, TerminalSquare } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { useTerminalStore, type TerminalStatus } from '../stores/terminal-store';

interface TerminalProps {
  id: string;
  cwd?: string;
  isActive: boolean;
  onClose: () => void;
  onActivate: () => void;
}

const STATUS_COLORS: Record<TerminalStatus, string> = {
  idle: 'bg-muted',
  running: 'bg-success',
  'claude-active': 'bg-primary',
  exited: 'bg-destructive',
};

export function Terminal({ id, cwd, isActive, onClose, onActivate }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const terminal = useTerminalStore((state) => state.terminals.find((t) => t.id === id));
  const setTerminalStatus = useTerminalStore((state) => state.setTerminalStatus);
  const setClaudeMode = useTerminalStore((state) => state.setClaudeMode);
  const updateTerminal = useTerminalStore((state) => state.updateTerminal);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || isInitialized) return;

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 13,
      fontFamily: 'var(--font-mono), "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      letterSpacing: 0,
      theme: {
        background: '#0B0B0F',
        foreground: '#E8E6E3',
        cursor: '#D6D876',
        cursorAccent: '#0B0B0F',
        selectionBackground: '#D6D87640',
        selectionForeground: '#E8E6E3',
        black: '#1A1A1F',
        red: '#FF6B6B',
        green: '#87D687',
        yellow: '#D6D876',
        blue: '#6BB3FF',
        magenta: '#C792EA',
        cyan: '#89DDFF',
        white: '#E8E6E3',
        brightBlack: '#4A4A50',
        brightRed: '#FF8A8A',
        brightGreen: '#A5E6A5',
        brightYellow: '#E8E87A',
        brightBlue: '#8AC4FF',
        brightMagenta: '#DEB3FF',
        brightCyan: '#A6E8FF',
        brightWhite: '#FFFFFF',
      },
      allowProposedApi: true,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Create the terminal process in main
    const cols = xterm.cols;
    const rows = xterm.rows;

    window.electronAPI.createTerminal({
      id,
      cwd,
      cols,
      rows,
    }).then((result) => {
      if (result.success) {
        setTerminalStatus(id, 'running');
      } else {
        xterm.writeln(`\r\n\x1b[31mError: ${result.error}\x1b[0m`);
      }
    });

    // Handle terminal input
    xterm.onData((data) => {
      window.electronAPI.sendTerminalInput(id, data);
    });

    // Handle resize
    xterm.onResize(({ cols, rows }) => {
      window.electronAPI.resizeTerminal(id, cols, rows);
    });

    setIsInitialized(true);

    return () => {
      xterm.dispose();
      window.electronAPI.destroyTerminal(id);
    };
  }, [id, cwd, isInitialized, setTerminalStatus]);

  // Handle terminal output from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalOutput((terminalId, data) => {
      if (terminalId === id && xtermRef.current) {
        xtermRef.current.write(data);
      }
    });

    return cleanup;
  }, [id]);

  // Handle terminal exit
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalExit((terminalId, exitCode) => {
      if (terminalId === id) {
        setTerminalStatus(id, 'exited');
        if (xtermRef.current) {
          xtermRef.current.writeln(`\r\n\x1b[90mProcess exited with code ${exitCode}\x1b[0m`);
        }
      }
    });

    return cleanup;
  }, [id, setTerminalStatus]);

  // Handle terminal title change
  useEffect(() => {
    const cleanup = window.electronAPI.onTerminalTitleChange((terminalId, title) => {
      if (terminalId === id) {
        updateTerminal(id, { title });
      }
    });

    return cleanup;
  }, [id, updateTerminal]);

  // Handle resize on window resize
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };

    // Use ResizeObserver for the terminal container
    const container = terminalRef.current?.parentElement;
    if (container) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }
  }, [isInitialized]);

  // Focus terminal when it becomes active
  useEffect(() => {
    if (isActive && xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [isActive]);

  const handleInvokeClaude = useCallback(() => {
    setClaudeMode(id, true);
    window.electronAPI.invokeClaudeInTerminal(id, cwd);
  }, [id, cwd, setClaudeMode]);

  const handleClick = useCallback(() => {
    onActivate();
    if (xtermRef.current) {
      xtermRef.current.focus();
    }
  }, [onActivate]);

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border bg-[#0B0B0F] overflow-hidden transition-all',
        isActive ? 'border-primary ring-1 ring-primary/20' : 'border-border'
      )}
      onClick={handleClick}
    >
      {/* Terminal header */}
      <div className="electron-no-drag flex h-9 items-center justify-between border-b border-border/50 bg-card/30 px-2">
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', STATUS_COLORS[terminal?.status || 'idle'])} />
          <div className="flex items-center gap-1.5">
            <TerminalSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground truncate max-w-32">
              {terminal?.title || 'Terminal'}
            </span>
          </div>
          {terminal?.isClaudeMode && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              <Sparkles className="h-2.5 w-2.5" />
              Claude
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!terminal?.isClaudeMode && terminal?.status === 'running' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                handleInvokeClaude();
              }}
            >
              <Sparkles className="h-3 w-3" />
              Claude
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={terminalRef}
        className="flex-1 p-1"
        style={{ minHeight: 0 }}
      />
    </div>
  );
}
