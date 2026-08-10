# Phase 20 live academic setup contract

Source of truth: Django URLs, models, serializers, views and permissions in `ohmyteacher-server`, checked 2026-08-03. Postman agrees with the paths below. No credential or production data was used.

## 1–6. Confirmed endpoints, methods and storage

All paths are relative to `/ohmyteacher/api/v0` and require JWT authentication.

| Boundary | Methods and paths | Success envelope/status |
|---|---|---|
| Session | `GET, POST /sessions/`; `GET, PATCH, DELETE /sessions/{id}/`; `PATCH /sessions/{id}/activate/` | list `{success,sessions}` 200; item `{success,session}` 200; create 201; delete `{success,message}` 200 |
| Class | `GET, POST /classes/`; `GET, PATCH, DELETE /classes/{id}/`; `PATCH /classes/{id}/status/` | list `{success,classes}` 200; item `{success,class}` 200; create 201; status 200; delete 200 |
| Section | `GET, POST /sections/`; `GET, PATCH, DELETE /sections/{id}/`; `PATCH /sections/{id}/status/` | list `{success,sections}` 200; item `{success,section}` 200; create 201; status/delete 200 |
| Subject | `GET, POST /subjects/`; `GET, PATCH, DELETE /subjects/{id}/`; `PATCH /subjects/{id}/status/` | list `{success,subjects}` 200; item `{success,subject}` 200; create 201; status/delete 200 |
| Teacher assignment | `GET, POST /class-subject-teacher/`; `DELETE /class-subject-teacher/{id}/` | list `{success,assignments}` 200; create `{success,assignment}` 201; unassign `{success,message}` 200 |

Teacher assignment is a separate `ClassSubjectTeacher` row, not a field on Class, Section or Subject. There is no assignment detail, PATCH, status, effective-date or bulk-replace endpoint.

## 7–14. Authentication, roles, DTOs and field mutability

- Every endpoint requires an authenticated user. `IsAdmin` means Django role `admin` (frontend `SCHOOL_ADMIN`), not `super_admin`.
- Session DTO: `id`, `school`, `name`, `start_date`, `end_date`, `is_active`, `created_at`. Create/PATCH accepts only name and dates. `school`, `is_active`, IDs and timestamps are read-only. Activation has an empty body.
- Class DTO: `id`, `branch`, `session`, `name`, `display_order`, `is_active`, `created_at`. Create accepts branch, optional session, name and display order. Phase 20 sends session explicitly. PATCH accepts only name/display order. Branch/session are immutable. Status accepts `{is_active:boolean}`.
- Section DTO: `id`, `school_class`, `name`, nullable `capacity`, `is_active`, `created_at`. Create accepts class/name/capacity; PATCH only name/capacity. Parent is immutable. Status accepts `{is_active:boolean}`.
- Subject DTO: `id`, `school`, `name`, `code`, `is_active`, `created_at`. Create/PATCH accepts name/code; school is derived and immutable. Status accepts `{is_active:boolean}`.
- Assignment DTO: `id`, `school_class`, `subject`, `teacher`, `created_at`. Create accepts the three foreign keys. All are immutable; changing a teacher is unassign then create.
- Django validation failures use `{success:false,message,errors?,error_code}`; the shared client normalizes 400/401/403/404/5xx without fallback.

## 15–20. Ownership, relationships and lifecycle

- Session is school-wide. Class belongs to exactly one Branch and Session. Section belongs only to a Class and inherits its Branch/Session transitively. Subject is school-wide and reusable across classes, branches and sessions.
- Assignment belongs to one Class, one school-wide Subject and one User teacher. It has no Section or explicit Session field; both scope through Class.
- Admin can see every branch in its school. Branch Admin and Teacher can see only their assigned branch. Sessions and subjects are scoped by `request.user.school`.
- Exactly one Session is made active by `/activate/`: inside a transaction, every active Session in the school is set false and the selected Session true. “Active” and “current” are the same backend concept.
- Creating a Session always creates it inactive. The frontend performs an explicit subsequent activation only when the user selected Active.
- Django exposes no Close state or close endpoint. Inactive Sessions map to frontend `UPCOMING`; the frontend does not claim that an inactive historic Session is semantically upcoming. This two-state backend is a known model limitation.
- Django does not make active Sessions immutable and permits editing their name/dates. It exposes no copy/promote operation.

## 21–28. Validation, eligibility, queries, pagination and ordering

- Session requires `start_date < end_date`. Names are max 20 and unique per School.
- Class name is max 50 and unique per Branch + Session + name. `display_order` is a non-negative positive-small-integer field; model ordering is `display_order,id`.
- Section name is max 10 and unique per Class + name. Capacity is null or a positive-small integer. No model ordering is declared.
- Subject name is max 100 and unique per School + name. Code is optional/max 20 and is not unique.
- Assignment is unique per Class + Subject, so only one teacher may hold a subject for a class. A teacher may have many other class/subject assignments. No Section assignment exists.
- The submitted Subject must belong to the requester’s School. The teacher must have the same `branch_id` as the Class. The model field limits choices to role `teacher`; Phase 20 additionally selects only Phase 19 live, active Teacher users in that Branch.
- `GET /classes/` supports optional `branch`; it does not support Session filtering, so Phase 20 filters the returned live rows by their explicit Session ID. `GET /sections/` and assignment GET support `school_class`. Other frontend search/status filters and paging are applied after server-scoped reads.
- Academic list endpoints are unpaginated. The frontend represents them with client-side pages. No server count/next/previous is inferred. Classes use backend ordering. Section/Subject stable display uses returned order/ID; name sorting is client-side where requested.

## 29–32. Deletion, dependency and error contracts

- Deletion is hard deletion. Phase 20 exposes no hard-delete UI.
- Session DELETE refuses `HAS_DEPENDENTS` when Classes exist. Class DELETE refuses when Sections or teacher assignments exist. Subject DELETE refuses when assignments exist. Section and assignment deletes can proceed directly inside authorized scope.
- Status changes do not enforce dependency protection: deactivating Class/Section/Subject retains dependencies. The UI states this accurately and blocks new assignment selection for inactive Classes/Subjects.
- Validation is normally 400 with `VALIDATION_ERROR`, `DUPLICATE_SESSION`, `DUPLICATE_CLASS`, `DUPLICATE_SECTION`, `DUPLICATE_SUBJECT`, `DUPLICATE_ASSIGNMENT`, `NO_ACTIVE_SESSION` or `HAS_DEPENDENTS`. Scope failures use 403 `PERMISSION_DENIED`; inaccessible/missing rows use 404 `NOT_FOUND`; missing school uses 404 `NO_SCHOOL`.

## 33–37. Role capabilities and inactive enforcement

- School Admin: read/create/edit/activate Sessions; read/create/edit/status Classes and Sections in any school Branch; read/create/edit/status Subjects; read/create/delete assignments.
- Branch Admin: read Sessions/Subjects; read/create/edit/status Classes and Sections only in its Branch; read/create/delete assignments only in its Branch. It cannot create/edit/activate Sessions or create/edit/status Subjects.
- Teacher: backend can read Sessions, its Branch Classes/Sections/assignments and school Subjects. It cannot mutate academic setup. The current frontend role model has no Teacher workspace role, so no new Teacher navigation was invented.
- Super Admin: has no School-bound academic access through these endpoints; it is not treated as School Admin.
- Frontend selection excludes inactive Branches and inactive Teachers, disables dependent creation/assignment for inactive Classes and excludes inactive Subjects from new assignments. Django itself does not consistently reject inactive School/Branch/User foreign-key context; backend authorization remains authoritative and this is a residual risk.

## 38–41. Mapping, unsupported operations, mismatches and risks

- Numeric backend IDs remain decimal strings in domain/navigation state and must match `/^[1-9]\d*$/` before live requests. Django booleans map to `ACTIVE/INACTIVE`; Session boolean maps to `ACTIVE/UPCOMING`. No ownership IDs are fabricated.
- Mock-only Class code, Section code/order, Subject short-name/type/order, Session Close and subject-only assignment controls are absent from the live UI. Hard delete, Session copy/close, Section assignment, bulk atomic assignment replacement and assignment editing are unsupported.
- The old frontend modeled assignments as selected Subjects without a teacher. Django requires Class + Subject + Teacher. The UI now shows eligible live Teachers and reconciles each changed pair using confirmed delete/create calls.
- Replacement is not backend-atomic: a failed create after a required delete can leave a subject temporarily unassigned. The service locks duplicate submissions, re-reads server state, validates live parents/teachers and surfaces the live error, but cannot provide transactional bulk replacement without backend support.
- Server lists have no pagination/cancellation contract; filtering can become expensive. Timestamps have no `updated_at`, so the frontend labels `created_at` honestly. Inactive Session history is ambiguous because Django stores only `is_active`.
- Later student, fee, collection, communication, examination, result, report-card, report and document repositories remain mock. The live academic repository never falls back to them; their mock fixtures remain installed and isolated.
