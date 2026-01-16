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

## Why This Approach (Not Multi-Agent Simulation)

We use real OpenCode agents instead of simulating multi-agent discussions because:
1. OpenCode properly activates agents with their full persona
2. BMAD workflows are designed for step-by-step execution
3. Artifacts are generated from templates, not extracted from discussions
4. The approach is reliable, repeatable, and resumable

## Usage

```python
from bmad_claude.workflow import WorkflowRunner

runner = WorkflowRunner(project_root=".")
await runner.run_workflow("prd", agent="pm")
await runner.run_phase("planning")
```

## CLI

```bash
bmad-claude workflow prd          # Run PRD workflow
bmad-claude phase planning        # Run all planning phase workflows
bmad-claude run                   # Run full BMAD methodology
bmad-claude status                # Check workflow status
```
"""

from bmad_claude.workflow.runner import WorkflowRunner
from bmad_claude.workflow.status import WorkflowStatus, PhaseStatus
from bmad_claude.workflow.config import (
    WORKFLOWS,
    PHASES,
    PHASE_ORDER,
    get_workflow,
    get_phase_workflows,
)

__all__ = [
    "WorkflowRunner",
    "WorkflowStatus",
    "PhaseStatus",
    "WORKFLOWS",
    "PHASES",
    "PHASE_ORDER",
    "get_workflow",
    "get_phase_workflows",
]
