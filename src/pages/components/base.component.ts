import { Locator, Page, Response } from '@playwright/test';

/** Role-based locator spec as stored in the selector files. */
export interface RoleSpec {
  role: 'button';
  name: string;
  exact?: boolean;
}

export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Shared plumbing for every UI component:
 *  - resolving selector specs into locators,
 *  - waiting for the API call a UI action triggers (so tests are synchronised on real network
 *    events, never on fixed sleeps).
 */
export abstract class BaseComponent {
  protected static readonly API_TIMEOUT_MS = 15_000;

  constructor(protected readonly page: Page) {}

  protected byRole(spec: RoleSpec, scope: Page | Locator = this.page): Locator {
    return scope.getByRole(spec.role, { name: spec.name, exact: spec.exact ?? true });
  }

  /**
   * Resolves with the first response whose method matches and whose URL path matches `pathPattern`.
   * Start the wait BEFORE triggering the action (see `runAndWaitForApi`).
   */
  protected waitForApi(method: HttpVerb, pathPattern: RegExp): Promise<Response> {
    return this.page.waitForResponse(
      (response) =>
        response.request().method() === method && pathPattern.test(new URL(response.url()).pathname),
      { timeout: BaseComponent.API_TIMEOUT_MS },
    );
  }

  /** Runs a UI action and returns the API response it caused. */
  protected async runAndWaitForApi(method: HttpVerb, pathPattern: RegExp, action: () => Promise<void>): Promise<Response> {
    const [response] = await Promise.all([this.waitForApi(method, pathPattern), action()]);
    return response;
  }
}

/** URL path patterns of the API calls the console makes (match on pathname only). */
export const apiPaths = Object.freeze({
  offenderList: /\/api\/offenders$/,
  offender: /\/api\/offenders\/\d+$/,
  trail: /\/api\/offenders\/\d+\/trail$/,
  locations: /\/api\/offenders\/\d+\/locations$/,
  stats: /\/api\/stats$/,
});

/** Parses the leading number of strings like "38.4 km/h", "87%", "4/5". */
export function leadingNumber(text: string): number {
  const match = /-?\d+(?:\.\d+)?/.exec(text);
  if (!match) throw new Error(`No number found in "${text}"`);
  return Number(match[0]);
}
