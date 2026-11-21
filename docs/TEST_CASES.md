# OffenderWatch — Test Case Suite (Part 1)

> Generated from `qa/test-cases.json` on 2026-11-21. Do not edit by hand — edit the JSON and run `npm run docs`.

**Environment:** https://svcdemoaz.puremonitor.supercom.com/AQApplication/Neil/ (Chromium, Asia/Jerusalem)  
**Executed:** 2026-11-21 by Neil  
**Result source:** automated cases use the latest automation run (2026-11-21 12:58 UTC); manual cases use the manual execution.

## Summary

| Total | Executed | Passed | Failed | Blocked | Not run | Automated (UI / API) | Manual |
|---|---|---|---|---|---|---|---|
| 52 | 52 | 23 | 29 | 0 | 0 | 48 (20 / 28) | 4 |

## Design approach

- **Risk first.** High priority = wrong or hidden safety data for an operator (risk level, latest reading, trail order, unreachable offenders) and data integrity (uniqueness, cascade delete). Low = cosmetic / defensive edge cases.
- **Both layers, compared.** Every UI-visible rule is checked against the API value, so a failure can be placed in the UI, API or data layer (assignment §6).
- **Negative & boundary cases** for every validation rule (FR-03, FR-10, API-03): each invalid value just outside the range, and the valid boundary itself (TC-42) so over-strict validation is caught too.
- **One case = one requirement idea.** Data-driven variants (e.g. 10 invalid location values) are one case with several automated rows, keeping the suite focused (52 cases) instead of padded.
- **Type:** UI / API / Data (stored-data consistency) / Negative (invalid input or error path).

## Traceability matrix

| Requirement | Summary | Test cases | State | Bugs |
|---|---|---|---|---|
| **FR-01** | List sorted by last name, 5 per page; pager reaches every offender; count matches what is reachable | TC-01, TC-02, TC-03, TC-04, TC-05, TC-07 | ❌ Failed | BUG-01 |
| **FR-02** | Search by first/last name or national ID — substring, case-insensitive | TC-08, TC-09, TC-10, TC-11 | ❌ Failed | BUG-07 |
| **FR-03** | Create offender with required/unique/past-date/enum validation; invalid input rejected with clear message | TC-12, TC-13, TC-14, TC-15, TC-16, TC-17, TC-18, TC-19 | ❌ Failed | BUG-09, BUG-10, BUG-11, BUG-12 |
| **FR-04** | Edit persists exactly the form values; untouched fields keep their values | TC-21, TC-22, TC-23, TC-24 | ❌ Failed | BUG-03, BUG-13 |
| **FR-05** | Delete after confirmation removes offender and all trail data | TC-25, TC-26, TC-27, TC-28, TC-48 | ❌ Failed | BUG-02 |
| **FR-06** | Dates shown as DD/MM/YYYY and equal to the stored value | TC-29, TC-30, TC-31, TC-39 | ❌ Failed | BUG-04 |
| **FR-07** | Trail ordered oldest → newest in table and on the map line | TC-32, TC-33, TC-34, TC-35 | ❌ Failed | BUG-06 |
| **FR-08** | Clicking a map point shows its timestamp, speed, battery, signal | TC-36, TC-37 | ❌ Failed | BUG-15 |
| **FR-09** | Latest reading = most recent point; Last seen = its timestamp | TC-38, TC-39 | ❌ Failed | BUG-05 |
| **FR-10** | Add location with coordinate / speed / battery / signal validation | TC-40, TC-41, TC-42, TC-43, TC-44, TC-45 | ❌ Failed | BUG-14, BUG-16, BUG-17 |
| **FR-11** | Top-bar totals are live and accurate after every create/delete | TC-12, TC-40, TC-46, TC-47, TC-48, TC-49 | ❌ Failed | BUG-02 |
| **API-01** | GET /api/offenders paging contract; metadata consistent with data | TC-03, TC-04, TC-05, TC-06 | ❌ Failed | BUG-01 |
| **API-02** | 404 for unknown resources; 201 on create; 204 on delete | TC-13, TC-26, TC-28, TC-50, TC-51, TC-52 | ❌ Failed | BUG-08 |
| **API-03** | POST/PUT enforce UI validation rules; 400 with error description | TC-14, TC-15, TC-16, TC-17, TC-18, TC-20, TC-24, TC-41 | ❌ Failed | BUG-09, BUG-10, BUG-11, BUG-12, BUG-13, BUG-14, BUG-18 |
| **API-04** | Trail endpoint returns points chronologically | TC-32 | ❌ Failed | BUG-06 |
| **API-05** | Stats totals consistent with stored data at all times | TC-27, TC-46, TC-47, TC-48, TC-49 | ❌ Failed | BUG-02 |

## Test cases at a glance

| ID | Title | Req. | Priority | Type | Automation | Result | Bugs |
|---|---|---|---|---|---|---|---|
| [TC-01](#tc-01) | First page lists 5 offenders sorted alphabetically by last name | FR-01 | High | UI | UI | ✅ Passed | — |
| [TC-02](#tc-02) | Pager reaches every offender; pages = ceil(total/5) | FR-01 | High | UI | UI | ❌ Failed | BUG-01 |
| [TC-03](#tc-03) | API totalPages = ceil(total / pageSize) for many page sizes | API-01, FR-01 | High | API | API | ❌ Failed | BUG-01 |
| [TC-04](#tc-04) | Following totalPages returns every offender exactly once | API-01, FR-01 | High | API | API | ❌ Failed | BUG-01 |
| [TC-05](#tc-05) | List response contract and last-name sort order | API-01, FR-01 | High | API | API | ✅ Passed | — |
| [TC-06](#tc-06) | Out-of-range and invalid paging parameters handled gracefully | API-01 | Low | Negative | API | ✅ Passed | — |
| [TC-07](#tc-07) | Sorting is case-insensitive (lower-case last name sorts among A…) | FR-01 | Low | Data | Manual | ✅ Passed | — |
| [TC-08](#tc-08) | Search matches substrings of first name, last name and national ID | FR-02 | High | API | API | ✅ Passed | — |
| [TC-09](#tc-09) | Search is case-insensitive (API) | FR-02 | High | API | API | ❌ Failed | BUG-07 |
| [TC-10](#tc-10) | Lower-case search in the UI finds the offender | FR-02 | High | UI | UI | ❌ Failed | BUG-07 |
| [TC-11](#tc-11) | Special characters / no-match search return an empty result | FR-02 | Low | Negative | API | ✅ Passed | — |
| [TC-12](#tc-12) | Operator creates a valid offender through the UI | FR-03, FR-11 | High | UI | UI | ✅ Passed | — |
| [TC-13](#tc-13) | API creates a valid offender with 201 and stores it as sent | FR-03, API-02 | High | API | API | ✅ Passed | — |
| [TC-14](#tc-14) | First name is required (empty / whitespace rejected) | FR-03, API-03 | High | Negative | API | ✅ Passed | — |
| [TC-15](#tc-15) | Last name and national ID are required | FR-03, API-03 | High | Negative | API | ❌ Failed | BUG-10 |
| [TC-16](#tc-16) | Duplicate national ID is rejected | FR-03, API-03 | High | Negative | API | ❌ Failed | BUG-09 |
| [TC-17](#tc-17) | Date of birth must be a valid date in the past | FR-03, API-03 | High | Negative | API | ❌ Failed | BUG-11 |
| [TC-18](#tc-18) | Risk level and status restricted to allowed values | FR-03, API-03 | Medium | Negative | API | ❌ Failed | BUG-12 |
| [TC-19](#tc-19) | Empty create form shows a clear error and saves nothing | FR-03 | Medium | Negative | UI | ✅ Passed | — |
| [TC-20](#tc-20) | Malformed JSON body returns 400 with an error description | API-03 | Low | Negative | API | ❌ Failed | BUG-18 |
| [TC-21](#tc-21) | Editing one field keeps all untouched fields (incl. risk level) | FR-04 | High | UI | UI | ❌ Failed | BUG-03 |
| [TC-22](#tc-22) | Changing risk level in the form persists the value shown | FR-04 | High | UI | UI | ❌ Failed | BUG-03 |
| [TC-23](#tc-23) | API PUT with a full valid payload persists every field | FR-04 | High | API | API | ✅ Passed | — |
| [TC-24](#tc-24) | PUT enforces the same validation as create | FR-04, API-03 | High | Negative | API | ❌ Failed | BUG-13 |
| [TC-25](#tc-25) | Delete requires confirmation and removes the offender | FR-05 | High | UI | UI | ✅ Passed | — |
| [TC-26](#tc-26) | Deleted offender returns 404 on GET | FR-05, API-02 | High | API | API | ❌ Failed | BUG-08 |
| [TC-27](#tc-27) | Deleting an offender deletes their trail data | FR-05, API-05 | High | Data | API | ❌ Failed | BUG-02 |
| [TC-28](#tc-28) | DELETE returns 204; repeated DELETE returns 404 | FR-05, API-02 | Medium | API | API | ✅ Passed | — |
| [TC-29](#tc-29) | Roster dates of birth are DD/MM/YYYY and equal to the stored value | FR-06 | High | UI | UI | ❌ Failed | BUG-04 |
| [TC-30](#tc-30) | Detail header shows the stored date of birth | FR-06 | Medium | UI | UI | ❌ Failed | BUG-04 |
| [TC-31](#tc-31) | Trail timestamps shown as DD/MM/YYYY HH:mm matching the stored instant | FR-06 | Low | UI | Manual | ✅ Passed | — |
| [TC-32](#tc-32) | Trail API returns points chronologically | API-04, FR-07 | High | API | API | ❌ Failed | BUG-06 |
| [TC-33](#tc-33) | Trail table is ordered oldest to newest | FR-07 | High | UI | UI | ❌ Failed | BUG-06 |
| [TC-34](#tc-34) | Map line runs from the oldest point to the newest point | FR-07 | High | UI | UI | ❌ Failed | BUG-06 |
| [TC-35](#tc-35) | Map shows one marker per trail point and a trail line | FR-07 | Medium | UI | UI | ✅ Passed | — |
| [TC-36](#tc-36) | Clicking a map point shows its recorded data | FR-08 | High | UI | UI | ✅ Passed | — |
| [TC-37](#tc-37) | A point with an out-of-range signal does not crash the console | FR-08 | High | Negative | UI | ❌ Failed | BUG-15 |
| [TC-38](#tc-38) | Latest reading shows speed/battery/signal of the most recent point | FR-09 | High | UI | UI | ❌ Failed | BUG-05 |
| [TC-39](#tc-39) | Last seen shows the most recent timestamp | FR-09, FR-06 | High | UI | UI | ✅ Passed | — |
| [TC-40](#tc-40) | Operator adds a valid location point through the UI | FR-10, FR-11 | High | UI | UI | ✅ Passed | — |
| [TC-41](#tc-41) | API rejects out-of-range location values | FR-10, API-03 | High | Negative | API | ❌ Failed | BUG-14, BUG-18 |
| [TC-42](#tc-42) | API accepts valid boundary location values | FR-10 | Medium | API | API | ✅ Passed | — |
| [TC-43](#tc-43) | UI rejects invalid location values with a visible error | FR-10 | High | Negative | UI | ❌ Failed | BUG-14, BUG-16 |
| [TC-44](#tc-44) | Blank speed / battery are not silently saved as 0 | FR-10 | Medium | Negative | Manual | ❌ Failed | BUG-17 |
| [TC-45](#tc-45) | UI shows an error when the server rejects a location | FR-10 | Medium | Negative | Manual | ❌ Failed | BUG-16 |
| [TC-46](#tc-46) | Top-bar counters equal the stats API | FR-11, API-05 | High | UI | UI | ✅ Passed | — |
| [TC-47](#tc-47) | Counters update after creating offenders and points | API-05, FR-11 | High | API | API | ✅ Passed | — |
| [TC-48](#tc-48) | Trail-point total drops when an offender with a trail is deleted | API-05, FR-11, FR-05 | High | Data | API | ❌ Failed | BUG-02 |
| [TC-49](#tc-49) | Offender totals match the stored offenders | API-05, FR-11 | High | API | API | ✅ Passed | — |
| [TC-50](#tc-50) | GET unknown offender returns 404 | API-02 | High | Negative | API | ❌ Failed | BUG-08 |
| [TC-51](#tc-51) | Trail of an unknown offender returns 404 | API-02 | Medium | Negative | API | ❌ Failed | BUG-08 |
| [TC-52](#tc-52) | PUT / DELETE / POST-location on an unknown offender return 404 | API-02 | Medium | Negative | API | ✅ Passed | — |

## Test case details

### TC-01

**First page lists 5 offenders sorted alphabetically by last name**

| | |
|---|---|
| Requirements | FR-01 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} roster table` |
| Preconditions | Seeded data present (11 offenders). |
| Steps | 1. Open the console.<br>2. Read the 5 rows of page 1.<br>3. Compare with GET api/offenders sorted by last name. |
| Expected result | Exactly 5 rows, alphabetical by last name (Amar, Azulay, Biton, Cohen, Dahan). |
| Automation | UI — `tests/ui/01-roster.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-02

**Pager reaches every offender; pages = ceil(total/5)**

| | |
|---|---|
| Requirements | FR-01 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} pager "Page x of y (n results)"` |
| Preconditions | Total offenders not a multiple of 5 (11 seeded). |
| Steps | 1. Open the console; read the pager.<br>2. Click Next › until disabled, collecting names.<br>3. Compare count with the results count. |
| Expected result | "Page 1 of 3 (11 results)"; all 11 offenders reachable, Peretz on page 3. |
| Automation | UI — `tests/ui/01-roster.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-01 |

### TC-03

**API totalPages = ceil(total / pageSize) for many page sizes**

| | |
|---|---|
| Requirements | API-01, FR-01 |
| Priority / Type | High / API |
| URL / endpoint | `GET {BASE_URL}api/offenders?page=1&pageSize={1,2,3,4,5,6,10,11,12,50}` |
| Preconditions | Total offenders not a multiple of 5. |
| Steps | 1. Call the list endpoint for each page size.<br>2. Compare totalPages with ceil(total/pageSize). |
| Expected result | totalPages correct for every size (11 items: size 5 → 3, size 4 → 3, size 3 → 4). |
| Automation | API — `tests/api/01-offenders-paging.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-01 |

### TC-04

**Following totalPages returns every offender exactly once**

| | |
|---|---|
| Requirements | API-01, FR-01 |
| Priority / Type | High / API |
| URL / endpoint | `GET {BASE_URL}api/offenders?page={1..totalPages}&pageSize=5` |
| Preconditions | Total offenders not a multiple of 5. |
| Steps | 1. Read page 1 and totalPages.<br>2. Read pages 2..totalPages.<br>3. Collect ids. |
| Expected result | Collected ids = total, no duplicates. |
| Automation | API — `tests/api/01-offenders-paging.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-01 |

### TC-05

**List response contract and last-name sort order**

| | |
|---|---|
| Requirements | API-01, FR-01 |
| Priority / Type | High / API |
| URL / endpoint | `GET {BASE_URL}api/offenders?page=1&pageSize=1000` |
| Preconditions | — |
| Steps | 1. Call the list endpoint.<br>2. Check fields and types.<br>3. Check sort order. |
| Expected result | items[], total, page, pageSize, totalPages (integers); total = items.length; sorted by last name. |
| Automation | API — `tests/api/01-offenders-paging.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-06

**Out-of-range and invalid paging parameters handled gracefully**

| | |
|---|---|
| Requirements | API-01 |
| Priority / Type | Low / Negative |
| URL / endpoint | `GET {BASE_URL}api/offenders?page=999 \| page=0 \| page=-1&pageSize=-5 \| pageSize=0` |
| Preconditions | — |
| Steps | 1. Call the list endpoint with each parameter set. |
| Expected result | No 5xx. Page beyond the end → empty items with metadata; invalid values clamped to ≥ 1. |
| Automation | API — `tests/api/01-offenders-paging.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-07

**Sorting is case-insensitive (lower-case last name sorts among A…)**

| | |
|---|---|
| Requirements | FR-01 |
| Priority / Type | Low / Data |
| URL / endpoint | `POST {BASE_URL}api/offenders then UI {BASE_URL} roster` |
| Preconditions | Create an offender with last name "abergel". |
| Steps | 1. Create the offender.<br>2. Open the roster. |
| Expected result | "abergel" appears before "Amar", not after "Peretz". |
| Automation | Manual |
| Result | ✅ Passed (Manual) |
| Notes | Observed order: '', abergel, Amar, Azulay … (the '' entry is BUG-10 data). |

### TC-08

**Search matches substrings of first name, last name and national ID**

| | |
|---|---|
| Requirements | FR-02 |
| Priority / Type | High / API |
| URL / endpoint | `GET {BASE_URL}api/offenders?search={Cohen\|ohe\|Dav\|412876}` |
| Preconditions | Seeded Cohen, David (305412876). |
| Steps | 1. Search each term. |
| Expected result | Cohen, David is returned for every term. |
| Automation | API — `tests/api/02-offenders-search.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-09

**Search is case-insensitive (API)**

| | |
|---|---|
| Requirements | FR-02 |
| Priority / Type | High / API |
| URL / endpoint | `GET {BASE_URL}api/offenders?search={cohen\|COHEN\|dAVID}` |
| Preconditions | Seeded Cohen, David. |
| Steps | 1. Search each term. |
| Expected result | Cohen, David is returned for every term. |
| Automation | API — `tests/api/02-offenders-search.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-07 |

### TC-10

**Lower-case search in the UI finds the offender**

| | |
|---|---|
| Requirements | FR-02 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} search box → GET api/offenders?search=cohen` |
| Preconditions | Seeded Cohen, David. |
| Steps | 1. Type "cohen" in the search box. |
| Expected result | Row "Cohen, David" is shown. |
| Automation | UI — `tests/ui/01-roster.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-07 |

### TC-11

**Special characters / no-match search return an empty result**

| | |
|---|---|
| Requirements | FR-02 |
| Priority / Type | Low / Negative |
| URL / endpoint | `GET {BASE_URL}api/offenders?search={% \| _ \| ' \| " \| zzzz…}` |
| Preconditions | — |
| Steps | 1. Search each term. |
| Expected result | 200, total 0, empty items — wildcards treated literally, no error. |
| Automation | API — `tests/api/02-offenders-search.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-12

**Operator creates a valid offender through the UI**

| | |
|---|---|
| Requirements | FR-03, FR-11 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} + Add Offender → POST api/offenders` |
| Preconditions | — |
| Steps | 1. Click + Add Offender.<br>2. Fill all fields with valid values (unique national ID).<br>3. Click Create. |
| Expected result | 201; toast "Offender created"; row shows the entered values; Offenders and Active counters +1. |
| Automation | UI — `tests/ui/03-offender-crud.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-13

**API creates a valid offender with 201 and stores it as sent**

| | |
|---|---|
| Requirements | FR-03, API-02 |
| Priority / Type | High / API |
| URL / endpoint | `POST {BASE_URL}api/offenders → GET api/offenders/{id}` |
| Preconditions | — |
| Steps | 1. POST a valid payload.<br>2. GET the new id. |
| Expected result | 201 with id; GET returns the same values. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-14

**First name is required (empty / whitespace rejected)**

| | |
|---|---|
| Requirements | FR-03, API-03 |
| Priority / Type | High / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders` |
| Preconditions | — |
| Steps | 1. POST with firstName "".<br>2. POST with firstName "   ". |
| Expected result | 400 {"error":"First name is required."}; offender count unchanged. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-15

**Last name and national ID are required**

| | |
|---|---|
| Requirements | FR-03, API-03 |
| Priority / Type | High / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders` |
| Preconditions | — |
| Steps | 1. POST with lastName "".<br>2. POST with nationalId "". |
| Expected result | 400 with error description; nothing saved. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-10 |

### TC-16

**Duplicate national ID is rejected**

| | |
|---|---|
| Requirements | FR-03, API-03 |
| Priority / Type | High / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders (nationalId 305412876)` |
| Preconditions | Seeded Cohen owns 305412876. |
| Steps | 1. POST a valid payload with nationalId 305412876.<br>2. Search the ID. |
| Expected result | 400; only one offender owns the ID. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-09 |

### TC-17

**Date of birth must be a valid date in the past**

| | |
|---|---|
| Requirements | FR-03, API-03 |
| Priority / Type | High / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders` |
| Preconditions | — |
| Steps | 1. POST with dateOfBirth one year in the future.<br>2. POST with dateOfBirth "not-a-date". |
| Expected result | 400 for both; nothing saved. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-11 |

### TC-18

**Risk level and status restricted to allowed values**

| | |
|---|---|
| Requirements | FR-03, API-03 |
| Priority / Type | Medium / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders` |
| Preconditions | — |
| Steps | 1. POST with riskLevel "Critical".<br>2. POST with status "Deleted". |
| Expected result | 400 for both. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-12 |

### TC-19

**Empty create form shows a clear error and saves nothing**

| | |
|---|---|
| Requirements | FR-03 |
| Priority / Type | Medium / Negative |
| URL / endpoint | `UI {BASE_URL} + Add Offender → Create (empty)` |
| Preconditions | — |
| Steps | 1. Open + Add Offender.<br>2. Click Create without filling anything. |
| Expected result | Error banner "First name is required."; modal stays open; count unchanged. |
| Automation | UI — `tests/ui/03-offender-crud.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-20

**Malformed JSON body returns 400 with an error description**

| | |
|---|---|
| Requirements | API-03 |
| Priority / Type | Low / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders body "this is not json"` |
| Preconditions | — |
| Steps | 1. POST a non-JSON body. |
| Expected result | 400 with a JSON error description. |
| Automation | API — `tests/api/03-offenders-create.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-18 |

### TC-21

**Editing one field keeps all untouched fields (incl. risk level)**

| | |
|---|---|
| Requirements | FR-04 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} Edit → Save → PUT api/offenders/{id}` |
| Preconditions | Offender with Risk level High. |
| Steps | 1. Click Edit (form shows High).<br>2. Change only First name.<br>3. Save; GET the offender. |
| Expected result | First name changed; risk level still High; all other fields unchanged. |
| Automation | UI — `tests/ui/03-offender-crud.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-03 |

### TC-22

**Changing risk level in the form persists the value shown**

| | |
|---|---|
| Requirements | FR-04 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} Edit → Risk level Medium → Save` |
| Preconditions | Offender with Risk level High. |
| Steps | 1. Click Edit.<br>2. Select Medium.<br>3. Save; GET the offender. |
| Expected result | Risk level Medium in list and API. |
| Automation | UI — `tests/ui/03-offender-crud.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-03 |

### TC-23

**API PUT with a full valid payload persists every field**

| | |
|---|---|
| Requirements | FR-04 |
| Priority / Type | High / API |
| URL / endpoint | `PUT {BASE_URL}api/offenders/{id} → GET api/offenders/{id}` |
| Preconditions | Test offender exists. |
| Steps | 1. PUT new valid values for all fields.<br>2. GET the offender. |
| Expected result | 200; stored values equal the PUT body. |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-24

**PUT enforces the same validation as create**

| | |
|---|---|
| Requirements | FR-04, API-03 |
| Priority / Type | High / Negative |
| URL / endpoint | `PUT {BASE_URL}api/offenders/{id}` |
| Preconditions | Test offender exists. |
| Steps | 1. PUT with empty first name / future DOB / riskLevel "Extreme" / another offender's national ID. |
| Expected result | 400 for each; stored record unchanged. |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-13 |

### TC-25

**Delete requires confirmation and removes the offender**

| | |
|---|---|
| Requirements | FR-05 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} Delete → confirm dialog → DELETE api/offenders/{id}` |
| Preconditions | Test offender exists. |
| Steps | 1. Click Delete, dismiss the prompt.<br>2. Click Delete, accept the prompt. |
| Expected result | Prompt names the offender; dismiss keeps the row; accept removes it (toast "Offender deleted"). |
| Automation | UI — `tests/ui/03-offender-crud.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-26

**Deleted offender returns 404 on GET**

| | |
|---|---|
| Requirements | FR-05, API-02 |
| Priority / Type | High / API |
| URL / endpoint | `DELETE then GET {BASE_URL}api/offenders/{id}` |
| Preconditions | Test offender exists. |
| Steps | 1. DELETE the offender.<br>2. GET it. |
| Expected result | 404. |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-08 |

### TC-27

**Deleting an offender deletes their trail data**

| | |
|---|---|
| Requirements | FR-05, API-05 |
| Priority / Type | High / Data |
| URL / endpoint | `POST …/locations ×4 → DELETE api/offenders/{id} → GET api/offenders/{id}/trail` |
| Preconditions | Test offender with 4 points. |
| Steps | 1. Delete the offender.<br>2. Read its trail. |
| Expected result | No points remain (404 or empty). |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-02 |

### TC-28

**DELETE returns 204; repeated DELETE returns 404**

| | |
|---|---|
| Requirements | FR-05, API-02 |
| Priority / Type | Medium / API |
| URL / endpoint | `DELETE {BASE_URL}api/offenders/{id} ×2` |
| Preconditions | Test offender exists. |
| Steps | 1. DELETE twice. |
| Expected result | 204, then 404. |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-29

**Roster dates of birth are DD/MM/YYYY and equal to the stored value**

| | |
|---|---|
| Requirements | FR-06 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} Date of birth column vs GET api/offenders` |
| Preconditions | Seeded data. |
| Steps | 1. Read every DOB on every reachable page.<br>2. Compare with the API value. |
| Expected result | e.g. Cohen 1982-03-07 → 07/03/1982; Mizrahi 1988-01-12 → 12/01/1988. |
| Automation | UI — `tests/ui/01-roster.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-04 |

### TC-30

**Detail header shows the stored date of birth**

| | |
|---|---|
| Requirements | FR-06 |
| Priority / Type | Medium / UI |
| URL / endpoint | `UI {BASE_URL} select Mizrahi → header "DOB:"` |
| Preconditions | Seeded Mizrahi, Rachel (1988-01-12). |
| Steps | 1. Select Mizrahi, Rachel.<br>2. Read DOB in the header. |
| Expected result | DOB: 12/01/1988. |
| Automation | UI — `tests/ui/01-roster.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-04 |

### TC-31

**Trail timestamps shown as DD/MM/YYYY HH:mm matching the stored instant**

| | |
|---|---|
| Requirements | FR-06 |
| Priority / Type | Low / UI |
| URL / endpoint | `UI {BASE_URL} trail table Timestamp column vs GET api/offenders/1/trail` |
| Preconditions | Browser timezone Asia/Jerusalem. |
| Steps | 1. Select Cohen, David.<br>2. Compare point #1 timestamp with the API (2026-08-09T11:29Z). |
| Expected result | 09/08/2026, 14:29 (UTC+3 in August). |
| Automation | Manual |
| Result | ✅ Passed (Manual) |
| Notes | Also covered indirectly by TC-36 (popup time) and TC-39 (Last seen). |

### TC-32

**Trail API returns points chronologically**

| | |
|---|---|
| Requirements | API-04, FR-07 |
| Priority / Type | High / API |
| URL / endpoint | `GET {BASE_URL}api/offenders/{1..11}/trail; POST 4 points out of order then GET trail` |
| Preconditions | Seeded trails; test offender with 4 points inserted 10:30, 10:00, 10:45, 10:15. |
| Steps | 1. Read each trail.<br>2. Compare with timestamp order. |
| Expected result | Every trail oldest → newest. |
| Automation | API — `tests/api/05-trail.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-06 |

### TC-33

**Trail table is ordered oldest to newest**

| | |
|---|---|
| Requirements | FR-07 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} select Cohen → trail table` |
| Preconditions | Seeded Cohen (16 points, stored out of order). |
| Steps | 1. Select Cohen, David.<br>2. Read the # column. |
| Expected result | Point ids in timestamp order. |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-06 |

### TC-34

**Map line runs from the oldest point to the newest point**

| | |
|---|---|
| Requirements | FR-07 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} select Cohen → Leaflet polyline` |
| Preconditions | Seeded Cohen. |
| Steps | 1. Select Cohen, David.<br>2. Locate the first and last vertex of the line.<br>3. Match them to markers. |
| Expected result | Line starts on the oldest point and ends on the newest. |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-06 |
| Notes | Visually the line zig-zags across the area. |

### TC-35

**Map shows one marker per trail point and a trail line**

| | |
|---|---|
| Requirements | FR-07 |
| Priority / Type | Medium / UI |
| URL / endpoint | `UI {BASE_URL} select Cohen → map` |
| Preconditions | Seeded Cohen (16 points). |
| Steps | 1. Select Cohen, David.<br>2. Count markers and lines. |
| Expected result | 16 markers, 1 line, title "Trail points (16)". |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-36

**Clicking a map point shows its recorded data**

| | |
|---|---|
| Requirements | FR-08 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} click marker → popup vs GET api/offenders/1/trail` |
| Preconditions | Seeded Cohen. |
| Steps | 1. Click the first, a middle and the last marker.<br>2. Compare popup with the API point of the same id. |
| Expected result | Time, speed (km/h), battery (%), signal (1–5 bars) equal the API values. |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-37

**A point with an out-of-range signal does not crash the console**

| | |
|---|---|
| Requirements | FR-08 |
| Priority / Type | High / Negative |
| URL / endpoint | `POST api/offenders/{id}/locations {signal:6} → UI {BASE_URL} select offender` |
| Preconditions | Offender with one point signal = 6 (possible because of BUG-14). |
| Steps | 1. Select the offender. |
| Expected result | Trail renders; no uncaught error; console stays usable. |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-15 |

### TC-38

**Latest reading shows speed/battery/signal of the most recent point**

| | |
|---|---|
| Requirements | FR-09 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} select Cohen → Latest reading vs newest point of GET api/offenders/1/trail` |
| Preconditions | Seeded Cohen; newest point id 1 (11:29Z): 23 km/h, 68%, 1/5. |
| Steps | 1. Select Cohen, David.<br>2. Read the card. |
| Expected result | 23 km/h · 68% · 1/5. |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-05 |

### TC-39

**Last seen shows the most recent timestamp**

| | |
|---|---|
| Requirements | FR-09, FR-06 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} select Cohen → Last seen` |
| Preconditions | Seeded Cohen. |
| Steps | 1. Select Cohen, David.<br>2. Read Last seen. |
| Expected result | 09/08/2026, 14:29 (newest point, Asia/Jerusalem). |
| Automation | UI — `tests/ui/02-trail-map.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-40

**Operator adds a valid location point through the UI**

| | |
|---|---|
| Requirements | FR-10, FR-11 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} + Add location → POST api/offenders/{id}/locations` |
| Preconditions | Test offender without points. |
| Steps | 1. Select the offender.<br>2. + Add location: 32.0901 / 34.7802 / 18.5 / 77 / 4.<br>3. Click Add. |
| Expected result | 201; row with these values; Trail points counter +1. |
| Automation | UI — `tests/ui/04-locations-and-stats.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-41

**API rejects out-of-range location values**

| | |
|---|---|
| Requirements | FR-10, API-03 |
| Priority / Type | High / Negative |
| URL / endpoint | `POST {BASE_URL}api/offenders/{id}/locations` |
| Preconditions | Test offender. |
| Steps | 1. POST lat ±91 / lon ±181 / speed −1 / battery −1, 101 / signal 0, 6 / lat null, one at a time.<br>2. Read the trail. |
| Expected result | 400 with error description for each; trail stays empty. |
| Automation | API — `tests/api/05-trail.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-14, BUG-18 |

### TC-42

**API accepts valid boundary location values**

| | |
|---|---|
| Requirements | FR-10 |
| Priority / Type | Medium / API |
| URL / endpoint | `POST {BASE_URL}api/offenders/{id}/locations` |
| Preconditions | Test offender. |
| Steps | 1. POST lat 90 / lon 180 / speed 0 / battery 0 / signal 1.<br>2. POST lat −90 / lon −180 / battery 100 / signal 5. |
| Expected result | 201 for both; stored exactly. |
| Automation | API — `tests/api/05-trail.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-43

**UI rejects invalid location values with a visible error**

| | |
|---|---|
| Requirements | FR-10 |
| Priority / Type | High / Negative |
| URL / endpoint | `UI {BASE_URL} + Add location (speed −5, battery 150)` |
| Preconditions | Test offender. |
| Steps | 1. + Add location with speed −5 and battery 150.<br>2. Click Add. |
| Expected result | 400; error message shown; no point added. |
| Automation | UI — `tests/ui/04-locations-and-stats.ui.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-14, BUG-16 |

### TC-44

**Blank speed / battery are not silently saved as 0**

| | |
|---|---|
| Requirements | FR-10 |
| Priority / Type | Medium / Negative |
| URL / endpoint | `UI {BASE_URL} + Add location (lat/lon only)` |
| Preconditions | Test offender. |
| Steps | 1. + Add location with only latitude and longitude.<br>2. Click Add. |
| Expected result | Rejected with a message. |
| Automation | Manual |
| Result | ❌ Failed (Manual) — BUG-17 |

### TC-45

**UI shows an error when the server rejects a location**

| | |
|---|---|
| Requirements | FR-10 |
| Priority / Type | Medium / Negative |
| URL / endpoint | `UI {BASE_URL} + Add location (all blank) → 400` |
| Preconditions | Test offender. |
| Steps | 1. + Add location with every field blank.<br>2. Click Add. |
| Expected result | Visible error message. |
| Automation | Manual |
| Result | ❌ Failed (Manual) — BUG-16 |

### TC-46

**Top-bar counters equal the stats API**

| | |
|---|---|
| Requirements | FR-11, API-05 |
| Priority / Type | High / UI |
| URL / endpoint | `UI {BASE_URL} top bar vs GET api/stats` |
| Preconditions | — |
| Steps | 1. Open the console.<br>2. Compare counters with the API. |
| Expected result | Offenders, Active and Trail points equal the API values. |
| Automation | UI — `tests/ui/04-locations-and-stats.ui.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-47

**Counters update after creating offenders and points**

| | |
|---|---|
| Requirements | API-05, FR-11 |
| Priority / Type | High / API |
| URL / endpoint | `GET api/stats → POST api/offenders ×2 → POST …/locations ×4 → GET api/stats` |
| Preconditions | — |
| Steps | 1. Create one Active offender with 4 points and one Inactive offender.<br>2. Compare stats. |
| Expected result | +2 offenders, +1 active, +4 points. |
| Automation | API — `tests/api/06-stats.api.spec.ts` |
| Result | ✅ Passed (Automation) |

### TC-48

**Trail-point total drops when an offender with a trail is deleted**

| | |
|---|---|
| Requirements | API-05, FR-11, FR-05 |
| Priority / Type | High / Data |
| URL / endpoint | `GET api/stats → DELETE api/offenders/{id} → GET api/stats` |
| Preconditions | Test offender with 4 points. |
| Steps | 1. Delete the offender.<br>2. Compare stats. |
| Expected result | −1 offender, −4 points. |
| Automation | API — `tests/api/06-stats.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-02 |

### TC-49

**Offender totals match the stored offenders**

| | |
|---|---|
| Requirements | API-05, FR-11 |
| Priority / Type | High / API |
| URL / endpoint | `GET api/stats vs GET api/offenders?pageSize=1000` |
| Preconditions | — |
| Steps | 1. Read stats and the full list.<br>2. Count total and Active. |
| Expected result | totalOffenders = list total; activeOffenders = number with status Active. |
| Automation | API — `tests/api/06-stats.api.spec.ts` |
| Result | ✅ Passed (Automation) |
| Notes | totalLocationPoints is NOT consistent (186 reported vs 166 owned) — see BUG-02 / TC-48. |

### TC-50

**GET unknown offender returns 404**

| | |
|---|---|
| Requirements | API-02 |
| Priority / Type | High / Negative |
| URL / endpoint | `GET {BASE_URL}api/offenders/987654` |
| Preconditions | — |
| Steps | 1. GET a non-existent id. |
| Expected result | 404. |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-08 |

### TC-51

**Trail of an unknown offender returns 404**

| | |
|---|---|
| Requirements | API-02 |
| Priority / Type | Medium / Negative |
| URL / endpoint | `GET {BASE_URL}api/offenders/987654/trail` |
| Preconditions | — |
| Steps | 1. GET the trail of a non-existent id. |
| Expected result | 404. |
| Automation | API — `tests/api/05-trail.api.spec.ts` |
| Result | ❌ Failed (Automation) — BUG-08 |

### TC-52

**PUT / DELETE / POST-location on an unknown offender return 404**

| | |
|---|---|
| Requirements | API-02 |
| Priority / Type | Medium / Negative |
| URL / endpoint | `PUT · DELETE {BASE_URL}api/offenders/987654 · POST …/987654/locations` |
| Preconditions | — |
| Steps | 1. Call each endpoint with a non-existent id. |
| Expected result | 404 for each. |
| Automation | API — `tests/api/04-offenders-update-delete.api.spec.ts` |
| Result | ✅ Passed (Automation) |
