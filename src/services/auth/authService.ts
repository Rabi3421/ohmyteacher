import type {
  AuthSession,
  AuthTokens,
  OtpRequest,
  PlatformOtpInput,
  SchoolOtpInput,
} from '../../models/auth';
import type { ApiResponse } from '../../models/common';

export interface AuthService {
  requestSchoolOtp(input: SchoolOtpInput): Promise<ApiResponse<OtpRequest>>;
  requestPlatformOtp(input: PlatformOtpInput): Promise<ApiResponse<OtpRequest>>;
  verifyOtp(input: {
    requestId: string;
    otp: string;
  }): Promise<ApiResponse<AuthSession>>;
  restoreSession(accessToken: string): Promise<ApiResponse<AuthSession>>;
  refreshSession(refreshToken: string): Promise<ApiResponse<AuthTokens>>;
  logout(): Promise<ApiResponse<null>>;
}
