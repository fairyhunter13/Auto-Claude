"""
Workflow Runner - Executes BMAD workflows via OpenCode agents.

This is the core of the workflow automation system.
Each workflow is executed by invoking OpenCode with the appropriate agent.
"""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Callable

from bmad_claude.workflow.config import (
    WORKFLOWS,
    PHASES,
    PHASE_ORDER,
    WorkflowConfig,
    get_workflow,
    get_phase_workflows,
    check_dependencies,
)
from bmad_claude.workflow.status import StatusTracker


class WorkflowRunner:
    """
    Executes BMAD workflows using OpenCode agents.

    Each workflow is run by:
    1. Activating the designated agent via --agent flag
    2. Invoking the BMAD workflow command
    3. Tracking progress and status

    Usage:
        runner = WorkflowRunner(project_root=Path("."))
        await runner.run_workflow("prd")
        await runner.run_phase("planning")
        await runner.run_all()
    """

    def __init__(
        self,
        project_root: Path | None = None,
        opencode_path: str = "opencode",
        verbose: bool = True,
    ):
        self.project_root = project_root or Path.cwd()
        self.opencode_path = opencode_path
        self.verbose = verbose
        self.status = StatusTracker(self.project_root)

    def _log(self, msg: str) -> None:
        """Log message if verbose."""
        if self.verbose:
            print(msg)

    async def run_workflow(
        self,
        workflow_id: str,
        on_output: Callable[[str], None] | None = None,
    ) -> bool:
        """
        Run a single BMAD workflow.

        Args:
            workflow_id: ID of workflow to run
            on_output: Callback for streaming output

        Returns:
            True if successful, False otherwise
        """
        workflow = get_workflow(workflow_id)
        if not workflow:
            self._log(f"Unknown workflow: {workflow_id}")
            return False

        # Check dependencies
        completed = self.status.get_completed_workflows()
        can_run, missing = check_dependencies(workflow_id, completed)

        if not can_run:
            self._log(f"Cannot run {workflow.name}: missing dependencies {missing}")
            return False

        self._log(f"\n{'=' * 60}")
        self._log(f"Running: {workflow.name}")
        self._log(f"Agent: {workflow.agent}")
        self._log(f"Command: {workflow.command}")
        self._log(f"{'=' * 60}\n")

        # Mark as started
        self.status.start_workflow(workflow_id)

        try:
            # Build OpenCode command
            cmd = [
                self.opencode_path,
                "--agent",
                workflow.agent,
                "run",
                workflow.command,
            ]

            # Execute with streaming output
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_root),
            )

            # Stream stdout
            full_output = []
            while True:
                chunk = await process.stdout.read(100)
                if not chunk:
                    break

                text = chunk.decode("utf-8", errors="replace")
                full_output.append(text)

                if on_output:
                    on_output(text)
                elif self.verbose:
                    print(text, end="", flush=True)

            await process.wait()

            if process.returncode != 0:
                stderr = await process.stderr.read()
                error_msg = stderr.decode("utf-8", errors="replace")
                self._log(f"\nWorkflow failed: {error_msg}")
                self.status.fail_workflow(workflow_id, error_msg)
                return False

            # Check for artifact
            artifact_path = self._find_artifact(workflow)

            self._log(f"\n{'=' * 60}")
            self._log(f"Completed: {workflow.name}")
            if artifact_path:
                self._log(f"Artifact: {artifact_path}")
            self._log(f"{'=' * 60}\n")

            self.status.complete_workflow(
                workflow_id, str(artifact_path) if artifact_path else None
            )
            return True

        except FileNotFoundError:
            error = f"OpenCode not found at: {self.opencode_path}"
            self._log(error)
            self.status.fail_workflow(workflow_id, error)
            return False
        except Exception as e:
            self._log(f"Error running workflow: {e}")
            self.status.fail_workflow(workflow_id, str(e))
            return False

    def _find_artifact(self, workflow: WorkflowConfig) -> Path | None:
        """Find the artifact produced by a workflow."""
        # Standard artifact locations
        artifact_paths = [
            self.project_root / "_bmad-output" / "planning-artifacts" / workflow.artifact,
            self.project_root / "_bmad-output" / "implementation-artifacts" / workflow.artifact,
        ]

        for path in artifact_paths:
            # Handle glob patterns in artifact path
            if "{" in str(path):
                parent = path.parent
                if parent.exists():
                    # Find any matching files
                    pattern = path.name.replace("{story-id}", "*").replace("{sprint}", "*")
                    matches = list(parent.glob(pattern))
                    if matches:
                        return matches[0]
            elif path.exists():
                return path

        return None

    async def run_phase(
        self,
        phase_id: str,
        skip_optional: bool = True,
        on_output: Callable[[str], None] | None = None,
    ) -> bool:
        """
        Run all workflows in a phase.

        Args:
            phase_id: Phase to run
            skip_optional: Skip optional workflows
            on_output: Callback for streaming output

        Returns:
            True if all required workflows succeeded
        """
        phase = PHASES.get(phase_id)
        if not phase:
            self._log(f"Unknown phase: {phase_id}")
            return False

        self._log(f"\n{'#' * 60}")
        self._log(f"# PHASE: {phase.name.upper()}")
        self._log(f"# {phase.description}")
        self._log(f"{'#' * 60}\n")

        workflows = get_phase_workflows(phase_id)
        success = True

        for workflow in workflows:
            # Skip optional if requested
            if skip_optional and not workflow.required:
                self._log(f"Skipping optional: {workflow.name}")
                self.status.skip_workflow(workflow.id)
                continue

            # Skip if already completed
            if workflow.id in self.status.get_completed_workflows():
                self._log(f"Already completed: {workflow.name}")
                continue

            result = await self.run_workflow(workflow.id, on_output)

            if not result and workflow.required:
                self._log(f"Required workflow failed: {workflow.name}")
                success = False
                break  # Stop on required workflow failure

        return success

    async def run_all(
        self,
        skip_analysis: bool = True,
        skip_optional: bool = True,
        on_output: Callable[[str], None] | None = None,
    ) -> bool:
        """
        Run all BMAD phases in order.

        Args:
            skip_analysis: Skip optional analysis phase
            skip_optional: Skip optional workflows within phases
            on_output: Callback for streaming output

        Returns:
            True if all required workflows succeeded
        """
        self._log("\n" + "=" * 60)
        self._log("BMAD METHODOLOGY - FULL EXECUTION")
        self._log("=" * 60 + "\n")

        for phase_id in PHASE_ORDER:
            # Skip analysis if requested
            if phase_id == "analysis" and skip_analysis:
                self._log("Skipping optional Analysis phase")
                continue

            result = await self.run_phase(phase_id, skip_optional, on_output)

            if not result:
                self._log(f"\nPhase {phase_id} failed. Stopping.")
                return False

            # Check gate if applicable
            phase = PHASES[phase_id]
            if phase.gate_check:
                self._log(f"\nGate Check: {phase.gate_check}")
                if phase.gate_check not in self.status.get_completed_workflows():
                    self._log(f"Gate check not passed: {phase.gate_check}")
                    return False

        self._log("\n" + "=" * 60)
        self._log("BMAD METHODOLOGY COMPLETE")
        self._log("=" * 60 + "\n")

        return True

    def get_status(self) -> str:
        """Get current workflow status display."""
        return self.status.display()

    def get_next(self) -> str | None:
        """Get the next workflow to run."""
        next_id = self.status.get_next_workflow()
        if next_id:
            workflow = get_workflow(next_id)
            return f"{workflow.name} (agent: {workflow.agent})" if workflow else next_id
        return None


# =============================================================================
# Convenience Functions
# =============================================================================


async def run_workflow(workflow_id: str, verbose: bool = True) -> bool:
    """Quick function to run a single workflow."""
    runner = WorkflowRunner(verbose=verbose)
    return await runner.run_workflow(workflow_id)


async def run_phase(phase_id: str, verbose: bool = True) -> bool:
    """Quick function to run a phase."""
    runner = WorkflowRunner(verbose=verbose)
    return await runner.run_phase(phase_id)


async def run_all(verbose: bool = True) -> bool:
    """Quick function to run full BMAD methodology."""
    runner = WorkflowRunner(verbose=verbose)
    return await runner.run_all()


def show_status() -> None:
    """Show current workflow status."""
    runner = WorkflowRunner(verbose=False)
    print(runner.get_status())
