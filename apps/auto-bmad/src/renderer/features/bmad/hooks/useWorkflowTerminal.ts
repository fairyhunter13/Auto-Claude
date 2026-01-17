/**
 * useWorkflowTerminal Hook
 * 
 * Manages a terminal display for BMAD workflow execution.
 * Connects to the BMAD workflow runner and displays real-time output.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { useBmadStore } from '../stores/bmad-store';

interface UseWorkflowTerminalOptions {
  /** Container element ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Whether to auto-scroll on new output */
  autoScroll?: boolean;
}

interface UseWorkflowTerminalReturn {
  /** Write data to terminal */
  write: (data: string) => void;
  /** Write line to terminal */
  writeln: (data: string) => void;
  /** Clear terminal */
  clear: () => void;
  /** Focus terminal */
  focus: () => void;
  /** Fit terminal to container */
  fit: () => void;
  /** Terminal instance (for advanced use) */
  terminal: Terminal | null;
}

/**
 * Hook for managing a workflow terminal display
 */
export function useWorkflowTerminal({
  containerRef,
  autoScroll = true,
}: UseWorkflowTerminalOptions): UseWorkflowTerminalReturn {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Subscribe to workflow output from store
  const workflowOutput = useBmadStore(state => state.workflowOutput);
  const lastOutputLengthRef = useRef(0);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    // Create terminal instance
    const terminal = new Terminal({
      cursorBlink: false,
      cursorStyle: 'block',
      disableStdin: true, // Read-only display
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      theme: {
        background: '#0B0B0F',
        foreground: '#E4E4E7',
        cursor: '#E4E4E7',
        cursorAccent: '#0B0B0F',
        selectionBackground: '#3B82F6',
        selectionForeground: '#FFFFFF',
        black: '#0B0B0F',
        red: '#EF4444',
        green: '#22C55E',
        yellow: '#EAB308',
        blue: '#3B82F6',
        magenta: '#A855F7',
        cyan: '#06B6D4',
        white: '#E4E4E7',
        brightBlack: '#52525B',
        brightRed: '#F87171',
        brightGreen: '#4ADE80',
        brightYellow: '#FACC15',
        brightBlue: '#60A5FA',
        brightMagenta: '#C084FC',
        brightCyan: '#22D3EE',
        brightWhite: '#FAFAFA',
      },
      scrollback: 10000,
      convertEol: true,
    });

    // Add fit addon
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    fitAddonRef.current = fitAddon;

    // Open terminal in container
    terminal.open(containerRef.current);

    // Try to use WebGL renderer for better performance
    try {
      const webglAddon = new WebglAddon();
      terminal.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
    } catch (e) {
      console.warn('[WorkflowTerminal] WebGL addon failed to load, using canvas renderer');
    }

    // Fit to container
    fitAddon.fit();

    // Setup resize observer
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        // Ignore fit errors during resize
      }
    });
    resizeObserver.observe(containerRef.current);
    resizeObserverRef.current = resizeObserver;

    terminalRef.current = terminal;

    // Show welcome message
    terminal.writeln('\x1b[90m╭──────────────────────────────────────────────────────╮\x1b[0m');
    terminal.writeln('\x1b[90m│\x1b[0m  \x1b[1;36mBMAD Workflow Terminal\x1b[0m                              \x1b[90m│\x1b[0m');
    terminal.writeln('\x1b[90m│\x1b[0m  Start a workflow to see output here                 \x1b[90m│\x1b[0m');
    terminal.writeln('\x1b[90m╰──────────────────────────────────────────────────────╯\x1b[0m');
    terminal.writeln('');

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      webglAddonRef.current?.dispose();
      fitAddon.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      webglAddonRef.current = null;
      resizeObserverRef.current = null;
    };
  }, [containerRef]);

  // Write new output to terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Only write new output (incremental)
    const newOutput = workflowOutput.slice(lastOutputLengthRef.current);
    for (const line of newOutput) {
      terminalRef.current.write(line);
    }
    lastOutputLengthRef.current = workflowOutput.length;

    // Auto-scroll to bottom
    if (autoScroll && newOutput.length > 0) {
      terminalRef.current.scrollToBottom();
    }
  }, [workflowOutput, autoScroll]);

  // Write data to terminal
  const write = useCallback((data: string) => {
    terminalRef.current?.write(data);
  }, []);

  // Write line to terminal
  const writeln = useCallback((data: string) => {
    terminalRef.current?.writeln(data);
  }, []);

  // Clear terminal
  const clear = useCallback(() => {
    terminalRef.current?.clear();
    lastOutputLengthRef.current = 0;
  }, []);

  // Focus terminal
  const focus = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  // Fit terminal to container
  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
  }, []);

  return {
    write,
    writeln,
    clear,
    focus,
    fit,
    terminal: terminalRef.current,
  };
}
