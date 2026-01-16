"""
BMAD-Claude Party Mode Integration Tests.

IMPORTANT: These are REAL integration tests that call OpenCode.
No mocks are used - we test the actual system end-to-end.

## Testing Philosophy

Mock tests are **FORBIDDEN** in this project. All tests must:
1. Use real OpenCode calls
2. Be small-scoped (1-2 turns max) to minimize API costs
3. Follow BMAD methodology phases
4. Validate actual system behavior

## Running Tests

```bash
# Run all party mode tests (requires OpenCode configured)
cd src && uv run pytest bmad_claude/party/tests/ -v

# Run quick smoke test
cd src && uv run python -m bmad_claude.party.tests.test_harness
```

## Test Scope Guidelines

- **Smoke tests**: 1 turn, single topic - verify basic flow
- **Integration tests**: 2 turns, validates phase progression
- **Never exceed 3 turns** - keeps costs low

## Prerequisites

1. OpenCode installed and configured
2. Valid API credentials (personal or work profile)
3. Network access to LLM provider
"""

from bmad_claude.party.tests.test_harness import (
    PartyScenario,
    PartyTestResult,
    PartyTestHarness,
    run_smoke_test,
)

__all__ = [
    "PartyScenario",
    "PartyTestResult",
    "PartyTestHarness",
    "run_smoke_test",
]
