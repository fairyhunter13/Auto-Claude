# QA Fix Request

**Status**: REJECTED
**Date**: 2025-12-12T13:40:00Z
**QA Session**: 1

## Critical Issues to Fix

### 1. Missing implementation in main/project-store.ts (chunk-1-1)

**Problem**: The `determineTaskStatus` function in `auto-claude-ui/src/main/project-store.ts` was never modified. The implementation_plan.json incorrectly shows chunk-1-1 as completed, but the actual code changes were not made.

**Location**: `auto-claude-ui/src/main/project-store.ts` lines 253-318

**Required Fix**:

1. **Add metadata parameter to function signature** (line 253-256):
```typescript
private determineTaskStatus(
  plan: ImplementationPlan | null,
  specPath: string,
  metadata?: TaskMetadata  // ADD THIS PARAMETER
): TaskStatus {
```

2. **Update the call site** (line 216):
```typescript
// Change from:
const status = this.determineTaskStatus(plan, specPath);
// To:
const status = this.determineTaskStatus(plan, specPath, metadata);
```

3. **Update return logic when all chunks completed** (lines 307-310):
```typescript
// Change from:
if (completed === allChunks.length) {
  return 'ai_review';
}

// To:
if (completed === allChunks.length) {
  // Manual tasks skip AI review and go directly to human review
  return metadata?.sourceType === 'manual' ? 'human_review' : 'ai_review';
}
```

**Verification**:
1. Run `git diff main -- auto-claude-ui/src/main/project-store.ts` - should show the 3 changes above
2. The `TaskMetadata` type is already imported in the file
3. The `metadata` variable is already available at the call site (line 205-213)

## After Fixes

Once fixes are complete:
1. Commit with message: `fix: Update determineTaskStatus in main/project-store.ts for manual tasks (qa-requested)`
2. QA will automatically re-run
3. Loop continues until approved

## Notes

- chunk-1-2 (task-store.ts changes) was correctly implemented
- Only chunk-1-1 needs to be redone
- The metadata is already being loaded at line 204-213, just not passed to the function
