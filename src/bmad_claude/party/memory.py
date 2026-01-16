"""
PartyMemory - Context persistence and compression for Party Mode.

Manages:
- Conversation history
- Decision tracking
- Phase summaries
- Context compression for long sessions
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


@dataclass
class Message:
    """A single message in the conversation."""

    role: str  # "user", "agent:pm", "agent:architect", "facilitator"
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    topic: str | None = None
    phase: str | None = None
    turn: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "topic": self.topic,
            "phase": self.phase,
            "turn": self.turn,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Message":
        """Create from dictionary."""
        return cls(
            role=data["role"],
            content=data["content"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            topic=data.get("topic"),
            phase=data.get("phase"),
            turn=data.get("turn", 0),
        )


@dataclass
class Decision:
    """A decision made during discussions."""

    id: str
    topic: str
    decision: str
    rationale: str
    participants: list[str]
    timestamp: datetime = field(default_factory=datetime.now)
    phase: str | None = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "topic": self.topic,
            "decision": self.decision,
            "rationale": self.rationale,
            "participants": self.participants,
            "timestamp": self.timestamp.isoformat(),
            "phase": self.phase,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Decision":
        """Create from dictionary."""
        return cls(
            id=data["id"],
            topic=data["topic"],
            decision=data["decision"],
            rationale=data["rationale"],
            participants=data["participants"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            phase=data.get("phase"),
        )


class PartyMemory:
    """
    Manages conversation history and context persistence.

    Context Window Strategy:
    - Recent messages: last 10-15 turns
    - Phase summaries: compressed older context
    - Decisions: all key decisions made
    - Artifact refs: current draft snippets

    Progressive Summarization:
    - Every 20 turns, compress old messages into summary
    - Keep summaries + decisions + recent messages
    """

    COMPRESSION_THRESHOLD = 20  # Turns before compression
    RECENT_MESSAGES_COUNT = 10  # Messages to keep uncompressed

    def __init__(self, max_tokens: int = 100_000):
        self.messages: list[Message] = []
        self.decisions: list[Decision] = []
        self.summaries: list[str] = []
        self.artifacts: dict[str, str] = {}  # artifact_name -> content/path
        self.max_tokens = max_tokens
        self.current_turn = 0
        self._unsaved_messages: list[Message] = []
        self._decision_counter = 0

    def add_message(
        self,
        role: str,
        content: str,
        topic: str | None = None,
        phase: str | None = None,
    ) -> Message:
        """
        Add a message and manage context window.

        Args:
            role: Message role (user, agent:pm, agent:architect, etc.)
            content: Message content
            topic: Current discussion topic
            phase: Current BMAD phase

        Returns:
            The created Message
        """
        # Increment turn for user messages
        if role == "user":
            self.current_turn += 1

        message = Message(
            role=role,
            content=content,
            timestamp=datetime.now(),
            topic=topic,
            phase=phase,
            turn=self.current_turn,
        )

        self.messages.append(message)
        self._unsaved_messages.append(message)

        # Check if compression needed
        self._check_compression()

        return message

    def add_agent_responses(
        self,
        responses: list[tuple[str, str]],  # [(agent_id, content), ...]
        topic: str | None = None,
        phase: str | None = None,
    ) -> list[Message]:
        """
        Add multiple agent responses for a single turn.

        Args:
            responses: List of (agent_id, content) tuples
            topic: Current discussion topic
            phase: Current BMAD phase

        Returns:
            List of created Messages
        """
        messages = []
        for agent_id, content in responses:
            msg = Message(
                role=f"agent:{agent_id}",
                content=content,
                timestamp=datetime.now(),
                topic=topic,
                phase=phase,
                turn=self.current_turn,
            )
            self.messages.append(msg)
            self._unsaved_messages.append(msg)
            messages.append(msg)

        return messages

    def add_decision(
        self,
        topic: str,
        decision: str,
        rationale: str,
        participants: list[str],
        phase: str | None = None,
    ) -> Decision:
        """
        Register a decision made during discussion.

        Args:
            topic: Topic the decision relates to
            decision: What was decided
            rationale: Why this decision was made
            participants: Agents who participated in decision
            phase: Current BMAD phase

        Returns:
            The created Decision
        """
        self._decision_counter += 1

        decision_obj = Decision(
            id=f"D{self._decision_counter:03d}",
            topic=topic,
            decision=decision,
            rationale=rationale,
            participants=participants,
            timestamp=datetime.now(),
            phase=phase,
        )

        self.decisions.append(decision_obj)
        return decision_obj

    def get_context(self, max_tokens: int | None = None) -> str:
        """
        Get optimized context for next LLM call.

        Includes:
        - Phase summaries (compressed old context)
        - Recent messages (last 10-15)
        - Key decisions
        - Artifact references

        Returns:
            Formatted context string
        """
        sections = []

        # Add summaries
        if self.summaries:
            sections.append("## Previous Discussion Summary\n")
            sections.append("\n".join(self.summaries[-3:]))  # Last 3 summaries

        # Add recent messages
        recent = self.messages[-self.RECENT_MESSAGES_COUNT :]
        if recent:
            sections.append("\n## Recent Discussion\n")
            for msg in recent:
                role_display = msg.role.replace("agent:", "")
                sections.append(f"**{role_display}**: {msg.content}\n")

        # Add decisions
        if self.decisions:
            sections.append("\n## Key Decisions Made\n")
            for d in self.decisions[-10:]:  # Last 10 decisions
                sections.append(f"- **{d.topic}**: {d.decision}")

        # Add artifact references
        if self.artifacts:
            sections.append("\n## Current Artifacts\n")
            for name, content in self.artifacts.items():
                # Truncate artifact content
                snippet = content[:500] + "..." if len(content) > 500 else content
                sections.append(f"### {name}\n{snippet}")

        return "\n".join(sections)

    def get_phase_summary(self) -> str:
        """Get summary for current phase discussions."""
        if self.summaries:
            return self.summaries[-1]
        return "No previous discussions."

    def format_decisions(self) -> str:
        """Format decisions for prompt inclusion."""
        if not self.decisions:
            return "No decisions made yet."

        lines = []
        for d in self.decisions:
            lines.append(f"- [{d.id}] {d.topic}: {d.decision}")
        return "\n".join(lines)

    def get_artifact_snippet(self, artifact_name: str = "prd") -> str:
        """Get a snippet of the current artifact draft."""
        if artifact_name not in self.artifacts:
            return "No artifact draft yet."

        content = self.artifacts[artifact_name]
        if len(content) > 1000:
            return content[:1000] + "\n... [truncated]"
        return content

    def update_artifact(self, name: str, content: str) -> None:
        """Update artifact draft content."""
        self.artifacts[name] = content

    def _check_compression(self) -> None:
        """Check if compression is needed and trigger if so."""
        # Only compress if we have enough messages
        if len(self.messages) > self.COMPRESSION_THRESHOLD + self.RECENT_MESSAGES_COUNT:
            self.summarize_and_compress()

    def summarize_and_compress(self) -> str:
        """
        Compress old conversation into summary.

        Strategy:
        1. Take messages older than RECENT_MESSAGES_COUNT
        2. Group by phase/topic
        3. Create summary of key points
        4. Remove compressed messages, keep summary

        Returns:
            The generated summary
        """
        # Get messages to compress (exclude recent)
        to_compress = self.messages[: -self.RECENT_MESSAGES_COUNT]

        if not to_compress:
            return ""

        # Simple summary: extract key points from messages
        topics_covered = set()
        key_points = []

        for msg in to_compress:
            if msg.topic:
                topics_covered.add(msg.topic)
            # Extract first sentence as key point (simplified)
            first_sentence = msg.content.split(".")[0] + "."
            if len(first_sentence) < 200:  # Only short key points
                key_points.append(f"- {msg.role}: {first_sentence}")

        summary = f"""### Summary (Turns 1-{to_compress[-1].turn})
**Topics Covered:** {", ".join(topics_covered) or "General discussion"}

**Key Points:**
{chr(10).join(key_points[:10])}  
"""

        self.summaries.append(summary)

        # Remove compressed messages
        self.messages = self.messages[-self.RECENT_MESSAGES_COUNT :]

        return summary

    def new_messages(self) -> list[Message]:
        """Get messages added since last save."""
        messages = self._unsaved_messages.copy()
        self._unsaved_messages.clear()
        return messages

    def save_to_file(self, session_dir: Path) -> None:
        """
        Save memory state to files.

        Files created:
        - conversation.jsonl: All messages (append)
        - decisions.yaml: All decisions
        - summaries.md: Phase summaries
        """
        import yaml

        session_dir.mkdir(parents=True, exist_ok=True)

        # Append new messages to conversation log
        conv_file = session_dir / "conversation.jsonl"
        with open(conv_file, "a") as f:
            for msg in self.new_messages():
                f.write(json.dumps(msg.to_dict()) + "\n")

        # Save decisions
        decisions_file = session_dir / "decisions.yaml"
        with open(decisions_file, "w") as f:
            yaml.dump(
                {"decisions": [d.to_dict() for d in self.decisions]},
                f,
                default_flow_style=False,
            )

        # Save summaries
        summaries_file = session_dir / "summaries.md"
        with open(summaries_file, "w") as f:
            f.write("# Discussion Summaries\n\n")
            for summary in self.summaries:
                f.write(summary + "\n\n")

    @classmethod
    def load_from_file(cls, session_dir: Path) -> "PartyMemory":
        """Load memory state from files."""
        import yaml

        memory = cls()

        # Load conversation
        conv_file = session_dir / "conversation.jsonl"
        if conv_file.exists():
            with open(conv_file) as f:
                for line in f:
                    if line.strip():
                        memory.messages.append(Message.from_dict(json.loads(line)))

            # Update turn counter
            if memory.messages:
                memory.current_turn = max(m.turn for m in memory.messages)

        # Load decisions
        decisions_file = session_dir / "decisions.yaml"
        if decisions_file.exists():
            with open(decisions_file) as f:
                data = yaml.safe_load(f)
                if data and "decisions" in data:
                    for d in data["decisions"]:
                        memory.decisions.append(Decision.from_dict(d))
                    memory._decision_counter = len(memory.decisions)

        # Load summaries
        summaries_file = session_dir / "summaries.md"
        if summaries_file.exists():
            with open(summaries_file) as f:
                content = f.read()
                # Parse summaries (split by ### Summary headers)
                parts = content.split("### Summary")
                memory.summaries = [f"### Summary{p}" for p in parts[1:] if p.strip()]

        return memory

    def get_stats(self) -> dict[str, int]:
        """Get memory statistics."""
        return {
            "messages_count": len(self.messages),
            "decisions_count": len(self.decisions),
            "summaries_count": len(self.summaries),
            "current_turn": self.current_turn,
            "artifacts_count": len(self.artifacts),
        }
