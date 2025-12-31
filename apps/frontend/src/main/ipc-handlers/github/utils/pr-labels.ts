/**
 * GitHub PR Label Sync
 *
 * Syncs Auto Claude review status to GitHub PR labels.
 * Labels use "AC:" prefix for identification.
 *
 * Colors for GitHub setup:
 *   AC: Approved          #22C55E (green)
 *   AC: Changes Requested #EF4444 (red)
 *   AC: Needs Re-review   #F59E0B (amber)
 */

import { githubFetch } from '../utils';

const LABEL_PREFIX = 'AC:';

export const AC_LABELS = {
  APPROVED: 'AC: Approved',
  CHANGES_REQUESTED: 'AC: Changes Requested',
  NEEDS_REREVIEW: 'AC: Needs Re-review',
} as const;

export type ReviewStatus = 'approve' | 'request_changes' | 'comment';

function mapStatusToLabel(status: ReviewStatus): string {
  if (status === 'request_changes') {
    return AC_LABELS.CHANGES_REQUESTED;
  }
  return AC_LABELS.APPROVED;
}

async function fetchCurrentLabels(
  token: string,
  repo: string,
  prNumber: number
): Promise<string[]> {
  const labels = (await githubFetch(
    token,
    `/repos/${repo}/issues/${prNumber}/labels`
  )) as Array<{ name: string }>;
  return labels.map((l) => l.name);
}

async function removeLabel(
  token: string,
  repo: string,
  prNumber: number,
  label: string
): Promise<void> {
  await githubFetch(
    token,
    `/repos/${repo}/issues/${prNumber}/labels/${encodeURIComponent(label)}`,
    { method: 'DELETE' }
  );
}

async function addLabel(
  token: string,
  repo: string,
  prNumber: number,
  label: string
): Promise<void> {
  await githubFetch(token, `/repos/${repo}/issues/${prNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: [label] }),
  });
}

function getACLabelsToRemove(currentLabels: string[], keepLabel: string): string[] {
  return currentLabels.filter(
    (label) => label.startsWith(LABEL_PREFIX) && label !== keepLabel
  );
}

async function removeOldACLabels(
  token: string,
  repo: string,
  prNumber: number,
  currentLabels: string[],
  keepLabel: string
): Promise<void> {
  const labelsToRemove = getACLabelsToRemove(currentLabels, keepLabel);

  await Promise.allSettled(
    labelsToRemove.map((label) => removeLabel(token, repo, prNumber, label))
  );
}

/**
 * Syncs PR label based on review status.
 * Removes previous AC labels and applies the appropriate one.
 */
export async function syncPRLabel(
  token: string,
  repo: string,
  prNumber: number,
  status: ReviewStatus
): Promise<void> {
  const newLabel = mapStatusToLabel(status);

  try {
    const currentLabels = await fetchCurrentLabels(token, repo, prNumber);
    await removeOldACLabels(token, repo, prNumber, currentLabels, newLabel);
    await addLabel(token, repo, prNumber, newLabel);
  } catch {
    // Label sync is non-critical, fail silently
  }
}

/**
 * Marks PR as needing re-review after new commits are pushed.
 */
export async function markPRNeedsRereview(
  token: string,
  repo: string,
  prNumber: number
): Promise<void> {
  try {
    const currentLabels = await fetchCurrentLabels(token, repo, prNumber);
    await removeOldACLabels(token, repo, prNumber, currentLabels, AC_LABELS.NEEDS_REREVIEW);
    await addLabel(token, repo, prNumber, AC_LABELS.NEEDS_REREVIEW);
  } catch {
    // Label sync is non-critical, fail silently
  }
}
