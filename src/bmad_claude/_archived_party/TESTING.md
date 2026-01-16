# Party Mode Testing Policy

## Core Principle: No Mocks

**Mock tests are FORBIDDEN in the BMAD-Claude project.**

All tests must use real OpenCode calls to validate actual system behavior.
This ensures we test what users actually experience.

## Why No Mocks?

1. **Real validation** - Mocks can hide integration issues
2. **Actual behavior** - Tests verify the real system, not assumptions
3. **BMAD compliance** - Ensures methodology is actually followed
4. **User confidence** - If tests pass, the system works

## Test Scope Guidelines

To minimize API costs while maintaining real testing:

| Test Type | Max Turns | Purpose |
|-----------|-----------|---------|
| Smoke | 1 | Verify basic system works |
| Integration | 2 | Test conversation flow |
| Full Phase | 3 | Complete phase coverage |

**Never exceed 3 turns per test.**

## Running Tests

```bash
# Quick smoke test (recommended for CI)
cd src && uv run python -m bmad_claude.party.tests.test_harness

# Full test suite
cd src && uv run pytest bmad_claude/party/tests/ -v

# Just smoke tests (fastest)
cd src && uv run pytest bmad_claude/party/tests/ -v -k smoke

# Integration tests
cd src && uv run pytest bmad_claude/party/tests/ -v -k integration
```

## Test Prerequisites

1. **OpenCode installed**: `which opencode`
2. **Profile configured**: `~/.config/opencode-personal/` or similar
3. **API credentials**: Valid Anthropic/OpenAI key in profile
4. **Network access**: Tests call real LLM APIs

## Writing New Tests

```python
from bmad_claude.party.tests.test_harness import (
    PartyScenario,
    PartyTestHarness,
)

@pytest.mark.asyncio
async def test_my_feature():
    """
    Test description.
    
    Uses REAL OpenCode - max 2 turns for cost efficiency.
    """
    scenario = PartyScenario(
        name="my_test",
        project_name="Test Project",
        max_turns=2,  # Keep LOW!
        expected_min_decisions=1,
    )
    
    with PartyTestHarness(verbose=True) as harness:
        result = await harness.run_scenario(scenario)
    
    assert result.passed, f"Failed: {result.errors}"
```

## Cost Considerations

Each test turn = 1 OpenCode API call = real money.

**Estimated costs per test run:**
- Smoke test (1 turn): ~$0.05-0.10
- Integration test (2 turns): ~$0.10-0.20
- Full suite: ~$0.50-1.00

Keep this in mind when adding tests. Prefer fewer, more meaningful tests.

## CI/CD Integration

For CI pipelines, run only smoke tests by default:

```yaml
# GitHub Actions example
- name: Run smoke tests
  run: |
    cd src
    uv run pytest bmad_claude/party/tests/ -v -k smoke
```

Full test suite can be triggered manually or on release branches.

## BMAD Methodology Compliance

All tests should respect BMAD phases:

1. Tests start in **Planning** phase (default)
2. Phase transitions are validated
3. Artifacts follow BMAD structure
4. Agent selection matches phase requirements

See `PhaseManager` for phase definitions.
