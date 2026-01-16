"""
PartyTestHarness - Real Integration Testing for Party Mode.

IMPORTANT: No mocks! All tests use real OpenCode calls.

This harness runs actual Party Mode sessions with real LLM responses.
Tests are designed to be small-scoped (1-2 turns) to minimize API costs.

## Usage

```python
# Quick smoke test (1 turn)
result = await run_smoke_test()
assert result.passed

# Custom scenario
harness = PartyTestHarness(verbose=True)
result = await harness.run_scenario(PartyScenario(
    name="my_test",
    project_name="Test App",
    max_turns=2,
))
```

## Testing Guidelines

1. **No mocks** - Tests use real OpenCode
2. **Small scope** - Max 2-3 turns per test
3. **Follow BMAD phases** - Tests respect methodology
4. **Validate outcomes** - Check decisions, topics covered
"""

from __future__ import annotations

import asyncio
import shutil
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from bmad_claude.party.session import PartySession, Discussion, PhaseTransition
from bmad_claude.party.feedback import FeedbackType


@dataclass
class SimulatedInput:
    """
    Simulated user input for testing.

    Allows injecting user messages or commands at specific turns.
    """

    turn: int  # Which turn to inject this input
    input_type: str  # "message" or "command"
    value: str  # The actual input


@dataclass
class PartyScenario:
    """
    A test scenario for Party Mode.

    Defines what to test and expected outcomes.
    Keep max_turns LOW (1-2) to minimize API costs.
    """

    name: str
    description: str = ""
    project_name: str = "Test Project"

    # Simulated inputs at specific turns
    inputs: list[SimulatedInput] = field(default_factory=list)

    # Expected outcomes (0 = don't validate)
    expected_min_decisions: int = 0
    expected_min_topics: int = 0

    # IMPORTANT: Keep this LOW to minimize API costs
    max_turns: int = 1  # Default to single turn

    # OpenCode configuration
    profile: str = "personal"  # OpenCode profile to use
    model: str = "anthropic/claude-sonnet-4-20250514"  # Use faster model for tests


@dataclass
class PartyTestResult:
    """Result of running a real integration test."""

    scenario: PartyScenario
    passed: bool

    # Actual outcomes
    discussions: list[Discussion] = field(default_factory=list)
    transitions: list[PhaseTransition] = field(default_factory=list)
    decisions_made: int = 0
    topics_covered: int = 0
    turns_completed: int = 0

    # Errors encountered
    errors: list[str] = field(default_factory=list)

    # Performance
    duration_seconds: float = 0.0

    def summary(self) -> str:
        """Generate human-readable summary."""
        status = "PASSED" if self.passed else "FAILED"
        lines = [
            f"Test: {self.scenario.name} - {status}",
            f"Turns: {self.turns_completed}/{self.scenario.max_turns}",
            f"Decisions: {self.decisions_made}",
            f"Topics: {self.topics_covered}",
            f"Duration: {self.duration_seconds:.1f}s",
        ]
        if self.errors:
            lines.append(f"Errors: {', '.join(self.errors)}")
        return "\n".join(lines)


class PartyTestHarness:
    """
    Real integration test harness for Party Mode.

    IMPORTANT: This uses REAL OpenCode calls. No mocks!

    Keep test scenarios small (1-2 turns) to minimize costs.

    Usage:
        harness = PartyTestHarness(verbose=True)
        result = await harness.run_scenario(scenario)
        assert result.passed
    """

    def __init__(
        self,
        temp_dir: Path | None = None,
        verbose: bool = False,
        opencode_path: str = "opencode",
    ):
        self.temp_dir = temp_dir
        self.verbose = verbose
        self.opencode_path = opencode_path
        self._cleanup_dirs: list[Path] = []

    def _log(self, msg: str):
        """Log if verbose mode enabled."""
        if self.verbose:
            print(msg)

    async def run_scenario(self, scenario: PartyScenario) -> PartyTestResult:
        """
        Run a test scenario with REAL OpenCode calls.

        Args:
            scenario: The test scenario

        Returns:
            PartyTestResult with actual outcomes
        """
        start_time = time.time()
        result = PartyTestResult(scenario=scenario, passed=False)

        # Create temp directory for session
        if self.temp_dir:
            project_root = self.temp_dir
        else:
            project_root = Path(tempfile.mkdtemp(prefix="party_test_"))
            self._cleanup_dirs.append(project_root)

        self._log(f"Running scenario: {scenario.name}")
        self._log(f"Project root: {project_root}")

        try:
            # Create REAL session
            session = await PartySession.create(
                project_name=scenario.project_name,
                project_root=project_root,
                opencode_path=self.opencode_path,
                model=scenario.model,
                profiles=[scenario.profile],
            )

            self._log(f"Session created: {session.session_id}")

            # Run discussion loop
            turn = 0
            input_queue = list(scenario.inputs)

            while turn < scenario.max_turns and not session.is_complete():
                self._log(f"\n--- Turn {turn + 1}/{scenario.max_turns} ---")

                # Check for simulated input
                user_input = None
                for sim_input in input_queue:
                    if sim_input.turn == turn:
                        user_input = sim_input.value
                        input_queue.remove(sim_input)
                        self._log(f"User input: {user_input[:50]}...")
                        break

                # Run REAL discussion (calls OpenCode)
                try:
                    self._log("Calling OpenCode...")

                    discussion = await session.stream_discuss(
                        user_message=user_input,
                        on_text=lambda t: print(t, end="", flush=True) if self.verbose else None,
                    )

                    result.discussions.append(discussion)
                    result.decisions_made += len(discussion.decisions)

                    self._log(f"\nTopic: {discussion.topic}")
                    self._log(f"Responses: {len(discussion.agent_responses)}")
                    self._log(f"Decisions: {len(discussion.decisions)}")

                except Exception as e:
                    error_msg = f"Turn {turn}: {str(e)}"
                    result.errors.append(error_msg)
                    self._log(f"ERROR: {error_msg}")
                    break  # Stop on error

                turn += 1

            result.turns_completed = turn

            # Get topics covered
            phase_summary = session.phase_manager.get_phase_summary()
            result.topics_covered = phase_summary["topics_covered"]

            # Validate outcomes
            result.passed = self._validate_result(result)

            # Save session
            session.save()

        except Exception as e:
            result.errors.append(f"Scenario failed: {str(e)}")
            self._log(f"SCENARIO FAILED: {e}")

        result.duration_seconds = time.time() - start_time

        self._log(f"\n{result.summary()}")

        return result

    def _validate_result(self, result: PartyTestResult) -> bool:
        """Validate test result against expected outcomes."""
        scenario = result.scenario

        # Fail if there were errors
        if result.errors:
            return False

        # Validate minimum decisions
        if scenario.expected_min_decisions > 0:
            if result.decisions_made < scenario.expected_min_decisions:
                result.errors.append(
                    f"Expected >= {scenario.expected_min_decisions} decisions, "
                    f"got {result.decisions_made}"
                )
                return False

        # Validate minimum topics
        if scenario.expected_min_topics > 0:
            if result.topics_covered < scenario.expected_min_topics:
                result.errors.append(
                    f"Expected >= {scenario.expected_min_topics} topics, "
                    f"got {result.topics_covered}"
                )
                return False

        # Must have completed at least one turn
        if result.turns_completed == 0 and scenario.max_turns > 0:
            result.errors.append("No turns completed")
            return False

        return True

    def cleanup(self):
        """Clean up temporary directories."""
        for dir_path in self._cleanup_dirs:
            if dir_path.exists():
                shutil.rmtree(dir_path)
        self._cleanup_dirs.clear()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.cleanup()


# =============================================================================
# Quick Test Functions
# =============================================================================


async def run_smoke_test(
    verbose: bool = True,
    profile: str = "personal",
) -> PartyTestResult:
    """
    Run a minimal smoke test (1 turn).

    This is the fastest way to verify Party Mode works.
    Uses a single turn to minimize API costs.

    Args:
        verbose: Print progress
        profile: OpenCode profile to use

    Returns:
        PartyTestResult
    """
    scenario = PartyScenario(
        name="smoke_test",
        description="Minimal 1-turn smoke test",
        project_name="Smoke Test",
        max_turns=1,
        profile=profile,
        # Expect at least one decision from planning discussion
        expected_min_decisions=0,  # Don't require decisions for smoke test
    )

    with PartyTestHarness(verbose=verbose) as harness:
        result = await harness.run_scenario(scenario)

    return result


async def run_quick_integration_test(
    verbose: bool = True,
    profile: str = "personal",
) -> PartyTestResult:
    """
    Run a quick integration test (2 turns).

    Tests basic conversation flow with two turns.

    Args:
        verbose: Print progress
        profile: OpenCode profile to use

    Returns:
        PartyTestResult
    """
    scenario = PartyScenario(
        name="quick_integration",
        description="2-turn integration test",
        project_name="Quick Integration Test",
        max_turns=2,
        profile=profile,
        inputs=[
            SimulatedInput(
                turn=0,
                input_type="message",
                value="Build a simple todo list app",
            ),
        ],
        expected_min_decisions=1,
        expected_min_topics=1,
    )

    with PartyTestHarness(verbose=verbose) as harness:
        result = await harness.run_scenario(scenario)

    return result


# =============================================================================
# CLI Entry Point
# =============================================================================


def main():
    """Run smoke test from command line."""
    import sys

    async def run():
        print("=" * 60)
        print("BMAD-Claude Party Mode - Real Integration Test")
        print("=" * 60)
        print("\nIMPORTANT: This uses REAL OpenCode calls (no mocks)")
        print("Keeping scope minimal (1 turn) to save API costs\n")

        result = await run_smoke_test(verbose=True)

        print("\n" + "=" * 60)
        print("RESULT:", "PASSED" if result.passed else "FAILED")
        print("=" * 60)

        return 0 if result.passed else 1

    sys.exit(asyncio.run(run()))


if __name__ == "__main__":
    main()
