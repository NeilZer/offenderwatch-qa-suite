import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestError, TestResult, TestStep } from '@playwright/test/reporter';
import { PlatformClient, platformSettings } from './platform-client';

/**
 * Playwright reporter that PUSHES results to the Test Management Platform while the suite runs
 * (TM-03 real time, TM-08 evidence). Registered in playwright.config.ts only when PLATFORM_URL is set.
 *
 *   onBegin     → every scenario announced → shown as "queued"
 *   onTestBegin → "running"
 *   onTestEnd   → evidence uploaded (log, screenshot, API request/response, error context, trace)
 *                 then the final status: Passed / Failed / ExpectedFailure / UnexpectedPass / Skipped
 *   onEnd       → run finished
 *
 * Calls go through one sequential queue, so the platform receives them in order even though
 * Playwright does not await reporter hooks. Reporting problems are logged, never fail the suite.
 */

const ROOT = path.resolve(__dirname, '..', '..');
const LOGGED_STEP_CATEGORIES = new Set(['test.step', 'pw:api', 'expect', 'hook']);

interface KnownBugMeta {
  id: string;
  title: string;
  severity?: string;
}

class PlatformReporter implements Reporter {
  private readonly client: PlatformClient | null;
  private queue: Promise<unknown> = Promise.resolve();
  private resultIds = new Map<string, number>();
  /** Set when the run could not be announced: nothing else can be reported, so stay quiet. */
  private disabled = false;
  private logs = new Map<string, string[]>();
  private readonly bugCatalog = loadBugCatalog();

  constructor() {
    const settings = platformSettings();
    this.client = settings ? new PlatformClient(settings) : null;
    if (!this.client) console.warn('[platform] PLATFORM_URL / PLATFORM_TOKEN / PLATFORM_RUN_ID not set — reporter disabled.');
  }

  printsToStdio(): boolean {
    return false;
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    const scenarios = suite.allTests().map((test) => ({
      key: scenarioKey(test),
      title: test.title,
      file: relativeFile(test),
      project: test.parent.project()?.name ?? '',
      tags: test.tags.map((t) => t.replace(/^@/, '')),
    }));
    this.enqueue('begin', async () => {
      try {
        const response = await this.client!.post<{ resultIdsByKey: Record<string, number> }>('/begin', {
          suiteVersion: suiteVersion(),
          scenarios,
        });
        this.resultIds = new Map(Object.entries(response?.resultIdsByKey ?? {}));
      } catch (error) {
        this.disabled = true;
        console.error(`[platform] Could not announce the run — results of this run will NOT reach the platform. ${(error as Error).message}`);
      }
    });
  }

  onTestBegin(test: TestCase): void {
    this.logs.set(test.id, [`${stamp()} ▶ ${test.title}`, `   ${relativeFile(test)} · project ${test.parent.project()?.name}`]);
    this.enqueue(`start ${test.title}`, () => this.client!.post(`/scenarios/${this.resultId(test)}/start`, {}));
  }

  onStdOut(chunk: string | Buffer, test?: TestCase): void {
    if (test) this.log(test, `${stamp()} [stdout] ${String(chunk).trimEnd()}`);
  }

  onStdErr(chunk: string | Buffer, test?: TestCase): void {
    if (test) this.log(test, `${stamp()} [stderr] ${String(chunk).trimEnd()}`);
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    if (LOGGED_STEP_CATEGORIES.has(step.category)) this.log(test, `${stamp()} ${indent(step)}→ ${step.title}`);
  }

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    if (!LOGGED_STEP_CATEGORIES.has(step.category)) return;
    const outcome = step.error ? `✗ ${firstLine(step.error.message)}` : '✓';
    this.log(test, `${stamp()} ${indent(step)}${outcome} ${step.title} (${step.duration} ms)`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const status = mapStatus(test, result);
    const error = result.errors[0];
    const knownBugs = this.knownBugs(test);
    const log = this.buildLog(test, result, status);
    this.logs.delete(test.id);

    this.enqueue(`finish ${test.title}`, async () => {
      const id = this.resultId(test);
      await this.uploadEvidence(id, test, result, status, log);
      await this.client!.post(`/scenarios/${id}/finish`, {
        status,
        durationMs: result.duration,
        errorMessage: error ? stripAnsi(error.message ?? error.value ?? '') : null,
        errorStack: error ? stripAnsi(error.stack ?? '') : null,
        knownBugs,
      });
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    if (!this.client) return;
    this.enqueue('end', () => this.client!.post('/end', { status: result.status }));
    await this.queue;
  }

  // ------------------------------------------------------------------ helpers
  private enqueue(label: string, action: () => Promise<unknown>): void {
    if (!this.client) return;
    this.queue = this.queue
      .then(() => (this.disabled ? undefined : action()))
      .catch((error) => console.error(`[platform] ${label} failed: ${(error as Error).message}`));
  }

  private resultId(test: TestCase): number {
    const id = this.resultIds.get(scenarioKey(test));
    if (!id) throw new Error(`Platform has no scenario for "${test.title}"`);
    return id;
  }

  private log(test: TestCase, line: string): void {
    this.logs.get(test.id)?.push(line);
  }

  private buildLog(test: TestCase, result: TestResult, status: string): string {
    const lines = [...(this.logs.get(test.id) ?? [])];
    lines.push(`${stamp()} ■ ${status} in ${result.duration} ms`);
    for (const a of test.annotations) lines.push(`   annotation ${a.type}: ${a.description ?? ''}`);
    result.errors.forEach((e: TestError, i) => {
      lines.push('', `--- error ${i + 1} ---`, stripAnsi(e.message ?? e.value ?? ''), stripAnsi(e.stack ?? ''));
    });
    return lines.join('\n');
  }

  private knownBugs(test: TestCase): KnownBugMeta[] {
    return test.annotations
      .filter((a) => a.type === 'known-bug' && a.description)
      .map((a) => {
        const id = a.description!.split(' ')[0];
        return this.bugCatalog.get(id) ?? { id, title: a.description!.replace(/^\S+\s+—\s*/, '') };
      });
  }

  /** TM-08: log always; screenshot (UI) and request/response (API) always; error context + trace on failure. */
  private async uploadEvidence(resultId: number, test: TestCase, result: TestResult, status: string, log: string): Promise<void> {
    const base = `/scenarios/${resultId}/evidence`;
    await this.client!.upload(base, 'log', 'execution.log', 'text/plain', Buffer.from(log, 'utf8'));
    const failed = status === 'Failed' || status === 'ExpectedFailure' || status === 'UnexpectedPass';

    const uploadedOnce = new Set<string>();
    for (const attachment of result.attachments) {
      const kind = evidenceKind(attachment.name, attachment.contentType);
      if (!kind) continue;
      if (kind === 'errorcontext' || kind === 'trace') {
        if (uploadedOnce.has(kind)) continue; // Playwright may attach one per page — one is enough
        uploadedOnce.add(kind);
      }
      if (kind === 'trace' && status !== 'Failed') continue; // traces are large: keep them for real failures
      if (kind === 'errorcontext' && !failed) continue;
      const bytes = attachment.body ?? (attachment.path && fs.existsSync(attachment.path) ? fs.readFileSync(attachment.path) : null);
      if (!bytes) continue;
      const name = attachment.path ? path.basename(attachment.path) : `${attachment.name}${extensionFor(attachment.contentType)}`;
      await this.client!.upload(base, kind, name, attachment.contentType, bytes);
    }
  }
}

// ------------------------------------------------------------------ pure helpers
/** Stable identity of a scenario across runs: project › file › describe(s) › title. */
function scenarioKey(test: TestCase): string {
  const [, project, , ...titles] = test.titlePath();
  return [project, relativeFile(test), ...titles].join(' › ');
}

function relativeFile(test: TestCase): string {
  return path.relative(ROOT, test.location.file).replace(/\\/g, '/');
}

/**
 * Playwright → platform status.
 *   expected to pass:  passed → Passed ; failed / timedOut → Failed
 *   expected to fail (knownBug): failed / timedOut → ExpectedFailure ; passed → UnexpectedPass
 */
function mapStatus(test: TestCase, result: TestResult): string {
  if (result.status === 'skipped') return 'Skipped';
  if (result.status === 'interrupted') return 'Interrupted';
  const passed = result.status === 'passed';
  if (test.expectedStatus === 'failed') return passed ? 'UnexpectedPass' : 'ExpectedFailure';
  return passed ? 'Passed' : 'Failed';
}

function evidenceKind(name: string, contentType: string): string | null {
  if (name === 'screenshot' || contentType === 'image/png') return 'screenshot';
  if (name === 'api-exchanges') return 'apiexchange';
  if (name === 'error-context') return 'errorcontext';
  if (name === 'trace') return 'trace';
  if (name === 'page-errors' || name.startsWith('PUT request')) return 'other';
  return null;
}

function extensionFor(contentType: string): string {
  if (contentType.includes('json')) return '.json';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('markdown')) return '.md';
  return '.txt';
}

/** Fingerprint of the suite's code (tests + src) — "no code change" for flakiness detection (B-01). */
function suiteVersion(): string {
  const hash = crypto.createHash('sha256');
  for (const dir of ['tests', 'src']) {
    for (const file of listFiles(path.join(ROOT, dir))) {
      hash.update(path.relative(ROOT, file));
      hash.update(fs.readFileSync(file));
    }
  }
  return hash.digest('hex').slice(0, 12);
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => (entry.isDirectory() ? listFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]))
    .sort();
}

/** Optional metadata (title + severity) for the bug ids in knownBug() annotations. */
function loadBugCatalog(): Map<string, KnownBugMeta> {
  const file = path.join(ROOT, 'qa', 'bugs.json');
  try {
    const { bugs } = JSON.parse(fs.readFileSync(file, 'utf8')) as { bugs: KnownBugMeta[] };
    return new Map(bugs.map((b) => [b.id, { id: b.id, title: b.title, severity: b.severity }]));
  } catch {
    return new Map();
  }
}

function indent(step: TestStep): string {
  let depth = 0;
  for (let p = step.parent; p; p = p.parent) depth += 1;
  return '  '.repeat(depth + 1);
}

const stamp = () => new Date().toISOString().slice(11, 23);
const stripAnsi = (s: string) => s.replace(/\u001b\[[0-9;]*m/g, '');
const firstLine = (s?: string) => stripAnsi(s ?? '').split('\n')[0];

export default PlatformReporter;
