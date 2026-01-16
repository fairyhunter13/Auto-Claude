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
"""

from bmad_claude.party.session import PartySession
from bmad_claude.party.memory import PartyMemory, Message, Decision
from bmad_claude.party.orchestrator import AgentOrchestrator
from bmad_claude.party.phase import PhaseManager
from bmad_claude.party.opencode_client import OpenCodeClient, OpenCodeConfig, StreamEvent

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
]
