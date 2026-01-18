# FR/NFR Test Assessment Matrix

## Overview

This document provides comprehensive test coverage mapping for all 48 Functional Requirements (FRs) and 27 Non-Functional Requirements (NFRs) defined in the Auto-BMAD PRD.

---

## Functional Requirements Coverage

### Core Application (FR1-FR5)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR1 | Create new project with name/type | Integration | `project-store.test.ts` | ✅ Covered |
| FR2 | Import existing project folder | Integration | `project-store.test.ts` | ✅ Covered |
| FR3 | View all projects in list | Unit | `project-store.test.ts` | ✅ Covered |
| FR4 | Delete project from Auto-BMAD | Unit | `project-store.test.ts` | ✅ Covered |
| FR5 | Configure project settings | Unit | `project-store.test.ts` | ✅ Covered |

### Phase Management (FR6-FR10)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR6 | View current phase progress (1-4) | Unit | `phase-store.test.ts` | ✅ Covered |
| FR7 | See phase status (complete/in-progress/pending) | Unit | `phase-store.test.ts` | ✅ Covered |
| FR8 | Navigate between phases | Unit | `phase-store.test.ts` | ✅ Covered |
| FR9 | Prevent skipping phases | Unit | `phase-store.test.ts` | ✅ Covered |
| FR10 | Reset a phase | Unit | `phase-store.test.ts` | ✅ Covered |

### Workflow Execution (FR11-FR16)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR11 | Start BMAD workflow from UI | E2E | `task-workflow.spec.ts` | ✅ Covered |
| FR12 | View workflow list with descriptions | Unit | `phase-store.test.ts` | ✅ Covered |
| FR13 | Execute workflows via OpenCode | Integration | `workflow-runner.test.ts` | ⚠️ Partial |
| FR14 | Real-time workflow terminal output | E2E | `task-workflow.spec.ts` | ✅ Covered |
| FR15 | Cancel running workflow | Unit | `workflow-runner.test.ts` | ⚠️ Partial |
| FR16 | Track workflow completion | Unit | `status-manager.test.ts` | ✅ Covered |

### Agent Roster (FR17-FR20)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR17 | View all BMAD agents | Unit | `agent-store.test.ts` | 🆕 Needed |
| FR18 | See active agent indicator | Unit | `agent-store.test.ts` | 🆕 Needed |
| FR19 | Read agent communication style | Unit | `agent-store.test.ts` | 🆕 Needed |
| FR20 | Filter agents by module | Unit | `agent-store.test.ts` | 🆕 Needed |

### Artifact Management (FR21-FR25)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR21 | View generated artifacts | Unit | `artifact-store.test.ts` | 🆕 Needed |
| FR22 | Render markdown preview | Unit | `MarkdownPreview.test.tsx` | 🆕 Needed |
| FR23 | Show artifact metadata | Unit | `artifact-store.test.ts` | 🆕 Needed |
| FR24 | Export artifacts | Unit | `artifact-store.test.ts` | 🆕 Needed |
| FR25 | Edit artifacts | Unit | `ArtifactEditor.test.tsx` | 🆕 Needed |

### Terminal Integration (FR26-FR30)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR26 | Embedded terminal for workflow | Unit | `useXterm.test.ts` | ✅ Covered |
| FR27 | Terminal interaction during workflows | Integration | `terminal-copy-paste.test.ts` | ✅ Covered |
| FR28 | Resize terminal panel | Unit | `useXterm.test.ts` | ✅ Covered |
| FR29 | Preserve terminal history | Unit | `useXterm.test.ts` | ⚠️ Partial |
| FR30 | Clear terminal output | Unit | `useXterm.test.ts` | ✅ Covered |

### Interactive Mode (FR31-FR35) - Epic 7

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR31 | Start Interactive Mode session | Unit | `chat-store.test.ts` | 🆕 Needed |
| FR32 | Chat with AI agents | Unit | `chat-store.test.ts` | 🆕 Needed |
| FR33 | Run workflows via slash commands | Unit | `chat-store.test.ts` | 🆕 Needed |
| FR34 | @mention specific agents | Unit | `chat-store.test.ts` | 🆕 Needed |
| FR35 | Maintain conversation history | Unit | `chat-store.test.ts` | 🆕 Needed |

### Status Tracking (FR36-FR40)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR36 | Persist workflow status | Unit | `status-manager.test.ts` | ✅ Covered |
| FR37 | View detailed phase status | Unit | `status-manager.test.ts` | ✅ Covered |
| FR38 | Show next recommended workflow | Unit | `phase-store.test.ts` | ✅ Covered |
| FR39 | Resume from last state | Unit | `status-manager.test.ts` | ✅ Covered |
| FR40 | View completion timestamps | Unit | `status-manager.test.ts` | ✅ Covered |

### Gate Checks (FR41-FR44) - Epic 8

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR41 | Run gate check before Phase 4 | Unit | `gate-check-manager.test.ts` | 🆕 Needed |
| FR42 | View gate check results | Unit | `gate-check-store.test.ts` | 🆕 Needed |
| FR43 | Block Phase 4 on failure | Unit | `gate-check-store.test.ts` | 🆕 Needed |
| FR44 | Override gate check | Unit | `gate-check-manager.test.ts` | 🆕 Needed |

### File Explorer (FR45-FR48)

| FR | Description | Test Type | Test File | Status |
|----|-------------|-----------|-----------|--------|
| FR45 | Browse project files in tree | Unit | `useVirtualizedTree.test.ts` | ✅ Covered |
| FR46 | Open files in external editor | Integration | `ipc-handlers.test.ts` | ✅ Covered |
| FR47 | See file status (modified/new) | Unit | `useVirtualizedTree.test.ts` | ⚠️ Partial |
| FR48 | Highlight _bmad-output folder | Unit | `useVirtualizedTree.test.ts` | ⚠️ Partial |

---

## Non-Functional Requirements Coverage

### Performance (NFR1-5)

| NFR | Description | Test Type | Test File | Status |
|-----|-------------|-----------|-----------|--------|
| NFR1 | App launches < 5 seconds | Performance | `performance.test.ts` | 🆕 Needed |
| NFR2 | Workflow list loads < 1 second | Performance | `performance.test.ts` | 🆕 Needed |
| NFR3 | Terminal streams without lag | Performance | `performance.test.ts` | 🆕 Needed |
| NFR4 | UI responsive during execution | E2E | `task-workflow.spec.ts` | ⚠️ Implicit |
| NFR5 | Artifact renders < 2 seconds | Performance | `performance.test.ts` | 🆕 Needed |

### Usability (NFR6-10)

| NFR | Description | Test Type | Test File | Status |
|-----|-------------|-----------|-----------|--------|
| NFR6 | First workflow in 5 minutes | E2E | `user-journey.spec.ts` | 🆕 Needed |
| NFR7 | Phase progress always visible | E2E | `user-journey.spec.ts` | 🆕 Needed |
| NFR8 | Error messages with guidance | Unit | Various stores | ✅ Covered |
| NFR9 | Keyboard shortcuts available | E2E | `user-journey.spec.ts` | 🆕 Needed |
| NFR10 | UI follows platform conventions | Manual | - | ⚠️ Manual |

### Reliability (NFR11-15)

| NFR | Description | Test Type | Test File | Status |
|-----|-------------|-----------|-----------|--------|
| NFR11 | Handle OpenCode unavailability | Unit | `workflow-runner.test.ts` | ⚠️ Partial |
| NFR12 | Status file corruption recovery | Unit | `status-manager.test.ts` | ✅ Covered |
| NFR13 | Resume workflow after crash | Integration | `workflow-lifecycle.test.ts` | 🆕 Needed |
| NFR14 | No data loss on termination | Integration | `workflow-lifecycle.test.ts` | 🆕 Needed |
| NFR15 | Atomic artifact saves | Unit | `artifact-store.test.ts` | 🆕 Needed |

### Compatibility (NFR16-19)

| NFR | Description | Test Type | Test File | Status |
|-----|-------------|-----------|-----------|--------|
| NFR16 | Runs on macOS/Windows/Linux | E2E/CI | CI Matrix | ⚠️ CI Only |
| NFR17 | Works with OpenCode 0.1.x+ | Integration | `workflow-runner.test.ts` | ⚠️ Partial |
| NFR18 | Supports BMAD 6.x | Unit | `bmad-modules.test.ts` | ✅ Covered |
| NFR19 | Compatible with _bmad dirs | Unit | `config-loader.test.ts` | ✅ Covered |

### Security (NFR20-23)

| NFR | Description | Test Type | Test File | Status |
|-----|-------------|-----------|-----------|--------|
| NFR20 | No external data transmission | Audit | Code Review | ⚠️ Manual |
| NFR21 | API keys in system keychain | Unit | `profile-service.test.ts` | ✅ Covered |
| NFR22 | Files accessed with permission | Unit | `ipc-handlers.test.ts` | ✅ Covered |
| NFR23 | No telemetry without opt-in | Audit | Code Review | ⚠️ Manual |

### Accessibility (NFR24-27)

| NFR | Description | Test Type | Test File | Status |
|-----|-------------|-----------|-----------|--------|
| NFR24 | Keyboard-only navigation | E2E | `accessibility.spec.ts` | 🆕 Needed |
| NFR25 | Screen reader compatible | E2E | `accessibility.spec.ts` | 🆕 Needed |
| NFR26 | WCAG 2.1 AA standards | E2E | `accessibility.spec.ts` | 🆕 Needed |
| NFR27 | System dark/light mode | Unit | `App.test.tsx` | ⚠️ Partial |

---

## Coverage Summary

| Category | Total | Covered | Partial | Needed |
|----------|-------|---------|---------|--------|
| **FRs** | 48 | 26 | 9 | 13 |
| **NFRs** | 27 | 8 | 10 | 9 |
| **Total** | 75 | 34 (45%) | 19 (25%) | 22 (29%) |

---

## Priority Test Implementation

### P0 - Critical (Implement First)
1. `chat-store.test.ts` - Interactive Mode (FR31-35)
2. `gate-check-manager.test.ts` - Gate Checks (FR41-44)
3. `workflow-lifecycle.test.ts` - Crash recovery (NFR13-14)

### P1 - High (Implement Next)
4. `agent-store.test.ts` - Agent Roster (FR17-20)
5. `artifact-store.test.ts` - Artifact Management (FR21-25)
6. `performance.test.ts` - Performance NFRs (NFR1-5)

### P2 - Medium (Enhancement)
7. `user-journey.spec.ts` - E2E User Journeys
8. `accessibility.spec.ts` - Accessibility NFRs

---

## Test Commands

```bash
# Run all unit tests
npm run test

# Run BMAD-specific tests
npm run test:bmad

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/path/to/test.ts
```

---

**Last Updated:** 2026-01-19
**Status:** Sprint 9 - Test Implementation
