# OffenderWatch — Bug Reports (Part 2)

> Generated from `qa/bugs.json`. Reported 2026-11-21 by Neil.  
> Environment: Personal instance https://svcdemoaz.puremonitor.supercom.com/AQApplication/Neil/ — Chromium 1228 (Playwright 1.61), Windows 11, browser timezone Asia/Jerusalem

## Summary

**18 defects** — 3 Critical · 8 High · 6 Medium · 1 Low  
Status: 18 Open · 0 Fixed · 0 Retest  
Layer: 12 API · 6 UI

| ID | Title | Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|---|---|
| [BUG-01](#bug-01) | Pager hides the last (partial) page: totalPages is floor(total/pageSize) instead of ceiling | High | P1 | FR-01, API-01 | API | Open | TC-02, TC-03, TC-04 |
| [BUG-02](#bug-02) | Deleting an offender leaves their trail points in the system and in the trail-point total | High | P1 | FR-05, FR-11, API-05 | API / data | Open | TC-27, TC-48 |
| [BUG-03](#bug-03) | Saving the Edit form silently resets the offender's Risk level to "Low" | Critical | P1 | FR-04 | UI (primary) + API (contributing) | Open | TC-21, TC-22 |
| [BUG-04](#bug-04) | Date of birth is displayed one month too early (January shows as month "00") | High | P1 | FR-06 | UI | Open | TC-29, TC-30 |
| [BUG-05](#bug-05) | "Latest reading" shows the speed, battery and signal of the OLDEST trail point | Critical | P1 | FR-09 | UI | Open | TC-38 |
| [BUG-06](#bug-06) | Trail is returned and drawn in insertion order, not chronological order | High | P1 | API-04, FR-07 | API (root cause) + UI | Open | TC-32, TC-33, TC-34 |
| [BUG-07](#bug-07) | Search is case-sensitive ("cohen" finds nothing) | Medium | P2 | FR-02 | API | Open | TC-09, TC-10 |
| [BUG-08](#bug-08) | Unknown offender id returns 200 (empty body / empty trail) instead of 404 | Medium | P2 | API-02 | API | Open | TC-26, TC-50, TC-51 |
| [BUG-09](#bug-09) | Duplicate national ID is accepted on create | High | P1 | FR-03, API-03 | API | Open | TC-16 |
| [BUG-10](#bug-10) | Required fields Last name and National ID are not enforced | High | P2 | FR-03, API-03 | API | Open | TC-15 |
| [BUG-11](#bug-11) | Date of birth is not validated: future dates and non-dates are accepted | Medium | P2 | FR-03, API-03 | API | Open | TC-17 |
| [BUG-12](#bug-12) | Risk level and Status accept any string (e.g. "Critical", "Deleted") | Medium | P2 | FR-03, API-03 | API | Open | TC-18 |
| [BUG-13](#bug-13) | PUT /api/offenders/{id} performs no validation at all | High | P2 | FR-04, API-03 | API | Open | TC-24 |
| [BUG-14](#bug-14) | Location points are not validated: invalid coordinates, negative speed, battery and signal out of range all accepted | High | P1 | FR-10, API-03 | API | Open | TC-41, TC-43 |
| [BUG-15](#bug-15) | A trail point with signal outside 1–5 crashes the whole console to a blank page | Critical | P1 | FR-08 | UI | Open | TC-37 |
| [BUG-16](#bug-16) | Add-location form fails silently when the server rejects the point | Medium | P2 | FR-10 | UI | Open | TC-43, TC-45 |
| [BUG-17](#bug-17) | Blank Speed / Battery in the add-location form are silently saved as 0 | Medium | P2 | FR-10 | UI | Open | TC-44 |
| [BUG-18](#bug-18) | Malformed request body returns 400 with an empty body (no error description) | Low | P3 | API-03 | API | Open | TC-20, TC-41 |

### Severity & priority scale

- **Critical** — Wrong or lost safety-relevant data, silent corruption, or the console becomes unusable. No workaround.
- **High** — A PRD requirement is broken for a main flow; workaround is awkward or unreliable.
- **Medium** — Requirement broken in a secondary flow, or a workaround exists.
- **Low** — Minor deviation, little user impact.
- **P1** — Fix before release.
- **P2** — Fix in this release if possible; release blocker only in combination.
- **P3** — Can be scheduled for a later release.

### How the layer was decided

For every defect the API response was compared with what the UI displays (and, for UI defects, with the request the UI sent). If the API already returns the wrong thing, the defect is in the API/data layer; if the API is right and the screen is wrong, it is in the UI. Where both contribute, the primary layer is named first.

---

## BUG-01

### Pager hides the last (partial) page: totalPages is floor(total/pageSize) instead of ceiling

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P1 | FR-01, API-01 | API | Open | TC-02, TC-03, TC-04 |

**Steps to reproduce**

1. Open the console with the 11 seeded offenders.
2. Read the pager: "Page 1 of 2 (11 results)".
3. Click Next ›, then try to click Next › again.
4. Call GET /api/offenders?page=1&pageSize=5 and GET /api/offenders?page=3&pageSize=5.

**Expected:** 3 pages (ceil(11/5)); page 3 shows "Peretz, Michael"; every one of the 11 offenders is reachable.

**Actual:** Pager shows 2 pages and Next is disabled on page 2. "Peretz, Michael" (11th alphabetically) can never be reached by paging. The API itself returns him on page=3, while reporting totalPages=2.

**Layer analysis — API:** API. The UI renders `totalPages` exactly as the API returns it and disables Next when page >= totalPages. The API response is internally inconsistent: total=11, pageSize=5, totalPages=2, yet page=3 returns one item. Same floor() pattern for every size: pageSize=3 → 3 (expected 4), pageSize=4 → 2 (expected 3), pageSize=10 → 1 (expected 2).

**Evidence**

```
GET api/offenders?page=1&pageSize=5 → {"total":11,"page":1,"pageSize":5,"totalPages":2}
GET api/offenders?page=3&pageSize=5 → items:[{"lastName":"Peretz",...}], totalPages:2
UI pager: "Page 2 of 2 (11 results)" with Next disabled
```

**Impact:** Any offender who sorts onto the final partial page is invisible when browsing the roster. With 11 records that is 1 offender; it grows to up to 4 per page size.

_Tracked by 3 automated test(s), marked as expected failures with `knownBug('BUG-01')`._

---

## BUG-02

### Deleting an offender leaves their trail points in the system and in the trail-point total

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P1 | FR-05, FR-11, API-05 | API / data | Open | TC-27, TC-48 |

**Steps to reproduce**

1. POST /api/offenders (valid offender) → note id X.
2. POST /api/offenders/X/locations three times.
3. GET /api/stats → note totalLocationPoints = N.
4. DELETE /api/offenders/X (204), or delete through the UI.
5. GET /api/offenders/X/trail and GET /api/stats.

**Expected:** Trail of X is gone (404 or empty) and totalLocationPoints = N − 3. The top bar "Trail points" decreases by 3.

**Actual:** GET /api/offenders/X/trail still returns all 3 points. totalLocationPoints stays at N. The top bar keeps counting them.

**Layer analysis — API / data:** API / data. The delete endpoint removes the offender row only; location rows are not cascaded. /api/stats counts the orphaned rows. The UI is correct — it re-reads /api/stats after delete and shows what it receives. Evidence of accumulation on the Neil instance: 11 offenders own 166 points, but stats reports 186 (orphans from earlier deletes).

**Evidence**

```
Before delete: {"totalOffenders":19,"activeOffenders":17,"totalLocationPoints":169}
DELETE api/offenders/118 → 204
After delete:  {"totalOffenders":18,"activeOffenders":16,"totalLocationPoints":169}
GET api/offenders/118/trail → 200 [3 points, offenderId 118]
```

**Impact:** Location history of a removed person is retained (privacy/data-retention risk) and the dashboard total is permanently inflated.

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-02')`._

---

## BUG-03

### Saving the Edit form silently resets the offender's Risk level to "Low"

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Critical** | P1 | FR-04 | UI (primary) + API (contributing) | Open | TC-21, TC-22 |

**Steps to reproduce**

1. Create or pick an offender with Risk level = High (e.g. Cohen, David).
2. Click Edit. The form shows Risk level = High.
3. Change only the first name (or change Risk level to Medium) and click Save.
4. Look at the Risk badge in the list, and GET /api/offenders/{id}.

**Expected:** Risk level keeps the value shown in the form (High, or Medium if changed).

**Actual:** Risk level is saved as Low in every case — whatever the form shows.

**Layer analysis — UI (primary) + API (contributing):** UI: the Save handler builds the PUT body from firstName, lastName, nationalId, dateOfBirth and status only — riskLevel is never sent (visible in the request payload in DevTools/Playwright). API (contributing): PUT treats a missing riskLevel as the default "Low" instead of rejecting the request (400) or keeping the stored value. Proof: PUT with riskLevel=High persists High; the same PUT without riskLevel stores Low.

**Evidence**

```
UI request body on Save: {"firstName":"Zedd","lastName":"Aaqa","nationalId":"911000001","dateOfBirth":"1980-05-05","status":"Active"}   ← no riskLevel
GET api/offenders/132 after Save → "riskLevel":"Low" (was "High")
Direct API: PUT {…,"riskLevel":"High"} → High ; PUT {…without riskLevel} → Low
```

**Impact:** Any routine edit (typo in a name) downgrades a High-risk offender to Low with no warning. Monitoring priority is driven by this field.

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-03')`._

---

## BUG-04

### Date of birth is displayed one month too early (January shows as month "00")

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P1 | FR-06 | UI | Open | TC-29, TC-30 |

**Steps to reproduce**

1. Open the console.
2. Compare the Date of birth column with GET /api/offenders.
3. Select an offender and compare the DOB in the detail header.

**Expected:** Cohen, David → 07/03/1982; Mizrahi, Rachel → 12/01/1988 (DD/MM/YYYY of the stored value).

**Actual:** Cohen → 07/02/1982; Mizrahi → 12/00/1988. Every DOB is shifted back one month, in the list and in the detail header.

**Layer analysis — UI:** UI. The API returns the correct ISO dates ("1982-03-07", "1988-01-12") and the Edit form pre-fills the correct value (1982-03-07), so storage is right. The display formatter uses JavaScript's 0-based Date.getMonth() without +1. Secondary issue in the same function: the date is parsed as UTC midnight and read in local time, so for operators west of UTC (e.g. America/New_York) the day is also one less.

**Evidence**

```
API: {"lastName":"Mizrahi","dateOfBirth":"1988-01-12"}
UI list row: "Mizrahi, Rachel | 204518793 | 12/00/1988"
UI detail: "DOB: 07/02/1982" for Cohen (API 1982-03-07)
Same row, two browser timezones (API 1998-02-06): Asia/Jerusalem → "Amar, Noa | 06/01/1998"; America/New_York → "Amar, Noa | 05/01/1998"
```

**Impact:** Operators verify identity by DOB; every displayed DOB is wrong and January dates are impossible values.

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-04')`._

---

## BUG-05

### "Latest reading" shows the speed, battery and signal of the OLDEST trail point

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Critical** | P1 | FR-09 | UI | Open | TC-38 |

**Steps to reproduce**

1. Select Cohen, David.
2. Read the Latest reading card.
3. GET /api/offenders/1/trail and find the point with the latest timestamp (2026-08-09T11:29Z, id 1).

**Expected:** 23 km/h · 68% battery · 1/5 signal · Last seen 09/08/2026 14:29 (all from the newest point).

**Actual:** 38.4 km/h · 87% battery · 4/5 signal (values of the OLDEST point, 06:22Z) next to "Last seen 09/08/2026, 14:29" (newest). The card mixes two different points.

**Layer analysis — UI:** UI. The API data is complete and the UI already sorts the trail chronologically for this card; it then takes element [0] (oldest) for the readings and the last element for "Last seen". Independent of BUG-06: it reproduces with a trail inserted in perfect chronological order.

**Evidence**

```
Trail (API) newest point id 1 @ 11:29Z: speed 23, battery 68, signal 1
UI card: "38.4 km/h · 87% battery · 4/5 signal · Last seen: 09/08/2026, 14:29"
```

**Impact:** The operator sees a healthy battery/signal while the device is actually at 68% / 1 bar — low-battery and lost-signal situations are hidden.

_Tracked by 1 automated test(s), marked as expected failures with `knownBug('BUG-05')`._

---

## BUG-06

### Trail is returned and drawn in insertion order, not chronological order

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P1 | API-04, FR-07 | API (root cause) + UI | Open | TC-32, TC-33, TC-34 |

**Steps to reproduce**

1. GET /api/offenders/1/trail.
2. Select Cohen, David in the console; read the trail table and look at the red line on the map.

**Expected:** Points ordered oldest → newest in the API, in the table and along the map line.

**Actual:** API returns points ordered by id (timestamps 11:29, 07:10, 10:21, 06:44 …). The table lists them in the same order and the map line zig-zags between them instead of following the movement. Reproduces for all 11 seeded offenders.

**Layer analysis — API (root cause) + UI:** API: the order violates API-04 directly (sorted by id, not timestamp). UI: also at fault for FR-07 — it already sorts a copy for the Latest-reading card but uses the unsorted array for the table and the polyline, so even a fixed API would leave the UI relying on server order.

**Evidence**

```
GET api/offenders/1/trail → ids 1,2,3,4 with timestamps 11:29Z, 07:10Z, 10:21Z, 06:44Z
UI table first rows: "1 | 09/08/2026, 14:29", "2 | 09/08/2026, 10:10", "3 | 09/08/2026, 13:21" …
```

**Impact:** The map no longer shows the real route; an operator cannot reconstruct where the person went or in what order.

_Tracked by 4 automated test(s), marked as expected failures with `knownBug('BUG-06')`._

---

## BUG-07

### Search is case-sensitive ("cohen" finds nothing)

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Medium** | P2 | FR-02 | API | Open | TC-09, TC-10 |

**Steps to reproduce**

1. Type "cohen" (or "COHEN", "david") in the search box.
2. Call GET /api/offenders?search=cohen.

**Expected:** Cohen, David is returned (matching is case-insensitive).

**Actual:** "No offenders found" / API total 0. "Cohen" returns 1. Substring matching itself works ("ohe" → Cohen).

**Layer analysis — API:** API. The UI passes the typed text unchanged as ?search=; the API returns 0 for the lowercase term and 1 for the capitalised one.

**Evidence**

```
GET api/offenders?search=Cohen → total 1
GET api/offenders?search=cohen → total 0
GET api/offenders?search=COHEN → total 0
```

**Impact:** Operators who type in lower case conclude an offender does not exist.

_Tracked by 4 automated test(s), marked as expected failures with `knownBug('BUG-07')`._

---

## BUG-08

### Unknown offender id returns 200 (empty body / empty trail) instead of 404

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Medium** | P2 | API-02 | API | Open | TC-26, TC-50, TC-51 |

**Steps to reproduce**

1. GET /api/offenders/99999.
2. GET /api/offenders/99999/trail.
3. Delete an offender, then GET /api/offenders/{deletedId}.

**Expected:** HTTP 404 for every request.

**Actual:** GET offender → 200 with an empty body. GET trail → 200 []. A deleted offender id also returns 200 (empty). PUT/DELETE/POST-location on the same id correctly return 404, so the API is inconsistent.

**Layer analysis — API:** API — pure contract issue, no UI involved.

**Evidence**

```
GET api/offenders/99999 → 200, Content-Length 0
GET api/offenders/99999/trail → 200 []
DELETE api/offenders/99999 → 404 {"error":"Offender not found."}
```

**Impact:** Clients cannot tell "not found" from "found"; a JSON parse of the empty body fails in consumers.

_Tracked by 3 automated test(s), marked as expected failures with `knownBug('BUG-08')`._

---

## BUG-09

### Duplicate national ID is accepted on create

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P1 | FR-03, API-03 | API | Open | TC-16 |

**Steps to reproduce**

1. In the UI click + Add Offender, enter national ID 305412876 (already used by Cohen, David) and valid other fields, click Create — or POST the same payload to /api/offenders.

**Expected:** 400 with an error such as "National ID already exists"; nothing saved.

**Actual:** 201 Created; two offenders now share national ID 305412876. Searching that ID returns both.

**Layer analysis — API:** API — the uniqueness rule is not enforced server-side (the UI has no client-side check either, but the PRD rule is a data-integrity rule that must live in the API).

**Evidence**

```
POST api/offenders {"firstName":"Dup","lastName":"Nid","nationalId":"305412876",…} → 201 {"id":121,…}
```

**Impact:** Two people with one identity: trails, alerts and court records can be attributed to the wrong person.

_Tracked by 1 automated test(s), marked as expected failures with `knownBug('BUG-09')`._

---

## BUG-10

### Required fields Last name and National ID are not enforced

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P2 | FR-03, API-03 | API | Open | TC-15 |

**Steps to reproduce**

1. POST /api/offenders with lastName "" (other fields valid).
2. POST /api/offenders with nationalId "" (other fields valid).
3. (UI) Add Offender, fill only First name, click Create.

**Expected:** 400 "Last name is required." / "National ID is required."; nothing saved.

**Actual:** 201 Created for both. The UI creates an offender displayed as ", NoLast" that sorts to the top of the list. Only firstName is validated.

**Layer analysis — API:** API — firstName validation exists and works (400 "First name is required."), proving the validator is present but incomplete.

**Evidence**

```
POST {lastName:""} → 201 {"id":119,"lastName":""}
POST {nationalId:""} → 201 {"id":120,"nationalId":""}
```

**Impact:** Incomplete identity records; nameless rows in the roster.

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-10')`._

---

## BUG-11

### Date of birth is not validated: future dates and non-dates are accepted

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Medium** | P2 | FR-03, API-03 | API | Open | TC-17 |

**Steps to reproduce**

1. POST /api/offenders with dateOfBirth "2030-01-01".
2. POST /api/offenders with dateOfBirth "notadate".

**Expected:** 400 for both (DOB must be a valid date in the past).

**Actual:** 201 for both; "notadate" is stored verbatim and rendered as "notadate" in the DOB column.

**Layer analysis — API:** API — no date parsing or range check; field is stored as free text.

**Evidence**

```
POST {dateOfBirth:"2030-01-01"} → 201
POST {dateOfBirth:"notadate"} → 201 {"dateOfBirth":"notadate"}
```

**Impact:** Invalid identity data; downstream age calculations break.

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-11')`._

---

## BUG-12

### Risk level and Status accept any string (e.g. "Critical", "Deleted")

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Medium** | P2 | FR-03, API-03 | API | Open | TC-18 |

**Steps to reproduce**

1. POST /api/offenders with riskLevel "Critical".
2. POST /api/offenders with status "Deleted".

**Expected:** 400 — allowed values are Low/Medium/High and Active/Inactive.

**Actual:** 201 for both; values stored and shown as unstyled badges. PUT accepts them too ("Extreme").

**Layer analysis — API:** API — no enum validation. The UI only offers valid options, so this is reachable via API (and any integration) only.

**Evidence**

```
POST {riskLevel:"Critical"} → 201 {"riskLevel":"Critical"}
POST {status:"Deleted"} → 201 {"status":"Deleted"}
```

**Impact:** Offenders with an unknown risk/status fall out of any filter, report or count based on the defined values.

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-12')`._

---

## BUG-13

### PUT /api/offenders/{id} performs no validation at all

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P2 | FR-04, API-03 | API | Open | TC-24 |

**Steps to reproduce**

1. PUT /api/offenders/{id} with firstName "".
2. PUT with nationalId of another offender (305412876).
3. PUT with dateOfBirth "2099-01-15" or riskLevel "Extreme".

**Expected:** 400 with error description for each (same rules as create, API-03).

**Actual:** 200 for every request and the invalid values are stored — even an empty first name, which POST correctly rejects.

**Layer analysis — API:** API — the create validator is not applied to update.

**Evidence**

```
PUT {firstName:""} → 200 {"firstName":""}
PUT {nationalId:"305412876"} → 200
PUT {dateOfBirth:"2099-01-15"} → 200
```

**Impact:** Every create-time rule can be bypassed by creating a valid record and editing it.

_Tracked by 4 automated test(s), marked as expected failures with `knownBug('BUG-13')`._

---

## BUG-14

### Location points are not validated: invalid coordinates, negative speed, battery and signal out of range all accepted

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **High** | P1 | FR-10, API-03 | API | Open | TC-41, TC-43 |

**Steps to reproduce**

1. POST /api/offenders/{id}/locations with each of: lat 91, lat -91, lon 181, lon -181, speedKmh -1, batteryPct -1, batteryPct 101, signal 0, signal 6, timestamp "garbage", and an empty body {}.
2. (UI) Select an offender → + Add location → speed -5, battery 150 → Add.

**Expected:** 400 with an error description for every invalid value; nothing saved.

**Actual:** 201 {"ok":true} for every one; values stored as sent. {} creates a point at 0,0 with signal 0. The UI form adds the -5 km/h / 150% point to the table.

**Layer analysis — API:** API — no validation on the endpoint. The UI has no client-side checks either, but API-03 requires the server to enforce the rules.

**Evidence**

```
POST {lat:91,…} → 201 {"ok":true}
POST {batteryPct:101,…} → 201
POST {signal:6,…} → 201
POST {} → 201 (stored lat 0, lon 0, signal 0)
UI trail row after form submit: "32.10000 | 34.80000 | -5 km/h | 150% | 4/5"
```

**Impact:** Corrupt telemetry is stored and displayed as real; it also triggers BUG-15 (console crash).

_Tracked by 10 automated test(s), marked as expected failures with `knownBug('BUG-14')`._

---

## BUG-15

### A trail point with signal outside 1–5 crashes the whole console to a blank page

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Critical** | P1 | FR-08 | UI | Open | TC-37 |

**Steps to reproduce**

1. Create an offender and POST a location with signal 6 (accepted, see BUG-14).
2. Open the console, search the offender and click the row.

**Expected:** Trail renders; the bad value is shown or flagged, the rest of the console keeps working.

**Actual:** The entire page goes blank (React root unmounted). Browser console: "RangeError: Invalid count value: -1". A reload brings the list back, but selecting that offender crashes it again.

**Layer analysis — UI:** UI. The popup text is built with "▮".repeat(signal) + "▯".repeat(5 − signal); for signal > 5 (or < 0) repeat() throws, inside a React effect, with no error boundary. The API returns the data correctly — the UI cannot render it. BUG-14 is what lets such data in, but the UI must not crash on unexpected data.

**Evidence**

```
pageerror: "Invalid count value: -1"
#root innerHTML length after click: 0 (blank page)
```

**Impact:** One malformed reading from a device makes the monitoring console unusable for that offender, with no message to the operator.

_Tracked by 1 automated test(s), marked as expected failures with `knownBug('BUG-15')`._

---

## BUG-16

### Add-location form fails silently when the server rejects the point

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Medium** | P2 | FR-10 | UI | Open | TC-43, TC-45 |

**Steps to reproduce**

1. Select an offender → + Add location.
2. Leave Latitude and Longitude empty, click Add.

**Expected:** A clear error message (e.g. "Latitude is required"); the form stays open.

**Actual:** Nothing visible happens. The API answers 400; the UI throws an unhandled promise rejection ("Request failed (400)") and shows no message.

**Layer analysis — UI:** UI. The add-location submit handler awaits the request without try/catch, unlike create/edit which show the error banner. (The empty-body 400 from the API is BUG-18.)

**Evidence**

```
pageerror: "Request failed (400)"
No .banner.error element; form still open, unchanged
```

**Impact:** The operator believes the point was saved, or does not know why it was not.

_Tracked by 1 automated test(s), marked as expected failures with `knownBug('BUG-16')`._

---

## BUG-17

### Blank Speed / Battery in the add-location form are silently saved as 0

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Medium** | P2 | FR-10 | UI | Open | TC-44 |

**Steps to reproduce**

1. Select an offender → + Add location.
2. Enter only Latitude 32.2 and Longitude 34.9, leave Speed and Battery empty, click Add.

**Expected:** Rejected with a message (no value is not the same as 0).

**Actual:** A point with 0 km/h and 0% battery is added. Same for an empty Signal (→ 0, outside 1–5).

**Layer analysis — UI:** UI. The form converts empty input with parseFloat(x) || 0 and parseInt(x) || 0 before sending, so the API receives explicit zeros.

**Evidence**

```
UI trail row after submit: "32.20000 | 34.90000 | 0 km/h | 0% | 3/5"
```

**Impact:** A fake 0% battery reading is recorded and, once BUG-05 is fixed, will show in Latest reading.

---

## BUG-18

### Malformed request body returns 400 with an empty body (no error description)

| Severity | Priority | Requirement | Layer | Status | Test cases |
|---|---|---|---|---|---|
| **Low** | P3 | API-03 | API | Open | TC-20, TC-41 |

**Steps to reproduce**

1. POST /api/offenders with body `garbage` (Content-Type application/json).
2. POST /api/offenders/{id}/locations with {"lat": null}.

**Expected:** 400 with a JSON error description, like the other validation errors ({"error":"…"}).

**Actual:** 400 with an empty body.

**Layer analysis — API:** API — model-binding failures bypass the error formatter used by the validator.

**Evidence**

```
POST api/offenders  body: garbage → 400, Content-Length 0
POST api/offenders/1/locations {"lat":null} → 400, empty body
```

**Impact:** Clients (including this UI, see BUG-16) can only show "Request failed (400)".

_Tracked by 2 automated test(s), marked as expected failures with `knownBug('BUG-18')`._
