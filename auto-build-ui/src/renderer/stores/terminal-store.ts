import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export type TerminalStatus = 'idle' | 'running' | 'claude-active' | 'exited';

export interface Terminal {
  id: string;
  title: string;
  status: TerminalStatus;
  cwd: string;
  createdAt: Date;
  isClaudeMode: boolean;
}

interface TerminalLayout {
  id: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

interface TerminalState {
  terminals: Terminal[];
  layouts: TerminalLayout[];
  activeTerminalId: string | null;
  maxTerminals: number;

  // Actions
  addTerminal: (cwd?: string) => Terminal | null;
  removeTerminal: (id: string) => void;
  updateTerminal: (id: string, updates: Partial<Terminal>) => void;
  setActiveTerminal: (id: string | null) => void;
  setTerminalStatus: (id: string, status: TerminalStatus) => void;
  setClaudeMode: (id: string, isClaudeMode: boolean) => void;
  clearAllTerminals: () => void;

  // Selectors
  getTerminal: (id: string) => Terminal | undefined;
  getActiveTerminal: () => Terminal | undefined;
  canAddTerminal: () => boolean;
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  terminals: [],
  layouts: [],
  activeTerminalId: null,
  maxTerminals: 10,

  addTerminal: (cwd?: string) => {
    const state = get();
    if (state.terminals.length >= state.maxTerminals) {
      return null;
    }

    const newTerminal: Terminal = {
      id: uuid(),
      title: `Terminal ${state.terminals.length + 1}`,
      status: 'idle',
      cwd: cwd || process.env.HOME || '~',
      createdAt: new Date(),
      isClaudeMode: false,
    };

    set((state) => ({
      terminals: [...state.terminals, newTerminal],
      activeTerminalId: newTerminal.id,
    }));

    return newTerminal;
  },

  removeTerminal: (id: string) => {
    set((state) => {
      const newTerminals = state.terminals.filter((t) => t.id !== id);
      const newActiveId = state.activeTerminalId === id
        ? (newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null)
        : state.activeTerminalId;

      return {
        terminals: newTerminals,
        activeTerminalId: newActiveId,
      };
    });
  },

  updateTerminal: (id: string, updates: Partial<Terminal>) => {
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  },

  setActiveTerminal: (id: string | null) => {
    set({ activeTerminalId: id });
  },

  setTerminalStatus: (id: string, status: TerminalStatus) => {
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id ? { ...t, status } : t
      ),
    }));
  },

  setClaudeMode: (id: string, isClaudeMode: boolean) => {
    set((state) => ({
      terminals: state.terminals.map((t) =>
        t.id === id
          ? { ...t, isClaudeMode, status: isClaudeMode ? 'claude-active' : 'running' }
          : t
      ),
    }));
  },

  clearAllTerminals: () => {
    set({ terminals: [], activeTerminalId: null });
  },

  getTerminal: (id: string) => {
    return get().terminals.find((t) => t.id === id);
  },

  getActiveTerminal: () => {
    const state = get();
    return state.terminals.find((t) => t.id === state.activeTerminalId);
  },

  canAddTerminal: () => {
    const state = get();
    return state.terminals.length < state.maxTerminals;
  },
}));
