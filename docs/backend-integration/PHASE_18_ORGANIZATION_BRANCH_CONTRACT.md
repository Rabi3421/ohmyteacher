# Phase 18 Current-School and Branch Contract

Audit date: 2026-08-03  
Backend: Django 5.1.6 and DRF 3.15.2  
API prefix: `/ohmyteacher/api/v0`

This note records the implemented Django contract inspected in `urls.py`,
`views.py`, `serializers.py`, `models.py`, `permissions.py`, settings, and the
Postman collection. The backend was read-only. No credentials, phone numbers,
tokens, OTPs, or private records are included.

## 1–5. Endpoints, methods, authentication, and permissions

| Method | Relative path | Permission | Success |
|---|---|---|---|
| GET | `/school/` | Any authenticated user with a School | 200 `{success:true,school}` |
| PATCH | `/school/` | Backend role `admin` only | 200 `{success:true,school}` |
| GET | `/branches/` | Authenticated and associated with a School | 200 `{success:true,branches:Branch[]}` |
| POST | `/branches/` | Backend role `admin` only | 201 `{success:true,branch}` |
| GET | `/branches/{positive_integer_id}/` | Authenticated; same School; non-Admin only own assigned Branch | 200 `{success:true,branch}` |
| PATCH | `/branches/{positive_integer_id}/` | Backend role `admin` only; same School | 200 `{success:true,branch}` |
| PATCH | `/branches/{positive_integer_id}/status/` | `IsAdmin`; same School | 200 `{success:true,branch}` |

`DELETE /branches/{id}/` also exists for School Admin and performs a guarded
hard delete. Phase 18 intentionally does not expose it. `PUT` is not supported.
Every live frontend call uses a relative path and the Phase 15 authenticated
client. School scope is never sent by the current-school service.

Frontend `SCHOOL_ADMIN` maps to backend `admin`; frontend `BRANCH_ADMIN` maps to
`branch_admin`. Super Admin remains in the separate Phase 17 platform boundary.
Parent, teacher, student, and unsupported frontend roles receive no current
organization-management routes.

## 6–9. DTOs, envelopes, and status codes

School DTO:

```text
id:int, name:string, address:string, phone:string, email:string,
upi_id:string, is_active:boolean, created_at:timestamp
```

Branch DTO:

```text
id:int, school:int, name:string, code:string, address:string, phone:string,
email:string, is_active:boolean, created_at:timestamp
```

Successful entity responses use `{success:true,school|branch:DTO}`. The branch
list uses `{success:true,branches:DTO[]}`. Creates return 201; GET, PATCH, and
status actions return 200. View-built errors use
`{success:false,message,error_code,errors?}`; DRF authentication and permission
failures may instead use `{detail}`. Serializer errors are normally HTTP 400.

## 10–11. Writable and read-only fields

School PATCH permits `name`, `address`, `phone`, `email`, and `upi_id`.
`id`, `is_active`, and `created_at` are read-only.

Branch create/PATCH permits `name`, `address`, `phone`, and `email`. `id`,
`school`, `code`, `is_active`, and `created_at` are read-only. Empty optional
strings are accepted, allowing supported contact fields to be cleared.

The frontend maps `upi_id` to `upiId`, integer IDs to validated string IDs, and
boolean `is_active` to `ACTIVE`/`INACTIVE`. Non-boolean status values and
malformed nested data fail at the mapper boundary.

## 12–14. Creation, Main Branch, and Session interaction

`POST /branches/` derives School from `request.user.school`; clients neither
send nor select School ownership. Django generates code as
`SCH{school.id}-B{current_branch_count + 1}`. There is no explicit duplicate
name check, maximum-branch rule, transaction wrapper, or idempotency key. A
race or deletion followed by creation can collide with the globally unique
generated code and may surface as an unhandled server error.

The automatically created `Main Branch` has a `-MAIN` code, but the Branch
model/serializer has no `is_main` field. The current branch endpoints contain
no Main Branch protection. Phase 18 does not infer `is_main` from a name/code
and does not claim such protection.

Branch creation does not create or change a Session. The default Session is
created only as part of new-school onboarding. Academics remain mock in Phase
18 and no mock Session ID is sent to live organization endpoints.

## 15–18. Status, queries, and pagination

Status is the boolean field `is_active`; the dedicated request is exactly
`{is_active:boolean}`. Both activation and deactivation are accepted. The view
uses Python `bool(value)` instead of serializer validation, so clients must send
a real JSON boolean. The frontend does so.

Django does not prevent deactivation of the Main Branch or last active Branch,
does not revoke JWTs, and does not update related Users or records. DELETE is
never used as deactivation.

The branch list reads no search, status, ordering, pagination, page, page-size,
School-selection, or Branch-selection query parameters. School Admin receives
all branches in the authenticated School using queryset/default database order.
Other roles receive only `request.user.branch_id`.

Phase 18 performs debounced search and status filtering locally over the live
unpaginated array and labels it client-side. The mapper can defensively accept
a future DRF `count/next/previous/results` envelope, but the client does not
request or invent pages or totals. The current unbounded response is a
large-dataset risk.

## 19–20. Validation and permission errors

Invalid serializer data returns HTTP 400 with `VALIDATION_ERROR`, `message`,
and field arrays inside `errors`. The shared normalizer maps fields near forms.
DRF returns 401 for invalid/expired authentication and 403 for permission-class
denials. View-level role denials use 403 `PERMISSION_DENIED`. Missing own School
returns 404 `NO_SCHOOL`; missing or cross-tenant Branch returns 404 `NOT_FOUND`.
A Branch Admin deep-linking to another existing same-School Branch receives
403 from the detail view, while a cross-School ID is concealed as 404.

## 21–25. Scope and role behavior

- `/school/` always uses `request.user.school`; there is no School ID input.
- Every branch detail/status lookup includes `school=request.user.school`.
- School Admin can view/update its current School and list/create/view/update/
  change status for its School's Branches.
- Branch Admin can view `/school/`, list only its assigned Branch, and GET only
  that Branch detail. It cannot update School, create Branches, edit Branches,
  change status, or delete.
- A Branch Admin whose `/auth/me/` has no Branch assignment cannot be safely
  scoped. The frontend blocks the branch workspace instead of fabricating one.
- Super Admin ordinarily has no `school` and would receive `NO_SCHOOL` from
  current-school routes. Frontend navigation keeps it entirely in `/schools/`.
- Backend authentication/permissions do not globally check School or Branch
  `is_active`. Existing JWTs can continue to reach endpoints. The frontend
  presents inactive live records as blocked/unavailable for mutations and
  selection, while retaining logout, but this is UX—not tenant security.

## 26. Frontend mappings

The live current-school domain contains only the confirmed School fields. The
live Branch domain contains only confirmed Branch fields. Legacy mock structured
addresses, website/logo, alternate phone, branch counts, active Session,
School Admin summary, `updatedAt`, and `isMainBranch` are not fabricated. Branch
counts displayed by current-school screens are derived only from the successful
live branch list.

Phase 16 onboarding and Phase 18 share the same live current-school repository,
response parser, and PATCH mapping. Onboarding still updates `/auth/me/` first,
then `/school/`, retains its partial-failure retry behavior, and refetches the
authenticated identity.

## 27–29. Unsupported operations, mismatches, risks, and blockers

- The old frontend contract proposed nested `/schools/{id}/branches`, `PUT`,
  structured addresses, caller-supplied branch codes, `is_main`, last-active
  protection, server filtering, and pagination. None match Django.
- Postman covers current School and branch GET/POST/PATCH/status operations but
  omits the implemented branch DELETE. The Phase 15 audit correctly identifies
  the implemented routes and unpaginated envelopes.
- Hard delete is implemented but excluded because it is destructive and a
  Phase 18 non-goal.
- Generated branch codes can collide after deletion/concurrent creation.
- Branch names are not unique and mutations have no idempotency key.
- Active School/Branch flags are not globally enforced for existing JWTs.
- Branch Admin scope depends on `/auth/me/.branch`; there is no separate
  assignment endpoint in Phase 18.
- Lists are unbounded and server-side search/filter/order are unavailable.
- The configured development backend allows only loopback hosts, while the
  release APK blocks cleartext traffic. A real device smoke test requires an
  explicitly authorized, reachable HTTPS deployment and OTP access.
