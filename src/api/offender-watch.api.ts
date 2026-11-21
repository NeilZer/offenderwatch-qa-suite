import { endpoints, withQuery } from '@config/endpoints';
import { ApiClient, ApiResult, describe } from './api-client';
import { LocationInput, Offender, OffenderInput, OffenderPage, Stats, TrailPoint } from './types';

export interface ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Domain-level API for OffenderWatch.
 *
 * Two flavours of every operation:
 *  - raw methods (listOffenders, createOffender, ...) return the full ApiResult so tests can assert
 *    on status codes and error bodies (needed for API-02 / API-03 checks);
 *  - "...OrThrow" helpers return the parsed payload and throw a descriptive error when the call does
 *    not succeed. Use these for SETUP steps, so a broken precondition is reported as such and not
 *    confused with the behaviour under test.
 */
export class OffenderWatchApi {
  constructor(private readonly client: ApiClient) {}

  /** Marks the end of the test body: later calls are recorded as teardown in the evidence. */
  beginTeardown(): void {
    this.client.beginTeardown();
  }

  // ---------- offenders ----------
  listOffenders(query: ListQuery = {}): Promise<ApiResult<OffenderPage>> {
    return this.client.get<OffenderPage>(withQuery(endpoints.offenders, { ...query }));
  }

  getOffender(id: number | string): Promise<ApiResult<Offender>> {
    return this.client.get<Offender>(endpoints.offender(id));
  }

  createOffender(input: OffenderInput): Promise<ApiResult<Offender>> {
    return this.client.post<Offender>(endpoints.offenders, input);
  }

  createOffenderRaw(rawBody: string): Promise<ApiResult<unknown>> {
    return this.client.postRaw(endpoints.offenders, rawBody);
  }

  updateOffender(id: number, input: OffenderInput): Promise<ApiResult<Offender>> {
    return this.client.put<Offender>(endpoints.offender(id), input);
  }

  deleteOffender(id: number): Promise<ApiResult<null>> {
    return this.client.delete(endpoints.offender(id));
  }

  // ---------- trail ----------
  getTrail(id: number | string): Promise<ApiResult<TrailPoint[]>> {
    return this.client.get<TrailPoint[]>(endpoints.trail(id));
  }

  addLocation(id: number, input: LocationInput): Promise<ApiResult<unknown>> {
    return this.client.post(endpoints.locations(id), input);
  }

  // ---------- stats ----------
  getStats(): Promise<ApiResult<Stats>> {
    return this.client.get<Stats>(endpoints.stats);
  }

  // ---------- setup helpers (throw on failure) ----------
  async createOffenderOrThrow(input: OffenderInput): Promise<Offender> {
    return expectSuccess(await this.createOffender(input), 'create offender');
  }

  async addLocationOrThrow(id: number, input: LocationInput): Promise<void> {
    expectSuccess(await this.addLocation(id, input), `add location to offender ${id}`, { allowNullBody: true });
  }

  async getTrailOrThrow(id: number): Promise<TrailPoint[]> {
    return expectSuccess(await this.getTrail(id), `get trail of offender ${id}`);
  }

  async getStatsOrThrow(): Promise<Stats> {
    return expectSuccess(await this.getStats(), 'get stats');
  }

  async getOffenderOrThrow(id: number): Promise<Offender> {
    return expectSuccess(await this.getOffender(id), `get offender ${id}`);
  }

  /** Reads every offender in one request (page size large enough for any test instance). */
  async listAllOffendersOrThrow(search?: string): Promise<OffenderPage> {
    return expectSuccess(await this.listOffenders({ search, page: 1, pageSize: 1000 }), 'list all offenders');
  }
}

/**
 * Asserts a setup call succeeded (2xx and, unless allowed, a parsed body).
 * Throws a SetupError so the report clearly shows "precondition failed", not "test failed".
 */
export class SetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SetupError';
  }
}

function expectSuccess<T>(result: ApiResult<T>, action: string, opts: { allowNullBody?: boolean } = {}): T {
  if (result.status < 200 || result.status >= 300) {
    throw new SetupError(`Precondition failed — could not ${action}: ${describe(result)}`);
  }
  if (result.body === null && !opts.allowNullBody) {
    throw new SetupError(`Precondition failed — ${action} returned no JSON body: ${describe(result)}`);
  }
  return result.body as T;
}
