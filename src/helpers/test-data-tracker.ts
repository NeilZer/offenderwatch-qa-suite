import { test } from '@playwright/test';
import { OffenderWatchApi } from '@api/offender-watch.api';
import { Offender, OffenderInput, LocationInput } from '@api/types';
import { isSeeded } from '@data/seed.data';
import { validOffender } from '@data/offender.factory';
import { PlatformClient, platformSettings } from '../reporting/platform-client';

interface TrackedOffender {
  id: number;
  nationalId?: string;
  label?: string;
}

/**
 * Owns every record a test creates.
 *
 * Guarantees:
 *  - seeded offenders (ids 1–11) are NEVER deleted, even if a test registers one by mistake;
 *  - clean-up runs even when the test fails, and a clean-up error is reported as a warning
 *    annotation instead of overriding the real test result;
 *  - when the suite runs under the Test Management Platform (Part 5, TM-06), every record is
 *    registered with the platform THE MOMENT IT IS CREATED, attributed to the run. If the run is
 *    stopped mid-test (no teardown), the platform still knows the record and "Clean test data"
 *    removes it. After a normal teardown the record is marked "deleted by test".
 *
 * KEEP_TEST_DATA=true skips the teardown delete, leaving the data for the platform's clean-up.
 *
 * Known limitation (BUG-02): deleting an offender leaves its trail points behind in the application.
 */
export class TestDataTracker {
  private readonly offenders = new Map<number, TrackedOffender>();
  private readonly platform = (() => {
    const settings = platformSettings();
    return settings ? new PlatformClient(settings) : null;
  })();
  private readonly keepData = ['1', 'true', 'yes'].includes((process.env.KEEP_TEST_DATA ?? '').toLowerCase());

  constructor(private readonly api: OffenderWatchApi) {}

  /** Creates a valid offender (with optional overrides) and registers it. */
  async createOffender(overrides: Partial<OffenderInput> = {}): Promise<Offender> {
    const offender = await this.api.createOffenderOrThrow(validOffender(overrides));
    await this.register(offender);
    return offender;
  }

  /** Creates an offender and adds the given points in the given order; points are registered as its children. */
  async createOffenderWithTrail(points: LocationInput[], overrides: Partial<OffenderInput> = {}): Promise<Offender> {
    const offender = await this.createOffender(overrides);
    for (const point of points) {
      await this.api.addLocationOrThrow(offender.id, point);
    }
    if (this.platform) {
      const trail = await this.api.getTrailOrThrow(offender.id);
      for (const p of trail) {
        await this.notifyPlatform('/test-data', {
          kind: 'LocationPoint',
          externalId: String(p.id),
          parentExternalId: String(offender.id),
          label: `Point ${p.lat.toFixed(4)}, ${p.lon.toFixed(4)}`,
          scenarioTitle: test.info().title,
        });
      }
    }
    return offender;
  }

  /**
   * Registers a record created elsewhere (through the UI, or by an API call under test that should
   * have been rejected). Accepts an id or an offender-like object ({ id, nationalId, firstName, lastName }).
   */
  async register(entity: unknown): Promise<void> {
    const tracked = await this.toTracked(entity);
    if (!tracked) return;
    if (isSeeded(tracked.id)) {
      test.info().annotations.push({ type: 'warning', description: `Refused to track seeded offender ${tracked.id} for clean-up` });
      return;
    }
    if (this.offenders.has(tracked.id)) return;
    this.offenders.set(tracked.id, tracked);
    await this.notifyPlatform('/test-data', {
      kind: 'Offender',
      externalId: String(tracked.id),
      naturalKey: tracked.nationalId ?? null,
      label: tracked.label ?? `Offender ${tracked.id}`,
      scenarioTitle: test.info().title,
    });
  }

  /** For records created through the UI: find them by their unique national ID and register them. */
  async registerByNationalId(nationalId: string): Promise<Offender | undefined> {
    const page = await this.api.listAllOffendersOrThrow(nationalId);
    const matches = page.items.filter((o) => o.nationalId === nationalId);
    for (const o of matches) await this.register(o);
    return matches[0];
  }

  /** The test deleted the record itself (deletion was the behaviour under test). */
  async forget(id: number): Promise<void> {
    if (!this.offenders.delete(id)) return;
    await this.notifyPlatform('/test-data/release', {
      kind: 'Offender', externalId: String(id), state: 'DeletedByTest', note: 'Deleted by the scenario itself (the deletion was under test).',
    });
  }

  async cleanup(): Promise<void> {
    if (this.keepData) {
      if (this.offenders.size) {
        test.info().annotations.push({ type: 'info', description: `KEEP_TEST_DATA: left ${this.offenders.size} offender(s) for platform clean-up` });
      }
      return;
    }
    const failures: string[] = [];
    for (const [id] of this.offenders) {
      if (isSeeded(id)) continue; // defence in depth
      try {
        const result = await this.api.deleteOffender(id);
        if ([204, 404].includes(result.status)) {
          await this.notifyPlatform('/test-data/release', { kind: 'Offender', externalId: String(id), state: 'DeletedByTest' });
        } else {
          failures.push(`${id} -> HTTP ${result.status}`);
        }
      } catch (error) {
        failures.push(`${id} -> ${(error as Error).message}`);
      }
    }
    this.offenders.clear();
    if (failures.length) {
      test.info().annotations.push({ type: 'warning', description: `Test-data clean-up failed for: ${failures.join(', ')}` });
    }
  }

  private async toTracked(entity: unknown): Promise<TrackedOffender | null> {
    if (typeof entity === 'number') {
      // Only an id: read the record once to learn its national ID (the platform verifies it before deleting).
      const { body } = await this.api.getOffender(entity);
      return { id: entity, nationalId: body?.nationalId, label: body ? `${body.firstName} ${body.lastName}`.trim() : undefined };
    }
    if (entity && typeof entity === 'object' && typeof (entity as { id?: unknown }).id === 'number') {
      const o = entity as Partial<Offender> & { id: number };
      return { id: o.id, nationalId: o.nationalId, label: `${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || undefined };
    }
    return null;
  }

  /** Platform problems never fail a test: they become a warning annotation. */
  private async notifyPlatform(path: string, body: unknown): Promise<void> {
    if (!this.platform) return;
    try {
      await this.platform.post(path, body);
    } catch (error) {
      test.info().annotations.push({ type: 'warning', description: `Platform test-data registration failed: ${(error as Error).message}` });
    }
  }
}
