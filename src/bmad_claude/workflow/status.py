"""
Workflow Status Tracking.

Tracks progress through BMAD phases and workflows.
Persists status to _bmad-output/planning-artifacts/bmm-workflow-status.yaml
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from bmad_claude.workflow.config import (
    WORKFLOWS,
    PHASES,
    PHASE_ORDER,
    get_phase_workflows,
)


@dataclass
class WorkflowStatus:
    """Status of a single workflow."""

    workflow_id: str
    status: str  # pending, in_progress, completed, skipped, failed
    started_at: datetime | None = None
    completed_at: datetime | None = None
    artifact_path: str | None = None
    error: str | None = None


@dataclass
class PhaseStatus:
    """Status of a BMAD phase."""

    phase_id: str
    status: str  # pending, in_progress, completed, skipped
    workflows: dict[str, WorkflowStatus] = field(default_factory=dict)

    @property
    def is_complete(self) -> bool:
        """Check if all required workflows are complete."""
        phase = PHASES.get(self.phase_id)
        if not phase:
            return False

        for wf_id in phase.workflows:
            wf = WORKFLOWS.get(wf_id)
            if wf and wf.required:
                wf_status = self.workflows.get(wf_id)
                if not wf_status or wf_status.status != "completed":
                    return False
        return True


class StatusTracker:
    """
    Tracks workflow execution status.

    Persists to bmm-workflow-status.yaml for continuity.
    """

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.status_file = (
            project_root / "_bmad-output" / "planning-artifacts" / "bmm-workflow-status.yaml"
        )
        self.phases: dict[str, PhaseStatus] = {}
        self.current_phase: str = "planning"

        # Initialize phases
        for phase_id in PHASE_ORDER:
            self.phases[phase_id] = PhaseStatus(
                phase_id=phase_id,
                status="pending",
                workflows={},
            )

        # Try to load existing status
        self._load()

    def _load(self) -> None:
        """Load status from file if exists."""
        if not self.status_file.exists():
            return

        try:
            with open(self.status_file) as f:
                data = yaml.safe_load(f) or {}

            self.current_phase = data.get("current_phase", "planning")

            for phase_id, phase_data in data.get("phases", {}).items():
                if phase_id not in self.phases:
                    continue

                self.phases[phase_id].status = phase_data.get("status", "pending")

                for wf_id, wf_data in phase_data.get("workflows", {}).items():
                    self.phases[phase_id].workflows[wf_id] = WorkflowStatus(
                        workflow_id=wf_id,
                        status=wf_data.get("status", "pending"),
                        started_at=wf_data.get("started_at"),
                        completed_at=wf_data.get("completed_at"),
                        artifact_path=wf_data.get("artifact_path"),
                        error=wf_data.get("error"),
                    )
        except Exception:
            pass  # Start fresh if file is corrupted

    def save(self) -> None:
        """Save status to file."""
        self.status_file.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "generated": datetime.now().isoformat(),
            "current_phase": self.current_phase,
            "phases": {},
        }

        for phase_id, phase in self.phases.items():
            phase_data = {
                "status": phase.status,
                "workflows": {},
            }

            for wf_id, wf in phase.workflows.items():
                phase_data["workflows"][wf_id] = {
                    "status": wf.status,
                    "started_at": wf.started_at.isoformat() if wf.started_at else None,
                    "completed_at": wf.completed_at.isoformat() if wf.completed_at else None,
                    "artifact_path": wf.artifact_path,
                    "error": wf.error,
                }

            data["phases"][phase_id] = phase_data

        with open(self.status_file, "w") as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    def start_workflow(self, workflow_id: str) -> None:
        """Mark workflow as started."""
        workflow = WORKFLOWS.get(workflow_id)
        if not workflow:
            return

        phase = self.phases.get(workflow.phase)
        if not phase:
            return

        phase.status = "in_progress"
        phase.workflows[workflow_id] = WorkflowStatus(
            workflow_id=workflow_id,
            status="in_progress",
            started_at=datetime.now(),
        )

        self.current_phase = workflow.phase
        self.save()

    def complete_workflow(self, workflow_id: str, artifact_path: str | None = None) -> None:
        """Mark workflow as completed."""
        workflow = WORKFLOWS.get(workflow_id)
        if not workflow:
            return

        phase = self.phases.get(workflow.phase)
        if not phase:
            return

        if workflow_id not in phase.workflows:
            phase.workflows[workflow_id] = WorkflowStatus(
                workflow_id=workflow_id,
                status="completed",
            )

        wf_status = phase.workflows[workflow_id]
        wf_status.status = "completed"
        wf_status.completed_at = datetime.now()
        wf_status.artifact_path = artifact_path

        # Check if phase is complete
        if phase.is_complete:
            phase.status = "completed"

        self.save()

    def fail_workflow(self, workflow_id: str, error: str) -> None:
        """Mark workflow as failed."""
        workflow = WORKFLOWS.get(workflow_id)
        if not workflow:
            return

        phase = self.phases.get(workflow.phase)
        if not phase:
            return

        if workflow_id not in phase.workflows:
            phase.workflows[workflow_id] = WorkflowStatus(
                workflow_id=workflow_id,
                status="failed",
            )

        wf_status = phase.workflows[workflow_id]
        wf_status.status = "failed"
        wf_status.completed_at = datetime.now()
        wf_status.error = error

        self.save()

    def skip_workflow(self, workflow_id: str) -> None:
        """Mark workflow as skipped."""
        workflow = WORKFLOWS.get(workflow_id)
        if not workflow:
            return

        phase = self.phases.get(workflow.phase)
        if not phase:
            return

        phase.workflows[workflow_id] = WorkflowStatus(
            workflow_id=workflow_id,
            status="skipped",
            completed_at=datetime.now(),
        )

        self.save()

    def get_next_workflow(self) -> str | None:
        """Get the next workflow to run."""
        completed = self.get_completed_workflows()

        for phase_id in PHASE_ORDER:
            phase = self.phases.get(phase_id)
            if not phase:
                continue

            # Skip completed phases
            if phase.status == "completed":
                continue

            # Find first incomplete required workflow
            for wf in get_phase_workflows(phase_id):
                if wf.id in completed:
                    continue
                if not wf.required:
                    continue

                # Check dependencies
                missing = [dep for dep in wf.depends_on if dep not in completed]
                if missing:
                    continue

                return wf.id

        return None

    def get_completed_workflows(self) -> list[str]:
        """Get list of completed workflow IDs."""
        completed = []
        for phase in self.phases.values():
            for wf_id, wf in phase.workflows.items():
                if wf.status == "completed":
                    completed.append(wf_id)
        return completed

    def get_summary(self) -> dict[str, Any]:
        """Get status summary."""
        completed = self.get_completed_workflows()
        total_required = sum(1 for wf in WORKFLOWS.values() if wf.required)
        completed_required = sum(1 for wf_id in completed if WORKFLOWS.get(wf_id, {}).required)

        return {
            "current_phase": self.current_phase,
            "total_workflows": len(WORKFLOWS),
            "completed_workflows": len(completed),
            "total_required": total_required,
            "completed_required": completed_required,
            "next_workflow": self.get_next_workflow(),
            "phases": {
                phase_id: {
                    "status": phase.status,
                    "is_complete": phase.is_complete,
                    "workflows_completed": len(
                        [wf for wf in phase.workflows.values() if wf.status == "completed"]
                    ),
                    "workflows_total": len(PHASES[phase_id].workflows),
                }
                for phase_id, phase in self.phases.items()
            },
        }

    def display(self) -> str:
        """Generate human-readable status display."""
        summary = self.get_summary()

        lines = [
            "=" * 60,
            "BMAD Workflow Status",
            "=" * 60,
            f"Current Phase: {summary['current_phase'].upper()}",
            f"Progress: {summary['completed_required']}/{summary['total_required']} required workflows",
            "",
        ]

        for phase_id in PHASE_ORDER:
            phase_info = summary["phases"][phase_id]
            phase_config = PHASES[phase_id]

            status_icon = {
                "pending": "○",
                "in_progress": "→",
                "completed": "✓",
                "skipped": "⊘",
            }.get(phase_info["status"], "?")

            lines.append(f"{status_icon} {phase_config.name}")
            lines.append(
                f"  Workflows: {phase_info['workflows_completed']}/{phase_info['workflows_total']}"
            )

            # Show individual workflows
            phase = self.phases[phase_id]
            for wf_id in phase_config.workflows:
                wf_config = WORKFLOWS.get(wf_id)
                wf_status = phase.workflows.get(wf_id)

                if wf_status:
                    wf_icon = {
                        "pending": "  ○",
                        "in_progress": "  →",
                        "completed": "  ✓",
                        "skipped": "  ⊘",
                        "failed": "  ✗",
                    }.get(wf_status.status, "  ?")
                else:
                    wf_icon = "  ○"

                req = "" if wf_config and wf_config.required else " (optional)"
                lines.append(f"  {wf_icon} {wf_config.name if wf_config else wf_id}{req}")

            lines.append("")

        next_wf = summary["next_workflow"]
        if next_wf:
            lines.append(f"Next: {WORKFLOWS[next_wf].name}")
        else:
            lines.append("All required workflows complete!")

        lines.append("=" * 60)

        return "\n".join(lines)
