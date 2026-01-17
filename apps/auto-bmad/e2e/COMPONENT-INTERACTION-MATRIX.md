# Component Interaction Matrix - Auto-BMAD E2E Test Coverage

This document maps **every UI component, button, and action** to its **system impact** for comprehensive E2E testing.

---

## 1. SIDEBAR COMPONENT (`Sidebar.tsx`)

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Navigation: Kanban | Click / Key `K` | Changes activeView to 'kanban', loads tasks | HIGH |
| Navigation: Terminals | Click / Key `A` | Changes activeView to 'terminals', loads terminal sessions | HIGH |
| Navigation: Insights | Click / Key `N` | Changes activeView to 'insights', loads chat session | HIGH |
| Navigation: Roadmap | Click / Key `D` | Changes activeView to 'roadmap', loads roadmap data | MEDIUM |
| Navigation: Ideation | Click / Key `I` | Changes activeView to 'ideation', loads ideas | MEDIUM |
| Navigation: Changelog | Click / Key `L` | Changes activeView to 'changelog' | LOW |
| Navigation: Context | Click / Key `C` | Changes activeView to 'context', loads memory/index | MEDIUM |
| Navigation: Agent-Tools | Click / Key `M` | Changes activeView to 'agent-tools', loads MCP config | HIGH |
| Navigation: Worktrees | Click / Key `W` | Changes activeView to 'worktrees', lists git worktrees | MEDIUM |
| Navigation: GitHub Issues | Click / Key `G` | Shows GitHub issues (if enabled) | LOW |
| Navigation: GitHub PRs | Click / Key `P` | Shows GitHub PRs (if enabled) | LOW |
| Navigation: GitLab Issues | Click / Key `B` | Shows GitLab issues (if enabled) | LOW |
| Navigation: GitLab MRs | Click / Key `R` | Shows GitLab MRs (if enabled) | LOW |
| Settings Button | Click | Opens SettingsDialog, loads all settings | HIGH |
| Help Button | Click | Opens external GitHub issues URL | LOW |
| New Task Button | Click | Opens TaskCreationWizard dialog | HIGH |
| OpenCode Status Badge | Render | Shows OpenCode CLI availability status | MEDIUM |
| Rate Limit Indicator | Render | Shows rate limit status when limited | HIGH |
| Update Banner | Render | Shows app update availability | LOW |

---

## 2. TASK CARD COMPONENT (`TaskCard.tsx`)

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Card Click | Click | Opens TaskDetailModal with full task info | HIGH |
| Start Button | Click | Calls `startTask(taskId)`, spawns agent process, creates worktree | CRITICAL |
| Stop Button | Click | Calls `stopTask(taskId)`, kills agent process | CRITICAL |
| Recover Button | Click | Calls `recoverStuckTask(taskId)`, resets stuck task state | HIGH |
| Resume Button | Click | Calls `startTask(taskId)` for incomplete human_review | HIGH |
| Archive Button | Click | Calls `archiveTasks()`, marks task as archived | MEDIUM |
| View PR Button | Click | Opens PR URL in external browser | LOW |
| Status Dropdown | Select | Calls `updateTaskStatus()`, changes task column | HIGH |
| Phase Badge | Render | Shows current execution phase (spec, planning, coding, qa) | MEDIUM |
| Stuck Indicator | Render | Shows when task status=in_progress but no process running | HIGH |
| Progress Indicator | Render | Shows subtask completion progress | MEDIUM |

---

## 3. TASK CREATION WIZARD (`TaskCreationWizard.tsx`)

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Title Input | Type | Sets task title, validates on blur | HIGH |
| Description Textarea | Type | Sets description, enables @ mention detection | HIGH |
| @ Mention | Type `@` | Shows file autocomplete popup | MEDIUM |
| Autocomplete Select | Click file | Inserts @filename into description | MEDIUM |
| Profile Selector | Select | Changes model and thinking level for task | HIGH |
| Model Selector | Select | Overrides model for this task | MEDIUM |
| Thinking Level | Select | Overrides thinking level for this task | MEDIUM |
| Classification Toggle | Click | Expands/collapses category/priority/complexity fields | LOW |
| Category Select | Select | Sets task category (feature, bug_fix, etc.) | LOW |
| Priority Select | Select | Sets task priority | LOW |
| Complexity Select | Select | Sets task complexity | LOW |
| Impact Select | Select | Sets task impact | LOW |
| Git Options Toggle | Click | Expands/collapses base branch and worktree options | MEDIUM |
| Base Branch Select | Select | Sets which branch to create worktree from | MEDIUM |
| Use Worktree Toggle | Toggle | Enables/disables worktree isolation | HIGH |
| Image Upload | Drop/Click | Attaches images to task description | LOW |
| File Explorer Toggle | Click | Opens/closes file browser drawer | LOW |
| Discard Draft | Click | Clears localStorage draft for this project | LOW |
| Cancel Button | Click | Saves draft to localStorage, closes dialog | MEDIUM |
| Create Task Button | Click | Creates task via IPC, creates spec directory | CRITICAL |

---

## 4. INSIGHTS COMPONENT (`Insights.tsx`)

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Message Textarea | Type + Enter | Sends message to Claude SDK via IPC | CRITICAL |
| Send Button | Click | Sends message, shows loading state | HIGH |
| New Chat Button | Click | Creates new session, clears messages | HIGH |
| Model Selector | Select | Changes model config for current session | MEDIUM |
| Sidebar Toggle | Click | Shows/hides chat history sidebar | LOW |
| Session List | Click session | Switches to different chat session | MEDIUM |
| Delete Session | Click | Deletes session from disk | LOW |
| Rename Session | Edit | Renames session title | LOW |
| Suggested Questions | Click | Pre-fills message textarea | LOW |
| Create Task Button | Click (in suggestion) | Creates task from AI suggestion | HIGH |
| Tool Usage Expand | Click | Shows/hides tool usage history | LOW |
| Stream Chunk | Receive event | Renders streaming response in real-time | HIGH |
| Error Display | Receive event | Shows error message from Claude | MEDIUM |

---

## 5. WORKTREES COMPONENT (`Worktrees.tsx`)

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Refresh Button | Click | Reloads worktree list from git | MEDIUM |
| Merge Button | Click | Opens merge dialog, performs git merge | CRITICAL |
| Create PR Button | Click | Opens CreatePRDialog, creates GitHub/GitLab PR | HIGH |
| Copy Path Button | Click | Copies worktree path to clipboard | LOW |
| Delete Worktree Button | Click | Opens confirm dialog, removes worktree and branch | HIGH |
| Delete Terminal Worktree | Click | Removes terminal-created worktree | MEDIUM |
| Merge Confirm | Click | Executes merge, updates task status | CRITICAL |
| PR Options Dialog | Fill + Submit | Creates PR with title, body, options | HIGH |
| View PR Button | Click | Opens existing PR URL externally | LOW |

---

## 6. AGENT TOOLS / MCP COMPONENT (`AgentTools.tsx`)

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Context7 Toggle | Toggle | Enables/disables Context7 MCP for project | HIGH |
| Graphiti Toggle | Toggle | Enables/disables Graphiti memory MCP | MEDIUM |
| Linear Toggle | Toggle | Enables/disables Linear MCP | LOW |
| Electron Toggle | Toggle | Enables/disables Electron MCP for QA | MEDIUM |
| Puppeteer Toggle | Toggle | Enables/disables Puppeteer MCP for QA | MEDIUM |
| Agent Category Expand | Click | Expands/collapses agent category section | LOW |
| Add MCP to Agent | Click | Opens add dialog, adds MCP to agent's config | MEDIUM |
| Remove MCP from Agent | Click | Removes MCP from agent's config | MEDIUM |
| Restore MCP | Click | Restores previously removed MCP | LOW |
| Add Custom MCP | Click | Opens CustomMcpDialog | HIGH |
| Edit Custom MCP | Click | Opens CustomMcpDialog with existing data | MEDIUM |
| Delete Custom MCP | Click | Removes custom MCP from project | MEDIUM |
| Test Connection | Click | Runs full MCP connection test | HIGH |
| Health Check | Auto | Checks MCP server health on load | MEDIUM |

---

## 7. TERMINALS COMPONENT

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| New Terminal Tab | Click | Creates new terminal session via PTY | HIGH |
| Close Terminal Tab | Click | Closes terminal, kills PTY process | MEDIUM |
| Terminal Input | Type | Sends keystrokes to PTY | HIGH |
| Create Worktree | Dialog | Creates new worktree for terminal | MEDIUM |
| Worktree Selector | Select | Switches terminal working directory | MEDIUM |
| Task Selector | Select | Associates terminal with task | MEDIUM |
| Resize | Drag | Resizes terminal via PTY signal | LOW |

---

## 8. SETTINGS DIALOG

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Theme Selector | Select | Changes app theme, saves to settings | MEDIUM |
| Auto-Build Source Path | Input | Sets path to Auto-Claude framework source | HIGH |
| Agent Profile Selector | Select | Changes default agent profile for tasks | HIGH |
| Custom Phase Models | Edit | Overrides models for specific phases | MEDIUM |
| Custom Phase Thinking | Edit | Overrides thinking levels for phases | MEDIUM |
| Feature Models | Edit | Overrides models for features (ideation, etc.) | LOW |
| GitHub OAuth | Connect | Initiates GitHub OAuth flow | MEDIUM |
| GitLab OAuth | Connect | Initiates GitLab OAuth flow | MEDIUM |
| Linear API Key | Input | Saves Linear API key | LOW |
| Debug Settings | Toggle | Enables/disables debug features | LOW |
| Close Button | Click | Closes dialog, saves settings | HIGH |

---

## 9. TASK DETAIL MODAL

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Edit Task | Click | Opens TaskEditDialog | MEDIUM |
| Delete Task | Click | Opens confirm dialog, deletes task | HIGH |
| Start/Stop Button | Click | Same as TaskCard start/stop | CRITICAL |
| Review: Approve | Click | Approves task, moves to done | HIGH |
| Review: Reject | Click | Rejects with feedback, restarts QA | HIGH |
| Feedback Textarea | Type | Sets rejection feedback | MEDIUM |
| Image Upload (Review) | Drop | Attaches images to rejection feedback | LOW |
| Subtask List | View | Shows implementation plan subtasks | MEDIUM |
| Logs Tab | Click | Shows task execution logs | MEDIUM |
| Files Tab | Click | Shows files created/modified by task | MEDIUM |

---

## 10. ROADMAP COMPONENT

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Generate Roadmap | Click | Triggers AI roadmap generation | HIGH |
| Phase Card | Click | Expands phase details | LOW |
| Feature Card | Click | Opens feature detail panel | LOW |
| Add Feature | Click | Opens AddFeatureDialog | MEDIUM |
| Create Task from Feature | Click | Creates task from roadmap feature | HIGH |
| Kanban View Toggle | Click | Switches to kanban layout | LOW |

---

## 11. IDEATION COMPONENT

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Generate Ideas | Click | Triggers AI ideation for selected types | HIGH |
| Type Toggles | Click | Enables/disables idea types (perf, security, etc.) | MEDIUM |
| Idea Card | Click | Opens idea detail dialog | LOW |
| Create Task from Idea | Click | Creates task from ideation suggestion | HIGH |
| Filter by Type | Select | Filters displayed ideas | LOW |
| Competitor Analysis | Click | Opens competitor analysis dialog | LOW |

---

## 12. CHANGELOG COMPONENT

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Generate Changelog | Click | Analyzes git commits, generates changelog | MEDIUM |
| Date Range | Select | Sets commit range for changelog | LOW |
| Preview Panel | View | Shows generated changelog markdown | LOW |
| Archive Tasks | Click | Archives completed tasks into changelog | LOW |

---

## 13. CONTEXT COMPONENT

| Element | Action | System Impact | Test Priority |
|---------|--------|--------------|---------------|
| Refresh Index | Click | Rebuilds project context index | MEDIUM |
| Memory Status | View | Shows memory service status | LOW |
| File Count | View | Shows indexed file statistics | LOW |

---

## EDGE CASES TO TEST

### Task Lifecycle Edge Cases
1. Start task when Claude auth expires mid-execution
2. Start task with rate limit active
3. Stop task while spec creation in progress
4. Stop task while QA running
5. Recover task that's actually still running (race condition)
6. Create task with same title as existing task
7. Create task with special characters in title (XSS, SQL injection)
8. Create task with extremely long description (>10000 chars)
9. Delete task while it's running
10. Move running task to "done" column

### Cross-Feature Edge Cases
11. Send Insights message while task is creating spec
12. Start new task while another task is in QA
13. Merge worktree while task shows "in_progress"
14. Delete worktree for task in human_review
15. Create PR for already-merged worktree
16. Switch projects while task is running
17. Navigate away from Kanban while task status changing
18. Open Settings while task error dialog showing

### MCP Edge Cases
19. Enable Context7 during active task execution
20. Add custom MCP with invalid command
21. Add custom MCP with URL that returns 500
22. Test connection to MCP that times out
23. Enable Electron MCP for non-Electron project

### Insights Edge Cases
24. Send message while previous response still streaming
25. Delete current session while response streaming
26. Create task from suggestion that has no title
27. Switch session while message sending
28. Close dialog while session loading

### Worktree Edge Cases
29. Merge worktree with conflicts
30. Delete worktree with uncommitted changes
31. Create PR when not authenticated
32. Create PR for branch that was force-pushed

### UI Stress Edge Cases
33. Rapid navigation (10+ views in <5 seconds)
34. Create 10 tasks rapidly
35. Open/close Settings 10 times rapidly
36. Spam Enter in Insights textarea
37. Tab through all focusable elements

---

## COMPLEX USER FLOW SCENARIOS

### Flow 1: Complete Task Lifecycle
1. Add project
2. Initialize Auto-BMAD
3. Create task via wizard
4. Start task
5. Wait for spec creation
6. Wait for implementation
7. Wait for QA
8. Review (approve or reject)
9. If rejected, wait for QA fix
10. Merge worktree
11. Create PR
12. Archive task

### Flow 2: Multi-Task Parallel Work
1. Create Task A
2. Start Task A
3. While Task A runs, create Task B
4. Start Task B (should queue or run parallel)
5. Navigate between Kanban and Terminals
6. Check both tasks progress
7. Stop Task A
8. Verify Task B continues

### Flow 3: Insights to Task Workflow
1. Open Insights
2. Ask about codebase architecture
3. Get suggestion with "Create Task" option
4. Create task from suggestion
5. Navigate to Kanban
6. Verify task appears in Backlog
7. Start the created task

### Flow 4: Worktree Management
1. Create task
2. Start task (creates worktree)
3. Navigate to Worktrees view
4. Verify worktree appears
5. Open Terminal in worktree
6. Make manual changes
7. Return to task, complete it
8. Merge worktree
9. Create PR
10. Verify worktree cleanup option

### Flow 5: MCP Configuration
1. Navigate to Agent Tools
2. Disable Context7
3. Add custom HTTP MCP server
4. Test connection
5. Add custom MCP to coder agent
6. Create and start task
7. Verify custom MCP is used (check logs)
8. Remove custom MCP
9. Re-enable Context7

### Flow 6: Profile-Based Execution
1. Open Settings
2. Create custom agent profile
3. Set different models for different phases
4. Create task
5. Start task
6. Verify spec phase uses spec model
7. Verify coding phase uses coding model
8. Verify QA phase uses QA model

---

## TEST PRIORITY SUMMARY

| Priority | Count | Focus |
|----------|-------|-------|
| CRITICAL | 8 | Task start/stop, merge, create |
| HIGH | 32 | Core functionality |
| MEDIUM | 28 | Secondary features |
| LOW | 22 | Nice-to-have coverage |

**Total Testable Interactions: 90**
