/**
 * Expected-value builders for dates (FR-06). These are computed INDEPENDENTLY of the app's own
 * formatting code, from the raw value the API stores.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "1982-03-07" -> "07/03/1982". Pure string transform: a calendar date has no timezone. */
export function isoDateToDdMmYyyy(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate);
  if (!match) throw new Error(`Not an ISO calendar date (yyyy-mm-dd): "${isoDate}"`);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * An ISO instant rendered the way an operator in `timeZone` should see it:
 * "2026-08-09T11:29:00Z" in Asia/Jerusalem -> "09/08/2026, 14:29".
 */
export function instantToDdMmYyyyHhMm(isoInstant: string, timeZone: string): string {
  const date = new Date(isoInstant);
  if (Number.isNaN(date.getTime())) throw new Error(`Not a valid ISO timestamp: "${isoInstant}"`);
  return date.toLocaleString('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DD_MM_YYYY = /^\d{2}\/\d{2}\/\d{4}$/;
