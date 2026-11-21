import { Locator, Page, Response } from '@playwright/test';
import { trailPanelSelectors as sel } from '@selectors/index';
import { BaseComponent, apiPaths, leadingNumber } from './base.component';

export interface LatestReading {
  speedKmh: number;
  batteryPct: number;
  signal: number;
  /** Text after "Last seen: " e.g. "09/08/2026, 14:29" */
  lastSeen: string;
}

export interface TrailRow {
  id: number;
  timestamp: string;
  lat: number;
  lon: number;
  speedKmh: number;
  batteryPct: number;
  signal: number;
}

/** Raw text values typed into the add-location form (strings on purpose: blank / invalid input). */
export type LocationFormValues = Partial<Record<keyof typeof sel.locationInputs, string>>;

/** Selected-offender panel: header, Latest reading card, trail table, add-location form. */
export class TrailPanelComponent extends BaseComponent {
  readonly panel: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    this.panel = page.locator(sel.panel);
    this.rows = this.panel.locator(sel.rows);
  }

  // ---------- header ----------
  name(): Promise<string> {
    return this.panel.locator(sel.name).innerText();
  }

  /** DOB exactly as displayed in the header meta line ("… · DOB: 07/03/1982 · …"). */
  async dateOfBirth(): Promise<string> {
    const meta = await this.panel.locator(sel.meta).innerText();
    const match = /DOB:\s*([^\s·]+)/.exec(meta);
    if (!match) throw new Error(`DOB not found in header: "${meta}"`);
    return match[1];
  }

  // ---------- latest reading (FR-09) ----------
  async latestReading(): Promise<LatestReading> {
    const card = this.panel.locator(sel.latestCard);
    await card.waitFor();
    const values = await card.locator(sel.latestValues).allInnerTexts();
    if (values.length !== 3) throw new Error(`Expected 3 values in Latest reading, got ${JSON.stringify(values)}`);
    const lastSeen = (await card.locator(sel.lastSeen).innerText()).replace(/^Last seen:\s*/i, '').trim();
    return {
      speedKmh: leadingNumber(values[0]),
      batteryPct: leadingNumber(values[1]),
      signal: leadingNumber(values[2]),
      lastSeen,
    };
  }

  // ---------- trail table (FR-07) ----------
  /** "Trail points (16)" */
  tableTitle(): Locator {
    return this.panel.locator(sel.tableTitle);
  }

  async readTrailRows(): Promise<TrailRow[]> {
    const cells = await this.rows.evaluateAll((trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim())),
    );
    const c = sel.columns;
    return cells.map((row) => ({
      id: Number(row[c.id]),
      timestamp: row[c.timestamp],
      lat: Number(row[c.lat]),
      lon: Number(row[c.lon]),
      speedKmh: leadingNumber(row[c.speed]),
      batteryPct: leadingNumber(row[c.battery]),
      signal: leadingNumber(row[c.signal]),
    }));
  }

  // ---------- add location (FR-10) ----------
  async openAddLocation(): Promise<void> {
    if (!(await this.panel.locator(sel.locationForm).isVisible())) {
      await this.byRole(sel.addLocationToggle, this.panel).click();
    }
  }

  isLocationFormOpen(): Promise<boolean> {
    return this.panel.locator(sel.locationForm).isVisible();
  }

  async fillLocation(values: LocationFormValues): Promise<void> {
    for (const [key, placeholder] of Object.entries(sel.locationInputs) as [keyof LocationFormValues, string][]) {
      const value = values[key];
      if (value !== undefined) await this.panel.getByPlaceholder(placeholder, { exact: true }).fill(value);
    }
  }

  /** Clicks Add and returns the POST /locations response the UI produced. */
  async submitLocation(): Promise<Response> {
    const form = this.panel.locator(sel.locationForm);
    return this.runAndWaitForApi('POST', apiPaths.locations, () => this.byRole(sel.addLocationSubmit, form).click());
  }

  /** Adds a location and, when the server accepts it, waits for the trail to refresh. */
  async addLocation(values: LocationFormValues): Promise<Response> {
    await this.openAddLocation();
    await this.fillLocation(values);
    const refreshed = this.waitForApi('GET', apiPaths.trail).catch(() => null);
    const response = await this.submitLocation();
    if (response.ok()) await refreshed;
    return response;
  }
}
