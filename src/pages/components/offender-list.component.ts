import { Locator, Page, Response, expect } from '@playwright/test';
import { OffenderPage } from '@api/types';
import { offenderListSelectors as sel } from '@selectors/index';
import { BaseComponent, apiPaths } from './base.component';

export interface RosterRow {
  /** As displayed: "Last, First" */
  name: string;
  nationalId: string;
  dateOfBirth: string;
  risk: string;
  status: string;
}

export interface PagerState {
  page: number;
  totalPages: number;
  total: number;
}

export type DeleteDecision = 'accept' | 'dismiss';

/** Roster table: search, rows, row actions and pager (FR-01, FR-02, FR-05). */
export class OffenderListComponent extends BaseComponent {
  private static readonly MAX_PAGES_TO_WALK = 100;
  readonly panel: Locator;
  readonly rows: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.panel = page.locator(sel.panel);
    this.rows = page.locator(sel.rows);
    this.searchInput = this.panel.locator(sel.searchInput);
  }

  // ---------- reading ----------
  async readRows(): Promise<RosterRow[]> {
    if (await this.isEmpty()) return [];
    const texts = await this.rows.evaluateAll((trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim())),
    );
    return texts.map((cells) => ({
      name: cells[sel.columns.name],
      nationalId: cells[sel.columns.nationalId],
      dateOfBirth: cells[sel.columns.dateOfBirth],
      risk: cells[sel.columns.risk],
      status: cells[sel.columns.status],
    }));
  }

  async readNames(): Promise<string[]> {
    return (await this.readRows()).map((r) => r.name);
  }

  isEmpty(): Promise<boolean> {
    return this.page.locator(sel.emptyRow).isVisible();
  }

  row(lastName: string, firstName: string): Locator {
    return this.rows.filter({ hasText: OffenderListComponent.displayName(lastName, firstName) });
  }

  async readRow(lastName: string, firstName: string): Promise<RosterRow> {
    const row = this.row(lastName, firstName);
    await expect(row, `row "${lastName}, ${firstName}" should be visible`).toHaveCount(1);
    const all = await this.readRows();
    const found = all.find((r) => r.name === OffenderListComponent.displayName(lastName, firstName));
    if (!found) throw new Error(`Row "${lastName}, ${firstName}" not found in ${JSON.stringify(all)}`);
    return found;
  }

  // ---------- pager ----------
  async readPager(): Promise<PagerState> {
    const text = await this.page.locator(sel.pagerText).innerText();
    const match = sel.pagerPattern.exec(text);
    if (!match) throw new Error(`Unexpected pager text: "${text}"`);
    return { page: Number(match[1]), totalPages: Number(match[2]), total: Number(match[3]) };
  }

  nextButton(): Locator {
    return this.byRole(sel.nextButton, this.panel);
  }

  prevButton(): Locator {
    return this.byRole(sel.prevButton, this.panel);
  }

  async goToNextPage(): Promise<void> {
    await this.reloadVia(() => this.nextButton().click());
  }

  /**
   * Walks the pager from the current page using "Next" until it is disabled and returns every
   * name that was displayed. This is what an operator can actually reach (FR-01).
   */
  async collectAllRowsByPaging(): Promise<RosterRow[]> {
    const rows = [...(await this.readRows())];
    for (let i = 0; i < OffenderListComponent.MAX_PAGES_TO_WALK; i += 1) {
      if (await this.nextButton().isDisabled()) return rows;
      await this.goToNextPage();
      rows.push(...(await this.readRows()));
    }
    throw new Error(`Pager did not end after ${OffenderListComponent.MAX_PAGES_TO_WALK} pages`);
  }

  /**
   * The name exactly as the roster displays it: "Last, First", whitespace-normalised like the text
   * read from the screen. Matters for records with empty names (BUG-10 data), which show as ",".
   */
  static displayName(lastName: string, firstName: string): string {
    return `${lastName}, ${firstName}`.replace(/\s+/g, ' ').trim();
  }

  /**
   * Identity of a roster row. Names can repeat and the app even allows duplicate national IDs
   * (BUG-09), so a row is identified by both together.
   */
  static rowKey(row: Pick<RosterRow, 'name' | 'nationalId'>): string {
    return `${row.name}|${row.nationalId}`;
  }

  // ---------- search ----------
  async search(term: string): Promise<void> {
    if ((await this.searchInput.inputValue()) === term) return;
    await this.reloadVia(() => this.searchInput.fill(term));
  }

  // ---------- row actions ----------
  /** Clicks a row and waits for its trail to load. */
  async select(lastName: string, firstName: string): Promise<void> {
    await this.runAndWaitForApi('GET', apiPaths.trail, () => this.row(lastName, firstName).click());
  }

  async clickEdit(lastName: string, firstName: string): Promise<void> {
    await this.byRole(sel.editButton, this.row(lastName, firstName)).click();
  }

  /**
   * Clicks Delete and answers the browser confirmation. Returns the prompt text, or null if no
   * confirmation appeared (which would itself violate FR-05).
   */
  async clickDelete(lastName: string, firstName: string, decision: DeleteDecision): Promise<string | null> {
    let promptText: string | null = null;
    const handler = async (dialog: import('@playwright/test').Dialog) => {
      promptText = dialog.message();
      await (decision === 'accept' ? dialog.accept() : dialog.dismiss());
    };
    this.page.once('dialog', handler);
    try {
      const button = this.byRole(sel.deleteButton, this.row(lastName, firstName));
      if (decision === 'accept') {
        await this.runAndWaitForApi('DELETE', apiPaths.offender, () => button.click());
        await this.waitForApi('GET', apiPaths.offenderList).catch(() => undefined);
      } else {
        await button.click();
      }
    } finally {
      this.page.off('dialog', handler);
    }
    return promptText;
  }

  // ---------- synchronisation ----------
  /** Performs an action that reloads the list, then waits until the table shows the new data. */
  async reloadVia(action: () => Promise<void>): Promise<OffenderPage> {
    const response = await this.runAndWaitForApi('GET', apiPaths.offenderList, action);
    return this.waitForRender(response);
  }

  async waitForRender(response: Response): Promise<OffenderPage> {
    const data = (await response.json()) as OffenderPage;
    if (data.items.length === 0) {
      await expect(this.page.locator(sel.emptyRow)).toBeVisible();
    } else {
      const first = data.items[0];
      await expect(this.rows).toHaveCount(data.items.length);
      await expect(this.rows.first()).toContainText(OffenderListComponent.displayName(first.lastName, first.firstName));
    }
    return data;
  }
}
