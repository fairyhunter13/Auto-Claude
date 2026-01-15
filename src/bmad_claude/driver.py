"""
BMAD-Claude Driver

Thin automation layer that drives BMAD workflows using OpenCode.
This driver follows BMAD methodology exactly - it does NOT rebuild
BMAD's workflow.xml engine, but invokes it properly through agents.

BMAD Methodology Flow:
1. Initialization: Uses workflow-init to set up project
2. Execution: Uses BMAD commands (/bmad:bmm:workflows:*)
3. Status: Uses workflow-status service for tracking
4. Agents: Each workflow is executed by its designated agent

The _bmad framework is shipped as package data inside bmad_claude/_bmad.
It can also be found at the project root if the user prefers to customize it.
"""

from __future__ import annotations

import asyncio
import importlib.resources
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import yaml


def get_bundled_bmad_path() -> Path:
    """Get the path to the bundled _bmad directory in the package."""
    try:
        package_dir = importlib.resources.files("bmad_claude")
        bmad_path = Path(str(package_dir)) / "_bmad"
        if bmad_path.exists():
            return bmad_path
    except (TypeError, AttributeError):
        pass
    return Path(__file__).parent / "_bmad"


@dataclass
class Phase:
    """Represents a BMAD workflow phase."""

    number: int
    name: str
    required: bool
    optional: bool
    workflows: list[dict[str, Any]] = field(default_factory=list)


class BMADDriver:
    """
    BMAD-Claude Driver - Follows BMAD Methodology Exactly.

    This driver:
    1. Uses BMAD's workflow-init for project initialization
    2. Invokes BMAD agents with proper commands
    3. Uses workflow.xml as the execution engine (not rebuilding it)
    4. Tracks status via BMAD's workflow-status service

    BMAD Phases (from method-greenfield.yaml):
    - Phase 1: Analysis (Optional) - brainstorm, research, product-brief
    - Phase 2: Planning (Required) - prd, create-ux-design
    - Phase 3: Solutioning (Required) - architecture, epics, test-design, gate-check
    - Phase 4: Implementation (Required) - sprint-planning
    """

    def __init__(
        self,
        project_root: Path = Path.cwd(),
        opencode_path: str = "opencode",
        model: str = "anthropic/claude-sonnet-4-20250514",
        verbose: bool = True,
        use_bundled_bmad: bool = False,
    ):
        """Initialize the BMAD driver."""
        self.project_root = project_root
        self.opencode_path = opencode_path
        self.model = model
        self.verbose = verbose

        # BMAD paths - prefer project root, fall back to bundled
        project_bmad = project_root / "_bmad"
        bundled_bmad = get_bundled_bmad_path()

        if use_bundled_bmad:
            self.bmad_root = bundled_bmad
        elif project_bmad.exists():
            self.bmad_root = project_bmad
        else:
            self.bmad_root = bundled_bmad

        self.bmm_root = self.bmad_root / "bmm"
        self.config_path = self.bmm_root / "config.yaml"

        # Status paths (loaded from config)
        self._config: dict = {}
        self._planning_artifacts: Optional[Path] = None
        self._implementation_artifacts: Optional[Path] = None
        self._status_path: Optional[Path] = None

        self._log(f"Using BMAD from: {self.bmad_root}")

    def _log(self, message: str) -> None:
        """Log a message if verbose mode is enabled."""
        if self.verbose:
            print(message)

    def _load_config(self) -> dict:
        """Load BMM configuration."""
        if self._config:
            return self._config

        if not self.config_path.exists():
            raise FileNotFoundError(f"BMM config not found: {self.config_path}")

        with open(self.config_path) as f:
            self._config = yaml.safe_load(f)

        # Resolve paths
        def resolve_path(key: str, default: str) -> Path:
            path = self._config.get(key, default)
            path = path.replace("{project-root}", str(self.project_root))
            return Path(path)

        self._planning_artifacts = resolve_path(
            "planning_artifacts", "_bmad-output/planning-artifacts"
        )
        self._implementation_artifacts = resolve_path(
            "implementation_artifacts", "_bmad-output/implementation-artifacts"
        )
        self._status_path = self._planning_artifacts / "bmm-workflow-status.yaml"

        return self._config

    def _load_method(self, method_file: str = "method-greenfield.yaml") -> list[Phase]:
        """Load BMAD method definition."""
        method_path = self.bmm_root / "workflows" / "workflow-status" / "paths" / method_file

        if not method_path.exists():
            raise FileNotFoundError(f"Method file not found: {method_path}")

        with open(method_path) as f:
            data = yaml.safe_load(f)

        phases = []
        for phase_data in data.get("phases", []):
            phase = Phase(
                number=phase_data.get("phase", 0),
                name=phase_data.get("name", ""),
                required=phase_data.get("required", False),
                optional=phase_data.get("optional", False),
                workflows=phase_data.get("workflows", []),
            )
            phases.append(phase)

        return phases

    def _load_status(self) -> dict:
        """Load current workflow status."""
        self._load_config()

        if not self._status_path or not self._status_path.exists():
            return {}

        with open(self._status_path) as f:
            return yaml.safe_load(f) or {}

    def is_initialized(self) -> bool:
        """Check if the project has been initialized with workflow-init."""
        self._load_config()
        return self._status_path and self._status_path.exists()

    def copy_bmad_to_project(self, force: bool = False) -> bool:
        """Copy the bundled _bmad directory to the project root."""
        bundled_bmad = get_bundled_bmad_path()
        project_bmad = self.project_root / "_bmad"

        if project_bmad.exists() and not force:
            self._log(f"_bmad already exists at {project_bmad}. Use force=True to overwrite.")
            return False

        if not bundled_bmad.exists():
            self._log(f"Bundled _bmad not found at {bundled_bmad}")
            return False

        if project_bmad.exists():
            shutil.rmtree(project_bmad)

        self._log(f"Copying _bmad to {project_bmad}...")
        shutil.copytree(bundled_bmad, project_bmad)

        # Update bmad_root to use project copy
        self.bmad_root = project_bmad
        self.bmm_root = self.bmad_root / "bmm"
        self.config_path = self.bmm_root / "config.yaml"

        self._log(f"✅ Copied BMAD framework to {project_bmad}")
        return True

    # =========================================================================
    # BMAD METHODOLOGY: Initialization via workflow-init
    # =========================================================================

    async def initialize(
        self,
        project_name: str,
        project_type: str = "greenfield",
        selected_track: str = "bmad-method",
        copy_bmad: bool = True,
        include_discovery: list[str] | None = None,
    ) -> bool:
        """
        Initialize BMAD workflow tracking using BMAD's workflow-init.

        This follows BMAD methodology by invoking the workflow-init workflow
        which:
        1. Scans for existing work
        2. Determines project type (greenfield/brownfield)
        3. Selects track (bmad-method/enterprise)
        4. Creates bmm-workflow-status.yaml

        Args:
            project_name: Name of the project.
            project_type: greenfield or brownfield.
            selected_track: bmad-method or enterprise.
            copy_bmad: If True, copy bundled _bmad to project root.
            include_discovery: Optional Phase 1 workflows to include.

        Returns:
            True if initialization successful.
        """
        self._log(f"\n{'=' * 60}")
        self._log(f"BMAD Initialization: {project_name}")
        self._log(f"Type: {project_type} | Track: {selected_track}")
        self._log(f"{'=' * 60}\n")

        # Copy _bmad to project root for customization
        if copy_bmad:
            project_bmad = self.project_root / "_bmad"
            if not project_bmad.exists():
                self.copy_bmad_to_project()

        # Update config with project name
        self._update_config(project_name)

        # Build the initialization prompt using BMAD's workflow-init
        prompt = self._build_init_prompt(
            project_name, project_type, selected_track, include_discovery
        )

        # Invoke OpenCode to run workflow-init
        success = await self._invoke_opencode(prompt, "workflow-init")

        if success:
            self._log(f"\n✅ BMAD initialized for: {project_name}")
            self._log(f"Status file: {self._status_path}")
        else:
            self._log(f"\n❌ BMAD initialization failed")

        return success

    def _update_config(self, project_name: str) -> None:
        """Update BMM config with project name."""
        self._load_config()

        # Update project_name in config
        self._config["project_name"] = project_name

        with open(self.config_path, "w") as f:
            yaml.safe_dump(self._config, f, default_flow_style=False, sort_keys=False)

    def _build_init_prompt(
        self,
        project_name: str,
        project_type: str,
        selected_track: str,
        include_discovery: list[str] | None,
    ) -> str:
        """
        Build prompt for BMAD workflow-init.

        Uses BMAD's workflow-init workflow which handles:
        - Scanning for existing work
        - Project type selection
        - Track selection
        - Discovery workflow selection
        - Creating bmm-workflow-status.yaml
        """
        workflow_init_path = (
            self.bmm_root / "workflows" / "workflow-status" / "init" / "workflow.yaml"
        )

        discovery_str = ""
        if include_discovery:
            discovery_str = f"""
When asked about discovery workflows, select: {", ".join(include_discovery)}
"""

        return f"""You are executing BMAD's workflow-init to initialize a new project.

## CRITICAL: Follow BMAD Methodology

1. Load the workflow-init workflow from: {workflow_init_path}
2. Execute it using the workflow execution engine at: {self.bmad_root}/core/tasks/workflow.xml
3. Use YOLO mode - execute autonomously without user interaction

## Project Configuration

- Project Name: {project_name}
- Project Type: {project_type} (1 for greenfield, 2 for brownfield)
- Selected Track: {selected_track} (1 for BMad Method, 2 for Enterprise Method)
{discovery_str}

## Execution Rules

1. When asked for project name, use: {project_name}
2. When asked about setup approach, choose Express (option 1)
3. When asked about project type, select: {"1" if project_type == "greenfield" else "2"}
4. When asked about planning approach, select: {"1" if selected_track == "bmad-method" else "2"}
5. When asked to create tracking file, confirm yes

## Expected Output

The workflow should create: _bmad-output/planning-artifacts/bmm-workflow-status.yaml

Announce "INITIALIZATION COMPLETE" when finished.
"""

    # =========================================================================
    # BMAD METHODOLOGY: Workflow Execution via Agents
    # =========================================================================

    async def run_workflow(self, workflow: dict) -> bool:
        """
        Run a BMAD workflow using the designated agent.

        This follows BMAD methodology:
        1. Load the designated agent persona
        2. Use the agent's menu command to trigger the workflow
        3. Execute in YOLO mode through workflow.xml
        4. Update status via workflow-status service

        Args:
            workflow: Workflow definition from method file.

        Returns:
            True if workflow completed successfully.
        """
        workflow_id = workflow.get("id", "")
        agent = workflow.get("agent", "")
        command = workflow.get("command", "")
        exec_path = workflow.get("exec", workflow.get("workflow", ""))
        phase_name = workflow.get("phase_name", "")

        self._log(f"\n{'=' * 60}")
        self._log(f"Phase {workflow.get('phase', '?')}: {phase_name}")
        self._log(f"Workflow: {workflow_id}")
        self._log(f"Agent: {agent}")
        self._log(f"Command: {command}")
        self._log(f"{'=' * 60}\n")

        # Resolve exec path
        exec_path = exec_path.replace("{project-root}", str(self.project_root))

        # Build the prompt using BMAD's agent and command system
        prompt = self._build_workflow_prompt(workflow_id, agent, exec_path, command)

        # Invoke OpenCode to run the workflow
        success = await self._invoke_opencode(prompt, workflow_id)

        if success:
            self._log(f"✅ Workflow completed: {workflow_id}")
        else:
            self._log(f"❌ Workflow failed: {workflow_id}")

        return success

    def _build_workflow_prompt(
        self, workflow_id: str, agent: str, exec_path: str, command: str
    ) -> str:
        """
        Build prompt for executing a BMAD workflow via its agent.

        This follows BMAD methodology:
        1. Agent is loaded and activated
        2. Agent's menu command triggers the workflow
        3. Workflow is executed via workflow.xml engine
        4. Status is updated via workflow-status service
        """
        agent_path = self.bmm_root / "agents" / f"{agent}.md"
        workflow_engine = self.bmad_root / "core" / "tasks" / "workflow.xml"
        config_path = self.bmm_root / "config.yaml"

        # Get workflow-specific context
        context = self._get_workflow_context(workflow_id)

        return f"""You are executing a BMAD workflow. Follow BMAD methodology exactly.

## STEP 1: Load and Activate Agent

Read and fully embody the agent from: {agent_path}

Follow the agent's activation sequence:
1. Load persona from agent file
2. Load config from: {config_path}
3. Store all config variables (user_name, communication_language, output_folder, etc.)

You ARE this agent ({agent}) for the duration of this execution.

## STEP 2: Execute Workflow via Agent Menu

The agent has a menu system. Execute the workflow using:
- Command: {command}
- This triggers the workflow at: {exec_path}

## STEP 3: Follow Workflow Execution Engine

The workflow execution engine is: {workflow_engine}

CRITICAL RULES from workflow.xml:
1. Read COMPLETE files - NEVER use offset/limit
2. Execute ALL steps in EXACT ORDER
3. Save to output file after EVERY "template-output" tag
4. NEVER skip a step

## STEP 4: YOLO Mode Execution

Execute autonomously (YOLO mode):
- Skip all confirmations
- When asked for choices, select sensible defaults
- When asked to continue, always continue
- Simulate expert user responses

## STEP 5: Update Status on Completion

After workflow completes:
1. The workflow should have saved output to the configured location
2. Status tracking is handled by the workflow itself

{context}

## BEGIN EXECUTION

1. First, read and activate the agent persona
2. Then, execute the workflow command
3. Follow all steps in order
4. Save outputs at each template-output tag

Announce "WORKFLOW COMPLETE: {workflow_id}" when finished.
"""

    def _get_workflow_context(self, workflow_id: str) -> str:
        """Get workflow-specific context and instructions."""
        contexts = {
            "prd": """
## PRD Workflow Context

This is the Product Requirements Document workflow.
- Mode: CREATE (not validate or edit) - select 'C' when asked
- Agent command: CP (Create PRD)
- Follow all steps in steps-c/ directory
- Output: prd.md in planning_artifacts folder

When the PRD workflow asks for mode:
- Select 'C' for Create mode
""",
            "create-architecture": """
## Architecture Workflow Context

This creates the system architecture document.
- First, the workflow will load existing PRD (required input)
- Create comprehensive technical architecture
- Output: architecture.md in planning_artifacts folder

Prerequisites: PRD must exist
""",
            "create-epics-and-stories": """
## Epics and Stories Workflow Context

This breaks down the PRD into implementable units.
- Reads PRD, Architecture, and optionally UX design
- Creates epics with user stories
- Output: epics/ directory in planning_artifacts folder

Prerequisites: PRD and Architecture must exist
""",
            "implementation-readiness": """
## Implementation Readiness (Gate Check) Context

This validates all artifacts before implementation.
- Reviews PRD, Architecture, Epics
- Verifies everything is complete and consistent
- Output: gate-check report

Prerequisites: PRD, Architecture, Epics must exist
""",
            "sprint-planning": """
## Sprint Planning Workflow Context

This creates the sprint plan for implementation.
- Reads epics and stories
- Creates prioritized sprint backlog
- Output: sprint-status.yaml in implementation_artifacts folder

Prerequisites: Epics and stories must exist, gate check passed
""",
            "product-brief": """
## Product Brief Workflow Context (Phase 1 - Optional)

This is an optional discovery workflow for initial product ideation.
- Creates high-level product brief
- Output: product-brief.md in planning_artifacts folder
""",
            "create-ux-design": """
## UX Design Workflow Context (Conditional)

This creates UX design if the product has a UI.
- Based on PRD requirements
- Output: ux-design.md in planning_artifacts folder

Prerequisites: PRD must exist
""",
            "brainstorm-project": """
## Brainstorm Workflow Context (Phase 1 - Optional)

Creative exploration and ideation workflow.
- Uses BMAD's core brainstorming workflow
- Output: brainstorm notes in planning_artifacts folder
""",
            "research": """
## Research Workflow Context (Phase 1 - Optional)

Technical and competitive analysis.
- Can run multiple research workflows
- Output: research notes in planning_artifacts folder
""",
        }

        return contexts.get(workflow_id, f"## {workflow_id} Workflow\n\nExecute as instructed.")

    # =========================================================================
    # BMAD METHODOLOGY: Phase Execution
    # =========================================================================

    async def run_phase(self, phase_number: int) -> bool:
        """
        Run all workflows in a specific BMAD phase.

        BMAD Phases:
        1. Analysis (Optional): brainstorm, research, product-brief
        2. Planning (Required): prd, create-ux-design
        3. Solutioning (Required): architecture, epics, test-design, gate-check
        4. Implementation (Required): sprint-planning

        Args:
            phase_number: Phase number (1-4).

        Returns:
            True if all required workflows in phase completed.
        """
        phases = self._load_method()
        status = self._load_status()

        phase = next((p for p in phases if p.number == phase_number), None)
        if not phase:
            self._log(f"Phase {phase_number} not found")
            return False

        self._log(f"\n{'#' * 60}")
        self._log(f"BMAD Phase {phase_number}: {phase.name}")
        self._log(f"{'#' * 60}\n")

        workflow_status = status.get("workflow_status", {})

        for workflow in phase.workflows:
            workflow_id = workflow.get("id", "")
            wf_status = workflow_status.get(workflow_id, "")

            # Check if already completed (status is a file path)
            if wf_status and wf_status not in (
                "required",
                "optional",
                "recommended",
                "conditional",
                "skipped",
            ):
                self._log(f"⏭️  Skipping {workflow_id}: already completed ({wf_status})")
                continue

            # Skip if explicitly skipped
            if wf_status == "skipped":
                self._log(f"⏭️  Skipping {workflow_id}: marked as skipped")
                continue

            # Handle optional workflows in optional phases
            if phase.optional and workflow.get("optional"):
                self._log(f"⏭️  Skipping optional: {workflow_id}")
                continue

            # Handle conditional workflows
            if workflow.get("conditional"):
                condition = workflow.get("conditional")
                if not self._evaluate_condition(condition, status):
                    self._log(f"⏭️  Skipping conditional: {workflow_id} ({condition} not met)")
                    continue

            # Run the workflow
            workflow_with_phase = {
                **workflow,
                "phase": phase.number,
                "phase_name": phase.name,
            }

            success = await self.run_workflow(workflow_with_phase)

            if not success and workflow.get("required"):
                self._log(f"❌ Required workflow failed: {workflow_id}")
                return False

        self._log(f"\n✅ Phase {phase_number} ({phase.name}) completed!")
        return True

    def _evaluate_condition(self, condition: str, status: dict) -> bool:
        """Evaluate a workflow condition."""
        # For now, simple condition handling
        # TODO: Implement proper condition evaluation based on PRD content
        if condition == "if_has_ui":
            # Default to True if PRD exists and mentions UI/frontend
            prd_status = status.get("workflow_status", {}).get("prd", "")
            if prd_status and prd_status not in ("required", "optional"):
                # PRD exists, check if it mentions UI
                # For now, default to True
                return True
            return False
        return True

    async def run_all(self, start_phase: int = 2, include_optional: bool = False) -> bool:
        """
        Run all BMAD phases starting from a given phase.

        By default, starts from Phase 2 (Planning) since Phase 1 is optional.

        BMAD Flow:
        Phase 2: Planning → PRD (→ UX Design if has UI)
        Phase 3: Solutioning → Architecture → Epics → (Test Design) → Gate Check
        Phase 4: Implementation → Sprint Planning

        Args:
            start_phase: Phase to start from (1-4).
            include_optional: If True, include optional Phase 1.

        Returns:
            True if all required phases completed.
        """
        phases = self._load_method()

        self._log(f"\n{'#' * 60}")
        self._log(f"BMAD-Claude: Executing Phases {start_phase}-4")
        self._log(f"{'#' * 60}\n")

        for phase in phases:
            if phase.number < start_phase:
                continue

            # Skip optional phases unless explicitly included
            if phase.optional and not include_optional:
                self._log(f"⏭️  Skipping optional phase: {phase.name}")
                continue

            success = await self.run_phase(phase.number)
            if not success:
                self._log(f"❌ Phase {phase.number} failed")
                return False

        self._log(f"\n{'#' * 60}")
        self._log(f"✅ BMAD Methodology Complete!")
        self._log(f"{'#' * 60}\n")

        return True

    # =========================================================================
    # OpenCode Invocation
    # =========================================================================

    async def _invoke_opencode(self, prompt: str, workflow_id: str) -> bool:
        """
        Invoke OpenCode to run a BMAD workflow.

        Args:
            prompt: The prompt with BMAD instructions.
            workflow_id: ID for logging.

        Returns:
            True if successful.
        """
        self._log(f"🚀 Invoking OpenCode for: {workflow_id}")

        try:
            cmd = [
                self.opencode_path,
                "run",
                "--model",
                self.model,
                prompt,
            ]

            self._log(f"Command: {self.opencode_path} run --model {self.model} ...")

            # Run OpenCode
            result = subprocess.run(
                cmd,
                cwd=str(self.project_root),
                capture_output=not self.verbose,
                text=True,
            )

            return result.returncode == 0

        except FileNotFoundError:
            self._log(f"❌ OpenCode not found at: {self.opencode_path}")
            self._log("Install OpenCode or specify path with --opencode-path")
            return False
        except Exception as e:
            self._log(f"❌ Error invoking OpenCode: {e}")
            return False

    # =========================================================================
    # Status and Reporting
    # =========================================================================

    def get_status_summary(self) -> str:
        """Get a summary of current BMAD workflow status."""
        status = self._load_status()
        phases = self._load_method()

        if not status:
            return "No workflow status found. Run 'bmad-claude init' first."

        lines = [
            f"\n{'=' * 60}",
            "BMAD Workflow Status",
            f"{'=' * 60}",
            f"Project: {status.get('project', 'Unknown')}",
            f"Type: {status.get('field_type', 'Unknown')}",
            f"Track: {status.get('selected_track', 'Unknown')}",
            f"{'=' * 60}\n",
        ]

        workflow_status = status.get("workflow_status", {})

        # Find next workflow
        next_workflow = None
        next_agent = None

        for phase in phases:
            phase_header = f"Phase {phase.number}: {phase.name}"
            if phase.optional:
                phase_header += " (Optional)"
            lines.append(phase_header)

            for workflow in phase.workflows:
                wf_id = workflow.get("id", "")
                wf_status = workflow_status.get(wf_id, "unknown")
                agent = workflow.get("agent", "")

                # Determine status icon
                if wf_status in ("required", "recommended"):
                    icon = "⏳"
                    if not next_workflow:
                        next_workflow = wf_id
                        next_agent = agent
                elif wf_status in ("optional", "conditional"):
                    icon = "○"
                elif wf_status == "skipped":
                    icon = "⏭️"
                else:
                    icon = "✅"

                lines.append(f"  {icon} {wf_id} ({agent}): {wf_status}")
            lines.append("")

        # Add next steps
        if next_workflow:
            lines.extend(
                [
                    f"{'=' * 60}",
                    "Next Steps",
                    f"{'=' * 60}",
                    f"Workflow: {next_workflow}",
                    f"Agent: {next_agent}",
                    f"Command: /bmad:bmm:workflows:{next_workflow}",
                    "",
                    "Run: bmad-claude workflow {next_workflow}",
                    "  Or: bmad-claude run (to run all remaining phases)",
                ]
            )
        else:
            lines.extend(
                [
                    f"{'=' * 60}",
                    "🎉 All workflows completed!",
                    f"{'=' * 60}",
                ]
            )

        return "\n".join(lines)

    def get_next_workflow(self) -> Optional[dict]:
        """Get the next workflow to execute based on status."""
        status = self._load_status()
        phases = self._load_method()

        workflow_status = status.get("workflow_status", {})

        for phase in phases:
            # Skip optional phases by default
            if phase.optional:
                continue

            for workflow in phase.workflows:
                wf_id = workflow.get("id", "")
                wf_status = workflow_status.get(wf_id, "")

                # Check if pending
                if wf_status in ("required", "recommended"):
                    return {
                        **workflow,
                        "phase": phase.number,
                        "phase_name": phase.name,
                    }

                # Handle conditional
                if wf_status == "conditional":
                    if self._evaluate_condition(workflow.get("conditional", ""), status):
                        return {
                            **workflow,
                            "phase": phase.number,
                            "phase_name": phase.name,
                        }

        return None


# Main entry point for direct execution
async def main():
    """Main entry point for BMAD-Claude driver."""
    import argparse

    parser = argparse.ArgumentParser(description="BMAD-Claude Automation Driver")
    parser.add_argument(
        "command", choices=["init", "run", "status", "phase", "next"], help="Command to run"
    )
    parser.add_argument("--project", "-p", help="Project name")
    parser.add_argument("--type", "-t", default="greenfield", help="Project type")
    parser.add_argument("--phase", type=int, help="Phase number to run")
    parser.add_argument("--model", default="anthropic/claude-sonnet-4-20250514", help="LLM model")
    parser.add_argument("--opencode-path", default="opencode", help="Path to OpenCode")

    args = parser.parse_args()

    driver = BMADDriver(model=args.model, opencode_path=args.opencode_path)

    if args.command == "init":
        if not args.project:
            print("Error: --project required for init")
            sys.exit(1)
        await driver.initialize(args.project, args.type)

    elif args.command == "status":
        print(driver.get_status_summary())

    elif args.command == "phase":
        if not args.phase:
            print("Error: --phase required")
            sys.exit(1)
        await driver.run_phase(args.phase)

    elif args.command == "run":
        await driver.run_all()

    elif args.command == "next":
        workflow = driver.get_next_workflow()
        if workflow:
            print(f"Next: {workflow['id']} (Phase {workflow['phase']}: {workflow['phase_name']})")
            print(f"Agent: {workflow['agent']}")
            print(f"Command: {workflow.get('command', 'N/A')}")
        else:
            print("All workflows completed!")


if __name__ == "__main__":
    asyncio.run(main())
