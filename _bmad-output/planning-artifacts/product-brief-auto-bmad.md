---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - apps/frontend/README.md
  - apps/frontend/package.json
  - README.md
  - src/bmad_claude/workflow/config.py
  - _bmad/bmm/workflows/workflow-status/paths/method-greenfield.yaml
date: 2026-01-16
author: Hafiz
project_name: Auto-BMAD
---

# Product Brief: Auto-BMAD

## Executive Summary

**Auto-BMAD** is a desktop application that brings the BMAD (BMad Method Agent Design) methodology to life through a visual, interactive interface. By forking and adapting Auto-Claude's proven Electron/React UI, Auto-BMAD provides a structured 4-phase workflow for software development: Analysis → Planning → Solutioning → Implementation.

Unlike Auto-Claude's freeform task-based approach, Auto-BMAD enforces BMAD's disciplined methodology with specialized AI agents (PM, Architect, Analyst, Developer, etc.) that guide users through creating proper PRDs, architecture documents, epics, and implementation plans before writing any code.

**Target Users:** Solo developers, small teams, and technical leads who want structured, methodology-driven development without the overhead of traditional project management tools.

**Value Proposition:** "Ship better software faster by following a proven methodology with AI-powered agents that think like senior engineers."

---

## Core Vision

### Problem Statement

Developers often jump straight into coding without proper planning, leading to:
- Scope creep and feature bloat
- Technical debt from poor architecture decisions
- Rework due to unclear requirements
- Failed projects from lack of stakeholder alignment

Current AI coding assistants (Cursor, Copilot, Claude Code) help write code but don't enforce good development practices. They're enablers of chaos, not guardians of quality.

### Problem Impact

- **70% of software projects** fail or are challenged due to poor requirements
- **$260 billion/year** wasted on failed IT projects globally
- **40% of development time** spent on rework and bug fixes
- **Technical debt** costs organizations $1 trillion annually

### Why Existing Solutions Fall Short

| Solution | Gap |
|----------|-----|
| **Auto-Claude** | Free-form tasks, no methodology enforcement |
| **Claude Code CLI** | Terminal-only, no visual workflow |
| **Cursor/Copilot** | Code completion, not project planning |
| **Jira/Linear** | Ticket tracking, not AI-assisted planning |
| **Traditional PM tools** | Human-driven, no AI agents |

### Proposed Solution

**Auto-BMAD** combines:
1. **BMAD Methodology** - Proven 4-phase structure
2. **AI Agents** - 11 specialized personas (PM, Architect, etc.)
3. **Visual Interface** - Adapted from Auto-Claude's Electron app
4. **Workflow Automation** - Sequential execution via OpenCode

### Key Differentiators

| Differentiator | Description |
|----------------|-------------|
| **Methodology-First** | Forces proper planning before implementation |
| **Specialized Agents** | Each phase has dedicated AI experts |
| **Visual Phase Tracking** | See exactly where you are in the process |
| **Artifact Generation** | Creates PRD, Architecture, Epics automatically |
| **Gate Checks** | Validates readiness before phase transitions |

---

## Target Users

### Primary Persona: Solo Technical Lead

- **Name:** Alex, 32
- **Role:** Senior Developer / Tech Lead
- **Context:** Works on side projects or leads small teams
- **Pain Points:**
  - Skips planning because it's tedious
  - Ends up rewriting code due to poor initial design
  - Wants structure but doesn't want PM overhead
- **Goals:**
  - Ship quality software faster
  - Have AI handle the "boring" planning work
  - Follow best practices without thinking about them

### Secondary Persona: Startup CTO

- **Name:** Jordan, 38
- **Role:** Technical Co-founder
- **Context:** Building MVP with 2-3 developers
- **Pain Points:**
  - No time for formal project management
  - Needs to communicate technical plans to non-technical co-founders
  - Wants documentation but doesn't want to write it
- **Goals:**
  - Professional artifacts (PRD, Architecture) for investor meetings
  - Consistent development process as team grows
  - AI that thinks strategically, not just codes

### User Journey

```
1. CREATE PROJECT
   └── User opens Auto-BMAD, selects project folder

2. PHASE 1: ANALYSIS (Optional)
   ├── Brainstorm with AI (Analyst agent)
   ├── Research competitors
   └── Generate Product Brief

3. PHASE 2: PLANNING
   ├── PM agent interviews user
   ├── Creates comprehensive PRD
   └── UX Designer creates UI specs (if applicable)

4. PHASE 3: SOLUTIONING
   ├── Architect designs system
   ├── PM breaks into Epics/Stories
   └── Gate Check: Implementation Ready?

5. PHASE 4: IMPLEMENTATION
   ├── Sprint Planning (SM agent)
   ├── Story Development (Dev agent)
   └── Code Review cycle

6. SHIP
   └── Merge to main, generate changelog
```

---

## Success Metrics

### North Star Metric
**Projects Completed Through All 4 Phases**
- Measures methodology adoption, not just usage

### Leading Indicators

| Metric | Target | Rationale |
|--------|--------|-----------|
| Phase 2 Completion Rate | >80% | Users complete planning |
| Gate Check Pass Rate | >70% | Quality artifacts |
| Time to First Artifact | <30 min | Low friction to value |
| Weekly Active Users | 1000+ | Retention |

### Lagging Indicators

| Metric | Target | Rationale |
|--------|--------|-----------|
| GitHub Stars | 500+ (6 months) | Community adoption |
| Projects Shipped | 100+ | Methodology works |
| User NPS | >50 | Satisfaction |

---

## Scope Definition

### In Scope (MVP)

#### Must Have (P0)

| Feature | Description |
|---------|-------------|
| **Phase Dashboard** | Visual 4-phase progress tracker |
| **Workflow Runner** | Execute BMAD workflows via OpenCode |
| **Agent Roster** | View all 11 BMAD agents with personas |
| **Artifact Viewer** | Read PRD, Architecture, Epics |
| **Terminal Integration** | Embedded terminal for workflow execution |
| **Status Persistence** | Track progress in bmm-workflow-status.yaml |

#### Should Have (P1)

| Feature | Description |
|---------|-------------|
| **Interactive Mode** | Chat interface with agents |
| **Artifact Editor** | Edit generated documents |
| **Phase Gating** | Prevent phase skip without gate check |
| **Multi-Project** | Switch between projects |

#### Could Have (P2)

| Feature | Description |
|---------|-------------|
| **Team Collaboration** | Share artifacts |
| **Git Integration** | Auto-commit artifacts |
| **Custom Agents** | User-defined agent personas |

### Out of Scope (MVP)

- CI/CD integration
- Cloud sync
- Mobile app
- Custom methodology creation
- Non-BMAD methodologies

---

## Technical Considerations

### Architecture Decision: Fork Auto-Claude

**Decision:** Fork `apps/frontend/` and adapt for BMAD

**Rationale:**
1. Proven Electron + React stack
2. Terminal integration already built (xterm.js)
3. File explorer component available
4. Design system established
5. 6+ months of production hardening

### Key Adaptations Needed

| Auto-Claude Feature | Auto-BMAD Adaptation |
|---------------------|----------------------|
| Kanban Board | Phase Progress Dashboard |
| Task Cards | Workflow Cards |
| Agent Terminals | Workflow Terminals |
| Settings | BMAD Configuration |
| Ideation | Brainstorming (Phase 1) |
| Roadmap | Epic Overview |

### Backend Integration

```
Auto-BMAD/
├── apps/
│   ├── ui/                    # Forked Electron app
│   │   └── src/renderer/
│   │       ├── features/
│   │       │   ├── phases/        # NEW: Phase tracking
│   │       │   ├── workflows/     # NEW: Workflow runner
│   │       │   ├── agents/        # ADAPT: Agent roster
│   │       │   ├── artifacts/     # NEW: Document viewer
│   │       │   ├── terminals/     # REUSE: Terminal
│   │       │   └── projects/      # REUSE: Project mgmt
│   │       └── shared/            # REUSE: Components
│   └── bmad-claude/           # Our Python backend
│       └── workflow/
│           ├── runner.py      # Workflow execution
│           ├── config.py      # BMAD workflow defs
│           └── interactive.py # Chat interface
└── _bmad/                     # BMAD methodology
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Electron 39 |
| Frontend | React 19 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS 4 |
| Terminal | xterm.js |
| Backend | Python (bmad-claude) |
| CLI | OpenCode |

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **OpenCode dependency** | High | Medium | Abstract agent invocation, support alternatives |
| **BMAD methodology complexity** | Medium | High | Simplified "Quick Flow" for small projects |
| **Fork maintenance** | Medium | Medium | Minimal changes to core, feature-focused additions |
| **User learning curve** | Medium | High | Interactive tutorials, clear phase guidance |

---

## Success Criteria

### MVP Launch (8 weeks)

- [ ] Phase Dashboard showing 4-phase progress
- [ ] Run all Phase 2-3 workflows from UI
- [ ] View generated artifacts (PRD, Architecture, Epics)
- [ ] Terminal integration for workflow execution
- [ ] Status persistence across sessions

### Post-MVP (12 weeks)

- [ ] Interactive Mode in sidebar
- [ ] Artifact editing with auto-save
- [ ] Phase gating with gate check integration
- [ ] Multi-project support

---

## Appendix

### BMAD Workflow Reference

| Phase | Workflow | Agent | Output |
|-------|----------|-------|--------|
| 1 | brainstorm-project | analyst | brainstorm.md |
| 1 | research | analyst | research.md |
| 1 | product-brief | analyst | product-brief.md |
| 2 | prd | pm | prd.md |
| 2 | ux-design | ux-designer | ux-design.md |
| 3 | architecture | architect | architecture.md |
| 3 | epics | pm | epics/index.md |
| 3 | implementation-readiness | architect | readiness-report.md |
| 4 | sprint-planning | sm | sprint-status.yaml |
| 4 | create-story | sm | stories/{id}.md |
| 4 | dev-story | dev | implementation |
| 4 | code-review | dev | review feedback |

### Agent Roster

| Agent | Persona | Role |
|-------|---------|------|
| 🧙 bmad-master | BMad Master | Orchestrator |
| 📊 analyst | Mary | Business Analyst |
| 📋 pm | John | Product Manager |
| 🏗️ architect | Winston | System Architect |
| 🎨 ux-designer | Sally | UX Designer |
| 🏃 sm | Bob | Scrum Master |
| 💻 dev | Amelia | Developer |
| 🧪 tea | Murat | Test Architect |
| 📚 tech-writer | Paige | Technical Writer |
| 🚀 quick-flow-solo-dev | Barry | Quick Flow Dev |
| 🧠 brainstorming-coach | Carson | Innovation Coach |
