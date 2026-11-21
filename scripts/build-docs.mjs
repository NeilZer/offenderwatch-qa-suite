/**
 * Generates the human-readable deliverables from the qa/*.json sources:
 *   docs/TEST_CASES.md     Part 1 — test suite with traceability matrix and execution results
 *   docs/test-cases.csv    same suite, opens in Excel / Google Sheets
 *   docs/BUG_REPORTS.md    Part 2 — bug reports
 *
 * Run: npm run docs   (after `npm test` to include the latest automation results)
 */
import { buildModel, writeFile } from './lib/qa-model.mjs';

const model = buildModel();
const resultIcon = { Passed: '✅ Passed', Failed: '❌ Failed', Blocked: '⛔ Blocked', 'Not run': '⏸ Not run' };
const cell = (text) => String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

// ------------------------------------------------------------------ TEST_CASES.md
function testCasesMarkdown() {
  const t = model.caseTotals;
  const lines = [];
  lines.push('# OffenderWatch — Test Case Suite (Part 1)', '');
  lines.push(`> Generated from \`qa/test-cases.json\` on ${model.generatedAt.slice(0, 10)}. Do not edit by hand — edit the JSON and run \`npm run docs\`.`, '');
  lines.push(`**Environment:** ${model.tcMeta.environment}  `);
  lines.push(`**Executed:** ${model.tcMeta.executedOn} by ${model.tcMeta.executedBy}  `);
  lines.push(`**Result source:** automated cases use the latest automation run${model.run ? ` (${model.run.startedAt?.slice(0, 16).replace('T', ' ')} UTC)` : ' (no run found — manual results shown)'}; manual cases use the manual execution.`, '');
  lines.push('## Summary', '');
  lines.push('| Total | Executed | Passed | Failed | Blocked | Not run | Automated (UI / API) | Manual |');
  lines.push('|---|---|---|---|---|---|---|---|');
  lines.push(`| ${t.total} | ${t.executed} | ${t.passed} | ${t.failed} | ${t.blocked} | ${t.notRun} | ${t.automated} (${t.automatedUi} / ${t.automatedApi}) | ${t.manual} |`, '');

  lines.push('## Design approach', '');
  lines.push('- **Risk first.** High priority = wrong or hidden safety data for an operator (risk level, latest reading, trail order, unreachable offenders) and data integrity (uniqueness, cascade delete). Low = cosmetic / defensive edge cases.');
  lines.push('- **Both layers, compared.** Every UI-visible rule is checked against the API value, so a failure can be placed in the UI, API or data layer (assignment §6).');
  lines.push('- **Negative & boundary cases** for every validation rule (FR-03, FR-10, API-03): each invalid value just outside the range, and the valid boundary itself (TC-42) so over-strict validation is caught too.');
  lines.push('- **One case = one requirement idea.** Data-driven variants (e.g. 10 invalid location values) are one case with several automated rows, keeping the suite focused (52 cases) instead of padded.');
  lines.push('- **Type:** UI / API / Data (stored-data consistency) / Negative (invalid input or error path).', '');

  lines.push('## Traceability matrix', '');
  lines.push('| Requirement | Summary | Test cases | State | Bugs |');
  lines.push('|---|---|---|---|---|');
  for (const r of model.coverage) {
    lines.push(`| **${r.id}** | ${cell(r.summary)} | ${r.cases.join(', ')} | ${r.state === 'Passed' ? '✅' : r.state === 'Failed' ? '❌' : '⏸'} ${r.state} | ${r.bugs.join(', ') || '—'} |`);
  }
  lines.push('');

  lines.push('## Test cases at a glance', '');
  lines.push('| ID | Title | Req. | Priority | Type | Automation | Result | Bugs |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const c of model.cases) {
    lines.push(`| [${c.id}](#${c.id.toLowerCase()}) | ${cell(c.title)} | ${c.requirements.join(', ')} | ${c.priority} | ${c.type} | ${c.automation} | ${resultIcon[c.result]} | ${c.bugs.join(', ') || '—'} |`);
  }
  lines.push('');

  lines.push('## Test case details', '');
  for (const c of model.cases) {
    lines.push(`### ${c.id}`, '');
    lines.push(`**${c.title}**`, '');
    lines.push('| | |', '|---|---|');
    lines.push(`| Requirements | ${c.requirements.join(', ')} |`);
    lines.push(`| Priority / Type | ${c.priority} / ${c.type} |`);
    lines.push(`| URL / endpoint | \`${cell(c.url)}\` |`);
    lines.push(`| Preconditions | ${cell(c.preconditions)} |`);
    lines.push(`| Steps | ${c.steps.map((s, i) => `${i + 1}. ${cell(s)}`).join('<br>')} |`);
    lines.push(`| Expected result | ${cell(c.expected)} |`);
    lines.push(`| Automation | ${c.automation}${c.spec ? ` — \`${c.spec}\`` : ''} |`);
    lines.push(`| Result | ${resultIcon[c.result]} (${c.source})${c.bugs.length ? ` — ${c.bugs.join(', ')}` : ''} |`);
    if (c.notes) lines.push(`| Notes | ${cell(c.notes)} |`);
    lines.push('');
  }
  return lines.join('\n');
}

// ------------------------------------------------------------------ CSV
function testCasesCsv() {
  const header = ['ID', 'Title', 'Requirements', 'Priority', 'Type', 'URL / endpoint', 'Preconditions', 'Steps', 'Expected result', 'Automation', 'Spec', 'Result', 'Result source', 'Bugs', 'Notes'];
  const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = model.cases.map((c) => [
    c.id, c.title, c.requirements.join(', '), c.priority, c.type, c.url, c.preconditions,
    c.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'), c.expected, c.automation, c.spec ?? '', c.result, c.source, c.bugs.join(', '), c.notes,
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(quote).join(',')).join('\r\n');
}

// ------------------------------------------------------------------ BUG_REPORTS.md
function bugReportsMarkdown() {
  const lines = [];
  const d = model.defects;
  lines.push('# OffenderWatch — Bug Reports (Part 2)', '');
  lines.push(`> Generated from \`qa/bugs.json\`. Reported ${model.bugMeta.reportedOn} by ${model.bugMeta.reportedBy}.  `);
  lines.push(`> Environment: ${model.bugMeta.environment}`, '');
  lines.push('## Summary', '');
  lines.push(`**${d.total} defects** — ${d.bySeverity.map((s) => `${s.count} ${s.severity}`).join(' · ')}  `);
  lines.push(`Status: ${d.byStatus.map((s) => `${s.count} ${s.status}`).join(' · ')}  `);
  lines.push(`Layer: ${d.byLayer.map((l) => `${l.count} ${l.name}`).join(' · ')}`, '');
  lines.push('| ID | Title | Severity | Priority | Requirement | Layer | Status | Test cases |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const b of model.bugs) {
    lines.push(`| [${b.id}](#${b.id.toLowerCase()}) | ${cell(b.title)} | ${b.severity} | ${b.priority} | ${b.requirements.join(', ')} | ${b.layer} | ${b.effectiveStatus} | ${b.testCases.join(', ')} |`);
  }
  lines.push('', '### Severity & priority scale', '');
  for (const [k, v] of Object.entries(model.bugMeta.severityScale)) lines.push(`- **${k}** — ${v}`);
  for (const [k, v] of Object.entries(model.bugMeta.priorityScale)) lines.push(`- **${k}** — ${v}`);
  lines.push('');
  lines.push('### How the layer was decided', '');
  lines.push('For every defect the API response was compared with what the UI displays (and, for UI defects, with the request the UI sent). If the API already returns the wrong thing, the defect is in the API/data layer; if the API is right and the screen is wrong, it is in the UI. Where both contribute, the primary layer is named first.', '');

  for (const b of model.bugs) {
    lines.push('---', '', `## ${b.id}`, '', `### ${b.title}`, '');
    lines.push('| Severity | Priority | Requirement | Layer | Status | Test cases |');
    lines.push('|---|---|---|---|---|---|');
    lines.push(`| **${b.severity}** | ${b.priority} | ${b.requirements.join(', ')} | ${b.layer} | ${b.effectiveStatus} | ${b.testCases.join(', ')} |`, '');
    lines.push('**Steps to reproduce**', '');
    b.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('', `**Expected:** ${b.expected}`, '', `**Actual:** ${b.actual}`, '');
    lines.push(`**Layer analysis — ${b.layer}:** ${b.layerAnalysis}`, '');
    lines.push('**Evidence**', '', '```', b.evidence, '```', '');
    lines.push(`**Impact:** ${b.impact}`, '');
    if (b.automatedBy) lines.push(`_Tracked by ${b.automatedBy} automated test(s), marked as expected failures with \`knownBug('${b.id}')\`._`, '');
  }
  return lines.join('\n');
}

const written = [
  writeFile('docs/TEST_CASES.md', testCasesMarkdown()),
  writeFile('docs/test-cases.csv', testCasesCsv()),
  writeFile('docs/BUG_REPORTS.md', bugReportsMarkdown()),
];
console.log(`Docs written:\n  ${written.join('\n  ')}`);
