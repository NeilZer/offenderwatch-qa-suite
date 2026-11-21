import { test, expect } from '@fixtures/test.fixtures';
import { SEEDED_OFFENDERS } from '@data/seed.data';
import { outOfOrderTrail, validLocation } from '@data/location.factory';
import { INVALID_LOCATION_CASES, VALID_LOCATION_BOUNDARIES } from '@data/validation.data';
import { chronological } from '@helpers/collection.helper';
import { bugMessage, knownBug, knownBugIf } from '@helpers/known-bug';
import { describe as describeResponse } from '@api/api-client';
import { ApiErrorBody } from '@api/types';

/**
 * FR-07 / FR-10 / API-02 / API-03 / API-04 — trail retrieval and location-point validation.
 */
test.describe('API · trail & locations', () => {
  /**
   * TC-32 · API-04, FR-07
   * WHAT : every seeded offender's trail is returned in chronological order (oldest -> newest).
   * URL  : GET {BASE_URL}api/offenders/{1..11}/trail
   */
  test('TC-32 seeded trails are returned in chronological order', { tag: ['@TC-32', '@API-04', '@FR-07'] }, async ({ api }) => {
    knownBug('BUG-06');
    const unordered: string[] = [];
    for (const offender of SEEDED_OFFENDERS) {
      const trail = await api.getTrailOrThrow(offender.id);
      const actual = trail.map((p) => p.id);
      const expected = chronological(trail).map((p) => p.id);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) unordered.push(`${offender.lastName} (id ${offender.id})`);
    }
    expect(unordered, bugMessage('BUG-06', 'trails must be ordered by timestamp')).toEqual([]);
  });

  /**
   * TC-32 · API-04, FR-07
   * WHAT : points inserted out of order (10:30, 10:00, 10:45, 10:15) come back sorted by time.
   * URL  : POST {BASE_URL}api/offenders/{id}/locations (x4)   then   GET {BASE_URL}api/offenders/{id}/trail
   */
  test('TC-32 points inserted out of order are returned chronologically', { tag: ['@TC-32', '@API-04', '@FR-07'] }, async ({ api, testData }) => {
    knownBug('BUG-06');
    const offender = await testData.createOffenderWithTrail(outOfOrderTrail());

    const trail = await api.getTrailOrThrow(offender.id);

    expect(trail.map((p) => p.timestamp), bugMessage('BUG-06', 'trail must be oldest -> newest')).toEqual(
      chronological(trail).map((p) => p.timestamp),
    );
  });

  for (const row of INVALID_LOCATION_CASES) {
    /**
     * TC-41 · FR-10, API-03 (negative)
     * WHAT : an out-of-range location value is rejected with 400 + error description and no
     *        point is added to the trail.
     * URL  : POST {BASE_URL}api/offenders/{id}/locations   then   GET {BASE_URL}api/offenders/{id}/trail
     */
    test(`${row.tc} location rejects ${row.name}`, { tag: [`@${row.tc}`, '@FR-10', '@API-03', '@negative'] }, async ({ api, testData }) => {
      knownBugIf(row.knownBug);
      const offender = await testData.createOffender();

      const result = await api.addLocation(offender.id, validLocation(row.override));

      expect(result.status, `[${row.knownBug}] ${row.name} must be rejected: ${describeResponse(result)}`).toBe(400);
      expect((result.body as ApiErrorBody | null)?.error, `[${row.knownBug}] 400 must carry an error description`).toBeTruthy();
      expect(await api.getTrailOrThrow(offender.id), 'no point may be stored').toEqual([]);
    });
  }

  for (const { name, payload } of VALID_LOCATION_BOUNDARIES) {
    /**
     * TC-42 · FR-10
     * WHAT : boundary values that ARE valid (lat ±90, lon ±180, speed 0, battery 0/100,
     *        signal 1/5) are accepted with 201 and stored exactly.
     * URL  : POST {BASE_URL}api/offenders/{id}/locations   then   GET {BASE_URL}api/offenders/{id}/trail
     */
    test(`TC-42 location accepts boundary values: ${name}`, { tag: ['@TC-42', '@FR-10'] }, async ({ api, testData }) => {
      const offender = await testData.createOffender();

      const result = await api.addLocation(offender.id, payload);

      expect(result.status, describeResponse(result)).toBe(201);
      const [stored] = await api.getTrailOrThrow(offender.id);
      expect(stored).toMatchObject({ lat: payload.lat, lon: payload.lon, speedKmh: payload.speedKmh, batteryPct: payload.batteryPct, signal: payload.signal });
    });
  }

  /**
   * TC-51 · API-02
   * WHAT : the trail of an offender that does not exist returns HTTP 404 (not an empty list).
   * URL  : GET {BASE_URL}api/offenders/987654/trail
   */
  test('TC-51 trail of an unknown offender returns 404', { tag: ['@TC-51', '@API-02', '@negative'] }, async ({ api }) => {
    knownBug('BUG-08');
    const result = await api.getTrail(987_654);

    expect(result.status, bugMessage('BUG-08', `unknown offender trail must be 404: ${describeResponse(result)}`)).toBe(404);
  });
});
