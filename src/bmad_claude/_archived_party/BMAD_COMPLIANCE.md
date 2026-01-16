# BMAD Methodology Compliance

## Overview

Party Mode **strictly follows** the complete BMAD (BMad Method Agent Design) methodology as defined in `_bmad/bmm/workflows/`.

This document maps Party Mode implementation to BMAD workflows.

## BMAD 4-Phase Methodology

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BMAD METHODOLOGY - 4 PHASES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: ANALYSIS (Optional)                                               │
│  ├── create-product-brief workflow (6 steps)                                │
│  │   ├── step-01-init.md                                                    │
│  │   ├── step-02-vision.md                                                  │
│  │   ├── step-03-users.md                                                   │
│  │   ├── step-04-metrics.md                                                 │
│  │   ├── step-05-scope.md                                                   │
│  │   └── step-06-complete.md                                                │
│  │   └── Output: product-brief.md                                           │
│  │                                                                          │
│  └── research workflow (domain + market)                                    │
│      └── Output: research.md                                                │
│                                                                             │
│  PHASE 2: PLANNING (Required)                                               │
│  ├── prd workflow (12 steps)                                                │
│  │   ├── step-01-init.md                                                    │
│  │   ├── step-02-discovery.md                                               │
│  │   ├── step-03-success.md                                                 │
│  │   ├── step-04-journeys.md                                                │
│  │   ├── step-05-domain.md                                                  │
│  │   ├── step-06-innovation.md                                              │
│  │   ├── step-07-project-type.md                                            │
│  │   ├── step-08-scoping.md                                                 │
│  │   ├── step-09-functional.md                                              │
│  │   ├── step-10-nonfunctional.md                                           │
│  │   ├── step-11-polish.md                                                  │
│  │   └── step-12-complete.md                                                │
│  │   └── Output: prd.md                                                     │
│  │                                                                          │
│  └── create-ux-design workflow (conditional - if UI exists)                 │
│      └── Output: ux-design.md                                               │
│                                                                             │
│  PHASE 3: SOLUTIONING (Required)                                            │
│  ├── create-architecture workflow                                           │
│  │   └── Output: architecture.md                                            │
│  │                                                                          │
│  ├── create-epics-and-stories workflow                                      │
│  │   └── Output: epics/index.md, epics/epic-*.md                           │
│  │                                                                          │
│  └── check-implementation-readiness workflow (GATE CHECK)                   │
│      └── Output: readiness-report.md                                        │
│                                                                             │
│  PHASE 4: IMPLEMENTATION (Required)                                         │
│  ├── sprint-planning workflow                                               │
│  │   └── Output: sprint-status.yaml                                         │
│  │                                                                          │
│  ├── create-story workflow (per story)                                      │
│  │   └── Output: stories/{story-id}.md                                      │
│  │                                                                          │
│  ├── dev-story workflow (per story)                                         │
│  │   └── Updates: stories/{story-id}.md                                     │
│  │                                                                          │
│  ├── code-review workflow (per story)                                       │
│  │   └── Output: review-{story-id}.md                                       │
│  │                                                                          │
│  ├── correct-course workflow (as needed)                                    │
│  │   └── Output: correction-log.md                                          │
│  │                                                                          │
│  └── retrospective workflow (per sprint)                                    │
│      └── Output: retrospective-{sprint}.md                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Party Mode Topic → BMAD Workflow Mapping

### Phase 1: Analysis (Optional)

| Party Mode Topic | BMAD Workflow | Steps | Lead Agent |
|------------------|---------------|-------|------------|
| Product Brief | create-product-brief | 6 | Analyst |
| Research | research | 6 | Analyst |

### Phase 2: Planning

| Party Mode Topic | BMAD Workflow Step | Lead Agent |
|------------------|-------------------|------------|
| Product Vision | prd/step-02-discovery | PM |
| Target Users | prd/step-04-journeys | PM |
| Success Metrics | prd/step-03-success | PM |
| Domain Analysis | prd/step-05-domain | Analyst |
| Innovation | prd/step-06-innovation | PM |
| MVP Scope | prd/step-08-scoping | PM |
| Functional Reqs | prd/step-09-functional | PM |
| Non-Functional Reqs | prd/step-10-nonfunctional | Architect |
| UX Design | create-ux-design | UX Designer |

### Phase 3: Solutioning

| Party Mode Topic | BMAD Workflow | Lead Agent |
|------------------|---------------|------------|
| System Architecture | create-architecture | Architect |
| Technology Stack | create-architecture/step-02 | Architect |
| Data Architecture | create-architecture/step-03 | Architect |
| Security | create-architecture/step-05 | Architect |
| Epic Breakdown | create-epics-and-stories | PM |
| Gate Check | check-implementation-readiness | Architect |

### Phase 4: Implementation

| Party Mode Topic | BMAD Workflow | Lead Agent |
|------------------|---------------|------------|
| Sprint Planning | sprint-planning | SM |
| Story Creation | create-story | SM |
| Development | dev-story | Dev |
| Code Review | code-review | Dev |
| Retrospective | retrospective | SM |

## Agent Responsibilities Per Phase

| Phase | Lead Agent | Supporting Agents |
|-------|------------|-------------------|
| Analysis | Analyst (Mary) | PM (John) |
| Planning | PM (John) | Analyst, UX Designer, Architect |
| Solutioning | Architect (Winston) | PM, Dev, TEA |
| Implementation | SM (Bob) | Dev (Amelia), PM |

## Gate Checks

Before transitioning between phases, these gate checks must pass:

1. **Planning → Solutioning**
   - PRD complete with all 12 sections
   - Success metrics defined
   - Scope clearly bounded

2. **Solutioning → Implementation**
   - Architecture decisions documented
   - Epics and stories created
   - Implementation readiness check passed
   - All artifacts aligned

## Artifact Output Locations

All artifacts are saved to `_bmad-output/`:

```
_bmad-output/
├── planning-artifacts/
│   ├── product-brief.md      # Phase 1 (optional)
│   ├── research.md           # Phase 1 (optional)
│   ├── prd.md                # Phase 2
│   ├── ux-design.md          # Phase 2 (if UI)
│   ├── architecture.md       # Phase 3
│   ├── readiness-report.md   # Phase 3 (gate check)
│   └── epics/                # Phase 3
│       ├── index.md
│       ├── epic-1.md
│       └── ...
└── implementation-artifacts/
    ├── sprint-status.yaml    # Phase 4
    ├── stories/              # Phase 4
    │   ├── 1-1-story.md
    │   └── ...
    └── retrospectives/       # Phase 4
        └── sprint-1.md
```

## Workflow Execution Rules

Party Mode follows BMAD workflow execution rules:

1. **Sequential Enforcement**: Steps executed in order, no skipping
2. **State Tracking**: Progress tracked in `stepsCompleted`
3. **Append-Only Building**: Documents built incrementally
4. **Gate Checks**: Must pass before phase transitions
5. **Template Usage**: Artifacts follow BMAD templates
6. **Configuration Loading**: Uses `_bmad/bmm/config.yaml`

## Validation

Party Mode validates BMAD compliance by:

1. Checking all required topics are covered per phase
2. Ensuring decisions are captured for key topics
3. Verifying artifacts are created
4. Confirming gate checks pass before transitions

## Testing

All tests use **real OpenCode calls** - no mocks allowed.

See `TESTING.md` for testing policy.
