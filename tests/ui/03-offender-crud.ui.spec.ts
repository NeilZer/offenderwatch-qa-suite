import { test, expect } from '@fixtures/test.fixtures';
import { differentFirstName, validOffender } from '@data/offender.factory';
import { bugMessage, knownBug } from '@helpers/known-bug';

/**
 * FR-03 / FR-04 / FR-05 / FR-11 — create, edit and delete through the console.
 */
test.describe('UI · create, edit, delete offender', () => {
  /**
   * TC-12 · FR-03, FR-11
   * WHAT : creating a valid offender through the Add Offender form saves it, shows a success
   *        message, lists it with the entered values and raises the top-bar counters by one.
   * URL  : UI {BASE_URL}  "+ Add Offender" → Create  →  POST {BASE_URL}api/offenders
   */
  test('TC-12 operator creates a valid offender', { tag: ['@TC-12', '@FR-03', '@FR-11', '@ui'] }, async ({ consolePage, testData }) => {
    const input = validOffender({ riskLevel: 'High', status: 'Active' });
    await consolePage.open();
    const before = await consolePage.topBar.readStats();

    await consolePage.clickAddOffender();
    await consolePage.form.fill(input);
    const outcome = await consolePage.form.submitCreate();
    await testData.register(outcome.responseBody);

    expect(outcome.status).toBe(201);
    await expect(consolePage.toast()).toHaveText('Offender created');
    await expect.poll(() => consolePage.topBar.readStats()).toMatchObject({
      totalOffenders: before.totalOffenders + 1,
      activeOffenders: before.activeOffenders + 1,
    });
    await consolePage.list.search(input.nationalId!);
    expect(await consolePage.list.readRow(input.lastName!, input.firstName!)).toMatchObject({
      nationalId: input.nationalId,
      risk: input.riskLevel,
      status: input.status,
    });
  });

  /**
   * TC-19 · FR-03 (negative)
   * WHAT : submitting an empty Add Offender form is rejected with a clear error message, the form
   *        stays open and nothing is saved (offender counter unchanged).
   * URL  : UI {BASE_URL}  "+ Add Offender" → Create (empty)  →  POST {BASE_URL}api/offenders → 400
   */
  test('TC-19 empty create form shows an error and saves nothing', { tag: ['@TC-19', '@FR-03', '@ui', '@negative'] }, async ({ consolePage, api, testData }) => {
    await consolePage.open();
    const before = await api.getStatsOrThrow();

    await consolePage.clickAddOffender();
    const outcome = await consolePage.form.submitCreate();
    await testData.register(outcome.responseBody);

    expect(outcome.status).toBe(400);
    await expect(consolePage.errorBanner()).toContainText('required');
    expect(await consolePage.form.isOpen(), 'form must stay open for correction').toBe(true);
    expect((await api.getStatsOrThrow()).totalOffenders).toBe(before.totalOffenders);
  });

  /**
   * TC-21 · FR-04
   * WHAT : editing ONE field (first name) keeps every untouched field — in particular a High risk
   *        level — unchanged after Save.
   * URL  : UI {BASE_URL}  Edit → Save  →  PUT {BASE_URL}api/offenders/{id}   (verified with GET {BASE_URL}api/offenders/{id})
   */
  test('TC-21 editing the first name keeps the other fields unchanged', { tag: ['@TC-21', '@FR-04', '@ui'] }, async ({ consolePage, api, testData }, testInfo) => {
    knownBug('BUG-03');
    const offender = await testData.createOffender({ riskLevel: 'High', status: 'Active' });
    await consolePage.open();
    await consolePage.list.search(offender.nationalId);

    await consolePage.list.clickEdit(offender.lastName, offender.firstName);
    expect(await consolePage.form.read()).toMatchObject({ riskLevel: 'High' }); // form shows the stored value
    const newFirstName = differentFirstName(offender.firstName);
    await consolePage.form.fill({ firstName: newFirstName });
    const outcome = await consolePage.form.submitSave();
    await testInfo.attach('PUT request sent by the UI', { body: JSON.stringify(outcome.requestBody, null, 2), contentType: 'application/json' });

    const stored = await api.getOffenderOrThrow(offender.id);
    expect(stored.firstName).toBe(newFirstName);
    expect(stored.riskLevel, bugMessage('BUG-03', 'untouched risk level must stay High')).toBe('High');
    expect({ ...stored, firstName: offender.firstName }).toMatchObject({ ...offender });
  });

  /**
   * TC-22 · FR-04
   * WHAT : the values shown in the form are exactly what gets saved — changing Risk level to
   *        Medium in the form persists Medium.
   * URL  : UI {BASE_URL}  Edit → Risk level = Medium → Save  →  PUT {BASE_URL}api/offenders/{id}
   */
  test('TC-22 changing risk level in the form persists the shown value', { tag: ['@TC-22', '@FR-04', '@ui'] }, async ({ consolePage, api, testData }, testInfo) => {
    knownBug('BUG-03');
    const offender = await testData.createOffender({ riskLevel: 'High' });
    await consolePage.open();
    await consolePage.list.search(offender.nationalId);

    await consolePage.list.clickEdit(offender.lastName, offender.firstName);
    await consolePage.form.fill({ riskLevel: 'Medium' });
    const shown = await consolePage.form.read();
    const outcome = await consolePage.form.submitSave();
    await testInfo.attach('PUT request sent by the UI', { body: JSON.stringify(outcome.requestBody, null, 2), contentType: 'application/json' });

    const stored = await api.getOffenderOrThrow(offender.id);
    expect(stored.riskLevel, bugMessage('BUG-03', 'saved risk level must equal the value shown in the form')).toBe(shown.riskLevel);
    await expect(consolePage.list.row(offender.lastName, offender.firstName)).toContainText(shown.riskLevel!);
  });

  /**
   * TC-25 · FR-05
   * WHAT : Delete asks for confirmation; dismissing keeps the offender, confirming removes it
   *        from the roster and from the API.
   * URL  : UI {BASE_URL}  Delete → confirm dialog  →  DELETE {BASE_URL}api/offenders/{id}
   */
  test('TC-25 delete requires confirmation and removes the offender', { tag: ['@TC-25', '@FR-05', '@ui'] }, async ({ consolePage, api, testData }) => {
    const offender = await testData.createOffender();
    await consolePage.open();
    await consolePage.list.search(offender.nationalId);
    const row = consolePage.list.row(offender.lastName, offender.firstName);

    const dismissedPrompt = await consolePage.list.clickDelete(offender.lastName, offender.firstName, 'dismiss');
    expect(dismissedPrompt, 'a confirmation prompt must appear').toContain(`${offender.firstName} ${offender.lastName}`);
    await expect(row, 'dismissing must keep the offender').toBeVisible();

    const acceptedPrompt = await consolePage.list.clickDelete(offender.lastName, offender.firstName, 'accept');
    await testData.forget(offender.id);
    expect(acceptedPrompt).not.toBeNull();
    await expect(row).toHaveCount(0);
    await expect(consolePage.toast()).toHaveText('Offender deleted');
    const remaining = (await api.listAllOffendersOrThrow(offender.nationalId)).items;
    expect(remaining.map((o) => o.id)).not.toContain(offender.id);
  });
});
