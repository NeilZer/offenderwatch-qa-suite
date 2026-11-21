import { LocationInput } from '@api/types';

/** Builders for location (trail point) payloads — FR-10. */

/** Tel Aviv centre: the seeded trails live around here, so new points render in the same map view. */
export const TEL_AVIV = Object.freeze({ lat: 32.0853, lon: 34.7818 });

export function validLocation(overrides: Partial<LocationInput> = {}): LocationInput {
  return {
    lat: TEL_AVIV.lat,
    lon: TEL_AVIV.lon,
    speedKmh: 12.5,
    batteryPct: 80,
    signal: 4,
    ...overrides,
  };
}

/**
 * A short trail whose points are INSERTED out of chronological order, with distinct readings per
 * point. Lets a test know exactly which reading is the most recent / the oldest.
 *   inserted order : 10:30, 10:00, 10:45, 10:15
 *   chronological  : 10:00, 10:15, 10:30, 10:45 (newest)
 */
export function outOfOrderTrail(day = '2026-10-01'): LocationInput[] {
  return [
    validLocation({ timestamp: `${day}T10:30:00Z`, lat: 32.0870, lon: 34.7830, speedKmh: 30, batteryPct: 70, signal: 3 }),
    validLocation({ timestamp: `${day}T10:00:00Z`, lat: 32.0850, lon: 34.7810, speedKmh: 10, batteryPct: 90, signal: 5 }),
    validLocation({ timestamp: `${day}T10:45:00Z`, lat: 32.0880, lon: 34.7840, speedKmh: 40, batteryPct: 60, signal: 2 }),
    validLocation({ timestamp: `${day}T10:15:00Z`, lat: 32.0860, lon: 34.7820, speedKmh: 20, batteryPct: 80, signal: 4 }),
  ];
}
