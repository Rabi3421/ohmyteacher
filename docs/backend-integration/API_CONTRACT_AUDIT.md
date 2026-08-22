# Phase 15 Backend Contract Audit

Audit date: 2026-08-03  
Frontend: `ohmyteacher` (React Native)  
Backend: `ohmyteacher-server` (read-only during this phase)

This report records the implemented Django contract, not a proposed API. Source priority was: Django URL/view/serializer/model/permission/settings code, then the 106-request Postman collection, then `API_GUIDE.md`, `ARCHITECTURE.md`, and finally the frontend contracts. No credentials, OTPs, phone numbers, tokens, or environment values are reproduced here.

## 1. Backend framework and API architecture

- Django 5.1.6, Django REST Framework 3.15.2, SimpleJWT 5.4.0, and the JWT blacklist app.
- The API is a single Django app using function-based DRF views. It does not use routers, viewsets, a service-wide response renderer, or a service-wide exception handler.
- Models use integer primary keys. Serializers expose snake_case fields and DRF serializes decimal fields as strings.
- SQLite is the default database; environment variables may configure another database. Server time zone is UTC.
- Most views build an explicit `{success: true, <entity-or-list-key>: ...}` response. Errors built by views normally use `{success: false, message, error_code, errors?}`. DRF authentication/permission/parser errors can bypass that envelope and return `{detail: ...}`.
- There is no global pagination class, page size, search backend, filter backend, or ordering backend.
- Settings currently have development posture (`DEBUG` enabled). A Django signing secret is hardcoded in source; its value is intentionally not copied here. This is a deployment risk.

## 2. Confirmed API prefix and environment behaviour

The root URL configuration mounts the app at:

`/ohmyteacher/api/v0/`

The normalized client base URL must therefore end in `/ohmyteacher/api/v0` (no trailing slash); route paths retain their trailing slash. `/api/v1` in much of `ARCHITECTURE.md` is not implemented.

Frontend target matrix:

| Target | Base URL |
|---|---|
| Auto (default, non-test) | resolves to `remote` |
| Remote (deployed) | `https://ohmyteacher.ebatuaa.com/ohmyteacher/api/v0`, overridable |
| Local (`android`) | `http://10.0.2.2:8000/ohmyteacher/api/v0` |
| Local (`ios`) | `http://127.0.0.1:8000/ohmyteacher/api/v0` |
| Test | configurable, defaulting to the loopback v0 URL |
| Physical device | required runtime-injected LAN base URL |

Override the default by injecting `globalThis.__OHMYTEACHER_API_CONFIG__` (for
example `{ target: 'local' }`) before `src/config/env.ts` is first imported.

The deployed backend must list `ohmyteacher.ebatuaa.com` in `ALLOWED_HOSTS`. A physical device using a LAN address or a tunnel host will be rejected until backend deployment configuration adds the host. CORS lists only local browser origins; native React Native requests are not browser CORS requests, but a web client would require additional origins. The merged Android release manifest also sets `usesCleartextTraffic=false`: release builds must use an HTTPS remote/tunnel URL, or a deliberately separate local-only Android build type must opt into HTTP. Do not weaken the production release manifest globally just for LAN development.

## 3. Authentication and token lifecycle

1. `send-otp` and `resend-otp` accept `phone_number`; they do not accept a school code, platform identifier, or request ID.
2. The OTP is stored server-side, expires, has a resend cooldown, request lockout, and a maximum verification-attempt count. SMS failure returns 502.
3. `verify-otp` accepts the same `phone_number` plus `otp`. It does not accept a request ID.
4. Existing users receive tokens with HTTP 200 and `is_new_user: false`.
5. A new number atomically creates a blank-name School, Main Branch, default Session, and `admin` User, then returns tokens with HTTP 201 and `is_new_user: true`. There is no `complete-signup` route. Name and school profile are completed using `PATCH /auth/me/` and `PATCH /school/`.
6. Access tokens last 20 minutes; refresh tokens last 30 days. Refresh rotation and blacklisting are enabled. A successful refresh can return both a new access and a new refresh token; the old refresh token must be replaced atomically.
7. Logout blacklists the submitted refresh token. It is `AllowAny` and does not invalidate an already-issued access token.
8. The backend does not return an access-token expiry timestamp. The frontend must treat JWT/server 401 behaviour as authoritative.
9. Multiple device sessions are supported. There are no list-session, revoke-one-session, revoke-other-sessions, or revoke-all-sessions endpoints.

Phase 15 prepares the shared refresh path but intentionally leaves the existing mock auth service connected. Phase 16 needs an auth DTO/adapter because the frontend currently models `requestId`, separate school/platform login inputs, memberships, uppercase roles, and `expiresAt`, none of which arrive in the backend response.

## 4. Roles and permission behaviour

Implemented backend roles are exactly:

| Backend role | Coarse permission behaviour |
|---|---|
| `super_admin` | Platform school list/onboarding/status and platform dashboard only |
| `admin` | Whole-school administration and all branches |
| `branch_admin` | Own-branch administration; narrower staff creation |
| `teacher` | Read access in own branch and selected marks/attempt grading operations |
| `student` | Parent/student login backed by `StudentLink`; own linked children/attempts |

Permissions are role-only classes (`IsSuperAdmin`, `IsAdmin`, `IsBranchAdmin`, `IsAdminOrBranchAdmin`, `IsTeacher`, `IsStudent`) plus per-view queryset and branch checks. There is no backend equivalent of the frontend permission-key catalogue or configurable role definitions.

Frontend role mismatches:

- Frontend has `SCHOOL_ADMIN`; backend calls it `admin`.
- Both have branch admin and super admin after casing adapters.
- Frontend has `ACCOUNTANT`, `RECEPTIONIST`, and `PARENT`; backend does not.
- Backend has `teacher`; the current mobile navigation deliberately does not.
- Backend `student` represents a parent login linked to one or more Student rows, whereas frontend distinguishes `PARENT` and `STUDENT` memberships.

## 5. Tenant, School, Branch, and Session scoping

- `super_admin` platform endpoints are intentionally unscoped.
- Admin list queries normally filter by `request.user.school`; branch admins and teachers normally filter to `request.user.branch` through `_accessible_branch_ids`.
- Student/parent access is special-cased with `StudentLink` for children, ledgers, exam lists/results/report cards, and online attempts.
- Session is school-wide. Classes belong to a branch and session; one session per school can be active. Class creation uses the active session when `session` is omitted.
- Subject is school-wide. A class-subject-teacher row must join a class, subject from the same school, and teacher from the same branch.
- Financial and exam records are scoped through student/class/branch relationships. Several views deliberately return 404 instead of 403 for out-of-scope IDs to reduce data disclosure.
- School/branch/user `is_active` fields are not checked by the coarse JWT permission classes on every request. A token-owning inactive user or user under an inactive school/branch may retain access until individual behaviour rejects it. This requires backend hardening before relying on lifecycle flags for immediate lockout.

## 6. Pagination, filtering, search, and ordering

There is no pagination in the implemented API. Every list returns a complete JSON array inside a named envelope. The frontend's paginated repositories therefore need a local adapter initially and a backend pagination decision before large datasets are safe.

Implemented query parameters:

| Endpoint | Query parameters |
|---|---|
| `/classes/` | `branch` |
| `/sections/` | `school_class` |
| `/class-subject-teacher/` | `school_class` |
| `/students/` | `q`, `school_class`, `status` |
| `/fee-structure-items/` | `school_class` |
| `/student-fee-assignments/` | `student` |
| `/fees/invoices/` | `student`, `status`, `month`, `year` |
| `/payments/` | `student` |
| `/reports/daily-collection/` | `date` |
| `/exams/` | `school_class` |
| `/exams/:id/marks/` | `exam_subject`, `section` |

`q` searches student name, admission number, and parent phone. Ordering comes from explicit `.order_by()` calls or model metadata; clients must not assume a universal ordering field or direction.

## 7. Success response shapes

- Entity: `{success: true, school|branch|user|student|exam|...: DTO}`.
- List: `{success: true, schools|branches|students|invoices|...: DTO[]}`.
- Mutation without entity: `{success: true, message: string}`.
- Auth verify: `{success: true, is_new_user, message, user, access, refresh}`.
- Refresh: `{success: true, access, refresh?}`.
- Generation: `{success: true, created, skipped, ...}`.
- Reports and dashboards return endpoint-specific aggregate fields directly beside `success`.
- Deletes return HTTP 200 rather than 204.
- Create operations normally return 201; updates, actions, lists, and deletes normally return 200.

There is no generic `{data: ...}` envelope and no pagination metadata in current Django responses. Existing frontend `ApiResponse<T>` and `PaginatedResponse<T>` must be populated by adapters.

## 8. Validation and error shapes

Expected view-built failure:

```json
{
  "success": false,
  "message": "Human-readable message",
  "error_code": "VALIDATION_ERROR",
  "errors": { "field_name": ["Field message"] }
}
```

Also supported by the client normalizer:

- DRF `{detail: string}` authentication/permission/not-found failures.
- `non_field_errors` at the root or within `errors`.
- string, string-array, and nested serializer error values.
- Status categories: 400/422 validation, 401 authentication, 403 permission, 404 not-found, 409 conflict, 5xx server; 429 and 5xx are retryable signals.
- Network, timeout, caller cancellation, and unsupported-operation errors have typed non-HTTP categories.

Frequent codes include `VALIDATION_ERROR`, `PERMISSION_DENIED`, `NOT_FOUND`, `NO_SCHOOL`, `NO_ACTIVE_SESSION`, `HAS_DEPENDENTS`, duplicate-resource codes, OTP lifecycle codes, `INVALID_REFRESH_TOKEN`, and exam lifecycle codes. The backend often uses HTTP 400 for duplicate/conflict conditions instead of 409.

## 9. File, upload, download, and share behaviour

- There are no multipart upload endpoints in the current URL set.
- AI question generation accepts screenshots as base64 data-URI strings in an `images` JSON array; this is JSON, not multipart.
- Invoice share returns `upi_link` and a base64 PNG data URI in `qr_code` when UPI is configured. It also invokes the backend messaging provider and records reminder history.
- Invoice reminders and receipt share are server-side side effects; they do not return a file.
- Receipt and report-card endpoints return JSON DTOs. There is no PDF/binary receipt or report-card download endpoint, no export job, and no signed download URL.
- The Phase 15 client supports `FormData`, text, JSON, and Blob responses so later endpoints can be added without another client.

## 10. Endpoint inventory

Legend: `P` public; `A` authenticated; `SA` super admin; `AD` admin; `BA` branch admin; `T` teacher; `S` student/parent. `Adapter` means the backend exists but its DTO/lifecycle differs from the current frontend repository. Unless noted, success is 200 and common errors are validation/permission/not-found plus DRF 401.

### Authentication

| Method and path | Auth / input | Success response | Frontend mapping / status |
|---|---|---|---|
| `POST /auth/send-otp/` | P; `{phone_number}` | `{success,message,expires_in_minutes}` | AuthService request OTP; **Adapter** (no school code/request ID) |
| `POST /auth/resend-otp/` | P; `{phone_number}` | same as send | AuthService resend; **Adapter** |
| `POST /auth/verify-otp/` | P; `{phone_number,otp}` | 200 existing or 201 new; user/tokens/`is_new_user` | AuthService verify; **Adapter** |
| `POST /auth/refresh/` | P; `{refresh}` | rotated `{access,refresh?}` | shared token coordinator; **ready** |
| `POST /auth/logout/` | P; `{refresh}` | message | AuthService logout; **Adapter** |
| `GET /auth/me/` | A | user DTO | Auth restore/profile; **Adapter** |
| `PATCH /auth/me/` | A; `{name}` | user DTO | onboarding/profile; **Adapter** |

OTP-specific errors include cooldown 429, too-many-requests 429, SMS failure 502, not-found/expired/invalid/max-attempt OTP 400. Refresh failure is 401. No `complete-signup` endpoint exists.

### Organization, staff, and super admin

| Method and path | Auth / input or query | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, PATCH /school/` | A read; AD patch School fields | `{school}` | Organization school/settings; **Adapter** |
| `GET, POST /branches/` | A scoped read; AD create Branch fields | list / 201 entity | OrganizationService; **Adapter** |
| `GET, PATCH, DELETE /branches/:id/` | scoped A read; AD mutate | entity/message | OrganizationService; **Adapter**; DELETE absent from Postman |
| `PATCH /branches/:id/status/` | AD; `{is_active}` | entity | OrganizationService; **Adapter** |
| `GET, POST /users/` | AD/BA; create `{name,phone_number,role,branch?}` | list / 201 entity | UserManagementService; **Adapter** |
| `GET, PATCH, DELETE /users/:id/` | AD/BA scoped; patch `{name?,branch?}` | entity/message | UserManagementService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /users/:id/status/` | AD/BA; `{is_active}` | entity | UserManagementService; **Adapter** |
| `GET, POST /schools/` | SA; create `{school_name,admin_name,admin_phone_number}` | list / 201 school+admin | Super-admin OrganizationService; **Adapter** |
| `GET, PATCH /schools/:id/` | SA; School fields | entity | Super-admin OrganizationService; **Adapter**; PATCH absent from Postman |
| `PATCH /schools/:id/status/` | SA; `{is_active}` | entity | OrganizationService; **Adapter** |
| `GET /platform/dashboard/` | SA | platform aggregates | No exact frontend repository operation; **frontend-missing** |

Branch/user deletes can fail with `HAS_DEPENDENTS`. Branch admins can create/manage only teachers in their own branch. Backend cannot create frontend accountant/receptionist roles.

### Academic setup

| Method and path | Auth / input or query | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, POST /sessions/` | A read; AD create `{name,start_date,end_date}` | list / 201 entity | Organization academic sessions; **Adapter** |
| `GET, PATCH, DELETE /sessions/:id/` | A read; AD mutate | entity/message | OrganizationService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /sessions/:id/activate/` | AD | active session | OrganizationService activate; **Adapter** |
| `GET, POST /classes/` | A; `?branch`; AD/BA create `{branch,session?,name,display_order}` | list / 201 entity | AcademicService; **Adapter** |
| `GET, PATCH, DELETE /classes/:id/` | scoped A; AD/BA mutate name/order | entity/message | AcademicService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /classes/:id/status/` | AD/BA; `{is_active}` | entity | AcademicService; **Adapter** |
| `GET, POST /sections/` | A; `?school_class`; AD/BA create fields | list / 201 entity | AcademicService; **Adapter** |
| `GET, PATCH, DELETE /sections/:id/` | scoped A; AD/BA mutate | entity/message | AcademicService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /sections/:id/status/` | AD/BA; `{is_active}` | entity | AcademicService; **Adapter** |
| `GET, POST /subjects/` | A read; AD create `{name,code}` | list / 201 entity | AcademicService; **Adapter** |
| `GET, PATCH, DELETE /subjects/:id/` | A read; AD mutate | entity/message | AcademicService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /subjects/:id/status/` | AD; `{is_active}` | entity | AcademicService; **Adapter** |
| `GET, POST /class-subject-teacher/` | A; `?school_class`; AD/BA create IDs | list / 201 entity | Academic assignments; **Adapter** |
| `DELETE /class-subject-teacher/:id/` | AD/BA scoped | message | Academic assignments; **Adapter** |

The backend has no “close session” action. Hard deletes are guarded inconsistently by the explicitly checked dependent relationships.

### Students and parent-facing access

| Method and path | Auth / input or query | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, POST /students/` | A; `q/school_class/status`; AD/BA create admission fields | list / 201 entity | StudentService list/admit; **Adapter** |
| `GET, PATCH, DELETE /students/:id/` | scoped A read; AD/BA mutate | entity/message | StudentService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /students/:id/status/` | AD/BA; `{status}` | entity | StudentService; **Adapter** |
| `GET /students/:id/ledger/` | scoped staff or linked S | ledger aggregate | CollectionService; **Adapter** |
| `GET /my-children/` | S | `{students:[...]}` | StudentService parent children; **Adapter** |
| `GET /students/:id/results/` | scoped staff or linked S | result summaries | Marks/report-card services; **Adapter** |
| `GET /students/:id/report-card/` | scoped staff or linked S | consolidated JSON | ReportCardService; **Adapter** |

Student admission creates/reuses a parent login as backend role `student` and links the Student row. Separate guardians, enrollment history, transfers, and app-access toggles are not modeled as frontend expects.

### Fee structure and invoices

| Method and path | Auth / input or query | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, POST /fee-heads/` | A read; AD create `{name,frequency}` | list / 201 entity | FeeSetupService; **Adapter** |
| `GET, PATCH, DELETE /fee-heads/:id/` | A read; AD mutate | entity/message | FeeSetupService; **Adapter**; PATCH/DELETE absent from Postman |
| `PATCH /fee-heads/:id/status/` | AD; `{is_active}` | entity | FeeSetupService; **Adapter** |
| `GET, POST /fee-structure-items/` | A; `?school_class`; AD/BA create class/head/amount/mandatory | list / 201 entity | Fee structure adapter; **Adapter** |
| `GET, PATCH, DELETE /fee-structure-items/:id/` | A read; AD/BA mutate amount/mandatory | entity/message | FeeSetupService; **Adapter**; PATCH/DELETE absent from Postman |
| `GET, POST /student-fee-assignments/` | A; `?student`; AD/BA create override | list / 201 entity | FeeSetupService; **Adapter** |
| `GET, PATCH, DELETE /student-fee-assignments/:id/` | A read; AD/BA mutate | entity/message | FeeSetupService; **Adapter**; PATCH/DELETE absent from Postman |
| `POST /fees/generate-monthly/` | AD/BA; `{branch?}` | `{created,skipped}` | FeeDue generation; **Adapter** |
| `POST /fees/generate-one-time/` | AD/BA; head plus one target and optional due date | `{created,skipped}` | FeeDue generation; **Adapter** |
| `GET /fees/invoices/` | scoped A; filters student/status/month/year | `{invoices}` | FeeDue list; **Adapter** |
| `GET /fees/invoices/:id/` | scoped A | `{invoice}` | FeeDue detail; **Adapter** |
| `PATCH /fees/invoices/:id/cancel/` | AD/BA | `{invoice}` | FeeDue cancel; **Adapter** |
| `POST /fees/invoices/:id/share/` | AD/BA | message, UPI link, base64 QR | Communication/FeeDue share; **Adapter** |
| `POST /fees/invoices/:id/remind/` | AD/BA | message | Communication reminder; **Adapter** |

Monthly generation uses the database uniqueness rule and reports skipped duplicates. One-time generation, shares, and reminders have no idempotency key. The backend’s Invoice model does not implement the frontend due-preview/commit run, fine-rule, discount-definition, waiver, fine-refresh, generation-history, or snapshot lifecycle.

### Payments, receipts, and reports

| Method and path | Auth / input or query | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, POST /payments/` | scoped A read; AD/BA post student/amount/mode/invoice?/metadata | list / 201 payment | CollectionService; **Adapter** |
| `GET /payments/:id/receipt/` | scoped A | JSON receipt | CollectionService; **Adapter** |
| `POST /receipts/:id/share/` | AD/BA | message | Communication/Collection; **Adapter** |
| `POST /receipts/:id/cancel/` | AD/BA | message after reversing allocation | Collection reverse; **Adapter** |
| `GET /reports/daily-collection/` | scoped A; `?date` | total/count/by-mode | Reports/Collection; **Adapter** |
| `GET /reports/collection-summary/` | scoped A | due and collection aggregates | Reports dashboard; **Adapter** |
| `GET /reports/follow-up/` | AD/BA | follow-up rows | Communication/Reports; **Adapter** |

Payments allocate FIFO, optionally prioritizing one invoice. Overpayment may remain unallocated; it is not a durable frontend-style advance-credit ledger. Posting a payment has no idempotency key. Cancelling a receipt uses POST and reverses payment allocations; there is no standalone payment detail or generic PDF receipt endpoint.

### Offline examinations and results

| Method and path | Auth / input or query | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, POST /exams/` | scoped A; `?school_class`; AD/BA create exam | list / 201 entity | ExaminationSetupService; **Adapter** |
| `GET, PATCH, DELETE /exams/:id/` | scoped A; AD/BA mutate | entity/message | ExaminationSetupService; **Adapter** |
| `PATCH /exams/:id/status/` | AD/BA; `{is_active}` | entity | ExaminationSetupService; **Adapter** |
| `GET, POST /exams/:id/subjects/` | scoped A; AD/BA create subject/max/pass marks | list / 201 entity | Exam paper config; **Adapter** |
| `GET, PATCH, DELETE /exams/:id/subjects/:subjectId/` | scoped A; AD/BA mutate | entity/message | Exam paper config; **Adapter** |
| `GET, POST /exams/:id/marks/` | A; GET filters subject/section; AD/BA/T bulk entries | list / 201 save summary | MarksResultService; **Adapter** |
| `POST /exams/:id/compute-rank/` | AD/BA | message | result calculation; **Adapter** |
| `GET /exams/:id/results/` | scoped A | result list | MarksResultService; **Adapter** |

Backend exams have types `unit_test`, `half_yearly`, `annual`, `other` and modes `offline`, `online`. There are no independent term, exam-type catalogue, grading-scheme, mark-sheet workflow, review, lock, publication-history, or unpublish endpoints.

### Online/live examinations

| Method and path | Auth / input | Success | Frontend mapping / status |
|---|---|---|---|
| `GET, POST /exams/:id/questions/` | scoped staff; AD/BA create | list / 201 entity | No completed frontend online-exam repository; **frontend-missing** |
| `GET, PATCH, DELETE /exams/:id/questions/:questionId/` | scoped staff; AD/BA mutate | entity/message | **frontend-missing** |
| `POST /exams/:id/questions/generate-ai/` | AD/BA; topic/images/count/type | draft list; 502 provider error | **frontend-missing** |
| `POST /exams/:id/questions/bulk/` | AD/BA; `{questions}` | 201 created list/count or per-index errors | **frontend-missing** |
| `GET, POST /exams/:id/exemptions/` | AD/BA; `{student}` | list / 201 entity | **frontend-missing** |
| `DELETE /exams/:id/exemptions/:id/` | AD/BA | message | **frontend-missing** |
| `POST /exams/:id/publish/` | AD/BA | exam and invoice count | No equivalent current lifecycle; **frontend-missing** |
| `POST /exams/:id/start/` | S | attempt/deadline/sanitized questions; possible 402 fee gate | **frontend-missing** |
| `POST /exams/:id/answer/` | S; question and selected option/text | message | **frontend-missing** |
| `POST /exams/:id/submit/` | S | attempt | **frontend-missing** |
| `GET /exams/:id/attempts/` | scoped AD/BA/T | attempt list | **frontend-missing** |
| `PATCH /exams/:id/answers/:answerId/grade/` | scoped AD/BA/T; `{marks_awarded}` | answer and recalculated attempt state | **frontend-missing** |

Question mutation is locked after publication. Start is fee-gated and can return HTTP 402 with invoice information. Attempt uniqueness makes repeated start return the existing attempt, while answer is an upsert and submit is lifecycle-checked.

## 11. Frontend repository mapping summary

| Frontend boundary | Backend coverage |
|---|---|
| `AuthService` | OTP, verify, refresh, logout, me exist; major request/session/role adapter required |
| `OrganizationService` | schools, branches, sessions mostly exist; settings and close-session gaps |
| `UserManagementService` | basic branch-admin/teacher user CRUD exists; membership/role/session/activity model absent |
| `AcademicService` | classes, sections, subjects, teacher assignments exist; summary must be composed |
| `StudentService` | basic admission/profile/status and children exist; guardian/enrollment/access/transfer gaps |
| `FeeSetupService` | heads, class items, student overrides exist; discount/fine/status/copy/preview gaps |
| `FeeDueService` | invoices/generation/cancel exist but lifecycle and DTO are substantially different |
| `CollectionService` | payments, allocations, receipts, ledger, daily totals partly exist; previews, credits, detail/history/document gaps |
| `CommunicationService` | invoice reminder/share and receipt share only; most communication features absent |
| `ExaminationSetupService` | a simpler exam/subject schedule exists; setup catalog/workflow differs |
| `MarksResultService` | bulk marks, recompute, result reads exist; review/lock/publication workflows absent |
| `ReportCardService` | one consolidated JSON report-card read exists; templates/generation/documents/lifecycle absent |
| `ReportService` | three fixed fee reports only; generic catalogue/filter/export jobs absent |

All remain `mock` in Phase 15. API implementation stubs are not treated as live repositories.

## 12. Backend endpoints without matching frontend features

- Entire online/live exam attempt experience: question bank, AI drafts, bulk questions, exemptions, publish fee gate, student start/answer/submit, staff attempt grading.
- Teacher role navigation and teacher-specific mobile experience.
- Exact platform aggregate endpoint (`/platform/dashboard/`) has no dedicated current repository operation.
- Raw UPI QR data-URI response and backend-driven SMS sending differ from the frontend’s manual/native sharing abstractions.
- Backend hard-delete operations for several organization/academic resources are not consistently exposed by current frontend service interfaces.

## 13. Frontend features without supporting backend endpoints

- Separate school-code login and platform-identifier login, membership selection/switching, explicit parent versus student memberships.
- Accountant/receptionist roles, permission-key configuration, role definitions, branch assignment sets, staff invitations, active-session inventory/revocation, and user activity.
- School settings object and academic-session close lifecycle.
- Multiple guardians, guardian unlinking, enrollment history, transfers, and parent/student app-access controls.
- Fee structure aggregate CRUD/status/copy, discount definitions, fine rules, payable preview, due generation preview/commit/history, due snapshots, fine refresh, fine/due waiver, and bulk fine refresh.
- Payment allocation preview, payment detail, durable advance credits, advance application preview/commit, and receipt/report-card binary document generation.
- Communication templates/settings/rules/schedules/history/retry/notifications and result/report-card messaging workflows.
- Exam terms, configurable exam types, grading schemes, multi-class configuration, validation/copy/draft/scheduled/cancel workflow.
- Mark-sheet draft/submit/return/lock/history, result preview/review/publish/unpublish/history, class/section result endpoints, and dedicated rank list.
- Report-card templates/generation batches/revocation/parent and student publication catalogues.
- Generic report catalogue, saved filters, export previews/jobs/cancel/retry/download.

These must use explicit `unsupported` mode or retain `mock`; live calls must never silently fall back to mock data.

## 14. Field, enum, type, and lifecycle mismatches

- Integer backend IDs versus string frontend IDs.
- Backend snake_case versus frontend camelCase.
- DRF decimal strings in rupees versus frontend integer paise in financial domains.
- Direct unpaginated arrays versus frontend `PaginatedResponse`.
- Backend lowercase roles/statuses versus frontend uppercase roles/statuses.
- Backend School has no exposed school code/logo/timezone/settings DTO expected by frontend.
- Backend Branch code is server-generated; frontend supports editable/configurable code concepts.
- Student backend statuses are `active`, `inactive`, `transferred`, `dropped`, `passed_out`; frontend lifecycle and enrollment records are richer.
- FeeHead frequencies are only `monthly` and `one_time`; frontend recurrence and fine/discount modelling is richer.
- Backend invoice statuses are `pending`, `partial`, `paid`, `overdue`, `cancelled`; frontend FeeDue lifecycle contains generated snapshots, waivers, fine state, and other transitions.
- Payment modes are `cash`, `upi`, `bank_transfer`, `cheque`, `card`; mapping and casing are required.
- Backend report cards are calculated JSON views, not generated versioned documents.
- Backend auth returns one User role/context, not a membership array, request ID, masked destination, resend timestamp, or token expiry timestamp.
- New-user verify is 201 while returning login credentials; clients must accept both 200 and 201.

## 15. Postman, documentation, and code inconsistencies

- `ARCHITECTURE.md` endpoint examples predominantly say `/api/v1`; code and `API_GUIDE.md` use `/ohmyteacher/api/v0`.
- The Postman collection has exactly 106 requests, but repeats `/exams/` across offline and online folders and does not represent every allowed method.
- Backend code allows PATCH/DELETE on branch, user, session, class, section, subject, fee-head, fee-structure-item, student-fee-assignment, and student detail routes where Postman often includes only GET (or status PATCH). School detail PATCH is also missing from Postman.
- Comments/model remnants still mention an older signup-token/complete-signup concept; no URL exists and `verify-otp` auto-creation is authoritative.
- `ARCHITECTURE.md` says the parent panel is deferred in one place, but code implements `/my-children/` and linked-child financial/result access.
- The guide broadly says every response has `success`; DRF-level errors can return only `detail`, and the unauthenticated `test/` endpoint returns only `message`.
- Architecture describes generalized CRUD completeness, but actual routes are resource-specific and not universally complete.
- Architecture claims teacher scoping to assigned class/subject at a high level; actual helper grants teachers branch-wide read scope, and marks/grading are branch-wide.
- `ALLOWED_HOSTS` is assigned twice; the final assignment permits loopback names only.
- There is no implemented global pagination despite frontend and audit requirements anticipating pagination metadata.

## 16. Risks and blockers for later phases

1. **Physical device blocker:** backend host settings reject LAN/tunnel hosts, and Android release builds reject plain HTTP. Use an HTTPS tunnel/deployment plus an allowed backend host, or add a deliberately local-only Android build type for LAN HTTP. This is separate from Metro/JS bundling.
2. **Role blocker:** frontend accountant/receptionist/parent/student semantics cannot be mapped losslessly to backend roles.
3. **Auth adapter blocker:** school-code/platform login and membership-shaped frontend sessions do not match phone-only single-context backend auth.
4. **Lifecycle enforcement risk:** inactive user/school/branch flags are not globally enforced for existing JWTs.
5. **Scale risk:** all lists are unpaginated; student/invoice/payment/marks lists can become large.
6. **Financial model blocker:** frontend fee dues, fines, discounts, waivers, previews, advance credits, and audit history exceed backend capabilities.
7. **Idempotency risk:** payments, one-time generation, reminders, and shares lack idempotency keys.
8. **Document/export blocker:** no PDF/binary report-card, receipt, or export endpoints exist.
9. **Deployment security risk:** development settings and a hardcoded server signing secret must be corrected outside this read-only phase.
10. **Logging risk:** the backend `send_otp` view prints incoming request data. It should be removed/redacted before production because request data can contain sensitive fields.
11. **Time-zone risk:** server calculations use UTC/date defaults while the school/frontend assumes local academic dates; timezone policy needs an explicit contract.
12. **HTTP semantics:** duplicate/conflict cases frequently use 400, and paid online exam gating uses 402; adapters must preserve codes rather than infer solely from status.

Recommended Phase 16 start: implement only the auth DTOs and mapper for phone-only OTP, `is_new_user`, backend User roles, and rotated JWTs; decide the role/membership mapping and new-user onboarding route before connecting any screen. Keep every non-auth module in explicit mock mode.
