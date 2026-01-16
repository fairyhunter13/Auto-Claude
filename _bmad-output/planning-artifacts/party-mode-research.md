# Party Mode Architecture Research

**Research Lead:** Mary (Business Analyst)  
**Date:** January 16, 2026  
**Project:** BMAD-Claude Pivot to Party Mode Architecture

---

## Executive Summary

This research investigates how to transform BMAD-Claude from a **sequential workflow execution model** to a **collaborative party mode model** where AI agents discuss and work together, maintaining shared context across the entire project lifecycle.

**Key Finding:** The industry is moving toward collaborative multi-agent architectures. Major frameworks (CrewAI, AutoGen, MetaGPT, ChatDev) all support collaborative patterns. Our proposed Party Mode architecture aligns with this trend while offering unique advantages through BMAD's structured methodology.

---

## 1. Multi-Agent Framework Analysis

### 1.1 CrewAI

**Architecture:** Flows + Crews
- **Flows**: Event-driven workflows with state management (the "backbone")
- **Crews**: Teams of autonomous agents that collaborate on tasks

**Key Patterns:**
```
Flow (Manager) → Crew (Workers) → Flow (Continue)
```

**Relevant Insights:**
- Flows manage state and control execution
- Crews provide autonomous collaboration
- State persists across steps and executions
- Agents have roles, goals, and tools

**Memory System:**
- Short-term memory (conversation context)
- Long-term memory (persistent knowledge)
- Entity memory (information about entities)
- Contextual memory (situational awareness)

### 1.2 Microsoft AutoGen

**Architecture:** Event-driven multi-agent system

**Key Patterns:**
- **AgentChat**: Conversational single/multi-agent applications
- **Core**: Event-driven programming for scalable systems
- **Extensions**: MCP integration, code execution, distributed agents

**Relevant Insights:**
- Supports both deterministic and agentic workflows
- Event-driven architecture for scalability
- Built-in support for human-in-the-loop
- Distributed agent runtime (gRPC)

**Collaboration Models:**
- Round-robin conversations
- Selector-based agent activation
- Group chat with topic management

### 1.3 MetaGPT

**Architecture:** Virtual Software Company

**Key Patterns:**
```
"Code = SOP(Team)"
```

**Agent Roles:**
- CEO, CTO, Programmer, Designer, etc.
- Each agent has specialized functions
- Agents participate in "functional seminars"

**Relevant Insights:**
- SOP-driven collaboration (Standard Operating Procedures)
- Agents communicate through structured documents
- Multi-Agent Collaboration Networks (MacNet) for complex topologies
- Supports 1000+ agents without exceeding context limits

**Memory/Context:**
- Document-based context sharing
- Shared workspace for artifacts
- Experience refinement for learning

### 1.4 ChatDev 2.0 (DevAll)

**Architecture:** Zero-Code Multi-Agent Platform

**Key Patterns:**
- Workflow-based orchestration
- YAML configuration for agents/tasks
- Visual canvas for workflow design

**Relevant Insights:**
- No-code approach to agent orchestration
- Real-time monitoring and human feedback
- Context flows between nodes
- Agent personalities via configuration

### 1.5 LangChain/LangGraph

**Architecture:** Agent framework with graph-based orchestration

**Key Patterns:**
- Agents built on LangGraph for durability
- State machines for complex workflows
- Checkpointing for persistence

**Relevant Insights:**
- Human-in-the-loop support
- Streaming and async execution
- Memory management (short-term and long-term)
- Multi-agent coordination patterns

---

## 2. Memory & Context Persistence Patterns

### 2.1 Context Window Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Full History** | Keep entire conversation | Short sessions |
| **Sliding Window** | Keep last N messages | Medium sessions |
| **Summarization** | Compress old context | Long sessions |
| **Hierarchical** | Multi-level summaries | Very long sessions |
| **Relevance-Based** | Keep only relevant context | Complex projects |

### 2.2 Persistent Memory Architectures

**File-Based Persistence:**
```
project/
├── .party-session/
│   ├── conversation.jsonl    # Full conversation log
│   ├── decisions.yaml        # Key decisions made
│   ├── artifacts/            # Generated artifacts
│   └── summary.md            # Running summary
```

**Vector Database Approach:**
- Store conversation chunks as embeddings
- Retrieve relevant context per query
- Tools: ChromaDB, Pinecone, Weaviate

**Structured State:**
```yaml
session:
  id: "party-2026-01-16"
  project: "My App"
  phase: "planning"
  
context:
  prd_draft: |
    ...current PRD content...
  architecture_notes:
    - "Using microservices"
    - "PostgreSQL for persistence"
  
decisions:
  - id: D001
    topic: "Database choice"
    decision: "PostgreSQL"
    rationale: "Team expertise, ACID compliance"
    participants: [architect, pm, dev]
```

### 2.3 Context Compression Techniques

1. **Progressive Summarization:**
   - Summarize every N turns
   - Keep summaries + recent messages

2. **Decision Extraction:**
   - Extract key decisions from conversation
   - Store structured decision records

3. **Artifact-Centric:**
   - Conversation produces artifacts
   - Artifacts become the context (PRD.md, Architecture.md)
   - New turns reference artifacts, not full history

---

## 3. Agent Orchestration Models

### 3.1 Facilitator Pattern (Recommended)

```
                    ┌──────────────┐
                    │  Facilitator │
                    │ (bmad-master)│
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
      ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
      │   PM    │    │Architect│    │ Analyst │
      │  (John) │    │(Winston)│    │ (Mary)  │
      └─────────┘    └─────────┘    └─────────┘
```

**How it works:**
1. Facilitator receives user input
2. Facilitator analyzes topic, selects relevant agents
3. Selected agents respond in-character
4. Facilitator manages turn-taking and topic flow
5. Facilitator extracts decisions and updates artifacts

### 3.2 Round-Robin Pattern

All agents speak in sequence on each topic. Simple but can be verbose.

### 3.3 Reactive Pattern

Agents "raise hands" when they have relevant input. More natural but harder to implement.

### 3.4 Recommended: Hybrid Facilitator + Reactive

- Facilitator selects 2-3 agents per turn based on topic
- Agents can request to speak if they have critical input
- Facilitator summarizes and checks for consensus

---

## 4. BMAD Party Mode Integration

### 4.1 Current BMAD Party Mode Analysis

BMAD already has a party-mode workflow at:
```
_bmad/core/workflows/party-mode/
├── workflow.md
└── steps/
    ├── step-01-agent-loading.md
    ├── step-02-discussion-orchestration.md
    └── step-03-graceful-exit.md
```

**Current Capabilities:**
- Loads all agents from manifest
- Supports intelligent agent selection per topic
- Maintains conversation state in frontmatter
- Cross-talk between agents
- Exit triggers for graceful conclusion

**Gap:** Current party mode is for brainstorming/discussion, not for structured artifact creation through phases.

### 4.2 Proposed: Phase-Guided Party Mode

Extend party mode to guide discussions through BMAD phases:

```
┌─────────────────────────────────────────────────────────────┐
│                    PARTY SESSION                             │
│                                                              │
│  Phase 2: Planning                                           │
│  ├── Topic: "What are we building?"                         │
│  │   └── PM leads, Analyst/UX contribute                    │
│  │   └── Output: PRD.md draft                               │
│  │                                                          │
│  Phase 3: Solutioning                                       │
│  ├── Topic: "How should we build it?"                       │
│  │   └── Architect leads, PM/Dev contribute                 │
│  │   └── Output: Architecture.md draft                      │
│  │                                                          │
│  ├── Topic: "What are the work items?"                      │
│  │   └── PM leads, SM/Architect contribute                  │
│  │   └── Output: Epics.md draft                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Agent Context Model

Each agent has two layers of context:

```yaml
agent_context:
  # Layer 1: Persona (static, loaded from agent file)
  persona:
    name: "Winston"
    role: "Architect"
    communication_style: "Calm, pragmatic..."
    principles: [...]
  
  # Layer 2: Project Context (dynamic, from party session)
  project:
    name: "My App"
    current_phase: "planning"
    discussion_history: [...]
    decisions_made: [...]
    artifacts:
      prd: "path/to/prd.md"
      architecture: null  # Not yet created
```

---

## 5. Technical Architecture Proposal

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BMAD-CLAUDE PARTY                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   OpenCode   │    │    Party     │    │   Memory     │  │
│  │   (LLM)      │◄──►│  Orchestrator│◄──►│   Layer      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              │                              │
│                              ▼                              │
│                     ┌──────────────┐                        │
│                     │    Agent     │                        │
│                     │   Manifest   │                        │
│                     └──────────────┘                        │
│                              │                              │
│         ┌────────────────────┼────────────────────┐        │
│         ▼                    ▼                    ▼        │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐   │
│  │     PM     │      │  Architect │      │   Analyst  │   │
│  │   (John)   │      │  (Winston) │      │   (Mary)   │   │
│  └────────────┘      └────────────┘      └────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                     ARTIFACTS OUTPUT                         │
│  ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐  │
│  │  PRD.md │  │Architecture │  │ Epics.md │  │ Sprint   │  │
│  │         │  │    .md      │  │          │  │ Plan     │  │
│  └─────────┘  └─────────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Core Components

#### PartySession Class
```python
class PartySession:
    """Manages a collaborative party mode session."""
    
    def __init__(self, project_name: str, agents: list[Agent]):
        self.project_name = project_name
        self.agents = agents
        self.memory = PartyMemory()
        self.current_phase = "planning"
        self.artifacts = {}
    
    async def discuss(self, topic: str, lead_agent: str = None) -> Discussion:
        """Facilitate a discussion on a topic."""
        # 1. Select relevant agents
        # 2. Generate prompts with context
        # 3. Invoke LLM for each agent response
        # 4. Update memory with responses
        # 5. Extract decisions/artifacts
        pass
    
    async def transition_phase(self, next_phase: str):
        """Move to next BMAD phase."""
        # Summarize current phase
        # Save artifacts
        # Update context for next phase
        pass
```

#### PartyMemory Class
```python
class PartyMemory:
    """Manages conversation history and context."""
    
    def __init__(self, max_tokens: int = 100000):
        self.conversation: list[Message] = []
        self.decisions: list[Decision] = []
        self.summaries: list[Summary] = []
        self.artifacts: dict[str, Path] = {}
    
    def add_message(self, agent: str, content: str):
        """Add a message and manage context window."""
        pass
    
    def get_context(self, max_tokens: int) -> str:
        """Get optimized context for next LLM call."""
        # Include: recent messages + summaries + decisions + artifact refs
        pass
    
    def summarize_and_compress(self):
        """Compress old conversation into summary."""
        pass
```

### 5.3 OpenCode Integration

**Model:** `anthropic/claude-opus-4-5` with high variants

**Invocation Pattern:**
```python
async def invoke_party_turn(
    topic: str,
    agents: list[str],
    context: PartyContext,
) -> list[AgentResponse]:
    """Invoke OpenCode for a party discussion turn."""
    
    prompt = f"""You are facilitating a BMAD party mode discussion.

## Active Agents
{format_agent_personas(agents)}

## Project Context
{context.to_prompt()}

## Current Topic
{topic}

## Instructions
Each selected agent should respond in-character to this topic.
Maintain their communication style and expertise.
Enable natural cross-talk and building on each other's points.

## Response Format
For each agent:
[AGENT_ICON] **[Agent Name]**: [Their response]

After all responses, extract any decisions made:
[DECISION]: [What was decided]
"""
    
    result = await opencode.run(
        model="anthropic/claude-opus-4-5",
        prompt=prompt,
    )
    
    return parse_agent_responses(result)
```

### 5.4 Configuration

**OpenCode Config for Party Mode:**
```yaml
# opencode.jsonc
{
  "model": {
    "default": "anthropic/claude-opus-4-5",
    "variants": "high"
  },
  "agent": {
    "bmad-party": {
      "instructions": ["_bmad/core/workflows/party-mode/workflow.md"],
      "mode": "primary"
    }
  }
}
```

---

## 6. Implementation Roadmap

### Phase 1: Research & Design (Current)
- [x] Research multi-agent frameworks
- [x] Analyze memory patterns
- [x] Study BMAD party-mode
- [ ] Document architecture proposal
- [ ] Review with team (party mode discussion!)

### Phase 2: Core Implementation
- [ ] Implement PartySession class
- [ ] Implement PartyMemory class
- [ ] Create OpenCode integration layer
- [ ] Build facilitator logic

### Phase 3: BMAD Integration
- [ ] Extend party-mode workflow for phases
- [ ] Create phase transition logic
- [ ] Implement artifact extraction
- [ ] Add decision tracking

### Phase 4: CLI & UX
- [ ] Add `bmad-claude party` command
- [ ] Create interactive party UI
- [ ] Add progress indicators
- [ ] Support session resume

### Phase 5: Testing & Refinement
- [ ] Test with real projects
- [ ] Tune context management
- [ ] Optimize agent selection
- [ ] Gather user feedback

---

## 7. Key Decisions Needed

1. **Memory Persistence:**
   - File-based vs. Vector DB vs. Hybrid?
   - Recommendation: Start with file-based, add vector DB later

2. **Agent Selection:**
   - Fixed rotation vs. Dynamic selection vs. Hybrid?
   - Recommendation: Facilitator-driven dynamic selection

3. **Context Window:**
   - How much history to keep per turn?
   - Recommendation: Last 10 messages + summaries + decisions + artifact refs

4. **Artifact Creation:**
   - During discussion vs. After discussion?
   - Recommendation: Draft during, finalize after phase completion

5. **Session Persistence:**
   - Support multi-day sessions?
   - Recommendation: Yes, with session save/resume

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Context retention across session | 95%+ decision recall |
| Agent character consistency | Distinct personalities maintained |
| Artifact quality | Comparable to sequential workflow |
| User engagement | Higher than sequential (subjective) |
| Token efficiency | < 2x sequential workflow |

---

## 9. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Context window overflow | High | Progressive summarization, artifact-centric context |
| Agent response quality degradation | Medium | Strong persona prompts, character consistency checks |
| Session state corruption | Medium | Frequent checkpoints, recovery mechanism |
| Discussion going off-track | Low | Facilitator guidance, phase milestones |

---

## 10. Conclusion & Recommendations

### Key Findings:
1. Industry trend supports collaborative multi-agent architectures
2. BMAD already has party-mode foundation - extend it, don't rebuild
3. Memory management is the critical technical challenge
4. Facilitator pattern is most appropriate for structured BMAD phases

### Recommendations:
1. **Approve the pivot** to Party Mode architecture
2. **Use existing BMAD party-mode** as foundation
3. **Implement file-based memory** first, add vector DB later
4. **Use `anthropic/claude-opus-4-5`** with high variants for quality
5. **Start with Phase 2 (Planning)** as proof of concept

### Next Steps:
1. Team review of this research (in party mode!)
2. Update PRD and Architecture documents
3. Begin Phase 2 implementation
4. Test with a real project

---

*Research compiled by Mary (Analyst) for the BMAD-Claude team*
