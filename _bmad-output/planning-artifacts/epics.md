---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - prd.md
  - architecture.md
  - product-brief-auto-bmad.md
workflowType: 'epics-and-stories'
project_name: Auto-BMAD
user_name: Hafiz
date: 2026-01-16
status: complete
---

# Auto-BMAD - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Auto-BMAD, decomposing the requirements from the PRD and Architecture documents into implementable stories.

---

## Requirements Inventory

### Functional Requirements

**Core Application (FR1-FR5):**
- FR1: User can create a new project with name and type (greenfield/brownfield)
- FR2: User can select an existing project folder to import
- FR3: User can view all projects in a project list
- FR4: User can delete a project from Auto-BMAD
- FR5: User can configure project settings (OpenCode path, output folders)

**Phase Management (FR6-FR10):**
- FR6: User can view current phase progress (1-4) in a visual dashboard
- FR7: User can see which phases are complete, in-progress, or pending
- FR8: User can navigate between phases via dashboard
- FR9: System prevents skipping to later phases without completing prerequisites
- FR10: User can reset a phase to redo it

**Workflow Execution (FR11-FR16):**
- FR11: User can start any available BMAD workflow from the UI
- FR12: User can view list of all available workflows with descriptions
- FR13: System executes workflows via OpenCode with correct agent
- FR14: User can see real-time workflow execution in terminal
- FR15: User can cancel a running workflow
- FR16: System tracks workflow completion in status file

**Agent Roster (FR17-FR20):**
- FR17: User can view all 11 BMAD agents with their personas
- FR18: User can see which agent is active for current workflow
- FR19: User can read agent's communication style and principles
- FR20: User can filter agents by module (bmm, cis, core)

**Artifact Management (FR21-FR25):**
- FR21: User can view generated artifacts (PRD, Architecture, Epics)
- FR22: User can read artifact content in formatted markdown
- FR23: User can see artifact metadata (created, modified dates)
- FR24: User can export artifacts to external files
- FR25: User can edit artifacts within the application

**Terminal Integration (FR26-FR30):**
- FR26: User can view embedded terminal for workflow execution
- FR27: User can interact with terminal during workflows
- FR28: User can resize terminal panel
- FR29: System preserves terminal history across sessions
- FR30: User can clear terminal output

**Interactive Mode (FR31-FR35):**
- FR31: User can start Interactive Mode session
- FR32: User can chat with AI agents about the project
- FR33: User can run workflows via slash commands in chat
- FR34: User can ask specific agents questions via @mention
- FR35: System maintains conversation history

**Status Tracking (FR36-FR40):**
- FR36: System persists workflow status to bmm-workflow-status.yaml
- FR37: User can view detailed status of each phase
- FR38: User can see next recommended workflow
- FR39: System resumes from last state on restart
- FR40: User can view completion timestamps

**Gate Checks (FR41-FR44):**
- FR41: System runs gate check before Phase 4 (implementation-readiness)
- FR42: User can view gate check results
- FR43: System prevents Phase 4 if gate check fails
- FR44: User can override gate check with explicit confirmation

**File Explorer (FR45-FR48):**
- FR45: User can browse project files in tree view
- FR46: User can open files in external editor
- FR47: User can see file status (modified, new)
- FR48: System highlights _bmad-output folder

### Non-Functional Requirements

**Performance (NFR1-5):**
- NFR1: Application launches in under 5 seconds
- NFR2: Workflow list loads in under 1 second
- NFR3: Terminal output streams with no visible lag
- NFR4: UI remains responsive during workflow execution
- NFR5: Artifact rendering completes in under 2 seconds

**Usability (NFR6-10):**
- NFR6: New user can start first workflow within 5 minutes
- NFR7: Phase progress is visible at all times
- NFR8: Error messages include actionable guidance
- NFR9: Keyboard shortcuts available for common actions
- NFR10: UI follows platform conventions (macOS, Windows, Linux)

**Reliability (NFR11-15):**
- NFR11: Application handles OpenCode unavailability gracefully
- NFR12: Status file corruption triggers automatic recovery
- NFR13: Workflow execution can be resumed after crash
- NFR14: No data loss on unexpected termination
- NFR15: Artifact saves are atomic (no partial writes)

**Compatibility (NFR16-19):**
- NFR16: Runs on macOS 12+, Windows 10+, Ubuntu 20.04+
- NFR17: Works with OpenCode 0.1.x+
- NFR18: Supports BMAD 6.x methodology
- NFR19: Compatible with existing _bmad directories

**Security (NFR20-23):**
- NFR20: No sensitive data sent to external servers
- NFR21: API keys stored in system keychain
- NFR22: Project files accessed only with user permission
- NFR23: No telemetry without explicit opt-in

**Accessibility (NFR24-27):**
- NFR24: Supports keyboard-only navigation
- NFR25: Screen reader compatible (ARIA labels)
- NFR26: Meets WCAG 2.1 AA standards
- NFR27: Supports system dark/light mode

### Additional Requirements

**From Architecture:**
- Must fork from Auto-Claude apps/frontend/
- Must integrate with OpenCode CLI for agent execution
- Must use Zustand for state management with YAML sync
- Must follow feature-based architecture pattern
- Must use IPC for all main process communication
- Terminal via xterm.js + node-pty integration

**From Technical Constraints:**
- Electron 39.x for desktop framework
- React 19.x for UI
- TypeScript 5.9.x strict mode
- Tailwind CSS 4.x for styling

---

## FR Coverage Map

| FR | Epic | Story | Description |
|----|------|-------|-------------|
| FR1 | Epic 2 | 2.1 | Create new project |
| FR2 | Epic 2 | 2.2 | Import existing project |
| FR3 | Epic 2 | 2.3 | View project list |
| FR4 | Epic 2 | 2.4 | Delete project |
| FR5 | Epic 2 | 2.5 | Configure settings |
| FR6 | Epic 3 | 3.1 | Phase dashboard view |
| FR7 | Epic 3 | 3.2 | Phase status indicators |
| FR8 | Epic 3 | 3.3 | Phase navigation |
| FR9 | Epic 3 | 3.4 | Phase prerequisites |
| FR10 | Epic 3 | 3.5 | Phase reset |
| FR11 | Epic 4 | 4.1 | Start workflow |
| FR12 | Epic 4 | 4.2 | Workflow list |
| FR13 | Epic 4 | 4.3 | OpenCode execution |
| FR14 | Epic 4 | 4.4 | Terminal output |
| FR15 | Epic 4 | 4.5 | Cancel workflow |
| FR16 | Epic 4 | 4.6 | Status tracking |
| FR17 | Epic 5 | 5.1 | Agent roster view |
| FR18 | Epic 5 | 5.2 | Active agent indicator |
| FR19 | Epic 5 | 5.3 | Agent details |
| FR20 | Epic 5 | 5.4 | Agent filtering |
| FR21 | Epic 6 | 6.1 | Artifact list |
| FR22 | Epic 6 | 6.2 | Markdown preview |
| FR23 | Epic 6 | 6.3 | Artifact metadata |
| FR24 | Epic 6 | 6.4 | Export artifacts |
| FR25 | Epic 6 | 6.5 | Edit artifacts |
| FR26 | Epic 1 | 1.3 | Terminal component |
| FR27 | Epic 1 | 1.3 | Terminal interaction |
| FR28 | Epic 1 | 1.4 | Terminal resize |
| FR29 | Epic 1 | 1.4 | Terminal history |
| FR30 | Epic 1 | 1.4 | Clear terminal |
| FR31 | Epic 7 | 7.1 | Interactive session |
| FR32 | Epic 7 | 7.2 | Agent chat |
| FR33 | Epic 7 | 7.3 | Slash commands |
| FR34 | Epic 7 | 7.4 | Agent mentions |
| FR35 | Epic 7 | 7.5 | Chat history |
| FR36 | Epic 1 | 1.2 | Status persistence |
| FR37 | Epic 3 | 3.2 | Phase status detail |
| FR38 | Epic 3 | 3.6 | Recommended workflow |
| FR39 | Epic 1 | 1.2 | State resume |
| FR40 | Epic 3 | 3.2 | Timestamps |
| FR41 | Epic 8 | 8.1 | Gate check execution |
| FR42 | Epic 8 | 8.2 | Gate check results |
| FR43 | Epic 8 | 8.3 | Phase blocking |
| FR44 | Epic 8 | 8.4 | Override confirmation |
| FR45 | Epic 2 | 2.6 | File tree view |
| FR46 | Epic 2 | 2.6 | Open in editor |
| FR47 | Epic 2 | 2.6 | File status |
| FR48 | Epic 2 | 2.6 | Highlight _bmad-output |

---

## Epic List

### Epic 1: Project Foundation & Core Infrastructure
Set up the Auto-BMAD application foundation by forking Auto-Claude and establishing core BMAD infrastructure.
**FRs covered:** FR26, FR27, FR28, FR29, FR30, FR36, FR39

### Epic 2: Project Management
Enable users to create, import, configure, and manage BMAD projects.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR45, FR46, FR47, FR48

### Epic 3: Phase Dashboard & Navigation
Provide visual phase tracking and navigation through the 4-phase BMAD methodology.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR37, FR38, FR40

### Epic 4: Workflow Execution
Enable users to start, monitor, and manage BMAD workflow execution via OpenCode.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16

### Epic 5: Agent Roster
Display BMAD agents with their personas and track active agents during workflows.
**FRs covered:** FR17, FR18, FR19, FR20

### Epic 6: Artifact Management
Enable viewing, reading, editing, and exporting generated BMAD artifacts.
**FRs covered:** FR21, FR22, FR23, FR24, FR25

### Epic 7: Interactive Mode (P1)
Provide chat-based interaction with BMAD agents for project discussions.
**FRs covered:** FR31, FR32, FR33, FR34, FR35

### Epic 8: Gate Checks (P1)
Implement implementation-readiness validation before Phase 4.
**FRs covered:** FR41, FR42, FR43, FR44

---

## Epic 1: Project Foundation & Core Infrastructure

Set up the Auto-BMAD application foundation by forking Auto-Claude and establishing core BMAD infrastructure. This epic delivers the essential runtime environment that all other features depend on.

### Story 1.1: Fork Auto-Claude and Initialize Auto-BMAD

As a developer,
I want to create Auto-BMAD from the Auto-Claude codebase,
So that I have a working Electron application foundation to build upon.

**Acceptance Criteria:**

**Given** the Auto-Claude repository exists at apps/frontend/
**When** I copy the frontend to apps/auto-bmad/
**Then** the new directory contains all source files

**And** package.json is updated with:
- name: "auto-bmad"
- description: "Desktop UI for BMAD methodology"

**And** the application builds successfully with `npm run build`

**And** the application starts with `npm run dev`

**And** unused Auto-Claude features are removed:
- src/renderer/features/roadmap/
- src/renderer/features/changelog/
- src/renderer/features/insights/

---

### Story 1.2: Create BMAD Main Process Infrastructure

As a developer,
I want main process modules for BMAD operations,
So that the renderer can interact with BMAD files and OpenCode.

**Acceptance Criteria:**

**Given** the Auto-BMAD application is initialized
**When** I create src/main/bmad/ directory
**Then** it contains the following modules:

**And** config-loader.ts exists and can:
- Load _bmad/bmm/config.yaml
- Parse YAML with proper error handling
- Return typed configuration object

**And** status-manager.ts exists and can:
- Read bmm-workflow-status.yaml
- Write bmm-workflow-status.yaml with atomic saves
- Watch for external changes to status file

**And** IPC handlers are registered for:
- 'bmad:get-config'
- 'bmad:get-status'
- 'bmad:update-status'

---

### Story 1.3: Adapt Terminal Component for Workflow Execution

As a user,
I want an embedded terminal that displays workflow execution,
So that I can see real-time output from BMAD agents.

**Acceptance Criteria:**

**Given** the terminal feature from Auto-Claude exists
**When** I adapt it for BMAD workflow execution
**Then** the Terminal component renders with xterm.js

**And** the terminal connects to PTY via main process

**And** the terminal displays all output from child processes

**And** the terminal supports user input when workflows prompt

**And** FR26-FR27 are satisfied

---

### Story 1.4: Add Terminal Panel Management

As a user,
I want to resize, clear, and persist terminal history,
So that I can manage the terminal view effectively.

**Acceptance Criteria:**

**Given** the terminal component is working
**When** I interact with the terminal panel
**Then** I can resize the terminal using drag handles

**And** I can clear terminal output with a button click

**And** terminal history persists across sessions via electron-store

**And** FR28-FR30 are satisfied

---

### Story 1.5: Create Preload API for BMAD Operations

As a developer,
I want a typed preload API for BMAD operations,
So that renderer components can safely access main process functionality.

**Acceptance Criteria:**

**Given** the main process handlers exist
**When** I create src/preload/api/bmad-api.ts
**Then** it exposes typed methods for:
- config.get()
- status.get()
- status.update(status)

**And** the API is exposed via contextBridge

**And** TypeScript types are properly exported

**And** the renderer can access window.api.bmad

---

## Epic 2: Project Management

Enable users to create, import, configure, and manage BMAD projects. This epic provides the foundation for working with BMAD projects.

### Story 2.1: Create New Project Flow

As a user,
I want to create a new BMAD project,
So that I can start planning a new application.

**Acceptance Criteria:**

**Given** I am on the project selection screen
**When** I click "New Project"
**Then** a dialog opens with:
- Project name input
- Project type selector (greenfield/brownfield)
- Project folder picker

**And** when I complete the form and click Create
**Then** a new project folder is created (if needed)
**And** _bmad-output/planning-artifacts/ directory is created
**And** bmm-workflow-status.yaml is initialized
**And** the project is added to recent projects

**And** FR1 is satisfied

---

### Story 2.2: Import Existing Project

As a user,
I want to import an existing project folder,
So that I can continue work on a project with existing BMAD artifacts.

**Acceptance Criteria:**

**Given** I am on the project selection screen
**When** I click "Import Project"
**Then** a folder picker dialog opens

**And** when I select a folder with _bmad/ directory
**Then** the project is validated (has required BMAD files)
**And** bmm-workflow-status.yaml is read if it exists
**And** the project is added to recent projects

**And** if I select a folder without _bmad/
**Then** an error message explains the requirements

**And** FR2 is satisfied

---

### Story 2.3: View Project List

As a user,
I want to see all my BMAD projects,
So that I can quickly switch between projects.

**Acceptance Criteria:**

**Given** I have created or imported projects
**When** I view the project list
**Then** I see all projects with:
- Project name
- Last opened date
- Current phase indicator
- Project path

**And** projects are sorted by last opened (most recent first)

**And** I can click a project to open it

**And** FR3 is satisfied

---

### Story 2.4: Delete Project from Auto-BMAD

As a user,
I want to remove a project from Auto-BMAD,
So that I can clean up my project list.

**Acceptance Criteria:**

**Given** I am viewing the project list
**When** I click delete on a project
**Then** a confirmation dialog appears

**And** the dialog offers:
- Remove from Auto-BMAD only (keep files)
- Delete project files completely (dangerous)

**And** after confirmation, the project is removed from the list

**And** if "keep files" was selected, the files remain on disk

**And** FR4 is satisfied

---

### Story 2.5: Configure Project Settings

As a user,
I want to configure project settings,
So that I can customize paths and preferences.

**Acceptance Criteria:**

**Given** I have a project open
**When** I access project settings
**Then** I can configure:
- OpenCode CLI path
- Output folder location
- Communication language

**And** settings are persisted to _bmad/bmm/config.yaml

**And** changes take effect immediately

**And** FR5 is satisfied

---

### Story 2.6: Browse Project Files

As a user,
I want to browse my project files,
So that I can navigate to specific files and artifacts.

**Acceptance Criteria:**

**Given** I have a project open
**When** I view the file explorer panel
**Then** I see a tree view of project files

**And** the _bmad-output/ folder is highlighted/emphasized

**And** I can expand/collapse directories

**And** I can double-click a file to open in external editor

**And** files show modification status (modified, new) via git

**And** FR45-FR48 are satisfied

---

## Epic 3: Phase Dashboard & Navigation

Provide visual phase tracking and navigation through the 4-phase BMAD methodology. Users can see their progress and move between phases.

### Story 3.1: Create Phase Dashboard Component

As a user,
I want to see a visual dashboard of BMAD phases,
So that I understand where I am in the methodology.

**Acceptance Criteria:**

**Given** I have a project open
**When** I view the Phase Dashboard
**Then** I see 4 phases displayed:
1. Analysis
2. Planning
3. Solutioning
4. Implementation

**And** each phase shows its name and icon

**And** the current phase is visually highlighted

**And** FR6 is satisfied

---

### Story 3.2: Display Phase Status Indicators

As a user,
I want to see the status of each phase,
So that I know what's complete and what's pending.

**Acceptance Criteria:**

**Given** I am viewing the Phase Dashboard
**When** I look at each phase card
**Then** I see a status indicator:
- Complete (green checkmark)
- In Progress (blue spinner)
- Pending (gray circle)
- Blocked (red lock)

**And** I see workflow completion counts (e.g., "2/3 workflows complete")

**And** I see the completion timestamp for finished phases

**And** FR7, FR37, FR40 are satisfied

---

### Story 3.3: Enable Phase Navigation

As a user,
I want to click on phases to navigate,
So that I can view details of any phase.

**Acceptance Criteria:**

**Given** I am viewing the Phase Dashboard
**When** I click on a phase card
**Then** the view expands to show:
- Phase description
- Workflows in this phase
- Workflow statuses
- Generated artifacts

**And** I can click back to return to dashboard overview

**And** FR8 is satisfied

---

### Story 3.4: Enforce Phase Prerequisites

As a user,
I want the system to prevent skipping phases,
So that I follow the BMAD methodology correctly.

**Acceptance Criteria:**

**Given** I am on Phase 1 (Analysis)
**When** I try to start a Phase 3 workflow
**Then** the system shows a warning

**And** the warning explains which prerequisites are missing

**And** I cannot proceed until prerequisites are met

**But** Phase 1 can be skipped (it's optional per BMAD)

**And** FR9 is satisfied

---

### Story 3.5: Allow Phase Reset

As a user,
I want to reset a phase,
So that I can redo planning if requirements changed.

**Acceptance Criteria:**

**Given** I have completed Phase 2 (Planning)
**When** I click "Reset Phase" on Phase 2
**Then** a confirmation dialog warns about implications

**And** the dialog explains:
- "This will mark Phase 2 workflows as incomplete"
- "Artifacts will not be deleted"
- "You'll need to re-run workflows"

**And** after confirmation:
- Phase 2 status resets to "pending"
- Subsequent phases also reset
- Artifacts remain in _bmad-output/

**And** FR10 is satisfied

---

### Story 3.6: Show Recommended Next Workflow

As a user,
I want to see the recommended next workflow,
So that I know what to do next.

**Acceptance Criteria:**

**Given** I have completed some workflows
**When** I view the Phase Dashboard
**Then** I see a "Next: [workflow name]" indicator

**And** the recommendation follows BMAD methodology order

**And** clicking the recommendation navigates to workflow view

**And** FR38 is satisfied

---

## Epic 4: Workflow Execution

Enable users to start, monitor, and manage BMAD workflow execution via OpenCode. This is the core functionality for running BMAD agents.

### Story 4.1: Start Workflow from UI

As a user,
I want to start a BMAD workflow,
So that I can generate planning artifacts.

**Acceptance Criteria:**

**Given** I am viewing a workflow in the workflow list
**When** I click "Start Workflow"
**Then** the workflow runner panel opens

**And** the correct OpenCode agent is identified

**And** the terminal shows the workflow starting

**And** I see the agent persona activate

**And** FR11 is satisfied

---

### Story 4.2: Display Workflow List

As a user,
I want to see all available BMAD workflows,
So that I can choose which to run.

**Acceptance Criteria:**

**Given** I am on the workflow view
**When** the workflow list loads
**Then** I see workflows organized by phase:

Phase 1 (Analysis):
- Brainstorm Project
- Research
- Create Product Brief

Phase 2 (Planning):
- Create PRD
- Create UX Design

Phase 3 (Solutioning):
- Create Architecture
- Create Epics & Stories
- Implementation Readiness

Phase 4 (Implementation):
- Sprint Planning
- Create Story
- Dev Story
- Code Review

**And** each workflow shows:
- Name and description
- Required agent
- Status (available/completed/blocked)

**And** FR12 is satisfied

---

### Story 4.3: Execute Workflow via OpenCode

As a user,
I want workflows to execute via OpenCode,
So that the correct AI agent processes my request.

**Acceptance Criteria:**

**Given** I start a workflow
**When** the system executes
**Then** it spawns OpenCode with correct agent:
`opencode --agent [agent-id] run`

**And** the agent receives the workflow prompt

**And** output streams to the terminal in real-time

**And** the process runs in the project directory

**And** environment variables are passed correctly

**And** FR13 is satisfied

---

### Story 4.4: Stream Terminal Output

As a user,
I want to see real-time workflow output,
So that I can follow along with the agent's progress.

**Acceptance Criteria:**

**Given** a workflow is running
**When** the agent produces output
**Then** it appears in the terminal immediately

**And** colors and formatting are preserved (ANSI codes)

**And** the terminal auto-scrolls to show new content

**And** long-running operations show progress

**And** FR14 is satisfied

---

### Story 4.5: Cancel Running Workflow

As a user,
I want to cancel a running workflow,
So that I can stop if something goes wrong.

**Acceptance Criteria:**

**Given** a workflow is running
**When** I click "Cancel Workflow"
**Then** a confirmation dialog appears

**And** after confirmation:
- The OpenCode process is terminated
- Terminal shows "Workflow cancelled"
- Partial artifacts may remain

**And** the workflow can be restarted

**And** FR15 is satisfied

---

### Story 4.6: Track Workflow Completion

As a user,
I want workflow completions tracked automatically,
So that I know what's done.

**Acceptance Criteria:**

**Given** a workflow completes successfully
**When** the agent finishes
**Then** the system:
- Detects successful completion
- Updates bmm-workflow-status.yaml
- Records completion timestamp
- Records artifact path (if generated)

**And** the Phase Dashboard updates to reflect completion

**And** FR16 is satisfied

---

## Epic 5: Agent Roster

Display BMAD agents with their personas and track active agents during workflows. Users can understand which agent does what.

### Story 5.1: Display Agent Roster

As a user,
I want to see all BMAD agents,
So that I understand the team of AI personas.

**Acceptance Criteria:**

**Given** I navigate to the Agent Roster view
**When** the roster loads
**Then** I see all 11 BMAD agents:

| ID | Name | Role |
|----|------|------|
| pm | John | Product Manager |
| architect | Winston | Architect |
| analyst | Mary | Business Analyst |
| ux-designer | Sally | UX Designer |
| sm | Bob | Scrum Master |
| dev | Amelia | Developer |
| tea | Murat | Test Architect |

**And** each agent shows an avatar/icon

**And** FR17 is satisfied

---

### Story 5.2: Show Active Agent Indicator

As a user,
I want to see which agent is currently active,
So that I know who's working on my project.

**Acceptance Criteria:**

**Given** a workflow is running
**When** I view the Agent Roster
**Then** the active agent is highlighted

**And** a badge shows "Active" on their card

**And** when the workflow ends, the indicator clears

**And** FR18 is satisfied

---

### Story 5.3: Display Agent Details

As a user,
I want to read agent details,
So that I understand their expertise and style.

**Acceptance Criteria:**

**Given** I click on an agent card
**When** the details panel opens
**Then** I see:
- Agent name and title
- Role description
- Communication style
- Principles/expertise areas
- Associated workflows

**And** I can close the panel to return to roster

**And** FR19 is satisfied

---

### Story 5.4: Filter Agents by Module

As a user,
I want to filter agents by module,
So that I can find agents quickly.

**Acceptance Criteria:**

**Given** I am viewing the Agent Roster
**When** I use the filter dropdown
**Then** I can filter by:
- BMM (main methodology agents)
- CIS (creative innovation system)
- Core (utility agents)
- All (default)

**And** the roster updates to show only matching agents

**And** FR20 is satisfied

---

## Epic 6: Artifact Management

Enable viewing, reading, editing, and exporting generated BMAD artifacts. Users can work with their generated documents.

### Story 6.1: Display Artifact List

As a user,
I want to see all generated artifacts,
So that I can access my planning documents.

**Acceptance Criteria:**

**Given** I navigate to Artifacts view
**When** artifacts exist in _bmad-output/
**Then** I see a list including:
- product-brief.md
- prd.md
- architecture.md
- epics.md
- ux-design.md (if exists)

**And** each item shows:
- File name
- Type/category
- Last modified date
- File size

**And** I can click to open an artifact

**And** FR21 is satisfied

---

### Story 6.2: Render Markdown Preview

As a user,
I want to read artifacts with proper formatting,
So that the content is easy to understand.

**Acceptance Criteria:**

**Given** I open an artifact
**When** the preview renders
**Then** markdown is properly formatted:
- Headings with hierarchy
- Code blocks with syntax highlighting
- Tables render correctly
- Lists are indented properly
- Links are clickable

**And** the preview scrolls smoothly

**And** FR22 is satisfied

---

### Story 6.3: Show Artifact Metadata

As a user,
I want to see artifact metadata,
So that I know when documents were created/modified.

**Acceptance Criteria:**

**Given** I am viewing an artifact
**When** I look at the header
**Then** I see:
- Created date (from file or frontmatter)
- Last modified date
- Workflow that generated it
- Related phase

**And** the metadata is always visible while viewing

**And** FR23 is satisfied

---

### Story 6.4: Export Artifacts

As a user,
I want to export artifacts to other locations,
So that I can share planning documents.

**Acceptance Criteria:**

**Given** I am viewing an artifact
**When** I click "Export"
**Then** I can choose:
- Save copy to another location
- Export as PDF (if feasible)
- Copy to clipboard (markdown)

**And** the exported file maintains formatting

**And** FR24 is satisfied

---

### Story 6.5: Edit Artifacts

As a user,
I want to edit artifacts within the application,
So that I can make corrections or updates.

**Acceptance Criteria:**

**Given** I am viewing an artifact
**When** I click "Edit"
**Then** the preview switches to edit mode

**And** I see a markdown editor with:
- Syntax highlighting
- Line numbers
- Basic toolbar (bold, italic, heading)

**And** I can save changes back to file

**And** I can cancel to discard changes

**And** saves are atomic (no partial writes)

**And** FR25, NFR15 are satisfied

---

## Epic 7: Interactive Mode (P1)

Provide chat-based interaction with BMAD agents for project discussions. Users can have conversations about their project.

### Story 7.1: Start Interactive Session

As a user,
I want to start an Interactive Mode session,
So that I can chat with BMAD agents.

**Acceptance Criteria:**

**Given** I have a project open
**When** I click "Interactive Mode"
**Then** a chat panel opens

**And** the system shows a welcome message

**And** I see an input field to type messages

**And** FR31 is satisfied

---

### Story 7.2: Chat with Agents

As a user,
I want to chat with AI agents,
So that I can ask questions about my project.

**Acceptance Criteria:**

**Given** I am in Interactive Mode
**When** I type a message and send
**Then** the message appears in the chat

**And** the system processes via OpenCode

**And** the agent response appears in the chat

**And** messages show sender identity (user/agent)

**And** FR32 is satisfied

---

### Story 7.3: Run Workflows via Slash Commands

As a user,
I want to run workflows from chat,
So that I can execute workflows without leaving the conversation.

**Acceptance Criteria:**

**Given** I am in Interactive Mode
**When** I type `/prd` or `/architecture`
**Then** the system recognizes the slash command

**And** the corresponding workflow starts

**And** workflow output appears in the chat

**And** completion is noted in chat

**And** FR33 is satisfied

---

### Story 7.4: Mention Specific Agents

As a user,
I want to address specific agents with @mentions,
So that I can get expertise from the right agent.

**Acceptance Criteria:**

**Given** I am in Interactive Mode
**When** I type `@winston what about...`
**Then** the system routes to the Architect agent

**And** the response comes from that agent persona

**And** autocomplete shows available agents when typing @

**And** FR34 is satisfied

---

### Story 7.5: Persist Chat History

As a user,
I want my chat history saved,
So that I can review previous conversations.

**Acceptance Criteria:**

**Given** I have chat messages
**When** I close and reopen the application
**Then** previous chat history is loaded

**And** I can scroll through past messages

**And** I can clear history if desired

**And** FR35 is satisfied

---

## Epic 8: Gate Checks (P1)

Implement implementation-readiness validation before Phase 4. The system validates that planning is complete before development.

### Story 8.1: Execute Gate Check

As a user,
I want the system to run a gate check,
So that I know if I'm ready for implementation.

**Acceptance Criteria:**

**Given** I have completed Phase 3 workflows
**When** I try to start Phase 4
**Then** the system runs implementation-readiness check

**And** the check validates:
- PRD exists and is complete
- Architecture exists and is complete
- Epics exist with stories

**And** FR41 is satisfied

---

### Story 8.2: Display Gate Check Results

As a user,
I want to see gate check results,
So that I know what passed and what failed.

**Acceptance Criteria:**

**Given** a gate check has run
**When** I view the results
**Then** I see a checklist:
- ✅ PRD Complete
- ✅ Architecture Complete
- ❌ Epics Missing [reason]

**And** each item shows details on hover

**And** FR42 is satisfied

---

### Story 8.3: Block Phase 4 on Failure

As a user,
I want the system to block Phase 4 if gate fails,
So that I don't start development prematurely.

**Acceptance Criteria:**

**Given** the gate check has failures
**When** I try to start Phase 4 workflows
**Then** the system shows a blocking message

**And** the message lists what needs to be fixed

**And** Phase 4 workflows are disabled

**And** FR43 is satisfied

---

### Story 8.4: Allow Override with Confirmation

As a user,
I want to override the gate check if needed,
So that I can proceed in exceptional cases.

**Acceptance Criteria:**

**Given** the gate check has failures
**When** I click "Override and Proceed"
**Then** a warning dialog appears

**And** I must type "I UNDERSTAND" to confirm

**And** after confirmation, Phase 4 becomes available

**And** the override is logged in status file

**And** FR44 is satisfied

---

## Validation Summary

### FR Coverage: 100%
All 48 functional requirements are covered by at least one story.

### Epic Independence
- Epic 1: Foundation - No dependencies, required for all others
- Epic 2: Projects - Depends on Epic 1
- Epic 3: Phases - Depends on Epic 1, 2
- Epic 4: Workflows - Depends on Epic 1, 2, 3
- Epic 5: Agents - Depends on Epic 1
- Epic 6: Artifacts - Depends on Epic 1, 2
- Epic 7: Interactive - Depends on Epic 1, 4
- Epic 8: Gate Checks - Depends on Epic 3, 4

### Story Sequencing
Each story within an epic can be completed in order without forward dependencies.

### Implementation Priority
**P0 (MVP):** Epics 1-6
**P1 (Post-MVP):** Epics 7-8

---

**Epic Breakdown Status:** COMPLETE ✅

**Next Phase:** Run implementation-readiness gate check, then begin Sprint Planning for Phase 4 implementation.
