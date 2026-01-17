# Auto-BMAD UI Component Analysis

## Executive Summary

This document provides a comprehensive analysis of all UI components, buttons, and actions in the Auto-BMAD application, along with their system impact and recommended test scenarios.

---

## 1. Navigation System

### 1.1 Sidebar Views (SidebarView type)

| View ID | Icon | Keyboard Shortcut | System Impact |
|---------|------|-------------------|---------------|
| `kanban` | LayoutGrid | K | Loads task store, displays KanbanBoard |
| `terminals` | Terminal | A | Loads terminal store, preserves PTY processes |
| `insights` | Sparkles | N | Loads insights store, runs insight generation |
| `roadmap` | Map | D | Loads roadmap store, may trigger roadmap generation |
| `ideation` | Lightbulb | I | Loads ideation store, displays brainstorming features |
| `changelog` | FileText | L | Loads changelog store, fetches git history |
| `context` | BookOpen | C | Loads context store, displays project context |
| `agent-tools` | Wrench | M | Displays MCP/agent tool configuration |
| `worktrees` | GitBranch | W | Lists git worktrees for the project |
| `github-issues` | Github | G | Loads GitHub issues (if GitHub enabled) |
| `github-prs` | GitPullRequest | P | Loads GitHub PRs (if GitHub enabled) |
| `gitlab-issues` | GitlabIcon | B | Loads GitLab issues (if GitLab enabled) |
| `gitlab-merge-requests` | GitMerge | R | Loads GitLab MRs (if GitLab enabled) |

### 1.2 Project Tab System

| Action | Button/Trigger | System Impact |
|--------|---------------|---------------|
| Select Project | Click on tab | `setActiveProject()` - loads tasks, terminals, settings for that project |
| Close Project | X button on tab | `removeProject()` - Shows confirmation dialog, removes from app (files preserved) |
| Add Project | + button | Opens AddProjectModal |
| Reorder Tabs | Drag and drop | `reorderTabs()` - persists new order |

---

## 2. Kanban Board System

### 2.1 Column Actions

| Column | Action | Button/Trigger | System Impact |
|--------|--------|----------------|---------------|
| Backlog | Add Task | + button | Opens TaskCreationWizard |
| Done | Archive All | Archive icon | `archiveTasks()` - marks all done tasks as archived |
| Done | Toggle Archived | Archive icon with badge | `toggleShowArchived()` - shows/hides archived tasks |
| All | Refresh | Refresh button in header | `loadTasks()` - reloads all tasks from disk |

### 2.2 Task Card Actions

| Action | Trigger | System Impact |
|--------|---------|---------------|
| View Details | Click on card | Opens TaskDetailModal with full task data |
| Drag to Column | Drag and drop | `persistTaskStatus()` - Updates status in plan file |
| Status Change Menu | Context menu | `persistTaskStatus()` - Updates status in plan file |

### 2.3 Drag-and-Drop Status Transitions

| From | To | System Impact |
|------|-----|---------------|
| Any | `in_progress` | Auto-starts task if not running (git check, auth check, starts agent) |
| `in_progress` | Any | Stops running task, kills agent process |
| Any | `done` | Checks for worktree - prompts cleanup dialog if exists |
| `human_review` | `backlog` | Validates spec exists before allowing transition |

---

## 3. Task Detail Modal

### 3.1 Header Actions

| Button | Condition | System Impact |
|--------|-----------|---------------|
| Edit (Pencil) | Not running | Opens TaskEditDialog |
| Close (X) | Always | Closes modal, shows toast if task running |

### 3.2 Primary Actions (Footer)

| Button | Condition | System Impact |
|--------|-----------|---------------|
| Start Task | Status = backlog, not running | `startTask()` - Starts spec creation or task execution |
| Stop Task | Status = in_progress, running | `stopTask()` - Kills agent process |
| Resume Task | Incomplete state | Validates plan, then `startTask()` |
| Recover Task | Stuck state | `recoverStuckTask()` - Resets stuck subtasks, optionally restarts |
| Delete Task | Not running | Shows confirmation, `deleteTask()` - Removes task files |

### 3.3 Tab Content Actions

#### Overview Tab
| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| View Metadata | Automatic display | Shows task category, priority, complexity, etc. |

#### Subtasks Tab
| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| View Subtask | Click | Expands subtask details |

#### Logs Tab
| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Expand Phase | Click phase header | Toggles log visibility for phase |
| Auto-scroll | Automatic | Scrolls to latest logs when running |

#### Files Tab
| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Browse Files | Automatic | Lists files modified by task |

### 3.4 Human Review Actions (When status = human_review)

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Merge Changes | "Merge" button | `mergeWorktree()` - Merges worktree changes to main |
| Stage Only | Checkbox + Merge | `mergeWorktree({ noCommit: true })` - Stages but doesn't commit |
| Discard Changes | "Discard" button | Shows confirmation, `discardWorktree()` - Removes worktree |
| View Diff | "View Diff" button | Opens diff dialog showing changes |
| Create PR | "Create PR" button | `createWorktreePR()` - Pushes branch, creates GitHub/GitLab PR |
| Reject (Send Feedback) | Feedback form + Submit | `submitReview(false, feedback)` - Writes QA_FIX_REQUEST.md, restarts QA |
| Attach Images | Image upload | Saves images to spec/feedback_images/, includes in feedback |
| Open Terminal | Dropdown | Opens terminal in worktree directory |

---

## 4. Task Creation Wizard

### 4.1 Form Fields

| Field | Required | System Impact |
|-------|----------|---------------|
| Title | No | Task identifier in UI |
| Description | Yes | Core task specification content |
| Category | No | Classification metadata |
| Priority | No | Execution ordering hint |
| Complexity | No | Resource estimation hint |
| Impact | No | Business value indicator |
| Profile/Model | No | AI model selection (from agent profiles) |
| Thinking Level | No | AI thinking depth |
| Base Branch | No | Git branch for worktree creation |
| Images | No | Visual context for AI |

### 4.2 Actions

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Create Task | "Create Task" button | `createTask()` - Creates spec directory, writes spec.md |
| Cancel | "Cancel" button | Saves draft to localStorage, closes |
| Discard Draft | "Start Fresh" button | `clearDraft()` - Removes localStorage draft |
| Toggle File Explorer | "Browse Files" button | Opens file browser sidebar |
| @ Mention | Type @ in description | Shows file autocomplete popup |
| Toggle Classification | Chevron button | Shows/hides classification fields |
| Toggle Git Options | Chevron button | Shows/hides base branch selector |

---

## 5. Settings Dialog (AppSettingsDialog)

### 5.1 Application Settings Sections

| Section | Key Actions | System Impact |
|---------|-------------|---------------|
| Appearance | Theme toggle, color theme | Updates CSS variables, saves to settings |
| Display | UI scale slider | Updates data-ui-scale attribute |
| Language | Language selector | Changes i18n locale |
| DevTools | Claude DevTools toggle | Enables/disables devtools integration |
| Agent | Agent profile selection | Sets default model/thinking for tasks |
| Paths | Auto-build source path | Configures where to copy framework from |
| Integrations | API keys | Stores GitHub/Linear/etc. tokens |
| API Profiles | CRUD profiles | Manages Claude API authentication |
| Load Balancing | Profile configuration | Sets up multi-profile load balancing |
| Updates | Check/Install updates | electron-updater actions |
| Notifications | Notification preferences | Configures alerts |
| Debug | Debug settings | Development utilities |

### 5.2 Project Settings Sections

| Section | Key Actions | System Impact |
|---------|-------------|---------------|
| General | Project name, main branch | Updates project configuration |
| Linear | Linear API key, project | Enables Linear issue sync |
| GitHub | GitHub token, repo | Enables GitHub integration |
| GitLab | GitLab token, project | Enables GitLab integration |
| Memory | Graphiti config | Configures AI memory service |

---

## 6. Onboarding Wizard

### 6.1 Steps

| Step | Actions | System Impact |
|------|---------|---------------|
| Welcome | Get Started, Skip | Navigation control |
| Auth Choice | OAuth or API Key path | Determines authentication method |
| OAuth | Login, Refresh | `window.electronAPI.claudeAuth*` calls |
| OpenCode | Install/Check | Validates OpenCode CLI |
| DevTools | Toggle | Sets devtools preference |
| Privacy | Configure | Sets telemetry preferences |
| Graphiti | Configure | Sets memory service |
| Completion | Finish, Open Settings | Marks `onboardingCompleted: true` |

---

## 7. Terminal System

### 7.1 Terminal Grid Actions

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Add Terminal | + button | `addTerminal()` - Creates PTY process |
| Close Terminal | X button | `killTerminal()` - Kills PTY, removes from store |
| Split Terminal | Split button | Adds terminal to grid layout |
| Resize | Drag divider | Resizes terminal panels |
| Select Worktree | Dropdown | Changes terminal CWD to worktree |
| Link to Task | Task selector | Associates terminal with task |
| Rename | Double-click title | Updates terminal name |

### 7.2 Terminal Input/Output

| Action | Trigger | System Impact |
|--------|---------|---------------|
| Send Input | Keyboard | PTY write via IPC |
| Scroll | Mouse/keyboard | Virtual scrollback navigation |
| Copy | Selection + Ctrl+C | Clipboard write |
| Paste | Ctrl+V | PTY write via IPC |

---

## 8. BMAD-Specific Components

### 8.1 Workflow Runner

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Select Workflow | Click in list | Sets `selectedWorkflow` state |
| Execute Workflow | Execute button | `bridge.runPlanningWorkflow()` via OpenCode CLI |
| Cancel Workflow | Cancel button | Kills OpenCode process |
| View Output | Automatic | Shows real-time stdout/stderr |

### 8.2 Phase Dashboard

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| View Phase | Click phase card | Expands phase details |
| Run Phase Workflow | Execute button | Triggers phase-specific BMAD workflow |
| View Artifacts | Link click | Opens artifact file in viewer |

---

## 9. Integration Components

### 9.1 GitHub Issues

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Fetch Issues | Automatic/Refresh | GitHub API call via `gh` CLI |
| Import to Task | "Import" button | Creates task from issue |
| Filter | Filter bar | Client-side filtering |
| Search | Search input | GitHub API search |

### 9.2 GitHub PRs

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Fetch PRs | Automatic/Refresh | GitHub API call via `gh` CLI |
| View PR | Click PR item | Shows PR details, diff |
| Start Review | "Review" button | Triggers AI-powered PR review |
| View Review | Click review | Shows review findings |
| Apply Fix | "Apply" button (autofix) | Applies suggested code fix |

### 9.3 GitLab (Similar to GitHub)

Same patterns as GitHub but using GitLab API.

### 9.4 Linear Import

| Action | Button/Trigger | System Impact |
|--------|----------------|---------------|
| Connect | OAuth flow | Stores Linear token |
| Fetch Issues | Automatic | Linear API call |
| Select Issues | Checkboxes | Marks for import |
| Import | "Import Selected" | Creates tasks from Linear issues |

---

## 10. State Management (Zustand Stores)

### 10.1 Key Stores and Their Triggers

| Store | Key State | Modified By |
|-------|-----------|-------------|
| `task-store` | tasks, selectedTaskId | Task CRUD, status changes, execution events |
| `project-store` | projects, selectedProjectId, openProjectIds | Project CRUD, tab actions |
| `terminal-store` | terminals, activeTerminalId | Terminal CRUD, PTY events |
| `settings-store` | settings, profiles | Settings dialog save |
| `roadmap-store` | roadmapPhases, features | Roadmap generation, drag-drop |
| `ideation-store` | ideas, sessions | Ideation generation |
| `insights-store` | insights | Insights generation |
| `github/issues-store` | issues | GitHub API responses |
| `github/pr-review-store` | reviews, findings | PR review results |
| `gitlab/*` | Similar to GitHub | GitLab API responses |

---

## 11. IPC Handler Categories

### 11.1 Handler Files and Coverage

| Handler File | Coverage |
|-------------|----------|
| `task/execution-handlers.ts` | TASK_START, TASK_STOP, TASK_REVIEW, TASK_UPDATE_STATUS, TASK_RECOVER_STUCK |
| `task/crud-handlers.ts` | TASK_CREATE, TASK_DELETE, TASK_UPDATE, TASK_GET, TASK_LIST |
| `task/worktree-handlers.ts` | Worktree merge, discard, PR creation |
| `project-handlers.ts` | Project CRUD, initialization |
| `settings-handlers.ts` | Settings save/load |
| `terminal-handlers.ts` | PTY creation, I/O, resize |
| `github-handlers.ts` | GitHub API proxy |
| `gitlab/*` | GitLab API proxy |
| `bmad-handlers.ts` | BMAD workflow execution |
| `opencode-handlers.ts` | OpenCode CLI status, execution |

---

## 12. Edge Cases and Error Scenarios

### 12.1 Task Lifecycle Edge Cases

| Scenario | Current Behavior | Test Focus |
|----------|------------------|------------|
| Start task without git repo | Shows error toast | Verify error message clarity |
| Start task without commits | Shows error toast | Verify error message clarity |
| Start task without auth | Shows error toast | Verify redirect to settings |
| Drag running task to backlog | Stops task, updates status | Verify process killed |
| Drag to done with worktree | Shows cleanup dialog | Verify worktree path shown |
| Task stuck (process died) | Requires recovery | Verify stuck detection works |
| Task crashes mid-execution | Status shows in_progress but not running | Verify recovery flow |
| Concurrent status updates | Race condition possible | Verify atomic file writes |
| OpenCode not installed | All tasks fail | Verify clear error message |

### 12.2 UI State Edge Cases

| Scenario | Current Behavior | Test Focus |
|----------|------------------|------------|
| No projects | Shows WelcomeScreen | Verify onboarding flow |
| Project not initialized | Shows init dialog | Verify init process works |
| Settings not loaded | Shows loading/onboarding | Verify race condition handling |
| Rapid tab switching | Loads tasks per project | Verify no task leakage |
| Close modal while task running | Shows toast | Verify toast appears |
| Network failure during GitHub sync | Error state | Verify retry mechanism |
| Large task log output | Performance concern | Verify virtualization |

### 12.3 BMAD-Specific Edge Cases

| Scenario | Current Behavior | Test Focus |
|----------|------------------|------------|
| OpenCode CLI missing | Blocks all task execution | Verify detection and error |
| OpenCode profile not configured | May fail | Verify graceful handling |
| Load balancer no available profiles | Falls back to default | Verify fallback works |
| Rate limit hit | Retries with backoff | Verify retry logic |
| Workflow file missing | Workflow execution fails | Verify error handling |
| BMAD directory not present | Should create or fail gracefully | Verify initialization |

### 12.4 Terminal Edge Cases

| Scenario | Current Behavior | Test Focus |
|----------|------------------|------------|
| Max terminals reached | Blocks creation | Verify limit enforcement |
| PTY process dies | Terminal may hang | Verify cleanup |
| Very long output | Buffer limits | Verify truncation/virtualization |
| Unicode/ANSI codes | Rendering | Verify xterm.js handling |
| Resize during output | Layout shift | Verify responsive resize |

---

## 13. Test Scenarios Matrix

### 13.1 Critical User Flows (P0)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 1 | First-time setup | Open app -> Complete onboarding wizard | Settings saved, app ready |
| 2 | Create and run task | Create task -> Drag to in_progress | Task executes, shows progress |
| 3 | Complete task flow | Run task -> Review -> Merge | Task marked done, worktree cleaned |
| 4 | Task recovery | Kill app during task -> Reopen -> Recover | Task resumes or resets correctly |
| 5 | Multi-project | Add 2 projects -> Switch tabs | Correct tasks shown per project |

### 13.2 Task Lifecycle (P1)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 6 | Cancel running task | Start task -> Stop | Process killed, status = backlog |
| 7 | Reject task review | Complete task -> Reject with feedback | QA process restarts |
| 8 | Delete task | Select task -> Delete -> Confirm | Task removed, files deleted |
| 9 | Archive tasks | Complete multiple -> Archive all | Tasks hidden, count shown |
| 10 | Create PR | Complete task -> Create PR | PR created, status = pr_created |

### 13.3 Error Handling (P1)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 11 | No git repo | Start task in non-git folder | Clear error message |
| 12 | No auth | Start task without auth | Redirect to settings |
| 13 | OpenCode missing | Any task operation | Clear install instructions |
| 14 | Network failure | GitHub sync with no network | Retry option shown |
| 15 | Corrupt plan file | Load task with bad JSON | Graceful error, recovery option |

### 13.4 Settings and Configuration (P2)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 16 | Change theme | Settings -> Appearance -> Dark | Theme applied immediately |
| 17 | Add API profile | Settings -> API Profiles -> Add | Profile saved, selectable |
| 18 | Configure GitHub | Project Settings -> GitHub | Token validated, issues load |
| 19 | Change language | Settings -> Language -> Select | UI updates immediately |
| 20 | Configure load balancer | Settings -> Load Balancing | Profiles validated |

### 13.5 Terminal Operations (P2)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 21 | Create terminal | Terminal view -> + button | New terminal opens |
| 22 | Run command | Type command -> Enter | Output displayed |
| 23 | Split terminals | Create 2 terminals -> Resize | Both functional |
| 24 | Link to task | Select task in dropdown | CWD changes to worktree |
| 25 | Close terminal | X button | PTY killed, terminal removed |

### 13.6 BMAD Workflow (P1)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 26 | Run planning workflow | Select workflow -> Execute | Workflow completes, output shown |
| 27 | View phase status | Phase dashboard | Correct status per phase |
| 28 | View artifacts | Click artifact link | File displayed |
| 29 | Cancel workflow | Execute -> Cancel | Process killed gracefully |
| 30 | Load balancer switch | Rate limit -> Auto-switch | New profile used |

### 13.7 Integration Features (P2)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 31 | Import GitHub issue | GitHub Issues -> Import | Task created with issue content |
| 32 | PR review | GitHub PRs -> Review PR | Findings displayed |
| 33 | Linear sync | Configure Linear -> Sync | Issues loaded |
| 34 | GitLab MR review | GitLab MRs -> Select MR | Review UI works |
| 35 | Worktree cleanup | Discard changes | Worktree deleted, branch removed |

### 13.8 Edge Case Scenarios (P1)

| # | Flow | Steps | Expected Result |
|---|------|-------|-----------------|
| 36 | Rapid status changes | Drag task rapidly between columns | Final status correct |
| 37 | Concurrent task starts | Start 2 tasks simultaneously | Both tracked correctly |
| 38 | Project with no tasks | Open empty project | Empty state shown |
| 39 | Very long task title | Create task with 500+ char title | Truncated appropriately |
| 40 | Task with special chars | Create task with unicode/emoji | Renders correctly |

---

## 14. Component Dependency Graph

```
App.tsx
├── Sidebar.tsx
│   ├── RateLimitIndicator.tsx
│   ├── OpenCodeStatusBadge.tsx
│   ├── UpdateBanner.tsx
│   ├── AddProjectModal.tsx
│   └── GitSetupModal.tsx
├── ProjectTabBar.tsx
│   └── SortableProjectTab.tsx
├── KanbanBoard.tsx
│   ├── DroppableColumn.tsx
│   ├── SortableTaskCard.tsx
│   │   └── TaskCard.tsx
│   └── WorktreeCleanupDialog.tsx
├── TaskDetailModal.tsx
│   ├── TaskMetadata.tsx
│   ├── TaskWarnings.tsx
│   ├── TaskSubtasks.tsx
│   ├── TaskLogs.tsx
│   ├── TaskFiles.tsx
│   ├── TaskReview.tsx
│   │   ├── DiffViewDialog.tsx
│   │   ├── CreatePRDialog.tsx
│   │   ├── DiscardDialog.tsx
│   │   └── QAFeedbackSection.tsx
│   └── TaskEditDialog.tsx
├── TaskCreationWizard.tsx
│   ├── TaskFormFields.tsx
│   ├── TaskFileExplorerDrawer.tsx
│   └── FileAutocomplete.tsx
├── TerminalGrid.tsx
│   ├── Terminal.tsx (xterm.js)
│   └── TerminalHeader.tsx
├── AppSettingsDialog.tsx
│   └── [Various Settings Components]
├── OnboardingWizard.tsx
│   └── [Step Components]
└── [View-specific components]
```

---

## 15. Recommendations for E2E Testing

### 15.1 Test Environment Setup
1. Mock OpenCode CLI responses for predictable testing
2. Use test fixtures for project/task data
3. Configure rate limit bypass for testing
4. Set up test GitHub/GitLab tokens

### 15.2 Critical Test Priorities
1. **P0**: Task lifecycle (create, run, complete, merge)
2. **P0**: Error handling (no git, no auth, OpenCode missing)
3. **P1**: Multi-project switching
4. **P1**: Recovery from stuck states
5. **P2**: Integration features (GitHub/GitLab/Linear)

### 15.3 Performance Test Points
1. Large task log rendering (10k+ lines)
2. Many tasks in Kanban (100+ tasks)
3. Many terminals open (10+ terminals)
4. Rapid tab switching
5. Concurrent task execution

---

*Document generated by BMAD Analyst Agent (Mary)*
*Date: 2026-01-17*
