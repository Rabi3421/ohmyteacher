import type {
  CreatePlatformSchoolInput,
  CreatePlatformSchoolResult,
  PlatformDashboard,
  PlatformInitialAdmin,
  PlatformSchool,
  PlatformSchoolCollection,
  PlatformSchoolStatus,
  UpdatePlatformSchoolInput,
} from '../../models/platform';
import { ApiClientError } from '../api/apiError';
import type {
  BackendPlatformAdminDto,
  BackendPlatformSchoolDto,
  CreatePlatformSchoolRequestDto,
  CreatePlatformSchoolResponseDto,
  PaginatedPlatformSchoolListResponseDto,
  PlatformDashboardResponseDto,
  PlatformSchoolResponseDto,
  UpdatePlatformSchoolRequestDto,
  UpdatePlatformSchoolStatusRequestDto,
} from './platformDtos';

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_PLATFORM_RESPONSE',
    kind: 'server',
    message,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonNegativeInteger(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    malformed(`The platform returned an invalid ${field} metric.`);
  }
  return value;
}

function readDecimal(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^\d+(?:\.\d+)?$/.test(value) ||
    !Number.isFinite(Number(value))
  ) {
    malformed('The platform returned an invalid collection metric.');
  }
  return value;
}

function readSchool(value: unknown): BackendPlatformSchoolDto {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    typeof value.name !== 'string' ||
    typeof value.address !== 'string' ||
    typeof value.phone !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.upi_id !== 'string' ||
    typeof value.is_active !== 'boolean' ||
    typeof value.created_at !== 'string'
  ) {
    malformed('The platform returned invalid school details.');
  }
  return {
    address: value.address,
    created_at: value.created_at,
    email: value.email,
    id: value.id,
    is_active: value.is_active,
    name: value.name,
    phone: value.phone,
    upi_id: value.upi_id,
  };
}

function readAdmin(value: unknown): BackendPlatformAdminDto {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    typeof value.phone_number !== 'string' ||
    typeof value.name !== 'string' ||
    value.role !== 'admin' ||
    typeof value.school !== 'number' ||
    !Number.isSafeInteger(value.school) ||
    !(value.branch === null || typeof value.branch === 'number') ||
    typeof value.is_active !== 'boolean' ||
    typeof value.date_joined !== 'string'
  ) {
    malformed('The platform returned invalid initial Admin details.');
  }
  return {
    branch: value.branch,
    date_joined: value.date_joined,
    id: value.id,
    is_active: value.is_active,
    name: value.name,
    phone_number: value.phone_number,
    role: 'admin',
    school: value.school,
  };
}

export function mapPlatformSchoolStatus(
  isActive: unknown,
): PlatformSchoolStatus {
  if (typeof isActive !== 'boolean') {
    malformed('The platform returned an unknown school status.');
  }
  return isActive ? 'ACTIVE' : 'INACTIVE';
}

export function mapPlatformSchool(value: unknown): PlatformSchool {
  const dto = readSchool(value);
  return {
    address: dto.address,
    createdAt: dto.created_at,
    email: dto.email,
    id: String(dto.id),
    name: dto.name,
    phone: dto.phone,
    status: mapPlatformSchoolStatus(dto.is_active),
    upiId: dto.upi_id,
  };
}

export function parsePlatformDashboard(value: unknown): PlatformDashboard {
  if (!isRecord(value) || value.success !== true) {
    malformed('The platform returned an invalid dashboard response.');
  }
  const dto: PlatformDashboardResponseDto = {
    active_schools: readNonNegativeInteger(
      value.active_schools,
      'active schools',
    ),
    success: true,
    this_month_collection: readDecimal(value.this_month_collection),
    total_branches: readNonNegativeInteger(
      value.total_branches,
      'total branches',
    ),
    total_schools: readNonNegativeInteger(
      value.total_schools,
      'total schools',
    ),
    total_students: readNonNegativeInteger(
      value.total_students,
      'total students',
    ),
    total_teachers: readNonNegativeInteger(
      value.total_teachers,
      'total teachers',
    ),
  };
  return {
    activeSchools: dto.active_schools,
    thisMonthCollection: dto.this_month_collection,
    totalBranches: dto.total_branches,
    totalSchools: dto.total_schools,
    totalStudents: dto.total_students,
    totalTeachers: dto.total_teachers,
  };
}

function nullableUrl(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value;
  malformed('The platform returned invalid pagination metadata.');
}

export function parsePlatformSchoolList(
  value: unknown,
): PlatformSchoolCollection {
  if (!isRecord(value) || value.success !== true) {
    malformed('The platform returned an invalid school list.');
  }
  if (Array.isArray(value.schools)) {
    const items = value.schools.map(mapPlatformSchool);
    return { items, pagination: null, totalItems: items.length };
  }

  const nested = isRecord(value.schools) ? value.schools : value;
  if (!Array.isArray(nested.results)) {
    malformed('The platform returned an invalid school list.');
  }
  const dto: PaginatedPlatformSchoolListResponseDto = {
    count: readNonNegativeInteger(nested.count, 'school count'),
    next: nullableUrl(nested.next),
    previous: nullableUrl(nested.previous),
    results: nested.results.map(readSchool),
    success: true,
  };
  return {
    items: dto.results.map(mapPlatformSchool),
    pagination: {
      count: dto.count,
      next: dto.next,
      previous: dto.previous,
    },
    totalItems: dto.count,
  };
}

export function parsePlatformSchool(value: unknown): PlatformSchool {
  if (!isRecord(value) || value.success !== true) {
    malformed('The platform returned invalid school details.');
  }
  const dto: PlatformSchoolResponseDto = {
    school: readSchool(value.school),
    success: true,
  };
  return mapPlatformSchool(dto.school);
}

function mapInitialAdmin(value: unknown): PlatformInitialAdmin {
  const dto = readAdmin(value);
  return {
    dateJoined: dto.date_joined,
    id: String(dto.id),
    mobile: dto.phone_number,
    name: dto.name,
    role: 'SCHOOL_ADMIN',
    schoolId: String(dto.school),
    status: mapPlatformSchoolStatus(dto.is_active),
  };
}

export function parseCreatePlatformSchool(
  value: unknown,
): CreatePlatformSchoolResult {
  if (!isRecord(value) || value.success !== true) {
    malformed('The platform returned an invalid school creation response.');
  }
  const dto: CreatePlatformSchoolResponseDto = {
    admin: readAdmin(value.admin),
    school: readSchool(value.school),
    success: true,
  };
  const school = mapPlatformSchool(dto.school);
  const admin = mapInitialAdmin(dto.admin);
  if (admin.schoolId !== school.id) {
    malformed('The created Admin does not belong to the created school.');
  }
  return { admin, school };
}

export function mapCreatePlatformSchoolRequest(
  input: CreatePlatformSchoolInput,
): CreatePlatformSchoolRequestDto {
  return {
    admin_name: input.adminName.trim(),
    admin_phone_number: input.adminMobile.replace(/[\s-]/g, ''),
    school_name: input.schoolName.trim(),
  };
}

export function mapUpdatePlatformSchoolRequest(
  input: UpdatePlatformSchoolInput,
): UpdatePlatformSchoolRequestDto {
  const request: UpdatePlatformSchoolRequestDto = {};
  if (input.name !== undefined) request.name = input.name.trim();
  if (input.address !== undefined) request.address = input.address.trim();
  if (input.phone !== undefined) request.phone = input.phone.trim();
  if (input.email !== undefined) request.email = input.email.trim();
  if (input.upiId !== undefined) request.upi_id = input.upiId.trim();
  return request;
}

export function mapPlatformSchoolStatusRequest(
  status: PlatformSchoolStatus,
): UpdatePlatformSchoolStatusRequestDto {
  return { is_active: status === 'ACTIVE' };
}

export function mapPlatformFieldErrors(
  fields: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!fields) return undefined;
  const names: Record<string, string> = {
    admin_name: 'adminName',
    admin_phone_number: 'adminMobile',
    school_name: 'schoolName',
    upi_id: 'upiId',
  };
  return Object.fromEntries(
    Object.entries(fields).map(([field, message]) => [
      names[field] ?? field,
      message,
    ]),
  );
}
