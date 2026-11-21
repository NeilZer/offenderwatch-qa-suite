import { APIRequestContext, APIResponse, test } from '@playwright/test';

/**
 * Thin, generic HTTP wrapper around Playwright's APIRequestContext.
 *
 * Why a wrapper:
 *  - every call is logged as a test step  -> readable HTML report / evidence for bug reports
 *  - bodies are parsed defensively        -> an empty or non-JSON body is reported, never a crash
 *  - status + body come back together     -> tests assert on both without re-reading the stream
 *  - network errors are wrapped with the method/URL so the failure message says what was called
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiResult<T> {
  method: HttpMethod;
  url: string;
  status: number;
  /** Parsed JSON body, or null when the body is empty / not JSON. */
  body: T | null;
  /** Raw text, kept for evidence and for asserting on non-JSON responses. */
  rawBody: string;
  contentType: string;
}

export class ApiClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** One request/response pair, kept as evidence (TM-08: "the final / offending request-response"). */
export interface ApiExchange {
  /** "test" = made by the scenario itself; "teardown" = clean-up after it (never the offending call). */
  phase: 'test' | 'teardown';
  at: string;
  method: HttpMethod;
  url: string;
  requestBody: unknown;
  status: number;
  responseBody: string;
}

export class ApiClient {
  private static readonly MAX_EVIDENCE_BODY = 20_000;
  /** Every call made through this client, in order. The last one is the final / offending exchange. */
  readonly exchanges: ApiExchange[] = [];
  private phase: ApiExchange['phase'] = 'test';

  constructor(private readonly request: APIRequestContext) {}

  /** Calls made after this point are clean-up, not part of the behaviour under test. */
  beginTeardown(): void {
    this.phase = 'teardown';
  }

  get<T>(path: string) {
    return this.send<T>('GET', path);
  }

  post<T>(path: string, data?: unknown) {
    return this.send<T>('POST', path, data);
  }

  put<T>(path: string, data?: unknown) {
    return this.send<T>('PUT', path, data);
  }

  delete<T = null>(path: string) {
    return this.send<T>('DELETE', path);
  }

  /** Sends a raw string body (used to test malformed JSON handling). */
  postRaw<T>(path: string, rawBody: string) {
    return this.send<T>('POST', path, undefined, rawBody);
  }

  private async send<T>(method: HttpMethod, path: string, data?: unknown, rawBody?: string): Promise<ApiResult<T>> {
    return test.step(`${method} ${path}`, async () => {
      let response: APIResponse;
      try {
        response = await this.request.fetch(path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          data: rawBody ?? (data === undefined ? undefined : JSON.stringify(data)),
          failOnStatusCode: false,
        });
      } catch (error) {
        throw new ApiClientError(`Network error on ${method} ${path}: ${(error as Error).message}`, error);
      }
      const result = await ApiClient.toResult<T>(method, response);
      this.record(result, rawBody ?? data);
      return result;
    }, { box: true });
  }

  private record(result: ApiResult<unknown>, requestBody: unknown): void {
    this.exchanges.push({
      phase: this.phase,
      at: new Date().toISOString(),
      method: result.method,
      url: result.url,
      requestBody: requestBody ?? null,
      status: result.status,
      responseBody: result.rawBody.length > ApiClient.MAX_EVIDENCE_BODY
        ? `${result.rawBody.slice(0, ApiClient.MAX_EVIDENCE_BODY)}…(truncated)`
        : result.rawBody,
    });
  }

  private static async toResult<T>(method: HttpMethod, response: APIResponse): Promise<ApiResult<T>> {
    const rawBody = await response.text();
    const contentType = response.headers()['content-type'] ?? '';
    return {
      method,
      url: response.url(),
      status: response.status(),
      body: ApiClient.tryParseJson<T>(rawBody),
      rawBody,
      contentType,
    };
  }

  private static tryParseJson<T>(raw: string): T | null {
    if (!raw.trim()) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

/** Short, human-readable description of a response — used in assertion messages. */
export function describe(result: ApiResult<unknown>): string {
  const body = result.rawBody.length > 200 ? `${result.rawBody.slice(0, 200)}…` : result.rawBody;
  return `${result.method} ${result.url} -> ${result.status} ${body || '<empty body>'}`;
}
