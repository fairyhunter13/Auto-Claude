"""
BMAD-Claude CLI

Command-line interface for BMAD workflow execution.

Two modes available:
1. Party Mode (NEW!): Collaborative multi-agent discussions
   - bmad-claude party "Project Name"

2. Sequential Mode (Legacy): Workflow-by-workflow execution
   - bmad-claude init "Project Name"
   - bmad-claude run

BMAD Methodology Phases:
- Phase 1: Analysis (Optional) - brainstorm, research, product-brief
- Phase 2: Planning (Required) - PRD, UX design
- Phase 3: Solutioning (Required) - Architecture, Epics, Gate Check
- Phase 4: Implementation (Required) - Sprint Planning
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt
from rich.markdown import Markdown

from bmad_claude.driver import BMADDriver, get_bundled_bmad_path


# Initialize Typer app
app = typer.Typer(
    name="bmad-claude",
    help="BMAD-Claude: Collaborative AI Agents for Software Development",
    add_completion=False,
)

console = Console()


def print_banner():
    """Print the BMAD-Claude banner."""
    banner = """
[bold blue]
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ██████╗ ███╗   ███╗ █████╗ ██████╗        ██████╗██╗       ║
║   ██╔══██╗████╗ ████║██╔══██╗██╔══██╗      ██╔════╝██║       ║
║   ██████╔╝██╔████╔██║███████║██║  ██║█████╗██║     ██║       ║
║   ██╔══██╗██║╚██╔╝██║██╔══██║██║  ██║╚════╝██║     ██║       ║
║   ██████╔╝██║ ╚═╝ ██║██║  ██║██████╔╝      ╚██████╗███████╗  ║
║   ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═════╝        ╚═════╝╚══════╝  ║
║                                                              ║
║         Autonomous BMAD Workflow Execution via OpenCode      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
[/bold blue]
"""
    console.print(banner)


def print_bmad_methodology():
    """Print BMAD methodology overview."""
    console.print(
        Panel.fit(
            """[bold]BMAD Methodology Phases[/bold]

[cyan]Phase 1: Analysis (Optional)[/cyan]
  • brainstorm-project (analyst)
  • research (analyst)
  • product-brief (analyst)

[green]Phase 2: Planning (Required)[/green]
  • prd (pm) - Product Requirements Document
  • create-ux-design (ux-designer) - if has UI

[yellow]Phase 3: Solutioning (Required)[/yellow]
  • create-architecture (architect)
  • create-epics-and-stories (pm)
  • test-design (tea) - optional
  • implementation-readiness (architect) - Gate Check

[magenta]Phase 4: Implementation (Required)[/magenta]
  • sprint-planning (sm)
  • Then: story creation → development → code review cycle
""",
            title="BMAD Method",
            style="blue",
        )
    )


@app.command()
def init(
    project_name: str = typer.Argument(
        ...,
        help="Name of the project",
    ),
    project_type: str = typer.Option(
        "greenfield",
        "--type",
        "-t",
        help="Project type: greenfield (new) or brownfield (existing codebase)",
    ),
    track: str = typer.Option(
        "bmad-method",
        "--track",
        help="Planning track: bmad-method or enterprise",
    ),
    no_copy_bmad: bool = typer.Option(
        False,
        "--no-copy-bmad",
        help="Don't copy _bmad folder to project root (use bundled version)",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
    model: str = typer.Option(
        "anthropic/claude-sonnet-4-20250514",
        "--model",
        "-m",
        help="LLM model to use",
    ),
):
    """
    Initialize BMAD workflow tracking for a project.

    Uses BMAD's workflow-init to set up the project according to BMAD methodology.
    Creates bmm-workflow-status.yaml to track progress through phases.

    Examples:
        bmad-claude init "My Awesome App"
        bmad-claude init "Legacy Migration" --type brownfield
        bmad-claude init "Enterprise App" --track enterprise
    """
    print_banner()
    print_bmad_methodology()

    driver = BMADDriver(
        opencode_path=opencode_path,
        model=model,
    )

    console.print(f"\n[bold]Initializing BMAD for:[/bold] {project_name}")
    console.print(f"[dim]Type: {project_type} | Track: {track}[/dim]\n")

    success = asyncio.run(
        driver.initialize(
            project_name,
            project_type=project_type,
            selected_track=track,
            copy_bmad=not no_copy_bmad,
        )
    )

    if success:
        console.print(f"\n[green]✅ Project initialized: {project_name}[/green]")
        console.print("\n[bold]Next steps:[/bold]")
        console.print("  1. Run [cyan]bmad-claude status[/cyan] to see workflow status")
        console.print("  2. Run [cyan]bmad-claude run[/cyan] to execute all phases")
        console.print("  3. Run [cyan]bmad-claude phase 2[/cyan] to run just Planning phase")
    else:
        console.print("\n[red]❌ Initialization failed[/red]")
        raise typer.Exit(1)


@app.command()
def status():
    """
    Show current BMAD workflow status.

    Displays:
    - Project information
    - Completed workflows (✅)
    - Pending workflows (⏳)
    - Next workflow to execute
    """
    driver = BMADDriver(verbose=False)

    if not driver.is_initialized():
        console.print(
            "[yellow]Project not initialized. Run 'bmad-claude init <project>' first.[/yellow]"
        )
        print_bmad_methodology()
        return

    console.print(driver.get_status_summary())


@app.command()
def run(
    start_phase: int = typer.Option(
        2,
        "--start",
        "-s",
        help="Phase to start from (1-4). Default is 2 (Planning).",
    ),
    include_optional: bool = typer.Option(
        False,
        "--include-optional",
        "-o",
        help="Include optional Phase 1 (Analysis) workflows",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
    model: str = typer.Option(
        "anthropic/claude-sonnet-4-20250514",
        "--model",
        "-m",
        help="LLM model to use",
    ),
):
    """
    Run BMAD workflows autonomously.

    Executes BMAD phases in order using OpenCode and YOLO mode.
    By default, starts from Phase 2 (Planning) since Phase 1 is optional.

    BMAD Flow:
        Phase 2: PRD → (UX Design)
        Phase 3: Architecture → Epics → (Test Design) → Gate Check
        Phase 4: Sprint Planning

    Examples:
        bmad-claude run                    # Run from Phase 2 (Planning)
        bmad-claude run --start 1 -o       # Include optional Phase 1 (Analysis)
        bmad-claude run --start 3          # Start from Phase 3 (Solutioning)
    """
    print_banner()

    driver = BMADDriver(opencode_path=opencode_path, model=model)

    if not driver.is_initialized():
        console.print(
            "[yellow]Project not initialized. Run 'bmad-claude init <project>' first.[/yellow]"
        )
        raise typer.Exit(1)

    console.print(f"\n[bold]Running BMAD Methodology: Phases {start_phase}-4[/bold]")
    if include_optional:
        console.print("[dim]Including optional workflows[/dim]")
    console.print()

    success = asyncio.run(driver.run_all(start_phase, include_optional))

    if success:
        console.print("\n[bold green]🎉 BMAD Methodology Complete![/bold green]")
        console.print("\nAll planning phases completed. Ready for implementation!")
    else:
        console.print("\n[bold red]⚠️ Some workflows failed. Check output above.[/bold red]")
        raise typer.Exit(1)


@app.command()
def phase(
    phase_number: int = typer.Argument(
        ...,
        help="Phase number to run (1-4)",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
    model: str = typer.Option(
        "anthropic/claude-sonnet-4-20250514",
        "--model",
        "-m",
        help="LLM model to use",
    ),
):
    """
    Run a specific BMAD phase.

    BMAD Phases:
        1 - Analysis (Optional): brainstorm, research, product-brief
        2 - Planning (Required): PRD, UX design
        3 - Solutioning (Required): Architecture, Epics, Gate Check
        4 - Implementation (Required): Sprint Planning

    Examples:
        bmad-claude phase 2    # Run Planning phase (PRD)
        bmad-claude phase 3    # Run Solutioning phase (Architecture, Epics)
    """
    print_banner()

    driver = BMADDriver(opencode_path=opencode_path, model=model)

    if not driver.is_initialized():
        console.print(
            "[yellow]Project not initialized. Run 'bmad-claude init <project>' first.[/yellow]"
        )
        raise typer.Exit(1)

    if phase_number < 1 or phase_number > 4:
        console.print("[red]Error: Phase must be 1-4[/red]")
        raise typer.Exit(1)

    success = asyncio.run(driver.run_phase(phase_number))

    if success:
        console.print(f"\n[bold green]✅ Phase {phase_number} completed![/bold green]")
    else:
        console.print(f"\n[bold red]❌ Phase {phase_number} failed[/bold red]")
        raise typer.Exit(1)


@app.command()
def workflow(
    workflow_id: str = typer.Argument(
        ...,
        help="Workflow ID to run (e.g., 'prd', 'create-architecture')",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
    model: str = typer.Option(
        "anthropic/claude-sonnet-4-20250514",
        "--model",
        "-m",
        help="LLM model to use",
    ),
):
    """
    Run a specific BMAD workflow.

    Available workflows (by phase):
        Phase 1 (Optional):
            - brainstorm-project: Creative exploration
            - research: Technical/competitive analysis
            - product-brief: Strategic product planning

        Phase 2 (Planning):
            - prd: Create Product Requirements Document
            - create-ux-design: Create UX design (if has UI)

        Phase 3 (Solutioning):
            - create-architecture: Create system architecture
            - create-epics-and-stories: Break down into epics
            - test-design: Testability review (optional)
            - implementation-readiness: Gate check

        Phase 4 (Implementation):
            - sprint-planning: Create sprint plan

    Examples:
        bmad-claude workflow prd
        bmad-claude workflow create-architecture
    """
    print_banner()

    driver = BMADDriver(opencode_path=opencode_path, model=model)

    # Load method to find the workflow
    phases = driver._load_method()

    target_workflow = None
    for phase in phases:
        for wf in phase.workflows:
            if wf.get("id") == workflow_id:
                target_workflow = {
                    **wf,
                    "phase": phase.number,
                    "phase_name": phase.name,
                }
                break
        if target_workflow:
            break

    if not target_workflow:
        console.print(f"[red]Error: Workflow '{workflow_id}' not found[/red]")
        console.print("\n[bold]Available workflows:[/bold]")
        for phase in phases:
            console.print(f"\n[cyan]Phase {phase.number}: {phase.name}[/cyan]")
            for wf in phase.workflows:
                console.print(f"  - {wf.get('id')} ({wf.get('agent')})")
        raise typer.Exit(1)

    console.print(f"\n[bold]Running workflow:[/bold] {workflow_id}")
    console.print(f"[dim]Phase {target_workflow['phase']}: {target_workflow['phase_name']}[/dim]")
    console.print(f"[dim]Agent: {target_workflow.get('agent')}[/dim]\n")

    success = asyncio.run(driver.run_workflow(target_workflow))

    if success:
        console.print(f"\n[bold green]✅ Workflow '{workflow_id}' completed![/bold green]")
    else:
        console.print(f"\n[bold red]❌ Workflow '{workflow_id}' failed[/bold red]")
        raise typer.Exit(1)


@app.command(name="list")
def list_workflows():
    """
    List all available BMAD workflows by phase.
    """
    driver = BMADDriver(verbose=False)
    phases = driver._load_method()

    table = Table(title="BMAD Workflows (method-greenfield)")
    table.add_column("Phase", style="cyan")
    table.add_column("ID", style="green")
    table.add_column("Agent", style="yellow")
    table.add_column("Type", style="blue")
    table.add_column("Command", style="dim")

    for phase in phases:
        for i, wf in enumerate(phase.workflows):
            wf_type = (
                "required"
                if wf.get("required")
                else "optional"
                if wf.get("optional")
                else "conditional"
            )
            table.add_row(
                f"{phase.number}. {phase.name}" if i == 0 else "",
                wf.get("id", ""),
                wf.get("agent", "-"),
                wf_type,
                wf.get("command", ""),
            )

    console.print(table)


@app.command(name="next")
def show_next():
    """
    Show the next workflow to execute based on current status.
    """
    driver = BMADDriver(verbose=False)

    if not driver.is_initialized():
        console.print(
            "[yellow]Project not initialized. Run 'bmad-claude init <project>' first.[/yellow]"
        )
        return

    workflow = driver.get_next_workflow()

    if workflow:
        console.print(
            Panel.fit(
                f"""[bold]Next Workflow[/bold]

[cyan]ID:[/cyan] {workflow["id"]}
[cyan]Phase:[/cyan] {workflow["phase"]} - {workflow["phase_name"]}
[cyan]Agent:[/cyan] {workflow.get("agent", "N/A")}
[cyan]Command:[/cyan] {workflow.get("command", "N/A")}

[bold]To run:[/bold]
  bmad-claude workflow {workflow["id"]}
  
[dim]Or run all remaining phases:[/dim]
  bmad-claude run
""",
                title="BMAD Next Step",
                style="green",
            )
        )
    else:
        console.print(
            Panel.fit(
                "[bold green]🎉 All workflows completed![/bold green]\n\n"
                "Ready for implementation phase.",
                title="BMAD Complete",
                style="green",
            )
        )


@app.command(name="copy-bmad")
def copy_bmad(
    force: bool = typer.Option(
        False,
        "--force",
        "-f",
        help="Overwrite existing _bmad folder",
    ),
):
    """
    Copy the bundled BMAD framework to your project root.

    This allows you to customize BMAD workflows, agents, and templates.
    """
    print_banner()

    driver = BMADDriver(use_bundled_bmad=True)
    success = driver.copy_bmad_to_project(force=force)

    if success:
        console.print("\n[green]✅ BMAD framework copied to project root[/green]")
        console.print("\n[bold]BMAD directories:[/bold]")
        console.print("  _bmad/bmm/    - BMAD Method (workflows, agents)")
        console.print("  _bmad/bmb/    - BMAD Builder (templates)")
        console.print("  _bmad/cis/    - Creative Innovation System")
        console.print("  _bmad/core/   - Core execution engine (workflow.xml)")
    else:
        console.print("\n[red]❌ Failed to copy BMAD framework[/red]")
        raise typer.Exit(1)


@app.command(name="info")
def show_info():
    """
    Show information about BMAD-Claude configuration.
    """
    bundled_path = get_bundled_bmad_path()
    project_path = Path.cwd() / "_bmad"

    console.print(
        Panel.fit(
            "[bold]BMAD-Claude Configuration[/bold]",
            style="blue",
        )
    )

    table = Table(show_header=False, box=None)
    table.add_column("Key", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("Working Directory", str(Path.cwd()))
    table.add_row("Bundled _bmad", str(bundled_path))
    table.add_row("Bundled exists", "✅ Yes" if bundled_path.exists() else "❌ No")
    table.add_row("Project _bmad", str(project_path))
    table.add_row("Project exists", "✅ Yes" if project_path.exists() else "❌ No")
    table.add_row("Active _bmad", str(project_path) if project_path.exists() else str(bundled_path))

    console.print(table)
    console.print()

    # Show BMAD methodology summary
    print_bmad_methodology()


# =============================================================================
# PARTY MODE COMMANDS (NEW!)
# =============================================================================


def print_party_banner():
    """Print the party mode banner."""
    banner = """
[bold magenta]
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎉 BMAD-CLAUDE PARTY MODE 🎉                              ║
║                                                              ║
║   Collaborative Multi-Agent Discussions                      ║
║   Where AI agents discuss together like a human team         ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
[/bold magenta]
"""
    console.print(banner)


@app.command()
def party(
    project_name: str = typer.Argument(
        ...,
        help="Name of the project to discuss",
    ),
    resume_session: str = typer.Option(
        None,
        "--resume",
        "-r",
        help="Resume an existing session by ID",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
    model: str = typer.Option(
        "anthropic/claude-opus-4-5",
        "--model",
        "-m",
        help="LLM model to use in provider/model format (e.g., anthropic/claude-opus-4-5)",
    ),
    variant: str = typer.Option(
        "max",
        "--variant",
        "-v",
        help="Model variant (e.g., 'max' for maximum thinking budget on Anthropic)",
    ),
):
    """
    Start a party mode session with collaborative AI agents.

    Party Mode brings together multiple BMAD agents (PM, Architect, Analyst, etc.)
    to discuss your project collaboratively, producing artifacts through natural
    conversation.

    Examples:
        bmad-claude party "Task Management App"
        bmad-claude party "E-commerce Platform" --model anthropic/claude-opus-4-5 --variant max
        bmad-claude party "My Project" --resume party-2026-01-16-my-project
    """
    print_party_banner()

    asyncio.run(
        _run_party_session(
            project_name=project_name,
            resume_session=resume_session,
            opencode_path=opencode_path,
            model=model,
            variant=variant,
        )
    )


async def _run_party_session(
    project_name: str,
    resume_session: str | None,
    opencode_path: str,
    model: str,
    variant: str,
):
    """Run the interactive party mode session."""
    from bmad_claude.party import PartySession

    try:
        # Create or resume session
        if resume_session:
            console.print(f"[cyan]Resuming session: {resume_session}[/cyan]")
            session = PartySession.resume(resume_session)
        else:
            console.print(f"[cyan]Creating new session for: {project_name}[/cyan]")
            session = await PartySession.create(
                project_name=project_name,
                opencode_path=opencode_path,
                model=model,
                variant=variant,
            )

        # Display welcome
        console.print(Markdown(session.get_welcome_message()))
        console.print()

        # Main discussion loop
        while not session.is_complete():
            # Display status
            console.print(session.get_status_display())

            # Get user input
            user_input = Prompt.ask(
                "[bold green]Your turn[/bold green]",
                default="",
            )

            # Handle special commands
            if user_input.lower() in ["exit", "quit", "bye"]:
                console.print("\n[yellow]Saving session and exiting...[/yellow]")
                session.save()
                console.print(f"[green]Session saved: {session.session_id}[/green]")
                console.print(
                    f'Resume with: bmad-claude party "{project_name}" --resume {session.session_id}'
                )
                break

            if user_input.lower() == "status":
                console.print(session.get_status_display())
                continue

            if user_input.lower() in ["next", "continue", "phase"]:
                # Try to transition phase
                transition = await session.transition_phase()
                if transition:
                    console.print(
                        Panel.fit(
                            f"[green]Phase Complete![/green]\n\n"
                            f"From: {transition.from_phase}\n"
                            f"To: {transition.to_phase}\n"
                            f"Artifacts: {', '.join(transition.artifacts_finalized)}",
                            title="Phase Transition",
                        )
                    )
                else:
                    is_complete, missing = session.phase_manager.check_phase_complete(
                        session.memory
                    )
                    console.print(f"[yellow]Not ready for transition. Missing:[/yellow]")
                    for item in missing:
                        console.print(f"  • {item}")
                continue

            # Run discussion turn
            console.print("\n[dim]Agents are discussing...[/dim]\n")

            try:
                discussion = await session.discuss(user_message=user_input or None)

                # Display agent responses
                console.print()
                for agent_id, content in discussion.agent_responses:
                    agent = session.agents.get(agent_id)
                    if agent:
                        console.print(f"{agent.icon} [bold]{agent.display_name}[/bold]:")
                        console.print(Markdown(content))
                        console.print()

                # Display decisions if any
                if discussion.decisions:
                    console.print("[bold yellow]Decisions Made:[/bold yellow]")
                    for dec in discussion.decisions:
                        console.print(f"  • [{dec.id}] {dec.topic}: {dec.decision}")
                    console.print()

            except Exception as e:
                console.print(f"[red]Error during discussion: {e}[/red]")
                console.print("[yellow]Session saved. You can resume later.[/yellow]")
                session.save()

        # Session complete
        if session.is_complete():
            console.print(
                Panel.fit(
                    "[bold green]🎉 Session Complete![/bold green]\n\n"
                    "All planning phases finished.\n"
                    "Artifacts created in _bmad-output/planning-artifacts/",
                    title="BMAD-Claude Party Mode",
                )
            )

    except FileNotFoundError as e:
        console.print(f"[red]Error: {e}[/red]")
        console.print(
            "[yellow]Make sure _bmad directory exists or run 'bmad-claude copy-bmad' first.[/yellow]"
        )
        raise typer.Exit(1)
    except RuntimeError as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)


@app.command(name="sessions")
def list_sessions():
    """
    List all party mode sessions.
    """
    sessions_dir = Path.cwd() / ".bmad-claude" / "party-sessions"

    if not sessions_dir.exists():
        console.print("[yellow]No party sessions found.[/yellow]")
        console.print('Start one with: bmad-claude party "Project Name"')
        return

    sessions = list(sessions_dir.iterdir())

    if not sessions:
        console.print("[yellow]No party sessions found.[/yellow]")
        return

    table = Table(title="Party Mode Sessions")
    table.add_column("Session ID", style="cyan")
    table.add_column("Project", style="green")
    table.add_column("Status", style="yellow")
    table.add_column("Phase", style="blue")

    import yaml

    for session_path in sessions:
        if session_path.is_dir():
            session_file = session_path / "session.yaml"
            if session_file.exists():
                with open(session_file) as f:
                    data = yaml.safe_load(f)

                table.add_row(
                    session_path.name,
                    data.get("session", {}).get("project_name", "Unknown"),
                    data.get("session", {}).get("status", "unknown"),
                    data.get("phase", {}).get("current_phase", "unknown"),
                )

    console.print(table)
    console.print(
        '\n[dim]Resume a session with: bmad-claude party "Project" --resume SESSION_ID[/dim]'
    )


def main():
    """Main entry point."""
    app()


if __name__ == "__main__":
    main()
