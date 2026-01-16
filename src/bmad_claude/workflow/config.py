"""
BMAD Workflow Configuration.

Defines all BMAD workflows, their agents, and commands.
Maps directly to _bmad/bmm/workflows/ structure.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkflowConfig:
    """Configuration for a BMAD workflow."""

    id: str
    name: str
    description: str
    agent: str  # OpenCode agent to use
    command: str  # BMAD command to invoke
    phase: str  # Which phase this belongs to
    artifact: str  # Output artifact path
    required: bool = True
    depends_on: list[str] = field(default_factory=list)  # Workflow dependencies


@dataclass
class PhaseConfig:
    """Configuration for a BMAD phase."""

    id: str
    name: str
    description: str
    workflows: list[str]  # Workflow IDs in execution order
    gate_check: str | None = None  # Required gate check workflow


# =============================================================================
# WORKFLOW DEFINITIONS
# =============================================================================

WORKFLOWS: dict[str, WorkflowConfig] = {
    # Phase 1: Analysis (Optional)
    "product-brief": WorkflowConfig(
        id="product-brief",
        name="Create Product Brief",
        description="Create comprehensive product brief through discovery",
        agent="analyst",
        command="/bmad:bmm:workflows:create-product-brief",
        phase="analysis",
        artifact="product-brief.md",
        required=False,
    ),
    "research": WorkflowConfig(
        id="research",
        name="Research",
        description="Conduct market or domain research",
        agent="analyst",
        command="/bmad:bmm:workflows:research",
        phase="analysis",
        artifact="research.md",
        required=False,
    ),
    # Phase 2: Planning (Required)
    "prd": WorkflowConfig(
        id="prd",
        name="Product Requirements Document",
        description="Create comprehensive PRD through 12-step workflow",
        agent="pm",
        command="/bmad:bmm:workflows:create-prd",
        phase="planning",
        artifact="prd.md",
        required=True,
    ),
    "ux-design": WorkflowConfig(
        id="ux-design",
        name="UX Design",
        description="Create UX design for products with UI",
        agent="ux-designer",
        command="/bmad:bmm:workflows:create-ux-design",
        phase="planning",
        artifact="ux-design.md",
        required=False,  # Only if product has UI
    ),
    # Phase 3: Solutioning (Required)
    "architecture": WorkflowConfig(
        id="architecture",
        name="Create Architecture",
        description="Architecture decisions through collaborative discovery",
        agent="architect",
        command="/bmad:bmm:workflows:create-architecture",
        phase="solutioning",
        artifact="architecture.md",
        required=True,
        depends_on=["prd"],
    ),
    "epics": WorkflowConfig(
        id="epics",
        name="Create Epics and Stories",
        description="Transform PRD into epics and user stories",
        agent="pm",
        command="/bmad:bmm:workflows:create-epics-and-stories",
        phase="solutioning",
        artifact="epics/index.md",
        required=True,
        depends_on=["prd", "architecture"],
    ),
    "implementation-readiness": WorkflowConfig(
        id="implementation-readiness",
        name="Implementation Readiness Check",
        description="Gate check before implementation begins",
        agent="architect",
        command="/bmad:bmm:workflows:check-implementation-readiness",
        phase="solutioning",
        artifact="readiness-report.md",
        required=True,
        depends_on=["prd", "architecture", "epics"],
    ),
    # Phase 4: Implementation (Required)
    "sprint-planning": WorkflowConfig(
        id="sprint-planning",
        name="Sprint Planning",
        description="Plan sprint and generate status tracking",
        agent="sm",
        command="/bmad:bmm:workflows:sprint-planning",
        phase="implementation",
        artifact="sprint-status.yaml",
        required=True,
        depends_on=["epics"],
    ),
    "create-story": WorkflowConfig(
        id="create-story",
        name="Create Story",
        description="Create individual story file with full context",
        agent="sm",
        command="/bmad:bmm:workflows:create-story",
        phase="implementation",
        artifact="stories/{story-id}.md",
        required=True,
        depends_on=["sprint-planning"],
    ),
    "dev-story": WorkflowConfig(
        id="dev-story",
        name="Develop Story",
        description="Implement a story with full guidance",
        agent="dev",
        command="/bmad:bmm:workflows:dev-story",
        phase="implementation",
        artifact="stories/{story-id}.md",
        required=True,
        depends_on=["create-story"],
    ),
    "code-review": WorkflowConfig(
        id="code-review",
        name="Code Review",
        description="Review completed story implementation",
        agent="dev",
        command="/bmad:bmm:workflows:code-review",
        phase="implementation",
        artifact="reviews/{story-id}.md",
        required=True,
        depends_on=["dev-story"],
    ),
    "correct-course": WorkflowConfig(
        id="correct-course",
        name="Correct Course",
        description="Mid-sprint course correction",
        agent="sm",
        command="/bmad:bmm:workflows:correct-course",
        phase="implementation",
        artifact="corrections.md",
        required=False,
    ),
    "retrospective": WorkflowConfig(
        id="retrospective",
        name="Retrospective",
        description="Sprint retrospective",
        agent="sm",
        command="/bmad:bmm:workflows:retrospective",
        phase="implementation",
        artifact="retrospectives/{sprint}.md",
        required=False,
    ),
}

# =============================================================================
# PHASE DEFINITIONS
# =============================================================================

PHASES: dict[str, PhaseConfig] = {
    "analysis": PhaseConfig(
        id="analysis",
        name="Analysis",
        description="Optional discovery phase for product brief and research",
        workflows=["product-brief", "research"],
        gate_check=None,
    ),
    "planning": PhaseConfig(
        id="planning",
        name="Planning",
        description="Define what we're building (PRD, UX)",
        workflows=["prd", "ux-design"],
        gate_check=None,
    ),
    "solutioning": PhaseConfig(
        id="solutioning",
        name="Solutioning",
        description="Design how we'll build it (Architecture, Epics)",
        workflows=["architecture", "epics", "implementation-readiness"],
        gate_check="implementation-readiness",
    ),
    "implementation": PhaseConfig(
        id="implementation",
        name="Implementation",
        description="Plan and execute the build",
        workflows=["sprint-planning", "create-story", "dev-story", "code-review"],
        gate_check=None,
    ),
}

# Phase execution order
PHASE_ORDER = ["analysis", "planning", "solutioning", "implementation"]
REQUIRED_PHASES = ["planning", "solutioning", "implementation"]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def get_workflow(workflow_id: str) -> WorkflowConfig | None:
    """Get workflow configuration by ID."""
    return WORKFLOWS.get(workflow_id)


def get_phase_workflows(phase_id: str) -> list[WorkflowConfig]:
    """Get all workflows for a phase in execution order."""
    phase = PHASES.get(phase_id)
    if not phase:
        return []

    return [WORKFLOWS[wf_id] for wf_id in phase.workflows if wf_id in WORKFLOWS]


def get_required_workflows(phase_id: str) -> list[WorkflowConfig]:
    """Get only required workflows for a phase."""
    return [wf for wf in get_phase_workflows(phase_id) if wf.required]


def check_dependencies(workflow_id: str, completed: list[str]) -> tuple[bool, list[str]]:
    """
    Check if workflow dependencies are met.

    Args:
        workflow_id: Workflow to check
        completed: List of completed workflow IDs

    Returns:
        Tuple of (can_run, missing_dependencies)
    """
    workflow = WORKFLOWS.get(workflow_id)
    if not workflow:
        return False, [f"Unknown workflow: {workflow_id}"]

    missing = [dep for dep in workflow.depends_on if dep not in completed]
    return len(missing) == 0, missing
