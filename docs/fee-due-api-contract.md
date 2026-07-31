# Fee Due API Contract

## Scope

This contract covers Fee Due schedule preview, generation, outstanding
management, fine accrual, waiver/cancellation history, and ownership-scoped
Parent/Student reads. It does not define payments, allocations, receipts,
ledgers, reminders, or online payment.

All money values are integer paise. All dates are ISO `YYYY-MM-DD`; timestamps
are ISO-8601 UTC. Every request is authenticated and every identifier is
independently authorized against the active tenant.

## Resource invariants

A generated Fee Due is an immutable financial snapshot. It contains and
validates:

- `schoolId`, `branchId`, `academicSessionId`
- `studentId`, `enrollmentId`, `feeAssignmentId`
- `feeStructureId`, `feeStructureItemId`, `feeHeadId`
- student, admission, branch, session, class, and section display snapshots
- frequency, period, base/override/exemption/discount/net values
- due rule/date and Fine Rule snapshot

Changing a Fee Structure or assignment never changes an existing generated
Due. Fine accrual may update `fineAmountPaise`; formal fine waivers,
whole-Due waivers, and cancellations append audit records and preserve the Due.

The server owns `requestedByUserId`, approver identity, tenant scope, and
membership scope. Client-supplied actor IDs are placeholders in the mock only
and must be replaced from the authenticated principal in production.

## Idempotency and transaction boundary

The uniqueness key is:

```text
schoolId + studentId + enrollmentId + feeStructureItemId + periodKey
```

Preview is mutation-free and short-lived. Commit accepts a `previewId`,
revalidates the complete graph and permissions, locks/rechecks uniqueness,
creates the Generation Run and all valid Fee Dues in one database transaction,
and returns existing/skipped/error outcomes. Retrying the same preview cannot
create duplicates. Use a unique database constraint for the key above.

If a critical snapshot or contextual relationship fails validation, roll back
the run and all Due inserts. Candidate-level eligibility warnings may produce a
`PARTIALLY_COMPLETED` run without violating atomicity for the accepted set.

## Period, eligibility, and Due-date rules

Stable period keys are `YYYY-MM` for month, `{session}-Qn` for quarter,
`{session}-Hn` for half-year, the session name for year, `INST-n` for
installments, and `ONE_TIME-{stable fee-head identifier}` for one-time items.
Display labels never participate in uniqueness.

Periods are derived from the real Academic Session start/end dates; no April
start is assumed. Monthly items honor configured applicable months. Quarterly
and half-yearly items partition the actual session months, yearly creates one
session period, and configured installments use stable one-based numbers.

The default eligible-from date is the latest of enrollment start, assignment
effective date, and structure effective date. A mid-month admission can receive
the intersecting admission month but never a prior month. The authorized
`includePreviousEligiblePeriods` option may look before assignment effective
date, but never before enrollment or structure effectiveness.

Transferred/completed enrollment periods are bounded by that enrollment's
start/end dates. A new enrollment must have its own active Fee Assignment; the
old enrollment's assignment is never silently reused. Historical Dues retain
the original enrollment ID.

`FIXED_DATE` is used exactly for an eligible period. `FIXED_DAY_OF_PERIOD`
places the Due in the period's month and clamps an impossible day to that
month's final UTC calendar day, emitting a preview warning (including leap-year
February behavior).

## Staff endpoints

### Outstanding summary

```http
GET /schools/{schoolId}/fee-outstanding
  ?branchId={branchId}
  &academicSessionId={sessionId}
  &asOfDate=2026-07-31
```

Requires `fees.due.view`. Returns upcoming, pending, overdue, accrued Fine, total
outstanding, students with outstanding, unassigned eligible students, and the
latest Generation Run.

### Mutation-free generation preview

```http
POST /schools/{schoolId}/fee-due-generation/preview
```

Requires `fees.due.generate`; rejected for a closed session.

```json
{
  "schoolId": "school-omt",
  "branchId": "branch-main",
  "academicSessionId": "session-school-omt-current",
  "generationType": "CLASS",
  "feeScope": "RECURRING",
  "classIds": ["class-omt-c01"],
  "sectionIds": [],
  "studentIds": [],
  "feeHeadIds": [],
  "requestedPeriodKeys": ["2026-07"],
  "includePreviousEligiblePeriods": false,
  "asOfDate": "2026-07-31"
}
```

Returns `previewId`, expiry, counts, warnings, requested periods, total integer
paise, and candidate items marked `NEW`, `EXISTING`, `SKIPPED`, or `ERROR`.

### Commit generation

```http
POST /schools/{schoolId}/fee-due-generation/commit
```

```json
{ "previewId": "fee-preview-1001" }
```

Requires `fees.due.generate`; rejected for a closed session. Returns a
Generation Run ID, status, totals, and per-candidate `CREATED`, `EXISTING`,
`SKIPPED`, or `ERROR` outcomes.

### Generation history and details

```http
GET /schools/{schoolId}/fee-generation-runs
  ?branchId={branchId}
  &academicSessionId={sessionId}
  &status=COMPLETED
  &generationType=CLASS
  &requestedByUserId={userId}
  &dateFrom=2026-07-01
  &dateTo=2026-07-31
  &page=1&pageSize=20

GET /schools/{schoolId}/fee-generation-runs/{generationRunId}
```

Requires `fees.generation_history.view`. Details include requested scope,
warnings and each generated/existing/skipped/failed item.

### Due lists and details

```http
GET /schools/{schoolId}/fee-dues
  ?branchId={branchId}
  &academicSessionId={sessionId}
  &studentId={studentId}
  &classId={classId}
  &sectionId={sectionId}
  &feeHeadId={feeHeadId}
  &periodKey=2026-07
  &status=OVERDUE
  &search=rahul
  &guardianMobile=98765
  &sort=DAYS_OVERDUE_DESC
  &asOfDate=2026-07-31
  &page=1&pageSize=20

GET /schools/{schoolId}/students/{studentId}/fee-dues
  ?academicSessionId={sessionId}
  &asOfDate=2026-07-31

GET /schools/{schoolId}/fee-dues/{feeDueId}
```

Requires `fees.due.view`. Detail includes the immutable amount snapshot,
current outstanding, Fine Rule snapshot, Fine waiver records, whole-Due waiver,
cancellation metadata, and activity history.

### Fine preview and refresh

```http
GET /schools/{schoolId}/fee-dues/{feeDueId}/fine-preview
  ?asOfDate=2026-07-31

POST /schools/{schoolId}/fee-dues/{feeDueId}/fine-refresh
{ "asOfDate": "2026-07-31" }

POST /schools/{schoolId}/fee-dues/fine-refresh
{
  "branchId": "branch-main",
  "academicSessionId": "session-school-omt-current",
  "asOfDate": "2026-07-31",
  "feeDueIds": [],
  "studentIds": [],
  "classIds": []
}
```

Preview requires view permission and never mutates. Refresh requires
`fees.fine.refresh`, is rejected for closed sessions, recalculates only from the
stored Fine Rule snapshot, preserves Fine waiver history, and is idempotent for
the same as-of date.

### Fine waiver

```http
POST /schools/{schoolId}/fee-dues/{feeDueId}/fine-waivers
{
  "type": "PARTIAL_FINE",
  "amountPaise": 5000,
  "reason": "Approved hardship correction"
}
```

Requires `fees.fine.waive` and a non-empty reason. The amount must be positive
and cannot exceed the current unwaived Fine. The authenticated approver and
timestamp are server supplied.

### Whole-Due waiver

```http
POST /schools/{schoolId}/fee-dues/{feeDueId}/waiver
{ "reason": "Approved full fee waiver" }
```

Requires `fees.due.waive`. It sets the Due to `WAIVED` and outstanding to zero,
while retaining all original snapshot values. A cancelled Due or a Due with
payment allocations cannot be waived.

### Cancellation

```http
POST /schools/{schoolId}/fee-dues/{feeDueId}/cancellation
{ "reason": "Generated against an incorrect period" }
```

Requires `fees.due.cancel`. It sets the Due to `CANCELLED` and outstanding to
zero without deletion. A waived Due or a Due with payment allocations cannot be
cancelled.

## Ownership-scoped endpoints

```http
GET /schools/{schoolId}/parent-memberships/{parentMembershipId}
  /students/{studentId}/fee-dues?asOfDate=2026-07-31

GET /schools/{schoolId}/student-memberships/{studentMembershipId}
  /fee-dues?asOfDate=2026-07-31
```

The first endpoint requires the authenticated active Parent membership to equal
`parentMembershipId` and an active Parent–Student link for `studentId`. The
second requires the authenticated active Student membership to equal
`studentMembershipId`; the server resolves its linked student and ignores any
client-supplied student ID. Both are read-only and return generated Due history
only.

## Status derivation

- due date after `asOfDate`: `UPCOMING`
- due date equal to `asOfDate`: `PENDING`
- due date before `asOfDate` with outstanding: `OVERDUE`
- formal whole-Due waiver: `WAIVED`
- formal cancellation: `CANCELLED`
- `PARTIALLY_PAID` and `PAID` are reserved for Payment Collection

Protected terminal statuses are never changed by a read-time as-of derivation.

## Fine calculation

Fine accrual uses UTC calendar-day arithmetic, the stored grace days, and the
stored fixed/daily/slab definition. A maximum cap is applied after calculation.
No Fine accrues for upcoming, fully paid, waived, or cancelled Dues. Effective
Fine is:

```text
max(0, accruedFinePaise - fineWaivedAmountPaise)
```

Outstanding is:

```text
max(0, netFeeAmountPaise + accruedFinePaise
       - fineWaivedAmountPaise - paidAmountPaise)
```

## Authorization matrix

- Super Admin / School Admin: tenant-scoped view and operational access
- Branch Admin: assigned-branch view; operational access by effective permission
- Accountant: view/history/Fine refresh defaults; sensitive actions by effective
  permission
- Receptionist: read-only view where assigned
- Parent: own linked children only
- Student: own linked student record only
- Teacher: unsupported

Frontend guards are usability controls only. The API must repeat permission,
tenant, branch, session, enrollment, assignment, structure-item, and ownership
checks for every request.

## Closed sessions

Closed sessions permit outstanding, Due, run, snapshot, waiver, cancellation,
and activity-history reads. Generation, Fine refresh, Fine waiver, whole-Due
waiver, and cancellation are rejected.

## Representative errors

| Code | HTTP | Meaning |
| --- | ---: | --- |
| `FEE_DUE_ACCESS_DENIED` | 403 | Effective permission or branch scope failed |
| `PARENT_FEE_ACCESS_DENIED` | 403 | Parent membership/link ownership failed |
| `STUDENT_FEE_ACCESS_DENIED` | 403 | Student membership ownership failed |
| `INVALID_FEE_DUE_BRANCH` | 409 | Branch is absent, inactive, or cross-school |
| `INVALID_FEE_DUE_SESSION` | 409 | Session is cross-school or absent |
| `FEE_DUE_SESSION_CLOSED` | 409 | Mutation attempted in closed session |
| `INVALID_FEE_GENERATION_PREVIEW` | 409 | Preview missing, expired, or already used |
| `FEE_GENERATION_SNAPSHOT_INVALID` | 409 | Candidate snapshot graph is incomplete |
| `FEE_DUE_NOT_FOUND` | 404 | Due absent from the requested school |
| `INVALID_FINE_WAIVER_AMOUNT` | 400 | Fine waiver is zero/negative/too large |
| `FINE_WAIVER_REASON_REQUIRED` | 400 | Fine waiver reason missing |
| `FEE_DUE_WAIVER_REASON_REQUIRED` | 400 | whole-Due waiver reason missing |
| `FEE_DUE_CANCELLATION_REASON_REQUIRED` | 400 | cancellation reason missing |
| `FEE_DUE_HAS_PAYMENTS` | 409 | destructive status change conflicts with allocations |

## Audit events

Persist append-only activities for preview, generation started/completed/
partially completed/failed, Due creation, Fine refresh, Fine waiver, whole-Due
waiver, and cancellation. Include tenant/context IDs, authenticated actor,
timestamp, run/Due ID, and compact before/after metadata where relevant.
