# PR Label Sync Feature

Automatically sync Auto Claude review status to GitHub PR labels.

## Overview

When a PR review is posted to GitHub, the PR is labeled to reflect its status. This provides visibility directly in GitHub's PR list for maintainers and contributors.

## Labels

| GitHub Label | Color | When Applied |
|--------------|-------|--------------|
| `AC: Approved` | `#22C55E` (green) | No blocking issues (can merge) |
| `AC: Changes Requested` | `#EF4444` (red) | Has critical/high findings (must fix) |
| `AC: Needs Re-review` | `#F59E0B` (amber) | New commits pushed after review |

## Creating Labels in GitHub

Create these labels in your repository settings (Settings → Labels → New label):

1. **AC: Approved** - Color: `22C55E`
2. **AC: Changes Requested** - Color: `EF4444`
3. **AC: Needs Re-review** - Color: `F59E0B`

## Implementation

### File Location

```
apps/frontend/src/main/ipc-handlers/github/utils/pr-labels.ts
```

### Exported Functions

- `syncPRLabel(token, repo, prNumber, overallStatus)` - Syncs label after posting review
- `addNeedsRereviewLabel(token, repo, prNumber)` - Adds "Needs Re-review" when new commits detected

### Integration Points

#### 1. After Posting Review (`pr-handlers.ts`)

```typescript
import { syncPRLabel } from './utils/pr-labels';

// After posting review to GitHub:
await syncPRLabel(config.token, config.repo, prNumber, overallStatus);
```

#### 2. When New Commits Detected

```typescript
import { addNeedsRereviewLabel } from './utils/pr-labels';

// When new commits are detected after a review was posted:
await addNeedsRereviewLabel(config.token, config.repo, prNumber);
```

## Testing

1. Run a PR review and post findings
2. Check GitHub PR for appropriate label:
   - `AC: Approved` (green) - no blockers
   - `AC: Changes Requested` (red) - has critical/high findings
3. Push new commits to the PR
4. Check for `AC: Needs Re-review` (amber) label

## Notes

- Pre-create labels in GitHub for consistent colors (see colors above)
- The `AC:` prefix identifies Auto Claude managed labels
- Sync failures are logged but don't block the review workflow
- Labels are mutually exclusive - adding one removes previous AC labels
