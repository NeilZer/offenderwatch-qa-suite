import { test, expect } from '@fixtures/test.fixtures';
import { SEED } from '@data/seed.data';
import { validOffender } from '@data/offender.factory';
import { outOfOrderTrail, validLocation } from '@data/location.factory';
import { INVALID_UPDATE_CASES } from '@data/validation.data';
import { bugMessage, knownBug, knownBugIf } from '@helpers/known-bug';
import { describe as describeResponse } from '@api/api-client';

/** An id far above anything the instance will reach during the assignment. */
const UNKNOWN_ID = 987_654;

/**
 * FR-04 / FR-05 / API-02 / API-03 — editing, deleting and "not found" handling.
 */
test.describe('API · update & delete offender', () => {
  /**
   * TC-23 · FR-04, API-03
   * WHAT : PUT with a complete, valid payload returns 200 and persists exactly those values.
   * URL  : PUT {BASE_URL}api/offenders/{id}   then   GET {BASE_URL}api/offenders/{id}
   */
  test('TC-23 PUT with a full valid payload persists every field', { tag: ['@TC-23', '@FR-04'] }, async ({ api, testData }) => {
    const offender = await testData.createOffender({ riskLevel: 'Low', status: 'Active' });
    const changes = validOffender({ riskLevel: 'High', status: 'Inactive', dateOfBirth: '1979-12-31' });

    const result = await api.updateOffender(offender.id, changes);

    expect(result.status, describeResponse(result)).toBe(200);
    expect(await api.getOffenderOrThrow(offender.id)).toMatchObject(changes);
  });

  for (const row of INVALID_UPDATE_CASES) {
    /**
     * TC-24 · FR-04, API-03 (negative)
     * WHAT : PUT enforces the same validation as POST — an invalid value is rejected with 400 and
     *        the stored offender is left unchanged.
     * URL  : PUT {BASE_URL}api/offenders/{id}   then   GET {BASE_URL}api/offenders/{id}
     */
    test(`${row.tc} PUT rejects ${row.name}`, { tag: [`@${row.tc}`, '@FR-04', '@API-03', '@negative'] }, async ({ api, testData }) => {
      knownBugIf(row.knownBug);
      const offender = await testData.createOffender();
      const { id, createdAt, ...original } = offender;

      const result = await api.updateOffender(id, { ...original, ...row.override });

      expect(result.status, `[${row.knownBug}] PUT with ${row.name} must be rejected: ${describeResponse(result)}`).toBe(400);
      expect(await api.getOffenderOrThrow(id), 'stored record must be unchanged').toMatchObject(original);
    });
  }

  /**
   * TC-24 · FR-03, FR-04, API-03 (negative)
   * WHAT : PUT cannot be used to take another offender's national ID (uniqueness on update).
   * URL  : PUT {BASE_URL}api/offenders/{id}  body.nationalId = seeded Cohen's ID
   */
  test('TC-24 PUT rejects a national ID that belongs to another offender', { tag: ['@TC-24', '@FR-04', '@API-03', '@negative'] }, async ({ api, testData }) => {
    knownBug('BUG-13');
    const offender = await testData.createOffender();
    const { id, createdAt, ...original } = offender;

    const result = await api.updateOffender(id, { ...original, nationalId: SEED.cohen.nationalId });

    expect(result.status, bugMessage('BUG-13', `duplicate national ID on update must be rejected: ${describeResponse(result)}`)).toBe(400);
  });

  /**
   * TC-28 · FR-05, API-02
   * WHAT : DELETE of an existing offender returns 204; deleting the same id again returns 404.
   * URL  : DELETE {BASE_URL}api/offenders/{id}  (twice)
   */
  test('TC-28 DELETE returns 204, repeated DELETE returns 404', { tag: ['@TC-28', '@FR-05', '@API-02'] }, async ({ api, testData }) => {
    const offender = await testData.createOffender();

    const first = await api.deleteOffender(offender.id);
    const second = await api.deleteOffender(offender.id);
    await testData.forget(offender.id);

    expect(first.status, describeResponse(first)).toBe(204);
    expect(second.status, describeResponse(second)).toBe(404);
  });

  /**
   * TC-26 · FR-05, API-02
   * WHAT : after deletion the offender can no longer be retrieved — GET by id returns 404.
   * URL  : DELETE {BASE_URL}api/offenders/{id}   then   GET {BASE_URL}api/offenders/{id}
   */
  test('TC-26 deleted offender returns 404 on GET', { tag: ['@TC-26', '@FR-05', '@API-02'] }, async ({ api, testData }) => {
    knownBug('BUG-08');
    const offender = await testData.createOffender();
    expect((await api.deleteOffender(offender.id)).status).toBe(204);
    await testData.forget(offender.id);

    const result = await api.getOffender(offender.id);

    expect(result.status, bugMessage('BUG-08', `GET deleted offender must be 404: ${describeResponse(result)}`)).toBe(404);
  });

  /**
   * TC-27 · FR-05, API-05 (data)
   * WHAT : deleting an offender also deletes all of their trail points — the trail is no longer
   *        returned and the stored points are gone.
   * URL  : POST {BASE_URL}api/offenders/{id}/locations (x4) → DELETE {BASE_URL}api/offenders/{id}
   *        → GET {BASE_URL}api/offenders/{id}/trail
   */
  test('TC-27 deleting an offender deletes their trail data', { tag: ['@TC-27', '@FR-05', '@data'] }, async ({ api, testData }) => {
    knownBug('BUG-02');
    const offender = await testData.createOffenderWithTrail(outOfOrderTrail());
    expect(await api.getTrailOrThrow(offender.id)).toHaveLength(4);

    expect((await api.deleteOffender(offender.id)).status).toBe(204);
    await testData.forget(offender.id);

    const trail = await api.getTrail(offender.id);
    const remaining = trail.status === 200 ? (trail.body ?? []) : [];
    expect(remaining, bugMessage('BUG-02', 'no trail point may survive the deletion of its offender')).toEqual([]);
  });

  /**
   * TC-50 · API-02
   * WHAT : requesting an offender that does not exist returns HTTP 404.
   * URL  : GET {BASE_URL}api/offenders/987654
   */
  test('TC-50 GET unknown offender returns 404', { tag: ['@TC-50', '@API-02', '@negative'] }, async ({ api }) => {
    knownBug('BUG-08');
    const result = await api.getOffender(UNKNOWN_ID);

    expect(result.status, bugMessage('BUG-08', `unknown offender must be 404: ${describeResponse(result)}`)).toBe(404);
  });

  /**
   * TC-52 · API-02
   * WHAT : PUT, DELETE and POST-location on an unknown offender id all return 404.
   * URL  : PUT    {BASE_URL}api/offenders/987654
   *        DELETE {BASE_URL}api/offenders/987654
   *        POST   {BASE_URL}api/offenders/987654/locations
   */
  test('TC-52 mutating an unknown offender returns 404', { tag: ['@TC-52', '@API-02', '@negative'] }, async ({ api }) => {
    const put = await api.updateOffender(UNKNOWN_ID, validOffender());
    const del = await api.deleteOffender(UNKNOWN_ID);
    const loc = await api.addLocation(UNKNOWN_ID, validLocation());

    expect(put.status, describeResponse(put)).toBe(404);
    expect(del.status, describeResponse(del)).toBe(404);
    expect(loc.status, describeResponse(loc)).toBe(404);
  });
});
