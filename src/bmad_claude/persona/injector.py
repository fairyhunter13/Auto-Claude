"""
BMAD Persona Prompt Injector

Injects BMAD agent personas into LLM prompts.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from bmad_claude.persona.models import AgentPersona


@dataclass
class PromptContext:
    """Context for prompt generation."""

    project_name: str = ""
    workflow_id: str = ""
    workflow_name: str = ""
    current_step: str = ""
    step_name: str = ""
    previous_outputs: dict[str, str] = None
    variables: dict[str, Any] = None
    memory_context: str = ""

    def __post_init__(self):
        if self.previous_outputs is None:
            self.previous_outputs = {}
        if self.variables is None:
            self.variables = {}


class PromptInjector:
    """
    Injects BMAD personas into LLM prompts.

    Handles:
    - System prompt construction with persona
    - User prompt construction with step content
    - Context injection (memory, outputs, variables)
    """

    SYSTEM_PROMPT_TEMPLATE = """# BMAD-Claude Agent

{persona_section}

---

## Current Context

- **Project:** {project_name}
- **Workflow:** {workflow_name}
- **Current Step:** {step_name}

{memory_section}

---

## Your Task

You are executing a BMAD workflow step. Follow the instructions precisely and maintain your persona throughout.

{additional_context}
"""

    USER_PROMPT_TEMPLATE = """## Step Instructions

{step_content}

---

{previous_outputs_section}

{variables_section}

Please execute this step according to your expertise and the BMAD methodology.
"""

    def __init__(self):
        """Initialize the prompt injector."""
        pass

    def build_system_prompt(
        self,
        persona: AgentPersona,
        context: PromptContext,
        additional_context: str = "",
    ) -> str:
        """
        Build system prompt with persona injection.

        Args:
            persona: Agent persona to inject.
            context: Prompt context.
            additional_context: Additional instructions.

        Returns:
            Complete system prompt string.
        """
        # Build persona section
        persona_section = persona.to_system_prompt()

        # Build memory section
        memory_section = ""
        if context.memory_context:
            memory_section = f"""## Relevant Context from Memory

{context.memory_context}
"""

        return self.SYSTEM_PROMPT_TEMPLATE.format(
            persona_section=persona_section,
            project_name=context.project_name or "Unknown Project",
            workflow_name=context.workflow_name or context.workflow_id,
            step_name=context.step_name or context.current_step,
            memory_section=memory_section,
            additional_context=additional_context,
        )

    def build_user_prompt(
        self,
        step_content: str,
        context: PromptContext,
    ) -> str:
        """
        Build user prompt with step content.

        Args:
            step_content: Content of the step file.
            context: Prompt context.

        Returns:
            Complete user prompt string.
        """
        # Build previous outputs section
        previous_outputs_section = ""
        if context.previous_outputs:
            outputs_text = "\n".join(
                f"### {step_id}\n{output[:500]}..."
                if len(output) > 500
                else f"### {step_id}\n{output}"
                for step_id, output in context.previous_outputs.items()
            )
            previous_outputs_section = f"""## Previous Step Outputs

{outputs_text}
"""

        # Build variables section
        variables_section = ""
        if context.variables:
            vars_text = "\n".join(
                f"- **{key}:** {value}" for key, value in context.variables.items()
            )
            variables_section = f"""## Context Variables

{vars_text}
"""

        return self.USER_PROMPT_TEMPLATE.format(
            step_content=step_content,
            previous_outputs_section=previous_outputs_section,
            variables_section=variables_section,
        )

    def build_full_prompt(
        self,
        persona: AgentPersona,
        step_content: str,
        context: PromptContext,
        additional_context: str = "",
    ) -> tuple[str, str]:
        """
        Build complete system and user prompts.

        Args:
            persona: Agent persona.
            step_content: Step file content.
            context: Prompt context.
            additional_context: Additional instructions.

        Returns:
            Tuple of (system_prompt, user_prompt).
        """
        system_prompt = self.build_system_prompt(persona, context, additional_context)
        user_prompt = self.build_user_prompt(step_content, context)

        return system_prompt, user_prompt

    def inject_persona_greeting(
        self,
        persona: AgentPersona,
        message: str,
    ) -> str:
        """
        Inject persona greeting into a message.

        Args:
            persona: Agent persona.
            message: Message content.

        Returns:
            Message with persona greeting.
        """
        return f"{persona.to_greeting()}{message}"

    def extract_template_output(self, response: str) -> Optional[str]:
        """
        Extract content between <template-output> tags.

        Args:
            response: LLM response text.

        Returns:
            Extracted content or None if no tags found.
        """
        import re

        # Look for template-output tags (case insensitive)
        pattern = r"<template-output>(.*?)</template-output>"
        match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)

        if match:
            return match.group(1).strip()

        return None

    def detect_ask_tag(self, response: str) -> Optional[str]:
        """
        Detect and extract <ask> tag content.

        Args:
            response: LLM response text.

        Returns:
            Question content or None if no ask tag.
        """
        import re

        pattern = r"<ask>(.*?)</ask>"
        match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)

        if match:
            return match.group(1).strip()

        return None
