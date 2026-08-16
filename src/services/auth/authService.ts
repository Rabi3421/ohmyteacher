import type {
  AuthIdentity,
  AuthOnboardingInput,
  AuthSchool,
  AuthSession,
  AuthTokens,
  AuthUser,
  LoginOtpInput,
  OtpRequest,
} from '../../models/auth';
import type { ApiResponse } from '../../models/common';

export interface VerifyOtpInput {
  otp: string;
  phoneNumber?: string;
  requestId?: string;
}

export interface AuthService {
  requestOtp(input: LoginOtpInput): Promise<ApiResponse<OtpRequest>>;
  resendOtp(phoneNumber: string): Promise<ApiResponse<OtpRequest>>;
  verifyOtp(input: VerifyOtpInput): Promise<ApiResponse<AuthSession>>;
  getCurrentUser(): Promise<ApiResponse<AuthIdentity>>;
  updateCurrentUser(name: string): Promise<ApiResponse<AuthIdentity>>;
  getCurrentSchool(): Promise<ApiResponse<AuthSchool>>;
  updateCurrentSchool(
    input: AuthOnboardingInput['school'],
  ): Promise<ApiResponse<AuthSchool>>;
  restoreSession(accessToken: string): Promise<ApiResponse<AuthSession>>;
  refreshSession(refreshToken: string): Promise<ApiResponse<AuthTokens>>;
  logout(): Promise<ApiResponse<null>>;
}

export type { AuthIdentity, AuthSchool, AuthUser };
