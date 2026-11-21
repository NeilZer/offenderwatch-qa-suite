/**
 * API "addresses". Paths are RELATIVE to environment.baseUrl, so the same suite runs
 * against any instance (/AQApplication/, /AQApplication/Neil/, a local build ...).
 *
 * Swagger: {baseUrl}/../swagger  ->  OffenderWatch API v1
 */
export const endpoints = Object.freeze({
  offenders: 'api/offenders',
  offender: (id: number | string) => `api/offenders/${id}`,
  trail: (id: number | string) => `api/offenders/${id}/trail`,
  locations: (id: number | string) => `api/offenders/${id}/locations`,
  stats: 'api/stats',
});

/** UI routes (the console is a single-page app served at the base URL). */
export const uiRoutes = Object.freeze({
  console: './',
});

/** Builds a query string, skipping undefined values (keeps call-sites tidy). */
export function withQuery(path: string, query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
