/**
 * Talks to the Test Management Platform (Part 5). Used by:
 *  - the Playwright reporter (main process) to push run / scenario results and evidence;
 *  - the TestDataTracker (worker processes) to register the data a scenario creates (TM-06).
 *
 * Enabled only when the platform started the suite (or the CLI wrapper did) and set:
 *   PLATFORM_URL, PLATFORM_TOKEN, PLATFORM_RUN_ID
 * Without them the suite runs exactly as before — the platform is optional.
 */

export interface PlatformSettings {
  url: string;
  token: string;
  runId: number;
}

export function platformSettings(): PlatformSettings | null {
  const url = process.env.PLATFORM_URL?.trim();
  const token = process.env.PLATFORM_TOKEN?.trim();
  const runId = Number(process.env.PLATFORM_RUN_ID);
  if (!url || !token || !Number.isInteger(runId) || runId <= 0) return null;
  return { url: url.replace(/\/+$/, ''), token, runId };
}

export class PlatformError extends Error {}

/**
 * Circuit breaker, per process. If the platform is unreachable, each call would otherwise wait for
 * its timeout — ~4 calls × 71 scenarios × 15 s would turn a 1-minute run into an hour. After
 * MAX_CONSECUTIVE_FAILURES network failures in a row, reporting is switched off for the rest of the
 * run (one warning); the tests themselves continue normally. Rejections (HTTP 4xx/5xx) don't count:
 * the platform is up and said no.
 */
const breaker = { consecutiveFailures: 0, open: false };
const MAX_CONSECUTIVE_FAILURES = 3;

export class PlatformClient {
  private static readonly TIMEOUT_MS = 15_000;

  constructor(private readonly settings: PlatformSettings) {}

  get runId(): number {
    return this.settings.runId;
  }

  /** POST JSON to /api/ingest/runs/{runId}{path}. Returns the parsed JSON body (or null). */
  async post<T = unknown>(path: string, body: unknown): Promise<T | null> {
    return this.send<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  }

  /** Multipart upload of one evidence file. */
  async upload(path: string, kind: string, fileName: string, contentType: string, bytes: Buffer): Promise<void> {
    const form = new FormData();
    form.set('kind', kind);
    form.set('file', new Blob([new Uint8Array(bytes)], { type: contentType }), fileName);
    await this.send(path, { method: 'POST', body: form });
  }

  private async send<T>(path: string, init: RequestInit): Promise<T | null> {
    const url = `${this.settings.url}/api/ingest/runs/${this.settings.runId}${path}`;
    if (breaker.open) throw new PlatformError(`Platform reporting is off for this run (unreachable earlier): ${init.method} ${url}`);
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), 'X-Platform-Token': this.settings.token },
        signal: AbortSignal.timeout(PlatformClient.TIMEOUT_MS),
      });
      breaker.consecutiveFailures = 0;
    } catch (error) {
      PlatformClient.recordNetworkFailure();
      throw new PlatformError(`Platform unreachable (${init.method} ${url}): ${(error as Error).message}`);
    }
    const text = await response.text();
    if (!response.ok) throw new PlatformError(`Platform rejected ${init.method} ${url}: ${response.status} ${text.slice(0, 300)}`);
    return text ? (JSON.parse(text) as T) : null;
  }

  private static recordNetworkFailure(): void {
    breaker.consecutiveFailures += 1;
    if (!breaker.open && breaker.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      breaker.open = true;
      console.warn(`[platform] ${MAX_CONSECUTIVE_FAILURES} calls in a row failed — the platform looks down. Reporting is switched off for the rest of this run; the tests continue.`);
    }
  }
}
