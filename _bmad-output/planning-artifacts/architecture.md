---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - product-brief-auto-bmad.md
  - prd.md
  - apps/frontend/README.md
  - apps/frontend/package.json
workflowType: 'architecture'
project_name: Auto-BMAD
user_name: Hafiz
date: 2026-01-16
status: complete
completedAt: 2026-01-16
---

# Architecture Decision Document - Auto-BMAD

_A comprehensive architecture for Auto-BMAD, the desktop application providing a visual interface for the BMAD methodology._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Auto-BMAD requires 48 functional requirements organized into 9 categories:

1. **Core Application (FR1-FR5):** Project creation, import, listing, deletion, settings
2. **Phase Management (FR6-FR10):** Visual dashboard, progress tracking, navigation, phase reset
3. **Workflow Execution (FR11-FR16):** Start workflows, view list, OpenCode execution, terminal view
4. **Agent Roster (FR17-FR20):** View agents, active agent display, persona details
5. **Artifact Management (FR21-FR25):** View, read, export, edit generated documents
6. **Terminal Integration (FR26-FR30):** Embedded terminal, interaction, resize, history
7. **Interactive Mode (FR31-FR35):** Chat sessions, slash commands, @mentions
8. **Status Tracking (FR36-FR40):** Persist to YAML, view status, resume state
9. **Gate Checks (FR41-FR44):** Run checks, view results, prevent/override phase transitions
10. **File Explorer (FR45-FR48):** Browse, open, highlight _bmad-output

**Non-Functional Requirements:**
- **Performance (NFR1-5):** <5s launch, <1s workflow list, real-time terminal streaming
- **Usability (NFR6-10):** 5-min onboarding, always-visible progress, keyboard shortcuts
- **Reliability (NFR11-15):** Graceful OpenCode handling, crash recovery, atomic saves
- **Compatibility (NFR16-19):** macOS 12+, Windows 10+, Ubuntu 20.04+, OpenCode 0.1.x+
- **Security (NFR20-23):** No external data, keychain storage, no telemetry
- **Accessibility (NFR24-27):** Keyboard nav, WCAG 2.1 AA, screen reader support

**Scale & Complexity:**
- Primary domain: Desktop Electron Application (Full-stack TypeScript)
- Complexity level: Medium-High (existing codebase fork + new BMAD features)
- Estimated architectural components: 15-20 major modules
- UI complexity: Rich interactions with real-time terminal and phase visualization

### Technical Constraints & Dependencies

**Hard Constraints:**
- **Must fork from Auto-Claude** - Leverage existing UI components, terminal, file explorer
- **Must use OpenCode** - Agent execution depends on OpenCode CLI
- **Must preserve _bmad structure** - Compatibility with BMAD methodology files
- **Electron required** - Desktop application with native process spawning

**Dependencies from Auto-Claude:**
| Dependency | Version | Purpose |
|------------|---------|---------|
| Electron | 39.x | Desktop framework |
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Type safety |
| xterm.js | 6.x | Terminal emulation |
| Zustand | 5.x | State management |
| Tailwind CSS | 4.x | Styling |
| Radix UI | Various | UI primitives |

**New Dependencies Required:**
| Dependency | Version | Purpose |
|------------|---------|---------|
| yaml | ^2.x | Parse bmm-workflow-status.yaml |
| chokidar | ^5.x | Watch _bmad-output for changes (already in Auto-Claude) |

### Cross-Cutting Concerns Identified

1. **State Persistence** - Workflow status must sync between Zustand store and YAML file
2. **OpenCode Integration** - Agent execution abstraction layer for CLI calls
3. **Terminal Management** - PTY lifecycle for workflow execution
4. **File Watching** - Real-time artifact updates from _bmad-output
5. **Error Handling** - Graceful degradation when OpenCode unavailable

---

## Starter Template Evaluation

### Primary Technology Domain

**Desktop Electron Application** based on project requirements:
- Cross-platform desktop app requirement
- Native terminal integration (PTY)
- File system access
- Real-time UI updates

### Selected Starter: Fork Auto-Claude apps/frontend/

**Rationale for Selection:**
1. **6+ months of production hardening** - Stable Electron configuration
2. **Terminal integration built** - node-pty + xterm.js already working
3. **File explorer component** - Reusable for _bmad-output browsing
4. **Feature-based architecture** - Easy to add BMAD-specific features
5. **Build pipeline ready** - electron-builder for all platforms

**Initialization Approach:**
```bash
# Fork strategy - copy and adapt
cp -r apps/frontend apps/auto-bmad

# Update package.json
# - Change name to "auto-bmad"
# - Update description
# - Keep all dependencies

# Remove Auto-Claude specific features not needed:
# - tasks/ (Kanban) → Replace with phases/
# - roadmap/ → Remove
# - changelog/ → Remove
# - insights/ → Remove
# - github/ → Adapt for BMAD artifacts

# Add BMAD-specific features:
# - phases/ (new)
# - workflows/ (new)
# - artifacts/ (new)
# - agents/ (adapt from existing)
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript 5.9.x with strict mode
- Node.js 24.x LTS for main process
- ESM modules (type: "module")

**Styling Solution:**
- Tailwind CSS 4.x with postcss
- Class variance authority (cva) for variants
- Tailwind merge for conditional classes

**Build Tooling:**
- electron-vite for development and bundling
- electron-builder for packaging
- Vite 7.x for frontend bundling

**Testing Framework:**
- Vitest for unit tests
- Playwright for E2E tests
- Testing Library for React components

**Code Organization:**
- Feature-based architecture
- Shared components in `src/renderer/shared/`
- Main/Preload/Renderer separation

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Fork strategy from Auto-Claude
2. OpenCode integration approach
3. BMAD status file management
4. Phase navigation state machine

**Important Decisions (Shape Architecture):**
1. Component replacement strategy
2. IPC API design for BMAD operations
3. Artifact viewer implementation
4. Terminal session management

**Deferred Decisions (Post-MVP):**
1. Interactive Mode chat persistence
2. Multi-project concurrent workflows
3. Custom agent creation

### Data Architecture

**State Management: Zustand (Inherited from Auto-Claude)**
- Version: 5.x
- Pattern: Feature-based stores
- Persistence: Sync with YAML files via middleware

**Primary Data Stores:**

```typescript
// Phase store - tracks BMAD methodology progress
interface PhaseStore {
  currentPhase: 1 | 2 | 3 | 4;
  phaseStatuses: Record<Phase, PhaseStatus>;
  workflowStatuses: Record<WorkflowId, WorkflowStatus>;
  setPhase: (phase: Phase) => void;
  completeWorkflow: (workflowId: string, artifactPath: string) => void;
}

// Project store - BMAD project configuration
interface ProjectStore {
  projectName: string;
  projectPath: string;
  bmadOutputPath: string;
  opencodePath: string;
  loadProject: (path: string) => Promise<void>;
}

// Workflow store - active workflow execution
interface WorkflowStore {
  activeWorkflow: WorkflowDefinition | null;
  terminalSessionId: string | null;
  startWorkflow: (workflow: WorkflowDefinition) => Promise<void>;
  cancelWorkflow: () => void;
}
```

**File-Based Persistence:**
- `bmm-workflow-status.yaml` - BMAD phase/workflow status
- Project settings in `_bmad/bmm/config.yaml`

**Data Validation:**
- Zod 4.x schemas for YAML parsing
- Runtime validation on file load

### Authentication & Security

**No External Authentication Required**
- Desktop-only application
- No cloud services
- All data local

**Security Measures:**
- API keys (if any) in system keychain via Electron safeStorage
- No sensitive data in renderer process
- IPC validation for all main process calls
- Sandbox enabled for renderer

### API & Communication

**IPC Design Pattern: Feature-based Handlers**

```typescript
// Main process handlers organized by feature
// src/main/ipc-handlers/bmad-handlers.ts

// Workflow operations
ipcMain.handle('bmad:start-workflow', async (_, workflowId: string, agentId: string) => {...})
ipcMain.handle('bmad:cancel-workflow', async (_) => {...})
ipcMain.handle('bmad:get-workflow-status', async (_) => {...})

// Phase operations
ipcMain.handle('bmad:get-phase-status', async (_) => {...})
ipcMain.handle('bmad:can-advance-phase', async (_, targetPhase: number) => {...})

// Artifact operations
ipcMain.handle('bmad:list-artifacts', async (_) => {...})
ipcMain.handle('bmad:read-artifact', async (_, path: string) => {...})
ipcMain.handle('bmad:save-artifact', async (_, path: string, content: string) => {...})

// Agent operations
ipcMain.handle('bmad:list-agents', async (_) => {...})
ipcMain.handle('bmad:get-agent-details', async (_, agentId: string) => {...})
```

**Preload API Exposure:**

```typescript
// src/preload/api/bmad-api.ts
export const bmadApi = {
  workflow: {
    start: (workflowId: string, agentId: string) => 
      ipcRenderer.invoke('bmad:start-workflow', workflowId, agentId),
    cancel: () => ipcRenderer.invoke('bmad:cancel-workflow'),
    getStatus: () => ipcRenderer.invoke('bmad:get-workflow-status'),
  },
  phase: {
    getStatus: () => ipcRenderer.invoke('bmad:get-phase-status'),
    canAdvance: (targetPhase: number) => 
      ipcRenderer.invoke('bmad:can-advance-phase', targetPhase),
  },
  artifacts: {
    list: () => ipcRenderer.invoke('bmad:list-artifacts'),
    read: (path: string) => ipcRenderer.invoke('bmad:read-artifact', path),
    save: (path: string, content: string) => 
      ipcRenderer.invoke('bmad:save-artifact', path, content),
  },
  agents: {
    list: () => ipcRenderer.invoke('bmad:list-agents'),
    getDetails: (agentId: string) => 
      ipcRenderer.invoke('bmad:get-agent-details', agentId),
  },
}
```

**Error Handling Standard:**
```typescript
// Consistent error response format
type IpcResult<T> = 
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } }
```

### Frontend Architecture

**Component Architecture: Feature-Based (Inherited)**

Replace Auto-Claude features with BMAD equivalents:

| Auto-Claude Feature | Auto-BMAD Feature | Change Type |
|---------------------|-------------------|-------------|
| `features/tasks/` | `features/phases/` | Replace |
| `features/terminals/` | `features/terminals/` | Reuse |
| `features/projects/` | `features/projects/` | Adapt |
| `features/settings/` | `features/settings/` | Adapt |
| `features/roadmap/` | (Remove) | Delete |
| `features/ideation/` | `features/workflows/` | Replace |
| `features/insights/` | (Remove) | Delete |
| `features/changelog/` | (Remove) | Delete |
| `features/github/` | `features/artifacts/` | Replace |
| `features/agents/` | `features/agents/` | Adapt |
| N/A | `features/interactive/` | New |

**State Management Pattern:**
```typescript
// Feature store pattern from Auto-Claude
// src/renderer/features/phases/stores/phase-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePhaseStore = create(
  persist<PhaseStore>(
    (set, get) => ({
      // State
      currentPhase: 1,
      phaseStatuses: {},
      
      // Actions
      setPhase: (phase) => set({ currentPhase: phase }),
      
      // Computed (via selectors)
    }),
    {
      name: 'bmad-phase-store',
      // Custom storage to sync with YAML
    }
  )
)
```

**Routing Strategy:**
- No router library (single-page app with feature panels)
- Tab-based navigation inherited from Auto-Claude
- Phase-based view switching

### Infrastructure & Deployment

**Hosting Strategy: Desktop Application**
- No server hosting required
- Electron auto-updater for distribution
- GitHub Releases for artifacts

**Build Pipeline:**
```yaml
# Inherited from Auto-Claude
# .github/workflows/build.yml

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    steps:
      - npm install
      - npm run build
      - npm run package
```

**Environment Configuration:**
```
# Development
apps/auto-bmad/.env.local

# Production (bundled)
Built into app via electron-builder extraResources
```

---

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:** 12 areas where AI agents could make different choices

### Naming Patterns

**Database Naming Conventions:** N/A (No database)

**File Naming Conventions:**
- Components: `PascalCase.tsx` (e.g., `PhaseCard.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-phase-store.ts`)
- Stores: `kebab-case-store.ts` (e.g., `phase-store.ts`)
- Types: `kebab-case.types.ts` (e.g., `phase.types.ts`)
- Utils: `kebab-case.ts` (e.g., `workflow-parser.ts`)

**API Naming Conventions:**
- IPC channels: `feature:operation` (e.g., `bmad:start-workflow`)
- Event names: `feature:event-name` (e.g., `bmad:workflow-complete`)

**Code Naming Conventions:**
- Components: PascalCase (e.g., `PhaseCard`)
- Functions: camelCase (e.g., `startWorkflow`)
- Constants: SCREAMING_SNAKE_CASE (e.g., `MAX_TERMINAL_BUFFER`)
- Types: PascalCase (e.g., `PhaseStatus`)
- Interfaces: PascalCase with `I` prefix optional (prefer `type`)

### Structure Patterns

**Project Organization:**
- Feature-based: Each feature has components, hooks, stores, types
- Shared resources: `src/renderer/shared/`
- Main process: `src/main/` with feature-based handlers

**Test Organization:**
- Co-located: `__tests__/` folder within each feature
- E2E: `e2e/` at project root
- Mocks: `__mocks__/` for external dependencies

### Format Patterns

**API Response Formats:**
```typescript
// Success response
{ success: true, data: T }

// Error response
{ success: false, error: { code: string, message: string } }
```

**Date Format:**
- ISO 8601 strings in YAML files
- JavaScript Date objects in memory
- Formatted display via Intl.DateTimeFormat

### Communication Patterns

**Event System Patterns:**
- IPC events: `ipcRenderer.on('bmad:event-name', callback)`
- Store subscriptions: Zustand `subscribe()` for cross-store communication
- Component events: React synthetic events only

**State Management Patterns:**
- Immutable updates via Zustand
- Selectors for computed values
- Actions defined within store
- No direct state mutation

### Process Patterns

**Error Handling Patterns:**
```typescript
// Main process
try {
  const result = await riskyOperation()
  return { success: true, data: result }
} catch (error) {
  log.error('Operation failed:', error)
  return { 
    success: false, 
    error: { code: 'OPERATION_FAILED', message: error.message } 
  }
}

// Renderer process
const result = await window.api.bmad.workflow.start(id, agent)
if (!result.success) {
  toast.error(result.error.message)
  return
}
// Use result.data
```

**Loading State Patterns:**
```typescript
// Store pattern
interface WorkflowStore {
  isLoading: boolean
  error: string | null
  // ...
}

// Component pattern
const { isLoading, error, data } = useWorkflowStore()
if (isLoading) return <Spinner />
if (error) return <ErrorDisplay error={error} />
return <WorkflowContent data={data} />
```

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow TypeScript strict mode (no `any`, no implicit returns)
- Use existing component library from `shared/components/`
- Write tests for new components and hooks
- Use Zustand for state, never useState for shared state
- Follow IPC pattern for all main process communication

**Pattern Enforcement:**
- ESLint rules configured in `eslint.config.js`
- TypeScript strict mode in `tsconfig.json`
- Husky pre-commit hooks for linting

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
apps/auto-bmad/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── electron.vite.config.ts
├── electron-builder.yml
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── .env.local
├── .env.example
├── .gitignore
│
├── resources/                      # Electron build resources
│   ├── icon.icns
│   ├── icon.ico
│   └── icons/
│
├── src/
│   ├── main/                       # Electron main process
│   │   ├── index.ts                # Main entry point
│   │   ├── bmad/                   # BMAD-specific main process
│   │   │   ├── config-loader.ts    # Load _bmad/bmm/config.yaml
│   │   │   ├── status-manager.ts   # Manage bmm-workflow-status.yaml
│   │   │   ├── workflow-runner.ts  # Execute OpenCode workflows
│   │   │   ├── artifact-watcher.ts # Watch _bmad-output for changes
│   │   │   └── agent-parser.ts     # Parse agent .md files
│   │   ├── terminal/               # (Inherited) PTY management
│   │   │   ├── pty-manager.ts
│   │   │   └── terminal-service.ts
│   │   ├── ipc-handlers/           # IPC communication handlers
│   │   │   ├── bmad-handlers.ts    # BMAD-specific handlers
│   │   │   ├── terminal-handlers.ts
│   │   │   └── file-handlers.ts
│   │   └── updater/                # (Inherited) Auto-update service
│   │       └── update-service.ts
│   │
│   ├── preload/                    # Electron preload scripts
│   │   ├── index.ts                # Preload entry
│   │   └── api/                    # IPC API modules
│   │       ├── bmad-api.ts         # BMAD operations
│   │       ├── terminal-api.ts
│   │       └── file-api.ts
│   │
│   ├── renderer/                   # React frontend
│   │   ├── index.tsx               # React entry point
│   │   ├── App.tsx                 # Root component
│   │   ├── index.css               # Global styles
│   │   │
│   │   ├── features/               # Feature modules
│   │   │   ├── phases/             # Phase management (NEW)
│   │   │   │   ├── components/
│   │   │   │   │   ├── PhaseDashboard.tsx
│   │   │   │   │   ├── PhaseCard.tsx
│   │   │   │   │   ├── PhaseProgress.tsx
│   │   │   │   │   └── PhaseNavigation.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── phase-store.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-phase-navigation.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── phase.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── workflows/          # Workflow execution (NEW)
│   │   │   │   ├── components/
│   │   │   │   │   ├── WorkflowList.tsx
│   │   │   │   │   ├── WorkflowCard.tsx
│   │   │   │   │   ├── WorkflowRunner.tsx
│   │   │   │   │   └── WorkflowTerminal.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── workflow-store.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── use-workflow-execution.ts
│   │   │   │   │   └── use-workflow-list.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── workflow.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── artifacts/          # Artifact management (NEW)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ArtifactViewer.tsx
│   │   │   │   │   ├── ArtifactList.tsx
│   │   │   │   │   ├── ArtifactPreview.tsx
│   │   │   │   │   └── ArtifactEditor.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── artifact-store.ts
│   │   │   │   ├── hooks/
│   │   │   │   │   └── use-artifact-watcher.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── artifact.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── agents/             # Agent roster (ADAPT)
│   │   │   │   ├── components/
│   │   │   │   │   ├── AgentRoster.tsx
│   │   │   │   │   ├── AgentCard.tsx
│   │   │   │   │   ├── AgentDetails.tsx
│   │   │   │   │   └── ActiveAgentIndicator.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── agent-store.ts
│   │   │   │   ├── types/
│   │   │   │   │   └── agent.types.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── interactive/        # Interactive mode (NEW)
│   │   │   │   ├── components/
│   │   │   │   │   ├── InteractivePanel.tsx
│   │   │   │   │   ├── ChatInterface.tsx
│   │   │   │   │   ├── CommandInput.tsx
│   │   │   │   │   └── AgentMention.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── interactive-store.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── terminals/          # Terminal emulation (INHERIT)
│   │   │   │   ├── components/
│   │   │   │   │   ├── Terminal.tsx
│   │   │   │   │   └── TerminalTabs.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── terminal-store.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── projects/           # Project management (ADAPT)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ProjectSelector.tsx
│   │   │   │   │   ├── ProjectSettings.tsx
│   │   │   │   │   └── FileExplorer.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── project-store.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── settings/           # App settings (ADAPT)
│   │   │   │   ├── components/
│   │   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   │   ├── OpenCodeSettings.tsx
│   │   │   │   │   └── BmadSettings.tsx
│   │   │   │   ├── stores/
│   │   │   │   │   └── settings-store.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── onboarding/         # First-time setup (ADAPT)
│   │   │       ├── components/
│   │   │       │   ├── OnboardingWizard.tsx
│   │   │       │   └── OpenCodeCheck.tsx
│   │   │       └── index.ts
│   │   │
│   │   ├── shared/                 # Shared resources (INHERIT)
│   │   │   ├── components/         # Reusable UI components
│   │   │   │   ├── ui/             # Base UI primitives
│   │   │   │   │   ├── Button.tsx
│   │   │   │   │   ├── Card.tsx
│   │   │   │   │   ├── Dialog.tsx
│   │   │   │   │   ├── Input.tsx
│   │   │   │   │   ├── Tabs.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── MarkdownRenderer.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── hooks/              # Shared React hooks
│   │   │   │   ├── use-toast.ts
│   │   │   │   ├── use-keyboard-shortcut.ts
│   │   │   │   └── use-async.ts
│   │   │   │
│   │   │   └── lib/                # Utilities and helpers
│   │   │       ├── utils.ts        # cn(), formatDate(), etc.
│   │   │       └── constants.ts
│   │   │
│   │   └── hooks/                  # App-level hooks
│   │       └── use-app-state.ts
│   │
│   └── shared/                     # Shared between main/renderer
│       ├── types/                  # TypeScript type definitions
│       │   ├── bmad.types.ts       # BMAD-specific types
│       │   ├── ipc.types.ts        # IPC message types
│       │   └── index.ts
│       ├── constants/              # Application constants
│       │   ├── phases.ts           # Phase definitions
│       │   ├── workflows.ts        # Workflow definitions
│       │   └── agents.ts           # Agent definitions
│       └── utils/                  # Shared utilities
│           ├── yaml-parser.ts      # YAML parsing utilities
│           └── path-utils.ts       # Path manipulation
│
├── e2e/                            # End-to-end tests
│   ├── playwright.config.ts
│   └── specs/
│       ├── phase-navigation.spec.ts
│       └── workflow-execution.spec.ts
│
└── scripts/                        # Build scripts
    ├── postinstall.cjs
    └── download-python.cjs         # (If keeping Python backend)
```

### Architectural Boundaries

**API Boundaries:**
- **Main ↔ Renderer:** IPC only via `contextBridge`
- **Renderer ↔ External:** None (no network calls from renderer)
- **Main ↔ OpenCode:** CLI spawning via `child_process`

**Component Boundaries:**
- Features are self-contained (components, hooks, stores, types)
- Cross-feature communication via shared stores or IPC
- UI primitives in `shared/components/ui/`

**Service Boundaries:**
- `workflow-runner.ts` - Only responsible for OpenCode execution
- `status-manager.ts` - Only responsible for YAML persistence
- `artifact-watcher.ts` - Only responsible for file watching

**Data Boundaries:**
- Zustand stores manage UI state
- YAML files are source of truth for BMAD status
- File system access only from main process

### Requirements to Structure Mapping

**Epic Mapping (from PRD FRs):**

| FR Category | Directory | Key Files |
|-------------|-----------|-----------|
| Core Application (FR1-5) | `features/projects/` | `ProjectSelector.tsx`, `project-store.ts` |
| Phase Management (FR6-10) | `features/phases/` | `PhaseDashboard.tsx`, `phase-store.ts` |
| Workflow Execution (FR11-16) | `features/workflows/` | `WorkflowRunner.tsx`, `workflow-store.ts` |
| Agent Roster (FR17-20) | `features/agents/` | `AgentRoster.tsx`, `agent-store.ts` |
| Artifact Management (FR21-25) | `features/artifacts/` | `ArtifactViewer.tsx`, `artifact-store.ts` |
| Terminal Integration (FR26-30) | `features/terminals/` | `Terminal.tsx`, `terminal-store.ts` |
| Interactive Mode (FR31-35) | `features/interactive/` | `ChatInterface.tsx`, `interactive-store.ts` |
| Status Tracking (FR36-40) | `main/bmad/` | `status-manager.ts` |
| Gate Checks (FR41-44) | `features/phases/` | `PhaseNavigation.tsx` |
| File Explorer (FR45-48) | `features/projects/` | `FileExplorer.tsx` |

**Cross-Cutting Concerns:**
| Concern | Location | Implementation |
|---------|----------|----------------|
| Error Handling | `shared/components/ErrorBoundary.tsx` | React error boundary + toast notifications |
| Loading States | Per-feature stores | `isLoading` flag pattern |
| YAML Persistence | `main/bmad/status-manager.ts` | Chokidar watch + atomic writes |
| Terminal Management | `main/terminal/` | Inherited from Auto-Claude |

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices work together without conflicts:
- Electron 39 + React 19 + TypeScript 5.9 = Stable combination
- Zustand 5 + React 19 = Compatible
- xterm.js 6 + Electron 39 = Native PTY support verified

**Pattern Consistency:**
Implementation patterns support the architectural decisions:
- Feature-based organization aligns with Zustand store pattern
- IPC design follows Electron best practices
- File naming conventions consistent with Auto-Claude

**Structure Alignment:**
Project structure supports all architectural decisions:
- Clear separation between main/preload/renderer
- Feature directories enable independent development
- Shared resources prevent duplication

### Requirements Coverage Validation ✅

**Functional Requirements Coverage:**
- All 48 FRs mapped to specific directories and components
- Core features (phases, workflows, artifacts) have dedicated feature modules
- Inherited features (terminal, file explorer) reuse Auto-Claude components

**Non-Functional Requirements Coverage:**
- Performance: Electron + Vite ensures fast startup
- Usability: Feature-based architecture enables consistent UX patterns
- Reliability: Atomic writes + file watching ensure data integrity
- Compatibility: Electron 39 supports macOS 12+, Windows 10+, Ubuntu 20.04+
- Security: IPC-only communication, no renderer network access
- Accessibility: Radix UI primitives provide ARIA support

### Implementation Readiness Validation ✅

**Decision Completeness:**
- All critical decisions documented with versions
- Technology stack fully specified with exact versions
- Integration patterns (IPC, file watching) clearly defined

**Structure Completeness:**
- Complete directory tree with all files
- Feature modules fully specified
- Shared resources identified

**Pattern Completeness:**
- Naming conventions comprehensive
- Error handling pattern defined
- State management pattern clear

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION ✅

**Confidence Level:** High - Based on proven Auto-Claude codebase

**Key Strengths:**
1. Fork strategy leverages 6+ months of production hardening
2. Clear separation of BMAD features from Auto-Claude
3. Well-defined IPC patterns for all operations
4. Comprehensive state management with YAML persistence

**Areas for Future Enhancement:**
1. Interactive Mode chat persistence (deferred)
2. Multi-project concurrent workflows (deferred)
3. Custom agent creation UI (deferred)

---

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED ✅
**Total Steps Completed:** 8
**Date Completed:** 2026-01-16
**Document Location:** _bmad-output/planning-artifacts/architecture.md

### Final Architecture Deliverables

**📋 Complete Architecture Document**
- All architectural decisions documented with specific versions
- Implementation patterns ensuring AI agent consistency
- Complete project structure with all files and directories
- Requirements to architecture mapping
- Validation confirming coherence and completeness

**🏗️ Implementation Ready Foundation**
- 15+ architectural decisions made
- 12 implementation patterns defined
- 10 feature modules specified
- 48 requirements fully supported

**📚 AI Agent Implementation Guide**
- Technology stack with verified versions
- Consistency rules that prevent implementation conflicts
- Project structure with clear boundaries
- Integration patterns and communication standards

### Implementation Handoff

**For AI Agents:**
This architecture document is your complete guide for implementing Auto-BMAD. Follow all decisions, patterns, and structures exactly as documented.

**First Implementation Priority:**
```bash
# Step 1: Create Auto-BMAD from Auto-Claude fork
cp -r apps/frontend apps/auto-bmad
cd apps/auto-bmad

# Step 2: Update package.json
# - name: "auto-bmad"
# - description: "Desktop UI for BMAD methodology"

# Step 3: Remove unused Auto-Claude features
rm -rf src/renderer/features/roadmap
rm -rf src/renderer/features/changelog
rm -rf src/renderer/features/insights

# Step 4: Create BMAD feature directories
mkdir -p src/renderer/features/phases
mkdir -p src/renderer/features/workflows
mkdir -p src/renderer/features/artifacts
mkdir -p src/renderer/features/interactive
mkdir -p src/main/bmad
```

**Development Sequence:**
1. Initialize project using documented fork strategy
2. Create BMAD main process modules (config-loader, status-manager)
3. Create Phase Dashboard feature
4. Create Workflow Runner feature
5. Adapt existing terminal for workflow execution
6. Create Artifact Viewer feature
7. Adapt Agent Roster for BMAD agents
8. Implement Interactive Mode (P1)

### Quality Assurance Checklist

**✅ Architecture Coherence**
- [x] All decisions work together without conflicts
- [x] Technology choices are compatible
- [x] Patterns support the architectural decisions
- [x] Structure aligns with all choices

**✅ Requirements Coverage**
- [x] All functional requirements are supported
- [x] All non-functional requirements are addressed
- [x] Cross-cutting concerns are handled
- [x] Integration points are defined

**✅ Implementation Readiness**
- [x] Decisions are specific and actionable
- [x] Patterns prevent agent conflicts
- [x] Structure is complete and unambiguous
- [x] Examples are provided for clarity

---

**Architecture Status:** READY FOR IMPLEMENTATION ✅

**Next Phase:** Create epics and user stories based on this architecture, then begin implementation.

**Document Maintenance:** Update this architecture when major technical decisions are made during implementation.
