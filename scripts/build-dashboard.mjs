/**
 * Part 4 — QA dashboard. Generates dashboard/index.html, a single self-contained page
 * (no external scripts or fonts — opens offline, can be attached to an email).
 *
 * Every number comes from buildModel(): test cases + bug reports + the LATEST Playwright run
 * (reports/results.json). Re-run `npm run qa` and the dashboard updates itself.
 */
import { buildModel, writeFile } from './lib/qa-model.mjs';

const m = buildModel();

// ------------------------------------------------------------------ helpers
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDuration = (ms) => (ms >= 60_000 ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s` : `${Math.round(ms / 1000)}s`);

const SEVERITY_CLASS = { Critical: 'critical', High: 'serious', Medium: 'warning', Low: 'neutral' };
const RESULT_CLASS = { Passed: 'good', Failed: 'critical', Blocked: 'serious', 'Not run': 'neutral' };
const RESULT_ICON = { Passed: '✓', Failed: '✕', Blocked: '!', 'Not run': '–', 'Partly run': '–', 'Not covered': '–' };

/** Tall segmented bar: one whole split into parts (each part labelled when wide enough). */
function segmentedBar(parts, label) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const blocks = parts
    .filter((p) => p.value > 0)
    .map((p) => {
      const share = pct(p.value, total);
      const text = share >= 8 ? `<span>${p.value}</span>` : '';
      return `<div class="seg ${p.cls}" style="flex:${p.value}" title="${esc(p.name)}: ${p.value} (${share}%)" tabindex="0" aria-label="${esc(p.name)}: ${p.value}, ${share}%">${text}</div>`;
    })
    .join('');
  const legend = parts
    .map((p) => `<li><i class="sw ${p.cls}"></i>${esc(p.name)} <b>${p.value}</b>${p.value ? ` <span class="share">· ${pct(p.value, total)}%</span>` : ''}</li>`)
    .join('');
  return `<div class="segbar" role="img" aria-label="${esc(label)}">${blocks}</div><ul class="legend">${legend}</ul>`;
}

/** Horizontal bars on one baseline, natural order. */
function barList(rows) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return `<ul class="bars">${rows
    .map(
      (r) => `<li title="${esc(r.name)}: ${r.value}">
        <span class="bar-name">${esc(r.name)}</span>
        <span class="bar-track"><span class="bar ${r.cls}" style="width:${(r.value / max) * 100}%"></span></span>
        <span class="bar-val">${r.value}</span></li>`,
    )
    .join('')}</ul>`;
}

const pill = (text, cls, icon = '') => `<span class="pill ${cls}">${icon ? `<i aria-hidden="true">${icon}</i>` : ''}${esc(text)}</span>`;

// ------------------------------------------------------------------ sections
const t = m.caseTotals;
const run = m.run;
const v = m.verdict;
/** Shown time = when the run FINISHED (start + duration), i.e. when these results came to exist. */
const runFinishedAt = run?.startedAt ? new Date(Date.parse(run.startedAt) + run.durationMs).toISOString() : null;

const header = `
<header class="top">
  <div>
    <p class="eyebrow">QA testing phase · status report</p>
    <h1>OffenderWatch Monitoring Console</h1>
    <p class="sub">Environment: <code>${esc(m.tcMeta.environment)}</code></p>
  </div>
  <dl class="stamp">
    <div><dt>Latest automation run finished</dt><dd>${fmtDate(runFinishedAt)}${run ? ` <span class="took">· took ${fmtDuration(run.durationMs)}</span>` : ''}</dd></div>
    <div><dt>Dashboard generated</dt><dd>${fmtDate(m.generatedAt)}</dd></div>
  </dl>
</header>`;

const verdict = `
<section class="verdict ${v.go ? 'go' : 'nogo'}" aria-label="Release recommendation">
  <span class="verdict-badge">${v.go ? '✓ GO' : '✕ NO-GO'}</span>
  <p>${esc(v.line.replace(/^(NO-GO|GO) — /, ''))}</p>
</section>`;

const kpis = [
  { label: 'Test cases', value: t.total, note: `${t.automated} automated · ${t.manual} manual` },
  { label: 'Executed', value: t.executed, note: `${pct(t.executed, t.total)}% of the suite` },
  { label: 'Passed', value: t.passed, note: `${pct(t.passed, t.executed)}% of executed`, cls: 'good' },
  { label: 'Failed', value: t.failed, note: `${pct(t.failed, t.executed)}% of executed · all have bug reports`, cls: 'critical' },
  { label: 'Blocked / not run', value: t.blocked + t.notRun, note: t.blocked + t.notRun ? '' : 'nothing outstanding' },
];
const kpiRow = `<section class="kpis" aria-label="Test execution status">${kpis
  .map(
    (k) => `<div class="kpi"><span class="kpi-label">${k.cls ? `<i class="dot ${k.cls}"></i>` : ''}${k.label}</span><b>${k.value}</b><small>${esc(k.note)}</small></div>`,
  )
  .join('')}</section>`;

const execution = `
<article class="card">
  <h2>Test execution</h2>
  <p class="hero">${v.passRate}<span>%</span></p>
  <p class="muted">of executed test cases pass</p>
  ${segmentedBar(
    [
      { name: 'Passed', value: t.passed, cls: 'good' },
      { name: 'Failed', value: t.failed, cls: 'critical' },
      { name: 'Blocked', value: t.blocked, cls: 'serious' },
      { name: 'Not run', value: t.notRun, cls: 'neutral' },
    ],
    'Test case results',
  )}
</article>`;

const runLine = run
  ? `<ul class="facts">
      <li><b>${run.totals.total}</b> automated tests <span class="muted">(${run.byProject.ui ?? 0} UI · ${run.byProject.api ?? 0} API)</span> in ${fmtDuration(run.durationMs)}</li>
      <li>${pill(`${run.totals.pass} passed`, 'good', '✓')}</li>
      <li>${pill(`${run.totals.knownBug} failed on a documented bug`, 'critical', '✕')} <span class="muted">expected — each linked to its BUG-xx</span></li>
      <li>${pill(`${run.totals.fail + run.totals.otherFailure} unexpected failures`, run.totals.fail + run.totals.otherFailure ? 'serious' : 'neutral', run.totals.fail + run.totals.otherFailure ? '!' : '✓')}</li>
      <li>${pill(`${run.totals.fixed} bugs look fixed — retest`, run.totals.fixed ? 'warning' : 'neutral', run.totals.fixed ? '↻' : '–')}</li>
    </ul>`
  : '<p class="muted">No automation run found — run <code>npm run qa</code>.</p>';

const automation = `
<article class="card">
  <h2>Automation</h2>
  ${segmentedBar(
    [
      { name: 'Automated · UI', value: t.automatedUi, cls: 's1' },
      { name: 'Automated · API', value: t.automatedApi, cls: 's3' },
      { name: 'Manual', value: t.manual, cls: 'neutral' },
    ],
    'Automated versus manual test cases',
  )}
  <h3>Latest run</h3>
  ${runLine}
</article>`;

const d = m.defects;
const defects = `
<article class="card">
  <h2>Defects <span class="count">${d.total}</span></h2>
  <h3>By severity</h3>
  ${barList(d.bySeverity.map((s) => ({ name: s.severity, value: s.count, cls: SEVERITY_CLASS[s.severity] })))}
  <h3>By status</h3>
  <div class="status-row">${d.byStatus
    .map((s) => `<div class="mini"><b>${s.count}</b><span>${s.status}</span></div>`)
    .join('')}</div>
  <p class="muted small">Layer: ${d.byLayer.map((l) => `${l.count} ${esc(l.name)}`).join(' · ')}</p>
</article>`;

const areas = [...new Set(m.coverage.map((r) => r.area))];
const coverage = `
<section class="card wide" aria-label="Requirement coverage">
  <h2>Requirement coverage <span class="count">${m.coverage.filter((r) => r.cases.length).length}/${m.coverage.length} covered</span></h2>
  <p class="muted">${m.coverage.filter((r) => r.state === 'Passed').length} requirements pass · ${m.coverage.filter((r) => r.state === 'Failed').length} fail. A requirement fails if any of its test cases fails.</p>
  ${areas
    .map(
      (area) => `<h3>${esc(area)}</h3><div class="reqs">${m.coverage
        .filter((r) => r.area === area)
        .map(
          (r) => `<div class="req ${RESULT_CLASS[r.state] ?? 'neutral'}" title="${esc(r.summary)}">
            <div class="req-head"><b>${r.id}</b>${pill(r.state, RESULT_CLASS[r.state] ?? 'neutral', RESULT_ICON[r.state])}</div>
            <p>${esc(r.summary)}</p>
            <small>${r.cases.length} cases · ${r.passed} pass · ${r.failed} fail${r.bugs.length ? ` · ${r.bugs.join(', ')}` : ''}</small>
          </div>`,
        )
        .join('')}</div>`,
    )
    .join('')}
</section>`;

const sevRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const bugTable = `
<section class="card wide" aria-label="Open defects">
  <h2>Open defects</h2>
  <div class="table-wrap"><table>
    <thead><tr><th>ID</th><th>Defect</th><th>Severity</th><th>Priority</th><th>Requirement</th><th>Layer</th><th>Status</th></tr></thead>
    <tbody>${[...m.bugs]
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || a.priority.localeCompare(b.priority))
      .map(
        (b) => `<tr><td class="mono">${b.id}</td><td>${esc(b.title)}</td><td>${pill(b.severity, SEVERITY_CLASS[b.severity])}</td><td>${b.priority}</td><td>${b.requirements.join(', ')}</td><td>${esc(b.layer)}</td><td>${esc(b.effectiveStatus)}</td></tr>`,
      )
      .join('')}</tbody>
  </table></div>
</section>`;

const caseTable = `
<section class="card wide">
  <details>
    <summary><h2>All ${t.total} test cases</h2><span class="muted">show</span></summary>
    <div class="table-wrap"><table>
      <thead><tr><th>ID</th><th>Test case</th><th>Req.</th><th>Priority</th><th>Type</th><th>Automation</th><th>Result</th><th>Bugs</th></tr></thead>
      <tbody>${m.cases
        .map(
          (c) => `<tr><td class="mono">${c.id}</td><td>${esc(c.title)}</td><td>${c.requirements.join(', ')}</td><td>${c.priority}</td><td>${c.type}</td><td>${c.automation}</td><td>${pill(c.result, RESULT_CLASS[c.result], RESULT_ICON[c.result])}</td><td class="mono">${c.bugs.join(', ') || '—'}</td></tr>`,
        )
        .join('')}</tbody>
    </table></div>
  </details>
</section>`;

// ------------------------------------------------------------------ page
const css = `
:root{color-scheme:light;
  --page:#f9f9f7;--surface:#fcfcfb;--ink:#0b0b0b;--ink-2:#52514e;--muted:#898781;--line:#e1e0d9;--ring:rgba(11,11,11,.10);
  --good:#0ca30c;--warning:#fab219;--serious:#ec835a;--critical:#d03b3b;--neutral:#c3c2b7;
  --s1:#2a78d6;--s3:#1baf7a;--good-ink:#006300;--critical-ink:#b22f2f;
  --nogo-bg:#fdf0ef;--go-bg:#eef8ee}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;
  --page:#0d0d0d;--surface:#1a1a19;--ink:#f0efec;--ink-2:#c3c2b7;--muted:#898781;--line:#2c2c2a;--ring:rgba(255,255,255,.10);
  --neutral:#4a4a47;--s1:#3987e5;--s3:#199e70;--good-ink:#0ca30c;--critical-ink:#e66767;--nogo-bg:#2a1615;--go-bg:#142414}}
:root[data-theme="dark"]{color-scheme:dark;
  --page:#0d0d0d;--surface:#1a1a19;--ink:#f0efec;--ink-2:#c3c2b7;--muted:#898781;--line:#2c2c2a;--ring:rgba(255,255,255,.10);
  --neutral:#4a4a47;--s1:#3987e5;--s3:#199e70;--good-ink:#0ca30c;--critical-ink:#e66767;--nogo-bg:#2a1615;--go-bg:#142414}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:32px 20px 48px}
h1{font-size:26px;line-height:1.2;margin:2px 0 6px;font-weight:650;letter-spacing:-.01em}
h2{font-size:15px;margin:0 0 12px;font-weight:650;display:flex;align-items:center;gap:8px}
h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:18px 0 8px;font-weight:600}
code{font:12px ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--ink-2);word-break:break-all}
.eyebrow{margin:0;color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.sub,.muted{color:var(--ink-2)}.muted{font-size:13px}.small{font-size:12px;margin:12px 0 0}
.top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px}
.top .sub{margin:0}
.took{font-weight:400;color:var(--ink-2)}.share{color:var(--muted)}
.stamp{display:flex;gap:24px;margin:0;flex-wrap:wrap}.stamp dt{font-size:12px;color:var(--muted)}.stamp dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums}
.verdict{display:flex;align-items:center;gap:16px;border-radius:14px;padding:16px 20px;margin-bottom:16px;box-shadow:inset 0 0 0 1px var(--ring)}
.verdict.nogo{background:var(--nogo-bg)}.verdict.go{background:var(--go-bg)}
.verdict p{margin:0;font-size:16px;font-weight:500}
.verdict-badge{flex:none;font-weight:750;font-size:18px;color:#fff;border-radius:999px;padding:6px 16px;letter-spacing:.02em}
.nogo .verdict-badge{background:var(--critical)}.go .verdict-badge{background:var(--good)}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px}
.kpi{background:var(--surface);border-radius:12px;padding:14px 16px;box-shadow:inset 0 0 0 1px var(--ring);display:flex;flex-direction:column;gap:2px}
.kpi-label{color:var(--ink-2);font-size:13px;display:flex;align-items:center;gap:6px}
.kpi b{font-size:30px;font-weight:650;line-height:1.2}.kpi small{color:var(--muted);font-size:12px}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-bottom:16px}
.card{background:var(--surface);border-radius:14px;padding:20px;box-shadow:inset 0 0 0 1px var(--ring);min-width:0}
.card.wide{margin-bottom:16px}
.count{font-size:12px;font-weight:600;color:var(--ink-2);background:var(--page);border-radius:999px;padding:1px 9px;box-shadow:inset 0 0 0 1px var(--ring)}
.hero{font-size:56px;font-weight:650;line-height:1;margin:4px 0 2px}.hero span{font-size:28px;color:var(--ink-2)}
.segbar{display:flex;gap:2px;height:28px;margin:16px 0 10px}
.seg{border-radius:4px;display:flex;align-items:center;padding-left:8px;color:#fff;font-weight:650;font-size:13px;min-width:4px;outline-offset:2px}
.seg.warning{color:#0b0b0b}
.legend{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13px;color:var(--ink-2)}
.legend li{display:flex;align-items:center;gap:6px}.legend b{color:var(--ink)}
.sw{width:10px;height:10px;border-radius:3px;display:inline-block}
.good{--c:var(--good)}.warning{--c:var(--warning)}.serious{--c:var(--serious)}.critical{--c:var(--critical)}.neutral{--c:var(--neutral)}.s1{--c:var(--s1)}.s3{--c:var(--s3)}
.seg,.sw,.dot,.bar{background:var(--c)}
.bars{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.bars li{display:grid;grid-template-columns:72px 1fr 28px;align-items:center;gap:10px}
.bar-name{color:var(--ink-2);font-size:13px}.bar-val{font-weight:650;text-align:right;font-variant-numeric:tabular-nums}
.bar-track{height:12px;border-radius:0 4px 4px 0;box-shadow:inset 1px 0 0 var(--neutral)}
.bar{display:block;height:100%;border-radius:0 4px 4px 0;min-width:0}
.status-row{display:flex;gap:8px}
.mini{flex:1;background:var(--page);border-radius:10px;padding:8px 12px;box-shadow:inset 0 0 0 1px var(--ring)}
.mini b{display:block;font-size:20px}.mini span{font-size:12px;color:var(--ink-2)}
.facts{list-style:none;margin:0;padding:0;display:grid;gap:8px;font-size:13px}
.pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:1px 9px 1px 7px;font-size:12px;font-weight:600;white-space:nowrap;
  background:color-mix(in srgb,var(--c) 16%,transparent);color:var(--ink);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 45%,transparent)}
.pill i{font-style:normal;color:var(--c);font-weight:800}
.pill.good i{color:var(--good-ink)}.pill.critical i{color:var(--critical-ink)}
.reqs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.req{border-radius:10px;padding:12px 14px;background:var(--page);box-shadow:inset 3px 0 0 var(--c),inset 0 0 0 1px var(--ring)}
.req-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
.req p{margin:6px 0 4px;font-size:13px;color:var(--ink-2);line-height:1.4}.req small{color:var(--muted);font-size:12px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-weight:600;color:var(--muted);font-size:12px;padding:8px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr:hover{background:var(--page)}
.mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
details summary{display:flex;align-items:center;gap:10px;cursor:pointer;list-style:none}
details summary::-webkit-details-marker{display:none}details summary h2{margin:0}
details[open] summary .muted{display:none}details[open] summary{margin-bottom:12px}
footer{color:var(--muted);font-size:12px;text-align:center;margin-top:24px}
@media (max-width:560px){.hero{font-size:44px}.verdict{flex-direction:column;align-items:flex-start}}
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OffenderWatch QA Status</title>
<style>${css}</style>
</head>
<body>
<main class="wrap">
${header}
${verdict}
${kpiRow}
<div class="grid">${execution}${automation}${defects}</div>
${coverage}
${bugTable}
${caseTable}
<footer>Generated by <code>npm run dashboard</code> from qa/test-cases.json, qa/bugs.json and reports/results.json — numbers are never typed by hand.</footer>
</main>
</body>
</html>
`;

console.log(`Dashboard written: ${writeFile('dashboard/index.html', html)}`);
console.log(`Verdict: ${v.line}`);
