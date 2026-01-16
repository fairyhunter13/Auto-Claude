# BMAD-Claude: Product Requirements Document

> **Version:** 2.0
> **Status:** Draft - Updated for Party Mode Pivot
> **Author:** John (PM Agent) with BMAD Team
> **Date:** 2026-01-16
> **Stakeholder:** Hafiz (Product Owner)

---

## 1. Executive Summary

### 1.1 Product Vision

**BMAD-Claude** is a collaborative AI development system that brings together multiple expert AI agents in a "party mode" discussion environment to create high-quality software artifacts through natural collaboration. Instead of sequential handoffs between isolated agents, all agents participate together, maintaining shared context and producing artifacts through collective intelligence.

### 1.2 Problem Statement

**Current Pain (Sequential Model):**
- BMAD's sequential workflow (PM → Architect → SM) loses context between agent handoffs
- Each agent works in isolation, missing valuable cross-functional insights
- Manual driving creates friction: users must invoke commands and guide each phase
- Context window limitations compound as artifacts are passed between sessions
- No single agent has visibility into decisions made by other agents

**New Insight (Party Mode Solution):**
- Human teams don't work sequentially—they discuss, debate, and collaborate
- Real-world planning involves back-and-forth between PM, Architect, and others
- Context is never lost when everyone participates in the same conversation
- Cross-pollination of ideas produces higher quality artifacts

**Target User:**
- Developers and teams who want AI-assisted development with human-like collaboration
- Users who value structured planning with rich, contextual discussions
- Organizations seeking consistent, high-quality artifacts with full traceability

### 1.3 Solution

BMAD-Claude Party Mode transforms software planning into collaborative discussions:
1. **Party Mode Sessions** — All relevant agents participate in shared discussions
2. **Facilitator Pattern** — bmad-master orchestrates topic selection and agent involvement
3. **Two-Layer Context** — Agent persona (static) + project context (dynamic)
4. **Artifact-Centric Memory** — Discussions produce artifacts; artifacts become context
5. **Phase Milestones** — Guided discussions through BMAD phases (Planning → Solutioning → Implementation)

### 1.4 Architecture Comparison

| Aspect | Sequential (Old) | Party Mode (New) |
|--------|------------------|------------------|
| **Agent Interaction** | PM → Architect → SM (isolated) | PM + Architect + SM (together) |
| **Context Flow** | Passed via artifacts | Shared conversation |
| **Decision Visibility** | Only in current agent | All agents see all decisions |
| **Cross-Functional Insights** | Lost between handoffs | Naturally integrated |
| **User Experience** | Multiple workflow invocations | Single conversation session |

---

## 2. Goals and Success Criteria

### 2.1 Primary Goals

| Goal | Description | Priority |
|------|-------------|----------|
| **G1** | Implement Party Mode collaborative discussions | P0 (POC) |
| **G2** | Maintain agent persona characteristics in discussions | P0 |
| **G3** | Integrate OpenCode as LLM execution layer | P0 |
| **G4** | Produce PRD, Architecture, Epics from party sessions | P0 |
| **G5** | Implement context persistence across discussion turns | P0 |
| **G6** | Enable phase-guided discussions (Planning → Solutioning) | P1 |
| **G7** | Support session save/resume for multi-day projects | P1 |

### 2.2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Context Retention** | 95%+ | Decision recall accuracy across session |
| **Character Consistency** | Distinct | Agent personalities maintained throughout |
| **Artifact Quality** | ≥Sequential | Comparable to sequential workflow outputs |
| **User Engagement** | Higher | Subjective, compared to sequential |
| **Token Efficiency** | < 2x | Token usage vs sequential for same output |
| **Session Duration** | 30-60 min | Time to complete PRD + Architecture |

### 2.3 Non-Goals (Out of Scope for POC)

- Full development cycle automation (Sprint → Code)
- Vector database memory (start with file-based)
- Multi-user concurrent sessions
- Web/mobile interface
- Voice interaction (TTS deferred)

---

## 3. User Research Summary

### 3.1 Target Users

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Solo Developer** | Individual building side projects | Collaborative brainstorming, multiple perspectives |
| **Tech Lead** | Leading small team, needs consistent methodology | Rich discussions that capture context |
| **Startup Founder** | Non-technical, needs clear requirements | Expert team guiding decisions naturally |
| **Enterprise Architect** | Large org, needs compliance and traceability | Full decision traceability in discussions |

### 3.2 User Stories

**Epic 1: Party Mode Sessions**

| ID | User Story | Priority |
|----|------------|----------|
| US1.1 | As a developer, I want to start a party session with my project idea and have agents discuss it collaboratively | P0 |
| US1.2 | As a developer, I want to see multiple expert perspectives on each topic in the discussion | P0 |
| US1.3 | As a developer, I want to interject and guide the discussion when needed | P0 |
| US1.4 | As a developer, I want agents to naturally build on each other's ideas | P1 |

**Epic 2: Artifact Creation from Discussions**

| ID | User Story | Priority |
|----|------------|----------|
| US2.1 | As a developer, I want discussions to produce structured artifacts (PRD, Architecture) | P0 |
| US2.2 | As a developer, I want artifacts to capture decisions made during discussions | P0 |
| US2.3 | As a developer, I want the ability to refine artifacts through continued discussion | P0 |
| US2.4 | As a developer, I want to see how specific artifact content emerged from discussions | P1 |

**Epic 3: Multi-Agent Collaboration**

| ID | User Story | Priority |
|----|------------|----------|
| US3.1 | As a developer, I want PM (John), Architect (Winston), and others to discuss together | P0 |
| US3.2 | As a developer, I want each agent to maintain their unique perspective and expertise | P0 |
| US3.3 | As a developer, I want agents to respectfully disagree and work through differences | P1 |
| US3.4 | As a developer, I want the facilitator to select relevant agents per topic | P0 |

**Epic 4: Context & Memory Persistence**

| ID | User Story | Priority |
|----|------------|----------|
| US4.1 | As a developer, I want context to persist throughout the entire session | P0 |
| US4.2 | As a developer, I want to save and resume sessions across multiple days | P1 |
| US4.3 | As a developer, I want decisions to be extractable and reviewable | P1 |
| US4.4 | As a developer, I want session history for audit and learning | P2 |

---

## 4. Functional Requirements

### 4.1 Core Features

#### F1: Party Session Management

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F1.1 | Start party session with project name and description | P0 |
| F1.2 | Manage discussion turns with user and agents | P0 |
| F1.3 | Save session state for resume capability | P1 |
| F1.4 | Support phase transitions within session | P0 |
| F1.5 | Graceful exit with session summary | P0 |
| F1.6 | Session history and audit trail | P2 |

#### F2: Agent Orchestration (Facilitator)

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F2.1 | Load all agent personas from BMAD manifest | P0 |
| F2.2 | Select 2-3 relevant agents per topic based on expertise | P0 |
| F2.3 | Maintain agent personality consistency across turns | P0 |
| F2.4 | Enable natural cross-talk between agents | P1 |
| F2.5 | Handle user-directed agent requests | P0 |
| F2.6 | Balance agent participation over time | P1 |

#### F3: Context & Memory System

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F3.1 | Maintain conversation history within session | P0 |
| F3.2 | Extract and store key decisions | P0 |
| F3.3 | Progressive summarization for long sessions | P1 |
| F3.4 | Artifact-centric context (PRD becomes context) | P0 |
| F3.5 | File-based persistence for session save/resume | P1 |
| F3.6 | Vector database integration (future) | P2 |

#### F4: Artifact Generation

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F4.1 | Generate PRD from Planning phase discussions | P0 |
| F4.2 | Generate Architecture from Solutioning discussions | P0 |
| F4.3 | Draft artifacts during discussion, finalize after phase | P0 |
| F4.4 | Update artifacts based on continued discussion | P1 |
| F4.5 | Link artifact sections to discussion sources | P2 |

#### F5: OpenCode Integration

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F5.1 | Use OpenCode CLI for LLM execution | P0 |
| F5.2 | Support Claude Opus 4.5 with high variants | P0 |
| F5.3 | Construct multi-agent prompts with personas | P0 |
| F5.4 | Parse agent responses from LLM output | P0 |
| F5.5 | Handle streaming for real-time display | P1 |

### 4.2 Discussion Topics by Phase

| Phase | Discussion Topics | Lead Agent | Output |
|-------|------------------|------------|--------|
| **Planning** | "What are we building?" | PM (John) | PRD.md |
| **Planning** | "Who are the users?" | Analyst (Mary) | User personas |
| **Solutioning** | "How should we build it?" | Architect (Winston) | Architecture.md |
| **Solutioning** | "What are the work items?" | PM (John) | Epics/Stories |
| **Solutioning** | "Is it ready to build?" | Architect (Winston) | Gate check |
| **Implementation** | "What's in this sprint?" | SM (Bob) | Sprint plan |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Agent response time | < 30 seconds per agent per turn |
| Context loading time | < 5 seconds |
| Session save time | < 2 seconds |
| Full planning session | 30-60 minutes (PRD + Arch) |

### 5.2 Reliability

| Requirement | Target |
|-------------|--------|
| Session completion rate | 95%+ |
| Context retention | 95%+ decision recall |
| State recovery success | 100% |
| Data loss prevention | 100% |

### 5.3 Scalability

| Requirement | Target |
|-------------|--------|
| Concurrent sessions | 1 (single-session for POC) |
| Discussion turns per session | Unlimited |
| Session file size | < 50MB |

### 5.4 Security

| Requirement | Description |
|-------------|-------------|
| API key handling | Use OpenCode's credential management |
| Session data | Local file storage only |
| File access | Scoped to project directory |

---

## 6. Technical Constraints

### 6.1 Must Use

| Component | Rationale |
|-----------|-----------|
| BMAD Agent Manifest | Agent persona source |
| BMAD Party Mode Workflow | Foundation for discussions |
| OpenCode CLI | LLM execution layer |
| Python 3.12+ | Backend language (existing) |

### 6.2 Must Support

| Component | Rationale |
|-----------|-----------|
| Claude Opus 4.5 | Primary LLM (high quality for multi-agent) |
| anthropic/claude-opus-4-5 | OpenCode model identifier |
| macOS, Linux, Windows | Cross-platform |

### 6.3 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Context window overflow | High | Progressive summarization, artifact-centric |
| Agent response quality | Medium | Strong persona prompts, consistency checks |
| Session state corruption | Medium | Frequent checkpoints, recovery mechanism |
| Discussion going off-track | Low | Facilitator guidance, phase milestones |
| Token efficiency | Medium | Intelligent context compression |

---

## 7. User Experience

### 7.1 Primary Flow (Party Mode)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BMAD-CLAUDE PARTY MODE FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

[User: bmad-claude party "Task Management App"]
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎉 PARTY MODE ACTIVATED!                                                    │
│                                                                              │
│  Welcome! I'm bringing together our BMAD expert team to help plan your app. │
│                                                                              │
│  📋 John (PM) - "I'll help define what we're building and for whom."        │
│  🏛️ Winston (Architect) - "I'll design a solid technical foundation."       │
│  📊 Mary (Analyst) - "I'll research the market and user needs."             │
│                                                                              │
│  Tell us about your project idea!                                           │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ User: "I want to build a task management app for small teams..."
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Topic: Understanding the Product Vision]                                   │
│                                                                              │
│  📋 John: "Great vision! Let me dig into the 'why' here. What pain point    │
│     are small teams facing with existing solutions? What makes this         │
│     different from Trello, Asana, or Linear?"                               │
│                                                                              │
│  📊 Mary: "Good questions, John. I'd also add - what size teams are we      │
│     targeting? 2-5 people? 5-15? The workflows differ significantly."       │
│                                                                              │
│  🏛️ Winston: "From a technical standpoint, real-time collaboration for      │
│     teams suggests we'll need websockets and conflict resolution. Worth     │
│     considering early on."                                                   │
│                                                                              │
│  [Type your response or let the discussion continue...]                      │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         │ [Discussion continues through Planning phase...]
         │ [Artifacts are drafted as discussions progress...]
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Phase Milestone: Planning Complete]                                        │
│                                                                              │
│  📄 PRD Draft: prd.md (ready for review)                                     │
│                                                                              │
│  📋 John: "We've covered the product requirements. Ready to move to         │
│     architecture planning?"                                                  │
│                                                                              │
│  [C] Continue to Solutioning | [R] Review PRD | [E] Exit                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 CLI Interface

```bash
# Start a party mode session (NEW!)
bmad-claude party "Task Management App"

# Resume an existing party session
bmad-claude party --resume

# Legacy sequential workflows (still supported)
bmad-claude init "Task Management App"
bmad-claude run
bmad-claude status

# List available workflows
bmad-claude list
```

### 7.3 Party Mode Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 🎉 BMAD-Claude Party Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 
 Project: Task Management App
 Phase: Planning
 Topic: User Personas & Journeys
 
 Active Agents:
 ├── 📋 John (PM) - Leading
 ├── 📊 Mary (Analyst) - Contributing  
 └── 🎨 Sally (UX Designer) - Contributing
 
 Decisions Made: 4
 Artifacts Drafting: prd.md (60% complete)
 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 John: "Based on our discussion, I'm identifying three primary 
user personas: the Team Lead who needs visibility, the Individual 
Contributor who needs simplicity, and the Remote Worker who needs 
async-friendly features."

📊 Mary: "The research supports this. Teams under 10 people spend 
an average of 4 hours/week on task coordination. Your async focus 
could differentiate you from the always-on tools like Slack."

🎨 Sally: "For the remote worker persona, we should consider time 
zone awareness in the UI. Show deadlines in local time, and maybe 
indicate when teammates are likely offline."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Your turn] > _
```

---

## 8. Dependencies

### 8.1 External Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| OpenCode CLI | Required | LLM execution |
| Anthropic API | Required | Claude model access |
| Python 3.12+ | Required | Runtime |
| Typer/Rich | Required | CLI interface |

### 8.2 Internal Dependencies

| Component | Depends On | Purpose |
|-----------|------------|---------|
| PartySession | BMAD agent manifest | Agent personas |
| PartyMemory | File system | Context persistence |
| Facilitator | PartySession | Agent orchestration |
| ArtifactExtractor | PartyMemory | PRD/Arch generation |

---

## 9. Milestones and Timeline

### 9.1 Party Mode POC Milestones

| Milestone | Description | Target Date |
|-----------|-------------|-------------|
| **M1** | Research Complete | ✅ 2026-01-16 |
| **M2** | PRD & Architecture Updated | 2026-01-16 |
| **M3** | PartySession Class | 2026-01-17 |
| **M4** | PartyMemory Class | 2026-01-18 |
| **M5** | CLI `party` Command | 2026-01-19 |
| **M6** | Agent Orchestration | 2026-01-20 |
| **M7** | Artifact Extraction | 2026-01-21 |
| **M8** | Phase Milestones | 2026-01-22 |
| **M9** | Testing & Validation | 2026-01-24 |

### 9.2 Post-POC Roadmap

| Phase | Scope | Estimated Duration |
|-------|-------|-------------------|
| Phase 1 | Session Save/Resume | 1 week |
| Phase 2 | Vector DB Memory | 2 weeks |
| Phase 3 | Implementation Phase Support | 2 weeks |
| Phase 4 | TTS/Voice Integration | 1 week |
| Phase 5 | GUI/Desktop App | 4 weeks |

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Optimal context window usage per turn? | Winston | Design needed |
| 2 | How to extract artifacts from free-form discussion? | John | POC to determine |
| 3 | When to auto-advance phases vs ask user? | Bob | Design needed |
| 4 | Session file format for save/resume? | Winston | Design needed |
| 5 | How to handle very long sessions (2+ hours)? | Mary | Future scope |

---

## 11. Appendices

### A. Discussion Topics by Phase

**Phase 2: Planning**
- "What problem are we solving?" - Core vision
- "Who are the users?" - Personas and journeys  
- "What does success look like?" - Success metrics
- "What's the MVP scope?" - Feature prioritization

**Phase 3: Solutioning**
- "How should we build it?" - Architecture decisions
- "What technology stack?" - Tech choices
- "What are the work items?" - Epic breakdown
- "Is everything ready to build?" - Gate check

**Phase 4: Implementation**
- "What's in sprint 1?" - Sprint planning
- "How do we implement this story?" - Story refinement

### B. Agent Personas (Party Mode)

| Agent | Name | Party Mode Role |
|-------|------|-----------------|
| PM | John | Planning lead, requirements driver |
| Architect | Winston | Technical decisions, architecture |
| Analyst | Mary | Research, market insights |
| UX Designer | Sally | User experience, interface |
| Scrum Master | Bob | Sprint planning, process |
| Dev | Amelia | Implementation perspective |
| Test Architect | Murat | Testability, quality |

### C. Related Documents

- Research Report: Party Mode Research (`party-mode-research.md`)
- Research Report: Auto-Claude Analysis
- Research Report: BMAD Analysis  
- Research Report: OpenCode Analysis

---

*End of PRD*

---

**Document Status:** DRAFT v2.0 - Updated for Party Mode Pivot

**Next Steps:**
1. Update Architecture document for Party Mode
2. Implement PartySession and PartyMemory classes
3. Add `bmad-claude party` CLI command
4. Test with real project
