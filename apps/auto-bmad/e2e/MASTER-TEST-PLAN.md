# Auto-BMAD Master Test Plan

## Executive Summary

This document provides a **comprehensive analysis** of every component, button, action, and their system impacts in the Auto-BMAD Electron application. It serves as the foundation for thorough E2E testing.

**Total Components Analyzed:** 100+
**Total Buttons/Actions Cataloged:** 250+
**Total IPC Channels:** 150+
**Test Categories:** 15 domains

---

## Table of Contents

1. [Application Architecture Overview](#application-architecture-overview)
2. [Component Inventory by Domain](#component-inventory-by-domain)
3. [Button & Action Catalog](#button--action-catalog)
4. [IPC System Impact Map](#ipc-system-impact-map)
5. [Edge Cases & Boundary Conditions](#edge-cases--boundary-conditions)
6. [Complex User Flow Scenarios](#complex-user-flow-scenarios)
7. [Test Implementation Checklist](#test-implementation-checklist)

---

## 1. Application Architecture Overview

### Main Views (12 Total)
| View | Component | Route/Navigation |
|------|-----------|------------------|
| Kanban | `KanbanBoard.tsx` | Default view |
| Terminals | `TerminalGrid.tsx` | Sidebar nav |
| Insights | `Insights.tsx` | Sidebar nav |
| Roadmap | `Roadmap.tsx` | Sidebar nav |
| Ideation | `Ideation.tsx` | Sidebar nav |
| Changelog | `Changelog.tsx` | Sidebar nav |
| Context | `Context.tsx` | Sidebar nav |
| Agent Tools | `AgentTools.tsx` | Sidebar nav |
| Worktrees | `Worktrees.tsx` | Sidebar nav |
| GitHub Issues | `GitHubIssues.tsx` | Conditional (GitHub enabled) |
| GitHub PRs | `GitHubPRs.tsx` | Conditional (GitHub enabled) |
| GitLab Issues | `GitLabIssues.tsx` | Conditional (GitLab enabled) |
| GitLab MRs | `GitLabMergeRequests.tsx` | Conditional (GitLab enabled) |

### Core Layout Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `App.tsx` | Root | Main app orchestration |
| `Sidebar.tsx` | Left panel | Navigation + actions |
| `ProjectTabBar.tsx` | Top | Project switching |

### API Modules (16 Total)
| Module | Functions | Primary Purpose |
|--------|-----------|-----------------|
| `project-api.ts` | 15+ | Project CRUD, initialization |
| `task-api.ts` | 25+ | Task lifecycle management |
| `terminal-api.ts` | 30+ | PTY, Claude profiles, sessions |
| `settings-api.ts` | 10+ | App/project settings |
| `file-api.ts` | 10+ | File system operations |
| `agent-api.ts` | 5+ | Agent process management |
| `ideation-api.ts` | 10+ | Ideation generation |
| `insights-api.ts` | 15+ | AI insights chat |
| `github-api.ts` | 20+ | GitHub integration |
| `gitlab-api.ts` | 15+ | GitLab integration |
| `roadmap-api.ts` | 10+ | Roadmap generation |
| `changelog-api.ts` | 10+ | Changelog management |
| `mcp-api.ts` | 5+ | MCP server health |
| `opencode-api.ts` | 5+ | OpenCode CLI integration |
| `profile-api.ts` | 10+ | API profiles (OpenRouter) |
| `bmad-api.ts` | 10+ | BMAD workflows |

---

## 2. Component Inventory by Domain

### 2.1 Sidebar & Navigation

#### Sidebar.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Auto BMAD Logo | Text | None (branding) | - | - |
| Kanban nav button | Button | `onViewChange('kanban')` | - | `activeView = 'kanban'` |
| Terminals nav button | Button | `onViewChange('terminals')` | - | `activeView = 'terminals'` |
| Insights nav button | Button | `onViewChange('insights')` | - | `activeView = 'insights'` |
| Roadmap nav button | Button | `onViewChange('roadmap')` | - | `activeView = 'roadmap'` |
| Ideation nav button | Button | `onViewChange('ideation')` | - | `activeView = 'ideation'` |
| Changelog nav button | Button | `onViewChange('changelog')` | - | `activeView = 'changelog'` |
| Context nav button | Button | `onViewChange('context')` | - | `activeView = 'context'` |
| Agent Tools nav button | Button | `onViewChange('agent-tools')` | - | `activeView = 'agent-tools'` |
| Worktrees nav button | Button | `onViewChange('worktrees')` | - | `activeView = 'worktrees'` |
| GitHub Issues nav button | Button | `onViewChange('github-issues')` | - | `activeView = 'github-issues'` |
| GitHub PRs nav button | Button | `onViewChange('github-prs')` | - | `activeView = 'github-prs'` |
| GitLab Issues nav button | Button | `onViewChange('gitlab-issues')` | - | `activeView = 'gitlab-issues'` |
| GitLab MRs nav button | Button | `onViewChange('gitlab-merge-requests')` | - | `activeView = 'gitlab-merge-requests'` |
| Settings button | Button | `onSettingsClick()` | - | `isSettingsDialogOpen = true` |
| Help button | Button | `window.open('github.com/issues')` | - | External URL |
| New Task button | Button | `onNewTaskClick()` | - | `isNewTaskDialogOpen = true` |

**Keyboard Shortcuts:**
- `K` - Kanban
- `A` - Terminals (Agents)
- `N` - Insights
- `D` - Roadmap (Development)
- `I` - Ideation
- `L` - Changelog
- `C` - Context
- `M` - Agent Tools (MCP)
- `W` - Worktrees
- `G` - GitHub Issues
- `P` - GitHub PRs
- `B` - GitLab Issues
- `R` - GitLab MRs

### 2.2 Kanban Board

#### KanbanBoard.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Refresh button | Button | `onRefresh()` | `getTasks(projectId)` | `tasks` reloaded |
| Column: Error | DroppableColumn | Drop zone | `updateTaskStatus()` | Task status -> 'error' |
| Column: Backlog | DroppableColumn | Drop zone | `updateTaskStatus()` | Task status -> 'backlog' |
| Column: In Progress | DroppableColumn | Drop zone | `updateTaskStatus()` | Task status -> 'in_progress' |
| Column: AI Review | DroppableColumn | Drop zone | `updateTaskStatus()` | Task status -> 'ai_review' |
| Column: Human Review | DroppableColumn | Drop zone | `updateTaskStatus()` | Task status -> 'human_review' |
| Column: Done | DroppableColumn | Drop zone | `updateTaskStatus()` | Task status -> 'done' |
| Add Task button (Backlog) | Button | `onNewTaskClick()` | - | Dialog opens |
| Archive All button (Done) | Button | `archiveTasks()` | `archiveTasks(projectId, taskIds)` | Tasks archived |
| Toggle Archived button | Button | `toggleShowArchived()` | - | `showArchived` toggle |
| Task Card | Card | `onTaskClick(task)` | - | `selectedTask = task` |
| Task Card (drag) | DragOverlay | Drag to column | `updateTaskStatus()` | Task status changes |

**Edge Cases:**
- Drag task to same column (no-op)
- Drag task when worktree exists (WorktreeCleanupDialog)
- Archive empty Done column (no action)
- Refresh while tasks running

### 2.3 Task Management

#### TaskCreationWizard.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Title input | Input | `setTitle(value)` | - | Local state |
| Description textarea | Textarea | `handleDescriptionChange(value)` | - | Local state |
| @ mention autocomplete | Popup | `handleAutocompleteSelect()` | `listFiles()` | File reference added |
| Profile selector | Select | `setProfileId(value)` | - | Local state |
| Model selector | Select | `setModel(value)` | - | Local state |
| Thinking level selector | Select | `setThinkingLevel(value)` | - | Local state |
| Image upload | FileInput | `setImages(images)` | - | Local state |
| Classification toggle | Button | `setShowClassification(toggle)` | - | Expand/collapse |
| Category selector | Select | `setCategory(value)` | - | Local state |
| Priority selector | Select | `setPriority(value)` | - | Local state |
| Complexity selector | Select | `setComplexity(value)` | - | Local state |
| Impact selector | Select | `setImpact(value)` | - | Local state |
| Require review toggle | Checkbox | `setRequireReviewBeforeCoding(value)` | - | Local state |
| Git Options toggle | Button | `setShowGitOptions(toggle)` | - | Expand/collapse |
| Base branch selector | Select | `setBaseBranch(value)` | `getGitBranches()` | Local state |
| Browse Files button | Button | `setShowFileExplorer(toggle)` | - | Drawer opens |
| Discard Draft button | Button | `handleDiscardDraft()` | - | Form reset |
| Cancel button | Button | `handleClose()` | `saveDraft()` (if content) | Dialog closes |
| Create Task button | Button | `handleCreate()` | `createTask()` | Task created |

**Edge Cases:**
- Empty description validation
- Draft persistence across sessions
- File reference with invalid path
- Image upload failure
- Git branches fetch failure

#### TaskDetailModal.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Edit button | Button | `setIsEditDialogOpen(true)` | - | Edit dialog opens |
| Close button | Button | `handleClose()` | - | Modal closes |
| Overview tab | Tab | `setActiveTab('overview')` | - | Tab switch |
| Subtasks tab | Tab | `setActiveTab('subtasks')` | - | Tab switch |
| Logs tab | Tab | `setActiveTab('logs')` | `getTaskLogs()` | Tab switch |
| Files tab | Tab | `setActiveTab('files')` | - | Tab switch |
| Start Task button | Button | `handleStartStop()` | `startTask(taskId)` | Task starts |
| Stop Task button | Button | `handleStartStop()` | `stopTask(taskId)` | Task stops |
| Resume Task button | Button | `handleStartStop()` | `startTask(taskId)` | Task resumes |
| Recover Task button | Button | `handleRecover()` | `recoverStuckTask(taskId)` | Task recovered |
| Delete Task button | Button | `setShowDeleteDialog(true)` | - | Delete dialog opens |
| Confirm Delete button | Button | `handleDelete()` | `deleteTask(taskId)` | Task deleted |
| Merge Changes button | Button | `handleMerge()` | `mergeWorktree(taskId)` | Worktree merged |
| Discard Changes button | Button | `handleDiscard()` | `discardWorktree(taskId)` | Worktree discarded |
| Create PR button | Button | `handleCreatePR()` | `createWorktreePR(taskId)` | PR created |
| Reject Review button | Button | `handleReject()` | `submitReview(taskId, false)` | Task back to in_progress |
| PR Link | Link | `openExternal(prUrl)` | - | External URL |

**Edge Cases:**
- Start task when already running
- Stop task that has completed
- Delete task with worktree (cleanup)
- Merge with conflicts
- Create PR when not authenticated

### 2.4 Terminal System

#### TerminalGrid.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| New Terminal button | Button | `handleAddTerminal()` | `createTerminal()` | Terminal added |
| Ctrl+T | Keyboard | `handleAddTerminal()` | `createTerminal()` | Terminal added |
| Ctrl+W | Keyboard | `handleCloseTerminal(activeId)` | `destroyTerminal(id)` | Terminal closed |
| Invoke Claude All | Button | `handleInvokeClaudeAll()` | `invokeClaudeInTerminal()` | Claude invoked |
| History dropdown | Select | `handleRestoreFromDate()` | `restoreTerminalSessionsFromDate()` | Sessions restored |
| Files toggle | Button | `toggleFileExplorer()` | - | Panel toggle |
| Terminal expand | Button | `handleToggleExpand(id)` | - | Terminal fullscreen |
| Terminal close | Button | `handleCloseTerminal(id)` | `destroyTerminal(id)` | Terminal removed |
| Terminal drag/reorder | DragOverlay | `reorderTerminals()` | - | Order changed |
| File drag to terminal | DragOverlay | `sendTerminalInput(id, path)` | `sendTerminalInput()` | Path inserted |

#### Terminal.tsx (Individual)
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Terminal content | XTerm | User input | `sendTerminalInput(id, data)` | PTY input |
| Title bar | Header | Display only | - | - |
| Close button | Button | `onClose()` | `destroyTerminal(id)` | Terminal removed |
| Expand button | Button | `onToggleExpand()` | - | Fullscreen toggle |
| Task selector dropdown | Select | Task selection | - | Task context set |
| Claude status badge | Badge | Display only | - | - |

**Edge Cases:**
- Max terminals (12) reached
- Terminal session restore failure
- Claude rate limit during invoke
- PTY process crash
- File drop with spaces in path

### 2.5 Insights (AI Chat)

#### Insights.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Sidebar toggle | Button | `setShowSidebar(toggle)` | - | Sidebar visibility |
| New Chat button | Button | `handleNewSession()` | `newInsightsSession()` | New session |
| Model selector | Select | `handleModelConfigChange()` | `updateModelConfig()` | Model changed |
| Message textarea | Textarea | `setInputValue(value)` | - | Local state |
| Send button | Button | `handleSend()` | `sendInsightsMessage()` | Message sent |
| Enter key | Keyboard | `handleSend()` | `sendInsightsMessage()` | Message sent |
| Suggestion chips | Button | `setInputValue(suggestion)` | - | Input prefilled |
| Create Task from suggestion | Button | `handleCreateTask()` | `createTask()` | Task created |
| Tool usage expand | Button | `setExpanded(toggle)` | - | Details shown |

#### ChatHistorySidebar.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Session item | Button | `onSelectSession(id)` | `switchSession()` | Session switched |
| Rename session | Input | `onRenameSession(id, title)` | `renameSession()` | Session renamed |
| Delete session | Button | `onDeleteSession(id)` | `deleteSession()` | Session deleted |

**Edge Cases:**
- Send empty message
- Stream interruption
- Tool execution failure
- Session switch during streaming
- Create task from incomplete suggestion

### 2.6 Settings System

#### AppSettingsDialog.tsx - Application Sections
| Section | Component | Settings |
|---------|-----------|----------|
| Appearance | `ThemeSettings.tsx` | Theme (light/dark/system), Color theme |
| Display | `DisplaySettings.tsx` | UI Scale |
| Language | `LanguageSettings.tsx` | App language, Document language |
| DevTools | `DevToolsSettings.tsx` | IDE selector, Terminal selector |
| Agent | `GeneralSettings.tsx` | Agent profile, Model config |
| Paths | `GeneralSettings.tsx` | Auto-Build source path |
| Integrations | `IntegrationSettings.tsx` | Ollama, Linear API key |
| API Profiles | `ProfileList.tsx` | OpenRouter profiles |
| Load Balancing | `LoadBalancerSettingsSection.tsx` | LB settings |
| Updates | `AdvancedSettings.tsx` | Auto-update, Check for updates |
| Notifications | `AdvancedSettings.tsx` | Notification settings |
| Debug | `DebugSettings.tsx` | Debug mode, Logs |

#### AppSettingsDialog.tsx - Project Sections
| Section | Component | Settings |
|---------|-----------|----------|
| General | `ProjectSettingsContent.tsx` | Project name, Default branch |
| Linear | `ProjectSettingsContent.tsx` | Linear workspace, Team |
| GitHub | `ProjectSettingsContent.tsx` | GitHub token, Repo |
| GitLab | `ProjectSettingsContent.tsx` | GitLab token, Project |
| Memory | `ProjectSettingsContent.tsx` | Memory settings |

| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Nav item (app) | Button | `setAppSection(section)` | - | Section switch |
| Nav item (project) | Button | `setProjectSection(section)` | - | Section switch |
| Project selector | Select | `handleProjectChange(id)` | - | Project selection |
| Re-run Wizard button | Button | `onRerunWizard()` | - | Wizard opens |
| Cancel button | Button | `handleCancel()` | `revertTheme()` | Dialog closes |
| Save button | Button | `handleSave()` | `saveSettings()` | Settings saved |

**Edge Cases:**
- Theme preview without save (revert on cancel)
- Invalid path for Auto-Build source
- API key validation failure
- Project settings without project selected

### 2.7 Roadmap System

#### Roadmap.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Generate Roadmap button | Button | `handleGenerate()` | `generateRoadmap()` | Generation starts |
| Stop Generation button | Button | `handleStop()` | - | Generation stops |
| Add Feature button | Button | `setShowAddFeatureDialog(true)` | - | Dialog opens |
| Refresh button | Button | `handleRefresh()` | `generateRoadmap()` | Regenerate |
| View Competitor Analysis | Button | `setShowCompetitorViewer(true)` | - | Viewer opens |
| Feature card click | Card | `setSelectedFeature(feature)` | - | Detail panel opens |
| Convert to Spec button | Button | `handleConvertToSpec(feature)` | `createTask()` | Task created |
| Delete Feature button | Button | `deleteFeature(id)` | - | Feature deleted |
| Tab switch | Tab | `setActiveTab(tab)` | - | Tab change |

#### CompetitorAnalysisDialog.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Accept button | Button | `onAccept()` | - | Analysis enabled |
| Decline button | Button | `onDecline()` | - | Analysis skipped |

**Edge Cases:**
- Generate roadmap without project context
- Cancel mid-generation
- Convert feature already converted
- Competitor analysis timeout

### 2.8 GitHub Integration

#### GitHubPRs.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Refresh button | Button | `handleRefresh()` | `github.getPRs()` | PRs reloaded |
| Filter dropdown | Select | Filter PRs | - | Filter applied |
| PR item click | Card | Select PR | - | PR selected |
| Start Review button | Button | `startReview(prId)` | `github.startPRReview()` | Review starts |
| Stop Review button | Button | `stopReview()` | `github.stopPRReview()` | Review stops |
| View on GitHub | Link | `openExternal(url)` | - | External URL |

#### GitHubIssues.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Refresh button | Button | `handleRefresh()` | `github.getIssues()` | Issues reloaded |
| Create Task from Issue | Button | Create task | `createTask()` | Task created |
| Open Settings | Button | `onOpenSettings()` | - | Settings opens |

**Edge Cases:**
- GitHub not authenticated
- Rate limit exceeded
- PR review with conflicts
- Issue without description

### 2.9 Project Management

#### ProjectTabBar.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Project tab click | Tab | `onProjectSelect(id)` | - | Project switched |
| Project tab close | Button | `onProjectClose(id)` | `removeProject(id)` | Project removed |
| Tab drag/reorder | DragOverlay | `reorderTabs()` | - | Tab order changed |
| Add Project button | Button | `onAddProject()` | - | Dialog opens |
| Settings button | Button | `onSettingsClick()` | - | Settings opens |

#### AddProjectModal.tsx
| Element | Type | Action | IPC Call | State Change |
|---------|------|--------|----------|--------------|
| Browse folder button | Button | `selectDirectory()` | `selectDirectory()` | Path selected |
| Path input | Input | Manual path entry | - | Local state |
| Cancel button | Button | Dialog close | - | Dialog closes |
| Add Project button | Button | `addProject(path)` | `addProject()` | Project added |

**Edge Cases:**
- Add duplicate project path
- Add non-existent path
- Initialize project in read-only folder
- Close last project tab

---

## 3. IPC System Impact Map

### Task Operations
| Operation | IPC Channel | System Impact | Reversible |
|-----------|-------------|---------------|------------|
| `createTask` | `TASK_CREATE` | Creates spec file, task.yaml | Yes (delete) |
| `deleteTask` | `TASK_DELETE` | Removes all task files | No |
| `startTask` | `TASK_START` | Spawns agent process, creates worktree | Yes (stop) |
| `stopTask` | `TASK_STOP` | Kills agent process | Yes (restart) |
| `updateTaskStatus` | `TASK_UPDATE_STATUS` | Updates task.yaml | Yes |
| `submitReview` | `TASK_REVIEW` | Updates status, may restart agent | Yes |
| `mergeWorktree` | `TASK_WORKTREE_MERGE` | Merges git changes | No |
| `discardWorktree` | `TASK_WORKTREE_DISCARD` | Deletes worktree, branch | No |
| `createWorktreePR` | `TASK_WORKTREE_CREATE_PR` | Creates GitHub PR | No (can close) |

### Terminal Operations
| Operation | IPC Channel | System Impact | Reversible |
|-----------|-------------|---------------|------------|
| `createTerminal` | `TERMINAL_CREATE` | Spawns PTY process | Yes (destroy) |
| `destroyTerminal` | `TERMINAL_DESTROY` | Kills PTY process | No |
| `sendTerminalInput` | `TERMINAL_INPUT` | Sends data to PTY | No |
| `invokeClaudeInTerminal` | `TERMINAL_INVOKE_CLAUDE` | Starts claude CLI | Yes (exit) |
| `switchClaudeProfile` | `CLAUDE_PROFILE_SWITCH` | Changes auth profile | Yes |

### Project Operations
| Operation | IPC Channel | System Impact | Reversible |
|-----------|-------------|---------------|------------|
| `addProject` | `PROJECT_ADD` | Adds to project store | Yes (remove) |
| `removeProject` | `PROJECT_REMOVE` | Removes from store | Yes (add) |
| `initializeProject` | `PROJECT_INITIALIZE` | Creates .auto-claude folder | No |

### Settings Operations
| Operation | IPC Channel | System Impact | Reversible |
|-----------|-------------|---------------|------------|
| `saveSettings` | `SETTINGS_SAVE` | Updates settings.json | Yes |
| `saveProfile` | `PROFILE_SAVE` | Updates profiles.json | Yes |

---

## 4. Edge Cases & Boundary Conditions

### 4.1 Task Lifecycle Edge Cases

| ID | Scenario | Expected Behavior | Test Type |
|----|----------|-------------------|-----------|
| T-EC-001 | Start task when another is running | Should queue or warn | Functional |
| T-EC-002 | Stop task at exact completion moment | Clean stop, proper status | Race condition |
| T-EC-003 | Delete task with active worktree | Show cleanup dialog | Functional |
| T-EC-004 | Create task with 10MB+ description | Handle gracefully | Boundary |
| T-EC-005 | Task with special chars in title | Escape properly | Edge case |
| T-EC-006 | Start task when offline | Show error, no crash | Error handling |
| T-EC-007 | Task stuck in in_progress forever | Stuck detection triggers | Timeout |
| T-EC-008 | Rapid start/stop/start sequence | Consistent state | Race condition |
| T-EC-009 | Move task to Done column, then back | Worktree state consistent | State |
| T-EC-010 | Task with 100+ subtasks | Performance acceptable | Performance |

### 4.2 Terminal Edge Cases

| ID | Scenario | Expected Behavior | Test Type |
|----|----------|-------------------|-----------|
| TE-EC-001 | Create 13th terminal (max 12) | Reject with message | Boundary |
| TE-EC-002 | Rapid terminal create/destroy | No orphan processes | Race condition |
| TE-EC-003 | Paste 1MB of text | Buffer handles gracefully | Boundary |
| TE-EC-004 | Terminal process crash | Show exit status, allow recreate | Error handling |
| TE-EC-005 | PTY resize to 1x1 | Handle minimum size | Boundary |
| TE-EC-006 | Session restore with missing history | Create fresh terminal | Error handling |
| TE-EC-007 | Claude rate limit during invoke | Show rate limit modal | Error handling |
| TE-EC-008 | Multiple file drops simultaneously | All paths inserted | Stress |
| TE-EC-009 | Drag terminal to same position | No-op, no crash | Edge case |
| TE-EC-010 | Close last terminal while Claude busy | Proper cleanup | Cleanup |

### 4.3 Settings Edge Cases

| ID | Scenario | Expected Behavior | Test Type |
|----|----------|-------------------|-----------|
| S-EC-001 | Change theme, then cancel | Revert to original | State |
| S-EC-002 | Invalid API key format | Validation error | Validation |
| S-EC-003 | Invalid Auto-Build path | Error shown | Validation |
| S-EC-004 | Save settings while loading | Queue or prevent | Race condition |
| S-EC-005 | Project settings without project | Sections disabled | State |
| S-EC-006 | UI scale at 50% (min) | Usable but small | Boundary |
| S-EC-007 | UI scale at 150% (max) | Usable but large | Boundary |
| S-EC-008 | Language change mid-session | All text updates | Functional |
| S-EC-009 | Delete last API profile | Prevent or warn | Boundary |
| S-EC-010 | Concurrent settings save | No corruption | Race condition |

### 4.4 Insights/Chat Edge Cases

| ID | Scenario | Expected Behavior | Test Type |
|----|----------|-------------------|-----------|
| I-EC-001 | Send 100KB message | Handle or truncate | Boundary |
| I-EC-002 | Send while still streaming | Queue or prevent | Race condition |
| I-EC-003 | Switch session mid-stream | Clean switch | State |
| I-EC-004 | Delete current session | Switch to other or new | State |
| I-EC-005 | 100+ sessions in history | Performance OK | Performance |
| I-EC-006 | Tool timeout during response | Show timeout error | Error handling |
| I-EC-007 | Model not available | Fallback or error | Error handling |
| I-EC-008 | Create task from partial suggestion | Validation error | Validation |
| I-EC-009 | XSS in markdown response | Sanitized output | Security |
| I-EC-010 | Rapid Enter key spam | Single message sent | Debounce |

### 4.5 Project Management Edge Cases

| ID | Scenario | Expected Behavior | Test Type |
|----|----------|-------------------|-----------|
| P-EC-001 | Add same project twice | Reject duplicate | Validation |
| P-EC-002 | Add project with 1000+ tasks | Performance OK | Performance |
| P-EC-003 | Remove project while task running | Stop task first or warn | State |
| P-EC-004 | Initialize in read-only folder | Permission error | Error handling |
| P-EC-005 | Project folder deleted externally | Graceful handling | External |
| P-EC-006 | Close all project tabs | Show welcome screen | State |
| P-EC-007 | Drag project tab off-screen | Constrain to valid area | Boundary |
| P-EC-008 | Switch project while loading | Cancel previous load | Race condition |
| P-EC-009 | Project with Unicode name | Proper display/handling | Edge case |
| P-EC-010 | 50+ projects open as tabs | Scrollable tabs | UI |

### 4.6 Roadmap Edge Cases

| ID | Scenario | Expected Behavior | Test Type |
|----|----------|-------------------|-----------|
| R-EC-001 | Generate for empty project | Minimal valid roadmap | Edge case |
| R-EC-002 | Stop generation mid-phase | Clean stop, partial data | Cleanup |
| R-EC-003 | Convert already-converted feature | Prevent or update | State |
| R-EC-004 | Delete feature during edit | Handle gracefully | Race condition |
| R-EC-005 | 100+ features in roadmap | Performance OK | Performance |
| R-EC-006 | Competitor analysis timeout | Show timeout, continue | Timeout |
| R-EC-007 | Drag feature to invalid phase | Reject with feedback | Validation |
| R-EC-008 | Save roadmap while generating | Queue or prevent | Race condition |
| R-EC-009 | Feature with empty description | Validation error | Validation |
| R-EC-010 | Refresh while competitor dialog open | Handle gracefully | State |

---

## 5. Complex User Flow Scenarios

### 5.1 Complete Task Lifecycle

```
Scenario: Full task from creation to PR merge
Steps:
1. User opens app with existing project
2. User clicks "New Task" button
3. User fills in description, adds image, selects model
4. User enables "Require plan review"
5. User clicks "Create Task"
6. User clicks task card in Backlog
7. User clicks "Start Task"
8. Task moves to AI Review (plan_review)
9. User reviews plan in modal, approves
10. Task continues execution
11. Task moves to Human Review (completed)
12. User reviews changes in worktree diff
13. User clicks "Create PR"
14. User fills PR details, submits
15. Task moves to PR Created
16. Verify PR exists on GitHub
```

**Test Assertions:**
- Task appears in correct columns at each step
- Status badge reflects current state
- Worktree exists during review
- PR URL is valid and accessible
- No orphan processes after completion

### 5.2 Multi-Terminal Parallel Development

```
Scenario: Run 4 Claude agents in parallel
Steps:
1. User opens Terminals view
2. User clicks "New Terminal" 4 times
3. Each terminal shows in grid (2x2)
4. User clicks "Invoke Claude All"
5. All 4 terminals show Claude running
6. User drags file from file explorer to terminal 1
7. File path appears in terminal 1 input
8. User expands terminal 2 to fullscreen
9. User contracts back to grid
10. User reorders terminal 3 to position 1
11. User closes terminal 4
12. Grid adjusts to 1x3 layout
```

**Test Assertions:**
- Grid layout correct at each count
- Claude invoked in all terminals
- File path correctly quoted
- Expand/contract maintains state
- Reorder persists after refresh

### 5.3 Settings Change Cascade

```
Scenario: Theme and scale change with preview
Steps:
1. User opens Settings
2. User navigates to Appearance section
3. User changes theme to dark
4. UI updates immediately (preview)
5. User changes color theme to purple
6. UI updates immediately (preview)
7. User navigates to Display section
8. User changes UI scale to 125%
9. UI scales immediately
10. User clicks Cancel
11. All changes revert to original
```

**Test Assertions:**
- Theme changes visible immediately
- Cancel reverts all changes
- No partial state on cancel
- Settings dialog reopens with original values

### 5.4 Insights-to-Task Conversion

```
Scenario: Chat conversation leads to task creation
Steps:
1. User opens Insights view
2. User asks "What features should I add?"
3. AI responds with suggestions and task card
4. User clicks "Create Task" on suggestion
5. Task appears in Kanban Backlog
6. User continues chat, gets another suggestion
7. User clicks "Create Task" again
8. Second task appears in Backlog
9. User clicks first task, starts it
10. User returns to Insights, chat preserved
```

**Test Assertions:**
- Tasks created with correct metadata
- Task IDs tracked in Insights (no duplicate create)
- Chat history preserved across view switches
- Suggested task fields match created task

### 5.5 GitHub PR Review Integration

```
Scenario: Review external PR and create linked task
Steps:
1. User has GitHub configured
2. User opens GitHub PRs view
3. PRs load from repository
4. User clicks on PR #123
5. User clicks "Start AI Review"
6. Review findings appear
7. User reviews findings
8. User navigates back to PR list
9. Review state preserved
10. User creates task from finding
```

**Test Assertions:**
- PRs load correctly
- Review persists across navigation
- Task linked to PR finding
- No duplicate reviews started

### 5.6 Project Initialization Flow

```
Scenario: First-time project setup
Steps:
1. User clicks "Add Project"
2. User selects folder without .auto-claude
3. Initialize dialog appears
4. User clicks "Initialize"
5. Progress shows
6. Initialization completes
7. GitHub setup modal appears
8. User authenticates via gh CLI
9. User selects repository
10. Project fully configured
```

**Test Assertions:**
- .auto-claude folder created
- GitHub token stored securely
- Project appears in tab bar
- Tasks can be created immediately

### 5.7 Rate Limit Recovery

```
Scenario: Handle Claude rate limit gracefully
Steps:
1. User starts task
2. Task runs until rate limit hit
3. Rate limit modal appears
4. User has multiple Claude profiles
5. User clicks "Switch Profile"
6. New profile selected
7. Task resumes automatically
8. Task completes successfully
```

**Test Assertions:**
- Rate limit detected correctly
- Profile switch works
- Task state preserved during switch
- No duplicate work after resume

### 5.8 Worktree Cleanup on Status Change

```
Scenario: Move task to Done with active worktree
Steps:
1. Task is in Human Review with worktree
2. User drags task to Done column
3. WorktreeCleanupDialog appears
4. User confirms cleanup
5. Worktree deleted
6. Branch deleted (optional)
7. Task moves to Done
8. Changes are lost
```

**Test Assertions:**
- Dialog appears before destructive action
- Cancel keeps task in Human Review
- Confirm deletes worktree
- No orphan branches

---

## 6. Test Implementation Checklist

### Phase 1: Navigation & Layout (15 tests)
- [ ] All sidebar nav items accessible
- [ ] Keyboard shortcuts work
- [ ] View switching preserves state
- [ ] Project tab bar operations
- [ ] Tab drag and reorder
- [ ] Settings dialog opens/closes
- [ ] Welcome screen shows when no project
- [ ] Theme changes apply correctly
- [ ] UI scale changes apply correctly
- [ ] Language changes apply correctly
- [ ] Responsive layout at various sizes
- [ ] Drag overlay renders correctly
- [ ] Tooltips show on hover
- [ ] Modal stacking works correctly
- [ ] Focus management between dialogs

### Phase 2: Task Management (25 tests)
- [ ] Task creation with all fields
- [ ] Task creation with images
- [ ] Task creation with file references
- [ ] Task draft persistence
- [ ] Task start/stop lifecycle
- [ ] Task status drag-and-drop
- [ ] Task detail modal tabs
- [ ] Task edit dialog
- [ ] Task delete with confirmation
- [ ] Task archive/unarchive
- [ ] Subtask display
- [ ] Task logs streaming
- [ ] Task files tab
- [ ] Task worktree status
- [ ] Task worktree diff view
- [ ] Task merge operation
- [ ] Task discard operation
- [ ] Task PR creation
- [ ] Task stuck detection
- [ ] Task recovery operation
- [ ] Task refresh operation
- [ ] Task filter by status
- [ ] Task sort order
- [ ] Kanban column counts
- [ ] Kanban empty states

### Phase 3: Terminal System (20 tests)
- [ ] Terminal creation
- [ ] Terminal destruction
- [ ] Terminal input handling
- [ ] Terminal output rendering
- [ ] Terminal resize handling
- [ ] Terminal session persistence
- [ ] Terminal session restore
- [ ] Terminal session history
- [ ] Claude invoke operation
- [ ] Claude profile switching
- [ ] Claude rate limit handling
- [ ] File explorer panel
- [ ] File drag to terminal
- [ ] Terminal expand/collapse
- [ ] Terminal reorder
- [ ] Terminal title update
- [ ] Terminal max limit
- [ ] Terminal PTY alive check
- [ ] Terminal worktree config
- [ ] Terminal grid layout

### Phase 4: Insights/Chat (15 tests)
- [ ] Session creation
- [ ] Message sending
- [ ] Streaming response
- [ ] Tool usage display
- [ ] Session switching
- [ ] Session deletion
- [ ] Session renaming
- [ ] Model selection
- [ ] Suggestion chips
- [ ] Task creation from suggestion
- [ ] Markdown rendering
- [ ] Link safety
- [ ] Error state display
- [ ] Loading indicators
- [ ] Sidebar toggle

### Phase 5: Settings (20 tests)
- [ ] App settings navigation
- [ ] Project settings navigation
- [ ] Theme settings
- [ ] Display settings
- [ ] Language settings
- [ ] DevTools settings
- [ ] Agent settings
- [ ] Paths settings
- [ ] Integration settings
- [ ] API profiles CRUD
- [ ] Load balancing settings
- [ ] Update settings
- [ ] Notification settings
- [ ] Debug settings
- [ ] Project selector
- [ ] Project general settings
- [ ] Project Linear settings
- [ ] Project GitHub settings
- [ ] Project GitLab settings
- [ ] Project memory settings

### Phase 6: Roadmap & Ideation (15 tests)
- [ ] Roadmap generation
- [ ] Roadmap stop generation
- [ ] Roadmap refresh
- [ ] Feature CRUD
- [ ] Feature detail panel
- [ ] Feature convert to task
- [ ] Feature drag reorder
- [ ] Phase tabs
- [ ] Competitor analysis dialog
- [ ] Competitor analysis viewer
- [ ] Add feature dialog
- [ ] Roadmap empty state
- [ ] Ideation view
- [ ] Ideation suggestions
- [ ] Ideation to roadmap

### Phase 7: Integrations (20 tests)
- [ ] GitHub Issues load
- [ ] GitHub Issue to task
- [ ] GitHub PRs load
- [ ] GitHub PR review start
- [ ] GitHub PR review stop
- [ ] GitHub PR findings
- [ ] GitLab Issues load
- [ ] GitLab Issue to task
- [ ] GitLab MRs load
- [ ] GitLab MR review
- [ ] Linear integration
- [ ] Linear task import
- [ ] Changelog generation
- [ ] Changelog entries
- [ ] Context tab project index
- [ ] Context tab memory
- [ ] Context tab PR review
- [ ] Worktrees list
- [ ] Worktrees cleanup
- [ ] Agent tools view

### Phase 8: Edge Cases (30 tests)
- [ ] EC: Task edge cases (10 from list)
- [ ] EC: Terminal edge cases (10 from list)
- [ ] EC: Settings edge cases (5 from list)
- [ ] EC: Insights edge cases (5 from list)

### Phase 9: Complex Flows (8 tests)
- [ ] CF: Complete task lifecycle
- [ ] CF: Multi-terminal parallel
- [ ] CF: Settings cascade
- [ ] CF: Insights to task
- [ ] CF: GitHub PR review
- [ ] CF: Project initialization
- [ ] CF: Rate limit recovery
- [ ] CF: Worktree cleanup

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Components Analyzed** | 100+ |
| **Buttons/Actions Cataloged** | 250+ |
| **IPC Channels Mapped** | 150+ |
| **Edge Cases Identified** | 60 |
| **Complex Flows Designed** | 8 |
| **Total Test Cases** | ~170 |

---

*Document Version: 1.0*
*Generated: 2026-01-17*
*Author: Barry - Quick Flow Solo Dev*
