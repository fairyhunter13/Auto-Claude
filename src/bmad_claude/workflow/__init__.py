"""
BMAD Workflow Automation Module.

Executes BMAD methodology workflows using OpenCode agents.
Each workflow is run by its designated agent with proper activation.

## Architecture

This module orchestrates BMAD workflows by:
1. Using OpenCode's `--agent` flag to activate the correct agent
2. Invoking BMAD workflow commands (e.g., `/bmad:bmm:workflows:create-prd`)
3. Tracking workflow status and phase progression
4. Managing artifacts and outputs

## Party Mode

Party Mode enables multi-agent collaborative discussions following BMAD's
native party-mode workflow design. It:
1. Loads all agents from agent-manifest.csv
2. Selects relevant agents based on topic analysis
3. Generates in-character responses maintaining agent personalities
4. Supports all BMAD slash commands for workflow execution

## Usage

```python
from bmad_claude.workflow import WorkflowRunner, PartyOrchestrator

# Workflow automation
runner = WorkflowRunner(project_root=".")
await runner.run_workflow("prd")
await runner.run_phase("planning")

# Party mode
party = PartyOrchestrator()
party.create_session("My Project")
turns = await party.discuss("How should we architect the auth system?")
```

## CLI

```bash
bmad-claude workflow prd          # Run PRD workflow
bmad-claude phase 2               # Run Planning phase
bmad-claude run                   # Run full BMAD methodology
bmad-claude status                # Check workflow status
bmad-claude party "My Project"    # Start party mode
```
"""

from bmad_claude.workflow.runner import WorkflowRunner
from bmad_claude.workflow.status import WorkflowStatus, PhaseStatus, StatusTracker
from bmad_claude.workflow.config import (
    WORKFLOWS,
    PHASES,
    PHASE_ORDER,
    AGENTS,
    SLASH_COMMANDS,
    WorkflowConfig,
    PhaseConfig,
    AgentConfig,
    get_workflow,
    get_workflow_by_command,
    get_phase_workflows,
    get_agent,
    get_all_workflows,
    get_all_agents,
    get_all_slash_commands,
)
from bmad_claude.workflow.party import (
    PartyOrchestrator,
    PartySession,
    PartyAgent,
    DiscussionTurn,
    create_party_session,
)

__all__ = [
    # Runner
    "WorkflowRunner",
    # Status
    "WorkflowStatus",
    "PhaseStatus",
    "StatusTracker",
    # Config
    "WORKFLOWS",
    "PHASES",
    "PHASE_ORDER",
    "AGENTS",
    "SLASH_COMMANDS",
    "WorkflowConfig",
    "PhaseConfig",
    "AgentConfig",
    "get_workflow",
    "get_workflow_by_command",
    "get_phase_workflows",
    "get_agent",
    "get_all_workflows",
    "get_all_agents",
    "get_all_slash_commands",
    # Party Mode
    "PartyOrchestrator",
    "PartySession",
    "PartyAgent",
    "DiscussionTurn",
    "create_party_session",
]
