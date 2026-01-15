# BMAD-Claude: Project Context

> **Status:** Active - Phase 0 (Research & Discovery)
> **Created:** 2026-01-15
> **Owner:** Hafiz

---

## Vision Statement

Create **BMAD-Claude**: An autonomous development system that combines BMAD's expert-level methodology with Auto-Claude's autonomous execution capabilities, powered by OpenCode.ai as the execution terminal.

**The Core Insight:** BMAD provides superior planning methodology and breakthrough recovery, but requires manual driving. Auto-Claude provides autonomous execution, but with generic methodology. By integrating BMAD as the "brain" and Auto-Claude as the "hands", we create an autonomous system with expert-level development capabilities.

---

## Problem Statement

### Current Pain Points

| System | Strength | Weakness |
|--------|----------|----------|
| **BMAD** | Expert methodology, breakthrough recovery, persona-driven agents | Requires manual driving |
| **Auto-Claude** | Fully autonomous execution, QA loops, workspace isolation | Generic methodology, no persona system |
| **Claude Code CLI** | Direct terminal access | Limited orchestration capabilities |

### Opportunity

Combine the best of all worlds:
- BMAD's **planning methodology** and **agent personas**
- Auto-Claude's **autonomous execution** and **QA validation loops**
- OpenCode.ai's **superior terminal experience**

---

## Goals

### Primary Goal
Fork/rewrite Auto-Claude with BMAD at its core, creating an autonomous system that drives BMAD workflows without manual intervention.

### Success Criteria
1. System can autonomously execute PRD-to-Architecture workflow
2. BMAD agent personas are preserved in autonomous execution
3. OpenCode.ai is integrated as the execution terminal
4. Quality of output matches or exceeds manual BMAD driving

---

## Scope

### Phase 0: Research & Discovery (Current)
- Deep-dive Auto-Claude architecture
- Deep-dive BMAD workflows and agent system
- Deep-dive OpenCode.ai capabilities
- Gap analysis and integration mapping

### Phase 1: PRD & Architecture
- Product Requirements Document
- Technical Architecture Document
- Tech stack decisions

### Phase 2: POC - PRD to Architecture Automation
- Fork Auto-Claude repository
- Implement BMAD workflow orchestration layer
- Integrate PM-to-Architect workflow as first automation
- Integrate OpenCode.ai as execution terminal

### Phase 3: Validation & Iteration
- Test with 3-5 real project specs
- Measure quality vs manual BMAD
- Iterate on orchestration logic

### Future Phases (Post-POC)
- Full workflow automation (Stories, Dev, Testing)
- Advanced breakthrough recovery
- Multi-project support

---

## Key Stakeholders

- **Hafiz** - Product Owner, Decision Maker
- **BMAD Team (Personas)** - Methodology Experts
  - John (PM) - PRD methodology
  - Winston (Architect) - Architecture methodology
  - Bob (Scrum Master) - Story preparation
  - Amelia (Dev) - Implementation patterns

---

## Technical Constraints

1. Must work with Claude SDK / Claude API
2. Must preserve BMAD's workflow state machine
3. Must maintain Auto-Claude's security model
4. OpenCode.ai integration must be stable and documented

---

## Research Tracks

### Track A: Auto-Claude Deep Dive
- [ ] Map spec_runner.py pipeline (SIMPLE/STANDARD/COMPLEX)
- [ ] Document agent system (planner, coder, qa_reviewer, qa_fixer)
- [ ] Analyze Claude SDK integration in core/client.py
- [ ] Review security model and workspace isolation
- [ ] Study Graphiti memory system

### Track B: BMAD Deep Dive
- [ ] Catalog all BMAD workflows with triggers and outputs
- [ ] Document agent manifest and persona loading
- [ ] Analyze workflow state machine and step orchestration
- [ ] Study breakthrough/stuck recovery mechanisms
- [ ] Map BMAD's planning phases (PRD-Arch-Stories-Dev)

### Track C: OpenCode.ai Deep Dive
- [ ] Research OpenCode.ai architecture and capabilities
- [ ] Compare with Claude Code CLI / Claude SDK
- [ ] Identify integration APIs/SDKs available
- [ ] Test OpenCode.ai with sample automation

### Track D: Integration Design
- [ ] Create component mapping (Auto-Claude <-> BMAD)
- [ ] Design orchestration architecture
- [ ] Define agent persona integration strategy
- [ ] Plan OpenCode execution layer

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-15 | Hybrid approach for Phase 0 | Balance momentum with structure |
| 2026-01-15 | POC scope: PRD-to-Architecture | Validates core integration before full build |
| 2026-01-15 | Fork/rewrite strategy | Clean implementation with BMAD at core |

---

## Open Questions

1. How does OpenCode.ai handle long-running autonomous sessions?
2. Can BMAD workflow state be persisted across session boundaries?
3. What's the optimal mapping between BMAD personas and execution agents?
4. How do we handle breakthrough recovery in autonomous mode?

---

## References

- Auto-Claude Repository: `/home/hafiz/git/github.com/fairyhunter13/Auto-Claude`
- BMAD Core: `_bmad/core/`
- BMAD Agents: `_bmad/bmm/agents/`, `_bmad/bmb/agents/`, `_bmad/cis/agents/`
- OpenCode.ai: https://opencode.ai
