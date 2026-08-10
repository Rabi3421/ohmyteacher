import type { AppRole } from '../../constants/permissions';
import type {
  AuthIdentity,
  AuthSchool,
  AuthTokens,
  OtpRequest,
  UserMembership,
} from '../../models/auth';
import { ApiClientError } from '../api/apiError';
import type {
  BackendAuthUserDto,
  BackendSchoolDto,
  CurrentSchoolResponseDto,
  CurrentUserResponseDto,
  RefreshTokenResponseDto,
  SendOtpResponseDto,
  VerifyOtpResponseDto,
} from './authDtos';

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const ACCESS_TOKEN_EXPIRY_HINT_MS = 15 * 60 * 1_000;

function malformed(message: string): never {
  throw new ApiClientError({
    code: 'MALFORMED_AUTH_RESPONSE',
    kind: 'server',
    message,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
  );
}

function readUser(value: unknown): BackendAuthUserDto {
  if (!isRecord(value)) malformed('The server returned an invalid user profile.');
  if (
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0 ||
    typeof value.phone_number !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.role !== 'string' ||
    !isNullableNumber(value.school) ||
    !isNullableNumber(value.branch) ||
    typeof value.is_active !== 'boolean' ||
    typeof value.date_joined !== 'string'
  ) {
    malformed('The server returned an invalid user profile.');
  }
  return {
    branch: value.branch,
    date_joined: value.date_joined,
    id: value.id,
    is_active: value.is_active,
    name: value.name,
    phone_number: value.phone_number,
    role: value.role,
    school: value.school,
  };
}

function membershipFor(
  user: BackendAuthUserDto,
  role: AppRole,
): UserMembership {
  const id = `backend-user:${user.id}:${role}`;
  return {
    branchId: user.branch === null ? undefined : String(user.branch),
    id,
    role,
    schoolId: user.school === null ? undefined : String(user.school),
    status: user.is_active ? 'ACTIVE' : 'INACTIVE',
    userId: String(user.id),
  };
}

export function mapBackendRole(role: string): AppRole | null {
  switch (role) {
    case 'super_admin':
      return 'SUPER_ADMIN';
    case 'admin':
      return 'SCHOOL_ADMIN';
    case 'branch_admin':
      return 'BRANCH_ADMIN';
    case 'student':
      return 'PARENT';
    case 'teacher':
    default:
      return null;
  }
}

export function mapBackendUser(value: unknown): AuthIdentity {
  const dto = readUser(value);
  const role = mapBackendRole(dto.role);
  return {
    memberships: role ? [membershipFor(dto, role)] : [],
    unsupportedRole: role ? undefined : dto.role,
    user: {
      id: String(dto.id),
      mobile: dto.phone_number,
      name: dto.name,
      status: dto.is_active ? 'ACTIVE' : 'INACTIVE',
    },
  };
}

export function parseCurrentUserResponse(value: unknown): CurrentUserResponseDto {
  if (!isRecord(value) || value.success !== true) {
    malformed('The server returned an invalid authentication response.');
  }
  return { success: true, user: readUser(value.user) };
}

function readSchool(value: unknown): BackendSchoolDto {
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
    typeof value.created_at !== 'string' ||
    Number.isNaN(Date.parse(value.created_at))
  ) {
    malformed('The server returned invalid school details.');
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

export function parseSchoolResponse(value: unknown): CurrentSchoolResponseDto {
  if (!isRecord(value) || value.success !== true) {
    malformed('The server returned invalid school details.');
  }
  return { school: readSchool(value.school), success: true };
}

export function mapBackendSchool(value: unknown): AuthSchool {
  const dto = readSchool(value);
  return {
    address: dto.address,
    createdAt: dto.created_at,
    email: dto.email,
    id: String(dto.id),
    name: dto.name,
    phone: dto.phone,
    status: dto.is_active ? 'ACTIVE' : 'INACTIVE',
    upiId: dto.upi_id,
  };
}

export function parseSendOtpResponse(value: unknown): SendOtpResponseDto {
  if (
    !isRecord(value) ||
    value.success !== true ||
    typeof value.message !== 'string' ||
    typeof value.expires_in_minutes !== 'number' ||
    value.expires_in_minutes <= 0
  ) {
    malformed('The server returned an invalid OTP response.');
  }
  return {
    expires_in_minutes: value.expires_in_minutes,
    message: value.message,
    success: true,
  };
}

export function mapOtpRequest(
  dto: SendOtpResponseDto,
  phoneNumber: string,
): OtpRequest {
  return {
    destinationMasked: `+91 ••••••${phoneNumber.slice(-4)}`,
    expiresInSeconds: dto.expires_in_minutes * 60,
    resendAvailableInSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

export function parseVerifyOtpResponse(value: unknown): VerifyOtpResponseDto {
  if (
    !isRecord(value) ||
    value.success !== true ||
    typeof value.is_new_user !== 'boolean' ||
    typeof value.message !== 'string' ||
    typeof value.access !== 'string' ||
    value.access.length === 0 ||
    typeof value.refresh !== 'string' ||
    value.refresh.length === 0
  ) {
    malformed('The server returned an invalid OTP verification response.');
  }
  return {
    access: value.access,
    is_new_user: value.is_new_user,
    message: value.message,
    refresh: value.refresh,
    success: true,
    user: readUser(value.user),
  };
}

export function parseRefreshResponse(
  value: unknown,
): RefreshTokenResponseDto {
  if (
    !isRecord(value) ||
    value.success !== true ||
    typeof value.access !== 'string' ||
    value.access.length === 0 ||
    !(
      value.refresh === undefined ||
      value.refresh === null ||
      typeof value.refresh === 'string'
    )
  ) {
    malformed('The server returned an invalid token refresh response.');
  }
  return {
    access: value.access,
    refresh: value.refresh,
    success: true,
  };
}

export function mapTokens(
  accessToken: string,
  refreshToken: string,
): AuthTokens {
  return {
    accessToken,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_EXPIRY_HINT_MS).toISOString(),
    refreshToken,
  };
}
