# Reports, Analytics, and Export API Contract

Phase 14 keeps the mobile client backend-ready while using a resolver-selected mock adapter. The future Python API must reproduce these domain rules and independently authenticate every request; client-side permission checks are navigation and UX safeguards only.

## Scope and authorization

Every request is scoped to a School and acting membership. Branch memberships are restricted to their assigned active Branches. Filter IDs are revalidated against the School, Branch, Academic Session, Class, Section, Student, and Exam hierarchy on every run, including saved filters. Parent and Student memberships have no Report Center routes. Platform summaries must remain aggregate-only and must not expose cross-School Student rows.

Permission keys:

- `reports.dashboard.view`, `reports.students.view`, `reports.collections.view`
- `reports.communication.view`, `reports.audit.view`
- `reports.saved_filters.manage`, `reports.export_history.view`
- existing `fee_reports.view`, `fee_reports.export`
- existing `exam_reports.view`, `exam_reports.export`

The API returns `403 REPORT_PERMISSION_DENIED` or a more specific scope error when permission or ownership checks fail.

## Reports

`GET /schools/{schoolId}/reports/dashboard` returns typed summary metrics, category counts, recent Export Jobs, and Report Metadata.

`GET /schools/{schoolId}/reports/catalog` returns only catalog items currently permitted for the membership.

`POST /schools/{schoolId}/reports/{reportType}/run` accepts typed common/specialized filters. It returns a typed summary, deterministically ordered rows, optional grouping/pagination, warnings, and metadata. Monetary fields use integer paise; percentages use integer basis points.

Every response includes:

- generated timestamp and source-snapshot timestamp
- explicit `asOfDate`, timezone, and `INR` currency
- applied-filter keys and non-fatal stale-filter warnings

Reports query authoritative Fee Due, Collection, published Result Snapshot, Report Card, Communication, Student, Academic, Examination, and Organization repositories. Published-result analytics exclude unpublished snapshots. Communication delivery does not treat `HANDED_OFF` as delivered.

## Saved filters

`GET /schools/{schoolId}/report-filters?reportType=...`

`POST /schools/{schoolId}/report-filters`

`PATCH /schools/{schoolId}/report-filters/{id}`

`POST /schools/{schoolId}/report-filters/{id}/archive`

Filters belong to one membership, are archived instead of deleted, and cannot expand access. Only one active default is allowed per membership and Report Type. Historical IDs are revalidated when applied; invalid values are ignored with explicit warnings.

## Export workflow

`POST /schools/{schoolId}/report-exports/preview` calculates report name, normalized filters, metadata, estimated row/file size, included columns, summary fields, warnings, and deterministic filename. Preview does not create a job.

`POST /schools/{schoolId}/report-exports` creates an asynchronous job. The idempotency identity is:

`schoolId + membershipId + reportType + format + normalizedFilterHash + clientRequestId`

`GET /schools/{schoolId}/report-exports` returns membership-scoped paginated history.

`GET /schools/{schoolId}/report-exports/{id}` returns job, preview snapshot, and audit activity.

`POST /schools/{schoolId}/report-exports/{id}/cancel` is valid only for `QUEUED` or `PROCESSING` jobs.

`POST /schools/{schoolId}/report-exports/{id}/retry` creates a new job only from `FAILED` or `EXPIRED` jobs.

Formats are `CSV`, `XLSX`, and `PDF`. Statuses are `QUEUED`, `PROCESSING`, `READY`, `FAILED`, `EXPIRED`, and `CANCELLED`. Production document generation and signed download URLs belong to the Python backend. Mock responses are explicitly marked `isDevelopmentMock: true` and return metadata/`mock-report://` URIs only; the app does not create fake local files.

## Error normalization

Errors use the existing API error envelope: stable `code`, user-safe `message`, HTTP `status`, and optional `fieldErrors`. Expected validation errors include invalid date order, page/page-size bounds, unknown School/report/job/filter, out-of-scope IDs, duplicate or invalid lifecycle actions, and unsupported export permission.
