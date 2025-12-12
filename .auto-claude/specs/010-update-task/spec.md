# Quick Spec: Update Task

## Overview
Add the ability to edit/update an existing task's title and description in the TaskDetailPanel.

## Workflow Type
feature

## Task Scope
### Files to Modify
- `auto-claude-ui/src/renderer/components/TaskDetailPanel.tsx` - Add edit mode and form UI
- `auto-claude-ui/src/shared/types.ts` - Add `updateTask` to ElectronAPI interface
- `auto-claude-ui/src/preload/preload.ts` - Expose updateTask IPC method
- `auto-claude-ui/src/main/ipc-handlers.ts` - Add updateTask IPC handler
- `auto-claude-ui/src/renderer/stores/task-store.ts` - Add persistUpdateTask function

### Change Details
Add an edit button in the TaskDetailPanel header that toggles edit mode. When in edit mode:
- Title becomes an editable input field
- Description becomes an editable textarea
- Show Save/Cancel buttons
- On save, call new `updateTask` IPC method to persist changes to disk (update spec.md and implementation_plan.json)
- Update task store with new values

The backend IPC handler should:
- Update the task's spec.md file with new title/description
- Update implementation_plan.json if the title changed (feature field)
- Return the updated task data

## Success Criteria
- [ ] Click edit button shows editable title/description fields
- [ ] Save button persists changes to disk
- [ ] Cancel button reverts to original values
- [ ] Task card shows updated title after save
- [ ] Editing works for tasks in any status (backlog, in_progress, etc.)

## Notes
- Only allow editing title and description for now (not metadata or chunks)
- Disable edit button if task is currently running (in_progress status with active execution)
