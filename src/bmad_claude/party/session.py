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
from typing import Any, AsyncIterator, Callable

import yaml

from bmad_claude.party.memory import PartyMemory, Decision
from bmad_claude.party.orchestrator import AgentOrchestrator, AgentPersona
from bmad_claude.party.phase import PhaseManager, PhaseTopic
from bmad_claude.party.opencode_client import OpenCodeClient, OpenCodeConfig, StreamEvent
from bmad_claude.party.opencode_pool import (
    OpenCodePool,
    OpenCodeProfile,
    LoadBalanceStrategy,
    BUILTIN_PROFILES,
    create_pool_from_names,
)
from bmad_claude.party.feedback import FeedbackHandler, FeedbackType


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
        model: str = "anthropic/claude-opus-4-5",  # OpenCode model (provider/model)
        variant: str = "max",  # Model variant (max = maximum thinking budget)
        profiles: list[str] | None = None,  # OpenCode profiles for load balancing
        load_balance_strategy: str = "round_robin",  # round_robin, random, failover
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
        self.variant = variant
        self.profiles = profiles  # e.g., ["personal", "work"]
        self.load_balance_strategy = load_balance_strategy

        # Session state
        self.started_at = datetime.now()
        self.updated_at = datetime.now()
        self.status = "active"  # active, paused, completed

        # Session directory
        self.session_dir = project_root / ".bmad-claude" / "party-sessions" / session_id

        # OpenCode client/pool for streaming (lazily initialized)
        self._opencode_client: OpenCodeClient | None = None
        self._opencode_pool: OpenCodePool | None = None
        self._use_streaming = True  # Enable streaming by default
        self._use_pool = profiles is not None and len(profiles) > 0

        # User feedback handler
        self.feedback = FeedbackHandler()

    @classmethod
    async def create(
        cls,
        project_name: str,
        project_root: Path | None = None,
        opencode_path: str = "opencode",
        model: str = "anthropic/claude-opus-4-5",
        variant: str = "max",
        profiles: list[str] | None = None,
        load_balance_strategy: str = "round_robin",
    ) -> "PartySession":
        """
        Create a new party session.

        Args:
            project_name: Name of the project
            project_root: Project root directory (default: cwd)
            opencode_path: Path to OpenCode CLI
            model: LLM model to use
            variant: Model variant (e.g., "max" for Anthropic)
            profiles: OpenCode profiles for load balancing (e.g., ["personal", "work"])
            load_balance_strategy: Load balancing strategy (round_robin, random, failover)

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
            variant=variant,
            profiles=profiles,
            load_balance_strategy=load_balance_strategy,
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
            model=metadata.get("model", "anthropic/claude-opus-4-5"),
            variant=metadata.get("variant", "max"),
            profiles=metadata.get("profiles"),
            load_balance_strategy=metadata.get("load_balance_strategy", "round_robin"),
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

        # Build context with user feedback
        feedback_section = self.feedback.format_feedback_for_prompt()
        context = f"""**Project:** {self.project_name}
**Current Phase:** {self.phase_manager.get_current_phase().name}
**Discussion Topic:** {topic}

{self.memory.get_context()}

{feedback_section}
"""

        # Build and execute prompt
        prompt = self.orchestrator.build_discussion_prompt(
            topic=topic,
            agents=selected_agents,
            context=context,
            user_message=user_message,
        )

        # Mark feedback as processed after incorporating into prompt
        for fb in self.feedback.get_pending_feedback():
            self.feedback.mark_feedback_processed(fb.id)

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

    async def stream_discuss(
        self,
        user_message: str | None = None,
        topic: str | None = None,
        lead_agent: str | None = None,
        on_text: Callable[[str], None] | None = None,
    ) -> Discussion:
        """
        Facilitate a discussion turn with streaming output.

        Streams text chunks in real-time while building the full response.

        Args:
            user_message: User's input (optional for continuation)
            topic: Discussion topic (auto-detected if not provided)
            lead_agent: Agent to lead discussion (optional)
            on_text: Callback for each text chunk (for real-time display)

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

        # Build context with user feedback
        feedback_section = self.feedback.format_feedback_for_prompt()
        context = f"""**Project:** {self.project_name}
**Current Phase:** {self.phase_manager.get_current_phase().name}
**Discussion Topic:** {topic}

{self.memory.get_context()}

{feedback_section}
"""

        # Build prompt
        prompt = self.orchestrator.build_discussion_prompt(
            topic=topic,
            agents=selected_agents,
            context=context,
            user_message=user_message,
        )

        # Mark feedback as processed after incorporating into prompt
        for fb in self.feedback.get_pending_feedback():
            self.feedback.mark_feedback_processed(fb.id)

        # Stream response
        llm_response = await self._invoke_opencode_streaming(prompt, on_text)

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

    async def _get_opencode_client(self) -> OpenCodeClient:
        """Get or create OpenCode client for streaming."""
        if self._opencode_client is None:
            config = OpenCodeConfig(
                model=self.model,
                variant=self.variant,
                opencode_path=self.opencode_path,
            )
            self._opencode_client = OpenCodeClient(config, self.project_root)
            await self._opencode_client.connect()
        return self._opencode_client

    async def _get_opencode_pool(self) -> OpenCodePool:
        """Get or create OpenCode pool for load balancing."""
        if self._opencode_pool is None:
            self._opencode_pool = create_pool_from_names(
                profile_names=self.profiles or ["personal", "work"],
                strategy=self.load_balance_strategy,
                project_root=self.project_root,
            )
            await self._opencode_pool.start()
        return self._opencode_pool

    async def _invoke_opencode_streaming(
        self,
        prompt: str,
        on_text: Callable[[str], None] | None = None,
    ) -> str:
        """
        Invoke OpenCode with streaming output.

        Uses pool with load balancing if profiles are configured,
        otherwise uses a single client.

        Args:
            prompt: Prompt to send
            on_text: Callback for each text chunk

        Returns:
            Complete response text
        """
        self._ensure_opencode_config()

        try:
            full_response = []

            if self._use_pool and self.profiles:
                # Use load-balanced pool
                pool = await self._get_opencode_pool()
                async for event in pool.stream_prompt(prompt):
                    if event.text:
                        full_response.append(event.text)
                        if on_text:
                            on_text(event.text)
            else:
                # Use single client
                client = await self._get_opencode_client()
                async for event in client.stream_prompt(prompt):
                    if event.text:
                        full_response.append(event.text)
                        if on_text:
                            on_text(event.text)

            return "".join(full_response)
        except Exception as e:
            # Fall back to non-streaming if server fails
            return await self._invoke_opencode(prompt)

    async def close(self) -> None:
        """Close the session and clean up resources."""
        if self._opencode_client:
            await self._opencode_client.disconnect()
            self._opencode_client = None
        if self._opencode_pool:
            await self._opencode_pool.stop()
            self._opencode_pool = None

    def get_pool_status(self) -> dict[str, Any] | None:
        """Get load balancing pool status if using profiles."""
        if self._opencode_pool:
            return self._opencode_pool.get_status()
        return None

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

        Uses `opencode run` command with the configured model.

        Note: Model variants (e.g., 'max' for Anthropic) are configured via
        opencode.json in the project root. Use generate_opencode_config() to
        create the config file with your preferred variant.

        Args:
            prompt: Prompt to send

        Returns:
            LLM response
        """
        # Ensure opencode.json exists with variant config
        self._ensure_opencode_config()

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
                "Install OpenCode from https://opencode.ai or specify path with --opencode-path"
            )

    def _ensure_opencode_config(self) -> None:
        """
        Ensure opencode.json exists with variant configuration.

        Creates or updates opencode.json to configure the model variant
        (e.g., 'max' for maximum thinking budget on Anthropic models).
        """
        import json

        config_path = self.project_root / "opencode.json"

        # Build variant config based on provider
        provider = self.model.split("/")[0] if "/" in self.model else "anthropic"
        model_id = self.model.split("/")[1] if "/" in self.model else self.model

        # Only add variant config if we have a non-default variant
        if self.variant and self.variant != "high":  # 'high' is default for Anthropic
            config = {
                "$schema": "https://opencode.ai/config.json",
                "model": self.model,
                "provider": {
                    provider: {
                        "models": {
                            model_id: {"options": self._get_variant_options(provider, self.variant)}
                        }
                    }
                },
            }

            # Merge with existing config if present
            if config_path.exists():
                try:
                    with open(config_path) as f:
                        existing = json.load(f)
                    # Only update if our model config isn't already there
                    if "provider" not in existing:
                        existing["provider"] = config["provider"]
                    elif provider not in existing["provider"]:
                        existing["provider"][provider] = config["provider"][provider]
                    config = existing
                except (json.JSONDecodeError, KeyError):
                    pass  # Use our config if existing is invalid

            with open(config_path, "w") as f:
                json.dump(config, f, indent=2)

    def _get_variant_options(self, provider: str, variant: str) -> dict:
        """Get model options for a given variant."""
        if provider == "anthropic":
            # Anthropic variants control thinking budget
            if variant == "max":
                return {
                    "thinking": {
                        "type": "enabled",
                        "budgetTokens": 32000,  # Maximum thinking budget
                    }
                }
            elif variant == "high":
                return {
                    "thinking": {
                        "type": "enabled",
                        "budgetTokens": 16000,
                    }
                }
        elif provider == "openai":
            # OpenAI variants control reasoning effort
            return {
                "reasoningEffort": variant,
            }
        return {}

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
            "variant": self.variant,
            "profiles": self.profiles,
            "load_balance_strategy": self.load_balance_strategy,
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
