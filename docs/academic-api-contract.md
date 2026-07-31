# Academic Setup API Contract

Phase 5 uses the shared `ApiResponse<T>` envelope:

```json
{ "success": true, "message": "Success", "data": {} }
```

Errors use `{ code, message, status, fieldErrors? }`. Authentication supplies the
actor; the server must independently authorize every path identifier. Route
parameters from the client are never proof of tenant access.

## Scope and invariants

- Class scope: `schoolId + branchId + academicSessionId`.
- Section scope: its owning class and therefore the same class context.
- Subject scope: `schoolId`; the catalog is shared by that school's branches and
  sessions.
- Assignment scope: the exact class context plus `classId + subjectId`.
- A branch must belong to the school, and a session must belong to the school.
- Closed sessions reject every class, section, and assignment mutation with
  `ACADEMIC_SESSION_CLOSED`.
- Names and codes are case-insensitively unique within their scopes.
- Codes are normalized uppercase and accept `A-Z`, `0-9`, `_`, and `-`, up to
  20 characters.
- There is no delete endpoint. Status changes and assignment removal preserve
  records.
- A class cannot be deactivated while it has active sections or active subject
  assignments. A subject cannot be deactivated while it has active assignments.
- An inactive class cannot accept sections or subject assignments. Only active
  school-owned subjects can be assigned.

## Summary

`GET /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/academic-setup/summary`

Returns total/active classes, total sections, active school subjects,
classes without sections, and unassigned classes.

## Classes

- `GET /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes`
- `POST /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes`
- `GET /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId`
- `PUT /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId`
- `PATCH /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/status`

List query: `search`, `status=ALL|ACTIVE|INACTIVE`, `page`, `pageSize`, and
`sort=DISPLAY_ORDER_ASC|NAME_ASC`.

Create/update body:

```json
{
  "name": "Class 6",
  "code": "C06",
  "displayOrder": 9,
  "status": "ACTIVE"
}
```

## Sections

- `GET /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/sections`
- `POST /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/sections`
- `GET /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/sections/:sectionId`
- `PUT /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/sections/:sectionId`
- `PATCH /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/sections/:sectionId/status`

List query matches the class list query. `capacity` is optional and is only
planning metadata; it does not create or imply student records.

```json
{
  "name": "Section A",
  "code": "A",
  "capacity": 40,
  "displayOrder": 1,
  "status": "ACTIVE"
}
```

## School subject catalog

- `GET /schools/:schoolId/subjects`
- `POST /schools/:schoolId/subjects`
- `GET /schools/:schoolId/subjects/:subjectId`
- `PUT /schools/:schoolId/subjects/:subjectId`
- `PATCH /schools/:schoolId/subjects/:subjectId/status`

List query adds `type=ALL|CORE|ELECTIVE|OPTIONAL`.

```json
{
  "name": "Mathematics",
  "code": "MATH",
  "shortName": "Math",
  "type": "CORE",
  "displayOrder": 2,
  "status": "ACTIVE"
}
```

## Class-subject assignments

- `GET /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/subjects`
- `PUT /schools/:schoolId/branches/:branchId/academic-sessions/:sessionId/classes/:classId/subjects`

The update body is the complete desired active set:

```json
{ "subjectIds": ["subject-omt-eng", "subject-omt-math"] }
```

Selected inactive records are reactivated; omitted active records become
`INACTIVE`. Records are never deleted. Duplicate IDs, cross-school subjects,
inactive subjects, inactive classes, and mismatched class context are rejected.

## Authorization

- Super Admin: selected-school access.
- School Admin: own school and all its active branches.
- Branch Admin: assigned branch only, using effective role permissions.
- View permissions: `academic.class.view`, `academic.section.view`,
  `academic.subject.view`.
- Manage permissions: `academic.class.manage`, `academic.section.manage`,
  `academic.subject.manage`.
- Accountant, Receptionist, Parent, and Student do not receive academic setup
  routes in Phase 5.

The API must enforce the same permissions and scopes even when the mobile
client has hidden an action.
