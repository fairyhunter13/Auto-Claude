# BMAD-Claude: Product Requirements Document

> **Version:** 1.0
> **Status:** Draft
> **Author:** John (PM Agent) with BMAD Team
> **Date:** 2026-01-15
> **Stakeholder:** Hafiz (Product Owner)

---

## 1. Executive Summary

### 1.1 Product Vision

**BMAD-Claude** is an autonomous development system that combines BMAD's expert-level software development methodology with automated workflow orchestration and OpenCode's execution capabilities. It transforms the manually-driven BMAD workflow experience into a fully autonomous AI-powered development pipeline.

### 1.2 Problem Statement

**Current Pain:**
- BMAD provides excellent methodology for software development (PRD → Architecture → Stories → Dev)
- However, BMAD requires manual driving—users must invoke commands, select options, and guide the workflow
- This creates friction and reduces adoption despite BMAD's superior planning outcomes
- Auto-Claude provides autonomous execution but lacks BMAD's expert methodology
- No existing solution combines expert methodology with full automation

**Target User:**
- Developers and teams who want AI-assisted development with expert-level methodology
- Users who value structured planning but don't want to manually drive every step
- Organizations seeking consistent, high-quality development workflows

### 1.3 Solution

BMAD-Claude automates the complete BMAD workflow lifecycle:
1. **Autonomous Workflow Execution** — System drives workflows without manual intervention
2. **Persona-Driven Agents** — 20 specialized agent personas for different development phases
3. **Intelligent Orchestration** — Automatic workflow selection, phase transitions, and state management
4. **Breakthrough Recovery** — Automatic stuck-state detection and recovery mechanisms
5. **Persistent Memory** — Cross-session learning via Graphiti knowledge graph

---

## 2. Goals and Success Criteria

### 2.1 Primary Goals

| Goal | Description | Priority |
|------|-------------|----------|
| **G1** | Automate BMAD PRD-to-Architecture workflow | P0 (POC) |
| **G2** | Preserve BMAD persona characteristics in autonomous mode | P0 |
| **G3** | Integrate OpenCode.ai as execution layer | P0 |
| **G4** | Achieve output quality parity with manual BMAD | P0 |
| **G5** | Automate full lifecycle (PRD → Dev) | P1 (Post-POC) |
| **G6** | Implement breakthrough recovery mechanisms | P1 |
| **G7** | Enable multi-project memory sharing | P2 |

### 2.2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Automation Rate** | 100% | No manual intervention for standard workflows |
| **Quality Score** | ≥90% | Blind comparison vs manually-driven BMAD outputs |
| **Time Savings** | 5x | Time to complete PRD→Arch vs manual |
| **Recovery Rate** | 100% | Successfully recover from all stuck states |
| **User Satisfaction** | ≥4.5/5 | Post-usage survey |

### 2.3 Non-Goals (Out of Scope for POC)

- Full development cycle automation (Stories → Code)
- Multi-user collaboration features
- Cloud deployment / SaaS offering
- Mobile interface
- Real-time collaboration

---

## 3. User Research Summary

### 3.1 Target Users

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Solo Developer** | Individual building side projects | Fast, quality planning without ceremony |
| **Tech Lead** | Leading small team, needs consistent methodology | Repeatable, high-quality specs |
| **Startup Founder** | Non-technical, needs clear requirements | Expert guidance without expertise |
| **Enterprise Architect** | Large org, needs compliance and traceability | Structured, auditable artifacts |

### 3.2 User Stories

**Epic 1: Autonomous PRD Creation**

| ID | User Story | Priority |
|----|------------|----------|
| US1.1 | As a developer, I want to describe my project idea and have a complete PRD generated automatically | P0 |
| US1.2 | As a developer, I want the PRD to follow BMAD's expert structure and quality standards | P0 |
| US1.3 | As a developer, I want to review and provide feedback on the PRD before finalization | P0 |
| US1.4 | As a developer, I want the system to ask clarifying questions when my input is ambiguous | P1 |

**Epic 2: Autonomous Architecture Creation**

| ID | User Story | Priority |
|----|------------|----------|
| US2.1 | As a developer, I want the system to automatically generate architecture from my PRD | P0 |
| US2.2 | As a developer, I want the architecture to reference and align with my PRD | P0 |
| US2.3 | As a developer, I want architecture decisions explained with rationale | P0 |
| US2.4 | As a developer, I want multiple architecture options presented for key decisions | P1 |

**Epic 3: Persona-Driven Experience**

| ID | User Story | Priority |
|----|------------|----------|
| US3.1 | As a developer, I want the PM persona (John) to drive PRD creation with appropriate expertise | P0 |
| US3.2 | As a developer, I want the Architect persona (Winston) to drive architecture with appropriate expertise | P0 |
| US3.3 | As a developer, I want persona communication style to be consistent and engaging | P1 |

**Epic 4: Workflow Orchestration**

| ID | User Story | Priority |
|----|------------|----------|
| US4.1 | As a developer, I want workflows to automatically transition between phases | P0 |
| US4.2 | As a developer, I want to see progress as the system works through workflows | P0 |
| US4.3 | As a developer, I want the system to save progress and resume if interrupted | P1 |
| US4.4 | As a developer, I want the ability to pause and provide input at checkpoints | P1 |

---

## 4. Functional Requirements

### 4.1 Core Features

#### F1: Workflow Engine

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F1.1 | Parse and execute BMAD workflow files (YAML and MD formats) | P0 |
| F1.2 | Execute step-files in sequence following micro-file architecture | P0 |
| F1.3 | Track workflow state in persistent storage | P0 |
| F1.4 | Handle workflow transitions (PRD → Architecture → Stories) | P0 |
| F1.5 | Support continuation from interrupted state | P1 |
| F1.6 | Support parallel workflow execution | P2 |

#### F2: Persona System

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F2.1 | Load agent personas from BMAD manifest | P0 |
| F2.2 | Inject persona into LLM system prompt | P0 |
| F2.3 | Maintain persona characteristics throughout session | P0 |
| F2.4 | Support persona switching between workflow phases | P0 |
| F2.5 | Persona-specific communication styles | P1 |
| F2.6 | Persona memory (preferences, patterns) | P2 |

#### F3: OpenCode Integration

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F3.1 | Use OpenCode SDK for LLM execution | P0 |
| F3.2 | Support Claude and other LLM providers | P0 |
| F3.3 | Handle session management | P0 |
| F3.4 | Support Plan/Build mode toggling | P1 |
| F3.5 | Multi-session for parallel workflows | P2 |

#### F4: Output Management

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F4.1 | Generate Markdown documents matching BMAD templates | P0 |
| F4.2 | Save outputs to configured locations | P0 |
| F4.3 | Track document versions | P1 |
| F4.4 | Support document validation | P1 |

#### F5: User Interaction

| Requirement | Description | Priority |
|-------------|-------------|----------|
| F5.1 | Accept initial project description input | P0 |
| F5.2 | Display progress during workflow execution | P0 |
| F5.3 | Support checkpoint review and feedback | P1 |
| F5.4 | Handle clarifying questions | P1 |
| F5.5 | Support manual override at any point | P1 |

### 4.2 Workflow Coverage (POC)

| Workflow | Phase | Agent | POC Status |
|----------|-------|-------|------------|
| PRD | Planning | PM (John) | **In Scope** |
| Architecture | Solutioning | Architect (Winston) | **In Scope** |
| Epics/Stories | Solutioning | PM (John) | Post-POC |
| Sprint Planning | Implementation | SM (Bob) | Post-POC |
| Dev Story | Implementation | Dev (Amelia) | Post-POC |
| Code Review | Implementation | Dev (Amelia) | Post-POC |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| PRD generation time | < 15 minutes |
| Architecture generation time | < 15 minutes |
| Workflow transition time | < 10 seconds |
| Memory retrieval time | < 2 seconds |

### 5.2 Reliability

| Requirement | Target |
|-------------|--------|
| Workflow completion rate | 99% |
| State recovery success | 100% |
| Data loss prevention | 100% |

### 5.3 Scalability

| Requirement | Target |
|-------------|--------|
| Concurrent users | 1 (single-user for POC) |
| Projects per user | Unlimited |
| Memory per project | 10MB |

### 5.4 Security

| Requirement | Description |
|-------------|-------------|
| API key handling | Secure storage, never logged |
| File access | Scoped to project directory |
| Code execution | Sandboxed environment |

---

## 6. Technical Constraints

### 6.1 Must Use

| Component | Rationale |
|-----------|-----------|
| BMAD Workflow System | Core methodology source |
| OpenCode SDK | Execution layer (per requirements) |
| Graphiti Memory | Cross-session context (from Auto-Claude) |
| Python 3.12+ | Backend language (existing) |

### 6.2 Must Support

| Component | Rationale |
|-----------|-----------|
| Claude Models | Primary LLM |
| Other LLM Providers | OpenCode's 75+ providers |
| macOS, Linux, Windows | Cross-platform (OpenCode supports all) |

### 6.3 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| OpenCode SDK maturity | API stability | Pin versions, abstraction layer |
| BMAD workflow complexity | Implementation time | Start with PRD only |
| LLM output quality variance | Inconsistent results | Validation steps, retry logic |
| State management complexity | Data corruption | Transaction-based saves |

---

## 7. User Experience

### 7.1 Primary Flow (POC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BMAD-CLAUDE USER FLOW (POC)                          │
└─────────────────────────────────────────────────────────────────────────────┘

[User starts BMAD-Claude]
         │
         ▼
┌─────────────────────┐
│ "Describe your      │
│  project idea..."   │
└─────────────────────┘
         │
         │ User enters: "I want to build a task management app..."
         │
         ▼
┌─────────────────────┐
│  PM AGENT (John)    │
│  ───────────────    │
│  "Great! I'm John,  │
│  your PM. Let me    │
│  create a PRD..."   │
└─────────────────────┘
         │
         │ [PRD Workflow executes - 12 steps]
         │ [Progress displayed to user]
         │
         ▼
┌─────────────────────┐
│  PRD COMPLETE!      │
│  ───────────────    │
│  "Here's your PRD.  │
│  Review and approve │
│  to continue..."    │
└─────────────────────┘
         │
         │ User approves or provides feedback
         │
         ▼
┌─────────────────────┐
│  ARCHITECT (Winston)│
│  ───────────────    │
│  "Hello. I'm        │
│  Winston. Let me    │
│  design the         │
│  architecture..."   │
└─────────────────────┘
         │
         │ [Architecture Workflow executes - 9 steps]
         │ [Progress displayed to user]
         │
         ▼
┌─────────────────────┐
│  ARCHITECTURE       │
│  COMPLETE!          │
│  ───────────────    │
│  "Your architecture │
│  is ready."         │
└─────────────────────┘
         │
         ▼
[PRD.md + Architecture.md saved to project]
```

### 7.2 CLI Interface (POC)

```bash
# Initialize new project
bmad-claude init "Task Management App"

# Run autonomous workflow
bmad-claude run --workflow prd-to-arch

# Check status
bmad-claude status

# Resume interrupted workflow
bmad-claude resume

# View outputs
bmad-claude outputs
```

### 7.3 Progress Display

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 📋 BMAD-Claude: PRD Workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 
 Active Agent: John (Product Manager) 📋
 
 Progress: [████████████░░░░░░░░] 60%
 
 Current Step: step-07-project-type
 ├── ✅ step-01-init
 ├── ✅ step-02-discovery
 ├── ✅ step-03-success
 ├── ✅ step-04-journeys
 ├── ✅ step-05-domain
 ├── ✅ step-06-innovation
 ├── ⏳ step-07-project-type (in progress)
 ├── ○ step-08-scoping
 ├── ○ step-09-functional
 ├── ○ step-10-nonfunctional
 ├── ○ step-11-polish
 └── ○ step-12-complete
 
 💬 John: "I'm analyzing your project type to determine 
     the appropriate scope and complexity level..."
 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 8. Dependencies

### 8.1 External Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| OpenCode SDK | Required | LLM execution |
| Anthropic API | Required | Claude model access |
| Graphiti | Required | Memory system |
| Python 3.12+ | Required | Runtime |
| Node.js | Optional | Frontend (future) |

### 8.2 Internal Dependencies

| Component | Depends On | Purpose |
|-----------|------------|---------|
| Workflow Engine | BMAD workflow files | Source workflows |
| Persona System | BMAD agent manifest | Source personas |
| Output Manager | Workflow Engine | Template handling |
| State Manager | File system | Persistence |

---

## 9. Milestones and Timeline

### 9.1 POC Milestones

| Milestone | Description | Target Date |
|-----------|-------------|-------------|
| **M1** | Research Complete | ✅ 2026-01-15 |
| **M2** | PRD & Architecture Docs | 2026-01-17 |
| **M3** | Repository Fork | 2026-01-19 |
| **M4** | Workflow Engine Core | 2026-01-26 |
| **M5** | Persona System | 2026-01-28 |
| **M6** | OpenCode Integration | 2026-01-31 |
| **M7** | PRD Automation | 2026-02-05 |
| **M8** | Architecture Automation | 2026-02-07 |
| **M9** | POC Testing & Validation | 2026-02-14 |

### 9.2 Post-POC Roadmap

| Phase | Scope | Estimated Duration |
|-------|-------|-------------------|
| Phase 4 | Stories & Sprint Workflows | 3 weeks |
| Phase 5 | Dev & Code Review Workflows | 4 weeks |
| Phase 6 | Breakthrough Recovery | 2 weeks |
| Phase 7 | Multi-Project Memory | 2 weeks |
| Phase 8 | GUI/Desktop App | 4 weeks |

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | OpenCode SDK exact API for programmatic control? | Winston | Research needed |
| 2 | How to handle long workflows > 30 min? | Bob | Design needed |
| 3 | Checkpoint frequency for user review? | John | Decision needed |
| 4 | Memory sharing across projects? | Mary | Future scope |
| 5 | Error handling UX pattern? | Sally | Design needed |

---

## 11. Appendices

### A. BMAD Workflow Inventory (POC Scope)

**PRD Workflow (12 steps):**
1. init - Workflow initialization
2. discovery - Project discovery
3. success - Success criteria
4. journeys - User journeys
5. domain - Domain analysis
6. innovation - Innovation opportunities
7. project-type - Project classification
8. scoping - MVP scoping
9. functional - Functional requirements
10. nonfunctional - Non-functional requirements
11. polish - Document polish
12. complete - Completion

**Architecture Workflow (9 steps):**
1. init - Initialization
2. context - Context gathering
3. starter - Architecture starter
4. decisions - Core decisions
5. patterns - Design patterns
6. structure - System structure
7. validation - Validation
8. complete - Completion

### B. Agent Personas (POC Scope)

| Agent | Name | Communication Style |
|-------|------|---------------------|
| PM | John | Asks 'WHY?' relentlessly, direct and data-sharp |
| Architect | Winston | Calm, pragmatic, balances 'what could be' with 'what should be' |

### C. Related Documents

- Research Report: Auto-Claude Analysis
- Research Report: BMAD Analysis  
- Research Report: OpenCode Analysis
- Project Context Document

---

*End of PRD*

---

**Document Status:** DRAFT - Ready for Review

**Next Steps:**
1. Stakeholder review and approval
2. Proceed to Architecture document
3. Begin implementation planning
