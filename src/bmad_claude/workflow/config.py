"""
BMAD Workflow Configuration - Complete Mapping

Maps ALL BMAD workflows, agents, and slash commands directly to
_bmad/bmm/workflows/ structure following strict BMAD methodology.

This includes:
- Phase 1: Analysis (Optional)
- Phase 2: Planning (Required)
- Phase 3: Solutioning (Required)
- Phase 4: Implementation (Required)
- Utility workflows (document-project, brainstorming, etc.)
- Test architecture workflows
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
    command: str  # BMAD slash command to invoke
    phase: str  # Which phase this belongs to
    artifact: str  # Output artifact path
    required: bool = True
    depends_on: list[str] = field(default_factory=list)  # Workflow dependencies
    exec_path: str = ""  # Path to workflow.md or workflow.yaml


@dataclass
class PhaseConfig:
    """Configuration for a BMAD phase."""

    id: str
    name: str
    description: str
    workflows: list[str]  # Workflow IDs in execution order
    gate_check: str | None = None  # Required gate check workflow


@dataclass
class AgentConfig:
    """Configuration for a BMAD agent."""

    id: str
    display_name: str
    title: str
    icon: str
    role: str
    identity: str
    communication_style: str
    principles: str
    module: str
    path: str


# =============================================================================
# AGENT DEFINITIONS (from agent-manifest.csv)
# =============================================================================

AGENTS: dict[str, AgentConfig] = {
    "bmad-master": AgentConfig(
        id="bmad-master",
        display_name="BMad Master",
        title="BMad Master Executor, Knowledge Custodian, and Workflow Orchestrator",
        icon="🧙",
        role="Master Task Executor + BMad Expert + Guiding Facilitator Orchestrator",
        identity="Master-level expert in the BMAD Core Platform and all loaded modules",
        communication_style="Direct and comprehensive, refers to himself in the 3rd person",
        principles="Load resources at runtime never pre-load, and always present numbered lists for choices",
        module="core",
        path="_bmad/core/agents/bmad-master.md",
    ),
    "analyst": AgentConfig(
        id="analyst",
        display_name="Mary",
        title="Business Analyst",
        icon="📊",
        role="Strategic Business Analyst + Requirements Expert",
        identity="Senior analyst with deep expertise in market research and requirements elicitation",
        communication_style="Speaks with the excitement of a treasure hunter",
        principles="Channel expert business analysis frameworks",
        module="bmm",
        path="_bmad/bmm/agents/analyst.md",
    ),
    "pm": AgentConfig(
        id="pm",
        display_name="John",
        title="Product Manager",
        icon="📋",
        role="Product Manager specializing in collaborative PRD creation",
        identity="Product management veteran with 8+ years launching B2B and consumer products",
        communication_style="Asks 'WHY?' relentlessly like a detective on a case",
        principles="PRDs emerge from user interviews, not template filling",
        module="bmm",
        path="_bmad/bmm/agents/pm.md",
    ),
    "architect": AgentConfig(
        id="architect",
        display_name="Winston",
        title="Architect",
        icon="🏗️",
        role="System Architect + Technical Design Leader",
        identity="Senior architect with expertise in distributed systems and cloud infrastructure",
        communication_style="Speaks in calm, pragmatic tones",
        principles="User journeys drive technical decisions. Embrace boring technology for stability",
        module="bmm",
        path="_bmad/bmm/agents/architect.md",
    ),
    "ux-designer": AgentConfig(
        id="ux-designer",
        display_name="Sally",
        title="UX Designer",
        icon="🎨",
        role="User Experience Designer + UI Specialist",
        identity="Senior UX Designer with 7+ years creating intuitive experiences",
        communication_style="Paints pictures with words, telling user stories",
        principles="Every decision serves genuine user needs",
        module="bmm",
        path="_bmad/bmm/agents/ux-designer.md",
    ),
    "sm": AgentConfig(
        id="sm",
        display_name="Bob",
        title="Scrum Master",
        icon="🏃",
        role="Technical Scrum Master + Story Preparation Specialist",
        identity="Certified Scrum Master with deep technical background",
        communication_style="Crisp and checklist-driven",
        principles="Stories are single source of truth",
        module="bmm",
        path="_bmad/bmm/agents/sm.md",
    ),
    "dev": AgentConfig(
        id="dev",
        display_name="Amelia",
        title="Developer Agent",
        icon="💻",
        role="Senior Software Engineer",
        identity="Executes approved stories with strict adherence to acceptance criteria",
        communication_style="Ultra-succinct. Speaks in file paths and AC IDs",
        principles="The Story File is the single source of truth",
        module="bmm",
        path="_bmad/bmm/agents/dev.md",
    ),
    "tea": AgentConfig(
        id="tea",
        display_name="Murat",
        title="Master Test Architect",
        icon="🧪",
        role="Master Test Architect",
        identity="Test architect specializing in API testing, backend services, UI automation",
        communication_style="Blends data with gut instinct",
        principles="Risk-based testing - depth scales with impact",
        module="bmm",
        path="_bmad/bmm/agents/tea.md",
    ),
    "tech-writer": AgentConfig(
        id="tech-writer",
        display_name="Paige",
        title="Technical Writer",
        icon="📚",
        role="Technical Documentation Specialist + Knowledge Curator",
        identity="Experienced technical writer expert in CommonMark, DITA, OpenAPI",
        communication_style="Patient educator who explains like teaching a friend",
        principles="Documentation is teaching",
        module="bmm",
        path="_bmad/bmm/agents/tech-writer.md",
    ),
    "quick-flow-solo-dev": AgentConfig(
        id="quick-flow-solo-dev",
        display_name="Barry",
        title="Quick Flow Solo Dev",
        icon="🚀",
        role="Elite Full-Stack Developer + Quick Flow Specialist",
        identity="Barry handles Quick Flow - from tech spec creation through implementation",
        communication_style="Direct, confident, and implementation-focused",
        principles="Planning and execution are two sides of the same coin",
        module="bmm",
        path="_bmad/bmm/agents/quick-flow-solo-dev.md",
    ),
    "brainstorming-coach": AgentConfig(
        id="brainstorming-coach",
        display_name="Carson",
        title="Elite Brainstorming Specialist",
        icon="🧠",
        role="Master Brainstorming Facilitator + Innovation Catalyst",
        identity="Elite facilitator with 20+ years leading breakthrough sessions",
        communication_style="Talks like an enthusiastic improv coach - high energy",
        principles="Psychological safety unlocks breakthroughs",
        module="cis",
        path="_bmad/cis/agents/brainstorming-coach.md",
    ),
}


# =============================================================================
# WORKFLOW DEFINITIONS - Complete BMAD Methodology
# =============================================================================

WORKFLOWS: dict[str, WorkflowConfig] = {
    # =========================================================================
    # Phase 1: Analysis (Optional)
    # =========================================================================
    "brainstorm-project": WorkflowConfig(
        id="brainstorm-project",
        name="Brainstorm Project",
        description="Creative exploration and idea generation using brainstorming techniques",
        agent="analyst",
        command="/bmad:bmm:workflows:brainstorming",
        phase="analysis",
        artifact="brainstorm.md",
        required=False,
        exec_path="_bmad/core/workflows/brainstorming/workflow.md",
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
        exec_path="_bmad/bmm/workflows/1-analysis/research/workflow.md",
    ),
    "product-brief": WorkflowConfig(
        id="product-brief",
        name="Create Product Brief",
        description="Create comprehensive product brief through discovery",
        agent="analyst",
        command="/bmad:bmm:workflows:create-product-brief",
        phase="analysis",
        artifact="product-brief.md",
        required=False,
        exec_path="_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md",
    ),
    # =========================================================================
    # Phase 2: Planning (Required)
    # =========================================================================
    "prd": WorkflowConfig(
        id="prd",
        name="Product Requirements Document",
        description="Create comprehensive PRD through 12-step workflow",
        agent="pm",
        command="/bmad:bmm:workflows:create-prd",
        phase="planning",
        artifact="prd.md",
        required=True,
        exec_path="_bmad/bmm/workflows/2-plan-workflows/prd/workflow.md",
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
        depends_on=["prd"],
        exec_path="_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md",
    ),
    # =========================================================================
    # Phase 3: Solutioning (Required)
    # =========================================================================
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
        exec_path="_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md",
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
        exec_path="_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md",
    ),
    "test-design": WorkflowConfig(
        id="test-design",
        name="Test Design",
        description="System-level testability review",
        agent="tea",
        command="/bmad:bmm:workflows:test-design",
        phase="solutioning",
        artifact="test-design.md",
        required=False,
        depends_on=["architecture"],
        exec_path="_bmad/bmm/workflows/testarch/test-design/workflow.yaml",
    ),
    "implementation-readiness": WorkflowConfig(
        id="implementation-readiness",
        name="Implementation Readiness Check",
        description="Gate check before implementation begins",
        agent="architect",
        command="/bmad:bmm:workflows:implementation-readiness",
        phase="solutioning",
        artifact="readiness-report.md",
        required=True,
        depends_on=["prd", "architecture", "epics"],
        exec_path="_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md",
    ),
    # =========================================================================
    # Phase 4: Implementation (Required)
    # =========================================================================
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
        exec_path="_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml",
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
        exec_path="_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml",
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
        exec_path="_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml",
    ),
    "code-review": WorkflowConfig(
        id="code-review",
        name="Code Review",
        description="Adversarial senior developer code review",
        agent="dev",
        command="/bmad:bmm:workflows:code-review",
        phase="implementation",
        artifact="reviews/{story-id}.md",
        required=True,
        depends_on=["dev-story"],
        exec_path="_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml",
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
        exec_path="_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml",
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
        exec_path="_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml",
    ),
    # =========================================================================
    # Utility Workflows
    # =========================================================================
    "workflow-init": WorkflowConfig(
        id="workflow-init",
        name="Workflow Init",
        description="Initialize BMAD workflow tracking for a project",
        agent="bmad-master",
        command="/bmad:bmm:workflows:workflow-init",
        phase="utility",
        artifact="bmm-workflow-status.yaml",
        required=False,
        exec_path="_bmad/bmm/workflows/workflow-status/init/workflow.yaml",
    ),
    "document-project": WorkflowConfig(
        id="document-project",
        name="Document Project",
        description="Generate comprehensive project documentation",
        agent="tech-writer",
        command="/bmad:bmm:workflows:document-project",
        phase="utility",
        artifact="docs/index.md",
        required=False,
        exec_path="_bmad/bmm/workflows/document-project/workflow.yaml",
    ),
    "generate-project-context": WorkflowConfig(
        id="generate-project-context",
        name="Generate Project Context",
        description="Generate project-context.md for AI assistants",
        agent="bmad-master",
        command="/bmad:bmm:workflows:generate-project-context",
        phase="utility",
        artifact="project-context.md",
        required=False,
        exec_path="_bmad/bmm/workflows/generate-project-context/workflow.md",
    ),
    # =========================================================================
    # Test Architecture Workflows
    # =========================================================================
    "test-review": WorkflowConfig(
        id="test-review",
        name="Test Review",
        description="Review test coverage and quality",
        agent="tea",
        command="/bmad:bmm:workflows:testarch:test-review",
        phase="testarch",
        artifact="test-review.md",
        required=False,
        exec_path="_bmad/bmm/workflows/testarch/test-review/workflow.yaml",
    ),
    "nfr-assess": WorkflowConfig(
        id="nfr-assess",
        name="NFR Assessment",
        description="Non-functional requirements assessment",
        agent="tea",
        command="/bmad:bmm:workflows:testarch:nfr-assess",
        phase="testarch",
        artifact="nfr-report.md",
        required=False,
        exec_path="_bmad/bmm/workflows/testarch/nfr-assess/workflow.yaml",
    ),
    "test-framework": WorkflowConfig(
        id="test-framework",
        name="Test Framework Setup",
        description="Set up testing framework and infrastructure",
        agent="tea",
        command="/bmad:bmm:workflows:testarch:framework",
        phase="testarch",
        artifact="test-framework.md",
        required=False,
        exec_path="_bmad/bmm/workflows/testarch/framework/workflow.yaml",
    ),
    "test-automate": WorkflowConfig(
        id="test-automate",
        name="Test Automation",
        description="Automate test execution",
        agent="tea",
        command="/bmad:bmm:workflows:testarch:automate",
        phase="testarch",
        artifact="test-automation.md",
        required=False,
        exec_path="_bmad/bmm/workflows/testarch/automate/workflow.yaml",
    ),
    "atdd": WorkflowConfig(
        id="atdd",
        name="ATDD",
        description="Acceptance Test Driven Development",
        agent="tea",
        command="/bmad:bmm:workflows:testarch:atdd",
        phase="testarch",
        artifact="atdd-checklist.md",
        required=False,
        exec_path="_bmad/bmm/workflows/testarch/atdd/workflow.yaml",
    ),
    "trace": WorkflowConfig(
        id="trace",
        name="Traceability",
        description="Requirements traceability analysis",
        agent="tea",
        command="/bmad:bmm:workflows:testarch:trace",
        phase="testarch",
        artifact="trace-report.md",
        required=False,
        exec_path="_bmad/bmm/workflows/testarch/trace/workflow.yaml",
    ),
    # =========================================================================
    # Quick Flow Workflows
    # =========================================================================
    "quick-spec": WorkflowConfig(
        id="quick-spec",
        name="Quick Spec",
        description="Rapid tech spec creation for small features",
        agent="quick-flow-solo-dev",
        command="/bmad:bmm:workflows:quick-spec",
        phase="quick-flow",
        artifact="tech-spec.md",
        required=False,
        exec_path="_bmad/bmm/workflows/bmad-quick-flow/quick-spec/workflow.md",
    ),
    "quick-dev": WorkflowConfig(
        id="quick-dev",
        name="Quick Dev",
        description="Rapid development workflow for small features",
        agent="quick-flow-solo-dev",
        command="/bmad:bmm:workflows:quick-dev",
        phase="quick-flow",
        artifact="implementation.md",
        required=False,
        exec_path="_bmad/bmm/workflows/bmad-quick-flow/quick-dev/workflow.md",
    ),
    # =========================================================================
    # Core Workflows (Party Mode, Brainstorming, etc.)
    # =========================================================================
    "party-mode": WorkflowConfig(
        id="party-mode",
        name="Party Mode",
        description="Multi-agent collaborative discussion orchestration",
        agent="bmad-master",
        command="/bmad:core:workflows:party-mode",
        phase="core",
        artifact="party-session.md",
        required=False,
        exec_path="_bmad/core/workflows/party-mode/workflow.md",
    ),
    "brainstorming": WorkflowConfig(
        id="brainstorming",
        name="Brainstorming Session",
        description="Structured brainstorming using various techniques",
        agent="brainstorming-coach",
        command="/bmad:core:workflows:brainstorming",
        phase="core",
        artifact="brainstorm-session.md",
        required=False,
        exec_path="_bmad/core/workflows/brainstorming/workflow.md",
    ),
    "advanced-elicitation": WorkflowConfig(
        id="advanced-elicitation",
        name="Advanced Elicitation",
        description="Deep-dive elicitation for complex requirements",
        agent="analyst",
        command="/bmad:core:workflows:advanced-elicitation",
        phase="core",
        artifact="elicitation-notes.md",
        required=False,
        exec_path="_bmad/core/workflows/advanced-elicitation/workflow.xml",
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
        workflows=["brainstorm-project", "research", "product-brief"],
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
        workflows=["architecture", "epics", "test-design", "implementation-readiness"],
        gate_check="implementation-readiness",
    ),
    "implementation": PhaseConfig(
        id="implementation",
        name="Implementation",
        description="Plan and execute the build",
        workflows=[
            "sprint-planning",
            "create-story",
            "dev-story",
            "code-review",
            "correct-course",
            "retrospective",
        ],
        gate_check=None,
    ),
    "utility": PhaseConfig(
        id="utility",
        name="Utility",
        description="Utility workflows that can be run anytime",
        workflows=["workflow-init", "document-project", "generate-project-context"],
        gate_check=None,
    ),
    "testarch": PhaseConfig(
        id="testarch",
        name="Test Architecture",
        description="Test architecture and quality workflows",
        workflows=[
            "test-review",
            "nfr-assess",
            "test-framework",
            "test-automate",
            "atdd",
            "trace",
        ],
        gate_check=None,
    ),
    "quick-flow": PhaseConfig(
        id="quick-flow",
        name="Quick Flow",
        description="Rapid development for small features (1-3 stories)",
        workflows=["quick-spec", "quick-dev"],
        gate_check=None,
    ),
    "core": PhaseConfig(
        id="core",
        name="Core",
        description="Core BMAD workflows (party mode, brainstorming)",
        workflows=["party-mode", "brainstorming", "advanced-elicitation"],
        gate_check=None,
    ),
}

# Phase execution order for BMAD methodology
PHASE_ORDER = ["analysis", "planning", "solutioning", "implementation"]
REQUIRED_PHASES = ["planning", "solutioning", "implementation"]


# =============================================================================
# SLASH COMMAND MAPPING
# =============================================================================

# Maps slash commands to workflow IDs
SLASH_COMMANDS: dict[str, str] = {
    # Phase 1: Analysis
    "/bmad:bmm:workflows:brainstorming": "brainstorm-project",
    "/bmad:bmm:workflows:research": "research",
    "/bmad:bmm:workflows:create-product-brief": "product-brief",
    # Phase 2: Planning
    "/bmad:bmm:workflows:create-prd": "prd",
    "/bmad:bmm:workflows:create-ux-design": "ux-design",
    # Phase 3: Solutioning
    "/bmad:bmm:workflows:create-architecture": "architecture",
    "/bmad:bmm:workflows:create-epics-and-stories": "epics",
    "/bmad:bmm:workflows:test-design": "test-design",
    "/bmad:bmm:workflows:implementation-readiness": "implementation-readiness",
    # Phase 4: Implementation
    "/bmad:bmm:workflows:sprint-planning": "sprint-planning",
    "/bmad:bmm:workflows:create-story": "create-story",
    "/bmad:bmm:workflows:dev-story": "dev-story",
    "/bmad:bmm:workflows:code-review": "code-review",
    "/bmad:bmm:workflows:correct-course": "correct-course",
    "/bmad:bmm:workflows:retrospective": "retrospective",
    # Utility
    "/bmad:bmm:workflows:workflow-init": "workflow-init",
    "/bmad:bmm:workflows:document-project": "document-project",
    "/bmad:bmm:workflows:generate-project-context": "generate-project-context",
    # Test Architecture
    "/bmad:bmm:workflows:testarch:test-review": "test-review",
    "/bmad:bmm:workflows:testarch:nfr-assess": "nfr-assess",
    "/bmad:bmm:workflows:testarch:framework": "test-framework",
    "/bmad:bmm:workflows:testarch:automate": "test-automate",
    "/bmad:bmm:workflows:testarch:atdd": "atdd",
    "/bmad:bmm:workflows:testarch:trace": "trace",
    # Quick Flow
    "/bmad:bmm:workflows:quick-spec": "quick-spec",
    "/bmad:bmm:workflows:quick-dev": "quick-dev",
    # Core
    "/bmad:core:workflows:party-mode": "party-mode",
    "/bmad:core:workflows:brainstorming": "brainstorming",
    "/bmad:core:workflows:advanced-elicitation": "advanced-elicitation",
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================


def get_workflow(workflow_id: str) -> WorkflowConfig | None:
    """Get workflow configuration by ID."""
    return WORKFLOWS.get(workflow_id)


def get_workflow_by_command(command: str) -> WorkflowConfig | None:
    """Get workflow configuration by slash command."""
    workflow_id = SLASH_COMMANDS.get(command)
    if workflow_id:
        return WORKFLOWS.get(workflow_id)
    return None


def get_agent(agent_id: str) -> AgentConfig | None:
    """Get agent configuration by ID."""
    return AGENTS.get(agent_id)


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


def get_all_workflows() -> list[WorkflowConfig]:
    """Get all workflow configurations."""
    return list(WORKFLOWS.values())


def get_all_agents() -> list[AgentConfig]:
    """Get all agent configurations."""
    return list(AGENTS.values())


def get_all_slash_commands() -> list[str]:
    """Get all available slash commands."""
    return list(SLASH_COMMANDS.keys())
