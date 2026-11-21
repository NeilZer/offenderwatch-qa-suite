/** Shapes of the OffenderWatch API, taken from Swagger + observed responses. */

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type OffenderStatus = 'Active' | 'Inactive';

/** Request body for POST/PUT /api/offenders. Loosely typed on purpose so negative tests can send bad values. */
export interface OffenderInput {
  firstName?: string | null;
  lastName?: string | null;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  riskLevel?: string | null;
  status?: string | null;
}

export interface Offender {
  id: number;
  firstName: string;
  lastName: string;
  nationalId: string;
  dateOfBirth: string; // ISO yyyy-mm-dd
  riskLevel: string;
  status: string;
  createdAt: string;
}

export interface OffenderPage {
  items: Offender[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Request body for POST /api/offenders/{id}/locations. */
export interface LocationInput {
  timestamp?: string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  speedKmh?: number | null;
  batteryPct?: number | null;
  signal?: number | null;
}

export interface TrailPoint {
  id: number;
  offenderId: number;
  timestamp: string;
  lat: number;
  lon: number;
  speedKmh: number;
  batteryPct: number;
  signal: number;
}

export interface Stats {
  totalOffenders: number;
  activeOffenders: number;
  totalLocationPoints: number;
}

export interface ApiErrorBody {
  error?: string;
}
