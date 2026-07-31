# Fee Setup API Contract

This contract covers Release 1 Fee Setup and Assignment configuration only.
The app currently uses a typed mock implementation. No backend, due,
installment, payment, receipt, balance, ledger, or applied-fine records are
implemented.

## Conventions

Success responses use `{ "success": true, "data": ..., "message": "..." }`.
Errors use a stable `code`, safe `message`, optional `fieldErrors`, and HTTP
status. Currency input is expressed in rupees for form usability. Backend
calculation and persisted money values should use integer paise.

Every endpoint validates the authenticated membership independently from route
IDs. `schoolId`, `branchId`, session, class, student, and enrollment references
must form one tenant hierarchy. Closed sessions are read-only.

## Fee Heads

```text
GET    /schools/:schoolId/fee-heads
POST   /schools/:schoolId/fee-heads
GET    /schools/:schoolId/fee-heads/:feeHeadId
PUT    /schools/:schoolId/fee-heads/:feeHeadId
PATCH  /schools/:schoolId/fee-heads/:feeHeadId/status
```

List filters include `search`, `status`, `type`, `page`, and `pageSize`.
Create/update accepts name, unique normalized code, description, explicit
`RECURRING` or `ONE_TIME` type, compatible default frequency, mandatory and
refundable flags, positive display order, and status.

Deactivation returns `FEE_HEAD_IN_USE` when active structure items reference
the head. The response explains active item, affected class, and branch counts.
Inactive heads remain readable but cannot be added to new structures.

Example create request and response:

```json
{
  "name": "Tuition Fee",
  "code": "TUI",
  "type": "RECURRING",
  "defaultFrequency": "MONTHLY",
  "mandatoryByDefault": true,
  "refundable": false,
  "displayOrder": 1,
  "status": "ACTIVE"
}
```

```json
{
  "success": true,
  "data": {
    "id": "fee-head-tuition",
    "schoolId": "school-omt",
    "code": "TUI",
    "activeStructureItemCount": 0
  },
  "message": "Fee Head created."
}
```

## Fee Structures

```text
GET    /schools/:schoolId/branches/:branchId/sessions/:sessionId/fee-structures
POST   /schools/:schoolId/branches/:branchId/sessions/:sessionId/fee-structures
GET    /schools/:schoolId/branches/:branchId/sessions/:sessionId/fee-structures/:feeStructureId
PUT    /schools/:schoolId/branches/:branchId/sessions/:sessionId/fee-structures/:feeStructureId
POST   /schools/:schoolId/fee-structures/:feeStructureId/copy
PATCH  /schools/:schoolId/branches/:branchId/sessions/:sessionId/fee-structures/:feeStructureId/status
```

List filters include search, class, status, and pagination. A create/update
request contains structure name, class, effective date, status, description,
and at least one item. Each item contains a school Fee Head, positive amount,
compatible frequency, applicability, mandatory flag, display order, status,
due rule, academic-session months/installments, and optional Fine Rule.

`FIXED_DAY_OF_PERIOD` accepts days 1–28. `FIXED_DATE` must fall inside the
session. Monthly applicable months are numeric month identifiers ordered from
the actual session start; implementations must not assume April.

Activation revalidates every item. `ACTIVE_FEE_STRUCTURE_CONFLICT` requires an
explicit replacement confirmation before the old active structure is made
inactive. Copy always creates `DRAFT`; inactive Fee Head items are excluded and
reported in the success message. Historical structures are never deleted.

Example structure item:

```json
{
  "feeHeadId": "fee-head-tuition",
  "amount": 800,
  "frequency": "MONTHLY",
  "applicability": "ALL_STUDENTS",
  "mandatory": true,
  "dueRule": { "type": "FIXED_DAY_OF_PERIOD", "day": 10 },
  "applicableMonths": [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6],
  "fineRuleId": "fine-daily",
  "displayOrder": 1,
  "status": "ACTIVE"
}
```

## Student Fee Assignments

```text
GET  /schools/:schoolId/branches/:branchId/sessions/:sessionId/student-fee-assignments
POST /schools/:schoolId/student-fee-assignments/bulk-default
GET  /schools/:schoolId/students/:studentId/enrollments/:enrollmentId/fee-assignment
PUT  /schools/:schoolId/students/:studentId/enrollments/:enrollmentId/fee-assignment
```

List filters include student search, class, section, assigned state, optional
Fee Head, and pagination. The active Student Profile and active enrollment must
match the active structure’s school, branch, session, and class. Transferred or
ended enrollment records reject new assignment or mutation. Historical
assignments from a closed session remain readable.

Bulk default assignment returns:

```json
{ "assigned": 8, "skipped": 2, "failed": 0, "failedStudentIds": [] }
```

Existing active or customized assignments are skipped and never overwritten.
Individual updates support optional/manual selection, `DEFAULT_AMOUNT`,
`CUSTOM_AMOUNT`, `EXEMPT`, effective date, override reason, and Student
discount assignments. Mandatory items cannot be disabled. Mandatory exemption
requires `fees.exemption.manage`. Overrides append assignment history and never
change the Fee Structure Item.

## Discounts

```text
GET    /schools/:schoolId/discounts
POST   /schools/:schoolId/discounts
PUT    /schools/:schoolId/discounts/:discountId
PATCH  /schools/:schoolId/discounts/:discountId/status
```

Definitions are school-scoped. `FIXED` uses a positive amount.
`PERCENTAGE` is greater than zero and at most 100, with an optional positive
maximum. Applicable Fee Heads must belong to the school. Dates must be ordered.
Inactive definitions cannot be assigned. Active usage requires protected
deactivation confirmation.

Fixed and percentage discounts apply only to configured Fee Heads. Multiple
discounts are deterministic, respect caps, and can never produce a negative
configured payable amount.

## Fine Rules

```text
GET    /schools/:schoolId/fine-rules
POST   /schools/:schoolId/fine-rules
PUT    /schools/:schoolId/fine-rules/:fineRuleId
PATCH  /schools/:schoolId/fine-rules/:fineRuleId/status
```

Supported definitions are `FIXED_AFTER_DUE`, `DAILY_AFTER_DUE`, and
`SLAB_BASED`. Grace days are non-negative. Amounts and optional maximums are
positive. Slabs are logical and non-overlapping. An inactive rule cannot be
attached; active structure usage protects deactivation. These endpoints
configure references only—no actual fine is calculated or posted.

## Configuration preview and summary

```text
POST /schools/:schoolId/fee-preview
GET  /schools/:schoolId/branches/:branchId/sessions/:sessionId/fee-setup-summary
```

Preview input contains student, active enrollment, structure, selected
optional items, overrides, discounts, and selected period/months. The response
is labeled `Estimated Fee Configuration` and provides integer-paise gross,
optional, override, exemption, discount, net, and detailed line items. Fine
Rules are named only as estimates and are not applied.

Example preview response:

```json
{
  "success": true,
  "data": {
    "title": "Estimated Fee Configuration",
    "currency": "INR",
    "grossAmountPaise": 110000,
    "selectedOptionalAmountPaise": 30000,
    "customOverrideDeltaPaise": 0,
    "exemptionAmountPaise": 0,
    "discountAmountPaise": 10000,
    "netConfiguredAmountPaise": 100000,
    "lineItems": [],
    "discounts": [],
    "estimatedFineRuleNames": ["Daily Late Fine"]
  }
}
```

The summary returns active Fee Heads, structure coverage, custom assignments,
active discounts and Fine Rules, and setup warnings. It never returns
collection or balance totals.

## Errors and authorization

Representative errors include `SCHOOL_NOT_FOUND`, `INVALID_FEE_BRANCH`,
`INVALID_FEE_SESSION`, `INVALID_FEE_CLASS`, `FEE_SESSION_CLOSED`,
`FEE_SETUP_ACCESS_DENIED`, `DUPLICATE_FEE_HEAD_CODE`,
`DUPLICATE_FEE_HEAD_NAME`, `FEE_HEAD_IN_USE`,
`ACTIVE_FEE_STRUCTURE_CONFLICT`, `INVALID_FEE_ENROLLMENT`,
`FEE_ASSIGNMENT_CONTEXT_MISMATCH`, `FEE_EXEMPTION_PERMISSION_REQUIRED`,
`DISCOUNT_IN_USE`, and `FINE_RULE_IN_USE`.

Example normalized conflict:

```json
{
  "success": false,
  "code": "ACTIVE_FEE_STRUCTURE_CONFLICT",
  "message": "Confirm replacement of the existing active Fee Structure.",
  "status": 409
}
```

School Admin has full school Fee Setup. Branch Admin is restricted to assigned
branches and effective permissions. Accountant is read-only. Receptionist,
Parent, Student, and unknown roles have no Fee Setup access. Frontend guards do
not replace backend authorization.
