"""
BMAD-Claude Party Mode - Real Integration Tests.

IMPORTANT: These are REAL tests that call OpenCode.
NO MOCKS ARE USED - Mock tests are FORBIDDEN in this project.

## Running Tests

```bash
# Run all tests (requires OpenCode)
cd src && uv run pytest bmad_claude/party/tests/test_party_session.py -v

# Run just smoke test (fastest)
cd src && uv run pytest bmad_claude/party/tests/test_party_session.py -v -k smoke
```

## Test Scope

Tests are designed to be MINIMAL to save API costs:
- Smoke test: 1 turn
- Integration test: 2 turns
- Never exceed 3 turns

## Prerequisites

- OpenCode installed and configured
- Valid API credentials
- Network access
"""

import pytest
from bmad_claude.party.tests.test_harness import (
    PartyScenario,
    SimulatedInput,
    PartyTestHarness,
    run_smoke_test,
    run_quick_integration_test,
)


# =============================================================================
# Smoke Tests (1 turn - minimal API cost)
# =============================================================================


class TestSmokeTests:
    """
    Minimal smoke tests - single turn only.

    These are the fastest tests and use minimal API calls.
    Run these first to verify basic functionality.
    """

    @pytest.mark.asyncio
    async def test_smoke_party_mode(self):
        """
        Smoke test: Single turn Party Mode session.

        Verifies:
        - Session creation works
        - OpenCode can be called
        - Basic discussion flow works
        """
        result = await run_smoke_test(verbose=True)

        assert result.turns_completed >= 1, f"No turns completed: {result.errors}"
        assert len(result.discussions) >= 1, "No discussions recorded"
        # Smoke test just verifies the system works - doesn't require decisions


# =============================================================================
# Integration Tests (2 turns - low API cost)
# =============================================================================


class TestIntegration:
    """
    Integration tests - 2 turns maximum.

    Tests actual conversation flow and decision making.
    Still minimal to keep API costs low.
    """

    @pytest.mark.asyncio
    async def test_basic_planning_flow(self):
        """
        Test basic planning phase flow with user input.

        Verifies:
        - User input is processed
        - Agents respond appropriately
        - At least one decision is made
        """
        result = await run_quick_integration_test(verbose=True)

        assert result.passed, f"Test failed: {result.errors}"
        assert result.turns_completed == 2, f"Expected 2 turns, got {result.turns_completed}"
        assert result.decisions_made >= 1, f"Expected decisions, got {result.decisions_made}"

    @pytest.mark.asyncio
    async def test_topic_coverage(self):
        """
        Test that topics are properly covered.

        Verifies:
        - Phase manager tracks topic coverage
        - At least one topic is marked covered
        """
        scenario = PartyScenario(
            name="topic_coverage",
            description="Verify topic tracking",
            project_name="Topic Test",
            max_turns=2,
            expected_min_topics=1,
        )

        with PartyTestHarness(verbose=True) as harness:
            result = await harness.run_scenario(scenario)

        assert result.passed, f"Test failed: {result.errors}"
        assert result.topics_covered >= 1, f"No topics covered: {result.topics_covered}"


# =============================================================================
# Error Handling Tests (1 turn)
# =============================================================================


class TestErrorHandling:
    """
    Test error handling - single turn.

    Verifies graceful handling of edge cases.
    """

    @pytest.mark.asyncio
    async def test_empty_user_input(self):
        """
        Test that empty user input is handled gracefully.

        The system should auto-select a topic when no input provided.
        """
        scenario = PartyScenario(
            name="empty_input",
            description="No user input provided",
            project_name="Empty Input Test",
            max_turns=1,
            # No inputs - system should handle this
        )

        with PartyTestHarness(verbose=True) as harness:
            result = await harness.run_scenario(scenario)

        # Should still work even without user input
        assert result.turns_completed >= 1, f"Failed to complete turn: {result.errors}"


# =============================================================================
# BMAD Phase Tests (2 turns)
# =============================================================================


class TestBMADPhases:
    """
    Test BMAD methodology compliance.

    Verifies Party Mode follows BMAD phases correctly.
    """

    @pytest.mark.asyncio
    async def test_starts_in_planning_phase(self):
        """
        Test that session starts in Planning phase.

        Per BMAD methodology, all projects start in Planning.
        """
        scenario = PartyScenario(
            name="phase_check",
            description="Verify starting phase",
            project_name="Phase Test",
            max_turns=1,
        )

        with PartyTestHarness(verbose=True) as harness:
            result = await harness.run_scenario(scenario)

        assert result.turns_completed >= 1
        # Check first discussion was in planning phase
        if result.discussions:
            assert result.discussions[0].phase == "planning", (
                f"Expected planning phase, got {result.discussions[0].phase}"
            )


# =============================================================================
# Quick CLI Tests
# =============================================================================

if __name__ == "__main__":
    import asyncio

    async def run_all():
        print("Running Party Mode Integration Tests...")
        print("=" * 60)

        # Run smoke test
        print("\n[1/2] Smoke Test...")
        smoke_result = await run_smoke_test(verbose=True)

        print("\n[2/2] Quick Integration Test...")
        integration_result = await run_quick_integration_test(verbose=True)

        print("\n" + "=" * 60)
        print("RESULTS:")
        print(f"  Smoke Test: {'PASSED' if smoke_result.passed else 'FAILED'}")
        print(f"  Integration: {'PASSED' if integration_result.passed else 'FAILED'}")
        print("=" * 60)

        return smoke_result.passed and integration_result.passed

    success = asyncio.run(run_all())
    exit(0 if success else 1)
