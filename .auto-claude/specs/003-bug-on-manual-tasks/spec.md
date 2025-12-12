# Quick Spec: Fix Manual Task Status Transition Bug

## Overview

Fix bug where manual tasks incorrectly transition to `ai_review` status when all chunks are completed. Manual tasks should skip AI review and go directly to `human_review` for manual verification.

When a task with `sourceType: 'manual'` (created via TaskCreationWizard) completes all chunks, the status transitions to `'ai_review'`. This is incorrect because:
- Manual tasks don't have an AI workflow running
- Manual tasks should go to `human_review` for the user to verify completion

## Workflow Type

bugfix

## Task Scope

### Files to Modify
- `auto-claude-ui/src/main/project-store.ts` - Update `determineTaskStatus` to handle manual tasks
- `auto-claude-ui/src/renderer/stores/task-store.ts` - Update `updateTaskFromPlan` to check sourceType

### Root Cause
Two locations derive task status from chunk completion:
1. `project-store.ts:determineTaskStatus()` at line 310 - Does not check metadata.sourceType
2. `task-store.ts:updateTaskFromPlan()` at line 81 - Does not check task.metadata.sourceType

Both hardcode `'ai_review'` when all chunks are completed.

### Fix
1. In `project-store.ts`:
   - Add `metadata` parameter to `determineTaskStatus(plan, specPath, metadata?)`
   - Update the call on line 217 to pass `metadata`
   - On line 310, when all chunks completed, check if `metadata?.sourceType === 'manual'`
   - Return `'human_review'` for manual tasks, `'ai_review'` for others

2. In `task-store.ts`:
   - In `updateTaskFromPlan()` on line 81, check `t.metadata?.sourceType`
   - Use `'human_review'` for manual tasks when all completed, `'ai_review'` otherwise

## Success Criteria

- [ ] Create a manual task and mark all chunks as completed
- [ ] Task should transition to `human_review` (not `ai_review`)
- [ ] Ideation-sourced tasks should still go to `ai_review` when completed
- [ ] No TypeScript errors
