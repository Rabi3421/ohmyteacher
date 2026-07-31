# Marks and Result API contract

Phase 12 uses the same `MarksResultService` contract in mock and API modes. The API adapter deliberately returns `REAL_API_NOT_CONFIGURED` until a backend is connected; screens and the focused Zustand store never import fixtures.

## Scope and identity

All resources are tenant-scoped by `schoolId`, with `branchId`, `academicSessionId`, and `examId` checked where applicable. Navigation carries IDs only. Mark Sheets are uniquely scoped to an Exam class configuration, Section, and Subject Paper. Eligible students are derived from enrollment date overlap on the Exam dates, including active, transferred, and completed historical enrollments.

## Marks endpoints

- `getMarksDashboard`, `getMarkSheets`, `getMarkSheet`
- `saveMarkSheetDraft` with Mark Sheet and per-student `expectedVersion`
- `submitMarkSheet`, `returnMarkSheetToDraft`, `lockMarkSheet`, `unlockMarkSheet`
- `getMarkSheetHistory`

`PRESENT`, `ABSENT`, and `EXEMPT` are distinct attendance states. Blank and zero Marks are distinct. Absent and exempt entries cannot carry component Marks; exemption requires a reason and elevated permission. Version mismatches return `MARKS_VERSION_CONFLICT`. Draft save is atomic.

Valid transitions are `NOT_STARTED → DRAFT → SUBMITTED → LOCKED`. A submitted sheet may return to Draft with a reason. A locked sheet may be unlocked with elevated permission and a reason only when no active publication exists; calculated Results then become stale.

## Result endpoints

- `getResultProcessingSummary`
- `previewResultCalculation`, `calculateResults`
- `getClassResults`, `getSectionResults`, `getStudentResult`
- `reviewResults`
- `publishResults`, `unpublishResults`, `getPublicationHistory`
- `getRankList`

Calculation supports one student, one Section, one Class, or a complete Exam. Preview is non-mutating, version-bound, and expires after 15 minutes. Commit is atomic. Percentages use integer basis points and display to two decimals. Subject pass requires Paper and configured Component pass thresholds. Overall calculation honors required/optional/exempt Subjects, attendance, overall percentage, completeness, and grading snapshots.

Ranking is opt-in per Exam Class configuration, pass-only, and uses competition ranking (`1, 2, 2, 4`) with deterministic student-ID tie ordering. Review is bound to the current calculation run and is invalidated by recalculation.

Publication requires complete current Results, locked source Mark Sheets, and review for the same calculation run. It creates immutable Student, enrollment, Subject, grade, configuration, and calculation snapshots. Unpublication requires a reason and preserves both snapshots and batch history. Phase 12 creates no Report Card records and exposes no Parent or Student Result routes.

## Lifecycle and errors

Saving the first Marks Draft moves a Scheduled Exam to In Progress. A fully locked, complete, calculated, and reviewed Exam becomes Completed. Unlocking Marks returns it to In Progress. Draft and Cancelled Exams reject Marks processing; closed Academic Sessions are read-only.

Expected normalized errors include `MARKS_VERSION_CONFLICT`, `INCOMPLETE_MARK_SHEET`, `INVALID_STUDENT_MARKS`, `PUBLISHED_RESULT_UNLOCK_REJECTED`, `RESULT_CALCULATION_BLOCKED`, `CALCULATION_PREVIEW_EXPIRED`, `RESULT_REVIEW_BLOCKED`, `RESULT_PUBLICATION_BLOCKED`, tenant/scope mismatches, and the atomic rollback codes documented in fixtures.
