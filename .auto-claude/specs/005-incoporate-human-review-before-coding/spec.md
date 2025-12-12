# Specification: Incorporate Human Review Before Coding

## Overview

Add a mandatory human review checkpoint between the planning phase and coding phase in the Auto Claude framework. Currently, after spec creation (spec_runner.py) completes and generates an implementation_plan.json, the system automatically proceeds to run.py which starts the autonomous coding sessions. This task introduces a pause point where users can review the spec.md and implementation_plan.json, provide feedback, request changes, or explicitly approve before any code is written.

## Workflow Type

**Type**: feature

**Rationale**: This is a new capability that adds a human-in-the-loop checkpoint to the existing autonomous pipeline. It requires changes to the orchestration flow (spec_runner.py → run.py handoff), new UI elements for review and approval, and persistence of review state.

## Task Scope

### Services Involved
- **auto-claude** (primary) - Core framework files that manage the spec creation and build execution flow

### This Task Will:
- [ ] Add a `--review` phase between spec creation and build execution
- [ ] Create a review checkpoint system that persists approval state
- [ ] Provide clear display of spec.md and implementation_plan.json for human review
- [ ] Allow users to approve, request changes, or provide feedback
- [ ] Block automatic build start until human approval is given
- [ ] Support both interactive and non-interactive (auto-approve) modes

### Out of Scope:
- Changes to the actual spec creation prompts (spec_writer.md, planner.md)
- Changes to the coding agents (coder.md, qa_reviewer.md)
- Linear integration for review status
- Web UI for review (CLI only for now)

## Service Context

### Auto-Claude Framework

**Tech Stack:**
- Language: Python 3.11+
- Key libraries: claude-code-sdk, asyncio, pathlib
- Key directories: auto-claude/, auto-claude/prompts/

**Entry Points:**
- `auto-claude/spec_runner.py` - Spec creation orchestrator
- `auto-claude/run.py` - Build execution orchestrator

**How to Run:**
```bash
# Spec creation
python auto-claude/spec_runner.py --task "Your task"

# Build execution
python auto-claude/run.py --spec 001
```

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `auto-claude/spec_runner.py` | auto-claude | Add review checkpoint before auto-starting build |
| `auto-claude/run.py` | auto-claude | Check for approval status before allowing build to proceed |
| `auto-claude/ui.py` | auto-claude | Add review display and approval UI components |

## Files to Create

| File | Service | Purpose |
|------|---------|---------|
| `auto-claude/review.py` | auto-claude | Review checkpoint logic, approval persistence, display formatting |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `auto-claude/ui.py` | Box formatting, menu selection, status printing patterns |
| `auto-claude/workspace.py` | User choice handling patterns (merge/review/discard flow) |
| `auto-claude/validate_spec.py` | Checkpoint validation and result reporting patterns |
| `auto-claude/spec_runner.py` | Phase orchestration and file state checking |

## Patterns to Follow

### User Choice Menu Pattern

From `auto-claude/workspace.py` and `auto-claude/ui.py`:

```python
from ui import (
    select_menu,
    MenuOption,
    Icons,
    box,
    bold,
    muted,
    highlight,
    print_status,
)

options = [
    MenuOption(
        key="approve",
        label="Approve and start build",
        icon=Icons.SUCCESS,
        description="The plan looks good, proceed with implementation",
    ),
    MenuOption(
        key="edit",
        label="Request changes",
        icon=Icons.EDIT,
        description="Open spec.md or plan for editing",
    ),
    MenuOption(
        key="reject",
        label="Reject and exit",
        icon=Icons.ERROR,
        description="Stop here without starting build",
    ),
]

choice = select_menu(
    title="Review Implementation Plan",
    options=options,
    subtitle="Please review before coding begins",
)
```

**Key Points:**
- Use MenuOption dataclass for structured choices
- Include Icons for visual clarity
- Provide descriptions for each option

### State Persistence Pattern

From `auto-claude/linear_updater.py` (LinearTaskState):

```python
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import json

@dataclass
class ReviewState:
    """Tracks human review status for a spec."""
    approved: bool = False
    approved_by: str = ""
    approved_at: str = ""
    feedback: list[str] = field(default_factory=list)

    @classmethod
    def load(cls, spec_dir: Path) -> "ReviewState":
        state_file = spec_dir / "review_state.json"
        if state_file.exists():
            with open(state_file) as f:
                data = json.load(f)
                return cls(**data)
        return cls()

    def save(self, spec_dir: Path) -> None:
        state_file = spec_dir / "review_state.json"
        with open(state_file, "w") as f:
            json.dump(dataclass_to_dict(self), f, indent=2)
```

**Key Points:**
- Use dataclass for structured state
- Persist to JSON in spec directory
- Load/save methods for easy access

### File Display Pattern

The review should display spec.md and implementation_plan.json in a readable format:

```python
def display_spec_summary(spec_dir: Path) -> None:
    """Display key sections of spec.md for review."""
    spec_file = spec_dir / "spec.md"
    if not spec_file.exists():
        print_status("spec.md not found", "error")
        return

    content = spec_file.read_text()

    # Extract and display key sections
    # Use box() for formatted output
    print(box([
        bold("SPEC SUMMARY"),
        "",
        # ... extracted content
    ], width=80, style="heavy"))
```

## Requirements

### Functional Requirements

1. **Review Checkpoint After Spec Creation**
   - Description: After spec_runner.py completes (all phases including validation), pause before starting build
   - Acceptance: User sees review prompt with approve/edit/reject options before any coding begins

2. **Spec and Plan Display**
   - Description: Display key information from spec.md and implementation_plan.json for easy review
   - Acceptance: User can see task overview, phases, chunks, files to modify without opening separate files

3. **Approval Persistence**
   - Description: Store approval state in review_state.json in spec directory
   - Acceptance: If user approves and exits, they can resume later without re-approving

4. **Build Blocking Without Approval**
   - Description: run.py checks for approval before starting autonomous build
   - Acceptance: Running `--spec 001` without prior approval prompts for review or errors

5. **Skip Review Option**
   - Description: Allow `--auto-approve` flag to skip review for automated workflows
   - Acceptance: `spec_runner.py --task "..." --auto-approve` proceeds without pause

6. **Edit Workflow**
   - Description: Allow user to edit spec.md or implementation_plan.json during review
   - Acceptance: User can open files in editor, make changes, and re-review

### Edge Cases

1. **Partial Spec Creation** - If spec creation fails mid-way, no review is offered
2. **Re-running with Existing Approval** - If already approved, don't require re-approval
3. **Spec Changes After Approval** - If spec.md modified after approval, require re-approval
4. **Interrupted Review** - If Ctrl+C during review, save feedback but don't approve

## Implementation Notes

### DO
- Follow the existing UI patterns in `ui.py` for consistent look and feel
- Use `box()`, `print_status()`, `select_menu()` from ui.py
- Store review state alongside other spec files in spec directory
- Check file modification times to detect changes after approval
- Provide clear instructions for each review option
- Support both interactive terminal and piped input scenarios

### DON'T
- Create new UI primitives when existing ones work
- Require external dependencies for review functionality
- Block forever - provide timeout or skip options for CI/CD
- Modify spec_writer.md or planner.md prompts
- Change the actual content of generated specs

## Development Environment

### Start Services

```bash
# No services needed - this is a CLI tool
cd /Users/andremikalsen/Documents/Coding/autonomous-coding
source auto-claude/.venv/bin/activate  # if using venv
```

### Test Commands

```bash
# Test spec creation with review
python auto-claude/spec_runner.py --task "Test task" --no-build

# Test review checkpoint manually
python auto-claude/review.py --spec-dir .auto-claude/specs/001-test

# Test build blocking without approval
python auto-claude/run.py --spec 001
```

## Success Criteria

The task is complete when:

1. [ ] `spec_runner.py` pauses after validation phase and displays review prompt
2. [ ] User can approve, edit, or reject the spec through CLI menu
3. [ ] Approval state is persisted to `review_state.json` in spec directory
4. [ ] `run.py` checks for approval before starting build (with clear error if not approved)
5. [ ] `--auto-approve` flag allows skipping review for automated workflows
6. [ ] Existing tests still pass
7. [ ] Review UI is consistent with existing auto-claude UI patterns

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| ReviewState load/save | `tests/test_review.py` | State persistence works correctly |
| Approval check | `tests/test_review.py` | is_approved() returns correct status |
| File change detection | `tests/test_review.py` | Detects spec.md changes after approval |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| Spec creation with review | spec_runner.py | Review prompt appears after spec creation |
| Build with approval | run.py | Build proceeds when approved |
| Build without approval | run.py | Build blocked with clear message |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Full approval flow | 1. Create spec 2. Review 3. Approve 4. Build starts | Build executes after approval |
| Edit flow | 1. Create spec 2. Review 3. Edit 4. Re-approve 5. Build | Changes incorporated before build |
| Auto-approve flow | 1. Create spec with --auto-approve | Build starts immediately |

### Manual Verification
| Check | Command | Expected |
|-------|---------|----------|
| Review displays correctly | `python auto-claude/spec_runner.py --task "test"` | See formatted spec summary |
| Menu works | During review | Arrow keys select options |
| Ctrl+C handling | Press Ctrl+C during review | Graceful exit without crash |

### QA Sign-off Requirements
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual verification complete
- [ ] No regressions in existing functionality
- [ ] Code follows established patterns in ui.py and workspace.py
- [ ] No security vulnerabilities introduced
- [ ] Review state file format is documented
