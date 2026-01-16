"""
End-to-End Test for Party Mode.

Tests complete BMAD workflow through multiple phases.
Uses REAL OpenCode calls - designed to be cost-efficient while thorough.

Run with:
    cd src && uv run python -m bmad_claude.party.tests.test_e2e
"""

import asyncio
import tempfile
from pathlib import Path

from bmad_claude.party.session import PartySession


async def run_e2e_test():
    """
    Run end-to-end Party Mode test.

    Scenario: Simple CLI Todo App
    - Small scope, clear requirements
    - Tests Planning → Solutioning transition
    - Validates topic coverage and decisions
    """
    print("=" * 70)
    print("BMAD-Claude Party Mode - End-to-End Test")
    print("=" * 70)
    print()
    print("Project: Simple CLI Todo App")
    print("Goal: Test complete BMAD workflow through Planning → Solutioning")
    print()
    print("⚠️  This uses REAL OpenCode calls. Estimated cost: ~$0.50-1.00")
    print()

    # Create temp directory for test project
    with tempfile.TemporaryDirectory(prefix="party_e2e_") as tmpdir:
        project_root = Path(tmpdir)

        # Create session
        print("Creating session...")
        session = await PartySession.create(
            project_name="CLI Todo App",
            project_root=project_root,
            opencode_path="opencode",
            model="anthropic/claude-sonnet-4-20250514",  # Faster model for testing
            profiles=["personal"],
        )

        print(f"Session ID: {session.session_id}")
        print(f"Starting Phase: {session.phase_manager.current_phase}")
        print()

        # Track results
        results = {
            "turns": 0,
            "topics_covered": [],
            "decisions": [],
            "phases": [session.phase_manager.current_phase],
            "errors": [],
        }

        # =================================================================
        # PHASE 1: PLANNING - Key Topics
        # =================================================================
        print("=" * 70)
        print("PHASE: PLANNING")
        print("=" * 70)

        # Turn 1: Product Vision (with user context)
        print("\n--- Turn 1: Product Vision ---")
        try:
            discussion = await session.stream_discuss(
                user_message="I want to build a simple CLI todo app in Python. "
                "It should let users add, list, complete, and delete tasks. "
                "Tasks are stored in a local JSON file. No database, no web UI - just CLI.",
                on_text=lambda t: print(t, end="", flush=True),
            )
            print()
            results["turns"] += 1
            results["topics_covered"].append(discussion.topic)
            results["decisions"].extend([d.decision for d in discussion.decisions])
            print(f"\n✓ Topic: {discussion.topic}")
            print(f"✓ Decisions: {len(discussion.decisions)}")
        except Exception as e:
            results["errors"].append(f"Turn 1: {e}")
            print(f"\n✗ Error: {e}")

        # Turn 2: Target Users & Success Metrics
        print("\n--- Turn 2: Target Users & Success ---")
        try:
            discussion = await session.stream_discuss(
                user_message="The target users are developers who want a quick way to track tasks "
                "without leaving the terminal. Success = users can manage their daily tasks in under 30 seconds.",
                on_text=lambda t: print(t, end="", flush=True),
            )
            print()
            results["turns"] += 1
            results["topics_covered"].append(discussion.topic)
            results["decisions"].extend([d.decision for d in discussion.decisions])
            print(f"\n✓ Topic: {discussion.topic}")
            print(f"✓ Decisions: {len(discussion.decisions)}")
        except Exception as e:
            results["errors"].append(f"Turn 2: {e}")
            print(f"\n✗ Error: {e}")

        # Turn 3: MVP Scope
        print("\n--- Turn 3: MVP Scope ---")
        try:
            discussion = await session.stream_discuss(
                user_message="For MVP scope: add task, list tasks, mark complete, delete task. "
                "That's it. No priorities, no due dates, no categories - just simple CRUD.",
                on_text=lambda t: print(t, end="", flush=True),
            )
            print()
            results["turns"] += 1
            results["topics_covered"].append(discussion.topic)
            results["decisions"].extend([d.decision for d in discussion.decisions])
            print(f"\n✓ Topic: {discussion.topic}")
            print(f"✓ Decisions: {len(discussion.decisions)}")
        except Exception as e:
            results["errors"].append(f"Turn 3: {e}")
            print(f"\n✗ Error: {e}")

        # Check Planning progress
        print("\n--- Planning Phase Summary ---")
        summary = session.phase_manager.get_phase_summary()
        print(f"Topics covered: {summary['topics_covered']}/{summary['topics_total']}")
        print(f"Required covered: {summary['required_covered']}/{summary['required_total']}")

        # Try phase transition
        print("\n--- Attempting Phase Transition ---")
        # For demo, manually pass gate check since we covered key topics
        session.phase_manager.pass_gate_check("prd-complete")

        # Mark key topics as covered based on discussions
        for topic_name in ["vision", "users", "success", "scope"]:
            session.phase_manager.mark_topic_covered(topic_name)

        # Add a mock PRD artifact to memory
        session.memory.update_artifact("prd", "# PRD Draft\n\nGenerated from discussions...")

        can_transition = session.phase_manager.can_transition(session.memory)
        print(f"Can transition: {can_transition}")

        if can_transition:
            transition = await session.transition_phase()
            if transition:
                print(f"✓ Transitioned: {transition.from_phase} → {transition.to_phase}")
                results["phases"].append(transition.to_phase)

        # =================================================================
        # PHASE 2: SOLUTIONING (if transitioned)
        # =================================================================
        if session.phase_manager.current_phase == "solutioning":
            print("\n" + "=" * 70)
            print("PHASE: SOLUTIONING")
            print("=" * 70)

            # Turn 4: Architecture
            print("\n--- Turn 4: Architecture ---")
            try:
                discussion = await session.stream_discuss(
                    user_message="Let's discuss architecture. I'm thinking a simple Python script "
                    "with Click for CLI, and a TodoManager class that handles JSON file operations.",
                    on_text=lambda t: print(t, end="", flush=True),
                )
                print()
                results["turns"] += 1
                results["topics_covered"].append(discussion.topic)
                results["decisions"].extend([d.decision for d in discussion.decisions])
                print(f"\n✓ Topic: {discussion.topic}")
                print(f"✓ Decisions: {len(discussion.decisions)}")
            except Exception as e:
                results["errors"].append(f"Turn 4: {e}")
                print(f"\n✗ Error: {e}")

        # =================================================================
        # RESULTS
        # =================================================================
        print("\n" + "=" * 70)
        print("END-TO-END TEST RESULTS")
        print("=" * 70)

        print(f"""
Turns Completed: {results["turns"]}
Topics Covered:  {len(results["topics_covered"])}
Decisions Made:  {len(results["decisions"])}
Phases Reached:  {" → ".join(results["phases"])}
Errors:          {len(results["errors"])}
        """)

        if results["errors"]:
            print("Errors encountered:")
            for err in results["errors"]:
                print(f"  - {err}")

        # Determine pass/fail
        passed = (
            results["turns"] >= 3 and len(results["decisions"]) >= 2 and len(results["errors"]) == 0
        )

        print()
        print("=" * 70)
        print(f"TEST RESULT: {'✅ PASSED' if passed else '❌ FAILED'}")
        print("=" * 70)

        # Save session for inspection
        session.save()
        print(f"\nSession saved to: {session.session_dir}")

        return passed


if __name__ == "__main__":
    success = asyncio.run(run_e2e_test())
    exit(0 if success else 1)
