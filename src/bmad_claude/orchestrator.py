"""
BMAD-Claude Workflow Orchestrator

Main orchestrator that coordinates workflow execution.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

from bmad_claude.engine.models import (
    StepStatus,
    WorkflowChain,
    WorkflowConfig,
    WorkflowState,
    WorkflowStatus,
)
from bmad_claude.engine.parser import WorkflowParser
from bmad_claude.engine.state import StateManager
from bmad_claude.engine.executor import StepExecutor, ExecutionConfig
from bmad_claude.persona.loader import PersonaLoader
from bmad_claude.persona.models import AgentPersona


@dataclass
class OrchestratorConfig:
    """Configuration for the orchestrator."""

    bmad_root: Path = Path("_bmad")
    state_dir: Path = Path(".bmad-claude/state")
    output_dir: Path = Path("_bmad-output")
    auto_approve_checkpoints: bool = True
    max_retries: int = 3
    verbose: bool = True


@dataclass
class WorkflowResult:
    """Result of a workflow execution."""

    workflow_id: str
    status: WorkflowStatus
    output_path: Optional[Path] = None
    steps_completed: int = 0
    total_steps: int = 0
    duration_seconds: float = 0.0
    error: Optional[str] = None

    @property
    def is_success(self) -> bool:
        return self.status == WorkflowStatus.COMPLETED


class WorkflowOrchestrator:
    """
    Main orchestrator for BMAD-Claude workflow execution.

    Coordinates:
    - Workflow parsing and discovery
    - Persona loading and injection
    - Step-by-step execution
    - State management and recovery
    - Output handling
    """

    def __init__(
        self,
        config: OrchestratorConfig = None,
        llm_callback: Callable[[str, str], str] = None,
    ):
        """
        Initialize the orchestrator.

        Args:
            config: Orchestrator configuration.
            llm_callback: Callback for LLM interaction (system_prompt, user_prompt) -> response.
        """
        self.config = config or OrchestratorConfig()
        self.parser = WorkflowParser(self.config.bmad_root)
        self.state_manager = StateManager(self.config.state_dir)
        self.persona_loader = PersonaLoader(self.config.bmad_root)
        self.executor = StepExecutor(
            llm_callback=llm_callback,
            config=ExecutionConfig(max_retries=self.config.max_retries),
        )

        # Progress callback
        self.on_progress: Optional[Callable[[str, str, int, int], None]] = None

    def _log(self, message: str) -> None:
        """Log a message if verbose mode is enabled."""
        if self.config.verbose:
            print(message)

    async def run_workflow(
        self,
        workflow_id: str,
        variables: dict[str, Any] = None,
        resume: bool = True,
    ) -> WorkflowResult:
        """
        Run a single workflow.

        Args:
            workflow_id: Workflow identifier (e.g., 'prd', 'create-architecture').
            variables: Variables to pass to the workflow.
            resume: Whether to resume from existing state if available.

        Returns:
            WorkflowResult with execution outcome.
        """
        started_at = datetime.now()

        # Parse workflow
        workflow = self.parser.get_workflow_by_id(workflow_id)
        if not workflow:
            return WorkflowResult(
                workflow_id=workflow_id,
                status=WorkflowStatus.FAILED,
                error=f"Workflow not found: {workflow_id}",
            )

        self._log(f"\n{'=' * 60}")
        self._log(f"Starting workflow: {workflow.name} ({workflow_id})")
        self._log(f"Steps: {workflow.total_steps}")
        self._log(f"{'=' * 60}\n")

        # Load or create state
        if resume and self.state_manager.exists(workflow_id):
            state = self.state_manager.load(workflow_id)
            if state.status == WorkflowStatus.COMPLETED:
                self._log(f"Workflow already completed. Use resume=False to restart.")
                return WorkflowResult(
                    workflow_id=workflow_id,
                    status=WorkflowStatus.COMPLETED,
                    steps_completed=len(state.steps_completed),
                    total_steps=workflow.total_steps,
                )
            self._log(f"Resuming from step: {state.current_step}")
        else:
            state = self.state_manager.create(
                workflow_id=workflow_id,
                workflow_path=str(workflow.path),
                persona_id=workflow.agent_id,
                variables=variables or {},
            )

        # Load persona
        persona = self.persona_loader.get(workflow.agent_id)
        if not persona:
            persona = self.persona_loader.get_for_workflow(workflow_id)
        if not persona:
            # Use default persona
            from bmad_claude.persona.models import PERSONAS

            persona = PERSONAS.get("pm")

        self._log(f"Agent: {persona.display_name} ({persona.title}) {persona.icon}")

        # Update state
        state.status = WorkflowStatus.IN_PROGRESS
        state.persona_id = persona.id
        self.state_manager.save(state)

        # Execute steps
        try:
            result = await self._execute_steps(workflow, state, persona)

            completed_at = datetime.now()
            result.duration_seconds = (completed_at - started_at).total_seconds()

            return result

        except Exception as e:
            self.state_manager.mark_failed(state, str(e))
            return WorkflowResult(
                workflow_id=workflow_id,
                status=WorkflowStatus.FAILED,
                error=str(e),
                steps_completed=len(state.steps_completed),
                total_steps=workflow.total_steps,
            )

    async def _execute_steps(
        self,
        workflow: WorkflowConfig,
        state: WorkflowState,
        persona: AgentPersona,
    ) -> WorkflowResult:
        """Execute workflow steps sequentially."""

        for i, step in enumerate(workflow.steps):
            # Skip completed steps
            if step.id in state.steps_completed:
                continue

            # Skip continuation steps unless needed
            if (
                step.is_continuation
                and step.id.replace("b-", "-") not in state.steps_completed
            ):
                continue

            self._log(f"\n[{i + 1}/{workflow.total_steps}] {step.name}")
            self._log(f"    Step ID: {step.id}")

            # Update progress callback
            if self.on_progress:
                self.on_progress(
                    workflow.id,
                    step.id,
                    i + 1,
                    workflow.total_steps,
                )

            # Execute step
            result = await self.executor.execute(
                step=step,
                workflow=workflow,
                state=state,
                persona=persona,
                on_progress=lambda chunk: print(chunk, end="", flush=True)
                if self.config.verbose
                else None,
            )

            if result.is_success:
                self._log(f"    ✅ Completed ({result.duration_seconds:.1f}s)")

                # Process output
                _, template_content = self.executor.process_output(result.output, step)

                # Save template output if present
                if template_content and workflow.default_output_path:
                    self._save_output(
                        workflow.default_output_path, template_content, append=True
                    )

                # Update state
                self.state_manager.update_step(
                    state=state,
                    step_id=step.id,
                    status=StepStatus.COMPLETED,
                    output=result.output[:1000],  # Truncate for state storage
                )
            else:
                self._log(f"    ❌ Failed: {result.error}")
                self.state_manager.mark_failed(state, result.error)

                return WorkflowResult(
                    workflow_id=workflow.id,
                    status=WorkflowStatus.FAILED,
                    error=result.error,
                    steps_completed=len(state.steps_completed),
                    total_steps=workflow.total_steps,
                )

        # All steps completed
        output_path = workflow.default_output_path
        self.state_manager.mark_completed(
            state, str(output_path) if output_path else None
        )

        self._log(f"\n{'=' * 60}")
        self._log(f"✅ Workflow completed: {workflow.name}")
        if output_path:
            self._log(f"   Output: {output_path}")
        self._log(f"{'=' * 60}\n")

        return WorkflowResult(
            workflow_id=workflow.id,
            status=WorkflowStatus.COMPLETED,
            output_path=output_path,
            steps_completed=len(state.steps_completed),
            total_steps=workflow.total_steps,
        )

    def _save_output(
        self, output_path: Path, content: str, append: bool = False
    ) -> None:
        """Save output to file."""
        # Ensure directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        mode = "a" if append else "w"
        with open(output_path, mode, encoding="utf-8") as f:
            f.write(content)
            if append:
                f.write("\n\n")

    async def run_workflow_chain(
        self,
        chain: WorkflowChain,
        variables: dict[str, Any] = None,
    ) -> list[WorkflowResult]:
        """
        Run a chain of workflows in sequence.

        Args:
            chain: Workflow chain definition.
            variables: Variables to pass to workflows.

        Returns:
            List of WorkflowResult for each workflow.
        """
        results = []
        current_vars = variables or {}

        self._log(f"\n{'#' * 60}")
        self._log(f"Starting workflow chain: {chain.name}")
        self._log(f"Workflows: {' → '.join(chain.workflows)}")
        self._log(f"{'#' * 60}\n")

        for workflow_id in chain.workflows:
            result = await self.run_workflow(workflow_id, current_vars)
            results.append(result)

            if not result.is_success:
                self._log(f"\n⚠️ Chain stopped due to failed workflow: {workflow_id}")
                break

            # Pass outputs to next workflow if configured
            for transition in chain.transitions:
                if transition.from_workflow == workflow_id and transition.pass_outputs:
                    state = self.state_manager.load(workflow_id)
                    if state and state.outputs:
                        current_vars.update(state.outputs)

        # Summary
        self._log(f"\n{'#' * 60}")
        self._log(f"Chain complete: {chain.name}")
        for r in results:
            status_icon = "✅" if r.is_success else "❌"
            self._log(f"  {status_icon} {r.workflow_id}: {r.status.value}")
        self._log(f"{'#' * 60}\n")

        return results

    async def run_prd_to_architecture(
        self,
        project_name: str,
        description: str = "",
    ) -> list[WorkflowResult]:
        """
        Run the PRD-to-Architecture workflow chain.

        This is the primary POC workflow.

        Args:
            project_name: Name of the project.
            description: Project description.

        Returns:
            List of WorkflowResult for PRD and Architecture workflows.
        """
        chain = WorkflowChain.prd_to_architecture()
        variables = {
            "project_name": project_name,
            "description": description,
        }

        return await self.run_workflow_chain(chain, variables)

    def list_workflows(self, module: str = "bmm") -> list[WorkflowConfig]:
        """List all available workflows in a module."""
        return self.parser.discover_workflows(module)

    def get_status(self, workflow_id: str) -> Optional[WorkflowState]:
        """Get current status of a workflow."""
        return self.state_manager.load(workflow_id)

    def list_in_progress(self) -> list[WorkflowState]:
        """List all workflows currently in progress."""
        return self.state_manager.get_in_progress()


# Convenience function for quick execution
async def run_workflow(
    workflow_id: str,
    variables: dict = None,
    llm_callback: Callable = None,
    verbose: bool = True,
) -> WorkflowResult:
    """
    Quick function to run a single workflow.

    Args:
        workflow_id: Workflow to run.
        variables: Variables for the workflow.
        llm_callback: LLM interaction callback.
        verbose: Enable verbose output.

    Returns:
        WorkflowResult.
    """
    config = OrchestratorConfig(verbose=verbose)
    orchestrator = WorkflowOrchestrator(config, llm_callback)
    return await orchestrator.run_workflow(workflow_id, variables)
