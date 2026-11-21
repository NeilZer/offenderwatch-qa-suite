import { Locator, Page, Response } from '@playwright/test';
import { OffenderInput } from '@api/types';
import { offenderFormSelectors as sel } from '@selectors/index';
import { BaseComponent, apiPaths } from './base.component';

type FormField = keyof typeof sel.fieldLabels;

export interface SubmitOutcome {
  status: number;
  /** The exact JSON the UI sent — evidence for "UI vs API" layer analysis. */
  requestBody: Record<string, unknown> | null;
  responseBody: unknown;
}

/** Add / Edit offender modal (FR-03, FR-04). */
export class OffenderFormComponent extends BaseComponent {
  readonly modal: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page.locator(sel.modal);
  }

  private field(name: FormField): Locator {
    return this.modal.locator('label', { hasText: sel.fieldLabels[name] }).locator('input, select');
  }

  title(): Promise<string> {
    return this.modal.locator(sel.title).innerText();
  }

  isOpen(): Promise<boolean> {
    return this.modal.isVisible();
  }

  /** Fills only the provided fields; untouched fields keep whatever the form shows. */
  async fill(values: Partial<OffenderInput>): Promise<void> {
    for (const [name, value] of Object.entries(values) as [FormField, string | null | undefined][]) {
      if (value === undefined || value === null) continue;
      const field = this.field(name);
      const tag = await field.evaluate((el) => el.tagName.toLowerCase());
      if (tag === 'select') await field.selectOption(value);
      else await field.fill(value);
    }
  }

  /** Reads the values currently shown in the form. */
  async read(): Promise<Required<Pick<OffenderInput, FormField>>> {
    const names = Object.keys(sel.fieldLabels) as FormField[];
    const values = await Promise.all(names.map((n) => this.field(n).inputValue()));
    return Object.fromEntries(names.map((n, i) => [n, values[i]])) as Required<Pick<OffenderInput, FormField>>;
  }

  submitCreate(): Promise<SubmitOutcome> {
    return this.submit(sel.createButton, 'POST', apiPaths.offenderList);
  }

  submitSave(): Promise<SubmitOutcome> {
    return this.submit(sel.saveButton, 'PUT', apiPaths.offender);
  }

  async cancel(): Promise<void> {
    await this.byRole(sel.cancelButton, this.modal).click();
  }

  private async submit(button: typeof sel.saveButton, method: 'POST' | 'PUT', path: RegExp): Promise<SubmitOutcome> {
    const response = await this.runAndWaitForApi(method, path, () => this.byRole(button, this.modal).click());
    return OffenderFormComponent.toOutcome(response);
  }

  private static async toOutcome(response: Response): Promise<SubmitOutcome> {
    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
    return {
      status: response.status(),
      requestBody: (response.request().postDataJSON() as Record<string, unknown> | null) ?? null,
      responseBody,
    };
  }
}
