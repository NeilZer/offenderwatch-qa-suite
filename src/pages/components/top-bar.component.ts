import { Locator, Page } from '@playwright/test';
import { Stats } from '@api/types';
import { topBarSelectors as sel } from '@selectors/index';
import { BaseComponent, leadingNumber } from './base.component';

/** The three live counters in the header (FR-11). */
export class TopBarComponent extends BaseComponent {
  private readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.locator(sel.root);
  }

  private counter(label: string): Locator {
    return this.root
      .locator(sel.stat)
      .filter({ has: this.page.locator(sel.statLabel, { hasText: new RegExp(`^${label}$`) }) })
      .locator(sel.statValue);
  }

  async readStats(): Promise<Stats> {
    await this.counter(sel.labels.offenders).waitFor();
    const [offenders, active, points] = await Promise.all([
      this.counter(sel.labels.offenders).innerText(),
      this.counter(sel.labels.active).innerText(),
      this.counter(sel.labels.trailPoints).innerText(),
    ]);
    return {
      totalOffenders: leadingNumber(offenders),
      activeOffenders: leadingNumber(active),
      totalLocationPoints: leadingNumber(points),
    };
  }
}
