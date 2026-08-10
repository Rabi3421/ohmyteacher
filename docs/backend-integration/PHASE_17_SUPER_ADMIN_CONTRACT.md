# Phase 17 Super Admin Contract

Audit date: 2026-08-03  
Backend: Django 5.1.6 and DRF 3.15.2  
API prefix: `/ohmyteacher/api/v0`

This note records the implemented Django contract inspected in `urls.py`,
`views.py`, `serializers.py`, `models.py`, `permissions.py`, and the Postman
collection. Django remained read-only. No credentials or production data are
included.

## Permissions and errors

Every endpoint below uses `IsSuperAdmin`. The permission checks an authenticated
user whose backend role is exactly `super_admin`. Missing or invalid JWTs return
DRF `401` responses; authenticated non-Super-Admin callers receive DRF `403`
responses. A `403` is not a session-expiry signal and must not trigger logout.

View-built errors use `{success:false,message,error_code,errors?}`. Serializer
fields inside `errors` contain DRF message arrays. Authentication and permission
errors may instead use `{detail}`. The shared API client normalizes both shapes.

## Confirmed endpoints

| Method | Relative path | Request | Success |
|---|---|---|---|
| GET | `/platform/dashboard/` | None | 200 dashboard aggregate object |
| GET | `/schools/` | None | 200 `{success:true,schools:School[]}` |
| POST | `/schools/` | Creation DTO below | 201 `{success:true,school,admin}` |
| GET | `/schools/{positive_integer_id}/` | None | 200 `{success:true,school}` |
| PATCH | `/schools/{positive_integer_id}/` | Partial writable School fields | 200 `{success:true,school}` |
| PATCH | `/schools/{positive_integer_id}/status/` | `{is_active:boolean}` | 200 `{success:true,school}` |

`PUT` and `DELETE` are not allowed by these views. Dashboard date filters,
search, status filters, ordering, pagination, page number, and page size are not
implemented query parameters.

## Dashboard response

The response contains `success`, non-negative integer fields `total_schools`,
`active_schools`, `total_branches`, `total_students`, and `total_teachers`, plus
`this_month_collection` as a decimal string. Students and teachers count only
active records. Collection includes non-cancelled Payments in the server's
current calendar month. No trends, comparisons, chart series, or date selector
are returned.

## School DTO

`SchoolSerializer` returns:

- `id`: integer, read-only
- `name`: string, maximum 255
- `address`: string, maximum 255, blank allowed
- `phone`: string, maximum 15, blank allowed
- `email`: email string, blank allowed
- `upi_id`: string, maximum 100, blank allowed
- `is_active`: boolean, read-only in the general serializer
- `created_at`: timestamp, read-only

The frontend maps integer IDs to its string ID type, `upi_id` to `upiId`, and
`is_active` to `ACTIVE` or `INACTIVE`. Non-boolean/unknown status data is treated
as a malformed response, never as active.

## Listing, search, and pagination

`GET /schools/` returns every school ordered by descending `created_at`. The
backend ignores no documented search/filter query because none are read by the
view. Phase 17 therefore fetches the unpaginated array and applies debounced
name, phone, email, and address search plus active-status filtering locally.

The response adapter also accepts a defensive future DRF-style paginated
envelope (`count`, `next`, `previous`, `results`). It does not request or invent
pages. When metadata is present, the UI identifies that it is displaying only
the returned page. The current all-record response is a large-dataset risk.

## Platform school onboarding

The POST request is exactly:

```json
{
  "school_name": "School name",
  "admin_name": "Initial Admin name",
  "admin_phone_number": "10-digit Indian mobile"
}
```

All three fields are required. Phone input accepts ten digits, `91` plus ten
digits, or `+91` plus ten digits and is normalized by Django to `+91...`.
`USER_EXISTS` is returned with HTTP 400 if any User already has the Admin phone.

The view calls the same atomic helper as OTP self-onboarding. It creates one
School, Main Branch, default active Session, and an `admin` User with an unusable
password. No temporary password is created or returned. The response returns
only the School and Admin; Branch and Session DTOs are not returned. There is no
idempotency key, so frontend mutation locking is required to reduce duplicate
submission risk.

Creation does not accept school address, school phone, email, UPI ID, school
code, website, logo, or Admin email. Those mock-only creation fields are omitted
from the live form. Supported school profile fields can be added afterward using
PATCH.

## Editing and status transitions

The general School serializer permits partial PATCH of `name`, `address`,
`phone`, `email`, and `upi_id`. IDs, `is_active`, and `created_at` are not sent.
The frontend sends changed fields only and refetches authoritative detail.

Status accepts exactly the frontend-generated boolean `{is_active:true|false}`.
Both active-to-inactive suspension and inactive-to-active reinstatement are
supported. This is a soft flag; no school data is deleted and branch/class/user
flags are unchanged.

The backend converts the supplied status using Python `bool()`, so a malicious
string such as `"false"` would become true. Phase 17 always sends a JSON boolean,
but backend validation should eventually require a real BooleanField.

Suspension does not revoke already-issued JWTs, and coarse permission classes do
not globally check School/User/Branch active flags. The UI must not promise
immediate session invalidation.

## Unsupported platform functionality and mismatches

- No school code, branch/session/admin aggregate, logo, website, trend, or chart
  data is available from platform endpoints.
- No platform search, filter, ordering, pagination, bulk action, hard delete,
  export, or dashboard date-filter API exists.
- School detail does not return the initial Admin; it is shown only immediately
  after creation from the POST response.
- Duplicate school names are not rejected. Only duplicate User phone numbers are
  checked explicitly.
- Postman documents the implemented methods and bodies but includes no examples.
- The older mock domain expects structured addresses, school codes, branch and
  session summaries, Admin email, websites, and logos. Phase 17 uses a separate
  platform domain rather than fabricating those fields or enabling school-level
  organization APIs.

## Operational risks

- School listing is unbounded.
- POST has no idempotency key.
- Suspension is not globally enforced for existing tokens.
- The backend currently allows loopback hosts only, while Android release blocks
  cleartext traffic. Physical-device verification needs an approved HTTPS host
  and deployment configuration.
