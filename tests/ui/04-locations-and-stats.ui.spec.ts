import { test, expect } from '@fixtures/test.fixtures';
import { bugMessage, knownBug } from '@helpers/known-bug';

/**
 * FR-10 / FR-11 — adding location points through the console, and the top-bar counters.
 */
test.describe('UI · add location & live counters', () => {
  /**
   * TC-46 · FR-11, API-05
   * WHAT : the three top-bar counters (Offenders, Active, Trail points) show exactly what the
   *        stats API returns.
   * URL  : UI {BASE_URL}  top bar   vs   GET {BASE_URL}api/stats
   */
  test('TC-46 top-bar counters equal the stats API', { tag: ['@TC-46', '@FR-11', '@ui'] }, async ({ consolePage, api }) => {
    await consolePage.open();

    expect(await consolePage.topBar.readStats()).toEqual(await api.getStatsOrThrow());
  });

  /**
   * TC-40 · FR-10, FR-11
   * WHAT : adding a valid location through "+ Add location" stores it, shows it in the trail table
   *        with the entered values, and raises the "Trail points" counter by one.
   * URL  : UI {BASE_URL}  select offender → "+ Add location" → Add  →  POST {BASE_URL}api/offenders/{id}/locations
   */
  test('TC-40 operator adds a valid location point', { tag: ['@TC-40', '@FR-10', '@FR-11', '@ui'] }, async ({ consolePage, api, testData }) => {
    const offender = await testData.createOffender();
    await consolePage.open();
    await consolePage.openOffender(offender);
    const before = await consolePage.topBar.readStats();

    const response = await consolePage.trail.addLocation({ lat: '32.0901', lon: '34.7802', speedKmh: '18.5', batteryPct: '77', signal: '4' });

    expect(response.status()).toBe(201);
    await expect(consolePage.trail.rows).toHaveCount(1);
    expect((await consolePage.trail.readTrailRows())[0]).toMatchObject({ lat: 32.0901, lon: 34.7802, speedKmh: 18.5, batteryPct: 77, signal: 4 });
    await expect.poll(() => consolePage.topBar.readStats().then((s) => s.totalLocationPoints)).toBe(before.totalLocationPoints + 1);
    expect(await api.getTrailOrThrow(offender.id)).toHaveLength(1);
  });

  /**
   * TC-43 · FR-10 (negative)
   * WHAT : entering invalid values in the add-location form (battery 150 %, speed −5) is rejected:
   *        the server answers 400, the operator sees an error message, and no point is added.
   * URL  : UI {BASE_URL}  select offender → "+ Add location" → Add  →  POST {BASE_URL}api/offenders/{id}/locations
   */
  test('TC-43 invalid location values are rejected with a visible error', { tag: ['@TC-43', '@FR-10', '@ui', '@negative'] }, async ({ consolePage, api, testData }) => {
    knownBug('BUG-14', 'BUG-16');
    const offender = await testData.createOffender();
    await consolePage.open();
    await consolePage.openOffender(offender);

    const response = await consolePage.trail.addLocation({ lat: '32.1', lon: '34.8', speedKmh: '-5', batteryPct: '150', signal: '4' });

    expect(response.status(), bugMessage('BUG-14', 'server must reject battery 150 / speed -5')).toBe(400);
    await expect(consolePage.errorBanner(), bugMessage('BUG-16', 'operator must see why the point was rejected')).toBeVisible();
    expect(await api.getTrailOrThrow(offender.id), 'no point may be stored').toEqual([]);
  });
});
