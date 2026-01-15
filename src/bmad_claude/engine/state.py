"""
BMAD-Claude State Manager

Handles persistence and recovery of workflow execution state.
"""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional

import yaml

from bmad_claude.engine.models import (
    StepStatus,
    WorkflowState,
    WorkflowStatus,
)


class StateError(Exception):
    """Raised when state operations fail."""

    pass


class StateManager:
    """
    Manages workflow execution state.

    Provides:
    - State persistence to YAML files
    - State recovery for interrupted workflows
    - Backup management
    - Progress tracking
    """

    def __init__(self, state_dir: Path = Path(".bmad-claude/state")):
        """
        Initialize the state manager.

        Args:
            state_dir: Directory for state files.
        """
        self.state_dir = state_dir
        self.backup_dir = state_dir / "backups"
        self._ensure_dirs()

    def _ensure_dirs(self) -> None:
        """Ensure state directories exist."""
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def _get_state_path(self, workflow_id: str) -> Path:
        """Get path to state file for a workflow."""
        return self.state_dir / f"workflow-{workflow_id}.yaml"

    def _get_backup_path(self, workflow_id: str, timestamp: datetime) -> Path:
        """Get path to backup file."""
        ts = timestamp.strftime("%Y%m%d-%H%M%S")
        return self.backup_dir / f"workflow-{workflow_id}-{ts}.yaml"

    def create(
        self,
        workflow_id: str,
        workflow_path: str,
        persona_id: str = "",
        variables: dict = None,
    ) -> WorkflowState:
        """
        Create a new workflow state.

        Args:
            workflow_id: Unique identifier for the workflow.
            workflow_path: Path to the workflow file.
            persona_id: ID of the agent persona.
            variables: Initial variables.

        Returns:
            New WorkflowState instance.
        """
        state = WorkflowState(
            workflow_id=workflow_id,
            workflow_path=workflow_path,
            status=WorkflowStatus.PENDING,
            persona_id=persona_id,
            started_at=datetime.now(),
            updated_at=datetime.now(),
            variables=variables or {},
        )

        self.save(state)
        return state

    def save(self, state: WorkflowState, create_backup: bool = True) -> None:
        """
        Save workflow state to disk.

        Args:
            state: WorkflowState to save.
            create_backup: Whether to create a backup before saving.
        """
        state_path = self._get_state_path(state.workflow_id)

        # Create backup of existing state
        if create_backup and state_path.exists():
            self._create_backup(state.workflow_id)

        # Update timestamp
        state.updated_at = datetime.now()

        # Write state
        state_data = {
            "schema_version": 1,
            "workflow": {
                "id": state.workflow_id,
                "path": state.workflow_path,
            },
            "timing": {
                "started_at": state.started_at.isoformat()
                if state.started_at
                else None,
                "updated_at": state.updated_at.isoformat()
                if state.updated_at
                else None,
            },
            "progress": {
                "status": state.status.value,
                "current_step": state.current_step,
                "steps_completed": state.steps_completed,
            },
            "persona": {
                "id": state.persona_id,
            },
            "outputs": state.outputs,
            "variables": state.variables,
            "error": state.error,
        }

        # Atomic write
        temp_path = state_path.with_suffix(".tmp")
        try:
            temp_path.write_text(
                yaml.safe_dump(state_data, default_flow_style=False, sort_keys=False),
                encoding="utf-8",
            )
            temp_path.replace(state_path)
        except Exception as e:
            temp_path.unlink(missing_ok=True)
            raise StateError(f"Failed to save state: {e}")

    def load(self, workflow_id: str) -> Optional[WorkflowState]:
        """
        Load workflow state from disk.

        Args:
            workflow_id: Workflow identifier.

        Returns:
            WorkflowState if found, None otherwise.
        """
        state_path = self._get_state_path(workflow_id)

        if not state_path.exists():
            return None

        try:
            content = state_path.read_text(encoding="utf-8")
            data = yaml.safe_load(content)

            if not data:
                return None

            return WorkflowState(
                workflow_id=data["workflow"]["id"],
                workflow_path=data["workflow"]["path"],
                status=WorkflowStatus(data["progress"]["status"]),
                current_step=data["progress"].get("current_step"),
                steps_completed=data["progress"].get("steps_completed", []),
                persona_id=data.get("persona", {}).get("id", ""),
                started_at=datetime.fromisoformat(data["timing"]["started_at"])
                if data["timing"].get("started_at")
                else None,
                updated_at=datetime.fromisoformat(data["timing"]["updated_at"])
                if data["timing"].get("updated_at")
                else None,
                outputs=data.get("outputs", {}),
                variables=data.get("variables", {}),
                error=data.get("error"),
            )
        except Exception as e:
            raise StateError(f"Failed to load state: {e}")

    def exists(self, workflow_id: str) -> bool:
        """Check if state exists for a workflow."""
        return self._get_state_path(workflow_id).exists()

    def delete(self, workflow_id: str, keep_backup: bool = True) -> None:
        """
        Delete workflow state.

        Args:
            workflow_id: Workflow identifier.
            keep_backup: Whether to backup before deletion.
        """
        state_path = self._get_state_path(workflow_id)

        if keep_backup and state_path.exists():
            self._create_backup(workflow_id)

        state_path.unlink(missing_ok=True)

    def _create_backup(self, workflow_id: str) -> None:
        """Create a backup of current state."""
        state_path = self._get_state_path(workflow_id)
        if not state_path.exists():
            return

        backup_path = self._get_backup_path(workflow_id, datetime.now())
        shutil.copy2(state_path, backup_path)

        # Cleanup old backups (keep last 10)
        self._cleanup_backups(workflow_id, keep=10)

    def _cleanup_backups(self, workflow_id: str, keep: int = 10) -> None:
        """Remove old backups, keeping the most recent ones."""
        pattern = f"workflow-{workflow_id}-*.yaml"
        backups = sorted(self.backup_dir.glob(pattern), reverse=True)

        for backup in backups[keep:]:
            backup.unlink(missing_ok=True)

    def restore_from_backup(
        self, workflow_id: str, backup_index: int = 0
    ) -> Optional[WorkflowState]:
        """
        Restore state from a backup.

        Args:
            workflow_id: Workflow identifier.
            backup_index: Index of backup (0 = most recent).

        Returns:
            Restored WorkflowState if successful.
        """
        pattern = f"workflow-{workflow_id}-*.yaml"
        backups = sorted(self.backup_dir.glob(pattern), reverse=True)

        if backup_index >= len(backups):
            return None

        backup_path = backups[backup_index]
        state_path = self._get_state_path(workflow_id)

        # Restore backup
        shutil.copy2(backup_path, state_path)

        return self.load(workflow_id)

    def list_workflows(self) -> list[str]:
        """List all workflow IDs with saved state."""
        workflows = []
        for state_file in self.state_dir.glob("workflow-*.yaml"):
            # Extract workflow ID from filename
            name = state_file.stem
            if name.startswith("workflow-"):
                workflows.append(name[9:])  # Remove "workflow-" prefix
        return workflows

    def get_in_progress(self) -> list[WorkflowState]:
        """Get all workflows that are currently in progress."""
        states = []
        for workflow_id in self.list_workflows():
            state = self.load(workflow_id)
            if state and state.status == WorkflowStatus.IN_PROGRESS:
                states.append(state)
        return states

    def update_step(
        self,
        state: WorkflowState,
        step_id: str,
        status: StepStatus,
        output: str = "",
    ) -> None:
        """
        Update state after step execution.

        Args:
            state: Current workflow state.
            step_id: ID of completed step.
            status: Status of the step.
            output: Output from the step.
        """
        if status == StepStatus.COMPLETED:
            state.mark_step_completed(step_id)

        state.current_step = step_id
        state.updated_at = datetime.now()

        if output:
            state.outputs[step_id] = output

        self.save(state)

    def mark_completed(
        self, state: WorkflowState, output_path: Optional[str] = None
    ) -> None:
        """
        Mark workflow as completed.

        Args:
            state: Workflow state.
            output_path: Path to primary output file.
        """
        state.status = WorkflowStatus.COMPLETED
        state.updated_at = datetime.now()

        if output_path:
            state.outputs["primary"] = output_path

        self.save(state, create_backup=False)

    def mark_failed(self, state: WorkflowState, error: str) -> None:
        """
        Mark workflow as failed.

        Args:
            state: Workflow state.
            error: Error message.
        """
        state.status = WorkflowStatus.FAILED
        state.error = error
        state.updated_at = datetime.now()

        self.save(state)

    def mark_paused(self, state: WorkflowState) -> None:
        """Mark workflow as paused."""
        state.status = WorkflowStatus.PAUSED
        state.updated_at = datetime.now()
        self.save(state)
