# OffenderWatch — QA Home Assignment

> **New here?** Start with [`MANUAL.md`](MANUAL.md): install, run the checks, read the results and open the dashboard, step by step.

Test design, defect reports, Playwright automation (UI + API) and a QA dashboard for the
OffenderWatch monitoring console.

| # | Deliverable | Where |
|---|---|---|
| 1 | Test case suite with traceability (52 cases, 16/16 requirements) | [docs/TEST_CASES.md](docs/TEST_CASES.md) · [docs/test-cases.csv](docs/test-cases.csv) (Excel) |
| 2 | Bug reports (18 defects, with layer analysis and evidence) | [docs/BUG_REPORTS.md](docs/BUG_REPORTS.md) |
| 3 | Automation project (20 UI + 51 API tests) | this repository — [src/](src/), [tests/](tests/) |
| 4 | QA dashboard, built from the real results | [dashboard/index.html](dashboard/index.html) |

**Verdict: NO-GO.** 3 Critical and 8 High defects are open. The worst ones: editing an offender
silently resets their risk level to Low, "Latest reading" shows the oldest reading, and one bad
signal value crashes the console.

---

## 1. Install and run

Requirements: Node.js 20.12 or newer (the built-in `.env` loader is used) and internet access.

```bash
npm install
npx playwright install chromium    # only if Chromium is not installed yet
cp .env.example .env               # then set BASE_URL to your instance
```

`.env` settings:

| Variable | Meaning | Default in `.env.example` |
|---|---|---|
| `BASE_URL` | Application under test. Required. No URL is hard-coded anywhere else. | `https://svcdemoaz.puremonitor.supercom.com/AQApplication/Neil/` |
| `TIMEZONE` | Browser timezone for UI tests (the UI shows dates in local time) | `Asia/Jerusalem` |
| `HEADED` | `true` shows the browser | `false` |

| Command | What it does |
|---|---|
| **`npm run qa`** | **The official run.** All API + UI tests, then rebuilds `docs/` and `dashboard/` from the results. |
| `npm run demo` | The UI tests in a visible, slowed-down browser, for watching a run live. |
| `npm run report` | Opens the detailed report (every step and API call, screenshots, traces). |
| `npm test` · `npm run test:api` · `npm run test:ui` | Runs the tests without touching the dashboard. |
| `npx playwright test -g "TC-38"` | Runs one test case by its ID. |
| `npx playwright test --grep "@FR-04"` | Runs everything that covers one requirement. |

Only `npm run qa` feeds the dashboard. Ad-hoc runs (one test, the demo) never overwrite its data.

## 2. How to read the results

Tests that fail because of a **documented bug** are expected failures:

```ts
knownBug('BUG-05');   // marks the test as expected-to-fail and links the bug
expect(latest.speedKmh, bugMessage('BUG-05', 'readings must come from the newest point')).toBe(newest.speedKmh);
```

| Report shows | Meaning | Action |
|---|---|---|
| `ok` / passed | Requirement works | — |
| `x` / "expected to fail" | Fails on a known bug (BUG-xx in the annotation) | None — the bug is open |
| **failed** (red) on a test without `knownBug` | **New** problem: a regression or a broken test | Investigate |
| **failed**: "Expected to fail, but passed" | The known bug seems **fixed** | Retest the bug, then remove `knownBug` |

So the run is green while known bugs are open. The moment someone fixes a bug, the run turns red
and tells you to retest it.

**Why `test.fail()` can't hide other problems.** Each bug assertion carries a `[BUG-xx]` tag in
its message. The dashboard builder checks that every expected failure really failed **with its own
tag**. If it failed for some other reason (network, selector, setup), it is counted as "failed for
another reason". Latest run: 45 of 45 expected failures failed on their own bug.

**What else is in the report:** every API call shows as a step (method, URL, status). UI tests
attach the PUT body the UI sent (for BUG-03) and any browser exceptions (for BUG-15). Failures
keep a screenshot and a trace.

## 3. Project structure

```
├── .env.example               environment (BASE_URL etc.) — the only place a URL lives
├── playwright.config.ts       projects (api, ui, demo), reporters, timezone, workers
├── src/
│   ├── config/                ADDRESSES
│   │   ├── environment.ts     reads + validates env vars, fails fast with a clear message
│   │   └── endpoints.ts       API paths relative to BASE_URL
│   ├── data/                  TEST DATA (no logic)
│   │   ├── seed.data.ts       the 11 seeded offenders (read-only, protected from clean-up)
│   │   ├── offender.factory.ts / location.factory.ts   unique, valid payload builders
│   │   ├── names.data.ts      realistic first / last names for created offenders
│   │   └── validation.data.ts tables of invalid / boundary values, each linked to a TC and bug
│   ├── selectors/             LOCATORS, one file per UI component
│   ├── pages/                 PAGE OBJECTS
│   │   ├── console.page.ts    composes the components below
│   │   └── components/        top-bar, offender-list, offender-form, trail-panel, map
│   ├── api/                   API LAYER
│   │   ├── api-client.ts      generic HTTP wrapper: logging steps, safe parsing, error wrapping
│   │   ├── offender-watch.api.ts  domain calls + "...OrThrow" setup helpers
│   │   └── types.ts
│   ├── fixtures/test.fixtures.ts  api, testData (auto clean-up), consolePage
│   ├── helpers/               known-bug marking, test-data tracker, dates, ordering, map geometry
│   └── reporting/             Part 5: platform client (with circuit breaker) + live Playwright reporter
├── tests/
│   ├── api/                   51 API tests (6 spec files)
│   └── ui/                    20 UI tests (4 spec files)
├── qa/                        SINGLE SOURCE OF TRUTH for test management
│   ├── requirements.json · test-cases.json · bugs.json
├── scripts/                   run-qa (official run) · build-docs · build-dashboard · run-with-platform (Part 5)
├── docs/                      generated: TEST_CASES.md, test-cases.csv, BUG_REPORTS.md
└── dashboard/                 generated: index.html
```

Every test starts with a short comment that says **what** it checks and **which URL** it calls:

```ts
/**
 * TC-03 · API-01, FR-01
 * WHAT : paging metadata is consistent with the data: totalPages = ceil(total / pageSize) …
 * URL  : GET {BASE_URL}api/offenders?page=1&pageSize={1,2,3,4,5,6,10,11,12,50}
 */
```

## 4. Design decisions

- **Playwright for both UI and API.** One runner, one report and one set of fixtures. The UI and
  API results for the same rule sit side by side, which is what the layer analysis needs.
- **Fresh page per test, except where the tests only read.** By default each test gets a fresh
  browser, so no test can break the next one. That is needed where tests change state: create,
  edit and delete, leftover search or paging, and TC-37, which crashes the page on purpose. The 6
  trail/map tests only *read* the same screen (Cohen selected), so they share one page opened in
  `beforeAll` and run in serial mode. If one breaks unexpectedly, the rest are skipped instead of
  checking a screen in an unknown state.
- **Logical execution order.** Spec files are numbered so a live run follows the operator's
  journey: roster → trail and map → create/edit/delete → locations and counters (UI), and paging →
  search → create → update/delete → trail → stats (API). The results don't depend on the order:
  every test sets up its own data.
- **Tests are synchronised on network events, not sleeps.** Each UI action waits for the API call
  it triggers, then for the screen to show that data (e.g. `OffenderListComponent.reloadVia`).
- **Every test creates its own data and cleans it up.** Records get a realistic name (e.g.
  "Yael Friedman", from `src/data/names.data.ts`) and a unique national ID (`99xxxxxxx`). Tests
  find their own records by that ID, so two records may share a name without risk. The tracker
  deletes them after the test, even if it failed, and refuses to delete seeded IDs 1–11.
- **Tests run one at a time (`workers: 1`) and without retries.** All tests share one live
  instance and several assert exact counter changes (FR-11). With retries off, every result is a
  first attempt.
- **Deterministic bug exposure.** The paging bug only shows when the total is not a multiple of 5.
  The test adds a temporary offender if needed, instead of depending on what the instance holds.
- **The map is checked from the rendered SVG.** TC-34 reads where Leaflet actually drew the trail
  line and checks that it starts on the oldest point and ends on the newest.
- **Setup errors look like setup errors.** Setup calls (`createOffenderOrThrow`, …) throw a
  `SetupError` saying "Precondition failed". A broken precondition is never confused with the
  behaviour under test.
- **Selectors use class names and labels**, because the app has no `data-testid`. All of them live
  in `src/selectors/`. Recommendation for the dev team: add `data-testid` attributes.

## 5. Known limitations

- **Orphaned trail points.** Because of BUG-02, deleting a test offender leaves its trail points
  behind. Each full run adds about 40 orphaned points to the trail-point total on the instance. No
  test depends on that absolute number (only on changes), but the top-bar figure grows. Ask for a
  data reset if needed.
- `TC-49` checks the offender totals only. The trail-point total can't be compared with the real
  data while BUG-02 is open; TC-48 covers it in a deterministic way.
- Tested in Chromium only (desktop, 1440×900).

## 6. Dashboard

`dashboard/index.html` is one self-contained file: no external scripts, works offline, works in
light and dark mode and on a phone. `npm run dashboard` (or `npm run qa`) rebuilds it from:

- `qa/test-cases.json`: suite and manual results (4 manual-only cases)
- `qa/bugs.json`: defects
- `reports/results.json`: the **latest** automation run. Automated cases take their result from
  it, and a bug whose tests suddenly pass shows up as "Retest".

No number on the dashboard is typed by hand.

## 7. Reporting into the Test Management Platform (Part 5)

The platform repository (`offenderwatch-test-platform`) expects this suite in the **same parent folder**, named
`SuperCom` or `offenderwatch-qa-suite`. It finds either name automatically.

The suite also works as the engine of the platform in `../SuperCom-Platform`. Nothing changes when you run it
on its own. When the platform starts it, it sets these environment variables:

| Variable | Effect |
|---|---|
| `BASE_URL` | the environment chosen in the platform (overrides `.env`) |
| `PLATFORM_URL`, `PLATFORM_TOKEN`, `PLATFORM_RUN_ID` | turn on `src/reporting/platform-reporter.ts`, which **pushes** every scenario live: queued → running → result, with its evidence (log, full-page screenshot, API request/response, error context, trace) |
| `KEEP_TEST_DATA=true` | tests skip their own teardown, leaving the data for the platform's **Clean test data** |

**From the command line or CI:** `npm run platform` (any Playwright arguments after `--`) creates a run in the
platform and reports into it. It needs `PLATFORM_URL` and `PLATFORM_TOKEN` (see `.env.example`). If the platform
becomes unreachable, the reporter switches itself off after 3 failed calls, and the tests are never slowed down.

`TestDataTracker` registers every offender it creates with the platform **immediately**, together with its
national ID and the scenario that created it. A run stopped mid-test can then still be cleaned up. Records are
found by **national ID** (unique), never by name: test offenders get realistic, repeatable names
(`src/data/names.data.ts`).
