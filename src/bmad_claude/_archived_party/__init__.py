"""
BMAD-Claude Party Mode

Collaborative multi-agent discussion system where AI agents
discuss together like a human team to produce software artifacts.

## Key Components

- PartySession: Manages the collaborative discussion session
- PartyMemory: Handles context persistence and compression
- AgentOrchestrator: Selects and coordinates agents
- PhaseManager: Guides discussions through BMAD phases
- FeedbackHandler: User feedback and command processing

## BMAD Methodology

Party Mode follows the BMAD 4-phase methodology:
1. **Planning** - Product vision, target users, success metrics, MVP scope
2. **Solutioning** - Architecture, epics/stories, test design
3. **Implementation** - Sprint planning, story development
4. **Completion** - Review and finalization

## Testing Policy

**IMPORTANT: Mock tests are FORBIDDEN in this project.**

All tests use real OpenCode calls. Tests are designed to be small-scoped
(1-2 turns maximum) to minimize API costs while providing real validation.

```bash
# Run smoke test (1 turn - minimal cost)
cd src && uv run python -m bmad_claude.party.tests.test_harness

# Run full test suite
cd src && uv run pytest bmad_claude/party/tests/ -v
```

See `bmad_claude/party/tests/` for test implementation.
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
