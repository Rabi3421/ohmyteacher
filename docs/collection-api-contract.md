# Collection API contract

Phase 9 defines the frontend contract for Payment Collection, allocation, Receipt records, Student Advance Credit, the Student financial ledger, and Daily Collection. It does not implement backend endpoints.

## Conventions

- All monetary values are integer paise. Floating-point currency is rejected.
- IDs in a URL are revalidated against the authenticated School, branch assignment, membership, Student, and academic-session scope.
- Mutating requests require an active session. A closed academic session returns `COLLECTION_SESSION_CLOSED` and remains readable.
- Posted financial records are append-only. There are no edit or delete endpoints.
- Dates use `YYYY-MM-DD`; timestamps use ISO 8601 UTC.
- Lists are pagination-ready and return the shared `PaginatedResponse<T>` envelope.

## Endpoints

```text
GET  /schools/:schoolId/branches/:branchId/sessions/:sessionId/collection-dashboard?date=

GET  /schools/:schoolId/students/:studentId/collectable-dues
POST /schools/:schoolId/payments/preview
POST /schools/:schoolId/payments

GET  /schools/:schoolId/payments
GET  /schools/:schoolId/payments/:paymentId
POST /schools/:schoolId/payments/:paymentId/reverse

GET  /schools/:schoolId/receipts
GET  /schools/:schoolId/receipts/:receiptId
GET  /schools/:schoolId/receipts/:receiptId/document

GET  /schools/:schoolId/students/:studentId/ledger

GET  /schools/:schoolId/students/:studentId/advance-credits
POST /schools/:schoolId/students/:studentId/advance-credits/preview-application
POST /schools/:schoolId/students/:studentId/advance-credits/apply

GET  /schools/:schoolId/branches/:branchId/daily-collection?date=

GET  /schools/:schoolId/parent-memberships/:membershipId/receipts
GET  /schools/:schoolId/parent-memberships/:membershipId/receipts/:receiptId

GET  /schools/:schoolId/student-memberships/:membershipId/receipts
GET  /schools/:schoolId/student-memberships/:membershipId/receipts/:receiptId
```

## Allocation preview

`POST /payments/preview` receives the context, Student, selected generated Due IDs, amount, Payment date/mode details, allocation mode, optional manual allocations, the explicit `storeExcessAsAdvance` flag, collector identity, and a client request ID. Preview never mutates state.

Automatic allocation is deterministic:

1. Overdue Dues.
2. Pending and partially paid Dues.
3. Explicitly selected upcoming Dues.
4. Earlier due date.
5. Stable Fee Due ID.

Within every Due, remaining Fine is allocated before remaining base Fee. Manual amounts must be non-negative, unique per Due, within the Due outstanding, and their sum cannot exceed the Payment. The response reconciles Payment amount into Due allocations plus optional Advance. An unexplained remainder blocks posting.

Partial and multi-Due Payments use the same preview. Allocation records include separate Fine, Fee, total, and stable order values.

## Payment posting and idempotency

`POST /payments` supplies the preview ID and an idempotency key with this identity:

```text
schoolId::studentId::clientGeneratedRequestId
```

The backend must atomically create the immutable Payment, immutable allocations, optional Advance credit entry, Receipt and snapshots, ledger/activity entries, and updated Fee Due totals/statuses. If any critical step fails, none of those mutations may remain.

A repeated key returns the original complete result and must not create another Payment, Receipt, allocation, Advance entry, ledger entry, or sequence value.

Payment modes are `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, and `CHEQUE`. UPI, transfer, and card require a transaction reference. Cheque requires cheque number, cheque date, and bank name. The service accepts only staff-confirmed received or cleared funds. Card numbers, CVV, UPI PIN, credentials, and provider secrets are never accepted or stored.

## Advance Credit

Excess becomes Student-scoped Advance only when explicitly confirmed. Advance is an append-only credit/debit ledger, not one mutable balance. It does not pay ungenerated Fees. Applying Advance targets eligible generated Dues, previews with the same deterministic Fine-first logic, creates debit and allocation records, and does not create a cash Payment or Receipt.

An Advance lot created by a Payment retains its Payment relationship. If any amount from that lot was consumed, reversal of that Payment returns `PAYMENT_ADVANCE_ALREADY_CONSUMED`.

## Fee Due status derivation

After allocation or reversal, the authoritative Fee Due repository recalculates:

- zero outstanding: `PAID`;
- positive paid and positive outstanding: `PARTIALLY_PAID`;
- no remaining payment: `PENDING`, `UPCOMING`, or `OVERDUE` from due date and as-of date.

`WAIVED` and `CANCELLED` are protected and never overwritten. Outstanding is clamped against negative values, and an allocation cannot exceed current outstanding.

## Receipt sequence and snapshots

Every posted Payment creates exactly one Receipt. The authoritative service allocates a unique immutable number, for example `REC/MAIN/2026-27/000001`, scoped by School, branch, and session. Cancelled numbers remain reserved and are never reused.

Receipt School, branch, Student, payer, allocation, mode/reference, collector-name, and amount snapshots do not change when source records change. A reversal marks the original Receipt `CANCELLED`; standalone Receipt cancellation is not supported.

The document endpoint returns backend PDF metadata when available. Mock mode returns an explicit deterministic development URI/metadata and never claims that a production PDF binary exists.

## Full Payment reversal

`POST /payments/:paymentId/reverse` requires `payments.reverse`, a non-empty reason, an open session, and a `POSTED` Payment. It is full reversal only. The original Payment, Receipt, and allocations remain. The operation atomically appends a reversal, restores the Due financial effects, reverses unused Advance from the Payment, appends reversal ledger/activity entries, marks the Payment `REVERSED`, and marks its Receipt `CANCELLED`.

A second reversal returns `PAYMENT_ALREADY_REVERSED`. Consumed Advance returns a protected dependency conflict. Partial reversal, refunds, and gateway operations are not in this release.

## Student financial ledger

The read-only ledger deterministically orders append-only debit, credit, and informational entries. Fee and Fine generation create debits; waivers/cancellations create credits; Payment/Advance application creates credits; reversal restores debit. Advance stays outside the Fee balance until applied. Summary fields expose Fee outstanding, Fine outstanding, Advance balance, and net financial position.

## Daily Collection

Daily aggregation is School/branch/date scoped. It reports gross posted Payment amount, mode totals/counts, Advance collected, reversals performed on the selected date (including reversals of older Payments), net Collection, Receipt count, collector count, and per-collector gross/reversal/net breakdown. It is not accounting settlement, reconciliation, or banking export.

## Ownership and tenant validation

Staff access uses effective permissions plus selected-School and assigned-branch scope. Parent access requires an active Parent membership, an active `ParentStudentLink`, and matching Receipt Student ID. Student access requires the active Student membership and matching Receipt Student ID. Route-ID changes must return `403`, never another Student's data.

Parent and Student details omit internal staff remarks and internal collector IDs while retaining the display-safe collector name from the immutable Receipt snapshot.

Typical errors:

```text
COLLECTION_ACCESS_DENIED
COLLECTION_SCHOOL_NOT_FOUND
INVALID_COLLECTION_BRANCH
INVALID_COLLECTION_SESSION
COLLECTION_SESSION_CLOSED
PAYMENT_DUE_CONTEXT_MISMATCH
PAYMENT_ALLOCATION_EXCEEDS_DUE
PAYMENT_NOT_RECONCILED
PAYMENT_IDEMPOTENCY_KEY_INVALID
PAYMENT_ALREADY_REVERSED
PAYMENT_ADVANCE_ALREADY_CONSUMED
PARENT_RECEIPT_OWNERSHIP_DENIED
STUDENT_RECEIPT_OWNERSHIP_DENIED
```

## Permission mapping

- `payments.collect`: preview and post a received Payment.
- `payments.view`: staff Payment list/details and Collection dashboard.
- `payments.reverse`: full Payment reversal, which cancels the associated Receipt.
- `payments.advance.view`: read Student Advance Credit.
- `payments.advance.manage`: preview/apply Advance to generated Dues.
- `receipts.view`: staff Receipt list/details/document preview.
- `receipts.share`: retained for future delivery work; no sharing is implemented here.
- `receipts.cancel`: compatibility-only; it does not expose standalone cancellation.
- `ledger.view`: Student financial ledger.
- `collection.daily.view`: Daily Collection and collector/mode breakdown.

Super Admin and School Admin have full selected-School access. Branch Admin is assigned-branch scoped. Accountant defaults exclude reversal and may optionally receive Advance management. Receptionist collection and Receipt access are configurable and reversal/Advance management are prohibited. Parent and Student use ownership endpoints instead of staff permissions.

## Explicit non-goals

There is no online gateway/provider verification, Pay Now, UPI intent, bank reconciliation, cheque-bounce workflow, accounting settlement, partial reversal, refund integration, WhatsApp/SMS/email/push delivery, Examination feature, Teacher role/login, or Python backend in Phase 9.
