/**
 * Builds ONE consistent picture of the testing phase from:
 *   qa/requirements.json   the PRD requirement list
 *   qa/test-cases.json     the designed suite + manual execution results
 *   qa/bugs.json           the bug reports
 *   reports/results.json   the latest Playwright run (optional — falls back to manual results)
 *
 * Used by build-docs.mjs and build-dashboard.mjs so documents and dashboard can never disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RESULTS_FILE = path.join(ROOT, 'reports', 'results.json');

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

function readJson(relativePath) {
  const file = path.join(ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${relativePath}: ${error.message}`);
  }
}

const stripAnsi = (text) => String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');

// ---------------------------------------------------------------- automation run
/**
 * Flattens the Playwright JSON report into one record per test with a QA outcome:
 *   pass            expected to pass, passed
 *   known-bug       expected to fail (documented bug) and failed WITH the bug tag
 *   other-failure   expected to fail but failed WITHOUT the bug tag  -> broken for another reason
 *   fixed?          expected to fail but PASSED -> bug probably fixed, retest it
 *   fail            expected to pass, failed -> new defect or broken test
 *   not-run         skipped / interrupted
 */
export function readAutomationRun() {
  if (!fs.existsSync(RESULTS_FILE)) return null;
  const report = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  const tests = [];

  const walk = (suite, file) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const result = t.results?.[t.results.length - 1];
        const tags = (spec.tags ?? []).map((tag) => tag.replace(/^@/, ''));
        const bugs = (t.annotations ?? [])
          .filter((a) => a.type === 'known-bug')
          .map((a) => a.description.split(' ')[0]);
        const message = stripAnsi((result?.errors ?? []).map((e) => e.message).join('\n'));
        tests.push({
          title: spec.title,
          file: file ?? spec.file,
          project: t.projectName,
          tcIds: tags.filter((tag) => /^TC-\d+$/.test(tag)),
          bugs,
          durationMs: result?.duration ?? 0,
          outcome: classify(t, result, bugs, message),
          message: message.split('\n').find((l) => l.trim()) ?? '',
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, file ?? suite.file);
  };
  for (const suite of report.suites ?? []) walk(suite, suite.file);

  const count = (outcome) => tests.filter((t) => t.outcome === outcome).length;
  return {
    startedAt: report.stats?.startTime ?? null,
    durationMs: report.stats?.duration ?? 0,
    tests,
    totals: {
      total: tests.length,
      pass: count('pass'),
      knownBug: count('known-bug'),
      fail: count('fail'),
      otherFailure: count('other-failure'),
      fixed: count('fixed?'),
      notRun: count('not-run'),
    },
    byProject: Object.fromEntries(
      [...new Set(tests.map((t) => t.project))].map((p) => [p, tests.filter((t) => t.project === p).length]),
    ),
  };
}

function classify(test, result, bugs, message) {
  if (!result || test.status === 'skipped' || ['skipped', 'interrupted'].includes(result.status)) return 'not-run';
  if (test.expectedStatus === 'failed') {
    if (test.status === 'unexpected') return 'fixed?';
    return bugs.some((id) => message.includes(`[${id}]`)) ? 'known-bug' : 'other-failure';
  }
  return test.status === 'expected' ? 'pass' : 'fail';
}

// ---------------------------------------------------------------- full model
export function buildModel() {
  const { requirements } = readJson('qa/requirements.json');
  const { meta: tcMeta, testCases } = readJson('qa/test-cases.json');
  const { meta: bugMeta, bugs } = readJson('qa/bugs.json');
  const run = readAutomationRun();

  const cases = testCases.map((tc) => resolveCase(tc, run));
  const bugsWithState = bugs.map((bug) => resolveBug(bug, cases, run));

  validateTraceability(requirements, cases, bugsWithState);

  const caseTotals = {
    total: cases.length,
    executed: cases.filter((c) => ['Passed', 'Failed'].includes(c.result)).length,
    passed: cases.filter((c) => c.result === 'Passed').length,
    failed: cases.filter((c) => c.result === 'Failed').length,
    blocked: cases.filter((c) => c.result === 'Blocked').length,
    notRun: cases.filter((c) => c.result === 'Not run').length,
    automated: cases.filter((c) => c.automation !== 'Manual').length,
    manual: cases.filter((c) => c.automation === 'Manual').length,
    automatedUi: cases.filter((c) => c.automation === 'UI').length,
    automatedApi: cases.filter((c) => c.automation === 'API').length,
  };

  const coverage = requirements.map((req) => {
    const covering = cases.filter((c) => c.requirements.includes(req.id));
    const failed = covering.filter((c) => c.result === 'Failed');
    const passed = covering.filter((c) => c.result === 'Passed');
    const state = covering.length === 0 ? 'Not covered' : failed.length ? 'Failed' : passed.length === covering.length ? 'Passed' : 'Partly run';
    const reqBugs = bugsWithState.filter((b) => b.requirements.includes(req.id));
    return { ...req, cases: covering.map((c) => c.id), passed: passed.length, failed: failed.length, state, bugs: reqBugs.map((b) => b.id) };
  });

  const defects = {
    total: bugsWithState.length,
    bySeverity: SEVERITIES.map((s) => ({ severity: s, count: bugsWithState.filter((b) => b.severity === s).length })),
    byStatus: ['Open', 'Fixed', 'Retest'].map((s) => ({ status: s, count: bugsWithState.filter((b) => b.effectiveStatus === s).length })),
    byLayer: countBy(bugsWithState, (b) => b.layer.split(' ')[0]),
  };

  return {
    generatedAt: new Date().toISOString(),
    tcMeta,
    bugMeta,
    requirements,
    cases,
    caseTotals,
    coverage,
    bugs: bugsWithState,
    defects,
    run,
    verdict: buildVerdict(caseTotals, bugsWithState, run),
  };
}

function resolveCase(tc, run) {
  const tests = run ? run.tests.filter((t) => t.tcIds.includes(tc.id)) : [];
  const manual = tc.manual ?? { result: 'Not run' };
  if (tc.automation === 'Manual' || tests.length === 0) {
    return { ...tc, result: manual.result, source: 'Manual', bugs: manual.bugs ?? [], notes: manual.notes ?? '', autoTests: [] };
  }
  const outcomes = tests.map((t) => t.outcome);
  const anyFailing = outcomes.some((o) => ['known-bug', 'fail', 'other-failure'].includes(o));
  const allNotRun = outcomes.every((o) => o === 'not-run');
  const result = allNotRun ? 'Not run' : anyFailing ? 'Failed' : 'Passed';
  const bugs = [...new Set(tests.filter((t) => t.outcome === 'known-bug').flatMap((t) => t.bugs))];
  const flags = [];
  if (outcomes.includes('fail')) flags.push('new failure');
  if (outcomes.includes('other-failure')) flags.push('failed for another reason');
  if (outcomes.includes('fixed?')) flags.push('a known bug may be fixed — retest');
  return { ...tc, result, source: 'Automation', bugs, notes: [manual.notes, ...flags].filter(Boolean).join(' · '), autoTests: tests };
}

function resolveBug(bug, cases, run) {
  // A bug is "Retest" when every automated test that tracks it now passes unexpectedly.
  const tracking = run ? run.tests.filter((t) => t.bugs.includes(bug.id)) : [];
  const allFixed = tracking.length > 0 && tracking.every((t) => t.outcome === 'fixed?');
  const effectiveStatus = bug.status === 'Open' && allFixed ? 'Retest' : bug.status;
  const automatedBy = tracking.length;
  return { ...bug, effectiveStatus, automatedBy };
}

function validateTraceability(requirements, cases, bugs) {
  const reqIds = new Set(requirements.map((r) => r.id));
  const bugIds = new Set(bugs.map((b) => b.id));
  const problems = [];
  for (const c of cases) {
    c.requirements.filter((r) => !reqIds.has(r)).forEach((r) => problems.push(`${c.id} references unknown requirement ${r}`));
    (c.manual?.bugs ?? []).filter((b) => !bugIds.has(b)).forEach((b) => problems.push(`${c.id} references unknown bug ${b}`));
  }
  for (const b of bugs) {
    b.requirements.filter((r) => !reqIds.has(r)).forEach((r) => problems.push(`${b.id} references unknown requirement ${r}`));
  }
  if (problems.length) throw new Error(`Traceability errors:\n  ${problems.join('\n  ')}`);
}

function buildVerdict(caseTotals, bugs, run) {
  const open = bugs.filter((b) => b.effectiveStatus !== 'Fixed');
  const critical = open.filter((b) => b.severity === 'Critical').length;
  const high = open.filter((b) => b.severity === 'High').length;
  const p1 = open.filter((b) => b.priority === 'P1').length;
  const go = critical === 0 && high === 0;
  const passRate = caseTotals.executed ? Math.round((caseTotals.passed / caseTotals.executed) * 100) : 0;
  const unexpected = run ? run.totals.fail + run.totals.otherFailure : 0;
  const line = go
    ? `GO — no Critical or High defects open; ${passRate}% of executed test cases pass.`
    : `NO-GO — ${critical} Critical and ${high} High defects are open (${p1} must-fix P1); only ${passRate}% of executed test cases pass.`;
  return { go, line, critical, high, p1, passRate, unexpected };
}

function countBy(items, key) {
  const map = new Map();
  for (const item of items) map.set(key(item), (map.get(key(item)) ?? 0) + 1);
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export function writeFile(relativePath, content) {
  const file = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}
