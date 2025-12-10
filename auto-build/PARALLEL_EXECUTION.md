# Parallel Execution Guide

Auto-Build supports parallel execution of independent phases and chunks to speed up builds by 2-3x.

## Overview

The parallel execution system uses Git worktrees to allow multiple agents to work simultaneously without conflicts. Each worker operates in its own isolated environment, and all work is merged into a single staging worktree for testing.

## Architecture

```
your-project/
├── .worktrees/
│   ├── auto-build/           # Staging worktree - all work collected here
│   └── auto-build-worker-1/  # Temporary worker worktree (cleaned up)
│   └── auto-build-worker-2/  # Temporary worker worktree (cleaned up)
```

### How It Works

1. **Single Staging Worktree**: All completed work merges into `.worktrees/auto-build/`
2. **Worker Isolation**: Each worker gets a temporary worktree during execution
3. **Merge Coordination**: A lock ensures workers merge one at a time to avoid conflicts
4. **File Claim System**: Prevents multiple workers from modifying the same files

## Usage

```bash
# Run with 2 parallel workers
python auto-build/run.py --spec 001 --parallel 2

# Run with 3 parallel workers (recommended max)
python auto-build/run.py --spec 001 --parallel 3
```

## When Parallel Execution Helps

Parallel execution provides the most benefit when:

- **Multiple independent phases**: E.g., frontend and backend work that don't share files
- **Large codebases**: More chunks typically means more parallelization opportunities
- **No file overlap**: Phases touching different files can run simultaneously

## When to Avoid Parallel Execution

- **Sequential dependencies**: If Phase 2 depends on Phase 1's output
- **Shared files**: Multiple phases modifying the same files must run sequentially
- **Simple specs**: Single-phase specs with few chunks won't benefit

## Performance Analysis

| Workers | Speedup | Use Case |
|---------|---------|----------|
| 1 | Baseline | Simple specs, debugging |
| 2 | ~1.8x | Most specs, recommended default |
| 3 | ~2.5x | Large specs with many independent phases |
| 4+ | Diminishing | Rarely beneficial, increases merge conflicts |

## Conflict Prevention

The coordinator prevents conflicts through:

1. **Phase Dependencies**: Respects `depends_on` in implementation plan
2. **File Claims**: Tracks which worker is modifying which files
3. **Merge Lock**: Serializes merges to staging worktree
4. **Overlap Detection**: Validates phases don't modify same files before starting

## Troubleshooting

### "Phases cannot run in parallel - they modify the same files"

The implementation plan has phases with overlapping files. Solutions:
- Let the coordinator run them sequentially (automatic)
- Restructure the plan to separate concerns

### Worker hangs or crashes

```bash
# Check worker status
python auto-build/run.py --spec 001 --status

# Clean up stuck worktrees
git worktree prune
```

### Merge conflicts in staging

If conflicts occur during merge to staging:
1. The coordinator will retry with rebase
2. If that fails, the worker marks the chunk as failed
3. Subsequent sequential execution can resolve the conflict

### Lost progress

Progress is saved after each chunk completion. If a run is interrupted:
```bash
# Resume where you left off
python auto-build/run.py --spec 001 --parallel 2
```

## Best Practices

1. **Start with 2 workers** - Safe default for most projects
2. **Monitor first run** - Watch for conflicts before increasing workers
3. **Use for independent phases** - Frontend/backend, tests/implementation
4. **Keep chunks focused** - Smaller, file-isolated chunks parallelize better

## How the Coordinator Works

```
┌─────────────────────────────────────────────────────────────┐
│                    SwarmCoordinator                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Load implementation_plan.json                           │
│  2. Create staging worktree (.worktrees/auto-build/)        │
│  3. Identify available chunks (dependencies met, no claims) │
│  4. Spawn workers up to max_workers                         │
│  5. Each worker:                                            │
│     a. Creates temporary worktree                           │
│     b. Claims chunk files                                   │
│     c. Runs Claude agent session                            │
│     d. Merges to staging (with lock)                        │
│     e. Cleans up temporary worktree                         │
│  6. Repeat until all chunks complete                        │
│  7. User tests in staging, merges when ready                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Integration with QA

After parallel execution completes:
1. All work is in the staging worktree
2. QA validation runs against the staging worktree
3. QA fixer also works in the staging worktree
4. Final merge happens after QA approval
