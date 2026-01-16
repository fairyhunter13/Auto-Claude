---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
inputDocuments:
  - product-brief-auto-bmad.md
  - apps/frontend/README.md
  - apps/frontend/package.json
workflowType: 'prd'
project_name: Auto-BMAD
date: 2026-01-16
author: Hafiz
---

# Product Requirements Document - Auto-BMAD

**Author:** Hafiz  
**Date:** 2026-01-16  
**Version:** 1.0  
**Status:** Draft

---

## Executive Summary

**Auto-BMAD** is a desktop application that provides a visual interface for the BMAD (BMad Method Agent Design) methodology. By forking Auto-Claude's proven Electron/React UI, Auto-BMAD guides developers through a structured 4-phase software development process with AI-powered agents.

### Vision Statement

*"Ship better software faster by following a proven methodology with AI-powered agents that think like senior engineers."*

### Problem

Developers often skip planning and jump straight into coding, leading to scope creep, technical debt, and failed projects. Current AI coding assistants help write code but don't enforce good development practices.

### Solution

Auto-BMAD provides:
- **Visual Phase Tracking** - See exactly where you are in the 4-phase BMAD process
- **AI Agent Guidance** - 11 specialized agents (PM, Architect, Developer, etc.) guide each phase
- **Artifact Generation** - Automatically creates PRD, Architecture, Epics from conversations
- **Gate Checks** - Validates readiness before phase transitions

### Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Phase 2 Completion Rate | >80% | Users complete planning phase |
| Gate Check Pass Rate | >70% | Quality artifacts produced |
| Time to First Artifact | <30 min | Low friction to value |
| Weekly Active Users | 1000+ (6 months) | Retention |

---

## Target Users

### Primary: Solo Technical Lead

**Demographics:**
- Age: 28-40
- Role: Senior Developer, Tech Lead
- Context: Side projects, small team lead
- Experience: 5+ years development

**Goals:**
- Ship quality software faster
- Have AI handle planning overhead
- Follow best practices automatically

**Pain Points:**
- Skips planning because it's tedious
- Rewrites code due to poor initial design
- Wants structure without PM overhead

**Behaviors:**
- Uses CLI tools (git, npm, docker)
- Comfortable with AI assistants
- Values efficiency over ceremony

### Secondary: Startup CTO

**Demographics:**
- Age: 32-45
- Role: Technical Co-founder
- Context: Building MVP, 2-5 developers
- Experience: 8+ years, previous startup experience

**Goals:**
- Professional artifacts for stakeholders
- Consistent process as team grows
- Strategic AI assistance

**Pain Points:**
- No time for formal project management
- Needs documentation for investors
- Wants scalable processes

---

## User Journeys

### Journey 1: New Project Setup

**Trigger:** Developer starts a new project idea

**Steps:**
1. Open Auto-BMAD, select "New Project"
2. Choose project type (Greenfield)
3. (Optional) Phase 1: Brainstorm with Analyst agent
4. Phase 2: PM agent interviews for PRD
5. View generated PRD in Artifact Viewer
6. Continue to Phase 3 or iterate

**Success Criteria:**
- PRD generated within 30 minutes
- User understands project scope clearly
- Ready to proceed to architecture

### Journey 2: Architecture Design

**Trigger:** PRD completed, ready for technical design

**Steps:**
1. Phase 3 begins, Architect agent activates
2. Agent asks about tech stack preferences
3. Collaborative architecture discussion
4. Architecture.md generated
5. Review system diagrams
6. Gate check validates readiness

**Success Criteria:**
- Architecture covers all PRD requirements
- Technology choices documented
- Ready for epic breakdown

### Journey 3: Sprint Execution

**Trigger:** Epics created, ready to implement

**Steps:**
1. Phase 4: SM agent plans sprint
2. Select story from backlog
3. Dev agent implements story
4. Code review with adversarial check
5. Mark story complete
6. Repeat for sprint

**Success Criteria:**
- Stories trace to epics
- Code passes review
- Sprint velocity tracked

---

## Functional Requirements

### Core Application

- **FR1:** User can create a new project with name and type (greenfield/brownfield)
- **FR2:** User can select an existing project folder to import
- **FR3:** User can view all projects in a project list
- **FR4:** User can delete a project from Auto-BMAD
- **FR5:** User can configure project settings (OpenCode path, output folders)

### Phase Management

- **FR6:** User can view current phase progress (1-4) in a visual dashboard
- **FR7:** User can see which phases are complete, in-progress, or pending
- **FR8:** User can navigate between phases via dashboard
- **FR9:** System prevents skipping to later phases without completing prerequisites
- **FR10:** User can reset a phase to redo it

### Workflow Execution

- **FR11:** User can start any available BMAD workflow from the UI
- **FR12:** User can view list of all available workflows with descriptions
- **FR13:** System executes workflows via OpenCode with correct agent
- **FR14:** User can see real-time workflow execution in terminal
- **FR15:** User can cancel a running workflow
- **FR16:** System tracks workflow completion in status file

### Agent Roster

- **FR17:** User can view all 11 BMAD agents with their personas
- **FR18:** User can see which agent is active for current workflow
- **FR19:** User can read agent's communication style and principles
- **FR20:** User can filter agents by module (bmm, cis, core)

### Artifact Management

- **FR21:** User can view generated artifacts (PRD, Architecture, Epics)
- **FR22:** User can read artifact content in formatted markdown
- **FR23:** User can see artifact metadata (created, modified dates)
- **FR24:** User can export artifacts to external files
- **FR25:** User can edit artifacts within the application

### Terminal Integration

- **FR26:** User can view embedded terminal for workflow execution
- **FR27:** User can interact with terminal during workflows
- **FR28:** User can resize terminal panel
- **FR29:** System preserves terminal history across sessions
- **FR30:** User can clear terminal output

### Interactive Mode

- **FR31:** User can start Interactive Mode session
- **FR32:** User can chat with AI agents about the project
- **FR33:** User can run workflows via slash commands in chat
- **FR34:** User can ask specific agents questions via @mention
- **FR35:** System maintains conversation history

### Status Tracking

- **FR36:** System persists workflow status to bmm-workflow-status.yaml
- **FR37:** User can view detailed status of each phase
- **FR38:** User can see next recommended workflow
- **FR39:** System resumes from last state on restart
- **FR40:** User can view completion timestamps

### Gate Checks

- **FR41:** System runs gate check before Phase 4 (implementation-readiness)
- **FR42:** User can view gate check results
- **FR43:** System prevents Phase 4 if gate check fails
- **FR44:** User can override gate check with explicit confirmation

### File Explorer

- **FR45:** User can browse project files in tree view
- **FR46:** User can open files in external editor
- **FR47:** User can see file status (modified, new)
- **FR48:** System highlights _bmad-output folder

---

## Non-Functional Requirements

### Performance

- **NFR1:** Application launches in under 5 seconds
- **NFR2:** Workflow list loads in under 1 second
- **NFR3:** Terminal output streams with no visible lag
- **NFR4:** UI remains responsive during workflow execution
- **NFR5:** Artifact rendering completes in under 2 seconds

### Usability

- **NFR6:** New user can start first workflow within 5 minutes
- **NFR7:** Phase progress is visible at all times
- **NFR8:** Error messages include actionable guidance
- **NFR9:** Keyboard shortcuts available for common actions
- **NFR10:** UI follows platform conventions (macOS, Windows, Linux)

### Reliability

- **NFR11:** Application handles OpenCode unavailability gracefully
- **NFR12:** Status file corruption triggers automatic recovery
- **NFR13:** Workflow execution can be resumed after crash
- **NFR14:** No data loss on unexpected termination
- **NFR15:** Artifact saves are atomic (no partial writes)

### Compatibility

- **NFR16:** Runs on macOS 12+, Windows 10+, Ubuntu 20.04+
- **NFR17:** Works with OpenCode 0.1.x+
- **NFR18:** Supports BMAD 6.x methodology
- **NFR19:** Compatible with existing _bmad directories

### Security

- **NFR20:** No sensitive data sent to external servers
- **NFR21:** API keys stored in system keychain
- **NFR22:** Project files accessed only with user permission
- **NFR23:** No telemetry without explicit opt-in

### Accessibility

- **NFR24:** Supports keyboard-only navigation
- **NFR25:** Screen reader compatible (ARIA labels)
- **NFR26:** Meets WCAG 2.1 AA standards
- **NFR27:** Supports system dark/light mode

---

## Scope & Constraints

### MVP Scope (8 weeks)

| Priority | Feature | Description |
|----------|---------|-------------|
| P0 | Phase Dashboard | Visual 4-phase progress tracker |
| P0 | Workflow Runner | Execute workflows via OpenCode |
| P0 | Terminal Panel | Embedded xterm.js terminal |
| P0 | Artifact Viewer | Read-only markdown preview |
| P0 | Agent Roster | View 11 BMAD agents |
| P0 | Status Persistence | Save/load from YAML |
| P1 | Interactive Mode | Chat interface |
| P1 | Artifact Editor | Edit generated docs |
| P1 | Multi-Project | Project switching |
| P2 | Gate Check UI | Visual gate results |

### Out of Scope (MVP)

- Team collaboration features
- Cloud sync / backup
- Custom agent creation
- Non-BMAD methodologies
- Mobile application
- CI/CD integration
- VS Code extension

### Technical Constraints

- **Must fork from Auto-Claude** - Leverage existing UI components
- **Must use OpenCode** - Agent execution depends on OpenCode CLI
- **Must preserve _bmad structure** - Compatibility with BMAD methodology
- **Electron required** - Desktop application requirement

### Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Electron | 39.x | Desktop framework |
| React | 19.x | UI framework |
| xterm.js | 6.x | Terminal emulation |
| OpenCode | 0.1.x | Agent execution |
| BMAD | 6.x | Methodology files |

---

## Technical Considerations

### Architecture Decision: Fork Strategy

**Decision:** Fork `apps/frontend/` from Auto-Claude

**Rationale:**
1. 6+ months of production hardening
2. Terminal integration already built
3. File explorer component available
4. Design system established
5. Electron build pipeline ready

### Component Mapping

| Auto-Claude | Auto-BMAD | Change Type |
|-------------|-----------|-------------|
| Kanban Board | Phase Dashboard | Replace |
| Task Cards | Workflow Cards | Replace |
| Agent Terminals | Workflow Terminal | Adapt |
| Settings | BMAD Config | Adapt |
| Ideation | (Phase 1) | Adapt |
| File Explorer | File Explorer | Reuse |
| Design System | Design System | Reuse |

### Data Flow

```
User Action
    ↓
React Component (UI)
    ↓
Zustand Store (State)
    ↓
IPC Bridge (Electron)
    ↓
Main Process
    ↓
OpenCode CLI (Agent Execution)
    ↓
_bmad-output/ (Artifacts)
    ↓
Status YAML (Persistence)
```

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenCode API changes | High | Low | Abstract agent invocation layer |
| BMAD methodology updates | Medium | Medium | Version detection, migration path |
| Auto-Claude divergence | Medium | High | Minimal core changes, feature additions only |
| User learning curve | Medium | High | Interactive tutorials, clear guidance |
| Performance on large projects | Low | Medium | Lazy loading, virtual scrolling |

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| BMAD | BMad Method Agent Design - 4-phase development methodology |
| Phase | One of 4 BMAD stages: Analysis, Planning, Solutioning, Implementation |
| Workflow | A specific BMAD task (e.g., create-prd, create-architecture) |
| Agent | AI persona with specific expertise (PM, Architect, etc.) |
| Artifact | Generated document (PRD, Architecture, Epics) |
| Gate Check | Validation before phase transition |
| OpenCode | CLI tool for executing AI agents |

### BMAD Phase Summary

| Phase | Name | Key Workflows | Output |
|-------|------|---------------|--------|
| 1 | Analysis | brainstorm, research, product-brief | product-brief.md |
| 2 | Planning | prd, ux-design | prd.md, ux-design.md |
| 3 | Solutioning | architecture, epics, gate-check | architecture.md, epics/ |
| 4 | Implementation | sprint-planning, dev-story | stories/, code |

### Related Documents

- [Product Brief: Auto-BMAD](product-brief-auto-bmad.md)
- [BMAD Methodology](../../_bmad/bmm/workflows/workflow-status/paths/method-greenfield.yaml)
- [Auto-Claude Frontend README](../../apps/frontend/README.md)
