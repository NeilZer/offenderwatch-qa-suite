import { test, expect } from '@fixtures/test.fixtures';
import { SEED } from '@data/seed.data';
import { SPECIAL_CHAR_SEARCHES } from '@data/validation.data';
import { bugMessage, knownBug } from '@helpers/known-bug';
import { describe as describeResponse } from '@api/api-client';

/**
 * FR-02 — search by first name, last name or national ID; partial and case-insensitive.
 */
test.describe('API · offender search', () => {
  const cohen = SEED.cohen;

  const substringCases = [
    { field: 'last name (exact)', term: cohen.lastName },
    { field: 'last name (middle substring)', term: cohen.lastName.slice(1, 4) }, // "ohe"
    { field: 'first name (prefix)', term: cohen.firstName.slice(0, 3) }, // "Dav"
    { field: 'national ID (suffix)', term: cohen.nationalId.slice(-6) }, // "412876"
  ];

  for (const { field, term } of substringCases) {
    /**
     * TC-08 · FR-02, API-01
     * WHAT : search matches a substring of first name, last name or national ID.
     * URL  : GET {BASE_URL}api/offenders?search={term}&page=1&pageSize=1000
     */
    test(`TC-08 search by ${field} "${term}" finds ${cohen.lastName}`, { tag: ['@TC-08', '@FR-02'] }, async ({ api }) => {
      const result = await api.listOffenders({ search: term, page: 1, pageSize: 1000 });

      expect(result.status, describeResponse(result)).toBe(200);
      expect(result.body!.items.map((o) => o.id)).toContain(cohen.id);
    });
  }

  for (const term of [cohen.lastName.toLowerCase(), cohen.lastName.toUpperCase(), 'dAVID']) {
    /**
     * TC-09 · FR-02
     * WHAT : search is case-insensitive — a different letter case finds the same offender.
     * URL  : GET {BASE_URL}api/offenders?search={cohen|COHEN|dAVID}&page=1&pageSize=1000
     */
    test(`TC-09 case-insensitive search "${term}" finds ${cohen.lastName}`, { tag: ['@TC-09', '@FR-02'] }, async ({ api }) => {
      knownBug('BUG-07');
      const result = await api.listOffenders({ search: term, page: 1, pageSize: 1000 });

      expect(result.status).toBe(200);
      expect(result.body!.items.map((o) => o.id), bugMessage('BUG-07', `"${term}" must match ${cohen.firstName} ${cohen.lastName}`)).toContain(cohen.id);
    });
  }

  /**
   * TC-11 · FR-02 (negative)
   * WHAT : terms with SQL wildcard / quote characters, or that match nothing, return an empty
   *        200 result with consistent metadata — never an error and never "match everything".
   * URL  : GET {BASE_URL}api/offenders?search={% | _ | ' | " | zzzz-no-such-offender}
   */
  test('TC-11 special characters and no-match terms return an empty result', { tag: ['@TC-11', '@FR-02'] }, async ({ api }) => {
    for (const term of SPECIAL_CHAR_SEARCHES) {
      const result = await api.listOffenders({ search: term, page: 1, pageSize: 5 });
      expect(result.status, `search "${term}": ${describeResponse(result)}`).toBe(200);
      expect(result.body!.total, `search "${term}" must be treated literally`).toBe(0);
      expect(result.body!.items).toEqual([]);
    }
  });
});
