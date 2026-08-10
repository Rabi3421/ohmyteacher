import {
  BACKEND_STUDENT_STATUSES,
  type CurrentStudent,
  type CurrentStudentAdmissionInput,
  type CurrentStudentUpdateInput,
} from '../../models/currentStudent';
import { ApiClientError } from '../api/apiError';
import type {
  CurrentStudentAdmissionRequestDto,
  CurrentStudentDto,
} from './currentStudentDtos';

type RecordValue = Record<string, unknown>;

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_STUDENT_RESPONSE',
    kind: 'server',
    message,
  });
}

function invalid(message: string, field: string): never {
  throw new ApiClientError({
    code: 'INVALID_STUDENT_INPUT',
    fieldErrors: { [field]: message },
    kind: 'validation',
    message,
    status: 400,
  });
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveId(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

export function studentRequestId(value: string, field: string): number {
  if (!/^[1-9]\d*$/.test(value)) invalid(`${field} is invalid.`, field);
  return Number(value);
}

function text(value: unknown, field: string, allowBlank = false): string {
  if (typeof value !== 'string' || (!allowBlank && value.trim().length === 0)) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

function date(value: unknown, field: string): string {
  const result = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) malformed(`The server returned an invalid ${field}.`);
  return result;
}

function timestamp(value: unknown): string {
  const result = text(value, 'student creation date');
  if (Number.isNaN(Date.parse(result))) malformed('The server returned an invalid student creation date.');
  return result;
}

function envelope(value: unknown, key: string): unknown {
  if (!isRecord(value) || value.success !== true || !(key in value)) {
    malformed(`The server returned an invalid student ${key} response.`);
  }
  return value[key];
}

function readStudent(value: unknown): CurrentStudentDto {
  if (!isRecord(value)) malformed('The server returned invalid student details.');
  const status = text(value.status, 'student status');
  if (!BACKEND_STUDENT_STATUSES.includes(status as never)) {
    malformed('The server returned an unknown student status.');
  }
  if (value.date_of_birth !== null && typeof value.date_of_birth !== 'string') {
    malformed('The server returned an invalid date of birth.');
  }
  return {
    address: text(value.address, 'address', true),
    admission_date: date(value.admission_date, 'admission date'),
    admission_number: text(value.admission_number, 'admission number'),
    branch: positiveId(value.branch, 'branch ID'),
    created_at: timestamp(value.created_at),
    date_of_birth: value.date_of_birth === null ? null : date(value.date_of_birth, 'date of birth'),
    gender: text(value.gender, 'gender', true),
    id: positiveId(value.id, 'student ID'),
    name: text(value.name, 'student name'),
    parent_email: text(value.parent_email, 'parent email', true),
    parent_name: text(value.parent_name, 'parent name', true),
    parent_phone_number: text(value.parent_phone_number, 'parent phone number'),
    roll_number: text(value.roll_number, 'roll number', true),
    school_class: positiveId(value.school_class, 'class ID'),
    section: positiveId(value.section, 'section ID'),
    status,
  };
}

function mapStudent(dto: CurrentStudentDto): CurrentStudent {
  return {
    address: dto.address,
    admissionDate: dto.admission_date,
    admissionNumber: dto.admission_number,
    branchId: String(dto.branch),
    classId: String(dto.school_class),
    createdAt: dto.created_at,
    dateOfBirth: dto.date_of_birth,
    gender: dto.gender,
    id: String(dto.id),
    name: dto.name,
    parentEmail: dto.parent_email,
    parentName: dto.parent_name,
    parentPhoneNumber: dto.parent_phone_number,
    rollNumber: dto.roll_number,
    sectionId: String(dto.section),
    status: dto.status as CurrentStudent['status'],
  };
}

export function parseCurrentStudentList(value: unknown): CurrentStudent[] {
  const items = envelope(value, 'students');
  if (!Array.isArray(items)) malformed('The server returned an invalid student list.');
  return items.map(readStudent).map(mapStudent);
}

export function parseCurrentStudent(value: unknown): CurrentStudent {
  return mapStudent(readStudent(envelope(value, 'student')));
}

export function parseMyChildren(value: unknown): CurrentStudent[] {
  return parseCurrentStudentList(value);
}

export function mapAdmissionRequest(
  input: CurrentStudentAdmissionInput,
): CurrentStudentAdmissionRequestDto {
  return {
    address: input.address?.trim() || undefined,
    date_of_birth: input.dateOfBirth || null,
    gender: input.gender?.trim() || undefined,
    name: input.name.trim(),
    parent_email: input.parentEmail?.trim() || undefined,
    parent_name: input.parentName?.trim() || undefined,
    parent_phone_number: input.parentPhoneNumber.trim(),
    roll_number: input.rollNumber?.trim() || undefined,
    school_class: studentRequestId(input.classId, 'classId'),
    section: studentRequestId(input.sectionId, 'sectionId'),
  };
}

export function mapStudentUpdateRequest(input: CurrentStudentUpdateInput): RecordValue {
  const request: RecordValue = {};
  if (input.classId !== undefined) request.school_class = studentRequestId(input.classId, 'classId');
  if (input.sectionId !== undefined) request.section = studentRequestId(input.sectionId, 'sectionId');
  if (input.rollNumber !== undefined) request.roll_number = input.rollNumber.trim();
  if (input.name !== undefined) request.name = input.name.trim();
  if (input.dateOfBirth !== undefined) request.date_of_birth = input.dateOfBirth || null;
  if (input.gender !== undefined) request.gender = input.gender.trim();
  if (input.parentName !== undefined) request.parent_name = input.parentName.trim();
  if (input.parentEmail !== undefined) request.parent_email = input.parentEmail.trim();
  if (input.address !== undefined) request.address = input.address.trim();
  return request;
}

const STUDENT_FIELD_MAP: Record<string, string> = {
  address: 'address',
  date_of_birth: 'dateOfBirth',
  gender: 'gender',
  name: 'name',
  parent_email: 'parentEmail',
  parent_name: 'parentName',
  parent_phone_number: 'parentPhoneNumber',
  roll_number: 'rollNumber',
  school_class: 'classId',
  section: 'sectionId',
};

export function mapCurrentStudentFieldErrors(
  errors?: Record<string, string>,
): Record<string, string> | undefined {
  if (!errors) return undefined;
  return Object.fromEntries(
    Object.entries(errors).map(([key, message]) => [STUDENT_FIELD_MAP[key] ?? key, message]),
  );
}
