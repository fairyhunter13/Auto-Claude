# BMAD-Claude: Technical Architecture Document

> **Version:** 1.0
> **Status:** Draft
> **Author:** Winston (Architect Agent) with BMAD Team
> **Date:** 2026-01-15
> **PRD Reference:** `_bmad-output/bmad-claude-initiative/prd.md`

---

## 1. Executive Summary

### 1.1 Architecture Vision

BMAD-Claude is designed as a **layered orchestration system** that separates concerns between methodology (BMAD), orchestration (new core), and execution (OpenCode). This architecture enables independent evolution of each layer while maintaining clean integration boundaries.

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **AD-001** | Layered architecture | Clean separation of concerns, independent evolution |
| **AD-002** | BMAD as methodology source | Leverage existing 42+ workflows, 20 agents |
| **AD-003** | OpenCode SDK for execution | Multi-provider LLM support, mature tooling |
| **AD-004** | Python backend | Existing Auto-Claude codebase, team expertise |
| **AD-005** | File-based state | Simple, debuggable, no database required |
| **AD-006** | Graphiti for memory | Cross-session persistence, semantic search |

### 1.3 Architecture Principles

1. **Boring Technology** — Use proven solutions unless innovation is required
2. **Layer Independence** — Each layer can evolve without breaking others
3. **State Transparency** — All state visible in files for debugging
4. **Graceful Degradation** — System continues if optional components fail
5. **Configuration Over Code** — Workflows defined declaratively, not programmatically

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BMAD-CLAUDE SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         USER INTERFACE LAYER                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │     CLI      │  │   TUI (v2)   │  │  API (v2)    │              │    │
│  │  │  (Primary)   │  │   (Future)   │  │  (Future)    │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                       ORCHESTRATION LAYER                            │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Workflow Engine                            │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │  Workflow   │  │    Step     │  │   State     │          │   │    │
│  │  │  │   Parser    │  │  Executor   │  │  Manager    │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    Persona System                             │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │  Manifest   │  │   Persona   │  │   Prompt    │          │   │    │
│  │  │  │   Loader    │  │   Context   │  │  Injector   │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                   Output Manager                              │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │  Template   │  │  Document   │  │  Validator  │          │   │    │
│  │  │  │   Renderer  │  │   Writer    │  │             │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        EXECUTION LAYER                               │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                   OpenCode Integration                        │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │    SDK      │  │   Session   │  │   Mode      │          │   │    │
│  │  │  │   Client    │  │   Manager   │  │  Controller │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PERSISTENCE LAYER                               │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │   File      │  │  Graphiti   │  │  Config     │                 │    │
│  │  │   Storage   │  │   Memory    │  │  Store      │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      METHODOLOGY LAYER (BMAD)                        │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │  Workflows  │  │   Agents    │  │  Templates  │                 │    │
│  │  │  (42+)      │  │   (20)      │  │  (15+)      │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Responsibility | Key Components |
|-------|----------------|----------------|
| **User Interface** | Accept input, display progress | CLI, future TUI/API |
| **Orchestration** | Workflow execution, persona management | Engine, Persona, Output |
| **Execution** | LLM interaction, session management | OpenCode SDK wrapper |
| **Persistence** | State storage, memory management | Files, Graphiti |
| **Methodology** | Workflow definitions, agent personas | BMAD files |

---

## 3. Component Architecture

### 3.1 Workflow Engine

The Workflow Engine is the heart of BMAD-Claude, responsible for parsing and executing BMAD workflows.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW ENGINE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Workflow Parser │────▶│  Step Executor  │────▶│  State Manager  │       │
│  │                 │     │                 │     │                 │       │
│  │ - Parse YAML    │     │ - Load step MD  │     │ - Track progress│       │
│  │ - Parse MD      │     │ - Execute step  │     │ - Save state    │       │
│  │ - Validate      │     │ - Handle output │     │ - Resume state  │       │
│  │ - Build graph   │     │ - Transition    │     │ - Persist       │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│          │                       │                       │                  │
│          │                       │                       │                  │
│          ▼                       ▼                       ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Workflow Context                             │   │
│  │  {                                                                   │   │
│  │    "workflow_id": "prd",                                            │   │
│  │    "current_step": "step-07-project-type",                          │   │
│  │    "steps_completed": ["step-01", "step-02", ...],                  │   │
│  │    "outputs": {"prd": "..."},                                       │   │
│  │    "persona": "pm",                                                 │   │
│  │    "started_at": "2026-01-15T10:00:00Z"                            │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.1 Workflow Parser

**Responsibility:** Parse BMAD workflow files and build execution graph.

**Input Formats:**
- YAML workflows (`workflow.yaml`)
- Markdown workflows (`workflow.md`)
- Step files (`steps/step-XX-*.md`)

**Output:** `WorkflowGraph` with nodes and transitions.

```python
# workflow_parser.py
class WorkflowParser:
    def parse(self, workflow_path: Path) -> WorkflowGraph:
        """Parse workflow file and return execution graph."""
        
    def parse_yaml(self, content: str) -> WorkflowConfig:
        """Parse YAML workflow format."""
        
    def parse_markdown(self, content: str) -> WorkflowConfig:
        """Parse Markdown workflow format."""
        
    def discover_steps(self, workflow_dir: Path) -> List[StepConfig]:
        """Discover step files in workflow directory."""
        
    def build_graph(self, config: WorkflowConfig, steps: List[StepConfig]) -> WorkflowGraph:
        """Build execution graph from config and steps."""
```

#### 3.1.2 Step Executor

**Responsibility:** Execute individual workflow steps via LLM.

```python
# step_executor.py
class StepExecutor:
    def __init__(self, opencode_client: OpenCodeClient, persona_system: PersonaSystem):
        self.client = opencode_client
        self.personas = persona_system
        
    async def execute_step(self, step: StepConfig, context: WorkflowContext) -> StepResult:
        """Execute a single workflow step."""
        # 1. Load step content
        step_content = self.load_step(step)
        
        # 2. Build prompt with persona
        prompt = self.build_prompt(step_content, context)
        
        # 3. Execute via OpenCode
        response = await self.client.send(prompt)
        
        # 4. Handle template-output if present
        if step.has_template_output:
            self.save_output(response, step.output_path)
        
        # 5. Return result
        return StepResult(
            step_id=step.id,
            status="completed",
            output=response
        )
```

#### 3.1.3 State Manager

**Responsibility:** Persist and recover workflow state.

**State File Format:**
```yaml
# .bmad-claude/state/workflow-{id}.yaml
workflow_id: prd
started_at: 2026-01-15T10:00:00Z
updated_at: 2026-01-15T10:15:00Z
status: in_progress
current_step: step-07-project-type
steps_completed:
  - id: step-01-init
    completed_at: 2026-01-15T10:01:00Z
  - id: step-02-discovery
    completed_at: 2026-01-15T10:03:00Z
  # ...
outputs:
  prd: _bmad-output/planning-artifacts/prd.md
persona: pm
variables:
  project_name: "Task Manager"
  user_name: "Hafiz"
```

### 3.2 Persona System

The Persona System manages BMAD agent personas and injects them into LLM interactions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PERSONA SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ Manifest Loader │────▶│ Persona Context │────▶│ Prompt Injector │       │
│  │                 │     │                 │     │                 │       │
│  │ - Load CSV      │     │ - Build context │     │ - Inject system │       │
│  │ - Parse agents  │     │ - Store traits  │     │ - Inject user   │       │
│  │ - Index by name │     │ - Cache persona │     │ - Inject memory │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Persona Definition                           │   │
│  │  {                                                                   │   │
│  │    "id": "pm",                                                      │   │
│  │    "display_name": "John",                                          │   │
│  │    "title": "Product Manager",                                      │   │
│  │    "icon": "📋",                                                    │   │
│  │    "role": "Product Manager specializing in...",                    │   │
│  │    "identity": "Product management veteran with 8+ years...",       │   │
│  │    "communication_style": "Asks 'WHY?' relentlessly...",           │   │
│  │    "principles": ["Channel expert PM thinking...", ...]            │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.1 System Prompt Template

```markdown
# System Prompt for BMAD-Claude Agent

## Your Identity
You are {{persona.display_name}}, a {{persona.title}}.
{{persona.icon}}

## Your Background
{{persona.identity}}

## Your Communication Style
{{persona.communication_style}}

## Your Principles
{{#each persona.principles}}
- {{this}}
{{/each}}

## Current Context
- Project: {{context.project_name}}
- Workflow: {{context.workflow_id}}
- Current Step: {{context.current_step}}

## Your Task
Execute the following workflow step with expertise befitting your role:

---

{{step_content}}
```

### 3.3 OpenCode Integration

The OpenCode Integration layer wraps the OpenCode SDK for LLM execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPENCODE INTEGRATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   SDK Client    │────▶│ Session Manager │────▶│ Mode Controller │       │
│  │                 │     │                 │     │                 │       │
│  │ - Initialize    │     │ - Create/Resume │     │ - Plan Mode     │       │
│  │ - Send/Stream   │     │ - Track state   │     │ - Build Mode    │       │
│  │ - Configure     │     │ - Cleanup       │     │ - Toggle        │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.1 OpenCode Client Wrapper

```python
# opencode_client.py
class OpenCodeClient:
    """Wrapper for OpenCode SDK with BMAD-Claude specific configuration."""
    
    def __init__(
        self,
        model: str = "claude-sonnet-4",
        provider: str = "anthropic",
        project_path: Optional[Path] = None
    ):
        self.model = model
        self.provider = provider
        self.project_path = project_path
        self._session = None
        
    async def send(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        mode: str = "build"  # "plan" or "build"
    ) -> str:
        """Send message to LLM and return response."""
        
    async def stream(
        self,
        message: str,
        system_prompt: Optional[str] = None,
        mode: str = "build"
    ) -> AsyncIterator[str]:
        """Stream response from LLM."""
        
    async def set_mode(self, mode: str) -> None:
        """Set OpenCode mode (plan/build)."""
```

### 3.4 Output Manager

Handles document generation and template rendering.

```python
# output_manager.py
class OutputManager:
    """Manages workflow outputs and document generation."""
    
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        
    def render_template(
        self,
        template_path: Path,
        variables: Dict[str, Any]
    ) -> str:
        """Render BMAD template with variables."""
        
    def save_output(
        self,
        content: str,
        output_path: Path,
        append: bool = False
    ) -> None:
        """Save output to file."""
        
    def validate_output(
        self,
        content: str,
        checklist_path: Optional[Path] = None
    ) -> ValidationResult:
        """Validate output against BMAD checklist."""
```

---

## 4. Data Architecture

### 4.1 Directory Structure

```
project-root/
├── _bmad/                          # BMAD methodology (read-only)
│   ├── core/                       # Core BMAD components
│   ├── bmm/                        # BMad Method module
│   ├── bmb/                        # BMad Builder module
│   ├── cis/                        # Creative Innovation module
│   └── _config/                    # Agent/workflow manifests
│
├── _bmad-output/                   # BMAD outputs (generated)
│   ├── planning-artifacts/         # PRD, Architecture, etc.
│   └── implementation-artifacts/   # Stories, Sprint status
│
├── .bmad-claude/                   # BMAD-Claude runtime (new)
│   ├── config.yaml                 # User configuration
│   ├── state/                      # Workflow state files
│   │   └── workflow-{id}.yaml      # Per-workflow state
│   ├── sessions/                   # OpenCode session data
│   └── memory/                     # Graphiti memory files
│
└── src/                            # User's project code
```

### 4.2 Configuration Schema

```yaml
# .bmad-claude/config.yaml
version: 1

# User settings
user:
  name: "Hafiz"
  skill_level: "expert"  # beginner, intermediate, expert

# LLM settings
llm:
  provider: "anthropic"
  model: "claude-sonnet-4"
  api_key_env: "ANTHROPIC_API_KEY"

# Workflow settings
workflow:
  auto_approve_checkpoints: false
  max_retries: 3
  timeout_minutes: 30

# Output settings
output:
  planning_artifacts: "_bmad-output/planning-artifacts"
  implementation_artifacts: "_bmad-output/implementation-artifacts"

# Memory settings
memory:
  enabled: true
  provider: "graphiti"
  persist_insights: true
```

### 4.3 State Schema

```yaml
# .bmad-claude/state/workflow-prd.yaml
schema_version: 1

# Workflow identification
workflow:
  id: "prd"
  name: "Product Requirements Document"
  path: "_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md"

# Timing
timing:
  started_at: "2026-01-15T10:00:00Z"
  updated_at: "2026-01-15T10:15:00Z"
  estimated_completion: "2026-01-15T10:25:00Z"

# Progress
progress:
  status: "in_progress"  # pending, in_progress, completed, failed, paused
  current_step: "step-07-project-type"
  total_steps: 12
  completed_steps: 6
  percent_complete: 50

# Steps
steps:
  - id: "step-01-init"
    name: "Initialization"
    status: "completed"
    started_at: "2026-01-15T10:00:00Z"
    completed_at: "2026-01-15T10:01:00Z"
    duration_seconds: 60
  # ...

# Persona
persona:
  id: "pm"
  display_name: "John"
  
# Outputs
outputs:
  primary: "_bmad-output/planning-artifacts/prd.md"
  
# Context
context:
  project_name: "Task Manager"
  inputs:
    - path: "_bmad-output/planning-artifacts/product-brief.md"
      type: "product-brief"
```

---

## 5. Integration Patterns

### 5.1 BMAD Integration

**Pattern:** Read-Only Methodology Source

BMAD files are treated as read-only configuration. The orchestration layer reads workflow definitions but never modifies them.

```python
# bmad_loader.py
class BMADLoader:
    """Load BMAD workflows, agents, and templates."""
    
    def __init__(self, bmad_root: Path = Path("_bmad")):
        self.root = bmad_root
        
    def load_workflow(self, workflow_id: str) -> WorkflowConfig:
        """Load workflow by ID (e.g., 'prd', 'create-architecture')."""
        
    def load_agent(self, agent_id: str) -> AgentPersona:
        """Load agent persona by ID (e.g., 'pm', 'architect')."""
        
    def load_template(self, template_path: Path) -> str:
        """Load document template."""
        
    def discover_workflows(self) -> List[WorkflowMeta]:
        """Discover all available workflows."""
```

### 5.2 OpenCode SDK Integration

**Pattern:** Facade with Retry and Recovery

```python
# opencode_facade.py
class OpenCodeFacade:
    """Facade for OpenCode SDK with error handling and recovery."""
    
    async def execute_with_retry(
        self,
        prompt: str,
        system_prompt: str,
        max_retries: int = 3
    ) -> str:
        """Execute prompt with automatic retry on failure."""
        for attempt in range(max_retries):
            try:
                return await self.client.send(prompt, system_prompt)
            except OpenCodeError as e:
                if attempt == max_retries - 1:
                    raise
                await self.handle_error(e)
                
    async def execute_with_streaming(
        self,
        prompt: str,
        system_prompt: str,
        on_chunk: Callable[[str], None]
    ) -> str:
        """Execute with streaming for progress display."""
```

### 5.3 Memory Integration

**Pattern:** Session-Scoped Memory with Cross-Session Persistence

```python
# memory_integration.py
class MemoryManager:
    """Manage Graphiti memory for BMAD-Claude sessions."""
    
    def __init__(self, memory_dir: Path):
        self.graphiti = GraphitiMemory(memory_dir)
        
    async def get_context(
        self,
        workflow_id: str,
        step_id: str,
        query: str
    ) -> str:
        """Retrieve relevant context for current step."""
        
    async def save_insight(
        self,
        workflow_id: str,
        step_id: str,
        insight: str,
        insight_type: str
    ) -> None:
        """Save insight from current step."""
        
    async def get_workflow_history(
        self,
        workflow_id: str
    ) -> List[WorkflowRun]:
        """Get history of previous runs for this workflow."""
```

---

## 6. Execution Flows

### 6.1 Main Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MAIN EXECUTION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [User: bmad-claude run --workflow prd-to-arch --input "Task Manager"]      │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. INITIALIZATION                                                    │   │
│  │    - Load configuration                                              │   │
│  │    - Initialize OpenCode client                                      │   │
│  │    - Check for existing state (resume if present)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. WORKFLOW SELECTION                                                │   │
│  │    - Parse workflow chain (prd → architecture)                       │   │
│  │    - Build execution plan                                            │   │
│  │    - Display plan to user                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. PRD WORKFLOW EXECUTION                                            │   │
│  │    - Load PM persona (John)                                          │   │
│  │    - Execute 12 steps sequentially                                   │   │
│  │    - Save PRD output                                                 │   │
│  │    - Optional: User review checkpoint                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. WORKFLOW TRANSITION                                               │   │
│  │    - Complete PRD workflow                                           │   │
│  │    - Switch persona to Architect (Winston)                           │   │
│  │    - Initialize Architecture workflow                                │   │
│  │    - Pass PRD as input                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. ARCHITECTURE WORKFLOW EXECUTION                                   │   │
│  │    - Load Architect persona (Winston)                                │   │
│  │    - Execute 9 steps sequentially                                    │   │
│  │    - Reference PRD throughout                                        │   │
│  │    - Save Architecture output                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. COMPLETION                                                        │   │
│  │    - Save final state                                                │   │
│  │    - Store insights to memory                                        │   │
│  │    - Display summary                                                 │   │
│  │    - Cleanup sessions                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Step Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STEP EXECUTION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Step: step-07-project-type]                                               │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. LOAD STEP                                                         │   │
│  │    - Read step-07-project-type.md                                    │   │
│  │    - Parse step metadata                                             │   │
│  │    - Extract instructions                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. BUILD CONTEXT                                                     │   │
│  │    - Load current persona                                            │   │
│  │    - Load workflow context                                           │   │
│  │    - Query memory for relevant insights                              │   │
│  │    - Load previous step outputs                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. BUILD PROMPT                                                      │   │
│  │    - Inject persona into system prompt                               │   │
│  │    - Add step instructions to user prompt                            │   │
│  │    - Include context and memory                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. EXECUTE VIA OPENCODE                                              │   │
│  │    - Send to LLM via OpenCode SDK                                    │   │
│  │    - Stream response to display                                      │   │
│  │    - Capture full response                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. PROCESS OUTPUT                                                    │   │
│  │    - If <template-output>: append to document                        │   │
│  │    - If <ask>: pause for user input (if enabled)                     │   │
│  │    - Save step output                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. UPDATE STATE                                                      │   │
│  │    - Mark step completed                                             │   │
│  │    - Update progress                                                 │   │
│  │    - Save state to disk                                              │   │
│  │    - Extract and save insights                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  [Next Step or Workflow Transition]                                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Error Handling and Recovery

### 7.1 Error Categories

| Category | Example | Recovery Strategy |
|----------|---------|-------------------|
| **LLM Error** | Rate limit, timeout | Retry with backoff |
| **Parse Error** | Invalid workflow file | Fail with clear message |
| **State Error** | Corrupted state file | Restore from backup |
| **Output Error** | Cannot write file | Retry, then fail |
| **Stuck State** | LLM loops, no progress | Breakthrough recovery |

### 7.2 Recovery Mechanisms

```python
# recovery.py
class RecoveryManager:
    """Handle error recovery and breakthrough mechanisms."""
    
    async def handle_llm_error(self, error: LLMError) -> RecoveryAction:
        """Handle LLM-related errors."""
        if error.is_rate_limit:
            return RecoveryAction.RETRY_WITH_BACKOFF
        elif error.is_timeout:
            return RecoveryAction.RETRY
        else:
            return RecoveryAction.FAIL
            
    async def handle_stuck_state(
        self,
        workflow_context: WorkflowContext,
        step_context: StepContext
    ) -> RecoveryAction:
        """Handle stuck state via BMAD breakthrough mechanisms."""
        # 1. Try correct-course workflow
        # 2. Try party-mode for discussion
        # 3. Escalate to user
```

### 7.3 State Backup Strategy

```yaml
# State is backed up at every checkpoint
backup_strategy:
  frequency: "every_step"
  location: ".bmad-claude/state/backups/"
  retention: 10  # Keep last 10 backups
  format: "yaml"
```

---

## 8. Technology Stack

### 8.1 Core Technologies

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Language** | Python | 3.12+ | Existing codebase, team expertise |
| **LLM SDK** | OpenCode SDK | Latest | Per requirements, multi-provider |
| **Memory** | Graphiti | Latest | From Auto-Claude, semantic search |
| **CLI** | Typer/Click | Latest | Modern Python CLI |
| **Config** | PyYAML | Latest | YAML configuration |
| **Async** | asyncio | Built-in | Async execution |

### 8.2 Development Tools

| Tool | Purpose |
|------|---------|
| **uv** | Package management |
| **pytest** | Testing |
| **ruff** | Linting |
| **mypy** | Type checking |
| **pre-commit** | Git hooks |

---

## 9. Project Structure

```
bmad-claude/
├── src/
│   └── bmad_claude/
│       ├── __init__.py
│       ├── cli/                    # CLI entry points
│       │   ├── __init__.py
│       │   ├── main.py             # Main CLI
│       │   └── commands/           # CLI commands
│       │       ├── init.py
│       │       ├── run.py
│       │       ├── status.py
│       │       └── resume.py
│       │
│       ├── engine/                 # Workflow engine
│       │   ├── __init__.py
│       │   ├── parser.py           # Workflow parser
│       │   ├── executor.py         # Step executor
│       │   ├── state.py            # State manager
│       │   └── models.py           # Data models
│       │
│       ├── persona/                # Persona system
│       │   ├── __init__.py
│       │   ├── loader.py           # Manifest loader
│       │   ├── context.py          # Persona context
│       │   └── injector.py         # Prompt injector
│       │
│       ├── opencode/               # OpenCode integration
│       │   ├── __init__.py
│       │   ├── client.py           # SDK wrapper
│       │   ├── session.py          # Session management
│       │   └── mode.py             # Mode controller
│       │
│       ├── output/                 # Output management
│       │   ├── __init__.py
│       │   ├── manager.py          # Output manager
│       │   ├── renderer.py         # Template renderer
│       │   └── validator.py        # Output validator
│       │
│       ├── memory/                 # Memory integration
│       │   ├── __init__.py
│       │   ├── graphiti.py         # Graphiti wrapper
│       │   └── manager.py          # Memory manager
│       │
│       ├── bmad/                   # BMAD integration
│       │   ├── __init__.py
│       │   ├── loader.py           # BMAD loader
│       │   └── models.py           # BMAD data models
│       │
│       └── recovery/               # Error recovery
│           ├── __init__.py
│           ├── manager.py          # Recovery manager
│           └── breakthrough.py     # Breakthrough mechanisms
│
├── tests/                          # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                           # Documentation
│
├── pyproject.toml                  # Project config
├── README.md
└── LICENSE
```

---

## 10. Security Considerations

### 10.1 API Key Management

```python
# Security: API keys are never logged or stored in state
API_KEY_HANDLING:
  - Load from environment variables only
  - Never include in state files
  - Never log in any output
  - Use secure memory handling
```

### 10.2 File System Isolation

```python
# Security: Operations scoped to project directory
FILE_SYSTEM_POLICY:
  - All reads/writes within project root
  - No system file access
  - No network access except LLM API
  - Explicit permission for each operation
```

### 10.3 LLM Output Validation

```python
# Security: Validate LLM outputs before execution
OUTPUT_VALIDATION:
  - Sanitize file paths
  - Validate against BMAD templates
  - Check for injection attempts
  - Require user approval for destructive actions
```

---

## 11. Implementation Phases

### Phase 1: Core Engine (Week 3-4)

| Component | Priority | Effort |
|-----------|----------|--------|
| Workflow Parser | P0 | 3 days |
| Step Executor | P0 | 3 days |
| State Manager | P0 | 2 days |
| Persona Loader | P0 | 2 days |

### Phase 2: OpenCode Integration (Week 4)

| Component | Priority | Effort |
|-----------|----------|--------|
| SDK Client Wrapper | P0 | 2 days |
| Session Manager | P0 | 1 day |
| Mode Controller | P1 | 1 day |

### Phase 3: Workflow Automation (Week 5)

| Component | Priority | Effort |
|-----------|----------|--------|
| PRD Workflow | P0 | 3 days |
| Architecture Workflow | P0 | 3 days |
| Workflow Transition | P0 | 2 days |

### Phase 4: Polish & Testing (Week 6)

| Component | Priority | Effort |
|-----------|----------|--------|
| CLI Interface | P0 | 2 days |
| Error Handling | P0 | 2 days |
| Testing | P0 | 3 days |
| Documentation | P1 | 2 days |

---

## 12. Appendices

### A. Decision Log

| ID | Decision | Date | Rationale |
|----|----------|------|-----------|
| AD-001 | Layered architecture | 2026-01-15 | Clean separation, independent evolution |
| AD-002 | BMAD as read-only source | 2026-01-15 | Preserve methodology integrity |
| AD-003 | OpenCode SDK | 2026-01-15 | Per requirements, multi-provider |
| AD-004 | File-based state | 2026-01-15 | Simple, debuggable, no DB needed |
| AD-005 | Python 3.12+ | 2026-01-15 | Existing codebase compatibility |
| AD-006 | Graphiti memory | 2026-01-15 | Proven in Auto-Claude |

### B. API Contracts (Draft)

```python
# Main execution API
async def run_workflow(
    workflow_id: str,
    input_description: str,
    config: Optional[Config] = None
) -> WorkflowResult:
    """Run a BMAD workflow autonomously."""

# Workflow chain API
async def run_workflow_chain(
    workflow_ids: List[str],
    input_description: str,
    config: Optional[Config] = None
) -> List[WorkflowResult]:
    """Run a chain of workflows (e.g., prd -> architecture)."""

# Status API
async def get_status(
    workflow_id: Optional[str] = None
) -> Union[WorkflowStatus, List[WorkflowStatus]]:
    """Get status of running or completed workflows."""

# Resume API
async def resume_workflow(
    workflow_id: str
) -> WorkflowResult:
    """Resume an interrupted workflow from last checkpoint."""
```

### C. Related Documents

- PRD: `_bmad-output/bmad-claude-initiative/prd.md`
- Research: `_bmad-output/bmad-claude-initiative/research/*.md`
- Project Context: `_bmad-output/bmad-claude-initiative/project-context.md`

---

*End of Architecture Document*

---

**Document Status:** DRAFT - Ready for Review

**Next Steps:**
1. Stakeholder review and approval
2. Fork Auto-Claude repository
3. Begin Phase 1 implementation
