"""
BMAD Step Executor

Executes individual workflow steps via LLM.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Callable, Optional

from bmad_claude.engine.models import (
    StepConfig,
    StepResult,
    StepStatus,
    WorkflowConfig,
    WorkflowState,
)
from bmad_claude.persona.models import AgentPersona
from bmad_claude.persona.injector import PromptContext, PromptInjector


@dataclass
class ExecutionConfig:
    """Configuration for step execution."""

    max_retries: int = 3
    timeout_seconds: int = 300  # 5 minutes per step
    stream_output: bool = True
    save_intermediate: bool = True


class StepExecutor:
    """
    Executes workflow steps via LLM.

    Handles:
    - Step content loading
    - Prompt construction with persona
    - LLM interaction (via callback)
    - Output processing (template-output, ask tags)
    - Error handling and retries
    """

    def __init__(
        self,
        llm_callback: Callable[[str, str], str] = None,
        llm_stream_callback: Callable[[str, str], AsyncIterator[str]] = None,
        config: ExecutionConfig = None,
    ):
        """
        Initialize the step executor.

        Args:
            llm_callback: Synchronous callback for LLM interaction (system_prompt, user_prompt) -> response.
            llm_stream_callback: Async streaming callback for LLM interaction.
            config: Execution configuration.
        """
        self.llm_callback = llm_callback
        self.llm_stream_callback = llm_stream_callback
        self.config = config or ExecutionConfig()
        self.injector = PromptInjector()

    def load_step_content(self, step: StepConfig) -> str:
        """
        Load content from a step file.

        Args:
            step: Step configuration.

        Returns:
            Step file content.
        """
        if not step.path.exists():
            raise FileNotFoundError(f"Step file not found: {step.path}")

        return step.path.read_text(encoding="utf-8")

    def build_context(
        self,
        workflow: WorkflowConfig,
        state: WorkflowState,
        step: StepConfig,
        memory_context: str = "",
    ) -> PromptContext:
        """
        Build execution context for a step.

        Args:
            workflow: Workflow configuration.
            state: Current workflow state.
            step: Step to execute.
            memory_context: Context from memory system.

        Returns:
            PromptContext for prompt generation.
        """
        return PromptContext(
            project_name=state.variables.get("project_name", ""),
            workflow_id=workflow.id,
            workflow_name=workflow.name,
            current_step=step.id,
            step_name=step.name,
            previous_outputs=state.outputs.copy(),
            variables=state.variables.copy(),
            memory_context=memory_context,
        )

    async def execute(
        self,
        step: StepConfig,
        workflow: WorkflowConfig,
        state: WorkflowState,
        persona: AgentPersona,
        memory_context: str = "",
        on_progress: Callable[[str], None] = None,
    ) -> StepResult:
        """
        Execute a single workflow step.

        Args:
            step: Step to execute.
            workflow: Workflow configuration.
            state: Current workflow state.
            persona: Agent persona for this execution.
            memory_context: Context from memory system.
            on_progress: Callback for progress updates (streaming).

        Returns:
            StepResult with execution outcome.
        """
        started_at = datetime.now()

        try:
            # Load step content
            step_content = self.load_step_content(step)

            # Build context
            context = self.build_context(workflow, state, step, memory_context)

            # Build prompts
            system_prompt, user_prompt = self.injector.build_full_prompt(
                persona=persona,
                step_content=step_content,
                context=context,
            )

            # Execute with retries
            response = await self._execute_with_retry(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                on_progress=on_progress,
            )

            completed_at = datetime.now()

            return StepResult(
                step_id=step.id,
                status=StepStatus.COMPLETED,
                output=response,
                started_at=started_at,
                completed_at=completed_at,
                duration_seconds=(completed_at - started_at).total_seconds(),
            )

        except Exception as e:
            completed_at = datetime.now()
            return StepResult(
                step_id=step.id,
                status=StepStatus.FAILED,
                error=str(e),
                started_at=started_at,
                completed_at=completed_at,
                duration_seconds=(completed_at - started_at).total_seconds(),
            )

    async def _execute_with_retry(
        self,
        system_prompt: str,
        user_prompt: str,
        on_progress: Callable[[str], None] = None,
    ) -> str:
        """Execute LLM call with retries."""
        last_error = None

        for attempt in range(self.config.max_retries):
            try:
                if self.llm_stream_callback and on_progress:
                    # Use streaming
                    response_parts = []
                    async for chunk in self.llm_stream_callback(
                        system_prompt, user_prompt
                    ):
                        response_parts.append(chunk)
                        on_progress(chunk)
                    return "".join(response_parts)
                elif self.llm_callback:
                    # Use synchronous callback
                    return self.llm_callback(system_prompt, user_prompt)
                else:
                    # No callback configured - return placeholder
                    return f"[SIMULATED] Step would be executed with persona context.\n\nSystem prompt length: {len(system_prompt)}\nUser prompt length: {len(user_prompt)}"

            except Exception as e:
                last_error = e
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(2**attempt)  # Exponential backoff

        raise last_error or Exception("Unknown execution error")

    def process_output(
        self, response: str, step: StepConfig
    ) -> tuple[str, Optional[str]]:
        """
        Process step output for special tags.

        Args:
            response: Raw LLM response.
            step: Step configuration.

        Returns:
            Tuple of (processed_output, template_content).
        """
        template_content = None

        # Extract template-output if present
        if step.has_template_output:
            template_content = self.injector.extract_template_output(response)

        # Check for ask tag (would pause for user input)
        ask_content = self.injector.detect_ask_tag(response)
        if ask_content:
            # In autonomous mode, we'd handle this differently
            pass

        return response, template_content

    def execute_sync(
        self,
        step: StepConfig,
        workflow: WorkflowConfig,
        state: WorkflowState,
        persona: AgentPersona,
        memory_context: str = "",
    ) -> StepResult:
        """
        Synchronous wrapper for execute.

        Args:
            step: Step to execute.
            workflow: Workflow configuration.
            state: Current workflow state.
            persona: Agent persona.
            memory_context: Context from memory.

        Returns:
            StepResult with execution outcome.
        """
        return asyncio.run(self.execute(step, workflow, state, persona, memory_context))
