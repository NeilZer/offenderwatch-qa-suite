import { OffenderInput } from '@api/types';
import { FIRST_NAMES, LAST_NAMES } from './names.data';

/**
 * Builders for offender payloads.
 *
 * Every generated offender gets a realistic name and a UNIQUE national ID ("99" + 7 digits).
 * The national ID is how tests find their own records (search supports it), so two test records
 * may share a name without any risk of a test picking the wrong row.
 */

/** National IDs created by this suite start with this prefix (seeded IDs start with 2 or 3). */
export const TEST_NATIONAL_ID_PREFIX = '99';

let counter = 0;

/** 9-digit national ID starting with "99", unique per call (time + counter + random). */
export function uniqueNationalId(): string {
  counter += 1;
  const digits = `${Date.now()}${Math.floor(Math.random() * 1e6)}`.slice(-7);
  return `${TEST_NATIONAL_ID_PREFIX}${(Number(digits) + counter).toString().padStart(7, '0').slice(-7)}`;
}

export function randomFirstName(): string {
  return pick(FIRST_NAMES);
}

/** A real first name that differs from `current` — used to make a visible edit. */
export function differentFirstName(current: string): string {
  const options = FIRST_NAMES.filter((name) => name !== current);
  return pick(options);
}

export function randomLastName(): string {
  return pick(LAST_NAMES);
}

/** A fully valid offender per FR-03. Override any field for a specific scenario. */
export function validOffender(overrides: Partial<OffenderInput> = {}): Required<OffenderInput> {
  return {
    firstName: randomFirstName(),
    lastName: randomLastName(),
    nationalId: uniqueNationalId(),
    dateOfBirth: '1985-04-17',
    riskLevel: 'Medium',
    status: 'Active',
    ...overrides,
  } as Required<OffenderInput>;
}

/** Date string (yyyy-mm-dd) N days from today; positive = future. */
export function isoDateFromToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function pick<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}
