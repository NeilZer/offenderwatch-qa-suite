import { Page } from '@playwright/test';
import { test, expect } from '@fixtures/test.fixtures';
import { environment } from '@config/environment';
import { SEED } from '@data/seed.data';
import { validLocation } from '@data/location.factory';
import { chronological, newestPoint, oldestPoint } from '@helpers/collection.helper';
import { instantToDdMmYyyyHhMm } from '@helpers/date.helper';
import { bugMessage, knownBug } from '@helpers/known-bug';
import { distance, nearestIndex } from '@helpers/map-geometry.helper';
import { ApiClient } from '@api/api-client';
import { OffenderWatchApi } from '@api/offender-watch.api';
import { TrailPoint } from '@api/types';
import { ConsolePage } from '@pages/console.page';

/**
 * FR-07 / FR-08 / FR-09 — trail table, map and the Latest reading card.
 * Uses seeded Cohen, David: 16 points whose stored order is NOT chronological.
 *
 * ONE SHARED PAGE: these tests only READ the same screen (Cohen selected), so the console is opened
 * and Cohen selected once, then every test inspects it — like an operator looking at one trail.
 * Serial mode: the tests run in this order on the same page; if one breaks unexpectedly the rest
 * are skipped instead of reporting on a screen in an unknown state.
 * Tests that CHANGE state (create / edit / delete / crash) keep their own fresh page.
 */
test.describe('UI · trail, map & latest reading (one page, Cohen selected once)', () => {
  test.describe.configure({ mode: 'serial' });

  const cohen = SEED.cohen;
  let page: Page;
  let screen: ConsolePage;
  let trail: TrailPoint[];

  test.beforeAll(async ({ browser, playwright }) => {
    const request = await playwright.request.newContext({ baseURL: environment.baseUrl });
    trail = await new OffenderWatchApi(new ApiClient(request)).getTrailOrThrow(cohen.id);
    await request.dispose();

    page = await browser.newPage(); // inherits baseURL, timezone and locale from the config
    screen = new ConsolePage(page);
    await screen.open();
    await screen.openOffender(cohen);
    await screen.map.waitUntilSettled(trail.length);
  });

  test.afterAll(async () => {
    expect(screen.pageErrors, 'the shared screen must not raise browser errors').toEqual([]);
    await page.close();
  });

  /**
   * TC-35 · FR-07
   * WHAT : the map draws one marker per trail point plus one trail line.
   * URL  : UI {BASE_URL}  select "Cohen, David" → Leaflet map
   */
  test('TC-35 map shows one marker per trail point and a trail line', { tag: ['@TC-35', '@FR-07', '@ui'] }, async () => {
    await expect(screen.map.markers).toHaveCount(trail.length);
    await expect(screen.map.polyline).toHaveCount(1);
    await expect(screen.trail.tableTitle()).toHaveText(`Trail points (${trail.length})`);
  });

  /**
   * TC-33 · FR-07
   * WHAT : the trail table lists the points oldest → newest.
   * URL  : UI {BASE_URL}  select "Cohen, David" → trail table   (data: GET {BASE_URL}api/offenders/1/trail)
   */
  test('TC-33 trail table is ordered oldest to newest', { tag: ['@TC-33', '@FR-07', '@ui'] }, async () => {
    knownBug('BUG-06');
    const shownIds = (await screen.trail.readTrailRows()).map((r) => r.id);

    expect(shownIds, bugMessage('BUG-06', 'table must list points chronologically')).toEqual(chronological(trail).map((p) => p.id));
  });

  /**
   * TC-34 · FR-07
   * WHAT : the trail line follows the real movement: it starts at the OLDEST point's marker and
   *        ends at the NEWEST point's marker (read from the rendered SVG geometry).
   * URL  : UI {BASE_URL}  select "Cohen, David" → Leaflet polyline + markers
   */
  test('TC-34 map line starts at the oldest point and ends at the newest', { tag: ['@TC-34', '@FR-07', '@ui'] }, async () => {
    knownBug('BUG-06');
    const centres = await screen.map.markerCentres(); // DOM order = API order
    const line = await screen.map.lineVertices();
    const markerOf = (point: TrailPoint) => centres[trail.findIndex((p) => p.id === point.id)];

    const lineStartsAt = trail[nearestIndex(line[0], centres)];
    const lineEndsAt = trail[nearestIndex(line[line.length - 1], centres)];

    expect(distance(line[0], markerOf(lineStartsAt)), 'line start must sit on a marker').toBeLessThan(3);
    expect({ start: lineStartsAt.id, end: lineEndsAt.id }, bugMessage('BUG-06', 'line must run from the oldest to the newest point')).toEqual({
      start: oldestPoint(trail).id,
      end: newestPoint(trail).id,
    });
  });

  /**
   * TC-36 · FR-08
   * WHAT : clicking a map point shows that point's own timestamp, speed (km/h), battery (%) and
   *        signal (1–5) — compared field by field with the API for the first, a middle and the
   *        last marker.
   * URL  : UI {BASE_URL}  select "Cohen, David" → click marker → popup   vs   GET {BASE_URL}api/offenders/1/trail
   */
  test('TC-36 clicking a map point shows its recorded data', { tag: ['@TC-36', '@FR-08', '@ui'] }, async () => {
    for (const index of [0, Math.floor(trail.length / 2), trail.length - 1]) {
      const popup = await screen.map.openPopup(index); // closes the popup again → screen unchanged
      const point = trail.find((p) => p.id === popup.pointId);
      expect(point, `popup point #${popup.pointId} must exist in the API trail`).toBeDefined();
      expect(popup).toEqual({
        pointId: point!.id,
        time: instantToDdMmYyyyHhMm(point!.timestamp, environment.timezone),
        speedKmh: point!.speedKmh,
        batteryPct: point!.batteryPct,
        signal: point!.signal,
      });
    }
  });

  /**
   * TC-38 · FR-09
   * WHAT : the Latest reading card shows the speed, battery and signal of the MOST RECENT point.
   * URL  : UI {BASE_URL}  select "Cohen, David" → "Latest reading"   vs   newest point of GET {BASE_URL}api/offenders/1/trail
   */
  test('TC-38 latest reading shows the most recent point', { tag: ['@TC-38', '@FR-09', '@ui'] }, async () => {
    knownBug('BUG-05');
    const newest = newestPoint(trail);

    const latest = await screen.trail.latestReading();

    expect(
      { speedKmh: latest.speedKmh, batteryPct: latest.batteryPct, signal: latest.signal },
      bugMessage('BUG-05', `readings must come from the newest point #${newest.id} (${newest.timestamp})`),
    ).toEqual({ speedKmh: newest.speedKmh, batteryPct: newest.batteryPct, signal: newest.signal });
  });

  /**
   * TC-39 · FR-09, FR-06
   * WHAT : "Last seen" shows the timestamp of the most recent point (DD/MM/YYYY, HH:mm, operator
   *        timezone).
   * URL  : UI {BASE_URL}  select "Cohen, David" → "Last seen"   vs   newest point of GET {BASE_URL}api/offenders/1/trail
   */
  test('TC-39 last seen shows the most recent timestamp', { tag: ['@TC-39', '@FR-09', '@ui'] }, async () => {
    const latest = await screen.trail.latestReading();

    expect(latest.lastSeen).toBe(instantToDdMmYyyyHhMm(newestPoint(trail).timestamp, environment.timezone));
  });
});

test.describe('UI · robustness of the trail view (own page — this test crashes the console)', () => {
  /**
   * TC-37 · FR-08 (negative)
   * WHAT : a stored point with an out-of-range signal (6) must not break the console: selecting
   *        the offender still renders the trail and raises no uncaught page error.
   * URL  : POST {BASE_URL}api/offenders/{id}/locations {signal: 6}  →  UI {BASE_URL} select offender
   */
  test('TC-37 an out-of-range signal value does not crash the console', { tag: ['@TC-37', '@FR-08', '@ui', '@negative'] }, async ({ consolePage, testData }) => {
    knownBug('BUG-15');
    const offender = await testData.createOffenderWithTrail([validLocation({ signal: 6 })]);
    await consolePage.open();

    await consolePage.openOffender(offender);
    await consolePage.waitForTrailOrCrash();

    expect(await consolePage.isBlank(), bugMessage('BUG-15', 'console must not go blank')).toBe(false);
    expect(consolePage.pageErrors, bugMessage('BUG-15', 'no uncaught errors')).toEqual([]);
  });
});
