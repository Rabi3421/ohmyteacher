# Communication API contract

Phase 10 defines the mobile-facing contract for Fee-related WhatsApp workflows and in-app notifications. The current resolver uses `APP_DATA_SOURCE=mock`; no Python backend, WhatsApp Business credentials, webhooks, or production document host exists yet.

## Delivery boundaries

`MANUAL_SHARE` renders a preview and hands text or a development Receipt reference to the operating-system share sheet. A successful handoff is `HANDED_OFF`. It is never promoted to `SENT` or `DELIVERED` because the app has no provider confirmation. A user dismissal is `CANCELLED`; device errors are `FAILED`.

`PROVIDER_SEND` is a backend-owned operation. The development adapter can return `SENT`, `DELIVERED`, or `FAILED`, always with a `DEVELOPMENT_MOCK_*` provider status. Production credentials and provider payloads must remain on the backend. The mobile app will consume normalized status updates from authenticated API responses.

Supported channels are `WHATSAPP` and `IN_APP`. SMS, email, and push are extension points only and are not Release 1 implementations.

## Endpoints

```text
GET    /schools/:schoolId/communication-dashboard
GET    /schools/:schoolId/communication-settings
PUT    /schools/:schoolId/communication-settings

GET    /schools/:schoolId/message-templates
POST   /schools/:schoolId/message-templates
GET    /schools/:schoolId/message-templates/:templateId
PUT    /schools/:schoolId/message-templates/:templateId
PATCH  /schools/:schoolId/message-templates/:templateId/status

POST   /schools/:schoolId/communications/preview
POST   /schools/:schoolId/communications/manual-send
POST   /schools/:schoolId/communications/bulk-reminder-preview
POST   /schools/:schoolId/communications/bulk-reminder-commit

GET    /schools/:schoolId/reminder-rules
POST   /schools/:schoolId/reminder-rules
GET    /schools/:schoolId/reminder-rules/:ruleId
PUT    /schools/:schoolId/reminder-rules/:ruleId
PATCH  /schools/:schoolId/reminder-rules/:ruleId/status

GET    /schools/:schoolId/scheduled-reminders
GET    /schools/:schoolId/scheduled-reminders/:scheduledReminderId
POST   /schools/:schoolId/scheduled-reminders/:scheduledReminderId/cancel

GET    /schools/:schoolId/communications
GET    /schools/:schoolId/communications/:communicationId
POST   /schools/:schoolId/communications/:communicationId/retry
POST   /schools/:schoolId/receipts/:receiptId/share

GET    /schools/:schoolId/notifications
POST   /schools/:schoolId/notifications/:notificationId/read
POST   /schools/:schoolId/notifications/read-all
POST   /schools/:schoolId/notifications/:notificationId/archive
GET    /schools/:schoolId/parent-memberships/:membershipId/notifications
GET    /schools/:schoolId/student-memberships/:membershipId/notifications
```

All responses use the existing `ApiResponse<T>` envelope. List endpoints use `PaginatedResponse<T>`. Tenant mismatch is `403`; a record absent from the authorized tenant is `404`; invalid or no-longer-eligible state is `422`; stale/duplicate commit is `409`.

## Templates and rendering

Templates are School-scoped, soft-deactivated, and unique by code within a School. Only one active default exists for a School, communication type, channel, and language tuple. An inactive Template cannot create a new preview or send.

Registered variables are:

```text
schoolName branchName studentName admissionNumber className sectionName
parentName feeHeadName feePeriod dueDate dueAmount fineAmount
outstandingAmount paymentAmount paymentDate paymentMode receiptNumber
receiptLink schoolPhone
```

The renderer recognizes only `{{variableName}}`. It rejects unknown or disallowed names, rejects unresolved required variables, replaces absent optional values with an empty string, performs no expression evaluation, and produces deterministic output. Amounts arrive as integer paise and are formatted as INR; dates are rendered with the `Asia/Kolkata` calendar convention.

Every `CommunicationRecord` stores an immutable Template snapshot containing the name, code, original content, language, channel, and variables used, plus the rendered content. Later Template edits cannot rewrite history.

## Recipient resolution and ownership

The authoritative chain is Student → active Student-Guardian link → Guardian. Default precedence is active Fee Contact, then active Primary Contact; an authorized manual flow may name another active linked Guardian. Automated sends additionally require `whatsappEnabled`. Mobile numbers are normalized to `+91` and stored/displayed masked in Communication records.

A communication remains Student-specific even where one Parent membership links multiple children. No balance consolidation occurs. Parent notification requests require the path membership to equal the authenticated active Parent membership; Student notification requests require the active Student membership. Linked Fee Due, Payment, and Receipt navigation is separately tenant/ownership checked. Route IDs never grant access by themselves.

Staff queries are filtered by School and assigned Branch. The backend must apply the same effective-permission and branch-scope rules as the mobile UI.

## Reminder eligibility, schedules, and timezone

An eligible Fee Due belongs to the School/Branch/session, has positive outstanding, is not paid/cancelled/waived, matches the Rule's status/date/Fee Head/Class/threshold filters, and has an active opted-in recipient. Paused or inactive Rules never create schedules.

Schedules use the Rule's IANA timezone and local `HH:mm` send time. Supported triggers are before due, on due, after due, and recurring overdue. Recurrence must have a positive interval and maximum occurrence count.

The stable occurrence identity is:

```text
ruleId::feeDueId::scheduledDate::occurrenceNumber
```

An existing non-cancelled occurrence blocks a duplicate. The backend must enforce this with a uniqueness constraint, not only a client check.

Closed Academic Sessions remain historical. They allow history, notifications, and a permitted active Receipt manual share. They block new automated Rules targeting the session, bulk scheduling, and retries whose Due is no longer current/eligible.

## Bulk preview and commit

Preview is mutation-free and reports candidates, eligible rows, missing/invalid contacts, WhatsApp-disabled links, below-threshold rows, terminal Dues, duplicates, selected Template, and scheduled time. It has a short expiry.

Commit submits one backend job reference. It revalidates the preview immediately before atomically creating scheduled rows. The phone never loops through thousands of provider calls. Duplicate preview commits return `409`; a partial database failure rolls back all rows. Development mock results are labeled `DEVELOPMENT_MOCK`.

## Receipt sharing

The Receipt, Student, and School must match and current Receipt document metadata must exist. Cancelled Receipts are blocked by default. Development URIs are prefixed/labeled as previews and do not represent a delivered PDF. Sharing creates a Communication record but never mutates the immutable Receipt or its snapshots.

## Status transitions and webhooks

```text
DRAFT → SCHEDULED → QUEUED → SENDING → SENT → DELIVERED → READ
                         ↘ FAILED
SCHEDULED/QUEUED → CANCELLED
business-rule rejection → SKIPPED
manual share → HANDED_OFF | CANCELLED | FAILED
```

Production provider webhooks will be authenticated and deduplicated by the backend, then mapped to normalized statuses. The app must not consume raw webhook payloads or store provider secrets.

## Failed retry

Retry accepts only a failed Communication below the backend-configured attempt limit. It revalidates recipient, linked record, current Due values, and active Template. The original record is preserved. A new record receives a new attempt ID/idempotency key, retains the stable logical chain key, increments `attemptNumber`, and stores a fresh snapshot/rendered body.

## Notifications

Notifications are append-only and can transition `UNREAD → READ → ARCHIVED`; there is no hard delete. Events cover Fee Due generated, Fee overdue, Payment received, Receipt available, Fine updated, Reminder sent, and Reminder failed. Parent rows are child-specific, Student rows are self-specific, and staff rows are branch-scoped. Mark-all affects only the authenticated audience/scope.

## Permissions

```text
communication.templates.view
communication.templates.manage
communication.settings.view
communication.settings.manage
communication.reminders.view
communication.reminders.manage
communication.send.manual
communication.send.bulk
communication.history.view
communication.failed.retry
notifications.view
```

School Admin and Super Admin have full access in a selected School. Branch Admin defaults to Template/Rule view, manual send, history, and notifications in assigned Branches; bulk, Rule management, and retry are configurable. Accountant defaults to manual send, history, and notifications, without Template/Rule management. Receptionist manual send and notifications are optional. Parent and Student access is ownership-based only. No Teacher role exists.

## Security and mock limitations

- No access token, provider secret, API key, complete webhook payload, or unmasked recipient log belongs in mobile state.
- Preview/rendered recipient data is transient and is cleared on context/workspace changes.
- Financial, Fee Due, Student, Guardian, Payment, and Receipt repositories remain authoritative.
- Activity metadata is limited to safe IDs, counts, status, and masked values.
- The development provider does not contact WhatsApp Business and cannot prove real delivery.
- The development Receipt URI is not a production attachment or public URL.
- There is no online payment gateway, Examination communication, or Teacher access in this phase.
