"""
BMAD-Claude Party Mode

Collaborative multi-agent discussion system where AI agents
discuss together like a human team to produce software artifacts.

Key Components:
- PartySession: Manages the collaborative discussion session
- PartyMemory: Handles context persistence and compression
- AgentOrchestrator: Selects and coordinates agents
- PhaseManager: Guides discussions through BMAD phases
- OpenCodeClient: Streaming HTTP client for OpenCode server
- OpenCodePool: Load balancing across multiple OpenCode profiles
"""

from bmad_claude.party.session import PartySession
from bmad_claude.party.memory import PartyMemory, Message, Decision
from bmad_claude.party.orchestrator import AgentOrchestrator
from bmad_claude.party.phase import PhaseManager
from bmad_claude.party.opencode_client import OpenCodeClient, OpenCodeConfig, StreamEvent
from bmad_claude.party.opencode_pool import (
    OpenCodePool,
    OpenCodeProfile,
    LoadBalanceStrategy,
    BUILTIN_PROFILES,
    get_available_profiles,
    create_pool_from_names,
)
from bmad_claude.party.feedback import (
    FeedbackHandler,
    FeedbackType,
    UserFeedback,
    ParsedCommand,
    COMMANDS as FEEDBACK_COMMANDS,
)

__all__ = [
    "PartySession",
    "PartyMemory",
    "Message",
    "Decision",
    "AgentOrchestrator",
    "PhaseManager",
    "OpenCodeClient",
    "OpenCodeConfig",
    "StreamEvent",
    "OpenCodePool",
    "OpenCodeProfile",
    "LoadBalanceStrategy",
    "BUILTIN_PROFILES",
    "get_available_profiles",
    "create_pool_from_names",
    "FeedbackHandler",
    "FeedbackType",
    "UserFeedback",
    "ParsedCommand",
    "FEEDBACK_COMMANDS",
]
