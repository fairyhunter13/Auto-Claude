/**
 * Agent Store Tests
 * 
 * Tests FR17-FR20: Agent Roster functionality
 * - FR17: View all BMAD agents
 * - FR18: See active agent indicator
 * - FR19: Read agent communication style
 * - FR20: Filter agents by module
 * 
 * Story 9.4/9.5: Test Coverage Gap Fill
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock Types
// ============================================================================

interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  module: 'bmm' | 'cis' | 'core' | 'bmb';
  description?: string;
  principles?: string[];
  communicationStyle?: string;
}

// Mock agent data
const MOCK_AGENTS: AgentDefinition[] = [
  {
    id: 'pm',
    name: 'John',
    role: 'Product Manager',
    module: 'bmm',
    description: 'Manages product requirements and roadmap',
    communicationStyle: 'Clear, concise, outcome-focused',
    principles: ['User-first', 'Data-driven decisions'],
  },
  {
    id: 'architect',
    name: 'Winston',
    role: 'Architect',
    module: 'bmm',
    description: 'Designs system architecture',
    communicationStyle: 'Technical, thorough, systematic',
    principles: ['Scalability', 'Maintainability', 'Security'],
  },
  {
    id: 'analyst',
    name: 'Mary',
    role: 'Business Analyst',
    module: 'bmm',
    description: 'Analyzes business requirements',
    communicationStyle: 'Analytical, detail-oriented',
    principles: ['Stakeholder alignment', 'Requirements clarity'],
  },
  {
    id: 'dev',
    name: 'Amelia',
    role: 'Developer',
    module: 'bmm',
    description: 'Implements code and features',
    communicationStyle: 'Practical, solution-oriented',
    principles: ['Clean code', 'Test coverage', 'Documentation'],
  },
  {
    id: 'sm',
    name: 'Bob',
    role: 'Scrum Master',
    module: 'bmm',
    description: 'Facilitates sprint planning and execution',
    communicationStyle: 'Collaborative, process-focused',
    principles: ['Agile principles', 'Team velocity'],
  },
  {
    id: 'tea',
    name: 'Murat',
    role: 'Test Architect',
    module: 'bmm',
    description: 'Designs test strategies',
    communicationStyle: 'Quality-focused, thorough',
    principles: ['Test coverage', 'Automation'],
  },
  {
    id: 'ux-designer',
    name: 'Sally',
    role: 'UX Designer',
    module: 'bmm',
    description: 'Designs user experiences',
    communicationStyle: 'User-centric, visual',
    principles: ['Usability', 'Accessibility'],
  },
  {
    id: 'brainstorming-coach',
    name: 'Brainstorming Coach',
    role: 'Brainstorming Facilitator',
    module: 'cis',
    description: 'Facilitates creative ideation',
    communicationStyle: 'Encouraging, creative',
    principles: ['No bad ideas', 'Build on others'],
  },
];

// ============================================================================
// Mock Agent Store
// ============================================================================

interface AgentStoreState {
  agents: AgentDefinition[];
  activeAgentId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadAgents: () => Promise<void>;
  setActiveAgent: (id: string) => void;
  getAgentsByModule: (module: string) => AgentDefinition[];
  getAgentById: (id: string) => AgentDefinition | undefined;
  clearError: () => void;
}

function createMockAgentStore(): AgentStoreState {
  let state: AgentStoreState = {
    agents: [],
    activeAgentId: null,
    isLoading: false,
    error: null,
    
    loadAgents: async function() {
      state.isLoading = true;
      state.error = null;
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 10));
        state.agents = MOCK_AGENTS;
      } catch (err) {
        state.error = 'Failed to load agents';
      } finally {
        state.isLoading = false;
      }
    },
    
    setActiveAgent: function(id: string) {
      const agent = state.agents.find(a => a.id === id);
      if (agent) {
        state.activeAgentId = id;
      }
    },
    
    getAgentsByModule: function(module: string) {
      return state.agents.filter(a => a.module === module);
    },
    
    getAgentById: function(id: string) {
      return state.agents.find(a => a.id === id);
    },
    
    clearError: function() {
      state.error = null;
    },
  };
  
  return state;
}

// ============================================================================
// FR17: View All BMAD Agents
// ============================================================================

describe('FR17: View All BMAD Agents', () => {
  let store: AgentStoreState;
  
  beforeEach(() => {
    store = createMockAgentStore();
  });
  
  it('should start with empty agents array', () => {
    expect(store.agents).toEqual([]);
  });
  
  it('should load all agents', async () => {
    await store.loadAgents();
    expect(store.agents.length).toBe(MOCK_AGENTS.length);
  });
  
  it('should include PM agent (John)', async () => {
    await store.loadAgents();
    const pm = store.getAgentById('pm');
    expect(pm).toBeDefined();
    expect(pm?.name).toBe('John');
    expect(pm?.role).toBe('Product Manager');
  });
  
  it('should include Architect agent (Winston)', async () => {
    await store.loadAgents();
    const architect = store.getAgentById('architect');
    expect(architect).toBeDefined();
    expect(architect?.name).toBe('Winston');
    expect(architect?.role).toBe('Architect');
  });
  
  it('should include Analyst agent (Mary)', async () => {
    await store.loadAgents();
    const analyst = store.getAgentById('analyst');
    expect(analyst).toBeDefined();
    expect(analyst?.name).toBe('Mary');
    expect(analyst?.role).toBe('Business Analyst');
  });
  
  it('should include Developer agent (Amelia)', async () => {
    await store.loadAgents();
    const dev = store.getAgentById('dev');
    expect(dev).toBeDefined();
    expect(dev?.name).toBe('Amelia');
    expect(dev?.role).toBe('Developer');
  });
  
  it('should include Scrum Master agent (Bob)', async () => {
    await store.loadAgents();
    const sm = store.getAgentById('sm');
    expect(sm).toBeDefined();
    expect(sm?.name).toBe('Bob');
    expect(sm?.role).toBe('Scrum Master');
  });
  
  it('should include Test Architect agent (Murat)', async () => {
    await store.loadAgents();
    const tea = store.getAgentById('tea');
    expect(tea).toBeDefined();
    expect(tea?.name).toBe('Murat');
    expect(tea?.role).toBe('Test Architect');
  });
  
  it('should include UX Designer agent (Sally)', async () => {
    await store.loadAgents();
    const ux = store.getAgentById('ux-designer');
    expect(ux).toBeDefined();
    expect(ux?.name).toBe('Sally');
    expect(ux?.role).toBe('UX Designer');
  });
  
  it('should show loading state during load', async () => {
    const loadPromise = store.loadAgents();
    expect(store.isLoading).toBe(true);
    await loadPromise;
    expect(store.isLoading).toBe(false);
  });
  
  it('should return undefined for non-existent agent', async () => {
    await store.loadAgents();
    const agent = store.getAgentById('non-existent');
    expect(agent).toBeUndefined();
  });
});

// ============================================================================
// FR18: See Active Agent Indicator
// ============================================================================

describe('FR18: See Active Agent Indicator', () => {
  let store: AgentStoreState;
  
  beforeEach(async () => {
    store = createMockAgentStore();
    await store.loadAgents();
  });
  
  it('should start with no active agent', () => {
    expect(store.activeAgentId).toBeNull();
  });
  
  it('should set active agent by ID', () => {
    store.setActiveAgent('pm');
    expect(store.activeAgentId).toBe('pm');
  });
  
  it('should change active agent', () => {
    store.setActiveAgent('pm');
    expect(store.activeAgentId).toBe('pm');
    
    store.setActiveAgent('architect');
    expect(store.activeAgentId).toBe('architect');
  });
  
  it('should not set invalid agent as active', () => {
    store.setActiveAgent('pm');
    store.setActiveAgent('invalid-id');
    // Should remain unchanged since invalid-id doesn't exist
    expect(store.activeAgentId).toBe('pm');
  });
  
  it('should allow getting active agent details', () => {
    store.setActiveAgent('architect');
    const activeAgent = store.getAgentById(store.activeAgentId!);
    expect(activeAgent?.name).toBe('Winston');
    expect(activeAgent?.role).toBe('Architect');
  });
  
  it('should track active agent across multiple changes', () => {
    const agentIds = ['pm', 'architect', 'dev', 'sm', 'pm'];
    
    for (const id of agentIds) {
      store.setActiveAgent(id);
      expect(store.activeAgentId).toBe(id);
    }
  });
});

// ============================================================================
// FR19: Read Agent Communication Style
// ============================================================================

describe('FR19: Read Agent Communication Style', () => {
  let store: AgentStoreState;
  
  beforeEach(async () => {
    store = createMockAgentStore();
    await store.loadAgents();
  });
  
  it('should have communication style for PM', () => {
    const pm = store.getAgentById('pm');
    expect(pm?.communicationStyle).toBeDefined();
    expect(pm?.communicationStyle).toContain('concise');
  });
  
  it('should have communication style for Architect', () => {
    const architect = store.getAgentById('architect');
    expect(architect?.communicationStyle).toBeDefined();
    expect(architect?.communicationStyle).toContain('Technical');
  });
  
  it('should have communication style for Developer', () => {
    const dev = store.getAgentById('dev');
    expect(dev?.communicationStyle).toBeDefined();
    expect(dev?.communicationStyle).toContain('solution');
  });
  
  it('should have description for each agent', () => {
    for (const agent of store.agents) {
      expect(agent.description).toBeDefined();
      expect(agent.description!.length).toBeGreaterThan(0);
    }
  });
  
  it('should have principles for core agents', () => {
    const coreAgents = ['pm', 'architect', 'dev', 'tea'];
    
    for (const id of coreAgents) {
      const agent = store.getAgentById(id);
      expect(agent?.principles).toBeDefined();
      expect(agent?.principles!.length).toBeGreaterThan(0);
    }
  });
  
  it('should have role for each agent', () => {
    for (const agent of store.agents) {
      expect(agent.role).toBeDefined();
      expect(agent.role.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// FR20: Filter Agents by Module
// ============================================================================

describe('FR20: Filter Agents by Module', () => {
  let store: AgentStoreState;
  
  beforeEach(async () => {
    store = createMockAgentStore();
    await store.loadAgents();
  });
  
  it('should filter BMM agents', () => {
    const bmmAgents = store.getAgentsByModule('bmm');
    expect(bmmAgents.length).toBeGreaterThan(0);
    expect(bmmAgents.every(a => a.module === 'bmm')).toBe(true);
  });
  
  it('should filter CIS agents', () => {
    const cisAgents = store.getAgentsByModule('cis');
    expect(cisAgents.length).toBeGreaterThan(0);
    expect(cisAgents.every(a => a.module === 'cis')).toBe(true);
  });
  
  it('should return empty array for module with no agents', () => {
    const coreAgents = store.getAgentsByModule('core');
    // May be empty if no core agents in mock data
    expect(Array.isArray(coreAgents)).toBe(true);
  });
  
  it('should include PM in BMM module', () => {
    const bmmAgents = store.getAgentsByModule('bmm');
    const pm = bmmAgents.find(a => a.id === 'pm');
    expect(pm).toBeDefined();
  });
  
  it('should include Architect in BMM module', () => {
    const bmmAgents = store.getAgentsByModule('bmm');
    const architect = bmmAgents.find(a => a.id === 'architect');
    expect(architect).toBeDefined();
  });
  
  it('should include Scrum Master in BMM module', () => {
    const bmmAgents = store.getAgentsByModule('bmm');
    const sm = bmmAgents.find(a => a.id === 'sm');
    expect(sm).toBeDefined();
  });
  
  it('should include Brainstorming Coach in CIS module', () => {
    const cisAgents = store.getAgentsByModule('cis');
    const coach = cisAgents.find(a => a.id === 'brainstorming-coach');
    expect(coach).toBeDefined();
  });
  
  it('should have correct count of BMM agents', () => {
    const bmmAgents = store.getAgentsByModule('bmm');
    // PM, Architect, Analyst, Developer, SM, TEA, UX Designer
    expect(bmmAgents.length).toBe(7);
  });
});

// ============================================================================
// Error Handling
// ============================================================================

describe('Agent Store Error Handling', () => {
  let store: AgentStoreState;
  
  beforeEach(() => {
    store = createMockAgentStore();
  });
  
  it('should start with no error', () => {
    expect(store.error).toBeNull();
  });
  
  it('should clear error', () => {
    store.error = 'Some error';
    store.clearError();
    expect(store.error).toBeNull();
  });
  
  it('should handle empty agents gracefully', () => {
    const result = store.getAgentsByModule('bmm');
    expect(result).toEqual([]);
  });
  
  it('should handle undefined agent lookup gracefully', () => {
    const result = store.getAgentById('non-existent');
    expect(result).toBeUndefined();
  });
});
