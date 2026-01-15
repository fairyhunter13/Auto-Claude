# AGENTS.md - BMAD-Claude Project Rules

This project uses the **BMAD (BMad Method Agent Design)** framework for software development.
BMAD replaces Auto-Claude's previous workflow system with a structured methodology.

## BMAD Framework Location

All BMAD components are in `_bmad/`:

```
_bmad/
├── core/           # Core execution engine (workflow.xml)
├── bmm/            # BMad Method module
│   ├── agents/     # Agent personas (pm, architect, analyst, etc.)
│   ├── config.yaml # Project configuration
│   └── workflows/  # Phase workflows
│       ├── 1-analysis/      # Phase 1: Optional discovery
│       ├── 2-plan-workflows/ # Phase 2: Planning (PRD, UX)
│       ├── 3-solutioning/   # Phase 3: Architecture, Epics
│       ├── 4-implementation/ # Phase 4: Sprint planning
│       └── workflow-status/  # Status tracking
├── bmb/            # BMad Builder module
└── cis/            # Creative Innovation System
```

## BMAD Methodology - The 4 Phases

**CRITICAL:** Follow these phases in order. This is the BMAD Method.

### Phase 1: Analysis (Optional)
Discovery workflows for initial exploration.

| Workflow | Agent | Command | Output |
|----------|-------|---------|--------|
| brainstorm-project | analyst | `/bmad:bmm:workflows:brainstorming` | Ideation notes |
| research | analyst | `/bmad:bmm:workflows:research` | Research findings |
| product-brief | analyst | `/bmad:bmm:workflows:create-product-brief` | product-brief.md |

### Phase 2: Planning (Required)
Core planning documents.

| Workflow | Agent | Command | Output |
|----------|-------|---------|--------|
| prd | pm | `/bmad:bmm:workflows:create-prd` | prd.md |
| create-ux-design | ux-designer | `/bmad:bmm:workflows:create-ux-design` | ux-design.md (if has UI) |

### Phase 3: Solutioning (Required)
Technical design and breakdown.

| Workflow | Agent | Command | Output |
|----------|-------|---------|--------|
| create-architecture | architect | `/bmad:bmm:workflows:create-architecture` | architecture.md |
| create-epics-and-stories | pm | `/bmad:bmm:workflows:create-epics-and-stories` | epics/ directory |
| test-design | tea | `/bmad:bmm:workflows:test-design` | test-design.md (optional) |
| implementation-readiness | architect | `/bmad:bmm:workflows:implementation-readiness` | Gate check |

### Phase 4: Implementation (Required)
Sprint planning and development.

| Workflow | Agent | Command | Output |
|----------|-------|---------|--------|
| sprint-planning | sm | `/bmad:bmm:workflows:sprint-planning` | sprint-status.yaml |

Then: `create-story` → `dev-story` → `code-review` cycle

## Critical Rules

### 1. Workflow Execution Engine

**The workflow execution engine is: `_bmad/core/tasks/workflow.xml`**

When executing any BMAD workflow:
1. Load and follow `workflow.xml` mandates exactly
2. Execute ALL steps in instructions IN EXACT ORDER
3. Save to template output file after EVERY "template-output" tag
4. NEVER skip a step

### 2. Agent Activation

Each workflow must be executed by its designated agent:

```
1. Load agent file: _bmad/bmm/agents/<agent>.md
2. Follow activation sequence in agent file
3. Load config from: _bmad/bmm/config.yaml
4. Execute workflow via agent's menu command
```

| Agent ID | Name | Role |
|----------|------|------|
| pm | John | Product Manager - PRD, epics/stories |
| architect | Winston | Architect - System architecture, gate check |
| analyst | Mary | Business Analyst - Research, product brief |
| ux-designer | Sally | UX Designer - UX design |
| sm | Bob | Scrum Master - Sprint planning, story prep |
| dev | Amelia | Developer - Implementation |
| tea | Murat | Test Architect - Test design |

### 3. Status Tracking

Workflow status is tracked in: `_bmad-output/planning-artifacts/bmm-workflow-status.yaml`

Status values:
- `required` / `optional` / `conditional` - Pending
- `<file-path>` - Completed (e.g., `prd.md`)
- `skipped` - Explicitly skipped

### 4. YOLO Mode (Autonomous Execution)

For autonomous execution without user interaction:

```
When prompted for choices:
- Select the most sensible default
- For mode selection (Create/Validate/Edit), choose Create
- For continue prompts, always continue
- For confirmations, assume "yes"
```

At template-output checkpoints:
- In YOLO mode: Auto-continue to next step
- Simulate expert user responses

## Project Outputs

All BMAD outputs go to `_bmad-output/`:

```
_bmad-output/
├── planning-artifacts/
│   ├── bmm-workflow-status.yaml  # Status tracking
│   ├── prd.md                    # Product Requirements
│   ├── architecture.md           # System Architecture
│   ├── ux-design.md              # UX Design (if applicable)
│   └── epics/                    # Epics and stories
│       ├── index.md
│       ├── epic-1.md
│       └── ...
└── implementation-artifacts/
    ├── sprint-status.yaml        # Sprint tracking
    └── stories/                  # Individual story files
```

## Using BMAD-Claude CLI

The `bmad-claude` CLI automates BMAD workflow execution:

```bash
# Initialize a project
bmad-claude init "My Project"

# Check status
bmad-claude status

# Run all phases (2-4)
bmad-claude run

# Run specific phase
bmad-claude phase 2

# Run specific workflow
bmad-claude workflow prd

# List available workflows
bmad-claude list
```

## BMAD vs Auto-Claude

| Feature | Auto-Claude (Old) | BMAD (New) |
|---------|-------------------|------------|
| Methodology | Ad-hoc workflows | 4-phase structured method |
| Agents | Generic | Role-specific personas |
| Status | Basic tracking | Comprehensive workflow-status |
| Execution | Custom engine | workflow.xml standard |
| Outputs | Scattered | Organized in _bmad-output/ |

**BMAD completely replaces Auto-Claude's workflow system.**
