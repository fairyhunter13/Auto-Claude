"""
PhaseManager - BMAD Methodology Phase Management for Party Mode.

Implements the COMPLETE BMAD 4-phase methodology:

Phase 1: Analysis (Optional)
  - Product Brief creation
  - Research workflows

Phase 2: Planning (Required)
  - PRD with all 12 steps
  - UX Design (if UI exists)

Phase 3: Solutioning (Required)
  - Architecture decisions
  - Epics and Stories
  - Implementation Readiness Gate

Phase 4: Implementation (Required)
  - Sprint Planning
  - Story Creation
  - Development
  - Code Review
  - Retrospective

This module ensures Party Mode discussions follow the BMAD methodology
exactly as defined in _bmad/bmm/workflows/.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from bmad_claude.party.memory import PartyMemory


@dataclass
class WorkflowStep:
    """A step within a BMAD workflow."""

    id: str
    name: str
    description: str
    step_file: str  # Reference to BMAD step file
    required: bool = True


@dataclass
class BMADWorkflow:
    """A BMAD workflow definition."""

    id: str
    name: str
    description: str
    agent: str  # Lead agent for this workflow
    steps: list[WorkflowStep]
    artifact: str  # Output artifact
    template: str | None = None  # Template file path


@dataclass
class PhaseTopic:
    """A discussion topic within a phase (maps to BMAD workflow steps)."""

    id: str
    name: str
    description: str
    lead_agent: str
    supporting_agents: list[str]
    artifact_section: str | None = None
    required: bool = True
    workflow_step: str | None = None  # Maps to BMAD workflow step


@dataclass
class PhaseDefinition:
    """Definition of a BMAD phase with complete workflow mapping."""

    id: str
    name: str
    description: str
    workflows: list[BMADWorkflow]  # All workflows in this phase
    topics: list[PhaseTopic]  # Discussion topics derived from workflows
    gate_check: str | None = None  # Gate check before next phase


# =============================================================================
# PHASE 1: ANALYSIS (Optional)
# =============================================================================

ANALYSIS_WORKFLOWS = [
    BMADWorkflow(
        id="create-product-brief",
        name="Create Product Brief",
        description="Create comprehensive product briefs through collaborative discovery",
        agent="analyst",
        artifact="product-brief.md",
        template="1-analysis/create-product-brief/product-brief.template.md",
        steps=[
            WorkflowStep("pb-01", "Initialize", "Setup and context loading", "step-01-init.md"),
            WorkflowStep(
                "pb-02", "Vision", "Product vision and problem definition", "step-02-vision.md"
            ),
            WorkflowStep("pb-03", "Users", "Target users and personas", "step-03-users.md"),
            WorkflowStep("pb-04", "Metrics", "Success metrics and goals", "step-04-metrics.md"),
            WorkflowStep("pb-05", "Scope", "Initial scope definition", "step-05-scope.md"),
            WorkflowStep("pb-06", "Complete", "Finalize product brief", "step-06-complete.md"),
        ],
    ),
    BMADWorkflow(
        id="research",
        name="Market/Domain Research",
        description="Conduct market or domain research",
        agent="analyst",
        artifact="research.md",
        template="1-analysis/research/research.template.md",
        steps=[
            WorkflowStep("res-01", "Initialize", "Research setup", "step-01-init.md"),
            WorkflowStep(
                "res-02", "Domain Analysis", "Domain deep-dive", "step-02-domain-analysis.md"
            ),
            WorkflowStep(
                "res-03", "Competitive", "Competitive landscape", "step-03-competitive-landscape.md"
            ),
            WorkflowStep("res-04", "Customer", "Customer insights", "step-02-customer-insights.md"),
            WorkflowStep(
                "res-05", "Synthesis", "Research synthesis", "step-06-research-synthesis.md"
            ),
        ],
    ),
]

ANALYSIS_TOPICS = [
    PhaseTopic(
        id="product-brief",
        name="Product Brief",
        description="Create comprehensive product brief defining vision, users, and scope",
        lead_agent="analyst",
        supporting_agents=["pm"],
        artifact_section="product_brief",
        required=False,  # Phase 1 is optional
        workflow_step="create-product-brief",
    ),
    PhaseTopic(
        id="research",
        name="Research",
        description="Conduct market research and competitive analysis",
        lead_agent="analyst",
        supporting_agents=["pm"],
        artifact_section="research",
        required=False,
        workflow_step="research",
    ),
]

# =============================================================================
# PHASE 2: PLANNING (Required)
# =============================================================================

PLANNING_WORKFLOWS = [
    BMADWorkflow(
        id="prd",
        name="Product Requirements Document",
        description="Create comprehensive PRD through 12-step workflow",
        agent="pm",
        artifact="prd.md",
        template="2-plan-workflows/prd/templates/prd-template.md",
        steps=[
            WorkflowStep("prd-01", "Initialize", "PRD setup and mode selection", "step-01-init.md"),
            WorkflowStep(
                "prd-02",
                "Discovery",
                "Deep discovery and context gathering",
                "step-02-discovery.md",
            ),
            WorkflowStep("prd-03", "Success", "Success metrics definition", "step-03-success.md"),
            WorkflowStep("prd-04", "Journeys", "User journeys and flows", "step-04-journeys.md"),
            WorkflowStep(
                "prd-05", "Domain", "Domain analysis and constraints", "step-05-domain.md"
            ),
            WorkflowStep(
                "prd-06", "Innovation", "Innovation and differentiation", "step-06-innovation.md"
            ),
            WorkflowStep(
                "prd-07", "Project Type", "Project classification", "step-07-project-type.md"
            ),
            WorkflowStep(
                "prd-08", "Scoping", "Scope definition and priorities", "step-08-scoping.md"
            ),
            WorkflowStep(
                "prd-09", "Functional", "Functional requirements", "step-09-functional.md"
            ),
            WorkflowStep(
                "prd-10",
                "Non-Functional",
                "Non-functional requirements",
                "step-10-nonfunctional.md",
            ),
            WorkflowStep("prd-11", "Polish", "Refinement and polish", "step-11-polish.md"),
            WorkflowStep("prd-12", "Complete", "Finalize PRD", "step-12-complete.md"),
        ],
    ),
    BMADWorkflow(
        id="ux-design",
        name="UX Design",
        description="Create UX design for products with UI",
        agent="ux-designer",
        artifact="ux-design.md",
        template="2-plan-workflows/create-ux-design/ux-design-template.md",
        steps=[
            WorkflowStep("ux-01", "Initialize", "UX design setup", "step-01-init.md"),
            WorkflowStep("ux-02", "Research", "User research synthesis", "step-02-research.md"),
            WorkflowStep("ux-03", "Flows", "User flows and wireframes", "step-03-flows.md"),
            WorkflowStep("ux-04", "Design", "Visual design system", "step-04-design.md"),
            WorkflowStep("ux-05", "Complete", "Finalize UX design", "step-05-complete.md"),
        ],
    ),
]

PLANNING_TOPICS = [
    # PRD Topics (matching 12 BMAD steps)
    PhaseTopic(
        id="vision",
        name="Product Vision",
        description="What problem are we solving? Why does this need to exist?",
        lead_agent="pm",
        supporting_agents=["analyst"],
        artifact_section="executive_summary",
        workflow_step="prd-02",
    ),
    PhaseTopic(
        id="users",
        name="Target Users",
        description="Who are the users? What are their personas and journeys?",
        lead_agent="pm",
        supporting_agents=["analyst", "ux-designer"],
        artifact_section="user_personas",
        workflow_step="prd-04",
    ),
    PhaseTopic(
        id="success",
        name="Success Metrics",
        description="How do we measure success? What are the goals?",
        lead_agent="pm",
        supporting_agents=["analyst"],
        artifact_section="success_metrics",
        workflow_step="prd-03",
    ),
    PhaseTopic(
        id="domain",
        name="Domain Analysis",
        description="What domain constraints and considerations exist?",
        lead_agent="analyst",
        supporting_agents=["pm", "architect"],
        artifact_section="domain",
        workflow_step="prd-05",
    ),
    PhaseTopic(
        id="innovation",
        name="Innovation & Differentiation",
        description="What makes this product unique? What's the competitive edge?",
        lead_agent="pm",
        supporting_agents=["analyst"],
        artifact_section="innovation",
        workflow_step="prd-06",
    ),
    PhaseTopic(
        id="scope",
        name="MVP Scope",
        description="What's in MVP? What's out? Feature prioritization.",
        lead_agent="pm",
        supporting_agents=["architect"],
        artifact_section="requirements",
        workflow_step="prd-08",
    ),
    PhaseTopic(
        id="functional",
        name="Functional Requirements",
        description="Detailed functional requirements and features",
        lead_agent="pm",
        supporting_agents=["architect", "dev"],
        artifact_section="functional_requirements",
        workflow_step="prd-09",
    ),
    PhaseTopic(
        id="nonfunctional",
        name="Non-Functional Requirements",
        description="Performance, security, scalability requirements",
        lead_agent="architect",
        supporting_agents=["pm", "dev"],
        artifact_section="nonfunctional_requirements",
        workflow_step="prd-10",
    ),
    # UX Topics (conditional)
    PhaseTopic(
        id="ux-design",
        name="UX Design",
        description="User experience design, flows, and wireframes",
        lead_agent="ux-designer",
        supporting_agents=["pm"],
        artifact_section="ux_design",
        required=False,  # Only if product has UI
        workflow_step="ux-design",
    ),
]

# =============================================================================
# PHASE 3: SOLUTIONING (Required)
# =============================================================================

SOLUTIONING_WORKFLOWS = [
    BMADWorkflow(
        id="architecture",
        name="Create Architecture",
        description="Architecture decisions through collaborative discovery",
        agent="architect",
        artifact="architecture.md",
        template="3-solutioning/create-architecture/architecture-decision-template.md",
        steps=[
            WorkflowStep("arch-01", "Initialize", "Architecture setup", "step-01-init.md"),
            WorkflowStep("arch-02", "System", "System architecture", "step-02-system.md"),
            WorkflowStep("arch-03", "Data", "Data architecture", "step-03-data.md"),
            WorkflowStep(
                "arch-04", "Integration", "Integration patterns", "step-04-integration.md"
            ),
            WorkflowStep("arch-05", "Security", "Security architecture", "step-05-security.md"),
            WorkflowStep("arch-06", "Complete", "Finalize architecture", "step-06-complete.md"),
        ],
    ),
    BMADWorkflow(
        id="epics",
        name="Create Epics and Stories",
        description="Transform PRD into epics and user stories",
        agent="pm",
        artifact="epics/index.md",
        template="3-solutioning/create-epics-and-stories/epic-template.md",
        steps=[
            WorkflowStep(
                "epic-01",
                "Prerequisites",
                "Validate PRD and Architecture",
                "step-01-validate-prerequisites.md",
            ),
            WorkflowStep(
                "epic-02", "Breakdown", "Epic breakdown from requirements", "step-02-breakdown.md"
            ),
            WorkflowStep(
                "epic-03",
                "Stories",
                "Story creation with acceptance criteria",
                "step-03-stories.md",
            ),
            WorkflowStep("epic-04", "Complete", "Finalize epics", "step-04-complete.md"),
        ],
    ),
    BMADWorkflow(
        id="implementation-readiness",
        name="Implementation Readiness Check",
        description="Gate check before implementation begins",
        agent="architect",
        artifact="readiness-report.md",
        template=None,
        steps=[
            WorkflowStep(
                "gate-01",
                "Documents",
                "Validate all documents exist",
                "step-01-document-discovery.md",
            ),
            WorkflowStep(
                "gate-02", "Alignment", "Check alignment across artifacts", "step-02-alignment.md"
            ),
            WorkflowStep("gate-03", "Gaps", "Identify and address gaps", "step-03-gaps.md"),
            WorkflowStep("gate-04", "Approval", "Gate approval", "step-04-approval.md"),
        ],
    ),
]

SOLUTIONING_TOPICS = [
    PhaseTopic(
        id="architecture",
        name="System Architecture",
        description="How should we structure the system? What patterns?",
        lead_agent="architect",
        supporting_agents=["dev"],
        artifact_section="architecture",
        workflow_step="architecture",
    ),
    PhaseTopic(
        id="tech_stack",
        name="Technology Stack",
        description="What technologies should we use? Why?",
        lead_agent="architect",
        supporting_agents=["dev"],
        artifact_section="tech_stack",
        workflow_step="arch-02",
    ),
    PhaseTopic(
        id="data",
        name="Data Architecture",
        description="Data models, storage, and flow",
        lead_agent="architect",
        supporting_agents=["dev"],
        artifact_section="data_architecture",
        workflow_step="arch-03",
    ),
    PhaseTopic(
        id="security",
        name="Security Architecture",
        description="Security patterns and requirements",
        lead_agent="architect",
        supporting_agents=["dev"],
        artifact_section="security",
        workflow_step="arch-05",
    ),
    PhaseTopic(
        id="epics",
        name="Epic Breakdown",
        description="What are the major work items? How do we break them down?",
        lead_agent="pm",
        supporting_agents=["architect", "sm"],
        artifact_section="epics",
        workflow_step="epics",
    ),
    PhaseTopic(
        id="gate_check",
        name="Implementation Readiness",
        description="Is everything ready to build? Any gaps?",
        lead_agent="architect",
        supporting_agents=["pm", "tea"],
        artifact_section="gate_check",
        required=True,  # Gate check is mandatory
        workflow_step="implementation-readiness",
    ),
]

# =============================================================================
# PHASE 4: IMPLEMENTATION (Required)
# =============================================================================

IMPLEMENTATION_WORKFLOWS = [
    BMADWorkflow(
        id="sprint-planning",
        name="Sprint Planning",
        description="Plan sprint and generate status tracking",
        agent="sm",
        artifact="sprint-status.yaml",
        template=None,
        steps=[
            WorkflowStep(
                "sp-01", "Parse Epics", "Parse epic files and extract work items", "step-01.md"
            ),
            WorkflowStep("sp-02", "Build Status", "Build sprint status structure", "step-02.md"),
            WorkflowStep(
                "sp-03", "Detect Status", "Apply intelligent status detection", "step-03.md"
            ),
            WorkflowStep("sp-04", "Generate", "Generate sprint status file", "step-04.md"),
            WorkflowStep("sp-05", "Validate", "Validate and report", "step-05.md"),
        ],
    ),
    BMADWorkflow(
        id="create-story",
        name="Create Story",
        description="Create individual story file with full context",
        agent="sm",
        artifact="stories/{story-id}.md",
        template="4-implementation/create-story/template.md",
        steps=[
            WorkflowStep("cs-01", "Load Epic", "Load story from epic", "step-01.md"),
            WorkflowStep("cs-02", "Enhance", "Enhance with dev notes", "step-02.md"),
            WorkflowStep("cs-03", "Complete", "Write story file", "step-03.md"),
        ],
    ),
    BMADWorkflow(
        id="dev-story",
        name="Develop Story",
        description="Implement a story with full guidance",
        agent="dev",
        artifact="stories/{story-id}.md",  # Updates existing
        template=None,
        steps=[
            WorkflowStep("ds-01", "Load", "Load story and context", "step-01.md"),
            WorkflowStep("ds-02", "Implement", "Implement tasks", "step-02.md"),
            WorkflowStep("ds-03", "Test", "Write and run tests", "step-03.md"),
            WorkflowStep("ds-04", "Complete", "Mark complete, update status", "step-04.md"),
        ],
    ),
    BMADWorkflow(
        id="code-review",
        name="Code Review",
        description="Review completed story implementation",
        agent="dev",
        artifact="review-{story-id}.md",
        template=None,
        steps=[
            WorkflowStep("cr-01", "Load", "Load story and changes", "step-01.md"),
            WorkflowStep("cr-02", "Review", "Perform code review", "step-02.md"),
            WorkflowStep("cr-03", "Report", "Generate review report", "step-03.md"),
        ],
    ),
    BMADWorkflow(
        id="correct-course",
        name="Correct Course",
        description="Mid-sprint course correction",
        agent="sm",
        artifact="correction-log.md",
        template=None,
        steps=[
            WorkflowStep("cc-01", "Assess", "Assess current situation", "step-01.md"),
            WorkflowStep("cc-02", "Plan", "Plan correction", "step-02.md"),
            WorkflowStep("cc-03", "Execute", "Execute correction", "step-03.md"),
        ],
    ),
    BMADWorkflow(
        id="retrospective",
        name="Sprint Retrospective",
        description="Conduct sprint retrospective",
        agent="sm",
        artifact="retrospective-{sprint}.md",
        template=None,
        steps=[
            WorkflowStep("retro-01", "Review", "Review sprint outcomes", "step-01.md"),
            WorkflowStep("retro-02", "Analyze", "What went well/poorly", "step-02.md"),
            WorkflowStep("retro-03", "Actions", "Define action items", "step-03.md"),
        ],
    ),
]

IMPLEMENTATION_TOPICS = [
    PhaseTopic(
        id="sprint_planning",
        name="Sprint Planning",
        description="What goes in sprint 1? Story prioritization.",
        lead_agent="sm",
        supporting_agents=["pm", "dev"],
        artifact_section="sprint_1",
        workflow_step="sprint-planning",
    ),
    PhaseTopic(
        id="story_creation",
        name="Story Creation",
        description="Create detailed story files with dev notes",
        lead_agent="sm",
        supporting_agents=["dev"],
        artifact_section="stories",
        workflow_step="create-story",
    ),
    PhaseTopic(
        id="development",
        name="Story Development",
        description="Implement stories with tests",
        lead_agent="dev",
        supporting_agents=["architect"],
        artifact_section="implementation",
        workflow_step="dev-story",
    ),
    PhaseTopic(
        id="code_review",
        name="Code Review",
        description="Review implemented stories",
        lead_agent="dev",
        supporting_agents=["architect"],
        artifact_section="review",
        workflow_step="code-review",
    ),
    PhaseTopic(
        id="retrospective",
        name="Retrospective",
        description="Sprint retrospective and learnings",
        lead_agent="sm",
        supporting_agents=["pm", "dev"],
        artifact_section="retrospective",
        required=False,  # Optional but recommended
        workflow_step="retrospective",
    ),
]

# =============================================================================
# PHASE DEFINITIONS (Complete BMAD Methodology)
# =============================================================================

PHASES: dict[str, PhaseDefinition] = {
    "analysis": PhaseDefinition(
        id="analysis",
        name="Analysis",
        description="Optional discovery phase for product brief and research",
        workflows=ANALYSIS_WORKFLOWS,
        topics=ANALYSIS_TOPICS,
        gate_check=None,  # No gate - optional phase
    ),
    "planning": PhaseDefinition(
        id="planning",
        name="Planning",
        description="Define what we're building and for whom (PRD, UX)",
        workflows=PLANNING_WORKFLOWS,
        topics=PLANNING_TOPICS,
        gate_check="prd-complete",  # PRD must be complete
    ),
    "solutioning": PhaseDefinition(
        id="solutioning",
        name="Solutioning",
        description="Design how we'll build it (Architecture, Epics, Gate Check)",
        workflows=SOLUTIONING_WORKFLOWS,
        topics=SOLUTIONING_TOPICS,
        gate_check="implementation-readiness",  # Must pass gate check
    ),
    "implementation": PhaseDefinition(
        id="implementation",
        name="Implementation",
        description="Plan and execute the build (Sprints, Stories, Dev, Review)",
        workflows=IMPLEMENTATION_WORKFLOWS,
        topics=IMPLEMENTATION_TOPICS,
        gate_check=None,  # Ongoing phase
    ),
}

# Phase order (Analysis is optional, can be skipped)
PHASE_ORDER = ["analysis", "planning", "solutioning", "implementation"]
REQUIRED_PHASES = ["planning", "solutioning", "implementation"]

# Phase lead agents
PHASE_LEADS: dict[str, str] = {
    "analysis": "analyst",
    "planning": "pm",
    "solutioning": "architect",
    "implementation": "sm",
}


class PhaseManager:
    """
    Manages BMAD phase progression within party mode.

    Ensures strict adherence to BMAD methodology:
    - All required phases must be completed
    - All required topics within phases must be covered
    - Gate checks must pass before phase transitions
    - Workflows are executed in correct order

    Tracks:
    - Current phase and workflow
    - Topics covered within phase
    - Workflow step progress
    - Phase completion criteria
    - Gate check status
    """

    def __init__(self, initial_phase: str = "planning", skip_analysis: bool = True):
        """
        Initialize phase manager.

        Args:
            initial_phase: Starting phase (default: planning)
            skip_analysis: Whether to skip optional analysis phase
        """
        self.current_phase = initial_phase
        self.skip_analysis = skip_analysis
        self.topics_covered: dict[str, list[str]] = {}
        self.workflow_progress: dict[str, list[str]] = {}  # workflow_id -> [completed_step_ids]
        self.gate_checks_passed: list[str] = []

        # Initialize tracking for all phases
        for phase in PHASE_ORDER:
            self.topics_covered[phase] = []
            self.workflow_progress[phase] = []

    def get_current_phase(self) -> PhaseDefinition:
        """Get current phase definition."""
        return PHASES[self.current_phase]

    def get_phase_workflows(self) -> list[BMADWorkflow]:
        """Get all workflows for current phase."""
        return PHASES[self.current_phase].workflows

    def get_current_topics(self) -> list[PhaseTopic]:
        """Get discussion topics for current phase."""
        return PHASES[self.current_phase].topics

    def get_required_topics(self) -> list[PhaseTopic]:
        """Get only required topics for current phase."""
        return [t for t in self.get_current_topics() if t.required]

    def get_next_topic(self) -> PhaseTopic | None:
        """Get the next uncovered required topic in current phase."""
        covered = self.topics_covered.get(self.current_phase, [])

        for topic in PHASES[self.current_phase].topics:
            if topic.required and topic.id not in covered:
                return topic

        # All required covered, check optional
        for topic in PHASES[self.current_phase].topics:
            if not topic.required and topic.id not in covered:
                return topic

        return None

    def mark_topic_covered(self, topic_id: str) -> None:
        """Mark a topic as covered."""
        if self.current_phase not in self.topics_covered:
            self.topics_covered[self.current_phase] = []

        if topic_id not in self.topics_covered[self.current_phase]:
            self.topics_covered[self.current_phase].append(topic_id)

    def mark_workflow_step_complete(self, workflow_id: str, step_id: str) -> None:
        """Mark a workflow step as complete."""
        key = f"{self.current_phase}:{workflow_id}"
        if key not in self.workflow_progress:
            self.workflow_progress[key] = []

        if step_id not in self.workflow_progress[key]:
            self.workflow_progress[key].append(step_id)

    def get_workflow_progress(self, workflow_id: str) -> list[str]:
        """Get completed steps for a workflow."""
        key = f"{self.current_phase}:{workflow_id}"
        return self.workflow_progress.get(key, [])

    def check_phase_complete(
        self,
        memory: PartyMemory,
    ) -> tuple[bool, list[str]]:
        """
        Check if current phase milestone is met.

        Validates:
        1. All required topics are covered
        2. Key decisions have been made
        3. Required artifacts exist
        4. Gate check passes (if applicable)

        Args:
            memory: PartyMemory with decisions and artifacts

        Returns:
            Tuple of (is_complete, missing_items)
        """
        phase = PHASES[self.current_phase]
        covered = self.topics_covered.get(self.current_phase, [])
        missing = []

        # Check required topics
        for topic in phase.topics:
            if topic.required and topic.id not in covered:
                missing.append(f"Topic: {topic.name}")

        # Check for key decisions (at least some decisions made)
        if memory.get_stats()["decisions_count"] == 0:
            missing.append("No decisions captured")

        # Check artifact draft exists (for phases that produce artifacts)
        if phase.workflows:
            primary_workflow = phase.workflows[0]
            artifact_name = (
                primary_workflow.artifact.replace(".md", "").replace(".yaml", "").split("/")[0]
            )
            if artifact_name not in memory.artifacts:
                missing.append(f"Artifact draft: {primary_workflow.artifact}")

        # Check gate check if applicable
        if phase.gate_check and phase.gate_check not in self.gate_checks_passed:
            missing.append(f"Gate check: {phase.gate_check}")

        return len(missing) == 0, missing

    def pass_gate_check(self, gate_id: str) -> None:
        """Mark a gate check as passed."""
        if gate_id not in self.gate_checks_passed:
            self.gate_checks_passed.append(gate_id)

    def can_transition(self, memory: PartyMemory) -> bool:
        """Check if we can transition to next phase."""
        is_complete, _ = self.check_phase_complete(memory)
        return is_complete

    def transition_to_next(self) -> str | None:
        """
        Transition to the next phase.

        Follows BMAD phase order, skipping analysis if configured.

        Returns:
            New phase ID or None if at final phase
        """
        current_idx = PHASE_ORDER.index(self.current_phase)

        # Find next phase
        for next_idx in range(current_idx + 1, len(PHASE_ORDER)):
            next_phase = PHASE_ORDER[next_idx]

            # Skip analysis if configured
            if next_phase == "analysis" and self.skip_analysis:
                continue

            self.current_phase = next_phase
            return next_phase

        return None

    def get_phase_summary(self) -> dict[str, Any]:
        """Get comprehensive summary of current phase progress."""
        phase = PHASES[self.current_phase]
        covered = self.topics_covered.get(self.current_phase, [])

        topics_status = []
        required_count = 0
        required_covered = 0

        for topic in phase.topics:
            is_covered = topic.id in covered
            topics_status.append(
                {
                    "id": topic.id,
                    "name": topic.name,
                    "covered": is_covered,
                    "required": topic.required,
                    "lead_agent": topic.lead_agent,
                    "workflow_step": topic.workflow_step,
                }
            )
            if topic.required:
                required_count += 1
                if is_covered:
                    required_covered += 1

        # Workflow progress
        workflow_status = []
        for workflow in phase.workflows:
            progress = self.get_workflow_progress(workflow.id)
            workflow_status.append(
                {
                    "id": workflow.id,
                    "name": workflow.name,
                    "agent": workflow.agent,
                    "steps_total": len(workflow.steps),
                    "steps_completed": len(progress),
                    "artifact": workflow.artifact,
                }
            )

        return {
            "phase_id": self.current_phase,
            "phase_name": phase.name,
            "phase_description": phase.description,
            "gate_check": phase.gate_check,
            "gate_passed": phase.gate_check in self.gate_checks_passed
            if phase.gate_check
            else True,
            "topics_total": len(phase.topics),
            "topics_covered": len(covered),
            "required_total": required_count,
            "required_covered": required_covered,
            "topics": topics_status,
            "workflows": workflow_status,
        }

    def get_methodology_overview(self) -> dict[str, Any]:
        """Get complete BMAD methodology overview."""
        overview = {
            "current_phase": self.current_phase,
            "phases": [],
        }

        for phase_id in PHASE_ORDER:
            phase = PHASES[phase_id]
            is_current = phase_id == self.current_phase
            is_complete = len(self.topics_covered.get(phase_id, [])) >= len(
                [t for t in phase.topics if t.required]
            )

            overview["phases"].append(
                {
                    "id": phase_id,
                    "name": phase.name,
                    "is_current": is_current,
                    "is_complete": is_complete,
                    "is_required": phase_id in REQUIRED_PHASES,
                    "workflows": [w.name for w in phase.workflows],
                    "topic_count": len(phase.topics),
                }
            )

        return overview

    def get_suggested_topic(self, user_message: str) -> PhaseTopic | None:
        """
        Suggest a topic based on user message.

        Analyzes user message to determine which phase topic
        it relates to, even if not explicitly stated.
        """
        message_lower = user_message.lower()

        # Extended topic keywords for complete BMAD coverage
        topic_keywords = {
            # Analysis topics
            "product-brief": ["brief", "initial", "discovery"],
            "research": ["research", "market", "competitive", "analysis"],
            # Planning topics
            "vision": ["vision", "problem", "why", "purpose", "mission"],
            "users": ["user", "persona", "customer", "audience", "journey"],
            "success": ["success", "metric", "goal", "kpi", "measure"],
            "domain": ["domain", "constraint", "regulation", "compliance"],
            "innovation": ["innovation", "differentiate", "unique", "competitive edge"],
            "scope": ["scope", "mvp", "feature", "requirement", "priority"],
            "functional": ["functional", "feature", "capability", "function"],
            "nonfunctional": ["performance", "security", "scalability", "reliability"],
            "ux-design": ["ux", "ui", "design", "wireframe", "interface"],
            # Solutioning topics
            "architecture": ["architecture", "design", "structure", "pattern"],
            "tech_stack": ["technology", "stack", "framework", "database", "language"],
            "data": ["data", "model", "schema", "storage"],
            "security": ["security", "auth", "encryption", "access"],
            "epics": ["epic", "story", "work", "breakdown", "task"],
            "gate_check": ["ready", "gate", "check", "complete", "review"],
            # Implementation topics
            "sprint_planning": ["sprint", "planning", "backlog", "velocity"],
            "story_creation": ["story", "create", "write", "detail"],
            "development": ["develop", "implement", "code", "build"],
            "code_review": ["review", "pr", "merge", "quality"],
            "retrospective": ["retro", "retrospective", "lessons", "improve"],
        }

        for topic in PHASES[self.current_phase].topics:
            keywords = topic_keywords.get(topic.id, [])
            for keyword in keywords:
                if keyword in message_lower:
                    return topic

        return None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "current_phase": self.current_phase,
            "skip_analysis": self.skip_analysis,
            "topics_covered": self.topics_covered,
            "workflow_progress": self.workflow_progress,
            "gate_checks_passed": self.gate_checks_passed,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PhaseManager":
        """Create from dictionary."""
        manager = cls(
            data.get("current_phase", "planning"),
            data.get("skip_analysis", True),
        )
        manager.topics_covered = data.get("topics_covered", {})
        manager.workflow_progress = data.get("workflow_progress", {})
        manager.gate_checks_passed = data.get("gate_checks_passed", [])
        return manager
