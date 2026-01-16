"""
PartySession - Main orchestrator for party mode discussions.

Manages:
- Multi-agent discussions
- Phase transitions
- Artifact generation
- Session persistence
"""

from __future__ import annotations

import asyncio
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from bmad_claude.party.memory import PartyMemory, Decision
from bmad_claude.party.orchestrator import AgentOrchestrator, AgentPersona
from bmad_claude.party.phase import PhaseManager, PhaseTopic


@dataclass
class Discussion:
    """Result of a discussion turn."""

    topic: str
    user_message: str | None
    agent_responses: list[tuple[str, str]]  # [(agent_id, content), ...]
    decisions: list[Decision]
    phase: str
    turn: int


@dataclass
class PhaseTransition:
    """Result of a phase transition."""

    from_phase: str
    to_phase: str
    summary: str
    artifacts_finalized: list[str]


class PartySession:
    """
    Manages a collaborative party mode session.

    Orchestrates multi-agent discussions where AI agents
    discuss together to produce software artifacts.

    Usage:
        session = await PartySession.create("My App", project_root)

        # Discussion loop
        while not session.is_complete():
            discussion = await session.discuss(user_input)
            display(discussion)

        # Save session
        session.save()
    """

    def __init__(
        self,
        project_name: str,
        session_id: str,
        project_root: Path,
        agents: dict[str, AgentPersona],
        memory: PartyMemory | None = None,
        phase_manager: PhaseManager | None = None,
        opencode_path: str = "opencode",
        model: str = "claude-4-opus",  # OpenCode model ID
    ):
        self.project_name = project_name
        self.session_id = session_id
        self.project_root = project_root
        self.agents = agents
        self.memory = memory or PartyMemory()
        self.phase_manager = phase_manager or PhaseManager()
        self.orchestrator = AgentOrchestrator(agents)
        self.opencode_path = opencode_path
        self.model = model

        # Session state
        self.started_at = datetime.now()
        self.updated_at = datetime.now()
        self.status = "active"  # active, paused, completed

        # Session directory
        self.session_dir = project_root / ".bmad-claude" / "party-sessions" / session_id

    @classmethod
    async def create(
        cls,
        project_name: str,
        project_root: Path | None = None,
        opencode_path: str = "opencode",
        model: str = "claude-4-opus",
    ) -> "PartySession":
        """
        Create a new party session.

        Args:
            project_name: Name of the project
            project_root: Project root directory (default: cwd)
            opencode_path: Path to OpenCode CLI
            model: LLM model to use

        Returns:
            New PartySession instance
        """
        project_root = project_root or Path.cwd()

        # Generate session ID
        date_str = datetime.now().strftime("%Y-%m-%d")
        slug = project_name.lower().replace(" ", "-")[:20]
        session_id = f"party-{date_str}-{slug}"

        # Load agents from manifest
        manifest_path = project_root / "_bmad" / "_config" / "agent-manifest.csv"
        agents = AgentOrchestrator.load_agents_from_manifest(manifest_path)

        if not agents:
            # Fallback: try bundled _bmad
            from bmad_claude.driver import get_bundled_bmad_path

            bundled_path = get_bundled_bmad_path()
            manifest_path = bundled_path / "_config" / "agent-manifest.csv"
            agents = AgentOrchestrator.load_agents_from_manifest(manifest_path)

        if not agents:
            raise RuntimeError("No agents found. Ensure _bmad/_config/agent-manifest.csv exists.")

        session = cls(
            project_name=project_name,
            session_id=session_id,
            project_root=project_root,
            agents=agents,
            opencode_path=opencode_path,
            model=model,
        )

        # Create session directory
        session.session_dir.mkdir(parents=True, exist_ok=True)

        return session

    @classmethod
    def resume(cls, session_id: str, project_root: Path | None = None) -> "PartySession":
        """
        Resume a saved session.

        Args:
            session_id: Session ID to resume
            project_root: Project root directory

        Returns:
            Restored PartySession
        """
        project_root = project_root or Path.cwd()
        session_dir = project_root / ".bmad-claude" / "party-sessions" / session_id

        if not session_dir.exists():
            raise FileNotFoundError(f"Session not found: {session_id}")

        # Load session metadata
        with open(session_dir / "session.yaml") as f:
            metadata = yaml.safe_load(f)

        # Load memory
        memory = PartyMemory.load_from_file(session_dir)

        # Load phase manager
        phase_manager = PhaseManager.from_dict(metadata.get("phase", {}))

        # Load agents
        manifest_path = project_root / "_bmad" / "_config" / "agent-manifest.csv"
        agents = AgentOrchestrator.load_agents_from_manifest(manifest_path)

        session = cls(
            project_name=metadata["session"]["project_name"],
            session_id=session_id,
            project_root=project_root,
            agents=agents,
            memory=memory,
            phase_manager=phase_manager,
            opencode_path=metadata.get("opencode_path", "opencode"),
            model=metadata.get("model", "claude-4-opus"),
        )

        session.started_at = datetime.fromisoformat(metadata["session"]["started_at"])
        session.updated_at = datetime.now()
        session.status = metadata["session"].get("status", "active")

        return session

    async def discuss(
        self,
        user_message: str | None = None,
        topic: str | None = None,
        lead_agent: str | None = None,
    ) -> Discussion:
        """
        Facilitate a discussion turn.

        Args:
            user_message: User's input (optional for continuation)
            topic: Discussion topic (auto-detected if not provided)
            lead_agent: Agent to lead discussion (optional)

        Returns:
            Discussion result with agent responses and decisions
        """
        self.updated_at = datetime.now()
        current_phase = self.phase_manager.current_phase

        # Determine topic
        if not topic:
            if user_message:
                suggested = self.phase_manager.get_suggested_topic(user_message)
                topic = suggested.name if suggested else "General Discussion"
            else:
                next_topic = self.phase_manager.get_next_topic()
                topic = next_topic.name if next_topic else "General Discussion"

        # Add user message to memory
        if user_message:
            self.memory.add_message(
                role="user",
                content=user_message,
                topic=topic,
                phase=current_phase,
            )

        # Select agents
        selected_agents = self.orchestrator.select_agents(
            topic=user_message or topic,
            phase=current_phase,
            user_directed=lead_agent,
        )

        # Build context
        context = f"""**Project:** {self.project_name}
**Current Phase:** {self.phase_manager.get_current_phase().name}
**Discussion Topic:** {topic}

{self.memory.get_context()}
"""

        # Build and execute prompt
        prompt = self.orchestrator.build_discussion_prompt(
            topic=topic,
            agents=selected_agents,
            context=context,
            user_message=user_message,
        )

        # Invoke OpenCode
        llm_response = await self._invoke_opencode(prompt)

        # Parse responses
        agent_responses, raw_decisions = self.orchestrator.parse_agent_responses(llm_response)

        # Add agent responses to memory
        self.memory.add_agent_responses(
            responses=agent_responses,
            topic=topic,
            phase=current_phase,
        )

        # Register decisions
        decisions = []
        for raw_dec in raw_decisions:
            decision = self.memory.add_decision(
                topic=raw_dec["topic"],
                decision=raw_dec["decision"],
                rationale=raw_dec["rationale"],
                participants=selected_agents,
                phase=current_phase,
            )
            decisions.append(decision)

        # Mark topic as covered if it matches a phase topic
        phase_topic = self.phase_manager.get_suggested_topic(topic)
        if phase_topic:
            self.phase_manager.mark_topic_covered(phase_topic.id)

        # Auto-save
        self.save()

        return Discussion(
            topic=topic,
            user_message=user_message,
            agent_responses=agent_responses,
            decisions=decisions,
            phase=current_phase,
            turn=self.memory.current_turn,
        )

    async def transition_phase(self) -> PhaseTransition | None:
        """
        Attempt to transition to next BMAD phase.

        Returns:
            PhaseTransition if successful, None if not ready
        """
        # Check if transition is possible
        is_complete, missing = self.phase_manager.check_phase_complete(self.memory)

        if not is_complete:
            return None

        from_phase = self.phase_manager.current_phase

        # Finalize artifacts for current phase
        artifacts_finalized = await self._finalize_phase_artifacts()

        # Generate phase summary
        summary = self.memory.summarize_and_compress()

        # Transition
        to_phase = self.phase_manager.transition_to_next()

        if not to_phase:
            self.status = "completed"

        self.save()

        return PhaseTransition(
            from_phase=from_phase,
            to_phase=to_phase or "completed",
            summary=summary,
            artifacts_finalized=artifacts_finalized,
        )

    async def _finalize_phase_artifacts(self) -> list[str]:
        """
        Finalize artifacts for current phase.

        Uses LLM to synthesize artifact from discussions.

        Returns:
            List of finalized artifact names
        """
        phase = self.phase_manager.get_current_phase()
        artifact_name = phase.artifact.replace(".md", "").replace(".yaml", "")

        # Build artifact extraction prompt
        prompt = f"""Based on the following discussions, create a structured {phase.artifact} document.

## Project
{self.project_name}

## Discussion Summary
{self.memory.get_context()}

## Decisions Made
{self.memory.format_decisions()}

## Instructions
Create a well-structured {artifact_name} document that captures:
- All key decisions made
- Requirements discussed
- Technical considerations
- Any open questions

Use BMAD format with clear sections and markdown formatting.
"""

        # Generate artifact
        artifact_content = await self._invoke_opencode(prompt)

        # Save artifact
        output_dir = self.project_root / "_bmad-output" / "planning-artifacts"
        output_dir.mkdir(parents=True, exist_ok=True)

        artifact_path = output_dir / phase.artifact
        with open(artifact_path, "w") as f:
            f.write(artifact_content)

        # Update memory
        self.memory.update_artifact(artifact_name, artifact_content)

        return [phase.artifact]

    async def _invoke_opencode(self, prompt: str) -> str:
        """
        Invoke OpenCode CLI for LLM execution.

        Args:
            prompt: Prompt to send

        Returns:
            LLM response
        """
        cmd = [
            self.opencode_path,
            "run",
            "--model",
            self.model,
            prompt,
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(self.project_root),
            )

            if result.returncode != 0:
                raise RuntimeError(f"OpenCode error: {result.stderr}")

            return result.stdout

        except FileNotFoundError:
            raise RuntimeError(
                f"OpenCode not found at: {self.opencode_path}\n"
                "Install OpenCode or specify path with --opencode-path"
            )

    def save(self) -> Path:
        """
        Save session state to files.

        Returns:
            Session directory path
        """
        self.session_dir.mkdir(parents=True, exist_ok=True)

        # Save session metadata
        metadata = {
            "schema_version": 1,
            "session": {
                "id": self.session_id,
                "project_name": self.project_name,
                "started_at": self.started_at.isoformat(),
                "updated_at": self.updated_at.isoformat(),
                "status": self.status,
            },
            "phase": self.phase_manager.to_dict(),
            "stats": self.memory.get_stats(),
            "opencode_path": self.opencode_path,
            "model": self.model,
        }

        with open(self.session_dir / "session.yaml", "w") as f:
            yaml.dump(metadata, f, default_flow_style=False)

        # Save memory
        self.memory.save_to_file(self.session_dir)

        return self.session_dir

    def is_complete(self) -> bool:
        """Check if session is complete."""
        return self.status == "completed"

    def get_welcome_message(self) -> str:
        """Generate welcome message for session start."""
        # Select a few diverse agents to showcase
        showcase_agents = list(self.agents.values())[:4]

        agent_intros = "\n".join(
            [f"{a.icon} **{a.display_name}** ({a.title})" for a in showcase_agents]
        )

        return f"""
🎉 **PARTY MODE ACTIVATED!** 🎉

Welcome! I'm bringing together our BMAD expert team to help plan **{self.project_name}**.

**Your Team:**
{agent_intros}
...and {len(self.agents) - 4} more experts ready to help!

**Current Phase:** {self.phase_manager.get_current_phase().name}
**Session ID:** {self.session_id}

Tell us about your project idea and let's get started!
"""

    def get_status_display(self) -> str:
        """Generate status display for session."""
        phase_summary = self.phase_manager.get_phase_summary()
        stats = self.memory.get_stats()

        topics_display = "\n".join(
            [f"  {'✅' if t['covered'] else '○'} {t['name']}" for t in phase_summary["topics"]]
        )

        return f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 **BMAD-Claude Party Mode**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Project:** {self.project_name}
**Phase:** {phase_summary["phase_name"]} ({phase_summary["topics_covered"]}/{phase_summary["topics_total"]} topics)
**Turn:** {stats["current_turn"]}
**Decisions:** {stats["decisions_count"]}

**Topics:**
{topics_display}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "session_id": self.session_id,
            "project_name": self.project_name,
            "project_root": str(self.project_root),
            "started_at": self.started_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "status": self.status,
            "phase": self.phase_manager.to_dict(),
            "stats": self.memory.get_stats(),
        }
