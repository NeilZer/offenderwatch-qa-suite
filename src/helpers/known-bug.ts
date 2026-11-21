import { test } from '@playwright/test';
import bugRegistry from '@qa/bugs.json';

/**
 * Honest handling of tests that fail because of a REAL, documented defect.
 *
 *   knownBug('BUG-01');           // inside the test body, before the assertion that exposes it
 *   expect(x, bugMessage('BUG-01', 'totalPages must be ceil(total/pageSize)')).toBe(3);
 *
 * - Marks the test as an expected failure (Playwright `test.fail()`): the run stays green while
 *   the bug is open, and the report shows "expected to fail" with the bug id + title.
 * - The moment the bug is fixed, the test PASSES unexpectedly and Playwright reports it as a
 *   failure — a built-in reminder to retest the bug and remove the marker.
 * - `bugMessage()` stamps the assertion message with [BUG-xx]. The dashboard builder checks that an
 *   expected failure actually failed WITH that tag; if it failed for some other reason (network,
 *   selector, setup) it is shown as "failed for a different reason", so test.fail() can't hide
 *   unrelated breakage.
 */

interface BugRecord {
  id: string;
  title: string;
  severity: string;
  status: string;
}

const BUGS: ReadonlyMap<string, BugRecord> = new Map(
  (bugRegistry.bugs as BugRecord[]).map((bug) => [bug.id, bug]),
);

export function getBug(bugId: string): BugRecord {
  const bug = BUGS.get(bugId);
  if (!bug) {
    // Fail loudly on typos: an unknown id would silently turn a real failure into an "expected" one.
    throw new Error(`Unknown bug id "${bugId}". Add it to qa/bugs.json first.`);
  }
  return bug;
}

/** Declares that the current test is expected to fail because of the given bug(s). */
export function knownBug(...bugIds: string[]): void {
  const bugs = bugIds.map(getBug);
  for (const bug of bugs) {
    test.info().annotations.push({ type: 'known-bug', description: `${bug.id} — ${bug.title}` });
  }
  test.fail(true, bugs.map((b) => `${b.id}: ${b.title}`).join(' | '));
}

/** Conditional variant for data-driven rows: only marks the test when a bug id is given. */
export function knownBugIf(bugId: string | undefined): void {
  if (bugId) knownBug(bugId);
}

/** Assertion message tagged with the bug id, so the failure reason is verifiable. */
export function bugMessage(bugId: string, expectation: string): string {
  getBug(bugId);
  return `[${bugId}] ${expectation}`;
}
