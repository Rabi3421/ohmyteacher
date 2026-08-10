# Phase 21 Student, Guardian, and Admission Contract

Source-audited against the Django URL configuration, views, serializers, models, permissions, Postman collection, and Phase 18–20 frontend contracts on 2026-08-03. Django is authoritative. Examples use synthetic identifiers only.

## 1. Confirmed Student endpoints

`/students/`, `/students/{student_id}/`, `/students/{student_id}/status/`, and `/my-children/` are confirmed. The fee ledger URL is outside Phase 21.

## 2. Confirmed Guardian endpoints

There are no Guardian resources or guardian CRUD URLs. Parent contact fields are embedded on `Student`; the login relationship is an internal `StudentLink`.

## 3. Confirmed Admission endpoints

Admission is `POST /students/`. There is no `/admissions/` resource. The request atomically creates the Student and links a new or reusable phone account.

## 4. Confirmed Enrolment endpoints

There is no Enrolment model or URL. Current placement is embedded as `Student.school_class` and `Student.section`; session and branch are reached through the selected Class.

## 5. Confirmed transfer/withdrawal/pass-out endpoints

No dedicated transfer, withdrawal, or pass-out endpoints exist. Only the generic status endpoint exists. `transferred`, `dropped`, and `passed_out` are exact statuses, not workflows.

## 6. Methods and paths

- `GET /students/`
- `POST /students/`
- `GET /students/{positive_integer}/`
- `PATCH /students/{positive_integer}/`
- `DELETE /students/{positive_integer}/` (confirmed but deliberately not exposed)
- `PATCH /students/{positive_integer}/status/`
- `GET /my-children/`

`PUT`, bulk admission, promotion, nested guardian operations, and lifecycle action URLs are absent.

## 7. Authentication requirements

Every URL requires JWT authentication. The shared client adds the bearer token, performs the existing single-flight refresh flow, and never logs it.

## 8. Role permissions

School Admin (`admin`) can read/write across the authenticated School's Branches. Branch Admin can read/write only its assigned Branch. Teacher has Branch-scoped list/detail reads in Django but is not a supported frontend login role. Backend `student` can use only `/my-children/`. Super Admin has no School Student scope.

## 9. Request DTOs

Admission accepts `school_class`, `section`, required `name`, optional `roll_number`, nullable `date_of_birth`, optional free-text `gender`, optional `parent_name`, required normalized `parent_phone_number`, optional `parent_email`, and optional `address`. Student PATCH accepts those profile/placement fields except Branch, admission number/date, and status. The frontend deliberately omits parent phone from PATCH because Django does not relink `StudentLink`. Status PATCH accepts `{ "status": <exact status> }`.

## 10. Response DTOs

Student fields are `id`, `branch`, `school_class`, `section`, `admission_number`, `roll_number`, `name`, `date_of_birth`, `gender`, `admission_date`, `status`, `parent_name`, `parent_phone_number`, `parent_email`, `address`, and `created_at`.

## 11. Response envelopes

List and My Children use `{ success: true, students: [...] }`. Detail, admission, edit, and status use `{ success: true, student: {...} }`. The frontend rejects malformed success envelopes and unknown statuses.

## 12. Success status codes

List/detail/My Children return `200`; admission returns `201`; PATCH/status return `200`; delete returns the Django deletion success response. No Phase 21 live deletion is issued.

## 13. Student/User/Profile distinctions

`Student` is the academic record. `User` is the OTP identity. There is no separate StudentProfile model. A backend `student`-role User created during admission represents the phone-based parent login, not a child-owned account.

## 14. Guardian/User distinctions

There is no Guardian model. Parent name/phone/email are Student columns. `StudentLink` relates a User to a Student; it is not serialized and has no public CRUD endpoint.

## 15. Admission/Enrolment distinctions

Admission is an aggregate transaction on Student creation. Enrolment is not independently represented or historically versioned; Class and Section are current Student fields.

## 16. Writable fields

On admission: Class, Section, roll number, name, date of birth, gender, parent name/phone/email, and address. On edit: Class/Section within the immutable Branch plus the same profile/contact fields. The Phase 21 edit UI exposes the safe profile subset and holds parent phone/placement fixed.

## 17. Read-only fields

ID, Branch, admission number, admission date, status, and creation timestamp are serializer read-only. Status changes only via the status URL. The frontend never sends School or Branch ownership.

## 18. School/Branch/Session/Class/Section ownership

The authenticated User supplies School scope. Admission infers Branch from Class, requires the Class Branch to be accessible, and requires Section to belong to Class. Session is embedded on Class, not supplied to Student. Edit cannot change Student Branch and Section must belong to the replacement/current Class. Django does not reject inactive Branch/Class/Section/Session during admission.

## 19. Admission-number behaviour

Clients cannot supply it. Django generates `ADM-{admission year}-{school-year count + 1, four digits}` using all Branches in the School. The database field is globally unique. Count-based generation has deletion/concurrency collision risk and no explicit collision recovery.

## 20. Roll-number behaviour

Roll number is optional free text. There is no model uniqueness constraint or serializer rule per Section/Class/Session/Branch/School.

## 21. User-account provisioning

Admission normalizes the parent phone. It creates `User(role=student, school=class.branch.school, branch=class.branch)` when absent. An existing `student`-role User in the same School is reused; another role or another School is rejected. It then creates `StudentLink(user, student)`.

## 22. OTP/login behaviour

Admission does not send an OTP or return credentials. The linked User later signs in through the ordinary phone OTP flow. Frontend authentication maps backend `student` to its existing Parent navigator because `/my-children/` is the implemented semantics; no Django Parent role is invented.

## 23. Guardian creation/reuse/linking

The only reusable entity is the phone User. One User can link to multiple Students (siblings). `StudentLink.student` is one-to-one, so one Student can have only one login link. Multiple guardians, relationship types, primary/fee/emergency flags, and guardian access toggles are unsupported.

## 24. Status and lifecycle

Exact values: `active`, `inactive`, `transferred`, `dropped`, `passed_out`. The status URL accepts any value-to-value transition from this set. It stores no reason, effective date, actor history, or transition history.

## 25. Transfer behaviour

There is no transfer operation. Setting `transferred` changes only status. Student PATCH can change Class/Section only inside the immutable Branch, so it cannot perform a Branch transfer or preserve placement history.

## 26. Withdrawal behaviour

There is no `withdrawn` value or endpoint. The closest backend value is `dropped`; it is a status only.

## 27. Pass-out behaviour

`passed_out` is available through the generic status endpoint. It performs no completion, result, certificate, or enrolment-history workflow.

## 28. Deletion and dependency protection

The detail view exposes unguarded hard `DELETE`. Current models reference Student with cascading deletion, including StudentLink, fees, invoices, payments, receipts, reminders, exam attempts, marks, and results. A stale view comment claims no dependencies. The frontend exposes no delete action.

## 29. Uniqueness constraints

Admission number is globally unique. StudentLink allows one link per Student. Parent phone is unique at User level through the User identity contract. Roll number has no uniqueness constraint. No distinct guardian identity exists.

## 30. Supported query parameters

`GET /students/` supports `q`, `school_class`, and `status`. `q` searches name, admission number, and parent phone. Branch, session, section, ordering, page, and page-size parameters are not implemented.

## 31. Pagination

Student list and My Children are unpaginated arrays. The frontend does not fabricate page metadata or send pagination parameters.

## 32. Search/filter/order

Search and exact Class/status filters are server-side. Results use model/default database order; no ordering contract exists. The UI does not promise roll-number search because Django does not search it.

## 33. Validation-error formats

DRF errors are normalized by the shared API client. Known snake-case fields map to frontend form names. Cross-School phone reuse may return `PHONE_SCHOOL_MISMATCH`; role conflicts and Class/Section mismatches return validation responses. Failed submissions retain form state and do not fabricate success.

## 34. Permission-error formats

Backend `401`, `403`, and `404` remain authoritative. The client normalizes them, refreshes only the authenticated `401` path, clears stale session state on terminal expiry, and does not fall back to mock records.

## 35. School Admin capabilities

School Admin can list/detail Students in every Branch of its School, admit through any accessible Class, edit within the Student's Branch, and change any confirmed status. Hard delete is intentionally unavailable in the app.

## 36. Branch Admin capabilities

Branch Admin can list/detail/admit/edit/change status only in its assigned Branch. Missing Branch scope yields no accessible Student scope. Route parameters cannot expand this authority.

## 37. Student self-service capabilities

Backend `student` can call `GET /my-children/`, returning all linked Students. It cannot use `/students/` for self detail because normal Student scope resolution is empty. The frontend makes My Children and child detail read-only and checks the mapped Parent membership.

## 38. Super Admin behaviour

Super Admin is platform-only and receives no Student School scope from these Django views. The frontend does not add Student management to that role.

## 39. Inactive-context enforcement

Frontend memberships must be active. Academic selectors present active Branches, Classes, and Sections. Django admission/edit does not itself enforce active related records, and status values do not automatically disable the linked User. This remains a backend risk.

## 40. Frontend/backend model mapping

The Phase 21 `CurrentStudent` model maps numeric Django IDs to stable strings without prefixes. It stores only confirmed fields. Live Screens -> CurrentStudent Store -> CurrentStudent Service -> strict DTO mapper -> shared API client. The rich Phase 6 Student/Guardian/Enrolment model remains isolated as `student-demo-identity` for later mock modules.

## 41. Unsupported frontend operations

Separate guardian CRUD, multiple guardians, guardian relationship/access flags, student-owned app access, enrolment history, promotion, Branch transfer, transfer reasons, withdrawal workflow, pass-out workflow, bulk admission, hard delete, document upload, medical fields, and staged admission resources are unavailable live. The primary live detail screen does not link to them.

## 42. Django/Postman/frontend mismatches

The Postman collection and stale view comment understate the current cascading delete dependencies. The previous frontend assumed multiple guardians, historical enrolments, `WITHDRAWN`, Student-owned accounts, and separate access controls. Django instead has embedded parent fields, one StudentLink, `dropped`, no history, and a backend `student` User acting as parent login.

## 43. Security risks and blockers

No reachable stable HTTPS/authorized OTP environment was available, so no live Student data was read or mutated. Release cleartext remains disabled. Main risks are unguarded cascading hard delete, count-based admission-number races, unrestricted lifecycle transitions, parent-phone PATCH desynchronization, missing inactive-related validation, full Student fields returned by My Children, and Teacher read access not represented in frontend authentication. API diagnostics redact names, phone numbers, emails, addresses, dates of birth, admission numbers, roll numbers, OTPs, and tokens.
