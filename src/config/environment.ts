import fs from 'node:fs';
import path from 'node:path';

/**
 * Single place that knows WHERE the system under test lives.
 * Nothing else in the project contains a URL: everything is derived from BASE_URL.
 *
 * Values come from environment variables, optionally loaded from a local `.env` file
 * (see `.env.example`). A missing or malformed BASE_URL fails fast with a clear message
 * instead of producing 100 confusing test failures.
 */

const ENV_FILE = path.resolve(__dirname, '../../.env');

function loadDotEnvIfPresent(): void {
  if (fs.existsSync(ENV_FILE)) {
    // Node >= 20.12 ships a built-in .env loader; no dependency required.
    process.loadEnvFile(ENV_FILE);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and set it, or pass it on the command line.`,
    );
  }
  return value;
}

/** Normalises the base URL so that relative paths ('api/offenders') resolve under it. */
function normaliseBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`BASE_URL is not a valid absolute URL: "${raw}"`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`BASE_URL must use http or https, got "${url.protocol}"`);
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.toString();
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes'].includes(value);
}

loadDotEnvIfPresent();

export const environment = Object.freeze({
  /** e.g. https://host/AQApplication/Neil/  (always ends with '/') */
  baseUrl: normaliseBaseUrl(requireEnv('BASE_URL')),
  /** Browser timezone for UI tests; the UI renders dates in the browser's local zone. */
  timezone: process.env.TIMEZONE?.trim() || 'Asia/Jerusalem',
  headed: readBoolean('HEADED', false),
  /** Default page size the console uses (FR-01). */
  uiPageSize: 5,
});

export type Environment = typeof environment;
