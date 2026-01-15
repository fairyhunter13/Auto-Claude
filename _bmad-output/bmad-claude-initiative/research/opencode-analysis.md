# OpenCode.ai Analysis Report

**Research Report for BMAD-Claude Integration Initiative**

*Generated: 2026-01-15*
*Source: https://opencode.ai*

---

## Executive Summary

OpenCode is an open-source AI coding agent with 60K+ GitHub stars, 500+ contributors, and 650,000+ monthly developers. It provides a terminal-based, desktop, and IDE interface for AI-assisted coding with multi-provider LLM support.

**Key Value for BMAD-Claude Integration:**
- Open source and extensible
- Multi-LLM provider support (Claude, GPT, Gemini, local models)
- SDK available for programmatic control
- MCP server support
- Multi-session capability (parallel agents)
- LSP integration for intelligent context

---

## 1. Core Capabilities

### 1.1 Interface Options

| Interface | Description |
|-----------|-------------|
| **TUI** | Terminal User Interface - primary interface |
| **Desktop App** | Available on macOS, Windows, Linux (beta) |
| **IDE Extension** | IDE integration |
| **CLI** | Command-line interface for scripting |
| **Web** | Web-based interface |

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **LSP Enabled** | Automatically loads Language Server Protocols for LLM context |
| **Multi-Session** | Start multiple agents in parallel on same project |
| **Share Links** | Share conversation links for reference/debugging |
| **Claude Pro/Max** | Login with Anthropic account |
| **ChatGPT Plus/Pro** | Login with OpenAI account |
| **Any Model** | 75+ LLM providers through Models.dev, including local |
| **Privacy First** | Does not store code or context data |

### 1.3 Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Plan Mode** | Disables changes, suggests implementation | Strategy/planning |
| **Build Mode** | Full read/write capability | Implementation |

---

## 2. Installation Methods

```bash
# Primary installation
curl -fsSL https://opencode.ai/install | bash

# Package managers
npm install -g opencode-ai
brew install anomalyco/tap/opencode
paru -S opencode-bin  # Arch Linux

# Windows
choco install opencode
scoop bucket add extras && scoop install extras/opencode

# Docker
docker run -it --rm ghcr.io/anomalyco/opencode
```

---

## 3. Configuration System

### 3.1 Configuration File

OpenCode uses a configuration file for customization:

```yaml
# opencode.yaml (project root)
providers:
  - name: anthropic
    api_key: ${ANTHROPIC_API_KEY}
  - name: openai
    api_key: ${OPENAI_API_KEY}

model: claude-sonnet-4  # Default model

rules:
  - path: AGENTS.md      # Project rules file
```

### 3.2 Key Configuration Areas

| Area | Docs Path | Purpose |
|------|-----------|---------|
| Config | `/docs/config/` | Core configuration |
| Providers | `/docs/providers/` | LLM provider setup |
| Models | `/docs/models/` | Model selection |
| Tools | `/docs/tools/` | Tool configuration |
| Rules | `/docs/rules/` | Project-specific rules |
| Agents | `/docs/agents/` | Agent configuration |
| MCP Servers | `/docs/mcp-servers/` | MCP integration |
| Custom Tools | `/docs/custom-tools/` | Tool creation |
| Permissions | `/docs/permissions/` | Security settings |

---

## 4. Programmatic Integration

### 4.1 SDK

**Docs:** `/docs/sdk/`

OpenCode provides an SDK for programmatic control:

```typescript
// Hypothetical SDK usage (based on architecture)
import { OpenCode } from 'opencode-ai';

const client = new OpenCode({
  model: 'claude-sonnet-4',
  provider: 'anthropic'
});

// Start session
const session = await client.createSession({
  projectPath: '/path/to/project'
});

// Send message
const response = await session.send('Create a new feature');

// Stream response
for await (const chunk of session.stream('Implement authentication')) {
  console.log(chunk);
}
```

### 4.2 Server Mode

**Docs:** `/docs/server/`

OpenCode can run as a server for integration:

```bash
opencode server --port 8080
```

### 4.3 Plugin System

**Docs:** `/docs/plugins/`

Extensibility through plugins for custom functionality.

---

## 5. MCP Server Support

**Docs:** `/docs/mcp-servers/`

OpenCode supports MCP (Model Context Protocol) servers for extended capabilities.

### 5.1 Relevance for BMAD-Claude

- BMAD workflows could be exposed as MCP tools
- OpenCode can consume custom MCP servers
- Enables BMAD agents to operate through OpenCode

### 5.2 ACP Support

**Docs:** `/docs/acp/`

Agent Communication Protocol support for multi-agent scenarios.

---

## 6. Agent Skills

**Docs:** `/docs/skills/`

OpenCode supports "Agent Skills" - reusable capability modules.

### 6.1 Mapping to BMAD

| OpenCode Concept | BMAD Equivalent |
|------------------|-----------------|
| Agent Skills | Workflows + Tasks |
| AGENTS.md | agent-manifest.csv + personas |
| Rules | Principles in persona |
| Custom Tools | BMAD tasks |

---

## 7. Project Initialization

OpenCode uses `/init` to create an `AGENTS.md` file:

```markdown
# AGENTS.md (project root)

## Project Structure
[Auto-generated project analysis]

## Coding Patterns
[Detected patterns]

## Rules
[Project-specific rules]
```

### 7.1 Mapping to BMAD

| OpenCode | BMAD |
|----------|------|
| AGENTS.md | project-context.md |
| /init | workflow-init workflow |

---

## 8. Commands Reference

| Command | Purpose |
|---------|---------|
| `/init` | Initialize project |
| `/connect` | Connect LLM provider |
| `/undo` | Undo last changes |
| `/redo` | Redo undone changes |
| `/share` | Share conversation link |
| `Tab` | Toggle Plan/Build mode |
| `@file` | Reference specific file |

---

## 9. Integration Strategy for BMAD-Claude

### 9.1 Option A: OpenCode as Execution Layer

Replace Auto-Claude's Claude SDK with OpenCode:

```
BMAD Workflow Orchestrator
         |
         v
   OpenCode SDK
         |
         v
   LLM Execution
```

**Pros:**
- Leverages OpenCode's mature execution
- Multi-session support built-in
- LSP integration for better context

**Cons:**
- Additional abstraction layer
- Different tool model

### 9.2 Option B: OpenCode as Terminal Replacement

Keep Auto-Claude's orchestration, use OpenCode for terminal:

```
Auto-Claude Orchestrator
         |
         +-- BMAD Workflows (methodology)
         |
         +-- OpenCode (terminal execution)
```

**Pros:**
- Preserves existing architecture
- Adds OpenCode's terminal capabilities

**Cons:**
- Integration complexity

### 9.3 Option C: Native Integration (Recommended)

Build BMAD-Claude as new system using OpenCode primitives:

```
BMAD-Claude Core
    |
    +-- BMAD Workflow Engine (from BMAD)
    |
    +-- Persona System (from BMAD)
    |
    +-- OpenCode SDK (execution)
    |
    +-- OpenCode MCP (tools)
```

**Pros:**
- Clean architecture
- Best of both worlds
- Native OpenCode features

**Cons:**
- Most development effort

---

## 10. Key Integration Points

### 10.1 SDK Integration

```python
# Hypothetical BMAD-Claude using OpenCode
from opencode import OpenCodeClient
from bmad import BMADWorkflow, Persona

class BMADClaudeAgent:
    def __init__(self, persona: Persona):
        self.persona = persona
        self.client = OpenCodeClient(
            model="claude-sonnet-4",
            system_prompt=persona.to_system_prompt()
        )
    
    async def run_workflow(self, workflow: BMADWorkflow):
        for step in workflow.steps:
            prompt = step.to_prompt(self.persona)
            response = await self.client.send(prompt)
            workflow.update_state(step, response)
```

### 10.2 MCP Tool Exposure

Expose BMAD workflows as MCP tools:

```yaml
# bmad-mcp-server.yaml
tools:
  - name: bmad_create_prd
    description: Create Product Requirements Document
    workflow: bmm/workflows/prd
  
  - name: bmad_create_architecture
    description: Create System Architecture
    workflow: bmm/workflows/create-architecture
```

### 10.3 AGENTS.md Generation

Generate OpenCode's AGENTS.md from BMAD context:

```python
def generate_agents_md(bmad_config, project_context):
    """Generate OpenCode AGENTS.md from BMAD context."""
    return f"""
# AGENTS.md

## Active BMAD Persona
{bmad_config.active_persona.name}: {bmad_config.active_persona.role}

## Project Context
{project_context.summary}

## BMAD Workflow Rules
{bmad_config.workflow_rules}

## Coding Patterns
{project_context.patterns}
"""
```

---

## 11. Research Gaps

| Question | Status | Next Step |
|----------|--------|-----------|
| Full SDK API documentation | Unknown | Explore /docs/sdk/ deeply |
| Server mode API | Unknown | Test server mode |
| MCP server creation guide | Unknown | Explore /docs/mcp-servers/ |
| Multi-session orchestration | Unknown | Test parallel sessions |
| Programmatic mode switching | Unknown | Test Plan/Build mode API |

---

## 12. Recommendations

### 12.1 Immediate Actions

1. **Install OpenCode locally** and test basic functionality
2. **Explore SDK documentation** at opencode.ai/docs/sdk
3. **Test multi-session** capability for parallel agents
4. **Review MCP server** creation for BMAD workflow exposure

### 12.2 POC Scope

For PRD-to-Architecture POC:
1. Use OpenCode SDK for LLM execution
2. Inject BMAD PM persona into system prompt
3. Execute PRD workflow steps programmatically
4. Pass output to Architecture workflow with Architect persona

### 12.3 Key Advantages for BMAD-Claude

| Advantage | Impact |
|-----------|--------|
| Multi-session | Run PM and Architect in parallel |
| LSP integration | Better codebase understanding |
| Plan/Build modes | Natural fit for BMAD phases |
| Open source | Full customization possible |
| 75+ providers | Flexibility in model selection |

---

## Appendix: Useful Links

- Main Site: https://opencode.ai
- Documentation: https://opencode.ai/docs
- GitHub: https://github.com/anomalyco/opencode
- SDK Docs: https://opencode.ai/docs/sdk
- MCP Servers: https://opencode.ai/docs/mcp-servers
- Discord: https://opencode.ai/discord

---

*End of OpenCode.ai Analysis Report*
