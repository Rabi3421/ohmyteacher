import type {
  CreateOrganizationBranchInput,
  OrganizationBranch,
  OrganizationBranchCollection,
  OrganizationBranchStatus,
  UpdateCurrentSchoolInput,
  UpdateOrganizationBranchInput,
} from '../../models/currentOrganization';
import { ApiClientError } from '../api/apiError';
import type {
  BackendOrganizationBranchDto,
  BranchResponseDto,
  CreateBranchRequestDto,
  PaginatedBranchListResponseDto,
  UpdateBranchRequestDto,
  UpdateBranchStatusRequestDto,
  UpdateCurrentOrganizationRequestDto,
} from './organizationDtos';

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_ORGANIZATION_RESPONSE',
    kind: 'server',
    message,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPositiveId(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    malformed(`The server returned an invalid ${field}.`);
  }
  return value;
}

function readBranch(value: unknown): BackendOrganizationBranchDto {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    value.name.trim().length === 0 ||
    typeof value.code !== 'string' ||
    value.code.trim().length === 0 ||
    typeof value.address !== 'string' ||
    typeof value.phone !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.is_active !== 'boolean' ||
    typeof value.created_at !== 'string' ||
    Number.isNaN(Date.parse(value.created_at))
  ) {
    malformed('The server returned invalid branch details.');
  }
  return {
    address: value.address,
    code: value.code,
    created_at: value.created_at,
    email: value.email,
    id: readPositiveId(value.id, 'branch ID'),
    is_active: value.is_active,
    name: value.name,
    phone: value.phone,
    school: readPositiveId(value.school, 'school ID'),
  };
}

function readCount(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    malformed('The server returned invalid branch pagination metadata.');
  }
  return value;
}

function readNullableUrl(value: unknown): string | null {
  if (value === null || typeof value === 'string') return value;
  malformed('The server returned invalid branch pagination metadata.');
}

export function mapOrganizationBranchStatus(
  value: unknown,
): OrganizationBranchStatus {
  if (typeof value !== 'boolean') {
    malformed('The server returned an unknown branch status.');
  }
  return value ? 'ACTIVE' : 'INACTIVE';
}

export function mapOrganizationBranch(value: unknown): OrganizationBranch {
  const dto = readBranch(value);
  return {
    address: dto.address,
    code: dto.code,
    createdAt: dto.created_at,
    email: dto.email,
    id: String(dto.id),
    name: dto.name,
    phone: dto.phone,
    schoolId: String(dto.school),
    status: mapOrganizationBranchStatus(dto.is_active),
  };
}

export function parseOrganizationBranchList(
  value: unknown,
): OrganizationBranchCollection {
  if (!isRecord(value) || value.success !== true) {
    malformed('The server returned an invalid branch list.');
  }
  if (Array.isArray(value.branches)) {
    const items = value.branches.map(mapOrganizationBranch);
    return { items, pagination: null, totalItems: items.length };
  }

  const envelope = isRecord(value.branches) ? value.branches : value;
  if (!Array.isArray(envelope.results)) {
    malformed('The server returned an invalid branch list.');
  }
  const dto: PaginatedBranchListResponseDto = {
    count: readCount(envelope.count),
    next: readNullableUrl(envelope.next),
    previous: readNullableUrl(envelope.previous),
    results: envelope.results.map(readBranch),
    success: true,
  };
  return {
    items: dto.results.map(mapOrganizationBranch),
    pagination: {
      count: dto.count,
      next: dto.next,
      previous: dto.previous,
    },
    totalItems: dto.count,
  };
}

export function parseOrganizationBranch(value: unknown): OrganizationBranch {
  if (!isRecord(value) || value.success !== true) {
    malformed('The server returned invalid branch details.');
  }
  const dto: BranchResponseDto = {
    branch: readBranch(value.branch),
    success: true,
  };
  return mapOrganizationBranch(dto.branch);
}

export function mapCurrentSchoolUpdateRequest(
  input: UpdateCurrentSchoolInput,
): UpdateCurrentOrganizationRequestDto {
  const request: UpdateCurrentOrganizationRequestDto = {};
  if (input.name !== undefined) request.name = input.name.trim();
  if (input.address !== undefined) request.address = input.address.trim();
  if (input.phone !== undefined) request.phone = input.phone.trim();
  if (input.email !== undefined) request.email = input.email.trim();
  if (input.upiId !== undefined) request.upi_id = input.upiId.trim();
  return request;
}

export function mapCreateOrganizationBranchRequest(
  input: CreateOrganizationBranchInput,
): CreateBranchRequestDto {
  const request: CreateBranchRequestDto = { name: input.name.trim() };
  if (input.address !== undefined) request.address = input.address.trim();
  if (input.phone !== undefined) request.phone = input.phone.trim();
  if (input.email !== undefined) request.email = input.email.trim();
  return request;
}

export function mapUpdateOrganizationBranchRequest(
  input: UpdateOrganizationBranchInput,
): UpdateBranchRequestDto {
  const request: UpdateBranchRequestDto = {};
  if (input.name !== undefined) request.name = input.name.trim();
  if (input.address !== undefined) request.address = input.address.trim();
  if (input.phone !== undefined) request.phone = input.phone.trim();
  if (input.email !== undefined) request.email = input.email.trim();
  return request;
}

export function mapOrganizationBranchStatusRequest(
  status: OrganizationBranchStatus,
): UpdateBranchStatusRequestDto {
  return { is_active: status === 'ACTIVE' };
}

export function mapOrganizationFieldErrors(
  fields: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!fields) return undefined;
  const names: Record<string, string> = { upi_id: 'upiId' };
  return Object.fromEntries(
    Object.entries(fields).map(([field, message]) => [
      names[field] ?? field,
      message,
    ]),
  );
}
