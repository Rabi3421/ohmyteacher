import type {
  AcademicClass,
  AcademicContext,
  ClassSubjectAssignment,
  CreateClassInput,
  CreateSectionInput,
  CreateSubjectInput,
  Section,
  Subject,
  UpdateClassInput,
  UpdateSectionInput,
  UpdateSubjectInput,
} from '../../models/academic';
import type {
  AcademicSession,
  CreateAcademicSessionInput,
  UpdateAcademicSessionInput,
} from '../../models/organization';
import { ApiClientError } from '../api/apiError';
import type {
  AcademicSessionDto,
  CreateClassRequestDto,
  CreateSectionRequestDto,
  CreateSessionRequestDto,
  CreateSubjectRequestDto,
  CreateTeacherAssignmentRequestDto,
  SchoolClassDto,
  SectionDto,
  SubjectDto,
  TeacherAssignmentDto,
} from './academicDtos';

type RecordValue = Record<string, unknown>;

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_ACADEMIC_RESPONSE',
    kind: 'server',
    message,
  });
}

function invalid(message: string, field?: string): never {
  throw new ApiClientError({
    code: 'INVALID_ACADEMIC_INPUT',
    fieldErrors: field ? { [field]: message } : undefined,
    kind: 'validation',
    message,
    status: 400,
  });
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function id(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

export function requestId(value: string, field: string): number {
  if (!/^[1-9]\d*$/.test(value)) invalid(`${field} is invalid.`, field);
  return Number(value);
}

function text(value: unknown, field: string, allowBlank = false): string {
  if (typeof value !== 'string' || (!allowBlank && value.trim().length === 0)) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

function timestamp(value: unknown, field: string): string {
  const result = text(value, field);
  if (Number.isNaN(Date.parse(result))) malformed(`The server returned an invalid ${field}.`);
  return result;
}

function date(value: unknown, field: string): string {
  const result = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return result;
}

function bool(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') malformed(`The server returned an invalid ${field}.`);
  return value;
}

function envelope(value: unknown, key: string): unknown {
  if (!isRecord(value) || value.success !== true || !(key in value)) {
    malformed(`The server returned an invalid academic ${key} response.`);
  }
  return value[key];
}

function listEnvelope(value: unknown, key: string): unknown[] {
  const items = envelope(value, key);
  if (!Array.isArray(items)) malformed(`The server returned an invalid ${key} list.`);
  return items;
}

function readSession(value: unknown): AcademicSessionDto {
  if (!isRecord(value)) malformed('The server returned invalid session details.');
  return {
    created_at: timestamp(value.created_at, 'session creation date'),
    end_date: date(value.end_date, 'session end date'),
    id: id(value.id, 'session ID'),
    is_active: bool(value.is_active, 'session status'),
    name: text(value.name, 'session name'),
    school: id(value.school, 'session school ID'),
    start_date: date(value.start_date, 'session start date'),
  };
}

function readClass(value: unknown): SchoolClassDto {
  if (!isRecord(value)) malformed('The server returned invalid class details.');
  if (typeof value.display_order !== 'number' || !Number.isSafeInteger(value.display_order) || value.display_order < 0) {
    malformed('The server returned an invalid class display order.');
  }
  return {
    branch: id(value.branch, 'class branch ID'),
    created_at: timestamp(value.created_at, 'class creation date'),
    display_order: value.display_order,
    id: id(value.id, 'class ID'),
    is_active: bool(value.is_active, 'class status'),
    name: text(value.name, 'class name'),
    session: id(value.session, 'class session ID'),
  };
}

function readSection(value: unknown): SectionDto {
  if (!isRecord(value)) malformed('The server returned invalid section details.');
  if (value.capacity !== null && (typeof value.capacity !== 'number' || !Number.isSafeInteger(value.capacity) || value.capacity <= 0)) {
    malformed('The server returned an invalid section capacity.');
  }
  return {
    capacity: value.capacity as number | null,
    created_at: timestamp(value.created_at, 'section creation date'),
    id: id(value.id, 'section ID'),
    is_active: bool(value.is_active, 'section status'),
    name: text(value.name, 'section name'),
    school_class: id(value.school_class, 'section class ID'),
  };
}

function readSubject(value: unknown): SubjectDto {
  if (!isRecord(value)) malformed('The server returned invalid subject details.');
  return {
    code: text(value.code, 'subject code', true),
    created_at: timestamp(value.created_at, 'subject creation date'),
    id: id(value.id, 'subject ID'),
    is_active: bool(value.is_active, 'subject status'),
    name: text(value.name, 'subject name'),
    school: id(value.school, 'subject school ID'),
  };
}

function readAssignment(value: unknown): TeacherAssignmentDto {
  if (!isRecord(value)) malformed('The server returned invalid teacher assignment details.');
  return {
    created_at: timestamp(value.created_at, 'assignment creation date'),
    id: id(value.id, 'assignment ID'),
    school_class: id(value.school_class, 'assignment class ID'),
    subject: id(value.subject, 'assignment subject ID'),
    teacher: id(value.teacher, 'assignment teacher ID'),
  };
}

export function parseSessionList(value: unknown): AcademicSession[] {
  return listEnvelope(value, 'sessions').map(item => mapSession(readSession(item)));
}

export function parseSession(value: unknown): AcademicSession {
  return mapSession(readSession(envelope(value, 'session')));
}

function mapSession(dto: AcademicSessionDto): AcademicSession {
  return {
    createdAt: dto.created_at,
    endDate: dto.end_date,
    id: String(dto.id),
    name: dto.name,
    schoolId: String(dto.school),
    startDate: dto.start_date,
    status: dto.is_active ? 'ACTIVE' : 'UPCOMING',
    updatedAt: dto.created_at,
  };
}

export function parseClassList(value: unknown, context: AcademicContext): AcademicClass[] {
  return listEnvelope(value, 'classes').map(readClass).map(dto => mapClass(dto, context));
}

export function parseClass(value: unknown, context: AcademicContext): AcademicClass {
  return mapClass(readClass(envelope(value, 'class')), context);
}

function mapClass(dto: SchoolClassDto, context: AcademicContext): AcademicClass {
  return {
    academicSessionId: String(dto.session),
    activeSectionCount: 0,
    assignedSubjectCount: 0,
    branchId: String(dto.branch),
    code: '',
    createdAt: dto.created_at,
    displayOrder: dto.display_order,
    id: String(dto.id),
    name: dto.name,
    schoolId: context.schoolId,
    sectionCount: 0,
    status: dto.is_active ? 'ACTIVE' : 'INACTIVE',
    updatedAt: dto.created_at,
  };
}

export function parseSectionList(value: unknown): Section[] {
  return listEnvelope(value, 'sections').map(readSection).map(mapSection);
}

export function parseSection(value: unknown): Section {
  return mapSection(readSection(envelope(value, 'section')));
}

function mapSection(dto: SectionDto): Section {
  return {
    capacity: dto.capacity ?? undefined,
    classId: String(dto.school_class),
    code: '',
    createdAt: dto.created_at,
    displayOrder: dto.id,
    id: String(dto.id),
    name: dto.name,
    status: dto.is_active ? 'ACTIVE' : 'INACTIVE',
    updatedAt: dto.created_at,
  };
}

export function parseSubjectList(value: unknown): Subject[] {
  return listEnvelope(value, 'subjects').map(readSubject).map(mapSubject);
}

export function parseSubject(value: unknown): Subject {
  return mapSubject(readSubject(envelope(value, 'subject')));
}

function mapSubject(dto: SubjectDto): Subject {
  return {
    activeAssignmentCount: 0,
    code: dto.code,
    createdAt: dto.created_at,
    displayOrder: dto.id,
    id: String(dto.id),
    name: dto.name,
    schoolId: String(dto.school),
    status: dto.is_active ? 'ACTIVE' : 'INACTIVE',
    // Compatibility-only value for the legacy mock domain. Live screens do
    // not render/filter it because Django has no Subject type field.
    type: 'CORE',
    updatedAt: dto.created_at,
  };
}

export function parseAssignmentList(value: unknown, context: AcademicContext): ClassSubjectAssignment[] {
  return listEnvelope(value, 'assignments').map(readAssignment).map(dto => ({
    academicSessionId: context.academicSessionId,
    branchId: context.branchId,
    classId: String(dto.school_class),
    createdAt: dto.created_at,
    displayOrder: dto.id,
    id: String(dto.id),
    schoolId: context.schoolId,
    status: 'ACTIVE',
    subjectId: String(dto.subject),
    teacherId: String(dto.teacher),
    updatedAt: dto.created_at,
  }));
}

export function parseAssignmentSubjectIds(value: unknown): string[] {
  return listEnvelope(value, 'assignments').map(readAssignment).map(dto => String(dto.subject));
}

export const mapSessionRequest = (input: CreateAcademicSessionInput | UpdateAcademicSessionInput): CreateSessionRequestDto => ({
  end_date: input.endDate,
  name: input.name.trim(),
  start_date: input.startDate,
});

export const mapCreateClassRequest = (context: AcademicContext, input: CreateClassInput): CreateClassRequestDto => ({
  branch: requestId(context.branchId, 'branchId'),
  display_order: input.displayOrder,
  name: input.name.trim(),
  session: requestId(context.academicSessionId, 'academicSessionId'),
});

export const mapUpdateClassRequest = (input: UpdateClassInput) => ({ display_order: input.displayOrder, name: input.name.trim() });

export const mapCreateSectionRequest = (classId: string, input: CreateSectionInput): CreateSectionRequestDto => ({
  capacity: input.capacity,
  name: input.name.trim(),
  school_class: requestId(classId, 'classId'),
});

export const mapUpdateSectionRequest = (input: UpdateSectionInput) => ({ capacity: input.capacity ?? null, name: input.name.trim() });

export const mapSubjectRequest = (input: CreateSubjectInput | UpdateSubjectInput): CreateSubjectRequestDto => ({ code: input.code.trim(), name: input.name.trim() });

export const mapAssignmentRequest = (classId: string, subjectId: string, teacherId: string): CreateTeacherAssignmentRequestDto => ({
  school_class: requestId(classId, 'classId'),
  subject: requestId(subjectId, 'subjectId'),
  teacher: requestId(teacherId, 'teacherId'),
});

const FIELD_NAMES: Record<string, string> = {
  branch: 'branchId',
  display_order: 'displayOrder',
  end_date: 'endDate',
  school_class: 'classId',
  session: 'academicSessionId',
  start_date: 'startDate',
  subject: 'subjectId',
  teacher: 'teacherId',
};

export function mapAcademicFieldErrors(
  errors?: Record<string, string>,
): Record<string, string> | undefined {
  if (!errors) return undefined;
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [FIELD_NAMES[field] ?? field, message]),
  );
}
