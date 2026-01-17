# Comprehensive Button & Action Analysis for Auto-BMAD E2E Testing

## Executive Summary

This document provides a **systematic analysis** of EVERY button, action, and user interaction in the Auto-BMAD Electron application, along with their system impacts. This analysis is designed to ensure comprehensive E2E test coverage.

**Analysis Date:** January 2026
**Total Components Analyzed:** 100+
**Total Buttons/Actions Identified:** 350+
**Total IPC Channels:** 150+

---

## Table of Contents

1. [Application Architecture](#1-application-architecture)
2. [Sidebar Navigation](#2-sidebar-navigation)
3. [Project Tab Bar](#3-project-tab-bar)
4. [Kanban Board](#4-kanban-board)
5. [Terminal Grid](#5-terminal-grid)
6. [Insights Chat](#6-insights-chat)
7. [Task Creation Wizard](#7-task-creation-wizard)
8. [Task Detail Modal](#8-task-detail-modal)
9. [Settings Dialog](#9-settings-dialog)
10. [Roadmap View](#10-roadmap-view)
11. [Ideation View](#11-ideation-view)
12. [Changelog View](#12-changelog-view)
13. [GitHub/GitLab Integration](#13-githubgitlab-integration)
14. [Context View](#14-context-view)
15. [Worktrees View](#15-worktrees-view)
16. [Agent Tools View](#16-agent-tools-view)
17. [Global Dialogs & Modals](#17-global-dialogs--modals)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [IPC Channel Mapping](#19-ipc-channel-mapping)
20. [Edge Cases & Boundary Conditions](#20-edge-cases--boundary-conditions)
21. [Complex User Flow Scenarios](#21-complex-user-flow-scenarios)

---

## 1. Application Architecture

### Main Views (13 Total)
| View | Component | Route | Requires Project |
|------|-----------|-------|------------------|
| Kanban | `KanbanBoard.tsx` | Default | Yes |
| Terminals | `TerminalGrid.tsx` | `terminals` | Yes |
| Insights | `Insights.tsx` | `insights` | Yes |
| Roadmap | `Roadmap.tsx` | `roadmap` | Yes |
| Ideation | `Ideation.tsx` | `ideation` | Yes |
| Changelog | `Changelog.tsx` | `changelog` | Yes |
| Context | `Context.tsx` | `context` | Yes |
| Agent Tools | `AgentTools.tsx` | `agent-tools` | No |
| Worktrees | `Worktrees.tsx` | `worktrees` | Yes |
| GitHub Issues | `GitHubIssues.tsx` | `github-issues` | Yes + GitHub enabled |
| GitHub PRs | `GitHubPRs.tsx` | `github-prs` | Yes + GitHub enabled |
| GitLab Issues | `GitLabIssues.tsx` | `gitlab-issues` | Yes + GitLab enabled |
| GitLab MRs | `GitLabMergeRequests.tsx` | `gitlab-merge-requests` | Yes + GitLab enabled |

### Global State Stores
| Store | Purpose | Key State |
|-------|---------|-----------|
| `project-store` | Project management | `projects`, `selectedProjectId`, `activeProjectId`, `openProjectIds` |
| `task-store` | Task lifecycle | `tasks`, `selectedTask` |
| `terminal-store` | Terminal sessions | `terminals`, `activeTerminalId` |
| `settings-store` | App configuration | `settings`, `profiles`, `activeProfileId` |
| `insights-store` | Chat sessions | `session`, `sessions`, `status`, `streamingContent` |
| `claude-profile-store` | OAuth profiles | `profiles`, `activeProfileId` |

---

## 2. Sidebar Navigation

### Component: `Sidebar.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Auto BMAD Logo** | Text | None | - | Branding only |
| **Kanban Button** | Button | `onViewChange('kanban')` | `activeView = 'kanban'` | Renders KanbanBoard |
| **Terminals Button** | Button | `onViewChange('terminals')` | `activeView = 'terminals'` | Renders TerminalGrid (always mounted) |
| **Insights Button** | Button | `onViewChange('insights')` | `activeView = 'insights'` | Renders Insights, loads session |
| **Roadmap Button** | Button | `onViewChange('roadmap')` | `activeView = 'roadmap'` | Renders Roadmap |
| **Ideation Button** | Button | `onViewChange('ideation')` | `activeView = 'ideation'` | Renders Ideation |
| **Changelog Button** | Button | `onViewChange('changelog')` | `activeView = 'changelog'` | Renders Changelog |
| **Context Button** | Button | `onViewChange('context')` | `activeView = 'context'` | Renders Context |
| **Agent Tools Button** | Button | `onViewChange('agent-tools')` | `activeView = 'agent-tools'` | Renders AgentTools |
| **Worktrees Button** | Button | `onViewChange('worktrees')` | `activeView = 'worktrees'` | Renders Worktrees |
| **GitHub Issues Button** | Button | `onViewChange('github-issues')` | `activeView = 'github-issues'` | Conditional: only if GitHub enabled |
| **GitHub PRs Button** | Button | `onViewChange('github-prs')` | `activeView = 'github-prs'` | Conditional: only if GitHub enabled |
| **GitLab Issues Button** | Button | `onViewChange('gitlab-issues')` | `activeView = 'gitlab-issues'` | Conditional: only if GitLab enabled |
| **GitLab MRs Button** | Button | `onViewChange('gitlab-merge-requests')` | `activeView = 'gitlab-merge-requests'` | Conditional: only if GitLab enabled |
| **Settings Button** | Button | `onSettingsClick()` | `isSettingsDialogOpen = true` | Opens AppSettingsDialog |
| **Help Button** | Button | `window.open('github.com/issues')` | - | Opens external URL |
| **New Task Button** | Button | `onNewTaskClick()` | `isNewTaskDialogOpen = true` | Opens TaskCreationWizard |

### Edge Cases:
- Nav buttons disabled when no project selected
- New Task disabled when project not initialized
- GitHub/GitLab buttons only visible when integration enabled

---

## 3. Project Tab Bar

### Component: `ProjectTabBar.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Project Tab** | Button | `onProjectSelect(projectId)` | `setActiveProject(projectId)` | Switches active project, loads tasks |
| **Tab Close (X)** | Button | `onProjectClose(projectId)` | Shows confirmation dialog | May remove project from app |
| **Add Project (+)** | Button | `onAddProject()` | `showAddProjectModal = true` | Opens AddProjectModal |
| **Tab Drag** | DnD | `reorderTabs(oldIndex, newIndex)` | Updates tab order | Persists tab order |

### Edge Cases:
- Closing last tab shows WelcomeScreen
- Drag overlay shows project name
- Tab order persisted across sessions

---

## 4. Kanban Board

### Component: `KanbanBoard.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Refresh Button** | Button | `handleRefreshTasks()` | `loadTasks(projectId)` | Reloads tasks from disk |
| **Column Add (+)** | Button | `onNewTaskClick()` | Opens TaskCreationWizard | Only in Backlog column |
| **Archive All** | Button | `handleArchiveAll()` | `archiveTasks(projectId, taskIds)` | Archives all Done tasks |
| **Show Archived Toggle** | Button | `toggleShowArchived()` | `showArchived = !showArchived` | Filters archived tasks |
| **Task Card Click** | Click | `onTaskClick(task)` | `setSelectedTask(task)` | Opens TaskDetailModal |
| **Task Card Drag** | DnD | `handleStatusChange(taskId, newStatus)` | `persistTaskStatus(taskId, status)` | Updates task status, may trigger worktree dialog |
| **Empty Column Drop** | DnD | Same as above | Same | Same |

### Columns (6 Total):
1. **Error** - Tasks with errors
2. **Backlog** - Pending tasks
3. **In Progress** - Running tasks
4. **AI Review** - Awaiting AI review
5. **Human Review** - Awaiting human review
6. **Done** - Completed tasks (includes pr_created)

### Edge Cases:
- Drag to Done may trigger WorktreeCleanupDialog
- Force complete removes worktree
- pr_created tasks mapped to Done column
- Task card shows execution progress phase

---

## 5. Terminal Grid

### Component: `TerminalGrid.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **New Terminal** | Button | `handleAddTerminal()` | `addTerminal(projectPath)`, `createTerminal(options)` | Creates new PTY process |
| **Close Terminal (X)** | Button | `handleCloseTerminal(id)` | `destroyTerminal(id)`, `removeTerminal(id)` | Kills PTY process |
| **Invoke Claude All** | Button | `handleInvokeClaudeAll()` | `invokeClaudeInTerminal(id, cwd)` | Starts Claude in all idle terminals |
| **History Dropdown** | Dropdown | `handleRestoreFromDate(date)` | `restoreTerminalSessionsFromDate()` | Restores historical sessions |
| **Files Toggle** | Button | `toggleFileExplorer()` | `fileExplorerOpen = !fileExplorerOpen` | Shows/hides file explorer |
| **Expand Terminal** | Button | `handleToggleExpand(id)` | `expandedTerminalId = id` | Maximizes single terminal |
| **Terminal Click** | Click | `setActiveTerminal(id)` | `activeTerminalId = id` | Focuses terminal |
| **Terminal Reorder** | DnD | `reorderTerminals(activeId, overId)` | Updates terminal order | Visual reorder |
| **File Drop** | DnD | `sendTerminalInput(id, path)` | Inserts file path | Sends text to PTY |
| **Panel Resize** | Resize | - | Updates panel sizes | Visual resize |

### Terminal States:
- `running` - Active PTY
- `exited` - PTY terminated
- `isClaudeMode` - Claude session active

### Edge Cases:
- Max 12 terminals
- Exited terminals hidden from list
- Session persistence across project switches
- Ctrl+T/Cmd+T shortcut only when view active

---

## 6. Insights Chat

### Component: `Insights.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Toggle Sidebar** | Button | `setShowSidebar(!showSidebar)` | `showSidebar` toggle | Shows/hides chat history |
| **New Chat** | Button | `handleNewSession()` | `newSession(projectId)` | Creates new chat session |
| **Model Selector** | Dropdown | `handleModelConfigChange(config)` | `updateModelConfig(projectId, sessionId, config)` | Changes AI model |
| **Send Message** | Button | `handleSend()` | `sendMessage(projectId, message)` | Sends to AI, streams response |
| **Message Input** | Textarea | `setInputValue(value)` | Local state | Captures user input |
| **Suggestion Chip** | Button | `setInputValue(suggestion)` | Local state | Pre-fills input |
| **Create Task** | Button | `handleCreateTask(message)` | `createTaskFromSuggestion()` | Creates task from AI suggestion |
| **Session Select** | Button | `handleSelectSession(sessionId)` | `switchSession(projectId, sessionId)` | Switches to different session |
| **Session Delete** | Button | `handleDeleteSession(sessionId)` | `deleteSession(projectId, sessionId)` | Deletes session |
| **Session Rename** | Action | `handleRenameSession(sessionId, title)` | `renameSession(projectId, sessionId, title)` | Renames session |

### Chat States:
- `idle` - Ready for input
- `thinking` - Processing
- `streaming` - Receiving response
- `error` - Error occurred

### Edge Cases:
- Enter sends, Shift+Enter new line
- Streaming content shows tool usage
- Task created button disabled after creation

---

## 7. Task Creation Wizard

### Component: `TaskCreationWizard.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Description** | Textarea | `handleDescriptionChange(value)` | Local state + @ detection | Tracks file mentions |
| **Title** | Input | `setTitle(value)` | Local state | Optional title |
| **Profile Selector** | Dropdown | `onProfileChange()` | Local state | Sets AI profile |
| **Model Selector** | Dropdown | `onModelChange(model)` | Local state | Sets model type |
| **Thinking Level** | Dropdown | `onThinkingLevelChange(level)` | Local state | Sets thinking level |
| **Category** | Dropdown | `setCategory(value)` | Local state | Task classification |
| **Priority** | Dropdown | `setPriority(value)` | Local state | Task priority |
| **Complexity** | Dropdown | `setComplexity(value)` | Local state | Task complexity |
| **Impact** | Dropdown | `setImpact(value)` | Local state | Task impact |
| **Require Review** | Checkbox | `setRequireReviewBeforeCoding(value)` | Local state | Adds review step |
| **Image Upload** | File Input | `setImages(images)` | Local state | Attaches images |
| **Classification Toggle** | Button | `setShowClassification(!show)` | Local state | Shows/hides classification |
| **Git Options Toggle** | Button | `setShowGitOptions(!show)` | Local state | Shows/hides git options |
| **Base Branch** | Dropdown | `setBaseBranch(value)` | Local state | Sets worktree base |
| **Browse Files** | Button | `setShowFileExplorer(!show)` | Local state | Shows file explorer |
| **Discard Draft** | Button | `handleDiscardDraft()` | `clearDraft(projectId)` | Clears saved draft |
| **Cancel** | Button | `handleClose()` | `saveDraft(draft)` | Saves draft, closes |
| **Create Task** | Button | `handleCreate()` | `createTask(projectId, ...)` | Creates task file |
| **@ Autocomplete** | Popup | `handleAutocompleteSelect(file)` | Inserts @filename | File reference |
| **File Drop** | DnD | `handleFileReferenceDrop(ref, data)` | Inserts @filename | File reference |

### Edge Cases:
- Draft auto-saved to localStorage
- Draft restored on reopen
- @ mentions parsed for referenced files
- Base branch resolves PROJECT_DEFAULT_BRANCH

---

## 8. Task Detail Modal

### Component: `TaskDetailModal.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Close** | Button | `onOpenChange(false)` | `setSelectedTask(null)` | Closes modal |
| **Edit Task** | Button | Opens edit mode | Local state | Enables editing |
| **Save Edit** | Button | `updateTask(taskId, updates)` | IPC: TASK_UPDATE | Persists changes |
| **Start Task** | Button | `startTask(taskId, options)` | IPC: TASK_START | Starts agent process |
| **Stop Task** | Button | `stopTask(taskId)` | IPC: TASK_STOP | Kills agent process |
| **Approve Review** | Button | `submitReview(taskId, true)` | IPC: TASK_REVIEW | Approves and continues |
| **Request Changes** | Button | `submitReview(taskId, false, feedback)` | IPC: TASK_REVIEW | Sends feedback |
| **Delete Task** | Button | `deleteTask(taskId)` | IPC: TASK_DELETE | Removes task file |
| **View Worktree** | Button | `getWorktreeStatus(taskId)` | IPC: TASK_WORKTREE_STATUS | Shows worktree info |
| **Open in IDE** | Button | `worktreeOpenInIDE(path, ide)` | IPC: TASK_WORKTREE_OPEN_IN_IDE | Opens external IDE |
| **Merge Changes** | Button | `mergeWorktree(taskId)` | IPC: TASK_WORKTREE_MERGE | Merges to main branch |
| **Discard Changes** | Button | `discardWorktree(taskId)` | IPC: TASK_WORKTREE_DISCARD | Removes worktree |
| **Create PR** | Button | `createWorktreePR(taskId)` | IPC: TASK_WORKTREE_CREATE_PR | Creates GitHub PR |
| **Switch to Terminals** | Button | `onSwitchToTerminals()` | `activeView = 'terminals'` | Switches view |
| **Open Terminal** | Button | `onOpenInbuiltTerminal(id, cwd)` | `addTerminal(cwd)` | Opens new terminal |
| **Recover Stuck** | Button | `recoverStuckTask(taskId)` | IPC: TASK_RECOVER_STUCK | Attempts recovery |
| **View Logs** | Tab | `watchTaskLogs(projectId, specId)` | IPC: TASK_LOGS_WATCH | Streams phase logs |

### Task States:
- `backlog`, `in_progress`, `ai_review`, `human_review`, `done`, `error`, `pr_created`

### Edge Cases:
- PR button only when GitHub enabled
- Worktree actions only when worktree exists
- Logs stream in real-time

---

## 9. Settings Dialog

### Component: `AppSettingsDialog.tsx`

### App Settings Sections:
| Section | Settings | IPC/State Change |
|---------|----------|------------------|
| **Appearance** | Theme (light/dark/system), Color theme | `updateSettings()` |
| **Display** | UI Scale (50-200%) | `updateSettings()` |
| **Language** | Language selection | `updateSettings()` |
| **DevTools** | Enable DevTools, Debug mode | `updateSettings()` |
| **Agent** | Agent profiles, Model selection | `updateSettings()` |
| **Paths** | Auto-build source path | `updateSettings()` |
| **Integrations** | OAuth, API keys | `updateSettings()` |
| **API Profiles** | OpenRouter profiles | Profile CRUD |
| **Load Balancing** | Auto-switch settings | `updateAutoSwitchSettings()` |
| **Updates** | Auto-update, Check for updates | App updater |
| **Notifications** | Notification preferences | `updateSettings()` |
| **Debug** | Debug logging | `updateSettings()` |

### Project Settings Sections:
| Section | Settings | IPC/State Change |
|---------|----------|------------------|
| **General** | Project name, Main branch | `updateProjectSettings()` |
| **Linear** | Linear integration | `updateProjectEnv()` |
| **GitHub** | GitHub token, Repo | `updateProjectEnv()` |
| **GitLab** | GitLab token, Project | `updateProjectEnv()` |
| **Memory** | Memory infrastructure | `updateProjectEnv()` |

### Edge Cases:
- Theme preview applied immediately
- Theme reverted if cancelled
- Project selector enables project sections

---

## 10. Roadmap View

### Component: `Roadmap.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Generate** | Button | `handleGenerate()` | IPC: ROADMAP_GENERATE | AI generates roadmap |
| **Refresh** | Button | `handleRefresh()` | Reloads roadmap | Refreshes data |
| **Add Feature** | Button | `setShowAddFeatureDialog(true)` | Opens dialog | Adds feature manually |
| **View Competitor Analysis** | Button | `setShowCompetitorViewer(true)` | Opens viewer | Shows analysis |
| **Feature Card Click** | Click | `setSelectedFeature(feature)` | Opens detail panel | Shows feature details |
| **Convert to Spec** | Button | `handleConvertToSpec(feature)` | Creates task | Converts feature to task |
| **Go to Task** | Button | `handleGoToTask(specId)` | Navigates to Kanban | Opens task detail |
| **Delete Feature** | Button | `deleteFeature(featureId)` | Removes feature | Removes from roadmap |
| **Tab Switch** | Tabs | `setActiveTab(tab)` | Changes view | Kanban vs List view |
| **Drag Feature** | DnD | `saveRoadmap(roadmap)` | Persists order | Reorders features |

### Generation States:
- `idle`, `scanning`, `analyzing`, `generating`, `complete`, `error`

### Edge Cases:
- Competitor analysis dialog options
- Empty state with generate button
- Phase-based organization

---

## 11. Ideation View

### Component: `Ideation.tsx`

| Element | Type | Action | IPC/State Change | System Impact |
|---------|------|--------|------------------|---------------|
| **Generate** | Button | `handleGenerate()` | IPC: IDEATION_GENERATE | AI generates ideas |
| **Stop** | Button | `handleStop()` | IPC: IDEATION_STOP | Stops generation |
| **Refresh** | Button | `handleRefresh()` | Reloads session | Refreshes data |
| **Config** | Button | `setShowConfigDialog(true)` | Opens dialog | Configure idea types |
| **Add More** | Button | `setShowAddMoreDialog(true)` | Opens dialog | Generate more ideas |
| **Show Dismissed** | Toggle | `setShowDismissed(!show)` | Filters ideas | Shows/hides dismissed |
| **Select All** | Button | `handleSelectAll(ideas)` | Selects all visible | Bulk selection |
| **Clear Selection** | Button | `clearSelection()` | Deselects all | Clears selection |
| **Delete Selected** | Button | `handleDeleteSelected()` | Removes selected | Bulk delete |
| **Dismiss All** | Button | `handleDismissAll()` | Dismisses visible | Bulk dismiss |
| **Idea Card Click** | Click | `setSelectedIdea(idea)` | Opens detail panel | Shows idea details |
| **Idea Select** | Checkbox | `toggleSelectIdea(id)` | Toggles selection | Individual selection |
| **Convert to Task** | Button | `handleConvertToTask(idea)` | Creates task | Converts idea to task |
| **Go to Task** | Button | `handleGoToTask(taskId)` | Navigates to Kanban | Opens task detail |
| **Dismiss Idea** | Button | `handleDismiss(ideaId)` | Marks as dismissed | Hides from list |
| **Tab Filter** | Tabs | `setActiveTab(tab)` | Filters by type | Shows specific type |

### Idea Types:
- `feature`, `improvement`, `bug_fix`, `tech_debt`, `documentation`, `testing`

### Edge Cases:
- Token required for generation
- Streaming ideas during generation
- Type-specific filtering

---

## 12. Changelog View

### Component: `Changelog.tsx`

### Step 1: Source Selection
| Element | Type | Action | IPC/State Change |
|---------|------|--------|------------------|
| **Source Mode** | Radio | `setSourceMode(mode)` | Switches source | Tasks vs Git commits |
| **Task Selection** | Checkbox | `toggleTaskSelection(id)` | Toggles task | Selects tasks |
| **Select All Tasks** | Button | `selectAllTasks()` | Selects all | Bulk select |
| **Deselect All** | Button | `deselectAllTasks()` | Deselects all | Bulk deselect |
| **Git History Type** | Dropdown | `setGitHistoryType(type)` | Changes filter | Recent/since date/tags/version |
| **Load Commits** | Button | `handleLoadCommitsPreview()` | Loads commits | Preview commits |
| **Continue** | Button | `handleContinue()` | Advances step | Goes to step 2 |

### Step 2: Configure & Generate
| Element | Type | Action | IPC/State Change |
|---------|------|--------|------------------|
| **Version** | Input | `setVersion(value)` | Sets version | Changelog version |
| **Date** | Input | `setDate(value)` | Sets date | Changelog date |
| **Format** | Dropdown | `setFormat(format)` | Sets format | markdown/conventional |
| **Audience** | Dropdown | `setAudience(audience)` | Sets audience | developers/users/both |
| **Emoji Level** | Dropdown | `setEmojiLevel(level)` | Sets emojis | none/minimal/moderate/heavy |
| **Custom Instructions** | Textarea | `setCustomInstructions(text)` | Sets instructions | AI instructions |
| **Generate** | Button | `handleGenerate()` | IPC: CHANGELOG_GENERATE | AI generates |
| **Save** | Button | `handleSave()` | Saves to file | Persists changelog |
| **Copy** | Button | `handleCopy()` | Copies to clipboard | Clipboard copy |
| **Back** | Button | `handleBack()` | Returns to step 1 | Previous step |

### Step 3: Release & Archive
| Element | Type | Action | IPC/State Change |
|---------|------|--------|------------------|
| **Archive Tasks** | Button | `archiveTasks()` | Archives selected | Marks as archived |
| **Create Release** | Button | Creates GitHub release | IPC: GITHUB_CREATE_RELEASE | GitHub API |
| **Done** | Button | `handleDone()` | Closes flow | Returns to step 1 |

---

## 13. GitHub/GitLab Integration

### GitHub Issues (`GitHubIssues.tsx`)
| Element | Type | Action | IPC Channel |
|---------|------|--------|-------------|
| **Refresh** | Button | Reload issues | `github.getIssues()` |
| **Create Task** | Button | Convert to task | `createTask()` |
| **Open in GitHub** | Button | External link | `window.open()` |
| **Filter by Label** | Dropdown | Filter issues | Local state |
| **Filter by State** | Dropdown | Filter open/closed | Local state |

### GitHub PRs (`GitHubPRs.tsx`)
| Element | Type | Action | IPC Channel |
|---------|------|--------|-------------|
| **Refresh** | Button | Reload PRs | `github.getPullRequests()` |
| **Start Review** | Button | AI code review | `github.startReview()` |
| **View Review** | Button | Shows findings | Local state |
| **Merge PR** | Button | Merge PR | `github.mergePullRequest()` |
| **Close PR** | Button | Close PR | `github.closePullRequest()` |

### GitLab Issues (`GitLabIssues.tsx`)
Similar pattern to GitHub Issues with GitLab API calls.

### GitLab Merge Requests (`GitLabMergeRequests.tsx`)
Similar pattern to GitHub PRs with GitLab API calls.

---

## 14. Context View

### Component: `Context.tsx`

| Element | Type | Action | IPC/State Change |
|---------|------|--------|------------------|
| **Refresh Index** | Button | `refreshProjectIndex(projectId)` | Reindexes project |
| **Search** | Input | `searchMemories(projectId, query)` | Searches memories |
| **Recent Memories** | List | `getRecentMemories(projectId)` | Shows recent |
| **Memory Status** | Display | `getMemoryStatus(projectId)` | Shows status |

---

## 15. Worktrees View

### Component: `Worktrees.tsx`

| Element | Type | Action | IPC/State Change |
|---------|------|--------|------------------|
| **Refresh** | Button | `listWorktrees(projectId)` | Reloads list |
| **Create Worktree** | Button | Opens dialog | Creates new worktree |
| **Remove Worktree** | Button | `removeTerminalWorktree()` | Deletes worktree |
| **Open in IDE** | Button | `worktreeOpenInIDE()` | Opens external IDE |
| **Open Terminal** | Button | Opens terminal in worktree | Switches view |

---

## 16. Agent Tools View

### Component: `AgentTools.tsx`

| Element | Type | Action | IPC/State Change |
|---------|------|--------|------------------|
| **MCP Health Check** | Button | `checkMcpHealth(server)` | Tests MCP server |
| **Custom MCP** | Button | Opens dialog | Configure custom MCP |
| **OpenCode Status** | Display | Shows CLI status | Visual indicator |

---

## 17. Global Dialogs & Modals

| Dialog | Trigger | Actions |
|--------|---------|---------|
| **AddProjectModal** | Tab bar + button | Select directory, Create new, Import BMAD |
| **Initialize Dialog** | Project without .auto-claude | Initialize, Skip |
| **Git Setup Modal** | Non-git project | Init git, Create commit |
| **GitHub Setup Modal** | After init | Configure GitHub, Skip |
| **Remove Project Dialog** | Close tab | Remove, Cancel |
| **Worktree Cleanup Dialog** | Move to Done with worktree | Force complete, Cancel |
| **Rate Limit Modal** | Claude rate limited | Switch profile, Wait |
| **SDK Rate Limit Modal** | SDK operation limited | Retry with profile |
| **Onboarding Wizard** | First launch | Setup authentication |
| **App Update Notification** | Update available | Install, Later |
| **Env Config Modal** | Token required | Configure token |

---

## 18. Keyboard Shortcuts

### Global Shortcuts
| Key | Action | Condition |
|-----|--------|-----------|
| `K` | Switch to Kanban | Project selected |
| `A` | Switch to Terminals | Project selected |
| `N` | Switch to Insights | Project selected |
| `D` | Switch to Roadmap | Project selected |
| `I` | Switch to Ideation | Project selected |
| `L` | Switch to Changelog | Project selected |
| `C` | Switch to Context | Project selected |
| `M` | Switch to Agent Tools | Project selected |
| `W` | Switch to Worktrees | Project selected |
| `G` | Switch to GitHub Issues | GitHub enabled |
| `P` | Switch to GitHub PRs | GitHub enabled |
| `B` | Switch to GitLab Issues | GitLab enabled |
| `R` | Switch to GitLab MRs | GitLab enabled |
| `Ctrl/Cmd+T` | Add project (not on terminals) | Global |

### Terminal Shortcuts (when Terminals view active)
| Key | Action |
|-----|--------|
| `Ctrl/Cmd+T` | New terminal |
| `Ctrl/Cmd+W` | Close active terminal |

### Chat Shortcuts (Insights)
| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |

---

## 19. IPC Channel Mapping

### Project API (~25 channels)
```
PROJECT_ADD, PROJECT_REMOVE, PROJECT_LIST, PROJECT_UPDATE_SETTINGS,
PROJECT_INITIALIZE, PROJECT_CHECK_VERSION, TAB_STATE_GET, TAB_STATE_SAVE,
CONTEXT_GET, CONTEXT_REFRESH_INDEX, CONTEXT_MEMORY_STATUS,
CONTEXT_SEARCH_MEMORIES, CONTEXT_GET_MEMORIES, ENV_GET, ENV_UPDATE,
ENV_CHECK_CLAUDE_AUTH, ENV_INVOKE_CLAUDE_SETUP, DIALOG_SELECT_DIRECTORY,
DIALOG_CREATE_PROJECT_FOLDER, DIALOG_GET_DEFAULT_PROJECT_LOCATION,
MEMORY_STATUS, MEMORY_LIST_DATABASES, MEMORY_TEST_CONNECTION,
GIT_GET_BRANCHES, GIT_GET_CURRENT_BRANCH, GIT_DETECT_MAIN_BRANCH,
GIT_CHECK_STATUS, GIT_INITIALIZE, OLLAMA_* (multiple)
```

### Task API (~30 channels)
```
TASK_LIST, TASK_CREATE, TASK_DELETE, TASK_UPDATE, TASK_START, TASK_STOP,
TASK_REVIEW, TASK_UPDATE_STATUS, TASK_RECOVER_STUCK, TASK_CHECK_RUNNING,
TASK_WORKTREE_STATUS, TASK_WORKTREE_DIFF, TASK_WORKTREE_MERGE,
TASK_WORKTREE_MERGE_PREVIEW, TASK_WORKTREE_DISCARD, TASK_CLEAR_STAGED_STATE,
TASK_LIST_WORKTREES, TASK_WORKTREE_OPEN_IN_IDE, TASK_WORKTREE_OPEN_IN_TERMINAL,
TASK_WORKTREE_DETECT_TOOLS, TASK_ARCHIVE, TASK_UNARCHIVE, TASK_WORKTREE_CREATE_PR,
TASK_PROGRESS (event), TASK_ERROR (event), TASK_LOG (event),
TASK_STATUS_CHANGE (event), TASK_EXECUTION_PROGRESS (event),
TASK_LOGS_GET, TASK_LOGS_WATCH, TASK_LOGS_UNWATCH,
TASK_LOGS_CHANGED (event), TASK_LOGS_STREAM (event)
```

### Terminal API (~40 channels)
```
TERMINAL_CREATE, TERMINAL_DESTROY, TERMINAL_INPUT, TERMINAL_RESIZE,
TERMINAL_INVOKE_CLAUDE, TERMINAL_GENERATE_NAME, TERMINAL_SET_TITLE,
TERMINAL_SET_WORKTREE_CONFIG, TERMINAL_GET_SESSIONS, TERMINAL_RESTORE_SESSION,
TERMINAL_CLEAR_SESSIONS, TERMINAL_RESUME_CLAUDE, TERMINAL_ACTIVATE_DEFERRED_RESUME,
TERMINAL_GET_SESSION_DATES, TERMINAL_GET_SESSIONS_FOR_DATE,
TERMINAL_RESTORE_FROM_DATE, TERMINAL_CHECK_PTY_ALIVE,
TERMINAL_WORKTREE_CREATE, TERMINAL_WORKTREE_LIST, TERMINAL_WORKTREE_REMOVE,
TERMINAL_OUTPUT (event), TERMINAL_EXIT (event), TERMINAL_TITLE_CHANGE (event),
TERMINAL_WORKTREE_CONFIG_CHANGE (event), TERMINAL_CLAUDE_SESSION (event),
TERMINAL_RATE_LIMIT (event), TERMINAL_OAUTH_TOKEN (event),
TERMINAL_AUTH_CREATED (event), TERMINAL_CLAUDE_BUSY (event),
TERMINAL_CLAUDE_EXIT (event), TERMINAL_PENDING_RESUME (event),
CLAUDE_PROFILES_GET, CLAUDE_PROFILE_SAVE, CLAUDE_PROFILE_DELETE,
CLAUDE_PROFILE_RENAME, CLAUDE_PROFILE_SET_ACTIVE, CLAUDE_PROFILE_SWITCH,
CLAUDE_PROFILE_INITIALIZE, CLAUDE_PROFILE_SET_TOKEN,
CLAUDE_PROFILE_AUTO_SWITCH_SETTINGS, CLAUDE_PROFILE_UPDATE_AUTO_SWITCH,
CLAUDE_PROFILE_FETCH_USAGE, CLAUDE_PROFILE_GET_BEST_PROFILE,
CLAUDE_SDK_RATE_LIMIT (event), CLAUDE_RETRY_WITH_PROFILE,
USAGE_REQUEST, USAGE_UPDATED (event), PROACTIVE_SWAP_NOTIFICATION (event)
```

### Other APIs
- **Insights API**: Session CRUD, message sending, streaming
- **Ideation API**: Generation, filtering, conversion
- **Roadmap API**: Generation, features, competitor analysis
- **Changelog API**: Generation, git operations
- **GitHub API**: Issues, PRs, releases, reviews
- **GitLab API**: Issues, MRs, projects
- **BMAD API**: Workflows, status, artifacts
- **Settings API**: App settings, profiles
- **File API**: File operations
- **Agent API**: Agent process management

---

## 20. Edge Cases & Boundary Conditions

### Project Management
1. Add project with invalid path
2. Add project without _bmad directory
3. Remove last open project (shows WelcomeScreen)
4. Switch project while task running
5. Initialize project without auto-build path configured
6. Project with corrupted settings file

### Task Lifecycle
1. Create task with empty description
2. Create task with very long description (>10000 chars)
3. Start task when another task is running
4. Stop task that's already stopped
5. Move task to Done when worktree has uncommitted changes
6. Delete task while it's running
7. Submit review with very long feedback
8. Recover task that's not actually stuck
9. Archive all tasks when none exist
10. Task status update race condition

### Terminal Management
1. Create 13th terminal (max is 12)
2. Close terminal while Claude is running
3. Restore sessions from deleted date
4. Terminal input with special characters
5. Resize terminal to 0x0
6. File drop on non-existent terminal
7. Invoke Claude in exited terminal
8. Session persistence with large scrollback

### Insights Chat
1. Send empty message
2. Send while AI is thinking
3. Delete active session
4. Switch session while streaming
5. Create task from suggestion twice
6. Very long message (>100000 chars)
7. Session with corrupted history

### Settings
1. Save settings while another save in progress
2. Cancel settings with unsaved theme
3. Invalid API key format
4. Missing required path
5. Language change without restart

### Drag & Drop
1. Drop on same position
2. Drop outside valid area
3. Rapid sequential drags
4. Drag during loading state

### Concurrent Operations
1. Multiple views updating same task
2. Terminal output during view switch
3. Settings save during task start
4. Session switch during message send

---

## 21. Complex User Flow Scenarios

### Flow 1: Complete Task Lifecycle
1. Open project
2. Create task with classification
3. Start task execution
4. Monitor progress in task detail
5. View logs during execution
6. Handle AI review phase
7. Complete human review
8. Merge worktree changes
9. Create PR
10. Archive completed task

### Flow 2: Multi-Terminal Development
1. Open terminals view
2. Create 3 terminals
3. Reorder terminals via drag
4. Invoke Claude in all terminals
5. Monitor rate limits
6. Handle proactive profile swap
7. Restore from history
8. Close all terminals

### Flow 3: Project Setup Journey
1. Add new project via modal
2. Handle initialization dialog
3. Configure GitHub integration
4. Set up memory infrastructure
5. Configure API profiles
6. Create first task

### Flow 4: AI-Powered Planning
1. Generate roadmap
2. Run competitor analysis
3. Add features to roadmap
4. Convert features to tasks
5. Generate ideas
6. Convert ideas to tasks
7. Generate changelog
8. Archive completed work

### Flow 5: Cross-View Workflow
1. Create task in Kanban
2. Switch to Terminals, start task
3. Switch to Insights, ask about task
4. Return to Kanban, check status
5. Open task detail, view logs
6. Switch to Worktrees, manage branches
7. Return to Kanban, complete task

### Flow 6: Settings Configuration
1. Open settings
2. Configure appearance
3. Set up API profiles
4. Configure load balancing
5. Set project-specific settings
6. Test GitHub connection
7. Save and verify persistence

### Flow 7: Error Recovery
1. Create task that fails
2. View error in task detail
3. Recover stuck task
4. Retry with different settings
5. Handle rate limit
6. Switch profile and continue

### Flow 8: State Persistence
1. Configure multiple projects
2. Open multiple tabs
3. Reorder tabs
4. Create terminals in each project
5. Close and reopen app
6. Verify all state restored

---

## Test Implementation Priority

### Priority 1: Critical Paths
- Task lifecycle (create, execute, review, complete)
- Terminal operations (create, input, close)
- Project management (add, switch, remove)
- Settings persistence

### Priority 2: Core Features
- Insights chat flow
- Roadmap generation
- Ideation generation
- Changelog generation

### Priority 3: Integration Features
- GitHub/GitLab operations
- Worktree management
- Memory infrastructure

### Priority 4: Edge Cases
- Error handling
- Rate limiting
- Concurrent operations
- State recovery

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Components | 100+ |
| Buttons/Actions | 350+ |
| IPC Channels | 150+ |
| Edge Cases | 60+ |
| User Flows | 8 |
| Keyboard Shortcuts | 16 |
| Global Dialogs | 12 |
| API Modules | 16 |
