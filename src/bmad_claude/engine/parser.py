"""
BMAD Workflow Parser

Parses BMAD workflow files (YAML and Markdown) and builds execution graphs.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Optional

import yaml

from bmad_claude.engine.models import (
    StepConfig,
    WorkflowConfig,
    WorkflowFormat,
)


class WorkflowParseError(Exception):
    """Raised when workflow parsing fails."""

    pass


class WorkflowParser:
    """
    Parser for BMAD workflow files.

    Supports both YAML (.yaml) and Markdown (.md) workflow formats.
    Discovers step files in the workflow's steps/ directory.
    """

    def __init__(self, bmad_root: Path = Path("_bmad")):
        """
        Initialize the workflow parser.

        Args:
            bmad_root: Root directory containing BMAD files.
        """
        self.bmad_root = bmad_root

    def parse(self, workflow_path: Path) -> WorkflowConfig:
        """
        Parse a workflow file and return configuration.

        Args:
            workflow_path: Path to workflow file (workflow.yaml or workflow.md)

        Returns:
            WorkflowConfig with parsed workflow data and discovered steps.

        Raises:
            WorkflowParseError: If parsing fails.
        """
        if not workflow_path.exists():
            raise WorkflowParseError(f"Workflow file not found: {workflow_path}")

        # Determine format
        suffix = workflow_path.suffix.lower()
        if suffix in (".yaml", ".yml"):
            config = self._parse_yaml(workflow_path)
        elif suffix == ".md":
            config = self._parse_markdown(workflow_path)
        else:
            raise WorkflowParseError(f"Unsupported workflow format: {suffix}")

        # Discover steps
        config.steps = self._discover_steps(workflow_path.parent)

        return config

    def _parse_yaml(self, path: Path) -> WorkflowConfig:
        """Parse YAML workflow format."""
        try:
            content = path.read_text(encoding="utf-8")
            data = yaml.safe_load(content)

            if not data:
                raise WorkflowParseError(f"Empty workflow file: {path}")

            # Extract workflow ID from path
            workflow_id = path.parent.name

            return WorkflowConfig(
                id=workflow_id,
                name=data.get("name", workflow_id),
                path=path,
                format=WorkflowFormat.YAML,
                agent_id=data.get("agent", ""),
                description=data.get("description", ""),
                template_path=self._resolve_path(data.get("template"), path.parent)
                if data.get("template")
                else None,
                default_output_path=self._resolve_path(
                    data.get("default_output_file"), path.parent
                )
                if data.get("default_output_file")
                else None,
                variables=data.get("variables", {}),
            )
        except yaml.YAMLError as e:
            raise WorkflowParseError(f"Invalid YAML in {path}: {e}")

    def _parse_markdown(self, path: Path) -> WorkflowConfig:
        """Parse Markdown workflow format."""
        content = path.read_text(encoding="utf-8")

        # Extract frontmatter if present
        frontmatter = {}
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1]) or {}
                except yaml.YAMLError:
                    pass

        # Extract workflow ID from path
        workflow_id = path.parent.name

        # Try to extract name from first heading
        name_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        name = name_match.group(1) if name_match else workflow_id

        # Try to extract agent from content
        agent_match = re.search(r"agent[:\s]+[\"']?(\w+)[\"']?", content, re.IGNORECASE)
        agent_id = agent_match.group(1) if agent_match else frontmatter.get("agent", "")

        return WorkflowConfig(
            id=workflow_id,
            name=frontmatter.get("name", name),
            path=path,
            format=WorkflowFormat.MARKDOWN,
            agent_id=agent_id,
            description=frontmatter.get("description", ""),
            template_path=self._resolve_path(frontmatter.get("template"), path.parent)
            if frontmatter.get("template")
            else None,
            default_output_path=self._resolve_path(
                frontmatter.get("default_output_file"), path.parent
            )
            if frontmatter.get("default_output_file")
            else None,
            variables=frontmatter.get("variables", {}),
        )

    def _discover_steps(self, workflow_dir: Path) -> list[StepConfig]:
        """
        Discover step files in the workflow directory.

        Looks for step files in:
        - steps/ directory
        - steps-c/ directory (create mode)
        - steps-v/ directory (validate mode)
        - steps-e/ directory (edit mode)

        Args:
            workflow_dir: Directory containing the workflow.

        Returns:
            List of StepConfig ordered by step number.
        """
        steps = []

        # Check for step directories
        step_dirs = [
            workflow_dir / "steps",
            workflow_dir / "steps-c",  # Create mode
        ]

        for step_dir in step_dirs:
            if step_dir.exists():
                steps.extend(self._parse_step_dir(step_dir))
                break  # Use first found directory

        # Sort by order
        steps.sort(key=lambda s: (s.order, s.id))

        return steps

    def _parse_step_dir(self, step_dir: Path) -> list[StepConfig]:
        """Parse all step files in a directory."""
        steps = []

        # Find all step files (step-XX-*.md)
        step_pattern = re.compile(r"step-(\d+)([a-z]?)-(.+)\.md$", re.IGNORECASE)

        for step_file in step_dir.glob("step-*.md"):
            match = step_pattern.match(step_file.name)
            if match:
                step_num = int(match.group(1))
                step_suffix = match.group(2)  # e.g., 'b' for continuation
                step_name = match.group(3)

                # Read step content to detect special tags
                content = step_file.read_text(encoding="utf-8")

                step = StepConfig(
                    id=f"step-{step_num:02d}{step_suffix}-{step_name}"
                    if step_suffix
                    else f"step-{step_num:02d}-{step_name}",
                    name=self._format_step_name(step_name),
                    path=step_file,
                    order=step_num * 10
                    + (ord(step_suffix) - ord("a") + 1 if step_suffix else 0),
                    description=self._extract_step_description(content),
                    has_template_output="<template-output>" in content.lower()
                    or "template-output" in content.lower(),
                    has_ask_tag="<ask>" in content.lower(),
                    is_continuation=step_suffix == "b",
                )
                steps.append(step)

        return steps

    def _format_step_name(self, raw_name: str) -> str:
        """Format step name from filename."""
        # Convert kebab-case to Title Case
        return " ".join(word.capitalize() for word in raw_name.split("-"))

    def _extract_step_description(self, content: str) -> str:
        """Extract description from step content."""
        # Try to get first paragraph after heading
        lines = content.split("\n")
        in_description = False
        description_lines = []

        for line in lines:
            if line.startswith("#"):
                in_description = True
                continue
            if in_description:
                if line.strip() == "":
                    if description_lines:
                        break
                    continue
                if line.startswith("#") or line.startswith("```"):
                    break
                description_lines.append(line.strip())

        return " ".join(description_lines)[:200] if description_lines else ""

    def _resolve_path(self, path_str: Optional[str], base_dir: Path) -> Optional[Path]:
        """Resolve a path string with variable substitution."""
        if not path_str:
            return None

        # Handle {installed_path} variable
        resolved = path_str.replace("{installed_path}", str(base_dir))

        # Handle {project-root} variable
        resolved = resolved.replace("{project-root}", str(Path.cwd()))

        return Path(resolved)

    def discover_workflows(self, module: str = "bmm") -> list[WorkflowConfig]:
        """
        Discover all workflows in a BMAD module.

        Args:
            module: Module name (e.g., 'bmm', 'core', 'cis')

        Returns:
            List of workflow configurations.
        """
        workflows = []
        module_path = self.bmad_root / module / "workflows"

        if not module_path.exists():
            return workflows

        # Find all workflow files
        for workflow_file in module_path.rglob("workflow.md"):
            try:
                workflows.append(self.parse(workflow_file))
            except WorkflowParseError:
                continue

        for workflow_file in module_path.rglob("workflow.yaml"):
            try:
                workflows.append(self.parse(workflow_file))
            except WorkflowParseError:
                continue

        return workflows

    def get_workflow_by_id(self, workflow_id: str) -> Optional[WorkflowConfig]:
        """
        Find a workflow by its ID.

        Args:
            workflow_id: Workflow identifier (e.g., 'prd', 'create-architecture')

        Returns:
            WorkflowConfig if found, None otherwise.
        """
        # Search in all modules
        for module in ["bmm", "core", "cis", "bmb"]:
            module_path = self.bmad_root / module / "workflows"
            if not module_path.exists():
                continue

            # Look for matching directory
            for workflow_dir in module_path.rglob(workflow_id):
                if workflow_dir.is_dir():
                    # Check for workflow file
                    for ext in [".md", ".yaml", ".yml"]:
                        workflow_file = workflow_dir / f"workflow{ext}"
                        if workflow_file.exists():
                            return self.parse(workflow_file)

        return None
