/**
 * Realistic names for offenders created by the tests.
 *
 * None of these last names belongs to a seeded offender (Cohen, Levi, Peretz, …), so a test
 * record is never confused with seeded data. Names may repeat between test records — tests
 * identify their own records by the unique national ID, never by name.
 */
export const FIRST_NAMES = [
  'Yael', 'Omer', 'Tamar', 'Ron', 'Shira', 'Daniel', 'Lior', 'Noam',
  'Michal', 'Ariel', 'Hila', 'Guy', 'Roni', 'Itai', 'Adi', 'Yonatan',
] as const;

export const LAST_NAMES = [
  'Friedman', 'Katz', 'Shapiro', 'Golan', 'Klein', 'Rosen', 'Weiss', 'Hadad',
  'Elbaz', 'Segal', 'Barak', 'Avraham', 'Nachum', 'Sasson', 'Tal', 'Harel',
] as const;
