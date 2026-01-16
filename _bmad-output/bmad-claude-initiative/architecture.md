# BMAD-Claude: Technical Architecture Document

> **Version:** 2.0
> **Status:** Draft - Updated for Party Mode Pivot
> **Author:** Winston (Architect Agent) with BMAD Team
> **Date:** 2026-01-16
> **PRD Reference:** `_bmad-output/bmad-claude-initiative/prd.md`

---

## 1. Executive Summary

### 1.1 Architecture Vision

BMAD-Claude Party Mode is designed as a **collaborative multi-agent discussion system** where AI agents discuss together like a human team. Instead of sequential workflow execution, agents participate in facilitated discussions that produce artifacts through natural conversation.

### 1.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **AD-001** | Facilitator pattern | bmad-master orchestrates, selects relevant agents |
| **AD-002** | Two-layer context | Agent persona (static) + project context (dynamic) |
| **AD-003** | OpenCode CLI for execution | Multi-provider LLM, CLI integration |
| **AD-004** | Python backend | Existing bmad_claude package |
| **AD-005** | File-based memory | Simple, debuggable, supports save/resume |
| **AD-006** | Artifact-centric context | Artifacts become context, not full history |

### 1.3 Architecture Principles

1. **Collaborative Over Sequential** — Agents discuss together, not in isolation
2. **Context Never Lost** — Shared context across entire session
3. **Artifact-Centric** — Discussions produce artifacts; artifacts become context
4. **Progressive Summarization** — Compress old context, keep decisions
5. **Phase-Guided** — BMAD phases provide structure within flexibility

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BMAD-CLAUDE PARTY MODE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         USER INTERFACE                               │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    CLI (Typer + Rich)                         │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │   party     │  │   status    │  │   resume    │          │   │    │
│  │  │  │  command    │  │  command    │  │  command    │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      PARTY SESSION LAYER                             │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    PartySession                               │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │ Discussion  │  │   Phase     │  │  Artifact   │          │   │    │
│  │  │  │ Orchestrate │  │  Manager    │  │  Extractor  │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                  Agent Orchestrator                           │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │   Agent     │  │   Topic     │  │   Cross-    │          │   │    │
│  │  │  │  Selector   │  │  Analyzer   │  │   Talk      │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        MEMORY LAYER                                  │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                    PartyMemory                                │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │Conversation │  │  Decision   │  │  Artifact   │          │   │    │
│  │  │  │  History    │  │  Registry   │  │   Store     │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐                           │   │    │
│  │  │  │  Summary    │  │  Context    │                           │   │    │
│  │  │  │   Engine    │  │ Compressor  │                           │   │    │
│  │  │  └─────────────┘  └─────────────┘                           │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      EXECUTION LAYER                                 │    │
│  │  ┌──────────────────────────────────────────────────────────────┐   │    │
│  │  │                   OpenCode Integration                        │   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │   │    │
│  │  │  │    CLI      │  │   Prompt    │  │  Response   │          │   │    │
│  │  │  │   Invoker   │  │   Builder   │  │   Parser    │          │   │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘          │   │    │
│  │  └──────────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    PERSISTENCE LAYER                                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │  Session    │  │  Artifact   │  │   Config    │                 │    │
│  │  │   Files     │  │   Files     │  │   Files     │                 │    │
│  │  │  (JSONL)    │  │   (MD)      │  │  (YAML)     │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      BMAD DATA LAYER                                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │   Agent     │  │    Party    │  │  Templates  │                 │    │
│  │  │  Manifest   │  │   Mode WF   │  │   (BMAD)    │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Layer Responsibilities

| Layer | Responsibility | Key Components |
|-------|----------------|----------------|
| **User Interface** | Accept input, display discussion | CLI party command |
| **Party Session** | Orchestrate discussions, manage phases | PartySession, Orchestrator |
| **Memory** | Context persistence, summarization | PartyMemory, Decisions |
| **Execution** | LLM interaction via OpenCode | CLI Invoker, Parser |
| **Persistence** | File storage for sessions/artifacts | JSONL, Markdown |
| **BMAD Data** | Agent personas, templates | Agent manifest, workflows |

---

## 3. Component Architecture

### 3.1 PartySession

The PartySession is the heart of BMAD-Claude Party Mode, managing collaborative discussions.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARTY SESSION                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   Discussion    │────▶│     Phase       │────▶│    Artifact     │       │
│  │  Orchestrator   │     │    Manager      │     │   Extractor     │       │
│  │                 │     │                 │     │                 │       │
│  │ - User turns    │     │ - Current phase │     │ - Extract PRD   │       │
│  │ - Agent turns   │     │ - Milestones    │     │ - Extract Arch  │       │
│  │ - Facilitate    │     │ - Transitions   │     │ - Save drafts   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│          │                       │                       │                  │
│          │                       │                       │                  │
│          ▼                       ▼                       ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Session State                                 │   │
│  │  {                                                                   │   │
│  │    "session_id": "party-2026-01-16-task-manager",                   │   │
│  │    "project_name": "Task Manager",                                   │   │
│  │    "current_phase": "planning",                                      │   │
│  │    "current_topic": "User Personas",                                │   │
│  │    "active_agents": ["pm", "analyst", "ux-designer"],               │   │
│  │    "decisions_made": 4,                                             │   │
│  │    "artifacts_drafting": {"prd": "60%"}                             │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.1 PartySession Class

**Responsibility:** Manage the collaborative party mode session.

```python
# party_session.py
@dataclass
class PartySession:
    """Manages a collaborative party mode session."""
    
    project_name: str
    session_id: str
    memory: PartyMemory
    agents: dict[str, AgentPersona]
    current_phase: str = "planning"
    current_topic: str | None = None
    
    async def discuss(
        self,
        topic: str,
        user_message: str | None = None,
        lead_agent: str | None = None
    ) -> Discussion:
        """
        Facilitate a discussion on a topic.
        
        1. Select relevant agents (2-3) based on topic
        2. Build prompt with agent personas and context
        3. Invoke OpenCode for agent responses
        4. Parse and display responses
        5. Update memory with discussion
        6. Extract any decisions made
        """
        pass
    
    async def transition_phase(self, next_phase: str) -> PhaseTransition:
        """
        Move to next BMAD phase.
        
        1. Summarize current phase discussions
        2. Finalize current phase artifacts
        3. Update phase milestone
        4. Prepare context for next phase
        """
        pass
    
    def save_session(self) -> Path:
        """Save session state for resume."""
        pass
    
    @classmethod
    def resume_session(cls, session_path: Path) -> "PartySession":
        """Resume a saved session."""
        pass
```

#### 3.1.2 Agent Orchestrator

**Responsibility:** Select and coordinate agents for discussions.

```python
# agent_orchestrator.py
class AgentOrchestrator:
    """Selects and coordinates agents for discussion topics."""
    
    def __init__(self, agents: dict[str, AgentPersona]):
        self.agents = agents
        self.participation_history: list[str] = []
    
    def select_agents(
        self,
        topic: str,
        phase: str,
        user_directed: str | None = None
    ) -> list[str]:
        """
        Select 2-3 relevant agents for a topic.
        
        Selection criteria:
        - Expertise match to topic
        - Phase relevance
        - User-directed priority
        - Rotation for balanced participation
        """
        pass
    
    def build_discussion_prompt(
        self,
        topic: str,
        agents: list[str],
        context: PartyContext
    ) -> str:
        """Build prompt for multi-agent discussion."""
        pass
    
    def parse_agent_responses(
        self,
        llm_output: str
    ) -> list[AgentResponse]:
        """Parse individual agent responses from LLM output."""
        pass
```

#### 3.1.3 Phase Manager

**Responsibility:** Manage BMAD phase progression.

```python
# phase_manager.py
class PhaseManager:
    """Manages BMAD phase progression within party mode."""
    
    PHASES = ["planning", "solutioning", "implementation"]
    
    PHASE_TOPICS = {
        "planning": [
            ("vision", "What problem are we solving?", "pm"),
            ("users", "Who are the users?", "analyst"),
            ("success", "What does success look like?", "pm"),
            ("scope", "What's the MVP scope?", "pm"),
        ],
        "solutioning": [
            ("architecture", "How should we build it?", "architect"),
            ("tech_stack", "What technology stack?", "architect"),
            ("epics", "What are the work items?", "pm"),
            ("gate_check", "Is everything ready?", "architect"),
        ],
    }
    
    def get_current_topics(self, phase: str) -> list[tuple]:
        """Get discussion topics for current phase."""
        pass
    
    def check_phase_complete(
        self,
        phase: str,
        decisions: list[Decision],
        artifacts: dict[str, str]
    ) -> bool:
        """Check if phase milestone is met."""
        pass
    
    def get_phase_artifact(self, phase: str) -> str:
        """Get the primary artifact for a phase (PRD, Architecture, etc.)."""
        pass
```

### 3.2 PartyMemory

The PartyMemory system manages conversation history and context persistence.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARTY MEMORY                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │  Conversation   │────▶│    Decision     │────▶│    Artifact     │       │
│  │    History      │     │    Registry     │     │     Store       │       │
│  │                 │     │                 │     │                 │       │
│  │ - Add message   │     │ - Track decide  │     │ - Draft PRD     │       │
│  │ - Get recent    │     │ - Extract auto  │     │ - Draft Arch    │       │
│  │ - Summarize     │     │ - Link to topic │     │ - Save/Update   │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│          │                       │                       │                  │
│          ▼                       ▼                       ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Context Compressor                              │   │
│  │  - Progressive summarization (every N turns)                         │   │
│  │  - Keep: summaries + decisions + recent messages + artifact refs     │   │
│  │  - Target: fit within context window (100k tokens)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.2.1 PartyMemory Class

```python
# party_memory.py
@dataclass
class Message:
    """A single message in the conversation."""
    role: str  # "user", "agent:pm", "agent:architect", "facilitator"
    content: str
    timestamp: datetime
    topic: str | None = None
    phase: str | None = None

@dataclass
class Decision:
    """A decision made during discussions."""
    id: str
    topic: str
    decision: str
    rationale: str
    participants: list[str]
    timestamp: datetime

class PartyMemory:
    """Manages conversation history and context persistence."""
    
    def __init__(self, max_tokens: int = 100_000):
        self.messages: list[Message] = []
        self.decisions: list[Decision] = []
        self.summaries: list[str] = []
        self.artifacts: dict[str, Path] = {}
        self.max_tokens = max_tokens
    
    def add_message(
        self,
        role: str,
        content: str,
        topic: str | None = None,
        phase: str | None = None
    ) -> None:
        """Add a message and manage context window."""
        self.messages.append(Message(
            role=role,
            content=content,
            timestamp=datetime.now(),
            topic=topic,
            phase=phase
        ))
        self._check_compression()
    
    def get_context(self, max_tokens: int | None = None) -> str:
        """
        Get optimized context for next LLM call.
        
        Includes:
        - Recent messages (last 10-20)
        - Phase summaries
        - Key decisions
        - Artifact references
        """
        pass
    
    def extract_decisions(self, response: str) -> list[Decision]:
        """Extract decisions from agent responses."""
        pass
    
    def summarize_and_compress(self) -> str:
        """Compress old conversation into summary."""
        pass
    
    def save_to_file(self, path: Path) -> None:
        """Save memory state to file for resume."""
        pass
    
    @classmethod
    def load_from_file(cls, path: Path) -> "PartyMemory":
        """Load memory state from file."""
        pass
```

#### 3.2.2 Context Building Strategy

```markdown
# Context Window Strategy

## Two-Layer Context Model

### Layer 1: Agent Persona (Static)
Loaded once at session start, included in every prompt:
- Agent name, title, icon
- Communication style
- Principles and expertise

### Layer 2: Project Context (Dynamic)
Evolves throughout session:
- Project name and description
- Current phase and topic
- Recent discussion (last 10 messages)
- Phase summaries
- Key decisions made
- Artifact drafts (truncated references)

## Progressive Summarization

Every 20 turns:
1. Summarize turns 1-10 → "Summary 1"
2. Keep turns 11-20 as recent
3. Next iteration: Summarize turns 11-30 → "Summary 2"
4. Keep only summaries + last 10 turns

## Context Window Allocation

| Component | Token Budget | Notes |
|-----------|--------------|-------|
| Agent Personas (2-3) | 3,000 | Static per turn |
| Project Context | 2,000 | Phase, topic, summaries |
| Recent Messages | 20,000 | Last 10-15 turns |
| Decisions | 5,000 | All key decisions |
| Artifact Refs | 10,000 | Draft snippets |
| **Total** | ~40,000 | Leaves room for response |
```

### 3.3 OpenCode Integration

The OpenCode Integration layer invokes OpenCode CLI for LLM execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPENCODE INTEGRATION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   CLI Invoker   │────▶│  Prompt Builder │────▶│ Response Parser │       │
│  │                 │     │                 │     │                 │       │
│  │ - opencode run  │     │ - Multi-agent   │     │ - Parse agents  │       │
│  │ - Model config  │     │ - Context incl  │     │ - Extract decide│       │
│  │ - Streaming     │     │ - Personas      │     │ - Validate      │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.3.1 OpenCode Invoker

```python
# opencode_invoker.py
class OpenCodeInvoker:
    """Invokes OpenCode CLI for party mode discussions."""
    
    def __init__(
        self,
        model: str = "anthropic/claude-opus-4-5",
        opencode_path: str = "opencode",
        project_path: Path | None = None
    ):
        self.model = model
        self.opencode_path = opencode_path
        self.project_path = project_path or Path.cwd()
        
    async def invoke_discussion(
        self,
        prompt: str,
        streaming: bool = True
    ) -> str:
        """
        Invoke OpenCode for a discussion turn.
        
        Uses: opencode run --model {model} "{prompt}"
        """
        cmd = [
            self.opencode_path,
            "run",
            "--model", self.model,
            prompt
        ]
        
        if streaming:
            # Stream output for real-time display
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_path)
            )
            # ... handle streaming
        else:
            result = subprocess.run(cmd, capture_output=True, text=True)
            return result.stdout
```

#### 3.3.2 Party Mode Prompt Template

```python
# prompt_builder.py
PARTY_DISCUSSION_PROMPT = """
You are facilitating a BMAD party mode discussion.

## Active Agents for This Topic

{agent_personas}

## Project Context

**Project:** {project_name}
**Current Phase:** {current_phase}
**Discussion Topic:** {current_topic}

## Previous Discussion Summary

{discussion_summary}

## Key Decisions Made

{decisions}

## Current Artifact Draft

{artifact_snippet}

## User Input

{user_message}

## Instructions

Each selected agent should respond in-character to this topic.
- Maintain their communication style and expertise
- Enable natural cross-talk and building on each other's points
- Focus on actionable insights for the artifact being created

## Response Format

For each agent, respond as:

[AGENT_ICON] **[Agent Name]**: [Their response in character]

After all responses, if any decisions are made, note them:

[DECISION]: [Topic] - [What was decided] - [Rationale]

Keep responses focused and substantive (2-4 paragraphs per agent).
"""

def build_party_prompt(
    agents: list[AgentPersona],
    project_context: ProjectContext,
    memory: PartyMemory,
    user_message: str | None = None
) -> str:
    """Build the complete party discussion prompt."""
    
    # Format agent personas
    agent_personas = "\n\n".join([
        f"### {a.icon} {a.display_name} ({a.title})\n"
        f"**Communication Style:** {a.communication_style}\n"
        f"**Expertise:** {a.role}"
        for a in agents
    ])
    
    # Get memory context
    discussion_summary = memory.get_phase_summary()
    decisions = memory.format_decisions()
    artifact_snippet = memory.get_artifact_snippet()
    
    return PARTY_DISCUSSION_PROMPT.format(
        agent_personas=agent_personas,
        project_name=project_context.name,
        current_phase=project_context.phase,
        current_topic=project_context.topic,
        discussion_summary=discussion_summary,
        decisions=decisions,
        artifact_snippet=artifact_snippet,
        user_message=user_message or "[Continue the discussion]"
    )
```

### 3.4 Artifact Extractor

Extracts structured artifacts from free-form discussions.

```python
# artifact_extractor.py
class ArtifactExtractor:
    """Extracts PRD, Architecture, etc. from discussions."""
    
    def __init__(self, memory: PartyMemory, templates_path: Path):
        self.memory = memory
        self.templates_path = templates_path
        
    async def extract_prd(self) -> str:
        """
        Extract PRD from Planning phase discussions.
        
        Uses LLM to synthesize:
        - Vision and goals from discussions
        - User personas from user topic
        - Requirements from scope discussions
        - Success metrics from success discussions
        """
        pass
    
    async def extract_architecture(self) -> str:
        """Extract Architecture from Solutioning discussions."""
        pass
    
    def get_extraction_prompt(self, artifact_type: str) -> str:
        """Get prompt for extracting specific artifact type."""
        pass
```

---

## 4. Data Architecture

### 4.1 Directory Structure

```
project-root/
├── _bmad/                          # BMAD methodology (read-only)
│   ├── core/                       # Core BMAD components
│   │   └── workflows/party-mode/   # Party mode workflow (foundation)
│   ├── bmm/                        # BMad Method module
│   │   └── agents/                 # Agent persona files
│   └── _config/                    # Agent manifest (CSV)
│
├── _bmad-output/                   # BMAD outputs (generated)
│   ├── planning-artifacts/         # PRD, Architecture, etc.
│   └── implementation-artifacts/   # Stories, Sprint status
│
├── .bmad-claude/                   # BMAD-Claude runtime
│   ├── config.yaml                 # User configuration
│   └── party-sessions/             # Party mode session data
│       └── {session-id}/
│           ├── session.yaml        # Session metadata
│           ├── conversation.jsonl  # Full conversation log
│           ├── decisions.yaml      # Extracted decisions
│           └── summaries.md        # Phase summaries
│
└── src/                            # User's project code
```

### 4.2 Session Schema

```yaml
# .bmad-claude/party-sessions/{session-id}/session.yaml
schema_version: 1

# Session identification
session:
  id: "party-2026-01-16-task-manager"
  project_name: "Task Manager"
  started_at: "2026-01-16T10:00:00Z"
  updated_at: "2026-01-16T11:30:00Z"
  status: "active"  # active, paused, completed

# Phase tracking
phase:
  current: "planning"
  completed: []
  milestones:
    planning: false
    solutioning: false
    implementation: false

# Discussion state
discussion:
  current_topic: "User Personas"
  topics_covered:
    - "Product Vision"
    - "Target Users"
  turn_count: 24
  
# Agents
agents:
  available: ["pm", "architect", "analyst", "ux-designer", "sm", "dev"]
  recent_participants: ["pm", "analyst", "ux-designer"]

# Artifacts
artifacts:
  prd:
    status: "drafting"  # none, drafting, complete
    path: "_bmad-output/planning-artifacts/prd.md"
    completion: 60
  architecture:
    status: "none"
    path: null
    completion: 0

# Statistics
stats:
  decisions_made: 4
  messages_count: 48
  tokens_used: 125000
```

### 4.3 Conversation Log Format

```jsonl
# .bmad-claude/party-sessions/{session-id}/conversation.jsonl
{"turn": 1, "role": "user", "content": "I want to build a task management app...", "timestamp": "2026-01-16T10:00:00Z", "topic": "vision", "phase": "planning"}
{"turn": 2, "role": "agent:pm", "content": "Great vision! Let me dig into...", "timestamp": "2026-01-16T10:00:30Z", "topic": "vision", "phase": "planning"}
{"turn": 2, "role": "agent:analyst", "content": "Good questions, John...", "timestamp": "2026-01-16T10:00:30Z", "topic": "vision", "phase": "planning"}
{"turn": 2, "role": "agent:architect", "content": "From a technical standpoint...", "timestamp": "2026-01-16T10:00:30Z", "topic": "vision", "phase": "planning"}
{"turn": 3, "role": "user", "content": "The target is small teams...", "timestamp": "2026-01-16T10:01:00Z", "topic": "vision", "phase": "planning"}
```

### 4.4 Decision Registry

```yaml
# .bmad-claude/party-sessions/{session-id}/decisions.yaml
decisions:
  - id: "D001"
    topic: "Target Users"
    decision: "Focus on small teams (2-10 people)"
    rationale: "Sweet spot between individual tools and enterprise solutions"
    participants: ["pm", "analyst"]
    timestamp: "2026-01-16T10:15:00Z"
    phase: "planning"
    
  - id: "D002"
    topic: "Real-time Collaboration"
    decision: "Use WebSockets for real-time sync"
    rationale: "Team collaboration requires instant updates"
    participants: ["architect", "dev"]
    timestamp: "2026-01-16T10:30:00Z"
    phase: "planning"
```

---

## 5. Integration Patterns

### 5.1 BMAD Agent Integration

**Pattern:** Manifest-Driven Agent Loading

Agents are loaded from the BMAD manifest CSV and used for discussion orchestration.

```python
# agent_loader.py
class AgentLoader:
    """Load BMAD agents from manifest."""
    
    def __init__(self, bmad_root: Path = Path("_bmad")):
        self.root = bmad_root
        self.manifest_path = bmad_root / "_config" / "agent-manifest.csv"
        
    def load_all_agents(self) -> dict[str, AgentPersona]:
        """Load all agents from manifest CSV."""
        import csv
        agents = {}
        with open(self.manifest_path) as f:
            reader = csv.DictReader(f)
            for row in reader:
                agents[row["name"]] = AgentPersona(
                    id=row["name"],
                    display_name=row["displayName"],
                    title=row["title"],
                    icon=row["icon"],
                    role=row["role"],
                    identity=row["identity"],
                    communication_style=row["communicationStyle"],
                    principles=row["principles"].split(";")
                )
        return agents
    
    def load_agent(self, agent_id: str) -> AgentPersona:
        """Load single agent by ID."""
        return self.load_all_agents()[agent_id]
```

### 5.2 OpenCode CLI Integration

**Pattern:** CLI Invocation with Retry

```python
# opencode_integration.py
class OpenCodeIntegration:
    """Integrate with OpenCode CLI for LLM execution."""
    
    def __init__(
        self,
        model: str = "anthropic/claude-opus-4-5",
        opencode_path: str = "opencode"
    ):
        self.model = model
        self.opencode_path = opencode_path
        
    async def invoke_with_retry(
        self,
        prompt: str,
        max_retries: int = 3
    ) -> str:
        """Invoke OpenCode with automatic retry."""
        for attempt in range(max_retries):
            try:
                return await self._invoke(prompt)
            except subprocess.CalledProcessError as e:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                
    async def _invoke(self, prompt: str) -> str:
        """Execute OpenCode CLI."""
        cmd = [self.opencode_path, "run", "--model", self.model, prompt]
        result = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await result.communicate()
        return stdout.decode()
```

### 5.3 Session Persistence

**Pattern:** File-Based Session Save/Resume

```python
# session_persistence.py
class SessionPersistence:
    """Handle party session save and resume."""
    
    def __init__(self, sessions_dir: Path):
        self.sessions_dir = sessions_dir
        
    def save_session(self, session: PartySession) -> Path:
        """Save session state to files."""
        session_dir = self.sessions_dir / session.session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        
        # Save session metadata
        with open(session_dir / "session.yaml", "w") as f:
            yaml.dump(session.to_dict(), f)
        
        # Save conversation log
        with open(session_dir / "conversation.jsonl", "a") as f:
            for msg in session.memory.new_messages():
                f.write(json.dumps(msg.to_dict()) + "\n")
        
        # Save decisions
        with open(session_dir / "decisions.yaml", "w") as f:
            yaml.dump({"decisions": [d.to_dict() for d in session.memory.decisions]}, f)
        
        return session_dir
    
    def load_session(self, session_id: str) -> PartySession:
        """Load session from saved files."""
        session_dir = self.sessions_dir / session_id
        
        with open(session_dir / "session.yaml") as f:
            metadata = yaml.safe_load(f)
        
        # Load conversation history
        messages = []
        with open(session_dir / "conversation.jsonl") as f:
            for line in f:
                messages.append(Message.from_dict(json.loads(line)))
        
        return PartySession.from_saved(metadata, messages)
```

---

## 6. Execution Flows

### 6.1 Party Mode Session Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PARTY MODE SESSION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [User: bmad-claude party "Task Manager"]                                   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. SESSION INITIALIZATION                                            │   │
│  │    - Create session ID (party-{date}-{project-slug})                 │   │
│  │    - Load all agents from BMAD manifest                              │   │
│  │    - Initialize PartyMemory                                          │   │
│  │    - Create session directory                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. PARTY WELCOME                                                     │   │
│  │    - Display welcome banner with agent roster                        │   │
│  │    - Show 3-4 key agents (PM, Architect, Analyst)                   │   │
│  │    - Prompt user for project description                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. DISCUSSION LOOP (Planning Phase)                                  │   │
│  │    while phase == "planning":                                        │   │
│  │    ├── Receive user input                                           │   │
│  │    ├── Select 2-3 relevant agents                                   │   │
│  │    ├── Build multi-agent prompt with context                        │   │
│  │    ├── Invoke OpenCode for responses                                │   │
│  │    ├── Parse and display agent responses                            │   │
│  │    ├── Extract decisions, update memory                             │   │
│  │    └── Check phase milestone completion                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. PHASE TRANSITION                                                  │   │
│  │    - Summarize Planning phase discussions                           │   │
│  │    - Extract and finalize PRD artifact                              │   │
│  │    - Ask user: Continue to Solutioning?                             │   │
│  │    - Update phase to "solutioning"                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. DISCUSSION LOOP (Solutioning Phase)                               │   │
│  │    while phase == "solutioning":                                     │   │
│  │    ├── Similar loop with Architect leading                          │   │
│  │    ├── Architecture discussions                                     │   │
│  │    ├── Epic/Story breakdown discussions                             │   │
│  │    └── Gate check before implementation                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. SESSION COMPLETION                                                │   │
│  │    - Finalize all artifacts                                         │   │
│  │    - Save session state                                             │   │
│  │    - Display summary (decisions, artifacts, stats)                  │   │
│  │    - Offer: Save for resume or complete                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Discussion Turn Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DISCUSSION TURN FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [User Input: "I want to build a task management app for small teams"]      │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. ANALYZE TOPIC                                                     │   │
│  │    - Identify domain (product vision)                               │   │
│  │    - Determine expertise needed                                     │   │
│  │    - Check current phase context                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 2. SELECT AGENTS                                                     │   │
│  │    - Primary: PM (John) - product vision expert                     │   │
│  │    - Secondary: Analyst (Mary) - market research                    │   │
│  │    - Tertiary: Architect (Winston) - technical feasibility          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 3. BUILD CONTEXT                                                     │   │
│  │    - Load agent personas                                            │   │
│  │    - Get phase summary from memory                                  │   │
│  │    - Get recent decisions                                           │   │
│  │    - Get current artifact draft snippet                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 4. INVOKE OPENCODE                                                   │   │
│  │    - Build multi-agent prompt                                       │   │
│  │    - Execute: opencode run --model anthropic/claude-opus-4-5        │   │
│  │    - Stream response to terminal                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 5. PROCESS RESPONSE                                                  │   │
│  │    - Parse individual agent responses                               │   │
│  │    - Extract [DECISION] tags                                        │   │
│  │    - Display formatted output                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 6. UPDATE MEMORY                                                     │   │
│  │    - Add user message to conversation log                           │   │
│  │    - Add agent responses to conversation log                        │   │
│  │    - Register any new decisions                                     │   │
│  │    - Update artifact draft if applicable                            │   │
│  │    - Check for compression threshold                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                               │                                              │
│                               ▼                                              │
│  [Prompt for next user input]                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Error Handling and Recovery

### 7.1 Error Categories

| Category | Example | Recovery Strategy |
|----------|---------|-------------------|
| **LLM Error** | Rate limit, timeout | Retry with backoff |
| **Parse Error** | Invalid agent response | Re-prompt for format |
| **Session Error** | Corrupted session file | Restore from checkpoint |
| **Context Error** | Token limit exceeded | Trigger compression |
| **Discussion Error** | Off-topic drift | Facilitator redirect |

### 7.2 Recovery Mechanisms

```python
# recovery.py
class PartyRecovery:
    """Handle error recovery for party mode sessions."""
    
    async def handle_llm_error(self, error: Exception) -> RecoveryAction:
        """Handle LLM-related errors."""
        if "rate_limit" in str(error):
            return RecoveryAction.RETRY_WITH_BACKOFF
        elif "timeout" in str(error):
            return RecoveryAction.RETRY
        else:
            return RecoveryAction.SAVE_AND_EXIT
    
    async def handle_context_overflow(
        self,
        memory: PartyMemory
    ) -> None:
        """Handle context window overflow."""
        # Force immediate compression
        memory.summarize_and_compress()
    
    async def handle_parse_error(
        self,
        workflow_context: WorkflowContext,
        step_context: StepContext
    ) -> RecoveryAction:
        """Handle stuck state via BMAD breakthrough mechanisms."""
        # 1. Try correct-course workflow
        # 2. Try party-mode for discussion
        # 3. Escalate to user
```

### 7.3 Session Checkpoint Strategy

```yaml
# Session is checkpointed after every turn
checkpoint_strategy:
  frequency: "every_turn"
  location: ".bmad-claude/party-sessions/{session-id}/"
  files:
    - session.yaml      # Metadata (after each turn)
    - conversation.jsonl # Append-only log
    - decisions.yaml    # Updated on decision
  retention: "full_session"
```

---

## 8. Technology Stack

### 8.1 Core Technologies

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| **Language** | Python | 3.12+ | Existing codebase, team expertise |
| **LLM** | OpenCode CLI | Latest | Multi-provider, Claude Opus 4.5 |
| **CLI** | Typer + Rich | Latest | Modern Python CLI with formatting |
| **Config** | PyYAML | Latest | YAML configuration |
| **Async** | asyncio | Built-in | Async LLM invocation |
| **JSON** | Built-in | Built-in | Conversation log (JSONL) |

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
│       │   ├── main.py             # Main CLI (party, status, etc.)
│       │   └── commands/           # CLI commands
│       │       ├── party.py        # Party mode command
│       │       ├── init.py         # Legacy init
│       │       ├── run.py          # Legacy sequential
│       │       └── status.py       # Status display
│       │
│       ├── party/                  # Party Mode (NEW)
│       │   ├── __init__.py
│       │   ├── session.py          # PartySession class
│       │   ├── memory.py           # PartyMemory class
│       │   ├── orchestrator.py     # Agent orchestrator
│       │   ├── phase.py            # Phase manager
│       │   └── extractor.py        # Artifact extractor
│       │
│       ├── persona/                # Persona system
│       │   ├── __init__.py
│       │   ├── loader.py           # Manifest loader
│       │   ├── models.py           # AgentPersona model
│       │   └── injector.py         # Prompt injector
│       │
│       ├── opencode/               # OpenCode integration
│       │   ├── __init__.py
│       │   ├── invoker.py          # CLI invoker
│       │   └── prompt.py           # Prompt builder
│       │
│       ├── persistence/            # Session persistence
│       │   ├── __init__.py
│       │   ├── saver.py            # Session save
│       │   └── loader.py           # Session load
│       │
│       ├── driver.py               # Legacy BMADDriver (sequential)
│       │
│       └── _bmad/                  # Bundled BMAD framework
│           └── ...
│
├── tests/                          # Test suite
│   ├── unit/
│   │   ├── test_party_session.py
│   │   ├── test_party_memory.py
│   │   └── test_orchestrator.py
│   └── integration/
│       └── test_party_mode.py
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

### Phase 1: Core Party Components (Days 1-2)

| Component | Priority | Effort |
|-----------|----------|--------|
| PartySession class | P0 | 1 day |
| PartyMemory class | P0 | 1 day |
| Agent Loader (CSV) | P0 | 0.5 day |

### Phase 2: OpenCode & CLI Integration (Days 2-3)

| Component | Priority | Effort |
|-----------|----------|--------|
| OpenCode Invoker | P0 | 0.5 day |
| Prompt Builder | P0 | 0.5 day |
| `party` CLI command | P0 | 1 day |

### Phase 3: Orchestration (Days 3-4)

| Component | Priority | Effort |
|-----------|----------|--------|
| Agent Selector | P0 | 0.5 day |
| Response Parser | P0 | 0.5 day |
| Phase Manager | P0 | 1 day |

### Phase 4: Artifacts & Polish (Days 5-6)

| Component | Priority | Effort |
|-----------|----------|--------|
| Artifact Extractor | P0 | 1 day |
| Session Save/Resume | P1 | 0.5 day |
| Testing & Fixes | P0 | 1 day |

---

## 12. Appendices

### A. Decision Log

| ID | Decision | Date | Rationale |
|----|----------|------|-----------|
| AD-001 | Facilitator pattern | 2026-01-16 | bmad-master orchestrates agent selection |
| AD-002 | Two-layer context | 2026-01-16 | Agent persona (static) + project (dynamic) |
| AD-003 | OpenCode CLI | 2026-01-16 | Simple invocation, Claude Opus 4.5 |
| AD-004 | File-based memory | 2026-01-16 | Simple, debuggable, supports resume |
| AD-005 | JSONL conversation log | 2026-01-16 | Append-only, easy to parse |
| AD-006 | Artifact-centric context | 2026-01-16 | Artifacts replace full history |

### B. API Contracts (Party Mode)

```python
# Party session API
async def start_party(
    project_name: str,
    project_description: Optional[str] = None
) -> PartySession:
    """Start a new party mode session."""

# Discussion API
async def discuss(
    session: PartySession,
    user_message: str,
    topic: Optional[str] = None
) -> Discussion:
    """Process a discussion turn."""

# Phase transition API
async def transition_phase(
    session: PartySession,
    next_phase: str
) -> PhaseTransition:
    """Move to next BMAD phase."""

# Session persistence API
def save_session(session: PartySession) -> Path:
    """Save session for resume."""

def load_session(session_id: str) -> PartySession:
    """Load saved session."""
```

### C. Related Documents

- PRD: `_bmad-output/bmad-claude-initiative/prd.md`
- Research: `_bmad-output/planning-artifacts/party-mode-research.md`
- BMAD Party Mode: `_bmad/core/workflows/party-mode/`

---

*End of Architecture Document*

---

**Document Status:** DRAFT v2.0 - Updated for Party Mode Pivot

**Next Steps:**
1. Implement PartySession and PartyMemory classes
2. Add `bmad-claude party` CLI command
3. Test with real project
