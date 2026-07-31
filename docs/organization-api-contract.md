# Organization API Contract

This document defines the future REST contract consumed by the Organization
Core frontend. The current application uses `mockOrganizationService`; no
backend calls are made. All identifiers are opaque strings and all timestamps
are ISO 8601 UTC values.

## Common envelopes

Successful responses use:

```json
{
  "success": true,
  "message": "School updated.",
  "data": {}
}
```

Validation and domain errors use:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SCHOOL_CODE",
    "message": "Choose a different school code.",
    "fieldErrors": {
      "code": "This school code is already in use."
    }
  }
}
```

Recommended status codes are `400` for malformed input, `401` for an absent or
expired session, `403` for permission or tenant access denial, `404` for a
missing resource, and `409` for a domain conflict.

Permission failure:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Your role cannot manage academic sessions."
  }
}
```

Tenant failure:

```json
{
  "success": false,
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "This resource does not belong to the active school workspace."
  }
}
```

The backend must derive permitted tenant scope from the authenticated
membership. It must never trust a route `schoolId` or `branchId` by itself.
Frontend guards only improve the user experience.

## Schools

### List schools

`GET /schools?search=omt&status=ACTIVE&page=1&pageSize=20`

This endpoint is Super-Admin-only. `search` matches school name, code, or
mobile. `status` is `ACTIVE` or `INACTIVE`; omitting it returns both. `page`
starts at 1 and `pageSize` is server-capped.

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": "school-omt",
        "name": "OhMyTeacher Demo School",
        "code": "OMT001",
        "mobile": "9876543200",
        "address": {
          "line1": "1, Education Road",
          "city": "Bhubaneswar",
          "state": "Odisha",
          "pinCode": "751001",
          "country": "India"
        },
        "status": "ACTIVE",
        "branchCount": 1,
        "activeBranchCount": 1,
        "createdAt": "2026-04-01T09:00:00.000Z",
        "updatedAt": "2026-07-15T10:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

### Create school atomically

`POST /schools`

```json
{
  "name": "Bluebell Public School",
  "code": "BPS001",
  "email": "office@bluebell.edu.in",
  "mobile": "9876500100",
  "address": {
    "line1": "10 School Road",
    "city": "Bhubaneswar",
    "state": "Odisha",
    "pinCode": "751001",
    "country": "India"
  },
  "admin": {
    "name": "Asha Das",
    "mobile": "9876500101",
    "email": "asha@bluebell.edu.in"
  }
}
```

The backend transaction creates and returns the School, active `MAIN` branch,
current April–March academic session, and initial School Admin membership
summary. It must roll back all four records if any part fails.

```json
{
  "success": true,
  "message": "School and default organization setup created.",
  "data": {
    "school": { "id": "school-bps", "name": "Bluebell Public School", "code": "BPS001" },
    "mainBranch": { "id": "branch-bps-main", "name": "Main Branch", "code": "MAIN", "status": "ACTIVE" },
    "activeSession": { "id": "session-bps-current", "name": "2026-27", "status": "ACTIVE" },
    "schoolAdmin": { "membershipId": "membership-bps-admin", "name": "Asha Das", "mobile": "9876500101", "role": "SCHOOL_ADMIN" }
  }
}
```

Additional school endpoints:

```text
GET    /schools/:schoolId
PUT    /schools/:schoolId
PATCH  /schools/:schoolId/status
```

`PUT` does not accept `id`, `code`, `status`, `createdAt`, or admin fields.
Status request:

```json
{ "status": "INACTIVE" }
```

Deactivation preserves all related data; no school delete endpoint exists.

## Branches

```text
GET    /schools/:schoolId/branches?search=main&status=ACTIVE&page=1&pageSize=20
POST   /schools/:schoolId/branches
GET    /schools/:schoolId/branches/:branchId
PUT    /schools/:schoolId/branches/:branchId
PATCH  /schools/:schoolId/branches/:branchId/status
```

Create request:

```json
{
  "name": "Puri Branch",
  "code": "PURI",
  "email": "puri@bluebell.edu.in",
  "mobile": "9876500102",
  "address": {
    "line1": "12 Sea Beach Road",
    "city": "Puri",
    "state": "Odisha",
    "pinCode": "752001",
    "country": "India"
  }
}
```

Branch codes are uppercase and unique within one school. `PUT` treats code as
immutable. Status accepts `ACTIVE` or `INACTIVE`. Attempting to deactivate the
last active branch returns `409 LAST_ACTIVE_BRANCH`. No branch delete endpoint
exists.

## Academic sessions

```text
GET    /schools/:schoolId/academic-sessions
POST   /schools/:schoolId/academic-sessions
PUT    /schools/:schoolId/academic-sessions/:sessionId
POST   /schools/:schoolId/academic-sessions/:sessionId/activate
POST   /schools/:schoolId/academic-sessions/:sessionId/close
```

Create request:

```json
{
  "name": "2027-28",
  "startDate": "2027-04-01",
  "endDate": "2028-03-31",
  "status": "UPCOMING"
}
```

Names must be unique within a school, dates must not overlap another session,
and end date must be later than start date. Only upcoming sessions can be
updated. Closed sessions are immutable and cannot be reopened.

Activation is one database transaction:

```text
current ACTIVE -> CLOSED
selected UPCOMING -> ACTIVE
```

The activation response returns the complete updated school session list.
There is no academic-session delete endpoint.

## School settings

```text
GET /schools/:schoolId/settings
PUT /schools/:schoolId/settings
```

```json
{
  "displayName": "Bluebell Public School",
  "logoUrl": "https://cdn.example.edu/bluebell.png",
  "primaryEmail": "office@bluebell.edu.in",
  "primaryMobile": "9876500100",
  "timezone": "Asia/Kolkata",
  "currency": "INR",
  "country": "India",
  "academicYearStartMonth": 4,
  "dateFormat": "DD-MMM-YYYY"
}
```

Only Super Admin and the active School Admin membership for the same school may
update these general settings. Fee and examination settings are intentionally
outside this contract.
