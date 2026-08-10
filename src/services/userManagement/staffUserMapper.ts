import type {
  BackendStaffRole,
  CreateLiveStaffInput,
  LiveStaffBranchReference,
  LiveStaffCollection,
  LiveStaffStatus,
  LiveStaffUser,
  UpdateLiveStaffInput,
} from '../../models/liveStaff';
import { ApiClientError } from '../api/apiError';
import type {
  BackendStaffRoleDto,
  BackendStaffUserDto,
  CreateStaffRequestDto,
  StaffResponseDto,
  UpdateStaffRequestDto,
  UpdateStaffStatusRequestDto,
} from './staffUserDtos';

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_STAFF_RESPONSE',
    kind: 'server',
    message,
  });
}

function invalidInput(message: string): never {
  throw new ApiClientError({
    code: 'INVALID_STAFF_INPUT',
    kind: 'validation',
    message,
    status: 400,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveId(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

function requestId(value: string, field: string): number {
  if (!/^[1-9]\d*$/.test(value)) invalidInput(`${field} is invalid.`);
  return Number(value);
}

function readStaffUser(value: unknown): BackendStaffUserDto {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    typeof value.phone_number !== 'string' ||
    value.phone_number.length === 0 ||
    typeof value.role !== 'string' ||
    typeof value.is_active !== 'boolean' ||
    typeof value.date_joined !== 'string' ||
    Number.isNaN(Date.parse(value.date_joined))
  ) {
    malformed('The server returned invalid staff details.');
  }
  const school = positiveId(value.school, 'staff school ID');
  const branch = positiveId(value.branch, 'staff branch ID');
  return {
    branch,
    date_joined: value.date_joined,
    id: positiveId(value.id, 'staff ID'),
    is_active: value.is_active,
    name: value.name,
    phone_number: value.phone_number,
    role: value.role,
    school,
  };
}

export function mapBackendStaffRole(value: unknown): BackendStaffRole {
  if (value === 'branch_admin') return 'BRANCH_ADMIN';
  if (value === 'teacher') return 'TEACHER';
  malformed('The server returned an unsupported staff role.');
}

export function mapLiveStaffStatus(value: unknown): LiveStaffStatus {
  if (typeof value !== 'boolean') {
    malformed('The server returned an unknown staff status.');
  }
  return value ? 'ACTIVE' : 'INACTIVE';
}

export function isBackendStaffRecord(value: unknown): boolean {
  return isRecord(value) &&
    (value.role === 'branch_admin' || value.role === 'teacher');
}

export function mapLiveStaffUser(
  value: unknown,
  branches: readonly LiveStaffBranchReference[] = [],
): LiveStaffUser {
  const dto = readStaffUser(value);
  const resolvedBranch = branches.find(item => item.id === String(dto.branch));
  return {
    branch: resolvedBranch ?? { id: String(dto.branch) },
    id: String(dto.id),
    joinedAt: dto.date_joined,
    mobile: dto.phone_number,
    name: dto.name,
    role: mapBackendStaffRole(dto.role),
    schoolId: String(dto.school),
    status: mapLiveStaffStatus(dto.is_active),
  };
}

export function parseStaffList(
  value: unknown,
  branches: readonly LiveStaffBranchReference[] = [],
): LiveStaffCollection {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.users)) {
    malformed('The server returned an invalid staff list.');
  }
  const seen = new Set<string>();
  const items = value.users
    .filter(isBackendStaffRecord)
    .map(item => mapLiveStaffUser(item, branches))
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  return { items, pagination: null, totalItems: items.length };
}

export function parseStaffResponse(
  value: unknown,
  branches: readonly LiveStaffBranchReference[] = [],
): LiveStaffUser {
  if (!isRecord(value) || value.success !== true) {
    malformed('The server returned invalid staff details.');
  }
  const dto: StaffResponseDto = {
    success: true,
    user: readStaffUser(value.user),
  };
  return mapLiveStaffUser(dto.user, branches);
}

function backendRole(role: BackendStaffRole): BackendStaffRoleDto {
  return role === 'BRANCH_ADMIN' ? 'branch_admin' : 'teacher';
}

export function mapCreateStaffRequest(
  input: CreateLiveStaffInput,
): CreateStaffRequestDto {
  return {
    branch: requestId(input.branchId, 'Branch'),
    name: input.name.trim(),
    phone_number: input.mobile.trim(),
    role: backendRole(input.role),
  };
}

export function mapUpdateStaffRequest(
  input: UpdateLiveStaffInput,
): UpdateStaffRequestDto {
  const request: UpdateStaffRequestDto = {};
  if (input.name !== undefined) request.name = input.name.trim();
  if (input.branchId !== undefined) {
    request.branch = requestId(input.branchId, 'Branch');
  }
  return request;
}

export function mapStaffStatusRequest(
  status: LiveStaffStatus,
): UpdateStaffStatusRequestDto {
  return { is_active: status === 'ACTIVE' };
}

export function mapStaffFieldErrors(
  fields: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!fields) return undefined;
  const names: Record<string, string> = {
    phone_number: 'mobile',
    branch: 'branchId',
  };
  return Object.fromEntries(
    Object.entries(fields).map(([field, message]) => [
      names[field] ?? field,
      message,
    ]),
  );
}
