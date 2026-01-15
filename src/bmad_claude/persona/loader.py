"""
BMAD Agent Persona Loader

Loads agent personas from BMAD manifest and definition files.
"""

from __future__ import annotations

import csv
import html
from pathlib import Path
from typing import Optional

from bmad_claude.persona.models import AgentPersona, PERSONAS


class PersonaLoadError(Exception):
    """Raised when persona loading fails."""

    pass


class PersonaLoader:
    """
    Loads BMAD agent personas from manifest and definition files.

    Primary source: _bmad/_config/agent-manifest.csv
    Fallback: Built-in PERSONAS dictionary
    """

    def __init__(self, bmad_root: Path = Path("_bmad")):
        """
        Initialize the persona loader.

        Args:
            bmad_root: Root directory containing BMAD files.
        """
        self.bmad_root = bmad_root
        self.manifest_path = bmad_root / "_config" / "agent-manifest.csv"
        self._cache: dict[str, AgentPersona] = {}
        self._loaded = False

    def _load_manifest(self) -> None:
        """Load all personas from manifest file."""
        if self._loaded:
            return

        if not self.manifest_path.exists():
            # Use built-in personas as fallback
            self._cache = PERSONAS.copy()
            self._loaded = True
            return

        try:
            with open(self.manifest_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    persona = self._parse_manifest_row(row)
                    self._cache[persona.id] = persona
            self._loaded = True
        except Exception as e:
            raise PersonaLoadError(f"Failed to load manifest: {e}")

    def _parse_manifest_row(self, row: dict) -> AgentPersona:
        """Parse a row from the agent manifest CSV."""
        # Parse principles (may be HTML-encoded)
        principles_raw = row.get("principles", "")
        principles_raw = html.unescape(principles_raw)

        # Split principles by "- " prefix
        principles = []
        for line in principles_raw.split("- "):
            line = line.strip()
            if line:
                principles.append(line)

        # Build path
        path_str = row.get("path", "")
        path = Path(path_str) if path_str else None

        return AgentPersona(
            id=row.get("name", ""),
            display_name=row.get("displayName", ""),
            title=row.get("title", ""),
            icon=row.get("icon", "🤖"),
            role=row.get("role", ""),
            identity=row.get("identity", ""),
            communication_style=row.get("communicationStyle", ""),
            principles=principles,
            module=row.get("module", ""),
            path=path,
        )

    def get(self, persona_id: str) -> Optional[AgentPersona]:
        """
        Get a persona by ID.

        Args:
            persona_id: Agent identifier (e.g., 'pm', 'architect')

        Returns:
            AgentPersona if found, None otherwise.
        """
        self._load_manifest()
        return self._cache.get(persona_id)

    def get_or_raise(self, persona_id: str) -> AgentPersona:
        """
        Get a persona by ID, raising if not found.

        Args:
            persona_id: Agent identifier.

        Returns:
            AgentPersona

        Raises:
            PersonaLoadError: If persona not found.
        """
        persona = self.get(persona_id)
        if not persona:
            raise PersonaLoadError(f"Persona not found: {persona_id}")
        return persona

    def list_all(self) -> list[AgentPersona]:
        """Get all available personas."""
        self._load_manifest()
        return list(self._cache.values())

    def list_by_module(self, module: str) -> list[AgentPersona]:
        """Get all personas from a specific module."""
        self._load_manifest()
        return [p for p in self._cache.values() if p.module == module]

    def get_for_workflow(self, workflow_id: str) -> Optional[AgentPersona]:
        """
        Get the recommended persona for a workflow.

        Args:
            workflow_id: Workflow identifier.

        Returns:
            Recommended AgentPersona if mapping exists.
        """
        # Workflow to persona mapping
        workflow_persona_map = {
            "prd": "pm",
            "create-architecture": "architect",
            "create-epics-and-stories": "pm",
            "sprint-planning": "sm",
            "create-story": "sm",
            "dev-story": "dev",
            "code-review": "dev",
            "check-implementation-readiness": "architect",
            "research": "analyst",
            "create-product-brief": "analyst",
            "create-ux-design": "ux-designer",
        }

        persona_id = workflow_persona_map.get(workflow_id)
        if persona_id:
            return self.get(persona_id)

        return None

    def reload(self) -> None:
        """Force reload of personas from manifest."""
        self._cache.clear()
        self._loaded = False
        self._load_manifest()
