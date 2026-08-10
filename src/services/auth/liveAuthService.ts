import type {
  AuthIdentity,
  AuthOnboardingInput,
  AuthSchool,
  AuthSession,
  AuthTokens,
  OtpRequest,
} from '../../models/auth';
import type { ApiResponse } from '../../models/common';
import { apiClient, type ApiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import {
  authSessionStorage,
  type AuthSessionStorage,
} from './authSessionStorage';
import type {
  CurrentUserResponseDto,
  RefreshTokenResponseDto,
  SendOtpResponseDto,
  UpdateProfileResponseDto,
  VerifyOtpResponseDto,
} from './authDtos';
import { LiveCurrentOrganizationService } from '../organization/liveCurrentOrganizationService';
import {
  mapBackendUser,
  mapOtpRequest,
  mapTokens,
  parseCurrentUserResponse,
  parseRefreshResponse,
  parseSendOtpResponse,
  parseVerifyOtpResponse,
} from './authMapper';
import type { AuthService, VerifyOtpInput } from './authService';

function success<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function validPhone(phoneNumber: string, field = 'mobile'): string {
  const normalized = phoneNumber.replace(/[\s-]/g, '');
  if (!/^[6-9]\d{9}$/.test(normalized)) {
    throw new ApiClientError({
      code: 'VALIDATION_ERROR',
      fieldErrors: { [field]: 'Enter a valid 10-digit Indian mobile number.' },
      kind: 'validation',
      message: 'Enter a valid mobile number.',
      status: 400,
    });
  }
  return normalized;
}

function remapFields(
  error: unknown,
  names: Record<string, string>,
  fallbackField?: string,
): never {
  if (!(error instanceof ApiClientError)) throw error;
  const fieldErrors = Object.fromEntries(
    Object.entries(error.fieldErrors ?? {}).map(([field, message]) => [
      names[field] ?? field,
      message,
    ]),
  );
  if (
    fallbackField &&
    Object.keys(fieldErrors).length === 0 &&
    error.kind === 'validation'
  ) {
    fieldErrors[fallbackField] = error.message;
  }
  if (Object.keys(fieldErrors).length === 0) throw error;
  throw new ApiClientError({
    code: error.code,
    details: error.details,
    fieldErrors,
    kind: error.kind,
    message: error.message,
    nonFieldErrors: error.nonFieldErrors,
    retryable: error.retryable,
    status: error.status,
  });
}

type AuthApiClient = Pick<ApiClient, 'get' | 'patch' | 'post'>;

export class LiveAuthRepository {
  private readonly currentOrganization: LiveCurrentOrganizationService;

  constructor(private readonly client: AuthApiClient) {
    this.currentOrganization = new LiveCurrentOrganizationService(client);
  }

  async sendOtp(
    phoneNumber: string,
    field = 'mobile',
  ): Promise<ApiResponse<OtpRequest>> {
    const phone = validPhone(phoneNumber, field);
    try {
      const raw = await this.client.post<unknown>(
        '/auth/send-otp/',
        { phone_number: phone },
        { auth: 'none' },
      );
      const dto: SendOtpResponseDto = parseSendOtpResponse(raw);
      return success(mapOtpRequest(dto, phone), dto.message);
    } catch (error) {
      remapFields(error, { phone_number: field });
    }
  }

  async resendOtp(phoneNumber: string): Promise<ApiResponse<OtpRequest>> {
    const phone = validPhone(phoneNumber);
    try {
      const raw = await this.client.post<unknown>(
        '/auth/resend-otp/',
        { phone_number: phone },
        { auth: 'none' },
      );
      const dto = parseSendOtpResponse(raw);
      return success(mapOtpRequest(dto, phone), dto.message);
    } catch (error) {
      remapFields(error, { phone_number: 'mobile' });
    }
  }

  async verifyOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<ApiResponse<AuthSession>> {
    const phone = validPhone(phoneNumber);
    try {
      const raw = await this.client.post<unknown>(
        '/auth/verify-otp/',
        { otp, phone_number: phone },
        { auth: 'none' },
      );
      const dto: VerifyOtpResponseDto = parseVerifyOtpResponse(raw);
      const identity = mapBackendUser(dto.user);
      return success(
        {
          ...identity,
          isNewUser: dto.is_new_user,
          tokens: mapTokens(dto.access, dto.refresh),
        },
        dto.message,
      );
    } catch (error) {
      remapFields(error, { phone_number: 'mobile' }, 'otp');
    }
  }

  async getCurrentUser(): Promise<ApiResponse<AuthIdentity>> {
    const raw = await this.client.get<unknown>('/auth/me/');
    const dto: CurrentUserResponseDto = parseCurrentUserResponse(raw);
    return success(mapBackendUser(dto.user), 'Profile loaded.');
  }

  async updateCurrentUser(name: string): Promise<ApiResponse<AuthIdentity>> {
    try {
      const raw = await this.client.patch<unknown>('/auth/me/', { name });
      const dto: UpdateProfileResponseDto = parseCurrentUserResponse(raw);
      return success(mapBackendUser(dto.user), 'Profile updated.');
    } catch (error) {
      remapFields(error, {}, 'name');
    }
  }

  async getCurrentSchool(): Promise<ApiResponse<AuthSchool>> {
    return this.currentOrganization.getCurrentSchool();
  }

  async updateCurrentSchool(
    input: AuthOnboardingInput['school'],
  ): Promise<ApiResponse<AuthSchool>> {
    try {
      return await this.currentOrganization.updateCurrentSchool({
        address: input.address?.trim() ?? '',
        email: input.email?.trim() ?? '',
        name: input.name.trim(),
        phone: input.phone?.trim() ?? '',
        upiId: input.upiId?.trim() ?? '',
      });
    } catch (error) {
      remapFields(error, { name: 'schoolName', upiId: 'upiId' });
    }
  }

  async refreshSession(
    refreshToken: string,
  ): Promise<ApiResponse<AuthTokens>> {
    const raw = await this.client.post<unknown>(
      '/auth/refresh/',
      { refresh: refreshToken },
      { auth: 'none' },
    );
    const dto: RefreshTokenResponseDto = parseRefreshResponse(raw);
    return success(
      mapTokens(dto.access, dto.refresh || refreshToken),
      'Session refreshed.',
    );
  }

  async logout(refreshToken: string): Promise<ApiResponse<null>> {
    const raw = await this.client.post<unknown>(
      '/auth/logout/',
      { refresh: refreshToken },
      { auth: 'none' },
    );
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !('success' in raw) ||
      raw.success !== true
    ) {
      throw new ApiClientError({
        code: 'MALFORMED_AUTH_RESPONSE',
        kind: 'server',
        message: 'The server returned an invalid logout response.',
      });
    }
    const message =
      'message' in raw && typeof raw.message === 'string'
        ? raw.message
        : 'Logged out.';
    return success(null, message);
  }
}

interface LiveAuthServiceDependencies {
  repository: LiveAuthRepository;
  sessionStorage: AuthSessionStorage;
}

export function createLiveAuthService({
  repository,
  sessionStorage,
}: LiveAuthServiceDependencies): AuthService {
  async function restoreSession(): Promise<ApiResponse<AuthSession>> {
    const identityResponse = await repository.getCurrentUser();
    const stored = await sessionStorage.read();
    if (!stored) {
      throw new ApiClientError({
        code: 'SESSION_EXPIRED',
        kind: 'authentication',
        message: 'Your session has expired. Please sign in again.',
        status: 401,
      });
    }
    const schoolAdmin = identityResponse.data.memberships.some(
      membership => membership.role === 'SCHOOL_ADMIN',
    );
    const school = schoolAdmin
      ? (await repository.getCurrentSchool()).data
      : undefined;
    return success(
      { ...identityResponse.data, school, tokens: stored.tokens },
      'Session restored.',
    );
  }

  return {
    getCurrentSchool: () => repository.getCurrentSchool(),
    getCurrentUser: () => repository.getCurrentUser(),
    logout: async () => {
      const stored = await sessionStorage.read();
      return stored
        ? repository.logout(stored.tokens.refreshToken)
        : success(null, 'Local session cleared.');
    },
    refreshSession: refreshToken => repository.refreshSession(refreshToken),
    requestPlatformOtp: input =>
      repository.sendOtp(input.identifier, 'identifier'),
    requestSchoolOtp: input => repository.sendOtp(input.mobile),
    resendOtp: phoneNumber => repository.resendOtp(phoneNumber),
    restoreSession,
    updateCurrentSchool: input => repository.updateCurrentSchool(input),
    updateCurrentUser: name => repository.updateCurrentUser(name),
    verifyOtp: (input: VerifyOtpInput) => {
      if (!input.phoneNumber) {
        throw new ApiClientError({
          code: 'OTP_REQUEST_MISSING',
          kind: 'validation',
          message: 'Return to login and request a new OTP.',
        });
      }
      return repository.verifyOtp(input.phoneNumber, input.otp);
    },
  };
}

export const liveAuthRepository = new LiveAuthRepository(apiClient);
export const liveAuthService = createLiveAuthService({
  repository: liveAuthRepository,
  sessionStorage: authSessionStorage,
});
