/** Top bar counters (FR-11). See ./index.ts for conventions. */
export const topBarSelectors = Object.freeze({
  root: 'header.topbar',
  stat: '.stats .stat',
  statValue: 'b',
  statLabel: 'span',
  /** Visible labels of the three counters (FR-11). */
  labels: { offenders: 'Offenders', active: 'Active', trailPoints: 'Trail points' },
});
