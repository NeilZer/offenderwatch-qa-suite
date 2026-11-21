import { LocationInput, OffenderInput } from '@api/types';
import { isoDateFromToday } from './offender.factory';
import { validLocation } from './location.factory';

/**
 * Data tables for validation tests (FR-03, FR-10, API-03).
 * Each row: test-case id, human description, the payload override, and the bug that currently
 * breaks it (if any). Adding a new rule = adding a row, not writing a new test.
 */

export interface InvalidCase<T> {
  tc: string;
  name: string;
  override: Partial<T>;
  /** Present when the case currently fails because of a documented defect. */
  knownBug?: string;
}

/** Offender payload overrides that MUST be rejected with 400 + error description (FR-03 / API-03). */
export const INVALID_OFFENDER_CASES: InvalidCase<OffenderInput>[] = [
  { tc: 'TC-14', name: 'missing first name', override: { firstName: '' } },
  { tc: 'TC-14', name: 'whitespace-only first name', override: { firstName: '   ' } },
  { tc: 'TC-15', name: 'missing last name', override: { lastName: '' }, knownBug: 'BUG-10' },
  { tc: 'TC-15', name: 'missing national ID', override: { nationalId: '' }, knownBug: 'BUG-10' },
  { tc: 'TC-17', name: 'date of birth in the future', override: { dateOfBirth: isoDateFromToday(365) }, knownBug: 'BUG-11' },
  { tc: 'TC-17', name: 'date of birth is not a date', override: { dateOfBirth: 'not-a-date' }, knownBug: 'BUG-11' },
  { tc: 'TC-18', name: 'risk level outside Low/Medium/High', override: { riskLevel: 'Critical' }, knownBug: 'BUG-12' },
  { tc: 'TC-18', name: 'status outside Active/Inactive', override: { status: 'Deleted' }, knownBug: 'BUG-12' },
];

/** Overrides that PUT must reject exactly like POST does (FR-04 / API-03). */
export const INVALID_UPDATE_CASES: InvalidCase<OffenderInput>[] = [
  { tc: 'TC-24', name: 'empty first name', override: { firstName: '' }, knownBug: 'BUG-13' },
  { tc: 'TC-24', name: 'date of birth in the future', override: { dateOfBirth: isoDateFromToday(365) }, knownBug: 'BUG-13' },
  { tc: 'TC-24', name: 'risk level outside Low/Medium/High', override: { riskLevel: 'Extreme' }, knownBug: 'BUG-13' },
];

/** Location payload overrides that MUST be rejected with 400 + error description (FR-10 / API-03). */
export const INVALID_LOCATION_CASES: InvalidCase<LocationInput>[] = [
  { tc: 'TC-41', name: 'latitude above 90', override: { lat: 90.0001 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'latitude below -90', override: { lat: -91 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'longitude above 180', override: { lon: 180.5 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'longitude below -180', override: { lon: -181 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'negative speed', override: { speedKmh: -1 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'battery below 0', override: { batteryPct: -1 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'battery above 100', override: { batteryPct: 101 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'signal below 1', override: { signal: 0 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'signal above 5', override: { signal: 6 }, knownBug: 'BUG-14' },
  { tc: 'TC-41', name: 'latitude missing (null)', override: { lat: null }, knownBug: 'BUG-18' },
];

/** Boundary values that MUST be accepted (FR-10) — guards against over-strict validation. */
export const VALID_LOCATION_BOUNDARIES: { name: string; payload: LocationInput }[] = [
  { name: 'lat 90 / lon 180, speed 0, battery 0, signal 1', payload: validLocation({ lat: 90, lon: 180, speedKmh: 0, batteryPct: 0, signal: 1 }) },
  { name: 'lat -90 / lon -180, battery 100, signal 5', payload: validLocation({ lat: -90, lon: -180, batteryPct: 100, signal: 5 }) },
];

/** Page sizes used to check totalPages = ceil(total / pageSize) (API-01). */
export const PAGE_SIZES_TO_CHECK = [1, 2, 3, 4, 5, 6, 10, 11, 12, 50];

/** Search terms with characters that are wildcards in SQL — must be treated literally (FR-02). */
export const SPECIAL_CHAR_SEARCHES = ['%', '_', "'", '"', 'zzzz-no-such-offender'];
