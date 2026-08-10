# Phase 19 Staff/User Contract

Audit date: 2026-08-03  
Backend: Django 5.1.6 and DRF 3.15.2  
API prefix: `/ohmyteacher/api/v0`

The Django source (`urls.py`, `views.py`, `serializers.py`, `models.py` and
`permissions.py`) is authoritative. It was inspected read-only. No credentials,
OTPs, tokens, complete private contacts or persistent records are included here.

## 1–8. Endpoints, methods, authentication and envelopes

| Method | Relative path | Permission/scope | Input | Success |
|---|---|---|---|---|
| GET | `/users/` | `admin` own School; `branch_admin` own Branch | no supported query | 200 `{success:true,users:User[]}` |
| POST | `/users/` | `admin`; `branch_admin` with extra restrictions | `{name,phone_number,role,branch?}` | 201 `{success:true,user:User}` |
| GET | `/users/{positive_int}/` | same-School Admin or same-Branch Branch Admin | none | 200 `{success:true,user:User}` |
| PATCH | `/users/{positive_int}/` | same target rules | `{name?,branch?}` | 200 `{success:true,user:User}` |
| PATCH | `/users/{positive_int}/status/` | same scoped roles | `{is_active:boolean}` | 200 `{success:true,user:User}` |
| DELETE | `/users/{positive_int}/` | same target rules | none | 200 `{success:true,message}` |

`PUT` is not supported. Authentication is DRF JWT authentication. A 401 uses the
shared coordinated refresh/session-expiry lifecycle. Permission-class denials are
403, while cross-tenant/missing target lookups are concealed as 404. The shared
client applies the API prefix; live services use only the relative paths above.

## 9–12. User, staff, identity and ownership model

There is one custom `User` model. It is simultaneously the authentication
identity and the record exposed by the staff API. There is no UserProfile,
Membership, Staff, invitation or user-branch join model. Each User has one
nullable `school` foreign key and one nullable `branch` foreign key. A User
therefore cannot hold multiple schools, memberships or branches in this schema.

`/auth/me/` returns the authenticated User and is not used for arbitrary staff
details. The staff routes return another User only after Django scope checks.
The frontend live domain is deliberately named `LiveStaffUser`; it does not call
the school/branch references a membership. The pre-existing mock membership,
custom-role and permission domain remains separate.

The serialized User is:

```text
id:int, phone_number:string, name:string, role:string,
school:int|null, branch:int|null, is_active:boolean, date_joined:timestamp
```

For live staff records, positive User, School and Branch IDs, non-empty names and
phones, known fixed staff roles, real booleans and parseable timestamps are
required at the mapper boundary. Missing branch never means school-wide access.

## 13–18. Roles, writable fields and creation/onboarding

Exact `User.Role` values are `super_admin`, `admin`, `branch_admin`, `teacher`
and `student`. Capitalization is exact. Role is stored directly on User. There
are no aliases. Accountant, receptionist and parent roles do not exist. The
student role is also used for the parent-login identity created by admission.

The generic staff serializer accepts only `branch_admin` and `teacher`.
`super_admin`, `admin` and `student` cannot be created through `/users/`.
School Admin may create Branch Admin or Teacher and must provide a Branch in its
own School. Branch Admin may create only Teacher; Django force-assigns the
requester's own Branch and ignores a submitted different Branch.

Create-writable fields are `name`, `phone_number`, `role`, and `branch`.
School ownership, ID, status and timestamps are server-owned. Update-writable
fields are only `name` and `branch`; phone, role, school, active status and
timestamps are read-only on that PATCH. Role changes are not supported by any
separate endpoint. Branch assignment is singular and nullable in the serializer,
although the Phase 19 UI requires one accessible active live Branch to avoid an
unsafe missing assignment.

Phone input is normalized to Indian `+91` format. Duplicate phone returns 400
under `errors.phone_number`. Email is absent. Creation sets an unusable password,
does not send an OTP, invitation or credentials, and returns no password/token.
The created person later uses the ordinary send-OTP/verify-OTP login; because the
User already exists it is treated as login, not self-signup. There is no
idempotency key, so uncertain create outcomes have duplicate-account risk; the
frontend locks submission and never auto-retries mutations.

## 19–23. Status, deletion, query and pagination behavior

`/users/{id}/status/` changes global `User.is_active`; it is not a membership or
branch-assignment status. Admin and Super Admin targets are protected. Django
uses Python `bool(value)` instead of serializer validation, so the frontend sends
an actual JSON boolean. Django does not promise immediate revocation of already
issued JWTs. The frontend does not make that claim and blocks self-status changes
as a UX safeguard.

DELETE is a hard delete and is blocked with HTTP 400 `HAS_DEPENDENTS` when a
Teacher still has subject assignments. Phase 19 intentionally does not expose
this destructive action. DELETE is never treated as deactivation.

GET `/users/` reads no search, role, branch, status, ordering, page or page-size
parameters and is unpaginated. Phase 19 fetches the server-scoped array once,
deduplicates stable IDs, and performs clearly client-side name/mobile, fixed-role,
single-branch and status filtering. No totals/pages are invented. The mapping
boundary exposes `pagination:null`; the unbounded backend response is a scale
risk.

## 24–30. Errors, scoping and role visibility

Serializer errors are normally HTTP 400
`{success:false,message,error_code:'VALIDATION_ERROR',errors:{field:[...]}}`.
View errors use `{success:false,message,error_code}`. DRF may return `{detail}`.
The shared Phase 15 normalizer handles 400/401/403/404/409/5xx, timeouts,
network failure, cancellation and malformed JSON. The mapper remaps
`phone_number` to `mobile` and never renders raw HTML/tracebacks.

School Admin list scope is `User.objects.filter(school=requester.school)` with
the requester excluded. Branch Admin list scope is
`User.objects.filter(branch_id=requester.branch_id)` with the requester excluded.
Detail/update/delete and status repeat those scopes. Detail additionally rejects
Admin/Super Admin, and Branch Admin can manage only Teacher. Cross-School branch
assignment is 403. A Branch Admin cannot move a user to another Branch.

The list view does not filter role, so it can return Admin, Super Admin or
`student` parent-login rows. That conflicts with its documented staff purpose.
Phase 19 filters the live staff boundary to `branch_admin` and `teacher` before
rendering and rejects a non-staff detail response. Parent/student identities are
therefore not exposed as staff. Super Admin has no current-school staff context,
does not receive these routes, and stays in the Phase 17 platform boundary.

A backend risk remains when a Branch Admin has `branch_id=null`: the list query
would select all Users whose branch is null. The frontend requires an assigned
branch before any staff request, but this is UX defense, not backend security.
Teacher remains unsupported for app navigation even though it is manageable as
a staff record. Unknown roles are never mapped to a privileged role.

## 31–35. Inactive enforcement, mappings, unsupported capabilities and risks

Django/DRF authentication enforces inactive User during authentication/refresh
according to its configured backend, but the staff views do not separately check
School or Branch `is_active`. Existing JWT behavior is not claimed as immediate
revocation. The frontend displays inactive User/School/Branch state, excludes
inactive Branches from new assignment, preserves an existing inactive branch for
display, retains logout and treats only recognizable errors as inactivity.

Transport mapping is centralized:

```text
User.id -> LiveStaffUser.id
User.phone_number -> mobile
branch_admin|teacher -> BRANCH_ADMIN|TEACHER
User.school -> schoolId (server-owned)
User.branch -> one live Branch reference
User.is_active -> ACTIVE|INACTIVE
User.date_joined -> joinedAt
```

Unsupported live capabilities are: configurable roles/permissions, role change,
multiple Branch assignments, email/mobile edit, existing-identity lookup,
membership status, invitation, credential generation, login-instruction resend,
activity/history, active sessions/revocation, server search/filter/order,
pagination, and soft delete. The live UI omits these operations. Configurable
role/permission screens remain backed only by the existing mock repository and
their IDs/permissions are never submitted to Django.

Postman and API_GUIDE match the endpoint paths and writable fields. Postman
describes DELETE but supplies no saved response examples. Older frontend models
assume global identities plus multi-school memberships, multiple branches,
Accountant/Receptionist roles and session/activity APIs; none match Django and
remain mock-only.

Security/blockers: backend list role leakage and null-Branch scoping require
server hardening in a future backend phase; lists are unbounded; create has no
idempotency; status parsing should validate a boolean; active School/Branch flags
are not enforced by these views; and no reachable authorized HTTPS/OTP setup was
configured for Phase 19 live smoke testing.
