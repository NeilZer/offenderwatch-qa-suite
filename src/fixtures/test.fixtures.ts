import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@api/api-client';
import { OffenderWatchApi } from '@api/offender-watch.api';
import { ConsolePage } from '@pages/console.page';
import { TestDataTracker } from '@helpers/test-data-tracker';

/**
 * Custom fixtures — every spec imports `test` / `expect` from here.
 *
 *  api          OffenderWatch API client bound to BASE_URL
 *  testData     creates records for the test and deletes them afterwards (never seeded data)
 *  consolePage  page object for the monitoring console (not opened yet — call .open())
 */
interface Fixtures {
  api: OffenderWatchApi;
  testData: TestDataTracker;
  consolePage: ConsolePage;
}

export const test = base.extend<Fixtures>({
  api: async ({ request }, use, testInfo) => {
    const client = new ApiClient(request);
    await use(new OffenderWatchApi(client));
    if (client.exchanges.length) {
      // Evidence: every request/response of the test, in order — the last one is the final/offending call.
      await testInfo.attach('api-exchanges', {
        body: JSON.stringify(client.exchanges, null, 2),
        contentType: 'application/json',
      });
    }
  },

  testData: async ({ api }, use) => {
    const tracker = new TestDataTracker(api);
    await use(tracker);
    api.beginTeardown(); // evidence: the offending call is the test's last call, not the clean-up
    await tracker.cleanup(); // runs even if the test failed
  },

  consolePage: async ({ page }, use, testInfo) => {
    const consolePage = new ConsolePage(page);
    await use(consolePage);
    if (consolePage.pageErrors.length) {
      // Attach browser-side exceptions to the report: key evidence for UI-layer defects.
      await testInfo.attach('page-errors', { body: consolePage.pageErrors.join('\n'), contentType: 'text/plain' });
    }
  },
});

export { expect };
