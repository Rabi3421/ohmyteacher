# Report Card API Contract

Phase 13 defines the mobile client contract for immutable Report Cards and authenticated Parent/Student result access. It does not implement a backend, public Result link, or real PDF generation.

## Source and snapshots

Only an active `PublishedResultSnapshot` may be used. A Report Card copies School, Branch, Student, Exam, subject/component Result, overall Result, grading scheme, and Template configuration into immutable snapshots. It keeps `publicationBatchId`, `publishedResultSnapshotId`, and version references for staff history. Later edits to configuration or source objects must not mutate a generated card.

Unpublishing a Result invalidates associated available cards. Historical card/document metadata is retained, hidden from self-service, and is never automatically reactivated by a later publication.

## Templates

Templates are School-scoped, uniquely named/coded, and use `DRAFT`, `ACTIVE`, or `INACTIVE`. Layout is `STANDARD` or `COMPACT`. Only active Templates generate cards and only one active default is permitted per School. Preview uses sample data and creates no Report Card. Generated cards retain a Template snapshot and are not changed by later Template edits.

## Generation

Supported scopes are one Student, one Section, one Class, and complete Exam. Preview is expiring and non-mutating. Commit requires the preview, revalidates active publication/Template/session state, prevents a second commit, and uses a transaction snapshot for atomic rollback. Individual document-preparation failures can be reported without corrupting successful Student items.

Generation identity is `publicationBatchId + studentId + templateId + version`. An existing identity returns the prior card instead of duplicating it. A republication can create the next Student card version; all versions remain in staff history while self-service returns only the latest visible active version.

Report numbers are allocated monotonically and are never reused, including after rollback. Display format is:

```text
RC/{BRANCH_CODE}/{SESSION_LABEL}/{EXAM_CODE}/{000001}
```

## Endpoints

```text
GET    /schools/:schoolId/exams/:examId/report-card-dashboard
GET    /schools/:schoolId/report-card-templates
POST   /schools/:schoolId/report-card-templates
GET    /schools/:schoolId/report-card-templates/:templateId
PUT    /schools/:schoolId/report-card-templates/:templateId
PATCH  /schools/:schoolId/report-card-templates/:templateId/status

POST   /schools/:schoolId/exams/:examId/report-card-generation-preview
POST   /schools/:schoolId/exams/:examId/report-card-generations
GET    /schools/:schoolId/exams/:examId/report-card-generations
GET    /schools/:schoolId/report-card-generations/:generationRunId

GET    /schools/:schoolId/report-cards
GET    /schools/:schoolId/report-cards/:reportCardId
POST   /schools/:schoolId/report-cards/:reportCardId/revoke
POST   /schools/:schoolId/report-cards/:reportCardId/document
GET    /schools/:schoolId/report-cards/:reportCardId/document

GET    /schools/:schoolId/parent-memberships/:parentMembershipId/results
GET    /schools/:schoolId/parent-memberships/:parentMembershipId/results/:publishedResultSnapshotId
GET    /schools/:schoolId/parent-memberships/:parentMembershipId/report-cards
GET    /schools/:schoolId/parent-memberships/:parentMembershipId/report-cards/:reportCardId

GET    /schools/:schoolId/student-memberships/:studentMembershipId/results
GET    /schools/:schoolId/student-memberships/:studentMembershipId/results/:publishedResultSnapshotId
GET    /schools/:schoolId/student-memberships/:studentMembershipId/report-cards
GET    /schools/:schoolId/student-memberships/:studentMembershipId/report-cards/:reportCardId

POST   /schools/:schoolId/result-communications/preview
POST   /schools/:schoolId/result-communications
POST   /schools/:schoolId/report-cards/:reportCardId/share
GET    /schools/:schoolId/examination-communications
```

All navigation and service calls pass IDs only. Query endpoints are pagination-ready. Tenant mismatches return `403`; missing resources return `404`; invalid or closed-session operations return `422`; stale/duplicate previews return `409`; unavailable revoked documents may return `410`.

## Document abstraction

`ReportCardDocumentService` exposes `requestDocument` and `getDocumentStatus`. The mock returns development-only metadata/URIs and an explicit mock label; it does not claim a real PDF exists. A future Python backend owns authoritative rendering, storage, expiry, access control, and signed document delivery. Revoked or publication-invalidated cards cannot request/self-serve a document.

## Revocation

Revocation requires a reason and records staff/date history. It preserves the immutable card and existing document metadata but blocks self-service and new sharing. Closed Sessions are read-only. A future backend must enforce authorization independently.

## Ownership and redaction

Parent access requires an active Parent-to-Student link in the selected School. Student access requires the active Student membership to own the Student profile. Self-service never returns another Student's records, unpublished versions, staff/calculation/generation identifiers, internal review data, or revocation metadata. Rank is limited to the current Student's own Result.

There is no anonymous/public Result endpoint.

## Examination communication

The existing Communication service is extended with `RESULT_PUBLISHED`, `REPORT_CARD_AVAILABLE`, and `REPORT_CARD_SHARE`; no second communication engine exists. Controlled variables include Exam, term, type, session, percentage, grade, outcome, rank, Report Card number/link, and publication date.

Manual share records device handoff as `HANDED_OFF`, not delivery. Provider send remains an explicit development mock with retry/history behavior. Recipient resolution, active Parent links, mobile validation, Template snapshots, and idempotency apply. Revoked cards and unpublished sources cannot be shared. Result publication and Report Card availability can create Parent and Student in-app notifications linked to source IDs.

## Permissions

Staff permissions are `report_cards.view`, `report_cards.templates.manage`, `report_cards.generate`, `report_cards.revoke`, `report_cards.history.view`, `report_cards.share`, and `results.communication.send`. Self-service uses `results.self_service.view` plus ownership.

Super Admin has selected-School access; School Admin has full own-School access; Branch Admin is assigned-Branch scoped and cannot manage School-wide Templates by default. Accountant and Receptionist have no internal Result/Report Card access. Parent and Student access is ownership-only. There is no Teacher role.

## Development limitations

No real PDF, public Result portal, WhatsApp credentials/provider, backend job, or Python backend is included. API service files are typed stubs for later integration.
