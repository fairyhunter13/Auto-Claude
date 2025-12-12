# Quick Spec: Persist Last Open Project

## Overview
Save the last selected project to localStorage and restore it when the app reloads, instead of always selecting the first project.

## Workflow Type
simple

## Task Scope
- `auto-claude-ui/src/renderer/stores/project-store.ts` - Add localStorage persistence for selectedProjectId

## Success Criteria
- [ ] Select a project, reload the app → same project is selected
- [ ] Select a different project, reload → new selection is preserved
- [ ] If last project was removed, first project is selected instead

## Change Details
1. When `selectProject()` is called, save the projectId to localStorage (key: `lastSelectedProjectId`)
2. In `loadProjects()`, after loading projects:
   - Read `lastSelectedProjectId` from localStorage
   - If the project exists in the loaded projects, select it
   - Otherwise, fall back to selecting the first project

## Notes
- Use `localStorage` directly since this is renderer-side state
- Key should be simple: `lastSelectedProjectId`
