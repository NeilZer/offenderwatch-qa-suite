import { test, expect } from '@fixtures/test.fixtures';
import { SEED } from '@data/seed.data';
import { validOffender } from '@data/offender.factory';
import { INVALID_OFFENDER_CASES } from '@data/validation.data';
import { bugMessage, knownBug, knownBugIf } from '@helpers/known-bug';
import { describe as describeResponse } from '@api/api-client';
import { ApiErrorBody } from '@api/types';

/**
 * FR-03 / API-02 / API-03 — creating offenders and validating input.
 */
test.describe('API · create offender', () => {
  /**
   * TC-13 · FR-03, API-02
   * WHAT : a valid offender is created with HTTP 201, gets an id, and every field is stored
   *        exactly as sent (verified by reading it back).
   * URL  : POST {BASE_URL}api/offenders   then   GET {BASE_URL}api/offenders/{id}
   */
  test('TC-13 valid offender is created with 201 and stored as sent', { tag: ['@TC-13', '@FR-03', '@API-02'] }, async ({ api, testData }) => {
    const input = validOffender({ riskLevel: 'High', status: 'Inactive' });

    const created = await api.createOffender(input);
    await testData.register(created.body);

    expect(created.status, describeResponse(created)).toBe(201);
    expect(created.body!.id).toBeGreaterThan(0);
    expect(created.body).toMatchObject(input);

    const readBack = await api.getOffenderOrThrow(created.body!.id);
    expect(readBack).toMatchObject(input);
  });

  for (const row of INVALID_OFFENDER_CASES) {
    /**
     * TC-14 / TC-15 / TC-17 / TC-18 · FR-03, API-03 (negative)
     * WHAT : an invalid payload is rejected with HTTP 400 + an error description, and nothing
     *        is saved (total number of offenders unchanged).
     * URL  : POST {BASE_URL}api/offenders   (+ GET {BASE_URL}api/stats before/after)
     */
    test(`${row.tc} rejects ${row.name}`, { tag: [`@${row.tc}`, '@FR-03', '@API-03', '@negative'] }, async ({ api, testData }) => {
      knownBugIf(row.knownBug);
      const before = await api.getStatsOrThrow();

      const result = await api.createOffender(validOffender(row.override));
      await testData.register(result.body); // clean up if wrongly created

      const tag = row.knownBug ?? 'FR-03';
      expect(result.status, `[${tag}] ${row.name} must be rejected: ${describeResponse(result)}`).toBe(400);
      expect((result.body as ApiErrorBody | null)?.error, 'error description must be present').toBeTruthy();
      const after = await api.getStatsOrThrow();
      expect(after.totalOffenders, 'nothing may be saved').toBe(before.totalOffenders);
    });
  }

  /**
   * TC-16 · FR-03, API-03 (negative)
   * WHAT : national ID must be unique across the system — re-using a seeded offender's ID is
   *        rejected with 400 and no second record is created.
   * URL  : POST {BASE_URL}api/offenders   then   GET {BASE_URL}api/offenders?search={nationalId}
   */
  test('TC-16 rejects a duplicate national ID', { tag: ['@TC-16', '@FR-03', '@API-03', '@negative'] }, async ({ api, testData }) => {
    knownBug('BUG-09');
    const duplicateId = SEED.cohen.nationalId;

    const result = await api.createOffender(validOffender({ nationalId: duplicateId }));
    await testData.register(result.body);

    expect(result.status, bugMessage('BUG-09', `duplicate national ID must be rejected: ${describeResponse(result)}`)).toBe(400);
    const holders = (await api.listAllOffendersOrThrow(duplicateId)).items.filter((o) => o.nationalId === duplicateId);
    expect(holders, 'exactly one offender may own the national ID').toHaveLength(1);
  });

  /**
   * TC-20 · API-03 (negative)
   * WHAT : a malformed (non-JSON) body is rejected with 400 AND an error description, like every
   *        other validation error.
   * URL  : POST {BASE_URL}api/offenders   body: "this is not json"
   */
  test('TC-20 malformed JSON body returns 400 with an error description', { tag: ['@TC-20', '@API-03', '@negative'] }, async ({ api }) => {
    knownBug('BUG-18');
    const result = await api.createOffenderRaw('this is not json');

    expect(result.status).toBe(400);
    expect(result.rawBody.trim(), bugMessage('BUG-18', '400 response must describe the error')).not.toBe('');
  });
});
