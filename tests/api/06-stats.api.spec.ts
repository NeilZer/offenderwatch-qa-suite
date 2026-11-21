import { test, expect } from '@fixtures/test.fixtures';
import { outOfOrderTrail } from '@data/location.factory';
import { bugMessage, knownBug } from '@helpers/known-bug';

/**
 * FR-11 / API-05 — totals returned by /api/stats must always match the stored data.
 * (Run with workers=1: these tests assert exact deltas on a shared instance.)
 */
test.describe('API · statistics', () => {
  /**
   * TC-49 · API-05, FR-11
   * WHAT : totalOffenders and activeOffenders equal what the offender list actually contains.
   * URL  : GET {BASE_URL}api/stats   vs   GET {BASE_URL}api/offenders?page=1&pageSize=1000
   */
  test('TC-49 offender totals match the stored offenders', { tag: ['@TC-49', '@API-05', '@FR-11'] }, async ({ api }) => {
    const stats = await api.getStatsOrThrow();
    const all = await api.listAllOffendersOrThrow();

    expect(stats.totalOffenders).toBe(all.total);
    expect(stats.activeOffenders).toBe(all.items.filter((o) => o.status === 'Active').length);
  });

  /**
   * TC-47 · API-05, FR-11
   * WHAT : counters update after creation — +1 offender, +1 active (Active status only),
   *        +N trail points after N locations are added; an Inactive offender is not counted
   *        as active.
   * URL  : GET {BASE_URL}api/stats → POST {BASE_URL}api/offenders → POST .../locations → GET {BASE_URL}api/stats
   */
  test('TC-47 counters update after creating offenders and points', { tag: ['@TC-47', '@API-05', '@FR-11'] }, async ({ api, testData }) => {
    const before = await api.getStatsOrThrow();

    const points = outOfOrderTrail();
    await testData.createOffenderWithTrail(points, { status: 'Active' });
    await testData.createOffender({ status: 'Inactive' });
    const after = await api.getStatsOrThrow();

    expect(after.totalOffenders - before.totalOffenders, 'two offenders created').toBe(2);
    expect(after.activeOffenders - before.activeOffenders, 'only the Active one counts as active').toBe(1);
    expect(after.totalLocationPoints - before.totalLocationPoints, 'points added').toBe(points.length);
  });

  /**
   * TC-48 · API-05, FR-11, FR-05 (data)
   * WHAT : deleting an offender with N trail points lowers totalLocationPoints by N
   *        (trail data is deleted together with its offender).
   * URL  : GET {BASE_URL}api/stats → DELETE {BASE_URL}api/offenders/{id} → GET {BASE_URL}api/stats
   */
  test('TC-48 trail-point total drops when an offender with a trail is deleted', { tag: ['@TC-48', '@API-05', '@FR-11', '@data'] }, async ({ api, testData }) => {
    knownBug('BUG-02');
    const points = outOfOrderTrail();
    const offender = await testData.createOffenderWithTrail(points);
    const before = await api.getStatsOrThrow();

    expect((await api.deleteOffender(offender.id)).status).toBe(204);
    await testData.forget(offender.id);
    const after = await api.getStatsOrThrow();

    expect(before.totalOffenders - after.totalOffenders).toBe(1);
    expect(before.totalLocationPoints - after.totalLocationPoints, bugMessage('BUG-02', `deleting ${points.length} points must lower the total by ${points.length}`)).toBe(points.length);
  });
});
