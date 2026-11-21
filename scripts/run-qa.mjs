/**
 * The official QA run (`npm run qa`), cross-platform:
 *   1. runs the API + UI tests and records the results for the dashboard (QA_RECORD=1)
 *   2. regenerates docs/ and dashboard/ — ALWAYS, even when tests failed, because a failing run
 *      is exactly what the dashboard must show
 *   3. exits with the test run's exit code (0 = everything behaved as expected)
 */
import { spawnSync } from 'node:child_process';
import { ROOT } from './lib/qa-model.mjs';

/** `useShell` only for npx: it is a .cmd file on Windows. Node itself is started directly, so a path
 *  with spaces ("C:\Program Files\nodejs\node.exe") is not split by the shell. */
function run(command, args, extraEnv = {}, useShell = false) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: useShell && process.platform === 'win32',
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

const testExitCode = run('npx', ['playwright', 'test', '--project=api', '--project=ui'], { QA_RECORD: '1' }, true);

console.log('\nBuilding documents and dashboard from this run…');
const docsExit = run(process.execPath, ['scripts/build-docs.mjs']);
const dashboardExit = run(process.execPath, ['scripts/build-dashboard.mjs']);

if (docsExit !== 0 || dashboardExit !== 0) {
  console.error('Report generation failed — see the error above.');
  process.exit(docsExit || dashboardExit);
}
console.log(testExitCode === 0
  ? '\n✔ All tests behaved as expected. Open dashboard/index.html'
  : '\n✖ Some tests failed unexpectedly — see `npm run report`. Dashboard updated anyway.');
process.exit(testExitCode);
