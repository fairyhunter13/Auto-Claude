"""
BMAD-Claude CLI

Command-line interface for autonomous BMAD workflow execution.
Follows BMAD methodology using OpenCode to drive workflows.

BMAD Methodology Flow:
1. Initialize: bmad-claude init "Project Name"
2. Execute Phases: bmad-claude run (or phase by phase)
3. Check Status: bmad-claude status

BMAD Phases:
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

from bmad_claude.driver import BMADDriver, get_bundled_bmad_path


# Initialize Typer app
app = typer.Typer(
    name="bmad-claude",
    help="BMAD-Claude: Autonomous BMAD Workflow Execution using OpenCode",
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


def main():
    """Main entry point."""
    app()


if __name__ == "__main__":
    main()
