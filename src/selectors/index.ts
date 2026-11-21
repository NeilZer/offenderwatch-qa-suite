/**
 * ALL UI locators of the OffenderWatch console — one file per reusable component.
 *
 * The app has no data-testid attributes, so selectors rely on stable class names and visible
 * labels. When the markup changes, this folder is the only place to update.
 * (Recommendation logged for the dev team: add data-testid attributes to make these resilient.)
 */
export * from './app.selectors';
export * from './topbar.selectors';
export * from './banner.selectors';
export * from './offender-list.selectors';
export * from './offender-form.selectors';
export * from './trail-panel.selectors';
export * from './map.selectors';
