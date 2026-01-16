"""
BMAD-Claude Party Mode

Collaborative multi-agent discussion system where AI agents
discuss together like a human team to produce software artifacts.

Key Components:
- PartySession: Manages the collaborative discussion session
- PartyMemory: Handles context persistence and compression
- AgentOrchestrator: Selects and coordinates agents
- PhaseManager: Guides discussions through BMAD phases
- ArtifactExtractor: Extracts PRD, Architecture from discussions
"""

from bmad_claude.party.session import PartySession
from bmad_claude.party.memory import PartyMemory, Message, Decision
from bmad_claude.party.orchestrator import AgentOrchestrator
from bmad_claude.party.phase import PhaseManager

__all__ = [
    "PartySession",
    "PartyMemory",
    "Message",
    "Decision",
    "AgentOrchestrator",
    "PhaseManager",
]
