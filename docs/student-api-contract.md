# Student and Parent API Contract

This document defines the frontend-facing Release 1 contract. The current app
uses the typed mock implementation; it does not add backend code.

## Conventions

All routes require an authenticated, active membership. Staff authorization is
evaluated from the active role, effective permissions, `schoolId`, and branch
scope. Parent and Student routes additionally enforce membership ownership in
both client orchestration and the service.

Success responses use:

```json
{ "success": true, "data": {}, "message": "Optional message" }
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Safe user-facing message",
    "fieldErrors": { "field": "Optional field message" }
  }
}
```

No response or activity entry includes OTPs, tokens, or authentication secrets.

## Student list and profile

### `GET /schools/:schoolId/students`

Query parameters:

| Parameter | Meaning |
| --- | --- |
| `search` | Name, admission number, active roll number, or guardian mobile |
| `branchId` | Active enrollment branch, or `ALL` |
| `academicSessionId` | Enrollment session, or `ALL` |
| `classId` | Enrollment class, or `ALL` |
| `sectionId` | Enrollment section, or `ALL` |
| `studentStatus` | `ACTIVE`, `INACTIVE`, `WITHDRAWN`, `PASSED_OUT`, or `ALL` |
| `enrollmentStatus` | `ACTIVE`, `TRANSFERRED`, `COMPLETED`, `CANCELLED`, or `ALL` |
| `page`, `pageSize` | One-based pagination |

The response contains `items`, `page`, `pageSize`, `totalItems`, and
`totalPages`. Each list item contains the separate Student Profile, optional
current enrollment, and primary guardian summary.

### `GET /schools/:schoolId/students/:studentId`

Returns the profile, optional current enrollment, guardians, app-access
summary, enrollment count, last transfer, and status history.

### `PUT /schools/:schoolId/students/:studentId`

Updates mutable profile fields. `admissionNumber`, enrollment, and historical
records are not accepted. A changed mobile may require active-session
revocation by the backend.

### `PATCH /schools/:schoolId/students/:studentId/status`

Request:

```json
{ "status": "WITHDRAWN", "reason": "Family relocation" }
```

`INACTIVE`, `WITHDRAWN`, and `PASSED_OUT` require confirmation and a reason.
Withdrawal closes the active enrollment as `CANCELLED` and disables Student
membership access. Passed-out closes it as `COMPLETED`. Unsupported
reactivation from withdrawn or passed-out returns
`UNSUPPORTED_REACTIVATION`.

## Atomic admission

### `POST /schools/:schoolId/students/admissions`

The request contains `profile`, one or more `guardians`, `enrollment`, and
`enableStudentAppAccess`.

Before any write, the server must validate tenant and permission scope, open
session, active destination hierarchy, profile and guardian fields, unique
active roll number, exactly one primary guardian, exactly one fee contact,
identity compatibility, and Student mobile requirements.

On success, one transaction:

1. Generates a school-scoped immutable admission number.
2. Creates the Student Profile and active enrollment.
3. Reuses a guardian in the same school when normalized mobile matches, or
   creates one.
4. Creates guardian links.
5. Reuses a compatible global user identity by normalized mobile.
6. Reuses or creates one Parent membership per school and links each enabled
   guardian to the student.
7. Optionally reuses or creates the Student membership.
8. Records safe activity entries.

Any failure rolls back the complete operation. Relevant conflicts include
`DUPLICATE_ADMISSION`, `DUPLICATE_ROLL_NUMBER`,
`INCOMPATIBLE_STUDENT_IDENTITY`, `STUDENT_MOBILE_REQUIRED`,
`INVALID_BRANCH`, `INVALID_CLASS`, `INVALID_SECTION`, and
`SESSION_NOT_OPEN`.

## Guardians

```text
GET    /schools/:schoolId/students/:studentId/guardians
POST   /schools/:schoolId/students/:studentId/guardians
PUT    /schools/:schoolId/students/:studentId/guardians/:guardianId
DELETE /schools/:schoolId/students/:studentId/guardians/:guardianId
```

Create and update accept guardian identity/contact fields and link flags.
Selecting a new primary or fee contact atomically clears the previous flag.
The final active guardian cannot be unlinked
(`FINAL_GUARDIAN_PROTECTED`), and the current primary cannot be unlinked until
another primary is selected (`PRIMARY_GUARDIAN_PROTECTED`). DELETE is a soft
unlink; identity and relationship history remain.

## Enrollment history and transfer

### `GET /schools/:schoolId/students/:studentId/enrollments`

Returns immutable historical enrollments in reverse chronological order.
Future session promotion should append a new enrollment without changing the
Student Profile; bulk promotion is outside Release 1.

### `POST /schools/:schoolId/students/:studentId/transfer`

Request:

```json
{
  "type": "BRANCH_TRANSFER",
  "branchId": "branch-destination",
  "academicSessionId": "session-current",
  "classId": "class-destination",
  "sectionId": "section-destination",
  "rollNumber": "12",
  "effectiveDate": "2026-08-01",
  "reason": "Approved branch transfer"
}
```

The Student and current enrollment must be active. Release 1 transfers stay in
the same open session. The destination branch/class/section must form an active
hierarchy in the same school, and the actor must access both branches. An
identical destination returns `IDENTICAL_TRANSFER_DESTINATION`; unauthorized
branch movement returns `CROSS_BRANCH_ACCESS_DENIED`.

The operation atomically marks the previous enrollment `TRANSFERRED`, sets its
end date and transfer metadata, appends a new `ACTIVE` enrollment, and records
activity. The previous enrollment is never repurposed as the new enrollment.

## App access

```text
GET /schools/:schoolId/students/:studentId/access
PUT /schools/:schoolId/students/:studentId/guardians/:guardianId/parent-access
PUT /schools/:schoolId/students/:studentId/student-access
```

Access updates accept `{ "enabled": true | false }`. Parent access reuses a
compatible global identity and the existing school Parent membership, allowing
one membership to link multiple children. Disabling one link does not disable
the membership while another active child link remains. Student access
requires a unique personal mobile and one Student membership linked to that
profile. Disabling is reversible and never deletes an identity.

## Parent and Student ownership endpoints

```text
GET /schools/:schoolId/parent-memberships/:membershipId/children
GET /schools/:schoolId/parent-memberships/:membershipId/children/:studentId
GET /schools/:schoolId/student-memberships/:membershipId/profile
```

A Parent response contains only active `ParentStudentLink` records belonging to
the active Parent membership. Child detail requires an independent active-link
check for the requested `studentId`. Student self-profile derives the student
from the active Student membership; it does not trust a route-supplied student
ID. Ownership failures return `PARENT_OWNERSHIP_DENIED` or
`STUDENT_OWNERSHIP_DENIED`.

## Tenant, permission, and hierarchy errors

The API rejects a missing or cross-school resource even when an ID exists.
Branch-scoped roles cannot read or mutate outside assigned scope. Admission and
transfer independently validate that the branch belongs to the school, class
belongs to branch and session, section belongs to class, and session belongs to
the school and is open. Typical responses are `SCHOOL_NOT_FOUND`,
`CROSS_SCHOOL_ACCESS_DENIED`, `CROSS_BRANCH_ACCESS_DENIED`,
`PERMISSION_DENIED`, `INVALID_BRANCH`, `INVALID_CLASS`, `INVALID_SECTION`, and
`SESSION_NOT_OPEN`.
