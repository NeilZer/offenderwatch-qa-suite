/** Selected offender: header, Latest reading card, trail table, add-location form (FR-07, FR-09, FR-10). See ./index.ts for conventions. */
export const trailPanelSelectors = Object.freeze({
  panel: 'section.detail-panel',
  placeholder: '.placeholder',
  header: '.detail-header',
  name: '.detail-header h2',
  meta: '.detail-header .meta',
  latestCard: '.latest-card',
  latestValues: '.latest-grid > div b',
  lastSeen: '.latest-time',
  tableTitle: '.trail-table-header h3',
  addLocationToggle: { role: 'button' as const, name: '+ Add location' },
  locationForm: 'form.loc-form',
  locationInputs: {
    lat: 'Latitude',
    lon: 'Longitude',
    speedKmh: 'Speed km/h',
    batteryPct: 'Battery %',
    signal: 'Signal 1-5',
  },
  addLocationSubmit: { role: 'button' as const, name: 'Add', exact: true },
  rows: '.trail-grid tbody tr',
  /** Column order in the trail table. */
  columns: { id: 0, timestamp: 1, lat: 2, lon: 3, speed: 4, battery: 5, signal: 6 },
});
