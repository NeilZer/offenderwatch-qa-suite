import { test, expect } from '@fixtures/test.fixtures';
import { environment } from '@config/environment';
import { PAGE_SIZES_TO_CHECK } from '@data/validation.data';
import { compareNames, expectedTotalPages, findDuplicates } from '@helpers/collection.helper';
import { bugMessage, knownBug } from '@helpers/known-bug';
import { describe as describeResponse } from '@api/api-client';

/**
 * FR-01 / API-01 — listing and paging of offenders through the REST API.
 */
test.describe('API · offender list & paging', () => {
  /**
   * TC-05 · API-01, FR-01
   * WHAT : the list response has the documented contract (items, total, page, pageSize,
   *        totalPages with correct types) and items are sorted alphabetically by last name.
   * URL  : GET {BASE_URL}api/offenders?page=1&pageSize=1000
   */
  test('TC-05 list response contract and last-name sort order', { tag: ['@TC-05', '@API-01', '@FR-01'] }, async ({ api }) => {
    const result = await api.listOffenders({ page: 1, pageSize: 1000 });

    expect(result.status, describeResponse(result)).toBe(200);
    const body = result.body!;
    expect(Array.isArray(body.items)).toBe(true);
    for (const key of ['total', 'page', 'pageSize', 'totalPages'] as const) {
      expect(Number.isInteger(body[key]), `${key} must be an integer`).toBe(true);
    }
    expect(body.total).toBe(body.items.length);

    const lastNames = body.items.map((o) => o.lastName);
    expect(lastNames, 'items must be sorted alphabetically by last name').toEqual([...lastNames].sort(compareNames));
  });

  /**
   * TC-03 · API-01, FR-01
   * WHAT : paging metadata is consistent with the data: totalPages = ceil(total / pageSize),
   *        checked for many page sizes, including sizes that leave a partial last page.
   * URL  : GET {BASE_URL}api/offenders?page=1&pageSize={1,2,3,4,5,6,10,11,12,50}
   */
  test('TC-03 totalPages equals ceil(total / pageSize) for every page size', { tag: ['@TC-03', '@API-01', '@FR-01'] }, async ({ api, testData }) => {
    knownBug('BUG-01');
    await ensureTotalLeavesPartialPage(api, testData);

    const mismatches: string[] = [];
    for (const pageSize of PAGE_SIZES_TO_CHECK) {
      const { body } = await api.listOffenders({ page: 1, pageSize });
      const expected = expectedTotalPages(body!.total, pageSize);
      if (body!.totalPages !== expected) {
        mismatches.push(`pageSize=${pageSize}: total=${body!.total} totalPages=${body!.totalPages} expected=${expected}`);
      }
    }
    expect(mismatches, bugMessage('BUG-01', 'totalPages must be ceil(total / pageSize)')).toEqual([]);
  });

  /**
   * TC-04 · API-01, FR-01
   * WHAT : walking pages 1..totalPages (as a client following the metadata would) returns every
   *        offender exactly once — nothing unreachable, nothing duplicated.
   * URL  : GET {BASE_URL}api/offenders?page={1..totalPages}&pageSize=5
   */
  test('TC-04 following totalPages reaches every offender exactly once', { tag: ['@TC-04', '@API-01', '@FR-01'] }, async ({ api, testData }) => {
    knownBug('BUG-01');
    await ensureTotalLeavesPartialPage(api, testData);
    const pageSize = environment.uiPageSize;

    const first = (await api.listOffenders({ page: 1, pageSize })).body!;
    const ids = [...first.items.map((o) => o.id)];
    for (let page = 2; page <= first.totalPages; page += 1) {
      const { body } = await api.listOffenders({ page, pageSize });
      ids.push(...body!.items.map((o) => o.id));
    }

    expect(findDuplicates(ids), 'no offender may appear on two pages').toEqual([]);
    expect(ids.length, bugMessage('BUG-01', `pages 1..${first.totalPages} must contain all ${first.total} offenders`)).toBe(first.total);
  });

  /**
   * TC-06 · API-01 (negative)
   * WHAT : out-of-range and invalid paging parameters are handled gracefully: a page past the end
   *        returns no items with intact metadata; page=0 / negative values never cause a 5xx.
   * URL  : GET {BASE_URL}api/offenders?page=999&pageSize=5
   *        GET {BASE_URL}api/offenders?page=0&pageSize=5 | ?page=-1&pageSize=-5 | ?page=1&pageSize=0
   */
  test('TC-06 out-of-range and invalid paging parameters are handled gracefully', { tag: ['@TC-06', '@API-01'] }, async ({ api }) => {
    const beyond = await api.listOffenders({ page: 999, pageSize: 5 });
    expect(beyond.status).toBe(200);
    expect(beyond.body!.items).toEqual([]);
    expect(beyond.body!.total).toBeGreaterThan(0);

    for (const query of [{ page: 0, pageSize: 5 }, { page: -1, pageSize: -5 }, { page: 1, pageSize: 0 }]) {
      const result = await api.listOffenders(query);
      expect(result.status, `${JSON.stringify(query)} -> ${describeResponse(result)}`).toBeLessThan(500);
      if (result.status === 200) {
        expect(result.body!.page, 'clamped page must be >= 1').toBeGreaterThanOrEqual(1);
        expect(result.body!.pageSize, 'clamped pageSize must be >= 1').toBeGreaterThanOrEqual(1);
      }
    }
  });
});

/**
 * Makes the paging tests deterministic: the defect only shows when total is NOT a multiple of the
 * page size. If leftover data made it a multiple of 5, add one temporary offender.
 */
async function ensureTotalLeavesPartialPage(
  api: import('@api/offender-watch.api').OffenderWatchApi,
  testData: import('@helpers/test-data-tracker').TestDataTracker,
): Promise<void> {
  const { total } = await api.listAllOffendersOrThrow();
  if (total % environment.uiPageSize === 0) await testData.createOffender();
}
