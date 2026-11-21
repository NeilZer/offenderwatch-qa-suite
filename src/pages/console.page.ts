import { Page, expect } from '@playwright/test';
import { uiRoutes } from '@config/endpoints';
import { appSelectors, bannerSelectors, offenderListSelectors } from '@selectors/index';
import { BaseComponent, apiPaths } from './components/base.component';
import { TopBarComponent } from './components/top-bar.component';
import { OffenderListComponent } from './components/offender-list.component';
import { OffenderFormComponent } from './components/offender-form.component';
import { TrailPanelComponent } from './components/trail-panel.component';
import { MapComponent } from './components/map.component';

/**
 * The OffenderWatch monitoring console (single page). Composes the reusable components and
 * records uncaught page errors, so a crash (e.g. BUG-15) is observable by tests.
 */
export class ConsolePage extends BaseComponent {
  readonly topBar: TopBarComponent;
  readonly list: OffenderListComponent;
  readonly form: OffenderFormComponent;
  readonly trail: TrailPanelComponent;
  readonly map: MapComponent;
  /** Uncaught exceptions thrown inside the page since it was opened. */
  readonly pageErrors: string[] = [];

  constructor(page: Page) {
    super(page);
    this.topBar = new TopBarComponent(page);
    this.list = new OffenderListComponent(page);
    this.form = new OffenderFormComponent(page);
    this.trail = new TrailPanelComponent(page);
    this.map = new MapComponent(page);
    page.on('pageerror', (error) => this.pageErrors.push(error.message));
  }

  /** Opens the console and waits for the roster and the counters to load. */
  async open(): Promise<void> {
    const [listResponse] = await Promise.all([
      this.waitForApi('GET', apiPaths.offenderList),
      this.waitForApi('GET', apiPaths.stats),
      this.page.goto(uiRoutes.console),
    ]);
    await this.list.waitForRender(listResponse);
  }

  /**
   * Searches for an offender by national ID (unique — names may repeat) and opens their trail.
   */
  async openOffender(offender: { firstName: string; lastName: string; nationalId: string }): Promise<void> {
    await this.list.search(offender.nationalId);
    await this.list.select(offender.lastName, offender.firstName);
  }

  async clickAddOffender(): Promise<void> {
    await this.byRole(offenderListSelectors.addButton, this.list.panel).click();
  }

  errorBanner() {
    return this.page.locator(bannerSelectors.error);
  }

  toast() {
    return this.page.locator(bannerSelectors.toast);
  }

  /** Waits until the selected trail is rendered OR the app has crashed — whichever happens. */
  async waitForTrailOrCrash(): Promise<void> {
    await expect
      .poll(async () => (await this.isBlank()) || (await this.trail.rows.count()) > 0, {
        message: 'trail should render (or the app should visibly crash)',
      })
      .toBe(true);
  }

  /** True when React unmounted the whole app (blank page). */
  async isBlank(): Promise<boolean> {
    return (await this.page.locator(appSelectors.root).innerHTML()).trim() === '';
  }
}
