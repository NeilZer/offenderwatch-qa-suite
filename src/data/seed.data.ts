/**
 * The 11 seeded offenders shipped with the application (assignment §6).
 * Used READ-ONLY: as expected values for display tests and as the protected set that
 * clean-up must never delete. Values were captured from GET /api/offenders on a fresh instance.
 */
export interface SeededOffender {
  id: number;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string;
  riskLevel: string;
  status: string;
}

export const SEEDED_OFFENDERS: readonly SeededOffender[] = Object.freeze([
  { id: 1, firstName: 'David', lastName: 'Cohen', nationalId: '305412876', dateOfBirth: '1982-03-07', riskLevel: 'High', status: 'Active' },
  { id: 2, firstName: 'Sara', lastName: 'Levi', nationalId: '208934512', dateOfBirth: '1990-11-23', riskLevel: 'Medium', status: 'Active' },
  { id: 3, firstName: 'Michael', lastName: 'Peretz', nationalId: '301287465', dateOfBirth: '1975-06-04', riskLevel: 'High', status: 'Active' },
  { id: 4, firstName: 'Rachel', lastName: 'Mizrahi', nationalId: '204518793', dateOfBirth: '1988-01-12', riskLevel: 'Low', status: 'Active' },
  { id: 5, firstName: 'Yosef', lastName: 'Biton', nationalId: '309871234', dateOfBirth: '1969-09-30', riskLevel: 'Medium', status: 'Active' },
  { id: 6, firstName: 'Dana', lastName: 'Azulay', nationalId: '207654321', dateOfBirth: '1995-05-09', riskLevel: 'Low', status: 'Inactive' },
  { id: 7, firstName: 'Avi', lastName: 'Dahan', nationalId: '302145687', dateOfBirth: '1980-12-02', riskLevel: 'High', status: 'Active' },
  { id: 8, firstName: 'Maya', lastName: 'Ohana', nationalId: '206789123', dateOfBirth: '1992-07-18', riskLevel: 'Medium', status: 'Active' },
  { id: 9, firstName: 'Eli', lastName: 'Gabay', nationalId: '308912345', dateOfBirth: '1978-04-25', riskLevel: 'Low', status: 'Active' },
  { id: 10, firstName: 'Noa', lastName: 'Amar', nationalId: '205432198', dateOfBirth: '1998-02-06', riskLevel: 'Medium', status: 'Active' },
  { id: 11, firstName: 'Itzik', lastName: 'Malka', nationalId: '303698521', dateOfBirth: '1971-10-15', riskLevel: 'High', status: 'Active' },
]);

export const SEEDED_IDS: ReadonlySet<number> = new Set(SEEDED_OFFENDERS.map((o) => o.id));

/** Named seeded records that individual tests rely on (keeps magic values out of specs). */
export const SEED = Object.freeze({
  /** Has a 16-point trail whose API order is NOT chronological — good for FR-07/FR-09. */
  cohen: SEEDED_OFFENDERS[0],
  /** January birthday: exposes the month off-by-one as "00" (FR-06). */
  mizrahi: SEEDED_OFFENDERS[3],
  /** Alphabetically last -> lands on the final, partial page (FR-01). */
  peretz: SEEDED_OFFENDERS[2],
  /** Only seeded Inactive offender. */
  azulay: SEEDED_OFFENDERS[5],
});

export function isSeeded(id: number): boolean {
  return SEEDED_IDS.has(id);
}
