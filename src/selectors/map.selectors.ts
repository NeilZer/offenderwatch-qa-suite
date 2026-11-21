/** Leaflet map: markers, trail line, popup (FR-07, FR-08). See ./index.ts for conventions. */
export const mapSelectors = Object.freeze({
  container: '.map.leaflet-container',
  /** Circle markers are filled paths; the trail polyline is drawn with fill="none". */
  markers: 'path.leaflet-interactive:not([fill="none"])',
  polyline: 'path.leaflet-interactive[fill="none"]',
  popup: '.leaflet-popup-content',
  popupClose: '.leaflet-popup-close-button',
});
