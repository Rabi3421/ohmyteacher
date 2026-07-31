# User Management API Contract

This contract describes the future Python REST API consumed by the Phase 4
frontend. The current application uses a mutable typed mock service and does
not call these endpoints.

## Security and tenancy

The backend must derive the acting user, membership, school, branch scope, role,
and effective permissions from the authenticated session. Route IDs, selected
branches, roles, and permission keys are untrusted input. Frontend guards are
for user experience only.

Global identity and school access are separate:

```text
User Identity -> School Membership -> System Role -> Branch Scope -> Permissions
```

Changing or deactivating a membership never deletes the identity or historical
records. Sensitive mobile changes, role changes, and deactivation revoke
sessions. No endpoint accepts or returns passwords, OTPs, access tokens, or
refresh tokens.

## Common envelopes

```json
{
  "success": true,
  "message": "Staff membership created.",
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_MEMBERSHIP",
    "message": "This user already has an active membership with the selected role.",
    "fieldErrors": {
      "mobile": "An active membership already exists."
    }
  }
}
```

Recommended statuses are `400` for malformed input, `401` for an invalid
session, `403` for permission/tenant/branch boundaries, `404` for missing
records, and `409` for domain conflicts.

## Staff list and details

```text
GET  /schools/:schoolId/staff-users
GET  /schools/:schoolId/staff-users/:membershipId
POST /schools/:schoolId/staff-users
```

List parameters:

```text
search     name, normalized mobile, or email
role       SCHOOL_ADMIN | BRANCH_ADMIN | ACCOUNTANT | RECEPTIONIST
branchId   active branch within the school
status     ACTIVE | INACTIVE
page       one-based page
pageSize   server-capped page size
```

List response data:

```json
{
  "items": [
    {
      "identity": {
        "id": "user-accountant",
        "name": "Vikram Rao",
        "mobile": "9876543211",
        "status": "ACTIVE",
        "lastLoginAt": "2026-07-20T07:45:00.000Z"
      },
      "membership": {
        "id": "membership-accountant",
        "userId": "user-accountant",
        "schoolId": "school-omt",
        "role": "ACCOUNTANT",
        "status": "ACTIVE",
        "branchIds": ["branch-main"]
      },
      "branches": [
        { "id": "branch-main", "name": "Main Branch", "code": "MAIN" }
      ]
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalItems": 1,
  "totalPages": 1
}
```

Create request:

```json
{
  "identity": {
    "name": "Amit Kumar",
    "mobile": "9860000099",
    "email": "amit@example.in"
  },
  "role": "ACCOUNTANT",
  "branchIds": ["branch-main"],
  "status": "ACTIVE"
}
```

The backend normalizes mobile and reuses an existing global identity. It creates
a new identity only when no identity has that mobile. A duplicate active
membership for the same school and role returns `409 DUPLICATE_MEMBERSHIP`. An
inactive identity returns `409 INACTIVE_USER_CONFLICT` with a controlled
reactivation path; it must not be silently duplicated.

Super Admin may create only `SCHOOL_ADMIN` within a selected school context.
School Admin may create only `BRANCH_ADMIN`, `ACCOUNTANT`, and `RECEPTIONIST`.
Parent and Student memberships are not created here.

## Identity and membership updates

```text
PUT   /users/:userId
PATCH /users/:userId/status
PUT   /schools/:schoolId/staff-users/:membershipId
POST  /schools/:schoolId/staff-users/:membershipId/change-role
PUT   /schools/:schoolId/staff-users/:membershipId/branches
PATCH /schools/:schoolId/staff-users/:membershipId/status
```

Identity update:

```json
{
  "name": "Vikram Rao",
  "mobile": "9876543211",
  "email": "vikram@omt.edu.in"
}
```

Production mobile changes require a separate verification challenge before
commit. The Phase 4 mock confirms the sensitive action and revokes sessions,
but does not simulate real mobile OTP verification.

Role change:

```json
{ "role": "BRANCH_ADMIN" }
```

This transaction validates actor authority and branch scope, recalculates
defaults plus valid school overrides, removes prohibited permissions, records
activity, revokes sessions, and invalidates cached membership resolution. A
role change or deactivation that would leave no active School Admin returns:

```json
{
  "success": false,
  "error": {
    "code": "LAST_ACTIVE_SCHOOL_ADMIN",
    "message": "A school must always have at least one active School Admin."
  }
}
```

Branch assignment:

```json
{ "branchIds": ["branch-main", "branch-city"] }
```

Every branch must exist, be active, belong to the membership school, and fall
inside acting-user scope. Otherwise return `403 INVALID_BRANCH_ASSIGNMENT`.
School Admin uses school scope and must have an empty branch list.

Global status affects all memberships and normally requires platform authority.
Membership status affects only one school. Inactive transitions preserve data,
revoke active sessions, remove protected workspace access, and add activity.

## Roles and permissions

```text
GET /schools/:schoolId/roles
GET /schools/:schoolId/roles/:role/permissions
PUT /schools/:schoolId/roles/:role/permissions
```

There is no role-create, role-delete, or role-key update endpoint in Release 1.

School override request:

```json
{
  "enabledPermissions": ["fee_reports.export"],
  "disabledPermissions": ["receipts.share"]
}
```

Effective access is calculated as:

```text
System role defaults
+ allowed school enabled overrides
- school disabled overrides
- prohibited permissions
```

Only keys listed in the role's configurable boundary may be changed. Accountant
exam permissions, Receptionist receipt cancellation, school settings, and
staff-user-management permissions are rejected with
`403 PERMISSION_BOUNDARY_VIOLATION`. Super Admin and School Admin essential
permissions are fixed in school-level configuration.

## Device sessions

```text
GET    /schools/:schoolId/staff-users/:membershipId/sessions
DELETE /schools/:schoolId/staff-users/:membershipId/sessions/:sessionId
DELETE /schools/:schoolId/staff-users/:membershipId/sessions?scope=others
DELETE /schools/:schoolId/staff-users/:membershipId/sessions
```

Session summaries contain device label, platform, approximate identifier, login
time, last-active time, current indicator, and status. They never contain raw
tokens. Revocation records `SESSIONS_REVOKED` activity.

## Login instructions

```text
POST /schools/:schoolId/staff-users/:membershipId/login-instructions
```

The future backend may deliver school code, app link, and OTP login guidance to
the verified mobile. It must not generate or expose an OTP in this response.
The action returns a masked destination and records
`LOGIN_INSTRUCTIONS_SENT`.

## Activity

```text
GET /schools/:schoolId/staff-users/:membershipId/activity?page=1&pageSize=20
```

Activity records include action, safe description, actor, target IDs, timestamp,
and a non-sensitive metadata summary. Security tokens, OTPs, and raw request
payloads are excluded.

Supported actions:

```text
STAFF_USER_CREATED
MEMBERSHIP_CREATED
ROLE_CHANGED
BRANCH_ASSIGNMENT_CHANGED
MEMBERSHIP_ACTIVATED
MEMBERSHIP_DEACTIVATED
USER_STATUS_CHANGED
PERMISSIONS_UPDATED
SESSIONS_REVOKED
LOGIN_INSTRUCTIONS_SENT
```

Example permission error:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Your active membership cannot manage staff users."
  }
}
```

Example tenant/branch error:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "The target membership is outside the active school or branch scope."
  }
}
```
