# Auto-BMAD Comprehensive E2E Test Plan

## Executive Summary

This document provides a systematic analysis of **all interactive UI components** in the Auto-BMAD application, mapping each button/action to its system impact and identifying test scenarios across:
- **P0 (Critical)**: Already tested - core user flows
- **P1 (High)**: Important edge cases and error handling
- **P2 (Medium)**: Complex user flows and integrations
- **P3 (Low)**: UI polish and minor features

---

## 1. Component Analysis: Sidebar (`Sidebar.tsx`)

### 1.1 Navigation Buttons

| Button | Action | IPC Impact | Test Priority |
|--------|--------|------------|---------------|
| **Kanban (K)** | Switch to Kanban view | Local state only | P0 (covered) |
| **Terminals (A)** | Switch to Terminal Grid | Restores PTY sessions | P1 |
| **Insights (N)** | Switch to Insights view | Loads insights data | P2 |
| **Roadmap (D)** | Switch to Roadmap view | Loads roadmap data | P2 |
| **Ideation (I)** | Switch to Ideation view | Loads ideation data | P2 |
| **Changelog (L)** | Switch to Changelog view | Loads changelog | P2 |
| **Context (C)** | Switch to Context view | Loads project context | P2 |
| **Agent Tools (M)** | Switch to Agent Tools | Local state only | P2 |
| **Worktrees (W)** | Switch to Worktrees view | `listWorktrees` IPC | P1 |
| **GitHub Issues (G)** | Switch to GitHub Issues | `github.*` IPC calls | P2 |
| **GitHub PRs (P)** | Switch to GitHub PRs | `github.*` IPC calls | P2 |
| **GitLab Issues (B)** | Switch to GitLab Issues | `gitlab.*` IPC calls | P2 |
| **GitLab MRs (R)** | Switch to GitLab MRs | `gitlab.*` IPC calls | P2 |

### 1.2 Action Buttons

| Button | Action | IPC Impact | Test Scenarios |
|--------|--------|------------|----------------|
| **Settings** | Opens AppSettings dialog | Loads settings, profiles | P1: Settings persistence, validation |
| **New Task (+)** | Opens TaskCreationWizard | Creates task files | P0 (covered) |
| **Help (?)** | Opens GitHub issues (external) | `shell.openExternal` | P3 |

### 1.3 Indicators

| Component | Trigger | IPC Impact | Test Scenarios |
|-----------|---------|------------|----------------|
| **RateLimitIndicator** | Claude rate limit detected | Profile rate limit events | P1: Rate limit detection |
| **OpenCodeStatusBadge** | OpenCode CLI status | `checkOpenCodeStatus` | P1: CLI availability |
| **UpdateBanner** | App update available | App update events | P2: Update notification |

---

## 2. Component Analysis: KanbanBoard (`KanbanBoard.tsx`)

### 2.1 Column Actions

| Action | Trigger | IPC Impact | Test Scenarios |
|--------|---------|------------|----------------|
| **Add Task (+)** | Click on Backlog column | Opens TaskCreationWizard | P0 (covered) |
| **Archive All** | Click on Done column | `archiveTasks` IPC | P1: Batch archive |
| **Toggle Archived** | Click show/hide archived | Local state, re-filters tasks | P1: Filter persistence |
| **Refresh Tasks** | Click refresh button | `getTasks` IPC | P1: Cache invalidation |

### 2.2 Drag & Drop

| Action | Trigger | IPC Impact | Test Scenarios |
|--------|---------|------------|----------------|
| **Drag task to column** | D&D task card | `updateTaskStatus` | P0 (covered in status-persistence) |
| **Drag to empty column** | D&D to empty | `updateTaskStatus` | P1: Edge case |
| **Cancel drag** | ESC or drop outside | No IPC | P2: UI feedback |

### 2.3 Task Status Transitions (Critical)

| Transition | Validation | IPC Handler | Test Scenarios |
|------------|------------|-------------|----------------|
| `backlog` -> `in_progress` | Git status, auth check | `startTask` auto-triggered | P0 (covered) |
| `in_progress` -> `backlog` | None | `stopTask` auto-triggered | P1: Cancel execution |
| `*` -> `human_review` | Spec must exist (100+ chars) | Validation in handler | **P1: Validation error handling** |
| `*` -> `done` | Worktree check | May require cleanup dialog | **P1: Worktree cleanup flow** |
| `*` -> `ai_review` | None | Direct persist | P0 (covered) |
| `*` -> `error` | None | Direct persist | P2 |

---

## 3. Component Analysis: TaskCard (`TaskCard.tsx`)

### 3.1 Buttons by State

| State | Button | Action | IPC Impact |
|-------|--------|--------|------------|
| `backlog` | **Start** | Start task execution | `startTask` -> agent spawn |
| `in_progress` | **Stop** | Stop task execution | `stopTask` -> agent kill |
| `stuck` | **Recover** | Recover stuck task | `recoverStuckTask` |
| `incomplete` | **Resume** | Resume task | `startTask` with plan reload |
| `human_review` | (none) | Click opens modal | N/A |
| `done` | **Archive** | Archive task | `archiveTasks` |
| `pr_created` | **View PR** | Open PR URL | `shell.openExternal` |
| `pr_created` | **Archive** | Archive task | `archiveTasks` |

### 3.2 Status Menu (MoreVertical dropdown)

| Action | Validation | Test Scenarios |
|--------|------------|----------------|
| Move to Backlog | None | P1 |
| Move to In Progress | Git, Auth | P1: Validation errors |
| Move to AI Review | None | P0 (covered) |
| Move to Human Review | Spec required | **P1: Validation rejection** |
| Move to Done | Worktree check | **P1: Worktree cleanup dialog** |
| Move to Error | None | P2 |

### 3.3 Stuck Detection

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Task `in_progress` but no process | 5s initial, 30s periodic | `checkTaskRunning` IPC |
| All subtasks complete but stuck | Phase check in recovery | Auto-move to `human_review` |
| Partial subtasks complete | Subtask analysis | Reset `in_progress` -> `pending` |

---

## 4. Component Analysis: TaskDetailModal (`TaskDetailModal.tsx`)

### 4.1 Header Actions

| Button | State Required | IPC Impact |
|--------|----------------|------------|
| **Edit (Pencil)** | Not running | Opens TaskEditDialog |
| **Close (X)** | Always | Shows toast if running |

### 4.2 Footer Actions

| Button | State | IPC Impact | Test Scenarios |
|--------|-------|------------|----------------|
| **Delete Task** | Not running | `deleteTask` | P1: Delete confirmation, worktree cleanup |
| **Start/Stop** | Depends on status | `startTask`/`stopTask` | P0 (covered) |
| **Recover** | Stuck state | `recoverStuckTask` | P1 |
| **Resume** | Incomplete state | `startTask` with plan validation | P1 |
| **Close** | Always | Shows notification if running | P2 |

### 4.3 Tab Actions

| Tab | Content | IPC Impact |
|-----|---------|------------|
| **Overview** | Task metadata, review actions | Various |
| **Subtasks** | Subtask list, progress | Read-only |
| **Logs** | Phase logs, real-time streaming | `getTaskLogs`, `watchTaskLogs` |
| **Files** | File tree, content preview | File read operations |

### 4.4 Human Review Actions (TaskReview component)

| Button | Condition | IPC Impact | Test Scenarios |
|--------|-----------|------------|----------------|
| **Approve** | Worktree exists | `mergeWorktree` | P1: Merge flow |
| **Reject** | Feedback or images | `submitReview` -> QA restart | P1: Rejection flow |
| **Stage Changes** | Toggle option | `mergeWorktree` with `noCommit` | P1: Stage-only merge |
| **View Diff** | Worktree exists | `getWorktreeDiff` | P2 |
| **Open in IDE** | Tool detected | `worktreeOpenInIDE` | P2 |
| **Open in Terminal** | Tool detected | `worktreeOpenInTerminal` | P2 |
| **Discard Changes** | Worktree exists | `discardWorktree` | **P1: Destructive action** |
| **Create PR** | Review complete | `createWorktreePR` | P1: PR creation flow |

---

## 5. Component Analysis: TaskCreationWizard (`TaskCreationWizard.tsx`)

### 5.1 Form Inputs

| Input | Validation | Side Effect |
|-------|------------|-------------|
| **Title** | Auto-generated if empty | AI title generation |
| **Description** | Required (non-empty) | Markdown parsing |
| **Category** | Optional enum | Metadata |
| **Priority** | Optional enum | Metadata |
| **Complexity** | Optional enum | Metadata |
| **Impact** | Optional enum | Metadata |
| **Base Branch** | Git branch validation | Task worktree base |
| **Worktree Toggle** | Boolean | Affects build isolation |

### 5.2 Actions

| Button | Validation | IPC Impact | Test Scenarios |
|--------|------------|------------|----------------|
| **Create Task** | Description required | `createTask` | P0 (covered) |
| **Cancel** | None | Saves draft to localStorage | P1: Draft persistence |
| **Browse Files** | Project selected | File tree load | P2 |
| **Start Fresh** | Draft exists | Clears localStorage | P2 |
| **@ Autocomplete** | Typing @ in description | File path suggestions | P2 |

---

## 6. Component Analysis: Settings (`AppSettingsDialog.tsx`)

### 6.1 App Settings Sections

| Section | Settings | IPC Impact | Test Scenarios |
|---------|----------|------------|----------------|
| **Appearance** | Theme, color scheme, UI scale | `updateSettings` | P2 |
| **Language** | i18n locale | `updateSettings` | P2 |
| **Claude Profiles** | OAuth, API keys | `updateProfile`, encryption | **P1: Auth flow** |
| **Agent Profiles** | Model selection, thinking | `updateSettings` | P2 |
| **Updates** | Auto-update, beta channel | `checkForUpdates` | P2 |

### 6.2 Project Settings Sections

| Section | Settings | IPC Impact | Test Scenarios |
|---------|----------|------------|----------------|
| **General** | Project name, main branch | `updateProjectSettings` | P2 |
| **GitHub** | Token, repo, auth method | `updateProjectEnv` | P1: GitHub integration |
| **GitLab** | Token, project ID | `updateProjectEnv` | P2: GitLab integration |
| **Ideation** | Enabled flag | `updateProjectEnv` | P3 |

---

## 7. Component Analysis: Worktrees (`Worktrees.tsx`)

### 7.1 Actions

| Button | IPC Impact | Test Scenarios |
|--------|------------|----------------|
| **Refresh** | `listWorktrees` | P2 |
| **Open in IDE** | `worktreeOpenInIDE` | P2 |
| **Open in Terminal** | `worktreeOpenInTerminal` | P2 |
| **Delete Worktree** | Git worktree remove | P1: Cleanup verification |

---

## 8. Component Analysis: TerminalGrid

### 8.1 Actions

| Button | IPC Impact | Test Scenarios |
|--------|------------|----------------|
| **New Terminal (+)** | PTY spawn | P1: Terminal creation |
| **Close Terminal** | PTY cleanup | P1: Session persistence |
| **Split/Layout** | Local state | P2 |
| **Task Selector** | Loads task context | P2 |
| **Worktree Selector** | Changes terminal cwd | P2 |

---

## 9. Critical User Flows (End-to-End)

### 9.1 Task Lifecycle (Complete)

```
1. Create Task -> backlog
2. Start Task -> in_progress (agent spawns)
3. Spec Creation -> implementation_plan created
4. Execution -> subtasks progress
5. Complete -> human_review
6. Review -> approve -> done OR reject -> in_progress (QA)
7. Archive -> archived
```

**Test Scenarios:**
- P0: Happy path (covered)
- P1: Cancellation at each stage
- P1: Error at each stage
- P1: Recovery from stuck state
- P2: Multiple concurrent tasks

### 9.2 Review & Merge Flow

```
1. Task in human_review
2. View diff
3. Option A: Approve -> merge worktree -> done
4. Option B: Stage only -> commit later
5. Option C: Reject with feedback -> QA restart
6. Option D: Discard -> cleanup worktree
```

**Test Scenarios:**
- P1: Merge success
- P1: Merge conflict handling
- P1: Discard confirmation
- P1: Reject with images
- P2: Stage-only flow

### 9.3 PR Creation Flow

```
1. Task in done/human_review
2. Click Create PR
3. Enter PR title/description
4. Select reviewers
5. Create -> pr_created status
```

**Test Scenarios:**
- P1: PR creation success
- P1: Duplicate PR detection
- P1: GitHub auth failure
- P2: Custom title/body

---

## 10. Edge Cases & Error Scenarios

### 10.1 Status Transition Errors

| Scenario | Expected Behavior | Test Priority |
|----------|-------------------|---------------|
| `human_review` without spec | Rejection with error message | **P1** |
| `done` with active worktree | Worktree cleanup dialog | **P1** |
| `in_progress` without auth | Auth error, status reverts | **P1** |
| `in_progress` without git | Git error, status reverts | **P1** |

### 10.2 Concurrent Operations

| Scenario | Expected Behavior | Test Priority |
|----------|-------------------|---------------|
| Multiple tasks running | All execute in parallel | P2 |
| Delete running task | Blocked with error | **P1** |
| Edit running task | Blocked with error | **P1** |
| Rapid status changes | Debounce/queue handling | P2 |

### 10.3 File System Edge Cases

| Scenario | Expected Behavior | Test Priority |
|----------|-------------------|---------------|
| Corrupted implementation_plan.json | Error handling, recovery | **P1** |
| Missing spec directory | Graceful failure | P1 |
| Disk full during write | Error message | P2 |
| Permission denied | Error message | P2 |

### 10.4 Network/External Failures

| Scenario | Expected Behavior | Test Priority |
|----------|-------------------|---------------|
| GitHub API rate limit | Error message, retry option | P1 |
| Network timeout | Timeout error, retry | P2 |
| OpenCode CLI not found | Graceful degradation | P1 |

---

## 11. Test Implementation Priority

### P0 - Critical (Already Implemented)
- [x] App launches successfully
- [x] Project can be added
- [x] Task creation
- [x] Task status updates persist
- [x] Status survives app restart
- [x] Multiple tasks independent status

### P1 - High Priority (To Implement)

1. **Status Validation Tests**
   - `human_review` without spec should fail
   - `done` with worktree shows cleanup dialog
   - `in_progress` without auth fails

2. **Worktree Lifecycle Tests**
   - Worktree created on task start
   - Worktree merge on approve
   - Worktree discard confirmation
   - Worktree cleanup on force done

3. **Task Recovery Tests**
   - Stuck task detection
   - Recovery with auto-restart
   - Recovery from complete state

4. **Delete/Edit Validation**
   - Cannot delete running task
   - Cannot edit running task
   - Delete cleans up files

5. **Terminal Integration**
   - Terminal creates PTY
   - Terminal persists on navigation
   - Terminal closes properly

### P2 - Medium Priority

1. **Navigation Tests**
   - All views load correctly
   - Keyboard shortcuts work
   - View state persists

2. **Settings Tests**
   - Settings persist across restart
   - Theme changes apply
   - Profile changes apply

3. **GitHub/GitLab Integration**
   - Issues load
   - PRs load
   - Auth flow works

### P3 - Low Priority

1. **UI Polish**
   - Animations work
   - Toast notifications appear
   - Loading states show

---

## 12. Test File Structure

```
e2e/
├── p0-critical-flows.e2e.ts      # Existing - core flows
├── status-persistence.e2e.ts      # Existing - status persistence
├── p1-status-validation.e2e.ts    # NEW - status transition validation
├── p1-worktree-lifecycle.e2e.ts   # NEW - worktree operations
├── p1-task-recovery.e2e.ts        # NEW - stuck task recovery
├── p1-task-operations.e2e.ts      # NEW - delete, edit validation
├── p1-terminal-integration.e2e.ts # NEW - terminal tests
├── p2-navigation.e2e.ts           # NEW - view navigation
├── p2-settings.e2e.ts             # NEW - settings persistence
└── fixtures/
    └── test-data.ts               # Existing - test helpers
```

---

## 13. Next Steps

1. **Implement P1 tests** - Focus on edge cases and error handling
2. **Run full test suite** - Ensure no regressions
3. **Document test coverage** - Track what's tested vs untested
4. **Continuous improvement** - Add tests as bugs are found
