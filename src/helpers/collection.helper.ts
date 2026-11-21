import { TrailPoint } from '@api/types';

/** Ordering / collection utilities shared by API and UI tests. */

export function byTimestamp(a: { timestamp: string }, b: { timestamp: string }): number {
  return Date.parse(a.timestamp) - Date.parse(b.timestamp);
}

/** Returns a NEW array sorted oldest -> newest (never mutates the input). */
export function chronological<T extends { timestamp: string }>(points: readonly T[]): T[] {
  return [...points].sort(byTimestamp);
}

export function newestPoint(points: readonly TrailPoint[]): TrailPoint {
  if (points.length === 0) throw new Error('Trail is empty — no newest point');
  return chronological(points)[points.length - 1];
}

export function oldestPoint(points: readonly TrailPoint[]): TrailPoint {
  if (points.length === 0) throw new Error('Trail is empty — no oldest point');
  return chronological(points)[0];
}

/** Alphabetical, case-insensitive comparison used for the "sorted by last name" rule (FR-01). */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

export function sortedByName(values: readonly string[]): string[] {
  return [...values].sort(compareNames);
}

export function expectedTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

export function findDuplicates<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const dupes = new Set<T>();
  values.forEach((v) => (seen.has(v) ? dupes.add(v) : seen.add(v)));
  return [...dupes];
}
