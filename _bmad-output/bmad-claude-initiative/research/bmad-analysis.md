# BMAD System Architecture Analysis

**Research Report for BMAD-Claude Integration Initiative**

*Generated: 2026-01-15*
*Repository: Auto-Claude*
*BMAD Version: 6.0.0-alpha.23*

---

## Executive Summary

BMAD (BMad Method Agent Design) is a comprehensive multi-agent workflow orchestration framework for AI-assisted software development. It provides a structured approach to product development through specialized agent personas, workflow execution engines, and a micro-file architecture for disciplined task execution.

The system is organized into modules (core, bmm, bmb, cis), each containing agents, workflows, templates, and configurations that work together to guide projects from ideation through implementation.

---

## Table of Contents

1. [Core Configuration System](#1-core-configuration-system)
2. [Module Architecture](#2-module-architecture)
3. [Workflow System](#3-workflow-system)
4. [Agent System](#4-agent-system)
5. [Planning Workflows](#5-planning-workflows)
6. [Implementation Workflows](#6-implementation-workflows)
7. [State Machine Analysis](#7-state-machine-analysis)
8. [Templates and Checklists](#8-templates-and-checklists)
9. [Recovery and Breakthrough Mechanisms](#9-recovery-and-breakthrough-mechanisms)
10. [Integration Points for Automation](#10-integration-points-for-automation)

---

## 1. Core Configuration System

### 1.1 Configuration File Structure

BMAD uses a hierarchical YAML-based configuration system with module-specific configs:

| File Path | Purpose |
|-----------|---------|
| `_bmad/core/config.yaml` | Global settings (user_name, language, output_folder) |
| `_bmad/bmm/config.yaml` | BMM module settings (project_name, planning_artifacts, etc.) |
| `_bmad/cis/config.yaml` | Creative & Innovation module settings |
| `_bmad/bmb/config.yaml` | BMAD Builder module settings |
| `_bmad/_memory/config.yaml` | Memory system configuration |

### 1.2 Core Configuration Variables

```yaml
# _bmad/core/config.yaml
user_name: "{user}"              # User's name for personalization
communication_language: English  # Agent communication language
document_output_language: English # Document output language
output_folder: "{project-root}/_bmad-output"
```

### 1.3 BMM Module Configuration

```yaml
# _bmad/bmm/config.yaml
project_name: "{project}"
user_skill_level: intermediate   # beginner/intermediate/expert
planning_artifacts: "{project-root}/_bmad-output/planning-artifacts"
implementation_artifacts: "{project-root}/_bmad-output/implementation-artifacts"
project_knowledge: "{project-root}/docs"
```

### 1.4 Variable Resolution

The system supports dynamic variable resolution:
- `{project-root}` - Project root directory
- `{installed_path}` - Path where workflow is installed
- `{config_source}:variable` - Variable from config file
- `{{date}}` - System-generated current datetime
- `{user_name}`, `{project_name}` - From loaded config

---

## 2. Module Architecture

BMAD is organized into four primary modules:

### 2.1 Core Module (`_bmad/core/`)

The foundational module providing:
- **bmad-master agent** - Master orchestrator and workflow executor
- **workflow.xml** - Core workflow execution engine
- **Tasks** - Reusable operations (shard-doc, index-docs, review-adversarial)
- **Party Mode** - Multi-agent conversation orchestration
- **Brainstorming** - Creative ideation workflows

### 2.2 BMM Module (`_bmad/bmm/`) - BMad Method

The primary development methodology module:
- **Agents**: PM, Architect, SM, Dev, Tea, Analyst, UX Designer, Tech Writer
- **Workflows**: PRD, Architecture, Epics/Stories, Sprint Planning, Dev Story
- **Phase Structure**: Analysis -> Planning -> Solutioning -> Implementation

### 2.3 BMB Module (`_bmad/bmb/`) - BMad Builder

Meta-module for building BMAD components:
- **Agent Builder** - Creates new agent personas
- **Workflow Builder** - Creates new workflows
- **Module Builder** - Creates entire modules

### 2.4 CIS Module (`_bmad/cis/`) - Creative & Innovation

Creative thinking and problem-solving module:
- **Agents**: Brainstorming Coach, Design Thinking Coach, Storyteller, Innovation Strategist
- **Workflows**: Problem-solving, Design Thinking, Storytelling, Innovation Strategy

---

## 3. Workflow System

### 3.1 Workflow Execution Engine

The core workflow engine (`_bmad/core/tasks/workflow.xml`) is the "OS" for all BMAD workflows.

**Key Mandates:**
1. Always read COMPLETE files - never use offset/limit on workflow files
2. Instructions are MANDATORY - either as file path, steps, or embedded list
3. Execute ALL steps IN EXACT ORDER
4. Save to template output file after EVERY "template-output" tag
5. NEVER skip a step

### 3.2 Workflow Types

| Type | Description | Output |
|------|-------------|--------|
| Template Workflow | Produces a document from template | Markdown file |
| Action Workflow | Performs operations without document output | Status/changes |
| Tri-Modal Workflow | Create/Validate/Edit modes | Mode-dependent |
| Quad-Modal Workflow | Brief/Create/Validate/Edit modes | Mode-dependent |

### 3.3 Workflow Architecture Patterns

#### Step-File (Micro-File) Architecture

BMAD's signature pattern for disciplined execution:

```
workflow.md (entry point)
  -> steps/step-01-init.md
  -> steps/step-01b-continue.md (continuation handler)
  -> steps/step-02-discovery.md
  -> steps/step-03-...
  -> steps/step-N-complete.md
```

**Core Principles:**
- **Just-In-Time Loading**: Only current step file in memory
- **Sequential Enforcement**: No skipping or optimization
- **State Tracking**: Progress tracked in frontmatter `stepsCompleted` array
- **Append-Only Building**: Documents built incrementally

### 3.4 Complete Workflow Inventory

#### Core Workflows
| Name | Path | Description |
|------|------|-------------|
| brainstorming | `core/workflows/brainstorming/workflow.md` | Creative ideation sessions |
| party-mode | `core/workflows/party-mode/workflow.md` | Multi-agent discussions |

#### BMM Analysis Phase (Phase 1 - Optional)
| Name | Path | Agent | Description |
|------|------|-------|-------------|
| create-product-brief | `bmm/workflows/1-analysis/create-product-brief/workflow.md` | analyst | Comprehensive product briefs |
| research | `bmm/workflows/1-analysis/research/workflow.md` | analyst | Market/Technical/Domain research |

#### BMM Planning Phase (Phase 2)
| Name | Path | Agent | Description |
|------|------|-------|-------------|
| prd | `bmm/workflows/2-plan-workflows/prd/workflow.md` | pm | PRD creation (tri-modal) |
| create-ux-design | `bmm/workflows/2-plan-workflows/create-ux-design/workflow.md` | ux-designer | UX design specification |

#### BMM Solutioning Phase (Phase 3)
| Name | Path | Agent | Description |
|------|------|-------|-------------|
| create-architecture | `bmm/workflows/3-solutioning/create-architecture/workflow.md` | architect | System architecture |
| create-epics-and-stories | `bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md` | pm | Epic/story breakdown |
| check-implementation-readiness | `bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md` | architect | Gate validation |

#### BMM Implementation Phase (Phase 4)
| Name | Path | Agent | Description |
|------|------|-------|-------------|
| sprint-planning | `bmm/workflows/4-implementation/sprint-planning/workflow.yaml` | sm | Sprint planning |
| create-story | `bmm/workflows/4-implementation/create-story/workflow.yaml` | sm | Story preparation |
| dev-story | `bmm/workflows/4-implementation/dev-story/workflow.yaml` | dev | Story implementation |
| code-review | `bmm/workflows/4-implementation/code-review/workflow.yaml` | dev | Adversarial code review |
| correct-course | `bmm/workflows/4-implementation/correct-course/workflow.yaml` | sm/pm | Sprint change management |
| retrospective | `bmm/workflows/4-implementation/retrospective/workflow.yaml` | sm | Post-epic review |
| sprint-status | `bmm/workflows/4-implementation/sprint-status/workflow.yaml` | sm | Status tracking |

#### BMM Quick-Flow Workflows
| Name | Path | Agent | Description |
|------|------|-------|-------------|
| quick-spec | `bmm/workflows/bmad-quick-flow/quick-spec/workflow.md` | quick-flow-solo-dev | Rapid tech spec |
| quick-dev | `bmm/workflows/bmad-quick-flow/quick-dev/workflow.md` | quick-flow-solo-dev | Rapid implementation |

#### BMM Supporting Workflows
| Name | Path | Description |
|------|------|-------------|
| document-project | `bmm/workflows/document-project/workflow.yaml` | Brownfield project documentation |
| generate-project-context | `bmm/workflows/generate-project-context/workflow.md` | Create project-context.md |
| workflow-init | `bmm/workflows/workflow-status/init/workflow.yaml` | Initialize BMM project |
| workflow-status | `bmm/workflows/workflow-status/workflow.yaml` | Status tracking |

#### BMM TestArch Workflows
| Name | Path | Description |
|------|------|-------------|
| testarch-atdd | `bmm/workflows/testarch/atdd/workflow.yaml` | ATDD test generation |
| testarch-automate | `bmm/workflows/testarch/automate/workflow.yaml` | Test automation expansion |
| testarch-ci | `bmm/workflows/testarch/ci/workflow.yaml` | CI/CD pipeline scaffolding |
| testarch-framework | `bmm/workflows/testarch/framework/workflow.yaml` | Test framework setup |
| testarch-nfr | `bmm/workflows/testarch/nfr-assess/workflow.yaml` | NFR assessment |
| testarch-test-design | `bmm/workflows/testarch/test-design/workflow.yaml` | Test planning |
| testarch-test-review | `bmm/workflows/testarch/test-review/workflow.yaml` | Test quality review |
| testarch-trace | `bmm/workflows/testarch/trace/workflow.yaml` | Requirements traceability |

#### CIS Workflows
| Name | Path | Description |
|------|------|-------------|
| design-thinking | `cis/workflows/design-thinking/workflow.yaml` | Human-centered design |
| innovation-strategy | `cis/workflows/innovation-strategy/workflow.yaml` | Business model innovation |
| problem-solving | `cis/workflows/problem-solving/workflow.yaml` | Systematic problem-solving |
| storytelling | `cis/workflows/storytelling/workflow.yaml` | Narrative development |

#### BMB Workflows
| Name | Path | Description |
|------|------|-------------|
| agent | `bmb/workflows/agent/workflow.md` | Agent creation (tri-modal) |
| module | `bmb/workflows/module/workflow.md` | Module creation (quad-modal) |
| workflow | `bmb/workflows/workflow/workflow.md` | Workflow creation (tri-modal) |

---

## 4. Agent System

### 4.1 Agent Manifest Structure

Agents are defined in `_bmad/_config/agent-manifest.csv` with the following fields:

| Field | Description |
|-------|-------------|
| name | Agent identifier (e.g., "pm", "architect") |
| displayName | Persona name (e.g., "John", "Winston") |
| title | Formal role title |
| icon | Visual identifier emoji |
| role | Capabilities summary |
| identity | Background/expertise description |
| communicationStyle | How the agent communicates |
| principles | Decision-making philosophy |
| module | Source module (core/bmm/bmb/cis) |
| path | Path to agent file |

### 4.2 Agent Persona Definition

Each agent file (`_bmad/{module}/agents/{name}.md`) contains an XML-based persona definition:

```xml
<agent id="pm.agent.yaml" name="John" title="Product Manager" icon="...">
  <activation critical="MANDATORY">
    <step n="1">Load persona from this current agent file</step>
    <step n="2">Load config.yaml and store variables</step>
    <step n="3">Show greeting and display menu</step>
    <step n="4">Wait for user input</step>
    <step n="5">Handle menu selection</step>
    <menu-handlers>...</menu-handlers>
    <rules>...</rules>
  </activation>
  
  <persona>
    <role>Product Manager specializing in...</role>
    <identity>Product management veteran with 8+ years...</identity>
    <communication_style>Asks 'WHY?' relentlessly...</communication_style>
    <principles>Channel expert product manager thinking...</principles>
  </persona>
  
  <menu>
    <item cmd="CP" exec="...">Create PRD</item>
    <item cmd="VP" exec="...">Validate PRD</item>
    ...
  </menu>
</agent>
```

### 4.3 Complete Agent Inventory

#### Core Agents
| Name | Display | Role | Module |
|------|---------|------|--------|
| bmad-master | BMad Master | Master Orchestrator & Knowledge Custodian | core |

#### BMM Agents
| Name | Display | Role | Module |
|------|---------|------|--------|
| analyst | Mary | Strategic Business Analyst | bmm |
| architect | Winston | System Architect & Technical Design Leader | bmm |
| dev | Amelia | Senior Software Engineer | bmm |
| pm | John | Product Manager | bmm |
| sm | Bob | Technical Scrum Master | bmm |
| tea | Murat | Master Test Architect | bmm |
| tech-writer | Paige | Technical Documentation Specialist | bmm |
| ux-designer | Sally | User Experience Designer | bmm |
| quick-flow-solo-dev | Barry | Elite Full-Stack Developer | bmm |

#### CIS Agents
| Name | Display | Role | Module |
|------|---------|------|--------|
| brainstorming-coach | Carson | Master Brainstorming Facilitator | cis |
| creative-problem-solver | Dr. Quinn | Systematic Problem-Solving Expert | cis |
| design-thinking-coach | Maya | Human-Centered Design Expert | cis |
| innovation-strategist | Victor | Business Model Innovator | cis |
| presentation-master | Caravaggio | Visual Communication Expert | cis |
| storyteller | Sophia | Master Storyteller | cis |

#### BMB Agents
| Name | Display | Role | Module |
|------|---------|------|--------|
| agent-builder | Bond | Agent Architecture Specialist | bmb |
| module-builder | Morgan | Module Creation Master | bmb |
| workflow-builder | Wendy | Workflow Architecture Specialist | bmb |

### 4.4 Agent Activation Protocol

1. **Load persona** from agent file
2. **Load config** from module config.yaml
3. **Store session variables**: user_name, communication_language, output_folder
4. **Verify config loaded** - halt on failure
5. **Display greeting** with user_name and numbered menu
6. **Wait for input** - never auto-execute
7. **Handle selection**: Number -> menu item | Text -> fuzzy match | Multiple -> clarify

### 4.5 Menu Handler Types

| Handler Type | Behavior |
|--------------|----------|
| `workflow="path"` | Load workflow.xml, pass path as workflow-config |
| `exec="path"` | Load and execute the file directly |
| `action="text"` | Execute inline instruction or find prompt by id |
| `data="path"` | Load data file before handler execution |

---

## 5. Planning Workflows

### 5.1 Full Planning Phase Sequence

The BMad Method follows a structured phase sequence:

```
Phase 1: Analysis (Optional)
  -> Brainstorming (optional)
  -> Research (optional)
  -> Product Brief (recommended for greenfield)

Phase 2: Planning (Required)
  -> PRD Creation [PM Agent]
  -> UX Design (conditional: if_has_ui) [UX Designer Agent]

Phase 3: Solutioning (Required)
  -> Architecture [Architect Agent]
  -> Epics & Stories [PM Agent]
  -> Test Design (optional) [TEA Agent]
  -> Implementation Readiness [Architect Agent]

Phase 4: Implementation (Required)
  -> Sprint Planning [SM Agent]
  -> Create Story -> Dev Story -> Code Review (cycle)
  -> Retrospective (after epic completion)
```

### 5.2 PRD Workflow (PM Agent)

**Path:** `_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md`

**Modes:**
- **Create Mode**: steps-c/ (12 steps)
- **Validate Mode**: steps-v/ (13 validation steps)
- **Edit Mode**: steps-e/ (4 steps)

**Create Mode Steps:**
1. `step-01-init.md` - Workflow initialization
2. `step-01b-continue.md` - Continuation handler
3. `step-02-discovery.md` - Project discovery
4. `step-03-success.md` - Success criteria
5. `step-04-journeys.md` - User journeys
6. `step-05-domain.md` - Domain analysis
7. `step-06-innovation.md` - Innovation opportunities
8. `step-07-project-type.md` - Project classification
9. `step-08-scoping.md` - MVP scoping
10. `step-09-functional.md` - Functional requirements
11. `step-10-nonfunctional.md` - Non-functional requirements
12. `step-11-polish.md` - Document polish
13. `step-12-complete.md` - Completion

**Input Discovery:**
- Product briefs (`*brief*.md`)
- Research documents (`*research*.md`)
- Project documentation (`docs/`)
- Project context (`**/project-context.md`)

### 5.3 Architecture Workflow (Architect Agent)

**Path:** `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`

**Steps:**
1. `step-01-init.md` - Initialize and discover inputs
2. `step-01b-continue.md` - Continuation handler
3. `step-02-context.md` - Context gathering
4. `step-03-starter.md` - Architecture starter decisions
5. `step-04-decisions.md` - Core architectural decisions
6. `step-05-patterns.md` - Design patterns
7. `step-06-structure.md` - System structure
8. `step-07-validation.md` - Architecture validation
9. `step-08-complete.md` - Completion

**Inputs:**
- PRD (required)
- UX Design (if available)
- Project context

### 5.4 Epics & Stories Workflow (PM Agent)

**Path:** `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`

**Prerequisites:**
- Completed PRD (required)
- Completed Architecture (required)
- UX Design (recommended if UI exists)

**Steps:**
1. `step-01-validate-prerequisites.md` - Validate inputs exist
2. `step-02-design-epics.md` - Epic design
3. `step-03-create-stories.md` - Story creation with BDD
4. `step-04-final-validation.md` - Validate completeness

**Output:** `{planning_artifacts}/epics.md`

### 5.5 Implementation Readiness (Gate Check)

**Path:** `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`

**Steps:**
1. Document Discovery
2. PRD Analysis
3. Epic Coverage Validation
4. UX Alignment
5. Epic Quality Review
6. Final Assessment

**Output:** Readiness report with PASS/CONCERNS/FAIL/WAIVED decision

---

## 6. Implementation Workflows

### 6.1 Sprint Planning (SM Agent)

**Path:** `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml`

**Purpose:** Generate sprint-status.yaml from epic files

**Output:** `{implementation_artifacts}/sprint-status.yaml`

### 6.2 Create Story (SM Agent)

**Path:** `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`

**Purpose:** Prepare developer-ready stories from epics

**Inputs:**
- sprint-status.yaml
- epics.md
- PRD, Architecture, UX (fallback)

**Output:** `{implementation_artifacts}/{story_key}.md`

### 6.3 Dev Story (Dev Agent)

**Path:** `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`

**Purpose:** Execute story implementation with test-driven development

**Principles:**
- Story file is single source of truth
- Red-green-refactor cycle
- All existing tests must pass
- Every task covered by unit tests

### 6.4 Code Review (Adversarial)

**Path:** `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`

**Purpose:** Adversarial code review finding 3-10 specific problems

**Focus Areas:**
- Code quality
- Test coverage
- Architecture compliance
- Security
- Performance

---

## 7. State Machine Analysis

### 7.1 Workflow Status Tracking

**Location:** `_bmad/bmm/workflows/workflow-status/`

**Status File:** `{planning_artifacts}/bmm-workflow-status.yaml`

**Status Values:**
| Status | Meaning |
|--------|---------|
| `required` | Must be completed to progress |
| `optional` | Can be skipped |
| `recommended` | Strongly suggested |
| `conditional` | Required if condition met |
| `{file-path}` | Completed, file created |
| `skipped` | Explicitly skipped |

### 7.2 Project Level Classification

**Location:** `_bmad/bmm/workflows/workflow-status/project-levels.yaml`

| Level | Name | Stories | Description |
|-------|------|---------|-------------|
| 0 | Single Atomic Change | 1 | Bug fix, tiny feature |
| 1 | Small Feature | 1-10 | Minimal documentation |
| 2 | Medium Project | 5-15 | Focused PRD |
| 3 | Complex System | 12-40 | Full architecture |
| 4 | Enterprise Scale | 40+ | Multiple products |

### 7.3 Workflow Path Definitions

**Greenfield Path:** `method-greenfield.yaml`
```
Phase 1: Analysis (Optional)
  - brainstorm-project (optional)
  - research (optional)
  - product-brief (optional)

Phase 2: Planning (Required)
  - prd (required)
  - create-ux-design (conditional: if_has_ui)

Phase 3: Solutioning (Required)
  - create-architecture (required)
  - create-epics-and-stories (required)
  - test-design (optional)
  - implementation-readiness (required)

Phase 4: Implementation (Required)
  - sprint-planning (required)
  - [create-story -> dev-story -> code-review cycle]
```

**Brownfield Path:** `method-brownfield.yaml`
- Includes document-project workflow for existing codebase analysis

### 7.4 Step Execution State Machine

```
[workflow.md: Entry Point]
        |
        v
[Step N: Load & Execute]
        |
        +--- Check frontmatter for stepsCompleted
        |
        +--- If step-Nb-continue exists, check for continuation
        |
        v
[Execute Step Content]
        |
        +--- Handle <ask> tags -> WAIT for user
        |
        +--- Handle <template-output> -> Save & WAIT
        |
        v
[Step Complete]
        |
        +--- Update stepsCompleted in frontmatter
        |
        +--- User selects [C]ontinue
        |
        v
[Load Next Step]
```

### 7.5 Execution Modes

| Mode | Description |
|------|-------------|
| `normal` | Full user interaction at every step |
| `yolo` | Skip confirmations, auto-generate with simulated expert user |

---

## 8. Templates and Checklists

### 8.1 Template Inventory

#### PRD Templates
| Template | Path |
|----------|------|
| PRD Template | `bmm/workflows/2-plan-workflows/prd/templates/prd-template.md` |

#### Architecture Templates
| Template | Path |
|----------|------|
| Architecture Decision Template | `bmm/workflows/3-solutioning/create-architecture/architecture-decision-template.md` |

#### Epic/Story Templates
| Template | Path |
|----------|------|
| Epics Template | `bmm/workflows/3-solutioning/create-epics-and-stories/templates/epics-template.md` |
| Story Template | `bmm/workflows/4-implementation/create-story/template.md` |

#### Other Templates
| Template | Path |
|----------|------|
| Product Brief | `bmm/workflows/1-analysis/create-product-brief/product-brief.template.md` |
| Research Template | `bmm/workflows/1-analysis/research/research.template.md` |
| Project Context | `bmm/workflows/generate-project-context/project-context-template.md` |
| Readiness Report | `bmm/workflows/3-solutioning/check-implementation-readiness/templates/readiness-report-template.md` |
| Sprint Status | `bmm/workflows/4-implementation/sprint-planning/sprint-status-template.yaml` |

### 8.2 Checklist Inventory

Checklists provide validation criteria for workflow outputs:

| Checklist | Path | Purpose |
|-----------|------|---------|
| Code Review | `bmm/workflows/4-implementation/code-review/checklist.md` | Adversarial review criteria |
| Correct Course | `bmm/workflows/4-implementation/correct-course/checklist.md` | Change impact analysis |
| Create Story | `bmm/workflows/4-implementation/create-story/checklist.md` | Story quality competition |
| Dev Story | `bmm/workflows/4-implementation/dev-story/checklist.md` | Implementation validation |
| Sprint Planning | `bmm/workflows/4-implementation/sprint-planning/checklist.md` | Sprint setup validation |
| Document Project | `bmm/workflows/document-project/checklist.md` | Documentation completeness |
| TestArch (various) | `bmm/workflows/testarch/*/checklist.md` | Test quality validation |

### 8.3 Template Usage Pattern

Templates are used via workflow.yaml configuration:

```yaml
template: "{installed_path}/templates/prd-template.md"
default_output_file: "{planning_artifacts}/prd.md"
```

The workflow engine copies the template to output location and fills placeholders through step execution.

---

## 9. Recovery and Breakthrough Mechanisms

### 9.1 Correct-Course Workflow (Recovery)

**Path:** `_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`

**Purpose:** Navigate significant changes during sprint execution

**Trigger Conditions:**
- Implementation off-track
- Requirements change discovered
- Technical blockers encountered
- Scope creep identified

**Process:**
1. Initialize change trigger and gather description
2. Discover and load project documents
3. Execute change analysis checklist
4. Draft specific change proposals (incremental or batch)
5. Generate Sprint Change Proposal
6. Route for implementation based on scope

**Change Scope Classification:**
| Scope | Action | Route To |
|-------|--------|----------|
| Minor | Direct implementation | Dev team |
| Moderate | Backlog reorganization | PO/SM |
| Major | Fundamental replan | PM/Architect |

### 9.2 Continuation Handling (Stuck State Recovery)

Every workflow with step-file architecture includes continuation handlers:

**Pattern:** `step-01b-continue.md`

**Detection:**
```markdown
If document exists AND has frontmatter with stepsCompleted 
   AND step-N-complete NOT in list:
   -> Load step-01b-continue.md
   -> Resume from last completed step
```

**Continuation Protocol:**
1. Analyze frontmatter `stepsCompleted` array
2. Identify last completed step
3. Load next step in sequence
4. Continue execution

### 9.3 Advanced Elicitation (Breakthrough)

**Path:** `_bmad/core/workflows/advanced-elicitation/workflow.xml`

**Available at:** Every `<template-output>` checkpoint

**Menu Options:**
- `[a]` Advanced Elicitation - Deep-dive questioning
- `[c]` Continue - Proceed to next step
- `[p]` Party-Mode - Multi-agent discussion
- `[y]` YOLO - Auto-complete remaining workflow

### 9.4 Party Mode (Collaborative Problem-Solving)

**Path:** `_bmad/core/workflows/party-mode/workflow.md`

**Purpose:** Orchestrate multi-agent discussions when stuck

**Process:**
1. Load agent manifest
2. Select 2-3 relevant agents based on topic
3. Orchestrate conversation with role-playing
4. Maintain personality consistency
5. Handle inter-agent and user questions
6. Exit gracefully on trigger words

### 9.5 Adversarial Review (Quality Breakthrough)

**Path:** `_bmad/core/tasks/review-adversarial-general.xml`

**Purpose:** Cynical content review to find gaps

**Used In:**
- PRD Validation
- Architecture Validation
- Code Review
- Story Quality Competition

---

## 10. Integration Points for Automation

### 10.1 Workflow Invocation

**Command Pattern:**
```bash
# From IDE command palette or terminal
/bmad:bmm:workflows:prd          # Create PRD
/bmad:bmm:workflows:architecture # Create Architecture
/bmad:bmm:workflows:create-story # Create Story
```

**Programmatic Invocation:**
```python
# Load workflow.xml runner
runner = load_workflow_xml()

# Execute specific workflow
runner.execute(
    workflow_config="path/to/workflow.yaml",
    variables={
        "project_root": "/path/to/project",
        "user_name": "Developer"
    }
)
```

### 10.2 Agent Activation Points

**Menu-Based Activation:**
```xml
<item cmd="CP" exec="{path}/prd/workflow.md">[CP] Create PRD</item>
```

**Direct Workflow Execution:**
```xml
<item cmd="SP" workflow="{path}/sprint-planning/workflow.yaml">[SP] Sprint Planning</item>
```

### 10.3 Input/Output Contract

**Standard Inputs:**
```yaml
input_file_patterns:
  prd:
    whole: "{planning_artifacts}/*prd*.md"
    sharded: "{planning_artifacts}/*prd*/*.md"
    load_strategy: "FULL_LOAD"  # or SELECTIVE_LOAD, INDEX_GUIDED
```

**Standard Outputs:**
```yaml
default_output_file: "{planning_artifacts}/prd.md"
```

### 10.4 State File Locations

| File | Location | Purpose |
|------|----------|---------|
| Workflow Status | `{planning_artifacts}/bmm-workflow-status.yaml` | Phase tracking |
| Sprint Status | `{implementation_artifacts}/sprint-status.yaml` | Sprint tracking |
| Story Files | `{implementation_artifacts}/{story_key}.md` | Story state |

### 10.5 Manifest Files for Discovery

| Manifest | Location | Purpose |
|----------|----------|---------|
| Agent Manifest | `_bmad/_config/agent-manifest.csv` | Agent discovery |
| Workflow Manifest | `_bmad/_config/workflow-manifest.csv` | Workflow discovery |
| Task Manifest | `_bmad/_config/task-manifest.csv` | Task discovery |
| Files Manifest | `_bmad/_config/files-manifest.csv` | All files with hashes |
| Tool Manifest | `_bmad/_config/tool-manifest.csv` | Available tools |

### 10.6 Integration Hooks

**Pre-Workflow:**
1. Load config from `{module}/config.yaml`
2. Resolve all variables
3. Discover input documents via `discover_inputs` protocol

**Post-Workflow:**
1. Update status in workflow-status.yaml
2. Save output to default_output_file
3. Update sprint-status.yaml if implementation phase

**Checkpoint Hooks (template-output):**
1. Save current content
2. Offer elicitation/party-mode/yolo options
3. Wait for user decision

---

## Appendix A: Key File Paths Reference

### Configuration Files
```
_bmad/core/config.yaml           # Core config
_bmad/bmm/config.yaml            # BMM config
_bmad/cis/config.yaml            # CIS config
_bmad/bmb/config.yaml            # BMB config
_bmad/_config/agent-manifest.csv # Agent registry
_bmad/_config/workflow-manifest.csv # Workflow registry
```

### Core Engine Files
```
_bmad/core/tasks/workflow.xml    # Workflow execution engine
_bmad/core/agents/bmad-master.md # Master orchestrator
```

### Primary Workflow Files
```
_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md
_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md
_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md
_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml
_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml
_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml
```

### Output Locations
```
_bmad-output/                    # Default output root
_bmad-output/planning-artifacts/ # PRD, Architecture, Epics
_bmad-output/implementation-artifacts/ # Stories, Sprint status
```

---

## Appendix B: Workflow Execution Quick Reference

### Starting a New Project
1. Initialize: `/bmad:bmm:workflows:workflow-init`
2. Create PRD: PM Agent -> [CP] Create PRD
3. Create Architecture: Architect Agent -> [CA] Create Architecture
4. Create Stories: PM Agent -> [ES] Create Epics and Stories
5. Gate Check: Architect Agent -> [IR] Implementation Readiness

### Sprint Execution Cycle
1. Sprint Planning: SM Agent -> [SP] Sprint Planning
2. Create Story: SM Agent -> [CS] Create Story
3. Dev Story: Dev Agent -> [DS] Dev Story
4. Code Review: Dev Agent -> [CR] Code Review
5. Repeat steps 2-4 for each story

### Recovery Actions
- Off-track: SM/PM Agent -> [CC] Correct Course
- Stuck on section: Select [a] Advanced Elicitation
- Need discussion: Select [p] Party Mode
- Auto-complete: Select [y] YOLO mode

---

*End of BMAD System Architecture Analysis Report*
