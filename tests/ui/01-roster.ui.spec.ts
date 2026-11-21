import { test, expect } from '@fixtures/test.fixtures';
import { environment } from '@config/environment';
import { SEED } from '@data/seed.data';
import { compareNames, expectedTotalPages, findDuplicates } from '@helpers/collection.helper';
import { isoDateToDdMmYyyy } from '@helpers/date.helper';
import { bugMessage, knownBug } from '@helpers/known-bug';
import { OffenderListComponent } from '@pages/components/offender-list.component';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * FR-01 / FR-02 / FR-06 — the offender roster as an operator sees it.
 */
test.describe('UI · offender roster', () => {
  test.beforeEach(async ({ consolePage }) => {
    await consolePage.open();
  });

  /**
   * TC-01 · FR-01
   * WHAT : the first page shows exactly 5 offenders, sorted alphabetically by last name, and they
   *        are the first 5 of the full, sorted roster returned by the API.
   * URL  : UI {BASE_URL}  (roster table)   vs   GET {BASE_URL}api/offenders?page=1&pageSize=1000
   */
  test('TC-01 first page lists 5 offenders sorted by last name', { tag: ['@TC-01', '@FR-01', '@ui'] }, async ({ consolePage, api }) => {
    const all = await api.listAllOffendersOrThrow();
    const expectedFirstPage = [...all.items]
      .sort((a, b) => compareNames(a.lastName, b.lastName))
      .slice(0, environment.uiPageSize)
      .map((o) => OffenderListComponent.displayName(o.lastName, o.firstName));

    const shown = await consolePage.list.readNames();

    expect(shown).toHaveLength(Math.min(environment.uiPageSize, all.total));
    expect(shown).toEqual(expectedFirstPage);
  });

  /**
   * TC-02 · FR-01
   * WHAT : the pager gives access to every offender: page count = ceil(total / 5), and paging with
   *        "Next" until it is disabled shows every offender in the result count, each once.
   * URL  : UI {BASE_URL}  (pager "Page x of y (n results)", Next ›)
   */
  test('TC-02 pager reaches every offender and shows ceil(total/5) pages', { tag: ['@TC-02', '@FR-01', '@ui'] }, async ({ consolePage, api, testData }) => {
    knownBug('BUG-01');
    // Deterministic: the defect needs a partial last page (total not a multiple of 5).
    if ((await api.listAllOffendersOrThrow()).total % environment.uiPageSize === 0) {
      await testData.createOffender();
      await consolePage.open();
    }

    const pager = await consolePage.list.readPager();
    const reachable = (await consolePage.list.collectAllRowsByPaging()).map(OffenderListComponent.rowKey);

    expect(findDuplicates(reachable), 'no offender shown twice').toEqual([]);
    expect(pager.totalPages, bugMessage('BUG-01', `pages must be ceil(${pager.total}/5)`)).toBe(expectedTotalPages(pager.total, environment.uiPageSize));
    expect(reachable.length, bugMessage('BUG-01', `all ${pager.total} offenders must be reachable by paging`)).toBe(pager.total);
  });

  /**
   * TC-10 · FR-02
   * WHAT : typing the last name in lower case in the search box finds the offender
   *        (case-insensitive search through the UI).
   * URL  : UI {BASE_URL}  search box  →  GET {BASE_URL}api/offenders?search=cohen&page=1&pageSize=5
   */
  test('TC-10 lower-case search in the UI finds the offender', { tag: ['@TC-10', '@FR-02', '@ui'] }, async ({ consolePage }) => {
    knownBug('BUG-07');
    const { lastName, firstName } = SEED.cohen;

    await consolePage.list.search(lastName.toLowerCase());

    // search() already waited for the API response and the re-render, so no long wait is needed.
    await expect(consolePage.list.row(lastName, firstName), bugMessage('BUG-07', `"${lastName.toLowerCase()}" must find ${lastName}, ${firstName}`)).toBeVisible({ timeout: 3_000 });
  });

  /**
   * TC-29 · FR-06
   * WHAT : every date of birth in the roster is displayed as DD/MM/YYYY and equals the value the
   *        API stores (checked across all reachable pages).
   * URL  : UI {BASE_URL}  "Date of birth" column   vs   GET {BASE_URL}api/offenders?page=1&pageSize=1000
   */
  test('TC-29 roster dates of birth are DD/MM/YYYY and match the stored value', { tag: ['@TC-29', '@FR-06', '@ui'] }, async ({ consolePage, api }) => {
    knownBug('BUG-04');
    // Key = name + national ID (names repeat). Records whose stored DOB is not even a date (BUG-11
    // test data) are out of scope here: FR-06 is about how a valid stored date is displayed.
    const stored = new Map(
      (await api.listAllOffendersOrThrow()).items
        .filter((o) => ISO_DATE.test(o.dateOfBirth))
        .map((o) => [OffenderListComponent.rowKey({ name: OffenderListComponent.displayName(o.lastName, o.firstName), nationalId: o.nationalId }), o.dateOfBirth]),
    );

    const rows = [...(await consolePage.list.readRows())];
    while (!(await consolePage.list.nextButton().isDisabled())) {
      await consolePage.list.goToNextPage();
      rows.push(...(await consolePage.list.readRows()));
    }

    const mismatches = rows
      .filter((row) => stored.has(OffenderListComponent.rowKey(row)))
      .map((row) => ({ name: row.name, shown: row.dateOfBirth, expected: isoDateToDdMmYyyy(stored.get(OffenderListComponent.rowKey(row))!) }))
      .filter((r) => r.shown !== r.expected);
    expect(mismatches, bugMessage('BUG-04', 'displayed DOB must equal the stored DOB')).toEqual([]);
  });

  /**
   * TC-30 · FR-06
   * WHAT : the DOB in the selected offender's header equals the stored value
   *        (Mizrahi, Rachel — a January birthday: 1988-01-12 → 12/01/1988).
   * URL  : UI {BASE_URL}  detail header "DOB:"   vs   GET {BASE_URL}api/offenders/4
   */
  test('TC-30 detail header shows the stored date of birth', { tag: ['@TC-30', '@FR-06', '@ui'] }, async ({ consolePage, api }) => {
    knownBug('BUG-04');
    const stored = await api.getOffenderOrThrow(SEED.mizrahi.id);

    await consolePage.openOffender(SEED.mizrahi);

    expect(await consolePage.trail.dateOfBirth(), bugMessage('BUG-04', 'header DOB must equal the stored DOB')).toBe(isoDateToDdMmYyyy(stored.dateOfBirth));
  });
});
