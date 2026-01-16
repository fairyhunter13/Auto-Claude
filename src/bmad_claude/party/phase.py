"""
PhaseManager - Manages BMAD phase progression within party mode.

Guides discussions through:
- Phase 2: Planning (PRD)
- Phase 3: Solutioning (Architecture, Epics)
- Phase 4: Implementation (Sprint Planning)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from bmad_claude.party.memory import PartyMemory


@dataclass
class PhaseTopic:
    """A discussion topic within a phase."""

    id: str
    name: str
    description: str
    lead_agent: str
    supporting_agents: list[str]
    artifact_section: str | None = None  # Section of artifact this produces
    required: bool = True


@dataclass
class PhaseDefinition:
    """Definition of a BMAD phase."""

    id: str
    name: str
    description: str
    artifact: str  # Primary artifact produced
    topics: list[PhaseTopic]


# Phase definitions with discussion topics
PHASES: dict[str, PhaseDefinition] = {
    "planning": PhaseDefinition(
        id="planning",
        name="Planning",
        description="Define what we're building and for whom",
        artifact="prd.md",
        topics=[
            PhaseTopic(
                id="vision",
                name="Product Vision",
                description="What problem are we solving? Why does this need to exist?",
                lead_agent="pm",
                supporting_agents=["analyst"],
                artifact_section="executive_summary",
            ),
            PhaseTopic(
                id="users",
                name="Target Users",
                description="Who are the users? What are their personas and journeys?",
                lead_agent="pm",
                supporting_agents=["analyst", "ux-designer"],
                artifact_section="user_personas",
            ),
            PhaseTopic(
                id="success",
                name="Success Metrics",
                description="How do we measure success? What are the goals?",
                lead_agent="pm",
                supporting_agents=["analyst"],
                artifact_section="success_metrics",
            ),
            PhaseTopic(
                id="scope",
                name="MVP Scope",
                description="What's in MVP? What's out? Feature prioritization.",
                lead_agent="pm",
                supporting_agents=["architect"],
                artifact_section="requirements",
            ),
        ],
    ),
    "solutioning": PhaseDefinition(
        id="solutioning",
        name="Solutioning",
        description="Design how we'll build it",
        artifact="architecture.md",
        topics=[
            PhaseTopic(
                id="architecture",
                name="System Architecture",
                description="How should we structure the system? What patterns?",
                lead_agent="architect",
                supporting_agents=["dev"],
                artifact_section="architecture",
            ),
            PhaseTopic(
                id="tech_stack",
                name="Technology Stack",
                description="What technologies should we use? Why?",
                lead_agent="architect",
                supporting_agents=["dev"],
                artifact_section="tech_stack",
            ),
            PhaseTopic(
                id="epics",
                name="Epic Breakdown",
                description="What are the major work items? How do we break them down?",
                lead_agent="pm",
                supporting_agents=["architect", "sm"],
                artifact_section="epics",
            ),
            PhaseTopic(
                id="gate_check",
                name="Implementation Readiness",
                description="Is everything ready to build? Any gaps?",
                lead_agent="architect",
                supporting_agents=["pm", "tea"],
                artifact_section="gate_check",
                required=True,
            ),
        ],
    ),
    "implementation": PhaseDefinition(
        id="implementation",
        name="Implementation",
        description="Plan and execute the build",
        artifact="sprint-status.yaml",
        topics=[
            PhaseTopic(
                id="sprint_planning",
                name="Sprint Planning",
                description="What goes in sprint 1? Story prioritization.",
                lead_agent="sm",
                supporting_agents=["pm", "dev"],
                artifact_section="sprint_1",
            ),
        ],
    ),
}

# Phase order
PHASE_ORDER = ["planning", "solutioning", "implementation"]


class PhaseManager:
    """
    Manages BMAD phase progression within party mode.

    Tracks:
    - Current phase
    - Topics covered within phase
    - Phase completion criteria
    - Phase transitions
    """

    def __init__(self, initial_phase: str = "planning"):
        self.current_phase = initial_phase
        self.topics_covered: dict[str, list[str]] = {}  # phase -> [topic_ids]
        for phase in PHASE_ORDER:
            self.topics_covered[phase] = []

    def get_current_phase(self) -> PhaseDefinition:
        """Get current phase definition."""
        return PHASES[self.current_phase]

    def get_current_topics(self) -> list[PhaseTopic]:
        """Get discussion topics for current phase."""
        return PHASES[self.current_phase].topics

    def get_next_topic(self) -> PhaseTopic | None:
        """Get the next uncovered topic in current phase."""
        covered = self.topics_covered.get(self.current_phase, [])

        for topic in PHASES[self.current_phase].topics:
            if topic.id not in covered:
                return topic

        return None

    def mark_topic_covered(self, topic_id: str) -> None:
        """Mark a topic as covered."""
        if self.current_phase not in self.topics_covered:
            self.topics_covered[self.current_phase] = []

        if topic_id not in self.topics_covered[self.current_phase]:
            self.topics_covered[self.current_phase].append(topic_id)

    def check_phase_complete(
        self,
        memory: PartyMemory,
    ) -> tuple[bool, list[str]]:
        """
        Check if current phase milestone is met.

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

        # Check artifact draft exists
        artifact_name = phase.artifact.replace(".md", "").replace(".yaml", "")
        if artifact_name not in memory.artifacts:
            missing.append(f"Artifact draft: {phase.artifact}")

        return len(missing) == 0, missing

    def can_transition(self, memory: PartyMemory) -> bool:
        """Check if we can transition to next phase."""
        is_complete, _ = self.check_phase_complete(memory)
        return is_complete

    def transition_to_next(self) -> str | None:
        """
        Transition to the next phase.

        Returns:
            New phase ID or None if at final phase
        """
        current_idx = PHASE_ORDER.index(self.current_phase)

        if current_idx < len(PHASE_ORDER) - 1:
            self.current_phase = PHASE_ORDER[current_idx + 1]
            return self.current_phase

        return None

    def get_phase_summary(self) -> dict[str, Any]:
        """Get summary of current phase progress."""
        phase = PHASES[self.current_phase]
        covered = self.topics_covered.get(self.current_phase, [])

        topics_status = []
        for topic in phase.topics:
            topics_status.append(
                {
                    "id": topic.id,
                    "name": topic.name,
                    "covered": topic.id in covered,
                    "required": topic.required,
                }
            )

        return {
            "phase_id": self.current_phase,
            "phase_name": phase.name,
            "artifact": phase.artifact,
            "topics_total": len(phase.topics),
            "topics_covered": len(covered),
            "topics": topics_status,
        }

    def get_suggested_topic(self, user_message: str) -> PhaseTopic | None:
        """
        Suggest a topic based on user message.

        Analyzes user message to determine which phase topic
        it relates to, even if not explicitly stated.

        Args:
            user_message: User's input

        Returns:
            Matching PhaseTopic or None
        """
        message_lower = user_message.lower()

        # Topic keywords
        topic_keywords = {
            "vision": ["vision", "problem", "why", "purpose", "mission"],
            "users": ["user", "persona", "customer", "audience", "journey"],
            "success": ["success", "metric", "goal", "kpi", "measure"],
            "scope": ["scope", "mvp", "feature", "requirement", "priority"],
            "architecture": ["architecture", "design", "structure", "pattern"],
            "tech_stack": ["technology", "stack", "framework", "database", "language"],
            "epics": ["epic", "story", "work", "breakdown", "task"],
            "gate_check": ["ready", "gate", "check", "complete", "review"],
            "sprint_planning": ["sprint", "planning", "backlog", "velocity"],
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
            "topics_covered": self.topics_covered,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "PhaseManager":
        """Create from dictionary."""
        manager = cls(data.get("current_phase", "planning"))
        manager.topics_covered = data.get("topics_covered", {})
        return manager
