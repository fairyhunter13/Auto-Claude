"""
BMAD-Claude CLI

Command-line interface for BMAD workflow automation.

This CLI uses OpenCode's --agent flag to properly activate BMAD agents
and execute workflows through the standard BMAD methodology.

Commands:
    bmad-claude init "Project Name"     # Initialize project
    bmad-claude status                   # Show workflow status
    bmad-claude run                      # Run all phases (2-4)
    bmad-claude phase 2                  # Run specific phase
    bmad-claude workflow prd             # Run specific workflow
    bmad-claude list                     # List all workflows
    bmad-claude next                     # Show next workflow

BMAD Methodology Phases:
- Phase 1: Analysis (Optional) - brainstorm, research, product-brief
- Phase 2: Planning (Required) - PRD, UX design
- Phase 3: Solutioning (Required) - Architecture, Epics, Gate Check
- Phase 4: Implementation (Required) - Sprint Planning
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from bmad_claude.workflow import (
    WorkflowRunner,
    WORKFLOWS,
    PHASES,
    PHASE_ORDER,
    get_workflow,
    get_phase_workflows,
)

# Initialize Typer app
app = typer.Typer(
    name="bmad-claude",
    help="BMAD-Claude: Workflow Automation via OpenCode Agents",
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
║         Workflow Automation via OpenCode Agents              ║
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
  • product-brief (analyst) - Strategic product planning
  • research (analyst) - Market/domain research

[green]Phase 2: Planning (Required)[/green]
  • prd (pm) - Product Requirements Document
  • ux-design (ux-designer) - if has UI

[yellow]Phase 3: Solutioning (Required)[/yellow]
  • architecture (architect) - System architecture
  • epics (pm) - Create epics and stories
  • implementation-readiness (architect) - Gate Check

[magenta]Phase 4: Implementation (Required)[/magenta]
  • sprint-planning (sm) - Sprint planning
  • create-story → dev-story → code-review cycle
""",
            title="BMAD Method",
            style="blue",
        )
    )


# =============================================================================
# WORKFLOW COMMANDS
# =============================================================================


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
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
):
    """
    Initialize BMAD workflow tracking for a project.

    Creates the _bmad-output directory structure and initializes
    workflow status tracking.

    Examples:
        bmad-claude init "My Awesome App"
        bmad-claude init "Legacy Migration" --type brownfield
    """
    print_banner()
    print_bmad_methodology()

    runner = WorkflowRunner(
        project_root=Path.cwd(),
        opencode_path=opencode_path,
    )

    console.print(f"\n[bold]Initializing BMAD for:[/bold] {project_name}")
    console.print(f"[dim]Type: {project_type}[/dim]\n")

    # Create output directory structure
    output_dir = Path.cwd() / "_bmad-output"
    planning_dir = output_dir / "planning-artifacts"
    impl_dir = output_dir / "implementation-artifacts"
    stories_dir = impl_dir / "stories"

    planning_dir.mkdir(parents=True, exist_ok=True)
    stories_dir.mkdir(parents=True, exist_ok=True)

    # Save initial status
    runner.status.save()

    console.print(f"\n[green]✅ Project initialized: {project_name}[/green]")
    console.print("\n[bold]Created:[/bold]")
    console.print(f"  • {planning_dir}")
    console.print(f"  • {impl_dir}")

    console.print("\n[bold]Next steps:[/bold]")
    console.print("  1. Run [cyan]bmad-claude status[/cyan] to see workflow status")
    console.print("  2. Run [cyan]bmad-claude run[/cyan] to execute all phases")
    console.print("  3. Run [cyan]bmad-claude workflow prd[/cyan] to start with PRD")


@app.command()
def status():
    """
    Show current BMAD workflow status.

    Displays:
    - Current phase
    - Completed workflows (✓)
    - Pending workflows (○)
    - Next workflow to execute
    """
    runner = WorkflowRunner(verbose=False)
    console.print(runner.get_status())


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
        help="Include optional workflows (UX design, test design, etc.)",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
):
    """
    Run BMAD workflows autonomously.

    Executes BMAD phases in order using OpenCode agents.
    By default, starts from Phase 2 (Planning) since Phase 1 is optional.

    BMAD Flow:
        Phase 2: PRD → (UX Design)
        Phase 3: Architecture → Epics → Gate Check
        Phase 4: Sprint Planning

    Examples:
        bmad-claude run                    # Run from Phase 2 (Planning)
        bmad-claude run --start 1 -o       # Include optional Phase 1 (Analysis)
        bmad-claude run --start 3          # Start from Phase 3 (Solutioning)
    """
    print_banner()

    runner = WorkflowRunner(
        project_root=Path.cwd(),
        opencode_path=opencode_path,
    )

    console.print(f"\n[bold]Running BMAD Methodology: Phases {start_phase}-4[/bold]")
    if include_optional:
        console.print("[dim]Including optional workflows[/dim]")
    console.print()

    # Map phase numbers to IDs
    phase_map = {1: "analysis", 2: "planning", 3: "solutioning", 4: "implementation"}

    # Determine which phases to run
    skip_analysis = start_phase > 1
    skip_optional = not include_optional

    success = asyncio.run(
        runner.run_all(
            skip_analysis=skip_analysis,
            skip_optional=skip_optional,
        )
    )

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
    include_optional: bool = typer.Option(
        False,
        "--include-optional",
        "-o",
        help="Include optional workflows in this phase",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
):
    """
    Run a specific BMAD phase.

    BMAD Phases:
        1 - Analysis (Optional): product-brief, research
        2 - Planning (Required): PRD, UX design
        3 - Solutioning (Required): Architecture, Epics, Gate Check
        4 - Implementation (Required): Sprint Planning

    Examples:
        bmad-claude phase 2    # Run Planning phase (PRD)
        bmad-claude phase 3    # Run Solutioning phase (Architecture, Epics)
    """
    print_banner()

    if phase_number < 1 or phase_number > 4:
        console.print("[red]Error: Phase must be 1-4[/red]")
        raise typer.Exit(1)

    # Map phase numbers to IDs
    phase_map = {1: "analysis", 2: "planning", 3: "solutioning", 4: "implementation"}
    phase_id = phase_map[phase_number]

    runner = WorkflowRunner(
        project_root=Path.cwd(),
        opencode_path=opencode_path,
    )

    phase_config = PHASES[phase_id]
    console.print(f"\n[bold]Running Phase {phase_number}: {phase_config.name}[/bold]")
    console.print(f"[dim]{phase_config.description}[/dim]\n")

    success = asyncio.run(
        runner.run_phase(
            phase_id,
            skip_optional=not include_optional,
        )
    )

    if success:
        console.print(f"\n[bold green]✅ Phase {phase_number} completed![/bold green]")
    else:
        console.print(f"\n[bold red]❌ Phase {phase_number} failed[/bold red]")
        raise typer.Exit(1)


@app.command()
def workflow(
    workflow_id: str = typer.Argument(
        ...,
        help="Workflow ID to run (e.g., 'prd', 'architecture')",
    ),
    opencode_path: str = typer.Option(
        "opencode",
        "--opencode-path",
        help="Path to OpenCode executable",
    ),
):
    """
    Run a specific BMAD workflow.

    Available workflows (by phase):
        Phase 1 (Optional):
            - product-brief: Strategic product planning
            - research: Market/domain research

        Phase 2 (Planning):
            - prd: Product Requirements Document
            - ux-design: UX design (if has UI)

        Phase 3 (Solutioning):
            - architecture: System architecture
            - epics: Create epics and stories
            - implementation-readiness: Gate check

        Phase 4 (Implementation):
            - sprint-planning: Sprint planning
            - create-story: Create individual story
            - dev-story: Develop a story
            - code-review: Review implementation

    Examples:
        bmad-claude workflow prd
        bmad-claude workflow architecture
    """
    print_banner()

    wf_config = get_workflow(workflow_id)
    if not wf_config:
        console.print(f"[red]Error: Workflow '{workflow_id}' not found[/red]")
        console.print("\n[bold]Available workflows:[/bold]")
        for phase_id in PHASE_ORDER:
            phase_config = PHASES[phase_id]
            console.print(f"\n[cyan]Phase: {phase_config.name}[/cyan]")
            for wf in get_phase_workflows(phase_id):
                req = "" if wf.required else " (optional)"
                console.print(f"  - {wf.id} ({wf.agent}){req}")
        raise typer.Exit(1)

    runner = WorkflowRunner(
        project_root=Path.cwd(),
        opencode_path=opencode_path,
    )

    console.print(f"\n[bold]Running workflow:[/bold] {wf_config.name}")
    console.print(f"[dim]Phase: {wf_config.phase}[/dim]")
    console.print(f"[dim]Agent: {wf_config.agent}[/dim]")
    console.print(f"[dim]Command: {wf_config.command}[/dim]\n")

    success = asyncio.run(runner.run_workflow(workflow_id))

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
    table = Table(title="BMAD Workflows")
    table.add_column("Phase", style="cyan")
    table.add_column("Workflow ID", style="green")
    table.add_column("Agent", style="yellow")
    table.add_column("Required", style="blue")
    table.add_column("Command", style="dim")

    for phase_id in PHASE_ORDER:
        phase_config = PHASES[phase_id]
        workflows = get_phase_workflows(phase_id)

        for i, wf in enumerate(workflows):
            table.add_row(
                f"{phase_config.name}" if i == 0 else "",
                wf.id,
                wf.agent,
                "✓" if wf.required else "",
                wf.command,
            )

    console.print(table)


@app.command(name="next")
def show_next():
    """
    Show the next workflow to execute based on current status.
    """
    runner = WorkflowRunner(verbose=False)
    next_wf = runner.get_next()

    if next_wf:
        # Get workflow details
        next_id = runner.status.get_next_workflow()
        wf_config = get_workflow(next_id) if next_id else None

        if wf_config:
            console.print(
                Panel.fit(
                    f"""[bold]Next Workflow[/bold]

[cyan]ID:[/cyan] {wf_config.id}
[cyan]Name:[/cyan] {wf_config.name}
[cyan]Phase:[/cyan] {wf_config.phase}
[cyan]Agent:[/cyan] {wf_config.agent}
[cyan]Command:[/cyan] {wf_config.command}

[bold]To run:[/bold]
  bmad-claude workflow {wf_config.id}

[dim]Or run all remaining phases:[/dim]
  bmad-claude run
""",
                    title="BMAD Next Step",
                    style="green",
                )
            )
        else:
            console.print(f"[green]Next: {next_wf}[/green]")
    else:
        console.print(
            Panel.fit(
                "[bold green]🎉 All required workflows completed![/bold green]\n\n"
                "Ready for implementation phase.",
                title="BMAD Complete",
                style="green",
            )
        )


@app.command(name="info")
def show_info():
    """
    Show information about BMAD-Claude configuration.
    """
    bmad_path = Path.cwd() / "_bmad"
    output_path = Path.cwd() / "_bmad-output"

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
    table.add_row("_bmad directory", str(bmad_path))
    table.add_row("_bmad exists", "✅ Yes" if bmad_path.exists() else "❌ No")
    table.add_row("_bmad-output", str(output_path))
    table.add_row("Output exists", "✅ Yes" if output_path.exists() else "❌ No")

    console.print(table)
    console.print()

    # Show BMAD methodology summary
    print_bmad_methodology()


# =============================================================================
# DEPRECATED PARTY MODE (Archived)
# =============================================================================


@app.command(hidden=True)
def party(
    project_name: str = typer.Argument(...),
):
    """
    [DEPRECATED] Party mode has been replaced by workflow automation.

    Party mode attempted to simulate multiple agents in a single LLM call,
    but this doesn't work reliably with OpenCode's system prompt.

    Use the new workflow commands instead:
        bmad-claude workflow prd
        bmad-claude phase 2
        bmad-claude run
    """
    console.print(
        Panel.fit(
            """[bold yellow]⚠️ Party Mode Deprecated[/bold yellow]

Party mode has been replaced by workflow automation.

The new approach uses OpenCode's --agent flag to properly
activate agents and execute BMAD workflows.

[bold]Use these commands instead:[/bold]
  bmad-claude workflow prd        # Run PRD workflow
  bmad-claude phase 2             # Run Planning phase
  bmad-claude run                 # Run all phases

[dim]See: bmad-claude --help[/dim]
""",
            title="Deprecated",
            style="yellow",
        )
    )
    raise typer.Exit(1)


@app.command(name="sessions", hidden=True)
def list_sessions():
    """[DEPRECATED] Party mode sessions are no longer supported."""
    console.print("[yellow]Party mode sessions have been deprecated.[/yellow]")
    console.print("Use 'bmad-claude status' to see workflow progress.")
    raise typer.Exit(1)


# =============================================================================
# MAIN
# =============================================================================


def main():
    """Main entry point."""
    app()


if __name__ == "__main__":
    main()
