/**
 * Run the suite from the command line (or CI) and report it to the Test Management Platform:
 *
 *   npm run platform                      # full suite
 *   npm run platform -- --project=api     # any Playwright arguments are passed through
 *
 * 1. reads PLATFORM_URL, PLATFORM_TOKEN and BASE_URL (environment variables or .env);
 * 2. asks the platform to create a run for the environment whose base URL is BASE_URL (trigger "Cli");
 * 3. runs Playwright with PLATFORM_RUN_ID set, so the reporter streams results into that run.
 * When the platform starts the suite itself it sets these variables directly; this script is not used.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = path.join(ROOT, '.env');
if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE); // existing variables win

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`✖ ${name} is not set. Add it to .env (see .env.example) or the environment.`);
    process.exit(2);
  }
  return value;
}

const platformUrl = required('PLATFORM_URL').replace(/\/+$/, '');
const token = required('PLATFORM_TOKEN');
const baseUrl = required('BASE_URL');
const args = process.argv.slice(2);
const projects = args.filter((a) => a.startsWith('--project=')).map((a) => a.split('=')[1]);
const scope = projects.length === 1 ? projects[0] : 'all';
/** Any filter makes this a PARTIAL run — the platform must never use it for the go / no-go verdict. */
const filter = (() => {
  const i = args.findIndex((a) => a === '-g' || a === '--grep' || a === '--grep-invert');
  if (i >= 0) return `${args[i]} ${args[i + 1] ?? ''}`.trim();
  const inline = args.find((a) => a.startsWith('--grep=') || a.startsWith('--grep-invert='));
  return inline ?? (args.some((a) => !a.startsWith('-')) ? args.filter((a) => !a.startsWith('-')).join(' ') : null);
})();

async function createRun() {
  let response;
  try {
    response = await fetch(`${platformUrl}/api/ingest/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform-Token': token },
      body: JSON.stringify({ environmentBaseUrl: baseUrl, trigger: 'Cli', scope, filter }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    console.error(`✖ Platform not reachable at ${platformUrl}: ${error.message}`);
    process.exit(3);
  }
  const body = await response.text();
  if (!response.ok) {
    console.error(`✖ Platform refused to create the run (HTTP ${response.status}): ${body}`);
    process.exit(3);
  }
  return JSON.parse(body).id;
}

const runId = await createRun();
console.log(`▶ Reporting to ${platformUrl}/runs/${runId}`);
const projectArgs = projects.length ? [] : ['--project=api', '--project=ui']; // never the slow "demo" project by default
const result = spawnSync('npx', ['playwright', 'test', ...projectArgs, ...args], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, PLATFORM_RUN_ID: String(runId) },
});
process.exit(result.status ?? 1);
