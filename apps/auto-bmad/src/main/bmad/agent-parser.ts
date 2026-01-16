/**
 * BMAD Agent Parser
 * 
 * Parses BMAD agent markdown files to extract persona information.
 * Agent files are located in _bmad/bmm/agents/ directory.
 */

import { readFile, readdir, access, constants } from 'fs/promises';
import { join, resolve, extname, basename } from 'path';
import { 
  AgentDefinition, 
  BMAD_AGENTS,
  IpcResult, 
  successResult, 
  errorResult 
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Path Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the path to the agents directory
 */
export function getAgentsPath(projectPath: string): string {
  return join(projectPath, '_bmad', 'bmm', 'agents');
}

/**
 * Get the path to a specific agent file
 */
export function getAgentFilePath(projectPath: string, agentId: string): string {
  return join(getAgentsPath(projectPath), `${agentId}.md`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse agent information from a markdown file content
 */
function parseAgentContent(content: string, agentId: string): Partial<AgentDefinition> {
  const parsed: Partial<AgentDefinition> = {
    id: agentId,
  };

  // Extract name from heading (e.g., "# Agent Name" or "## Mary - Business Analyst")
  const nameMatch = content.match(/^#\s*(?:Agent\s+)?([A-Z][a-z]+)/m);
  if (nameMatch) {
    parsed.name = nameMatch[1];
  }

  // Extract role from various patterns
  const rolePatterns = [
    // "Role: Product Manager"
    /Role:\s*(.+)/i,
    // "## Mary - Business Analyst"
    /^#.*-\s*(.+)$/m,
    // "# Product Manager"
    /^#\s+([A-Z][a-zA-Z\s]+)$/m,
  ];

  for (const pattern of rolePatterns) {
    const match = content.match(pattern);
    if (match && !parsed.role) {
      parsed.role = match[1].trim();
    }
  }

  // Extract description from first paragraph after heading
  const descMatch = content.match(/^#[^#].*\n\n([^#\n]+)/m);
  if (descMatch) {
    parsed.description = descMatch[1].trim().slice(0, 200); // Limit length
  }

  // Extract principles section
  const principlesMatch = content.match(/##\s*(?:Core\s+)?Principles?\s*\n((?:[-*]\s+.+\n?)+)/i);
  if (principlesMatch) {
    parsed.principles = principlesMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 5); // Limit to 5 principles
  }

  // Extract communication style section
  const styleMatch = content.match(/##\s*Communication\s+Style\s*\n([^#]+)/i);
  if (styleMatch) {
    parsed.communicationStyle = styleMatch[1].trim().slice(0, 500); // Limit length
  }

  return parsed;
}

/**
 * Merge parsed agent data with base definition
 */
function mergeAgentData(
  base: AgentDefinition,
  parsed: Partial<AgentDefinition>
): AgentDefinition {
  return {
    ...base,
    ...parsed,
    // Ensure we don't lose base data
    name: parsed.name || base.name,
    role: parsed.role || base.role,
    description: parsed.description || base.description,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all known BMAD agents (static definitions)
 */
export function getBaseAgents(): AgentDefinition[] {
  return [...BMAD_AGENTS];
}

/**
 * Load a single agent's detailed information from file
 */
export async function loadAgent(
  projectPath: string,
  agentId: string
): Promise<IpcResult<AgentDefinition>> {
  const absolutePath = resolve(projectPath);
  const agentPath = getAgentFilePath(absolutePath, agentId);

  // Find base definition
  const baseAgent = BMAD_AGENTS.find(a => a.id === agentId);
  if (!baseAgent) {
    return errorResult(
      'AGENT_NOT_FOUND',
      `Unknown agent ID: ${agentId}`
    );
  }

  try {
    // Check if agent file exists
    try {
      await access(agentPath, constants.R_OK);
    } catch {
      // File doesn't exist, return base definition
      return successResult(baseAgent);
    }

    // Read and parse the agent file
    const content = await readFile(agentPath, 'utf-8');
    const parsed = parseAgentContent(content, agentId);
    const merged = mergeAgentData(baseAgent, parsed);

    return successResult(merged);

  } catch (error) {
    // On error, return base definition
    console.warn(`[AgentParser] Failed to load agent ${agentId}:`, error);
    return successResult(baseAgent);
  }
}

/**
 * Load all agents with their detailed information
 */
export async function loadAllAgents(
  projectPath: string
): Promise<IpcResult<AgentDefinition[]>> {
  const absolutePath = resolve(projectPath);
  const agents: AgentDefinition[] = [];

  // Load each known agent
  for (const baseAgent of BMAD_AGENTS) {
    const result = await loadAgent(absolutePath, baseAgent.id);
    if (result.success) {
      agents.push(result.data);
    } else {
      // Fall back to base agent
      agents.push(baseAgent);
    }
  }

  return successResult(agents);
}

/**
 * Discover agents from the agents directory
 * (finds agents not in the predefined list)
 */
export async function discoverAgents(
  projectPath: string
): Promise<IpcResult<string[]>> {
  const absolutePath = resolve(projectPath);
  const agentsPath = getAgentsPath(absolutePath);

  try {
    // Check if agents directory exists
    try {
      await access(agentsPath, constants.R_OK);
    } catch {
      return successResult([]);
    }

    // Read directory
    const entries = await readdir(agentsPath);
    
    // Filter for markdown files and extract agent IDs
    const agentIds = entries
      .filter(entry => extname(entry) === '.md')
      .map(entry => basename(entry, '.md'))
      .filter(id => id && !id.startsWith('.'));

    return successResult(agentIds);

  } catch (error) {
    return errorResult(
      'AGENT_DISCOVERY_ERROR',
      `Failed to discover agents: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get agents filtered by module
 */
export function getAgentsByModule(module: 'bmm' | 'cis' | 'core'): AgentDefinition[] {
  return BMAD_AGENTS.filter(a => a.module === module);
}

/**
 * Get the agent responsible for a specific workflow
 */
export function getAgentForWorkflow(workflowId: string): AgentDefinition | undefined {
  // Import workflows lazily to avoid circular dependencies
  const { BMAD_WORKFLOWS } = require('./types');
  const workflow = BMAD_WORKFLOWS.find((w: { id: string }) => w.id === workflowId);
  if (!workflow) {
    return undefined;
  }
  return BMAD_AGENTS.find(a => a.id === workflow.agent);
}
