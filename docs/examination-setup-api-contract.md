# Examination Setup API contract

Phase 11 defines a frontend contract for examination setup only. The current resolver uses a controlled in-memory mock; the API adapter deliberately returns `REAL_API_NOT_CONFIGURED` and does not call nonexistent endpoints.

## Scope hierarchy

`ExamType` and `GradingScheme` are reusable School resources. `ExamTerm` belongs to a School and Academic Session and is shared by that School's Branches. An `Exam` belongs to one School, Branch, Academic Session, Term, and Exam Type. It contains Class configurations, snapshotted applicable Sections, Subject Papers, and Assessment Components.

Every request must independently authorize the acting membership and validate School, Branch, Session, Term, Class, Section, Subject, role, effective permission, and Exam status. IDs from another tenant return a scope error, not data. Branch Admin access is restricted to assigned Branches. Closed Sessions are view-only.

## Endpoints

```text
GET    /schools/:schoolId/sessions/:sessionId/exam-terms
POST   /schools/:schoolId/sessions/:sessionId/exam-terms
GET    /schools/:schoolId/sessions/:sessionId/exam-terms/:termId
PUT    /schools/:schoolId/sessions/:sessionId/exam-terms/:termId
PATCH  /schools/:schoolId/sessions/:sessionId/exam-terms/:termId/status

GET    /schools/:schoolId/exam-types
POST   /schools/:schoolId/exam-types
GET    /schools/:schoolId/exam-types/:examTypeId
PUT    /schools/:schoolId/exam-types/:examTypeId
PATCH  /schools/:schoolId/exam-types/:examTypeId/status

GET    /schools/:schoolId/grading-schemes
POST   /schools/:schoolId/grading-schemes
GET    /schools/:schoolId/grading-schemes/:gradingSchemeId
PUT    /schools/:schoolId/grading-schemes/:gradingSchemeId
PATCH  /schools/:schoolId/grading-schemes/:gradingSchemeId/status

GET    /schools/:schoolId/branches/:branchId/sessions/:sessionId/exams
POST   /schools/:schoolId/exams
GET    /schools/:schoolId/exams/:examId
PUT    /schools/:schoolId/exams/:examId
PUT    /schools/:schoolId/exams/:examId/class-configurations
PUT    /schools/:schoolId/exams/:examId/class-configurations/:configId/subject-papers
PUT    /schools/:schoolId/exams/:examId/schedule
GET    /schools/:schoolId/exams/:examId/setup-validation
POST   /schools/:schoolId/exams/:examId/schedule
POST   /schools/:schoolId/exams/:examId/return-to-draft
POST   /schools/:schoolId/exams/:examId/copy-preview
POST   /schools/:schoolId/exams/:examId/copy
POST   /schools/:schoolId/exams/:examId/cancel

GET    /schools/:schoolId/branches/:branchId/sessions/:sessionId/examination-summary
```

List endpoints accept `search`, `status`, `page`, and `pageSize`; Exams additionally accept `termId`, `examTypeId`, `startDate`, and `endDate`. Responses use the shared `ApiResponse<T>` and `PaginatedResponse<T>` envelopes. Mutations support an idempotency key in the future backend.

## Terms and Exam Types

Term names and uppercase codes are unique within a Session. Dates are inclusive, inside the Session, ordered, and non-overlapping. Exam Type names and uppercase codes are unique within a School; optional default weightage is 0–100. Neither resource is hard-deleted. Deactivation is rejected while a Draft or Scheduled Exam references the resource.

## Grading Schemes and Grade Bands

Draft Schemes may be incomplete. Activation requires at least one Band, unique labels and positive display order, valid optional Grade Points, both passing and failing coverage, and deterministic continuous coverage from 0 through 100 without overlap or gaps. Only one active default Scheme may exist per School. Deactivation is protected while an active Exam Class configuration references it. Percentage lookup is a pure boundary utility and does not assign grades to Students.

## Class, Section, and Subject eligibility

Classes must be active and belong to the exact School, Branch, and Session. `ALL_ACTIVE_SECTIONS` resolves active Sections at configuration time; `SELECTED_SECTIONS` validates each Section belongs to that Class. Scheduling freezes Section snapshots, so later Academic changes do not silently alter scope. A Subject Paper is accepted only when the active School Subject is actively assigned to the exact Class/Branch/Session. Arbitrary or duplicate Subject IDs are rejected.

## Marks configuration

Assessment Component types are `THEORY`, `PRACTICAL`, `ORAL`, `PROJECT`, and `INTERNAL`. Phase 11 uses whole-number maximum/pass marks. Component names and positive display orders are unique, maximum marks are positive, pass marks are 0–maximum, Component maximum totals equal the Paper maximum, required Component pass totals cannot exceed the Paper pass total, and optional weightage is 0–100. These are setup values only; no Student Marks exist.

## Schedule and completeness

Each active Paper may have date, `HH:mm` start time, positive duration, and optional room. End time is derived. Dates must be inside both Exam and Session. Same-Class and shared-Section overlaps block scheduling. Same-room overlap is a warning. Missing schedules, duplicate Subjects, invalid marks, missing Classes/Sections/Papers, inactive Term/Type/Scheme, and closed Sessions are structured blockers. Validation returns `isComplete`, `completionPercent`, `blockers`, and `warnings` and is repeated by the scheduling command.

## Lifecycle, snapshots, copy, and cancellation

Phase 11 supports `DRAFT → SCHEDULED → CANCELLED`, direct Draft cancellation, and an explicit mock-only `SCHEDULED → DRAFT`. The future backend must reject Return to Draft once Marks Entry begins. Scheduling snapshots Class codes/names, Sections, Grading Scheme name, Subject identity/type, Components, and schedule. Scheduled setup changes require Return to Draft.

Copy preview matches destination Classes by stable code and Subjects by School ID or stable code plus active assignment. Inactive or missing resources are omitted with warnings. Commit creates a new Draft with new IDs and never auto-schedules. It copies no Student Marks or Results. Cancellation requires `exams.cancel`, a non-closed Session, Draft/Scheduled state, and a reason; it preserves setup snapshots and records actor/time/reason.

## Errors and permissions

Expected codes include `SCHOOL_SCOPE_MISMATCH`, `BRANCH_SCOPE_MISMATCH`, `SESSION_SCOPE_MISMATCH`, `CLOSED_ACADEMIC_SESSION`, `INVALID_EXAM_TERM`, `EXAM_TERM_IN_USE`, `INVALID_EXAM_TYPE`, `EXAM_TYPE_IN_USE`, `INVALID_GRADE_BANDS`, `DEFAULT_GRADING_SCHEME_CONFLICT`, `GRADING_SCHEME_IN_USE`, `INVALID_EXAM`, `DUPLICATE_EXAM_CLASS`, `SUBJECT_NOT_ELIGIBLE`, `INVALID_MARKS_CONFIGURATION`, `BLOCKING_SCHEDULE_CONFLICT`, `INCOMPLETE_EXAM_SETUP`, and `INVALID_EXAM_TRANSITION`. Field errors use the shared normalized error shape.

Super Admin has full access in a selected School. School Admin has full own-School access. Branch Admin defaults to `exams.view`, `exams.manage`, and `exams.schedule.manage`; `exams.cancel` is configurable. School-scoped Term, Type, and Scheme management defaults to School Admin. Accountant, Receptionist, Parent, and Student have no Examination Setup routes. Frontend guards are not backend security.

## Explicit exclusions

This phase creates no Student Marks, absent records, mark locks/imports, Student totals or percentages, assigned Student grades, pass/fail results, ranking, result publication, Report Cards, examination reports, invigilator/Teacher scheduling, examination notifications, or parent/student result views. It introduces no Teacher role or login and no hard delete.
