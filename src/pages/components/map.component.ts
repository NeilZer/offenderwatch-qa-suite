import { Locator, Page, expect } from '@playwright/test';
import { mapSelectors as sel } from '@selectors/index';
import { circleCentre, Point2D, polylineVertices } from '@helpers/map-geometry.helper';
import { BaseComponent, leadingNumber } from './base.component';

export interface PopupData {
  pointId: number;
  /** Text after "Time: " */
  time: string;
  speedKmh: number;
  batteryPct: number;
  /** Signal level derived from the filled bars (▮) */
  signal: number;
}

/** Leaflet map (FR-07, FR-08). Reads geometry from the rendered SVG. */
export class MapComponent extends BaseComponent {
  readonly container: Locator;
  readonly markers: Locator;
  readonly polyline: Locator;

  constructor(page: Page) {
    super(page);
    this.container = page.locator(sel.container);
    this.markers = this.container.locator(sel.markers);
    this.polyline = this.container.locator(sel.polyline);
  }

  /**
   * Waits until the map stopped moving (fitBounds animates): the polyline path must be identical
   * on two consecutive reads.
   */
  async waitUntilSettled(expectedMarkers: number): Promise<void> {
    await expect(this.markers).toHaveCount(expectedMarkers);
    let previous = '';
    await expect
      .poll(
        async () => {
          const current = (await this.polyline.getAttribute('d')) ?? '';
          const stable = current !== '' && current === previous;
          previous = current;
          return stable;
        },
        { message: 'map should finish its zoom/pan animation', intervals: [250, 250, 500, 500, 1000] },
      )
      .toBe(true);
  }

  /** Marker centres in DOM order (= the order the app iterated the trail array). */
  async markerCentres(): Promise<Point2D[]> {
    const paths = await this.markers.evaluateAll((els) => els.map((el) => el.getAttribute('d') ?? ''));
    return paths.map(circleCentre);
  }

  async lineVertices(): Promise<Point2D[]> {
    const d = await this.polyline.getAttribute('d');
    if (!d) throw new Error('Trail polyline is not drawn');
    return polylineVertices(d);
  }

  /** Clicks the n-th marker and parses its popup. */
  async openPopup(markerIndex: number): Promise<PopupData> {
    const popup = this.container.locator(sel.popup);
    // A previous popup fades out asynchronously; never read while two are in the DOM.
    await expect(popup, 'previous popup should be closed').toHaveCount(0);
    // dispatchEvent targets the exact SVG element even when markers overlap.
    await this.markers.nth(markerIndex).dispatchEvent('click');
    await expect(popup).toBeVisible();
    const data = MapComponent.parsePopup(await popup.innerText());
    await this.closePopup();
    return data;
  }

  async closePopup(): Promise<void> {
    const close = this.container.locator(sel.popupClose);
    if (await close.isVisible()) await close.click();
    await expect(this.container.locator(sel.popup)).toHaveCount(0);
  }

  static parsePopup(text: string): PopupData {
    const field = (label: string): string => {
      const match = new RegExp(`${label}:\\s*(.+)`).exec(text);
      if (!match) throw new Error(`Popup has no "${label}" line: ${JSON.stringify(text)}`);
      return match[1].trim();
    };
    const idMatch = /Point\s*#(\d+)/.exec(text);
    if (!idMatch) throw new Error(`Popup has no point id: ${JSON.stringify(text)}`);
    return {
      pointId: Number(idMatch[1]),
      time: field('Time'),
      speedKmh: leadingNumber(field('Speed')),
      batteryPct: leadingNumber(field('Battery')),
      signal: (field('Signal').match(/▮/g) ?? []).length,
    };
  }
}
