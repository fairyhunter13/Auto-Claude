# Auto-Claude Architecture Analysis Report
## BMAD-Claude Integration Initiative

**Date:** January 15, 2026  
**Version:** 1.0  
**Scope:** Complete architectural analysis for BMAD persona injection

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Spec Runner Pipeline Analysis](#3-spec-runner-pipeline-analysis)
4. [Agent System Deep Dive](#4-agent-system-deep-dive)
5. [Claude SDK Integration](#5-claude-sdk-integration)
6. [Prompts System Analysis](#6-prompts-system-analysis)
7. [Workflow Orchestration](#7-workflow-orchestration)
8. [Memory System (Graphiti)](#8-memory-system-graphiti)
9. [Integration Points for BMAD](#9-integration-points-for-bmad)
10. [Key Findings and Recommendations](#10-key-findings-and-recommendations)

---

## 1. Executive Summary

Auto-Claude is a sophisticated multi-agent autonomous coding framework that orchestrates AI-driven software development through coordinated agent sessions. The system uses a **phase-based pipeline architecture** for spec creation and a **subtask-based execution model** for implementation.

### Key Architectural Insights

1. **Dual Pipeline Design**: Separate pipelines for spec creation (discovery to validation) and implementation (planning to QA)
2. **Agent Role Separation**: Distinct agents for planning, coding, QA review, and QA fixing with role-specific tool permissions
3. **Prompt-Driven Behavior**: Agent behavior is entirely controlled through Markdown prompt templates
4. **Memory Persistence**: Graphiti knowledge graph provides cross-session context and learning
5. **Security Layers**: Multi-layered security through sandbox, permissions, hooks, and tool filtering

### BMAD Integration Opportunity

The system's prompt-based architecture and role-separated agents create natural injection points for BMAD personas. The most promising integration strategies are:

- **Prompt Template Enhancement**: Inject BMAD personas at the system prompt level
- **Agent Configuration Extension**: Add BMAD-specific agent configurations to `AGENT_CONFIGS`
- **Memory System Leverage**: Use Graphiti to persist BMAD persona context across sessions

---

## 2. System Architecture Overview

### High-Level Architecture Diagram

```
+------------------------------------------------------------------+
|                        AUTO-CLAUDE FRAMEWORK                      |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------------+      +-----------------------------+   |
|  |    SPEC CREATION       |      |    IMPLEMENTATION           |   |
|  |    PIPELINE            |      |    PIPELINE                 |   |
|  +------------------------+      +-----------------------------+   |
|  |                        |      |                             |   |
|  | Discovery Phase        |      | Planner Agent               |   |
|  | Requirements Phase     |----->| Coder Agent (subtasks)      |   |
|  | Complexity Assessment  |      | QA Reviewer Agent           |   |
|  | Context Phase          |      | QA Fixer Agent              |   |
|  | Spec Writing Phase     |      |                             |   |
|  | Self-Critique Phase    |      +-----------------------------+   |
|  | Planning Phase         |                                        |
|  | Validation Phase       |                                        |
|  +------------------------+                                        |
|                                                                    |
|  +-----------------------------+  +-----------------------------+   |
|  |    CORE INFRASTRUCTURE     |  |    MEMORY & CONTEXT         |   |
|  +-----------------------------+  +-----------------------------+   |
|  |                             |  |                             |   |
|  | Claude SDK Client          |  | Graphiti Knowledge Graph    |   |
|  | Security Hooks             |  | Session Memory              |   |
|  | Tool Permission System     |  | Recovery Manager            |   |
|  | MCP Server Management      |  | Project Index               |   |
|  |                             |  |                             |   |
|  +-----------------------------+  +-----------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

### Directory Structure

```
apps/backend/
├── run.py                    # Main CLI entry point
├── cli/                      # CLI command handlers
│   ├── main.py               # CLI argument parsing, command dispatch
│   ├── build_commands.py     # Build execution commands
│   ├── qa_commands.py        # QA validation commands
│   ├── spec_commands.py      # Spec management commands
│   └── workspace_commands.py # Workspace/worktree commands
├── core/
│   ├── client.py             # Claude SDK client factory (CRITICAL)
│   ├── auth.py               # OAuth token management
│   └── security.py           # Bash command validation
├── agents/
│   ├── coder.py              # Coder agent implementation
│   ├── planner.py            # Planner agent implementation
│   ├── session.py            # Agent session management
│   ├── memory_manager.py     # Session memory orchestration
│   └── tools_pkg/
│       ├── models.py         # AGENT_CONFIGS - tool permissions (CRITICAL)
│       ├── registry.py       # Tool registration
│       └── tools/            # Custom MCP tools
├── spec/
│   ├── pipeline.py           # Spec pipeline facade
│   ├── pipeline/
│   │   ├── orchestrator.py   # SpecOrchestrator class (CRITICAL)
│   │   ├── agent_runner.py   # Phase agent execution
│   │   └── models.py         # Phase data structures
│   ├── phases/
│   │   ├── executor.py       # PhaseExecutor class
│   │   ├── discovery_phases.py
│   │   ├── requirements_phases.py
│   │   ├── spec_phases.py
│   │   └── planning_phases.py
│   └── complexity.py         # Complexity assessment logic
├── prompts/                  # Markdown prompt templates (CRITICAL)
│   ├── planner.md
│   ├── coder.md
│   ├── qa_reviewer.md
│   ├── qa_fixer.md
│   ├── spec_gatherer.md
│   ├── spec_writer.md
│   ├── spec_critic.md
│   └── complexity_assessor.md
├── integrations/
│   └── graphiti/             # Graphiti memory system
│       ├── memory.py         # Memory facade
│       └── queries_pkg/      # Modular memory implementation
├── phase_config.py           # Model and thinking level configuration
├── security/                 # Security validators and hooks
└── services/
    └── orchestrator.py       # Multi-service orchestration
```

---

## 3. Spec Runner Pipeline Analysis

### File: `apps/backend/spec/pipeline/orchestrator.py`

The `SpecOrchestrator` class manages the complete spec creation process with dynamic complexity adaptation.

### Complexity Levels and Phase Flows

```
+------------------------------------------------------------------+
|                    COMPLEXITY-BASED PHASE FLOWS                   |
+------------------------------------------------------------------+

SIMPLE (3-4 phases):
  Discovery --> Historical Context --> Quick Spec --> Validation
  
STANDARD (6-7 phases):
  Discovery --> Historical Context --> Requirements --> [Research]* 
            --> Context --> Spec Writing --> Planning --> Validation
  
COMPLEX (8-9 phases):
  Discovery --> Historical Context --> Requirements --> Research 
            --> Context --> Spec Writing --> Self-Critique 
            --> Planning --> Validation

* Research phase is optional based on needs_research flag
```

### Phase Transitions and Triggers

| Phase | Trigger | Outputs | Extension Point |
|-------|---------|---------|-----------------|
| **Discovery** | Always first | `project_index.json` | Pre-phase hook for BMAD context |
| **Historical Context** | After discovery | Graphiti retrieval | Memory query customization |
| **Requirements** | After historical | `requirements.json` | Requirements gathering prompt |
| **Research** | `needs_research=True` | External docs | Context7 MCP usage |
| **Context** | After requirements | `context.json` | File discovery logic |
| **Spec Writing** | Standard+ complexity | `spec.md` | Spec writer prompt |
| **Self-Critique** | Complex only | Spec refinement | Critic prompt with ultrathink |
| **Planning** | After spec | `implementation_plan.json` | Planning prompt |
| **Validation** | Always last | Validation report | Validation criteria |

### Key Code Patterns in Orchestrator

```python
# Phase execution pattern (orchestrator.py:265-401)
async def run(self, interactive: bool = True, auto_approve: bool = False) -> bool:
    # Phase 1: Discovery
    result = await run_phase("discovery", phase_executor.phase_discovery)
    await self._store_phase_summary("discovery")  # Compaction for subsequent phases
    
    # Phase 2: Requirements
    result = await run_phase("requirements", lambda: phase_executor.phase_requirements(interactive))
    await self._store_phase_summary("requirements")
    
    # Phase 3: Complexity Assessment
    result = await run_phase("complexity_assessment", ...)
    
    # Dynamic phases based on assessment
    phases_to_run = self.assessment.phases_to_run()
    for phase_name in phases_to_run:
        result = await run_phase(phase_name, all_phases[phase_name])
        await self._store_phase_summary(phase_name)
```

### Extension Points for BMAD Integration

1. **Phase-Level Injection** (`orchestrator.py`):
   - Add BMAD persona context to `_run_agent()` method's `additional_context` parameter
   - Inject BMAD-specific phases into the phase flow

2. **Complexity Assessment** (`complexity.py`):
   - Extend `ComplexityAssessment` to include BMAD workflow recommendations
   - Add BMAD-specific complexity signals

3. **Agent Runner** (`pipeline/agent_runner.py`):
   - Modify `run_agent()` to inject BMAD persona into system prompts

---

## 4. Agent System Deep Dive

### Agent Types and Responsibilities

```
+------------------------------------------------------------------+
|                      AGENT HIERARCHY                              |
+------------------------------------------------------------------+

BUILD AGENTS (apps/backend/agents/):
  
  +-------------------+     +-------------------+
  | PLANNER AGENT     |     | CODER AGENT       |
  +-------------------+     +-------------------+
  | - Reads spec.md   |     | - Reads plan      |
  | - Creates plan    |     | - Implements      |
  | - Defines phases  |     |   subtasks        |
  | - Sets subtasks   |     | - One at a time   |
  | - No coding       |     | - Commits work    |
  +-------------------+     +-------------------+
          |                         |
          v                         v
  +-------------------+     +-------------------+
  | QA REVIEWER       |     | QA FIXER          |
  +-------------------+     +-------------------+
  | - Validates impl  |     | - Reads QA report |
  | - Runs tests      |     | - Fixes issues    |
  | - Browser checks  |     | - Browser verify  |
  | - Creates report  |     | - Loop until pass |
  | - APPROVE/REJECT  |     |                   |
  +-------------------+     +-------------------+

SPEC AGENTS (apps/backend/spec_agents/):
  
  +-------------------+     +-------------------+
  | SPEC GATHERER     |     | SPEC RESEARCHER   |
  +-------------------+     +-------------------+
  | - Discovery phase |     | - External docs   |
  | - Project analysis|     | - Context7 lookup |
  +-------------------+     +-------------------+

  +-------------------+     +-------------------+
  | SPEC WRITER       |     | SPEC CRITIC       |
  +-------------------+     +-------------------+
  | - Creates spec.md |     | - Self-critique   |
  | - Structured doc  |     | - Ultrathink mode |
  +-------------------+     +-------------------+
```

### Agent Lifecycle

```
+------------------------------------------------------------------+
|                    CODER AGENT LIFECYCLE                          |
+------------------------------------------------------------------+

run_autonomous_agent() [agents/coder.py]
        |
        v
+------------------+
| Initialize       |
| - Recovery mgr   |
| - Status mgr     |
| - Task logger    |
| - Check Linear   |
+------------------+
        |
        v
+------------------+        +------------------+
| Is First Run?    |--Yes-->| PLANNER SESSION  |
+------------------+        | - Read spec.md   |
        |                   | - Create plan    |
        No                  | - Define phases  |
        |                   +------------------+
        v                           |
+------------------+                |
| Get Next Subtask |<---------------+
+------------------+
        |
        v
+------------------+
| Create Client    |
| - Phase model    |
| - Tool perms     |
| - MCP servers    |
+------------------+
        |
        v
+------------------+
| Generate Prompt  |
| - Subtask context|
| - Recovery hints |
| - Graphiti mem   |
+------------------+
        |
        v
+------------------+
| Run Session      |
| - Claude SDK     |
| - Stream response|
| - Log tools      |
+------------------+
        |
        v
+------------------+
| Post-Processing  |
| - Update memory  |
| - Track progress |
| - Linear update  |
+------------------+
        |
        v
+------------------+
| Check Complete?  |
+------------------+
        |
   No   |   Yes
        v     \
  [Loop]       \---> [QA Phase]
```

### Agent Invocation Pattern

```python
# coder.py:282-312 - Session creation pattern
# Get phase-specific model and thinking
current_phase = "planning" if first_run else "coding"
phase_model = get_phase_model(spec_dir, current_phase, model)
phase_thinking_budget = get_phase_thinking_budget(spec_dir, current_phase)

# Create client with role-specific configuration
client = create_client(
    project_dir,
    spec_dir,
    phase_model,
    agent_type="planner" if first_run else "coder",  # <-- Agent role selection
    max_thinking_tokens=phase_thinking_budget,
)

# Generate role-specific prompt
if first_run:
    prompt = generate_planner_prompt(spec_dir, project_dir)
else:
    prompt = generate_subtask_prompt(spec_dir, project_dir, subtask, phase)

# Run session
async with client:
    status, response = await run_agent_session(client, prompt, spec_dir)
```

### Agent Handoff Mechanism

Agents hand off work through file-based state:

1. **Planner -> Coder**: `implementation_plan.json` with `status: "pending"` subtasks
2. **Coder -> QA Reviewer**: All subtasks `status: "completed"`
3. **QA Reviewer -> QA Fixer**: `QA_FIX_REQUEST.md` with issues
4. **QA Fixer -> QA Reviewer**: Fixed code, loop continues

---

## 5. Claude SDK Integration

### File: `apps/backend/core/client.py`

The `create_client()` function is the central factory for all Claude SDK interactions.

### Client Configuration Architecture

```
+------------------------------------------------------------------+
|                    CLIENT CREATION FLOW                           |
+------------------------------------------------------------------+

create_client(project_dir, spec_dir, model, agent_type, ...)
        |
        v
+------------------+
| Authentication   |
| - OAuth token    |
| - Env vars       |
+------------------+
        |
        v
+------------------+
| Project Analysis |
| - Cache lookup   |
| - Load index     |
| - Detect caps    |
+------------------+
        |
        v
+------------------+
| MCP Config Load  |
| - Per-project    |
| - .auto-claude/  |
|   .env settings  |
+------------------+
        |
        v
+------------------+
| Tool Selection   |
| - AGENT_CONFIGS  |
| - Capability     |
|   filtering      |
+------------------+
        |
        v
+------------------+
| MCP Servers      |
| - context7       |
| - graphiti       |
| - linear         |
| - electron/      |
|   puppeteer      |
| - auto-claude    |
+------------------+
        |
        v
+------------------+
| Security Setup   |
| - Sandbox        |
| - Permissions    |
| - Hooks          |
+------------------+
        |
        v
+------------------+
| ClaudeSDKClient  |
| Return           |
+------------------+
```

### Security Hooks Implementation

```python
# client.py:1084-1087 - Security hook configuration
options_kwargs = {
    "hooks": {
        "PreToolUse": [
            HookMatcher(matcher="Bash", hooks=[bash_security_hook]),
        ],
    },
    # ... other options
}
```

### Tool Permission System

```python
# agents/tools_pkg/models.py - AGENT_CONFIGS structure
AGENT_CONFIGS = {
    "coder": {
        "tools": BASE_READ_TOOLS + BASE_WRITE_TOOLS + WEB_TOOLS,
        "mcp_servers": ["context7", "graphiti", "auto-claude"],
        "mcp_servers_optional": ["linear"],
        "auto_claude_tools": [
            TOOL_UPDATE_SUBTASK_STATUS,
            TOOL_GET_BUILD_PROGRESS,
            TOOL_RECORD_DISCOVERY,
            TOOL_RECORD_GOTCHA,
            TOOL_GET_SESSION_CONTEXT,
        ],
        "thinking_default": "none",
    },
    "qa_reviewer": {
        "tools": BASE_READ_TOOLS + BASE_WRITE_TOOLS + WEB_TOOLS,
        "mcp_servers": ["context7", "graphiti", "auto-claude", "browser"],
        # browser -> electron OR puppeteer based on project type
        "thinking_default": "high",
    },
    # ... more agent configs
}
```

### Key Integration Point for BMAD

The `create_client()` function's `agent_type` parameter maps to `AGENT_CONFIGS`. To add BMAD personas:

1. **Extend AGENT_CONFIGS** with BMAD-specific configurations
2. **Modify `create_client()`** to accept persona parameter
3. **Inject persona into system prompt** via `base_prompt` construction

---

## 6. Prompts System Analysis

### Prompt Template Inventory

| Prompt File | Purpose | Key Sections | BMAD Injection Point |
|-------------|---------|--------------|---------------------|
| `planner.md` | Implementation planning | Phase 0-7 workflow | Pre-Phase 0 persona injection |
| `coder.md` | Subtask implementation | Steps 1-13 workflow | Step 1 context injection |
| `qa_reviewer.md` | Quality validation | Phase 0-10 workflow | Phase 0 context loading |
| `qa_fixer.md` | Issue resolution | Fix workflow | Context section |
| `spec_gatherer.md` | Requirements collection | Interactive Q&A | Persona-driven questioning |
| `spec_writer.md` | Spec document creation | Document structure | Writing style injection |
| `spec_critic.md` | Self-critique | Ultrathink analysis | Critique criteria |
| `complexity_assessor.md` | Task analysis | Complexity signals | Assessment criteria |
| `followup_planner.md` | Follow-up tasks | Extension workflow | Continuation context |

### Prompt Loading Mechanism

```python
# prompts_pkg/prompts.py pattern
def get_planner_prompt(spec_dir: Path) -> str:
    """Load and populate planner prompt template."""
    template = load_prompt_template("planner.md")
    
    # Substitute variables
    template = template.replace("{{SPEC_DIR}}", str(spec_dir))
    template = template.replace("{{BASE_BRANCH}}", get_base_branch())
    
    return template
```

### Prompt Structure Analysis: planner.md

```markdown
## YOUR ROLE - PLANNER AGENT (Session 1 of Many)
[Role definition - BMAD persona injection point]

## WHY SUBTASKS, NOT TESTS?
[Philosophy section]

## PHASE 0: DEEP CODEBASE INVESTIGATION (MANDATORY)
[Codebase analysis requirements]

## PHASE 1: READ AND CREATE CONTEXT FILES
[Context gathering]

## PHASE 2: UNDERSTAND THE WORKFLOW TYPE
[Workflow selection: FEATURE, REFACTOR, INVESTIGATION, MIGRATION, SIMPLE]

## PHASE 3: CREATE implementation_plan.json
[Plan structure definition]

## PHASE 3.5: DEFINE VERIFICATION STRATEGY
[Risk-based verification]

## PHASE 4: ANALYZE PARALLELISM OPPORTUNITIES
[Parallel execution analysis]

## PHASE 5: CREATE init.sh
[Environment setup]

## PHASE 6: VERIFY PLAN FILES
[Validation]

## PHASE 7: CREATE build-progress.txt
[Progress tracking]
```

### BMAD Integration Strategy for Prompts

**Option 1: Header Injection**
```markdown
## YOUR ROLE - PLANNER AGENT (Session 1 of Many)

{{BMAD_PERSONA_CONTEXT}}

You are the **first agent** in an autonomous development process...
```

**Option 2: Separate Persona Section**
```markdown
## BMAD PERSONA ACTIVE
{{BMAD_PERSONA_DEFINITION}}

---

## YOUR ROLE - PLANNER AGENT...
```

**Option 3: Inline Enhancement**
```markdown
## YOUR ROLE - PLANNER AGENT (Session 1 of Many)

You are the **first agent** in an autonomous development process. 
{{IF_BMAD: Additionally, you embody the {{PERSONA_NAME}} persona with these characteristics: {{PERSONA_TRAITS}}}}
```

---

## 7. Workflow Orchestration

### File: `apps/backend/run.py` and `apps/backend/cli/main.py`

### Main Entry Flow

```
+------------------------------------------------------------------+
|                    WORKFLOW ORCHESTRATION                         |
+------------------------------------------------------------------+

run.py (entry point)
    |
    v
cli/main.py:main()
    |
    +-- Parse arguments
    |
    +-- Setup environment
    |
    +-- Route to command:
    |       |
    |       +-- --list          --> print_specs_list()
    |       +-- --merge         --> handle_merge_command()
    |       +-- --review        --> handle_review_command()
    |       +-- --qa            --> handle_qa_command()
    |       +-- --followup      --> handle_followup_command()
    |       +-- --spec (build)  --> handle_build_command()
    |
    v
cli/build_commands.py:handle_build_command()
    |
    +-- Validate environment
    +-- Check review approval
    +-- Setup workspace (worktree)
    +-- Run autonomous agent
    +-- Run QA validation (if enabled)
    +-- Finalize workspace
```

### Build Command Flow Detail

```python
# build_commands.py:52-324 - Simplified flow
def handle_build_command(...):
    # 1. Model resolution per phase
    planning_model = get_phase_model(spec_dir, "planning", model)
    coding_model = get_phase_model(spec_dir, "coding", model)
    qa_model = get_phase_model(spec_dir, "qa", model)
    
    # 2. Environment validation
    validate_environment(spec_dir)
    
    # 3. Review approval check
    review_state = ReviewState.load(spec_dir)
    if not review_state.is_approval_valid(spec_dir):
        if not force_bypass_approval:
            sys.exit(1)  # Block without approval
    
    # 4. Workspace setup (worktree isolation)
    workspace_mode = choose_workspace(...)
    if workspace_mode == WorkspaceMode.ISOLATED:
        working_dir, worktree_manager, localized_spec_dir = setup_workspace(...)
    
    # 5. Run autonomous agent
    asyncio.run(run_autonomous_agent(
        project_dir=working_dir,
        spec_dir=spec_dir,
        model=model,
        source_spec_dir=source_spec_dir,
    ))
    
    # 6. QA validation loop
    if not skip_qa and should_run_qa(spec_dir):
        qa_approved = asyncio.run(run_qa_validation_loop(...))
```

### Session Management (agents/session.py)

```python
# session.py:314-555 - Agent session execution
async def run_agent_session(client, message, spec_dir, verbose, phase):
    # Send query to Claude SDK
    await client.query(message)
    
    # Stream and process response
    async for msg in client.receive_response():
        if msg_type == "AssistantMessage":
            # Handle text blocks and tool use
            for block in msg.content:
                if block_type == "TextBlock":
                    print(block.text, end="", flush=True)
                elif block_type == "ToolUseBlock":
                    # Log and track tool usage
                    task_logger.tool_start(tool_name, ...)
        
        elif msg_type == "UserMessage":
            # Handle tool results
            for block in msg.content:
                if block_type == "ToolResultBlock":
                    task_logger.tool_end(...)
    
    # Check completion status
    if is_build_complete(spec_dir):
        return "complete", response_text
    return "continue", response_text
```

### Post-Session Processing

```python
# session.py:49-312 - Post-session processing
async def post_session_processing(...):
    # 1. Sync plan to source (for worktree mode)
    sync_spec_to_source(spec_dir, source_spec_dir)
    
    # 2. Check subtask status
    subtask_status = subtask.get("status", "pending")
    
    # 3. Track commits
    new_commits = commit_count_after - commit_count_before
    
    # 4. Handle completion
    if subtask_status == "completed":
        recovery_manager.record_attempt(subtask_id, success=True)
        recovery_manager.record_good_commit(commit_after, subtask_id)
        
        # Extract insights
        extracted_insights = await extract_session_insights(...)
        
        # Save to memory (Graphiti or file-based)
        await save_session_memory(...)
        
        # Update Linear (if enabled)
        if linear_enabled:
            await linear_subtask_completed(...)
```

---

## 8. Memory System (Graphiti)

### File: `apps/backend/integrations/graphiti/memory.py`

### Architecture Overview

```
+------------------------------------------------------------------+
|                    GRAPHITI MEMORY SYSTEM                         |
+------------------------------------------------------------------+

                    +------------------+
                    |  GraphitiMemory  |
                    |  (memory.py)     |
                    +------------------+
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
    +-----------+    +-----------+    +-----------+
    | LadybugDB |    |  Search   |    |  Schema   |
    | (client)  |    | (search)  |    | (schema)  |
    +-----------+    +-----------+    +-----------+
          |                |                |
          v                v                v
    +------------------------------------------------+
    |            LadybugDB Graph Database            |
    |   (Embedded - no Docker required)              |
    +------------------------------------------------+
```

### Memory Types

| Episode Type | Purpose | Storage |
|--------------|---------|---------|
| `SESSION_INSIGHT` | Session learnings | Per session |
| `CODEBASE_DISCOVERY` | File/pattern discoveries | Cumulative |
| `PATTERN` | Code patterns to follow | Cumulative |
| `GOTCHA` | Pitfalls to avoid | Cumulative |
| `TASK_OUTCOME` | Subtask results | Per subtask |
| `QA_RESULT` | QA findings | Per QA run |
| `HISTORICAL_CONTEXT` | Prior knowledge | Cross-session |

### Memory Flow

```
Session Start
    |
    v
+------------------+
| get_graphiti_    |
| context()        |
| - Retrieve prior |
|   insights       |
| - Get patterns   |
| - Load gotchas   |
+------------------+
    |
    v
[Agent Session Executes]
    |
    v
+------------------+
| save_session_    |
| memory()         |
| - Store insights |
| - Update patterns|
| - Record gotchas |
| - Link to subtask|
+------------------+
    |
    v
[Next Session Retrieves]
```

### Key Functions

```python
# memory.py:50-72 - Main entry point
def get_graphiti_memory(spec_dir, project_dir, group_id_mode="project"):
    """Get a GraphitiMemory instance for the given spec."""
    return GraphitiMemory(spec_dir, project_dir, group_id_mode)

# agents/memory_manager.py - Context retrieval
async def get_graphiti_context(spec_dir, project_dir, subtask):
    """Retrieve relevant context from Graphiti for a subtask."""
    memory = get_graphiti_memory(spec_dir, project_dir)
    
    # Search for relevant episodes
    context = memory.get_context_for_session(subtask.get("description", ""))
    
    return format_context_for_prompt(context)

# agents/memory_manager.py - Memory persistence
async def save_session_memory(spec_dir, project_dir, subtask_id, ...):
    """Save session insights to Graphiti."""
    memory = get_graphiti_memory(spec_dir, project_dir)
    
    # Store session episode
    memory.add_session_insight(
        content=f"Completed {subtask_id}",
        metadata={"subtask": subtask_id, "success": True}
    )
```

### BMAD Integration with Memory

The Graphiti memory system can store BMAD-specific context:

1. **Persona Memory**: Store BMAD persona characteristics as episodes
2. **Persona-Specific Patterns**: Tag patterns with the persona that discovered them
3. **Cross-Persona Learning**: Share gotchas across different BMAD personas
4. **Historical Context**: Provide persona-relevant historical context

---

## 9. Integration Points for BMAD

### Summary of Integration Points

```
+------------------------------------------------------------------+
|                    BMAD INTEGRATION POINTS                        |
+------------------------------------------------------------------+

LAYER 1: PROMPT INJECTION (Easiest)
+-----------------------------------------------------+
| Location: apps/backend/prompts/*.md                 |
| Method: Template variable substitution              |
| Impact: Agent behavior modification                 |
| Complexity: LOW                                     |
+-----------------------------------------------------+

LAYER 2: AGENT CONFIGURATION (Moderate)
+-----------------------------------------------------+
| Location: apps/backend/agents/tools_pkg/models.py  |
| Method: Extend AGENT_CONFIGS with BMAD types       |
| Impact: Tool permissions, MCP servers              |
| Complexity: MEDIUM                                 |
+-----------------------------------------------------+

LAYER 3: CLIENT FACTORY (Moderate)
+-----------------------------------------------------+
| Location: apps/backend/core/client.py              |
| Method: Add persona parameter to create_client()   |
| Impact: System prompt, security settings           |
| Complexity: MEDIUM                                 |
+-----------------------------------------------------+

LAYER 4: PHASE ORCHESTRATION (Advanced)
+-----------------------------------------------------+
| Location: apps/backend/spec/pipeline/orchestrator.py|
| Method: Add BMAD-specific phases                    |
| Impact: Workflow customization                      |
| Complexity: HIGH                                    |
+-----------------------------------------------------+

LAYER 5: MEMORY SYSTEM (Advanced)
+-----------------------------------------------------+
| Location: apps/backend/integrations/graphiti/       |
| Method: Persona-tagged memory episodes              |
| Impact: Cross-session persona persistence           |
| Complexity: HIGH                                    |
+-----------------------------------------------------+
```

### Detailed Integration Specifications

#### 9.1 Prompt Injection Points

**planner.md** (Line 1-10):
```markdown
## YOUR ROLE - PLANNER AGENT (Session 1 of Many)

{{#if BMAD_PERSONA}}
### ACTIVE PERSONA: {{BMAD_PERSONA.name}}
{{BMAD_PERSONA.description}}

**Key Traits:**
{{#each BMAD_PERSONA.traits}}
- {{this}}
{{/each}}
{{/if}}

You are the **first agent** in an autonomous development process...
```

**coder.md** (Line 1-10):
```markdown
## YOUR ROLE - CODING AGENT

{{#if BMAD_PERSONA}}
### PERSONA GUIDANCE: {{BMAD_PERSONA.name}}
{{BMAD_PERSONA.coding_principles}}
{{/if}}

You are continuing work on an autonomous development task...
```

#### 9.2 Agent Configuration Extension

**models.py** - Add BMAD agent configs:
```python
BMAD_AGENT_CONFIGS = {
    "bmad_architect": {
        "base_config": "planner",
        "additional_tools": [],
        "persona_prompt": "prompts/bmad/architect.md",
        "thinking_default": "ultrathink",
    },
    "bmad_developer": {
        "base_config": "coder",
        "additional_tools": [],
        "persona_prompt": "prompts/bmad/developer.md",
        "thinking_default": "high",
    },
    # ... more BMAD personas
}

def get_agent_config(agent_type: str, bmad_persona: str = None) -> dict:
    """Get agent config with optional BMAD persona overlay."""
    base = AGENT_CONFIGS.get(agent_type)
    if bmad_persona and bmad_persona in BMAD_AGENT_CONFIGS:
        bmad = BMAD_AGENT_CONFIGS[bmad_persona]
        # Merge configurations
        return merge_configs(base, bmad)
    return base
```

#### 9.3 Client Factory Extension

**client.py** - Modified create_client():
```python
def create_client(
    project_dir: Path,
    spec_dir: Path,
    model: str,
    agent_type: str = "coder",
    max_thinking_tokens: int | None = None,
    bmad_persona: str | None = None,  # NEW PARAMETER
) -> ClaudeSDKClient:
    """Create Claude SDK client with optional BMAD persona."""
    
    # Base system prompt
    base_prompt = (
        f"You are an expert full-stack developer..."
    )
    
    # Inject BMAD persona if specified
    if bmad_persona:
        persona_prompt = load_bmad_persona(bmad_persona)
        base_prompt = f"{persona_prompt}\n\n{base_prompt}"
    
    # ... rest of client creation
```

#### 9.4 New Files Required

```
apps/backend/
├── prompts/
│   └── bmad/                    # NEW: BMAD persona prompts
│       ├── architect.md
│       ├── developer.md
│       ├── analyst.md
│       └── qa_specialist.md
├── bmad/                        # NEW: BMAD integration module
│   ├── __init__.py
│   ├── personas.py              # Persona definitions
│   ├── loader.py                # Prompt loading
│   └── memory.py                # Persona memory helpers
└── agents/
    └── tools_pkg/
        └── bmad_configs.py      # NEW: BMAD agent configs
```

---

## 10. Key Findings and Recommendations

### 10.1 Critical Findings

1. **Prompt-Centric Architecture**: All agent behavior flows from Markdown prompts, making persona injection straightforward

2. **Role-Based Tool Permissions**: `AGENT_CONFIGS` provides granular control over what each agent can do - BMAD personas can leverage this

3. **Phase-Aware Execution**: The complexity-based phase system allows BMAD to recommend appropriate workflows

4. **Memory Persistence**: Graphiti enables cross-session learning - BMAD personas can build cumulative knowledge

5. **Isolated Workspaces**: Worktree-based isolation ensures BMAD experiments don't affect main codebase

### 10.2 Recommended Integration Approach

**Phase 1: Prompt Injection (Quick Win)**
- Create BMAD persona prompt templates in `prompts/bmad/`
- Modify prompt loading to inject persona context
- Test with existing workflows

**Phase 2: Agent Configuration (Medium Term)**
- Extend `AGENT_CONFIGS` with BMAD types
- Add `bmad_persona` parameter to `create_client()`
- Implement persona-specific tool permissions

**Phase 3: Workflow Customization (Long Term)**
- Add BMAD-specific phases to orchestrator
- Implement persona memory in Graphiti
- Create BMAD workflow templates

### 10.3 Risk Considerations

| Risk | Mitigation |
|------|------------|
| Prompt injection complexity | Use template inheritance |
| Tool permission conflicts | Extend, don't replace AGENT_CONFIGS |
| Memory pollution | Use persona-tagged episodes |
| Workflow disruption | Add BMAD as optional layer |

### 10.4 Recommended Next Steps

1. **Create BMAD persona schema** - Define persona structure (traits, tools, prompts)
2. **Implement prompt loader** - Build persona injection into prompt loading
3. **Extend client factory** - Add `bmad_persona` parameter
4. **Test with simple persona** - Validate approach with single persona
5. **Build memory integration** - Connect persona to Graphiti
6. **Document API** - Create BMAD integration guide

---

## Appendix A: File Path Reference

| Component | File Path |
|-----------|-----------|
| Main CLI | `apps/backend/run.py` |
| CLI Commands | `apps/backend/cli/main.py` |
| Build Command | `apps/backend/cli/build_commands.py` |
| Client Factory | `apps/backend/core/client.py` |
| Agent Configs | `apps/backend/agents/tools_pkg/models.py` |
| Coder Agent | `apps/backend/agents/coder.py` |
| Planner Agent | `apps/backend/agents/planner.py` |
| Session Manager | `apps/backend/agents/session.py` |
| Memory Manager | `apps/backend/agents/memory_manager.py` |
| Spec Orchestrator | `apps/backend/spec/pipeline/orchestrator.py` |
| Phase Executor | `apps/backend/spec/phases/executor.py` |
| Complexity | `apps/backend/spec/complexity.py` |
| Phase Config | `apps/backend/phase_config.py` |
| Graphiti Memory | `apps/backend/integrations/graphiti/memory.py` |
| Planner Prompt | `apps/backend/prompts/planner.md` |
| Coder Prompt | `apps/backend/prompts/coder.md` |
| QA Reviewer Prompt | `apps/backend/prompts/qa_reviewer.md` |
| QA Fixer Prompt | `apps/backend/prompts/qa_fixer.md` |

---

## Appendix B: Configuration Reference

### AGENT_CONFIGS Keys

| Agent Type | Tools | MCP Servers | Thinking |
|------------|-------|-------------|----------|
| `planner` | Read, Write, Edit, Bash, Web | context7, graphiti, auto-claude | high |
| `coder` | Read, Write, Edit, Bash, Web | context7, graphiti, auto-claude | none |
| `qa_reviewer` | Read, Write, Edit, Bash, Web | context7, graphiti, auto-claude, browser | high |
| `qa_fixer` | Read, Write, Edit, Bash, Web | context7, graphiti, auto-claude, browser | medium |
| `spec_gatherer` | Read, Web | none | medium |
| `spec_writer` | Read, Write | none | high |
| `spec_critic` | Read | none | ultrathink |

### Thinking Budgets

| Level | Tokens | Usage |
|-------|--------|-------|
| `none` | null | Coding (fast) |
| `low` | 1,024 | Commit messages |
| `medium` | 4,096 | Requirements |
| `high` | 16,384 | Planning, QA |
| `ultrathink` | 65,536 | Self-critique |

---

*End of Report*
