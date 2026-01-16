"""
User Feedback System for Party Mode.

Allows users to:
- Approve, reject, or revise decisions
- Direct agent focus
- Request clarification
- Pause for input on key decisions

Commands:
    /help           - Show available commands
    /approve [id]   - Approve a decision
    /reject [id]    - Reject a decision with reason
    /revise [id]    - Request revision of a decision
    /focus [topic]  - Direct agents to focus on a topic
    /ask [agent]    - Ask a specific agent a question
    /decisions      - List all decisions made
    /undo           - Undo last decision
    /pause          - Pause auto-discussion for manual input
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class FeedbackType(Enum):
    """Types of user feedback."""

    APPROVE = "approve"
    REJECT = "reject"
    REVISE = "revise"
    FOCUS = "focus"
    ASK = "ask"
    COMMENT = "comment"
    UNDO = "undo"
    PAUSE = "pause"


@dataclass
class UserFeedback:
    """A piece of user feedback."""

    id: str
    feedback_type: FeedbackType
    target_id: str | None = None  # Decision ID or agent ID
    content: str = ""
    reason: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    processed: bool = False


@dataclass
class ParsedCommand:
    """Result of parsing a user command."""

    is_command: bool
    command: str = ""
    args: list[str] = field(default_factory=list)
    raw_input: str = ""


# Available commands with descriptions
COMMANDS = {
    "/help": "Show this help message",
    "/approve": "Approve a decision: /approve [decision_id] or /approve all",
    "/reject": "Reject a decision: /reject [decision_id] [reason]",
    "/revise": "Request revision: /revise [decision_id] [feedback]",
    "/focus": "Direct focus: /focus [topic] - Ask agents to focus on a topic",
    "/ask": "Ask agent: /ask [agent_name] [question]",
    "/decisions": "List all decisions made so far",
    "/undo": "Undo the last decision",
    "/pause": "Pause auto-discussion (agents wait for your input)",
    "/resume": "Resume auto-discussion",
    "/status": "Show current session status",
    "/agents": "List available agents",
    "/phase": "Show current phase and progress",
    "/next": "Move to next phase (if ready)",
    "/save": "Save session",
    "/exit": "Save and exit",
}


class FeedbackHandler:
    """
    Handles user feedback and commands in Party Mode.

    Provides:
    - Command parsing
    - Feedback tracking
    - Decision modification
    - Agent direction
    """

    def __init__(self):
        self.feedback_history: list[UserFeedback] = []
        self.is_paused = False
        self._feedback_counter = 0

    def parse_input(self, user_input: str) -> ParsedCommand:
        """
        Parse user input to detect commands.

        Args:
            user_input: Raw user input

        Returns:
            ParsedCommand with command info or regular input
        """
        user_input = user_input.strip()

        # Check if it's a command (starts with /)
        if user_input.startswith("/"):
            parts = user_input.split(maxsplit=1)
            command = parts[0].lower()
            args_str = parts[1] if len(parts) > 1 else ""

            # Parse arguments (handle quoted strings)
            args = self._parse_args(args_str)

            return ParsedCommand(
                is_command=True,
                command=command,
                args=args,
                raw_input=user_input,
            )

        return ParsedCommand(
            is_command=False,
            raw_input=user_input,
        )

    def _parse_args(self, args_str: str) -> list[str]:
        """Parse command arguments, handling quoted strings."""
        if not args_str:
            return []

        # Match quoted strings or non-whitespace sequences
        pattern = r'"([^"]+)"|\'([^\']+)\'|(\S+)'
        matches = re.findall(pattern, args_str)

        args = []
        for match in matches:
            # Get the non-empty group
            arg = match[0] or match[1] or match[2]
            args.append(arg)

        return args

    def create_feedback(
        self,
        feedback_type: FeedbackType,
        target_id: str | None = None,
        content: str = "",
        reason: str = "",
    ) -> UserFeedback:
        """Create and record a feedback entry."""
        self._feedback_counter += 1

        feedback = UserFeedback(
            id=f"fb-{self._feedback_counter}",
            feedback_type=feedback_type,
            target_id=target_id,
            content=content,
            reason=reason,
        )

        self.feedback_history.append(feedback)
        return feedback

    def get_pending_feedback(self) -> list[UserFeedback]:
        """Get all unprocessed feedback."""
        return [f for f in self.feedback_history if not f.processed]

    def mark_feedback_processed(self, feedback_id: str) -> None:
        """Mark a feedback entry as processed."""
        for feedback in self.feedback_history:
            if feedback.id == feedback_id:
                feedback.processed = True
                break

    def get_help_text(self) -> str:
        """Generate help text for all commands."""
        lines = [
            "## 🎮 Party Mode Commands\n",
            "### Feedback Commands",
        ]

        feedback_cmds = ["/approve", "/reject", "/revise", "/undo"]
        for cmd in feedback_cmds:
            lines.append(f"  `{cmd}` - {COMMANDS[cmd]}")

        lines.append("\n### Navigation Commands")
        nav_cmds = ["/focus", "/ask", "/pause", "/resume"]
        for cmd in nav_cmds:
            lines.append(f"  `{cmd}` - {COMMANDS[cmd]}")

        lines.append("\n### Information Commands")
        info_cmds = ["/decisions", "/status", "/agents", "/phase"]
        for cmd in info_cmds:
            lines.append(f"  `{cmd}` - {COMMANDS[cmd]}")

        lines.append("\n### Session Commands")
        session_cmds = ["/next", "/save", "/exit"]
        for cmd in session_cmds:
            lines.append(f"  `{cmd}` - {COMMANDS[cmd]}")

        lines.append("\n### Tips")
        lines.append("- Type normally to chat with agents")
        lines.append("- Use `/focus [topic]` to steer the discussion")
        lines.append("- Use `/reject [id] [reason]` to push back on decisions")
        lines.append("- Your feedback shapes the artifacts!")

        return "\n".join(lines)

    def format_feedback_for_prompt(self) -> str:
        """Format pending feedback for inclusion in agent prompts."""
        pending = self.get_pending_feedback()

        if not pending:
            return ""

        lines = ["## User Feedback to Address\n"]

        for fb in pending:
            if fb.feedback_type == FeedbackType.APPROVE:
                lines.append(f"✅ **APPROVED**: Decision {fb.target_id}")
            elif fb.feedback_type == FeedbackType.REJECT:
                lines.append(f"❌ **REJECTED**: Decision {fb.target_id}")
                if fb.reason:
                    lines.append(f"   Reason: {fb.reason}")
                lines.append("   → Please propose an alternative")
            elif fb.feedback_type == FeedbackType.REVISE:
                lines.append(f"🔄 **REVISION REQUESTED**: Decision {fb.target_id}")
                if fb.content:
                    lines.append(f"   Feedback: {fb.content}")
            elif fb.feedback_type == FeedbackType.FOCUS:
                lines.append(f"🎯 **FOCUS REQUEST**: {fb.content}")
                lines.append("   → Please prioritize this topic")
            elif fb.feedback_type == FeedbackType.ASK:
                lines.append(f"❓ **QUESTION FOR {fb.target_id}**: {fb.content}")
            elif fb.feedback_type == FeedbackType.COMMENT:
                lines.append(f"💬 **USER COMMENT**: {fb.content}")

        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        """Serialize feedback handler state."""
        return {
            "is_paused": self.is_paused,
            "feedback_counter": self._feedback_counter,
            "feedback_history": [
                {
                    "id": f.id,
                    "type": f.feedback_type.value,
                    "target_id": f.target_id,
                    "content": f.content,
                    "reason": f.reason,
                    "timestamp": f.timestamp.isoformat(),
                    "processed": f.processed,
                }
                for f in self.feedback_history
            ],
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "FeedbackHandler":
        """Deserialize feedback handler state."""
        handler = cls()
        handler.is_paused = data.get("is_paused", False)
        handler._feedback_counter = data.get("feedback_counter", 0)

        for fb_data in data.get("feedback_history", []):
            feedback = UserFeedback(
                id=fb_data["id"],
                feedback_type=FeedbackType(fb_data["type"]),
                target_id=fb_data.get("target_id"),
                content=fb_data.get("content", ""),
                reason=fb_data.get("reason", ""),
                timestamp=datetime.fromisoformat(fb_data["timestamp"]),
                processed=fb_data.get("processed", False),
            )
            handler.feedback_history.append(feedback)

        return handler
