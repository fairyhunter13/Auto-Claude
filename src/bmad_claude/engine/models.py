"""
Data models for BMAD-Claude workflow engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Optional


class WorkflowStatus(str, Enum):
    """Status of a workflow execution."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class StepStatus(str, Enum):
    """Status of a workflow step."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class WorkflowFormat(str, Enum):
    """Format of workflow definition file."""

    YAML = "yaml"
    MARKDOWN = "md"


@dataclass
class StepConfig:
    """Configuration for a single workflow step."""

    id: str
    name: str
    path: Path
    order: int
    description: str = ""
    has_template_output: bool = False
    has_ask_tag: bool = False
    is_continuation: bool = False

    @property
    def filename(self) -> str:
        """Get the step filename."""
        return self.path.name


@dataclass
class StepResult:
    """Result of executing a workflow step."""

    step_id: str
    status: StepStatus
    output: str = ""
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: float = 0.0

    @property
    def is_success(self) -> bool:
        """Check if step completed successfully."""
        return self.status == StepStatus.COMPLETED


@dataclass
class WorkflowConfig:
    """Configuration for a BMAD workflow."""

    id: str
    name: str
    path: Path
    format: WorkflowFormat
    agent_id: str
    description: str = ""
    template_path: Optional[Path] = None
    default_output_path: Optional[Path] = None
    steps: list[StepConfig] = field(default_factory=list)
    variables: dict[str, Any] = field(default_factory=dict)

    @property
    def steps_dir(self) -> Path:
        """Get the steps directory for this workflow."""
        return self.path.parent / "steps"

    @property
    def total_steps(self) -> int:
        """Get total number of steps."""
        return len(self.steps)


@dataclass
class WorkflowState:
    """Runtime state of a workflow execution."""

    workflow_id: str
    workflow_path: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    current_step: Optional[str] = None
    steps_completed: list[str] = field(default_factory=list)
    persona_id: str = ""
    started_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    outputs: dict[str, str] = field(default_factory=dict)
    variables: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    @property
    def percent_complete(self) -> float:
        """Calculate completion percentage."""
        if not self.steps_completed:
            return 0.0
        # We need total_steps from config, estimate from completed
        return len(self.steps_completed) * 10  # Rough estimate

    def mark_step_completed(self, step_id: str) -> None:
        """Mark a step as completed."""
        if step_id not in self.steps_completed:
            self.steps_completed.append(step_id)
        self.updated_at = datetime.now()

    def to_dict(self) -> dict[str, Any]:
        """Convert state to dictionary for serialization."""
        return {
            "workflow_id": self.workflow_id,
            "workflow_path": self.workflow_path,
            "status": self.status.value,
            "current_step": self.current_step,
            "steps_completed": self.steps_completed,
            "persona_id": self.persona_id,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "outputs": self.outputs,
            "variables": self.variables,
            "error": self.error,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> WorkflowState:
        """Create state from dictionary."""
        return cls(
            workflow_id=data["workflow_id"],
            workflow_path=data["workflow_path"],
            status=WorkflowStatus(data.get("status", "pending")),
            current_step=data.get("current_step"),
            steps_completed=data.get("steps_completed", []),
            persona_id=data.get("persona_id", ""),
            started_at=datetime.fromisoformat(data["started_at"])
            if data.get("started_at")
            else None,
            updated_at=datetime.fromisoformat(data["updated_at"])
            if data.get("updated_at")
            else None,
            outputs=data.get("outputs", {}),
            variables=data.get("variables", {}),
            error=data.get("error"),
        )


@dataclass
class WorkflowTransition:
    """Defines a transition between workflows."""

    from_workflow: str
    to_workflow: str
    condition: Optional[str] = None  # e.g., "prd_complete"
    pass_outputs: bool = True  # Pass outputs from previous workflow


@dataclass
class WorkflowChain:
    """A chain of workflows to execute in sequence."""

    name: str
    workflows: list[str]
    transitions: list[WorkflowTransition] = field(default_factory=list)

    @classmethod
    def prd_to_architecture(cls) -> WorkflowChain:
        """Create the PRD-to-Architecture chain."""
        return cls(
            name="prd-to-architecture",
            workflows=["prd", "create-architecture"],
            transitions=[
                WorkflowTransition(
                    from_workflow="prd",
                    to_workflow="create-architecture",
                    condition="prd_complete",
                    pass_outputs=True,
                )
            ],
        )
