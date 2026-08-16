import type {
  AuthSession,
  AuthTokens,
  LoginOtpInput,
  OtpRequest,
} from '../../models/auth';
import type { ApiResponse } from '../../models/common';
import { ApiClientError } from '../api/apiError';
import { mockDelay } from '../mock/mockDelay';
import type { AuthService } from './authService';
import {
  createFixtureSession,
  getFixtureByKey,
  MOCK_AUTH,
  PLATFORM_AUTH_FIXTURES,
  SCHOOL_AUTH_FIXTURES,
  type AuthFixture,
} from './authFixtures';

interface PendingMockRequest {
  fixture: AuthFixture;
  expiresAt: number;
  attempts: number;
}

const pendingRequests = new Map<string, PendingMockRequest>();
let requestSequence = 0;

function successful<T>(data: T, message: string): ApiResponse<T> {
  return { data, message, success: true };
}

function maskMobile(mobile: string): string {
  return `+91 ••••••${mobile.slice(-4)}`;
}

function createOtpRequest(
  fixture: AuthFixture,
  destinationMasked: string,
): OtpRequest {
  requestSequence += 1;
  const requestId = `mock-otp:${fixture.key}:${requestSequence}`;
  pendingRequests.set(requestId, {
    attempts: 0,
    expiresAt: Date.now() + MOCK_AUTH.otpExpiresInSeconds * 1000,
    fixture,
  });

  return {
    destinationMasked,
    expiresInSeconds: MOCK_AUTH.otpExpiresInSeconds,
    requestId,
    resendAvailableInSeconds: MOCK_AUTH.resendAvailableInSeconds,
  };
}

function fixtureKeyFromToken(token: string, prefix: string): string {
  if (!token.startsWith(prefix)) {
    throw new ApiClientError({
      code: 'SESSION_EXPIRED',
      message: 'Your session has expired. Please log in again.',
      status: 401,
    });
  }

  return token.slice(prefix.length);
}

export const mockAuthService: AuthService = {
  async requestOtp(input: LoginOtpInput): Promise<ApiResponse<OtpRequest>> {
    await mockDelay();
    const fixture =
      SCHOOL_AUTH_FIXTURES[input.mobile] ??
      PLATFORM_AUTH_FIXTURES[input.mobile];
    if (!fixture) {
      throw new ApiClientError({
        code: 'USER_NOT_FOUND',
        fieldErrors: {
          mobile: 'No account matches this mobile number.',
        },
        message: 'No matching account was found.',
        status: 404,
      });
    }

    return successful(
      createOtpRequest(fixture, maskMobile(input.mobile)),
      'OTP sent successfully.',
    );
  },

  async resendOtp(phoneNumber): Promise<ApiResponse<OtpRequest>> {
    await mockDelay();
    const fixture =
      SCHOOL_AUTH_FIXTURES[phoneNumber] ??
      PLATFORM_AUTH_FIXTURES[phoneNumber.toLowerCase()];
    if (!fixture) {
      throw new ApiClientError({
        code: 'USER_NOT_FOUND',
        message: 'No matching account was found.',
        status: 404,
      });
    }
    return successful(
      createOtpRequest(fixture, maskMobile(phoneNumber)),
      'OTP sent successfully.',
    );
  },

  async verifyOtp(input): Promise<ApiResponse<AuthSession>> {
    await mockDelay();
    if (!input.requestId) {
      throw new ApiClientError({
        code: 'OTP_REQUEST_MISSING',
        message: 'Return to login and request a new OTP.',
        status: 400,
      });
    }
    const pending = pendingRequests.get(input.requestId);
    if (!pending) {
      throw new ApiClientError({
        code: 'OTP_EXPIRED',
        message: 'This OTP request has expired. Request a new OTP.',
        status: 410,
      });
    }

    if (Date.now() >= pending.expiresAt) {
      pendingRequests.delete(input.requestId);
      throw new ApiClientError({
        code: 'OTP_EXPIRED',
        message: 'The OTP has expired. Request a new OTP.',
        status: 410,
      });
    }

    pending.attempts += 1;
    if (pending.attempts > MOCK_AUTH.maximumAttempts) {
      pendingRequests.delete(input.requestId);
      throw new ApiClientError({
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Too many incorrect attempts. Request a new OTP.',
        status: 429,
      });
    }

    if (input.otp !== MOCK_AUTH.otp) {
      throw new ApiClientError({
        code: 'INVALID_OTP',
        fieldErrors: { otp: 'The OTP you entered is incorrect.' },
        message: 'Invalid OTP. Check the code and try again.',
        status: 400,
      });
    }

    pendingRequests.delete(input.requestId);
    return successful(
      createFixtureSession(pending.fixture),
      'OTP verified successfully.',
    );
  },

  async getCurrentUser() {
    throw new ApiClientError({
      code: 'MOCK_SESSION_CONTEXT_REQUIRED',
      message: 'Restore a mock session before reading its profile.',
    });
  },

  async updateCurrentUser() {
    throw new ApiClientError({
      code: 'MOCK_ONBOARDING_UNAVAILABLE',
      message: 'Mock onboarding is not available through live auth actions.',
    });
  },

  async getCurrentSchool() {
    throw new ApiClientError({
      code: 'MOCK_ONBOARDING_UNAVAILABLE',
      message: 'Mock onboarding is not available through live auth actions.',
    });
  },

  async updateCurrentSchool() {
    throw new ApiClientError({
      code: 'MOCK_ONBOARDING_UNAVAILABLE',
      message: 'Mock onboarding is not available through live auth actions.',
    });
  },

  async restoreSession(accessToken): Promise<ApiResponse<AuthSession>> {
    await mockDelay(250);
    const fixtureKey = fixtureKeyFromToken(accessToken, 'mock-access:');
    const fixture = getFixtureByKey(fixtureKey);
    if (!fixture) {
      throw new ApiClientError({
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please log in again.',
        status: 401,
      });
    }

    return successful(createFixtureSession(fixture), 'Session restored.');
  },

  async refreshSession(refreshToken): Promise<ApiResponse<AuthTokens>> {
    await mockDelay(250);
    const fixtureKey = fixtureKeyFromToken(refreshToken, 'mock-refresh:');
    const fixture = getFixtureByKey(fixtureKey);
    if (!fixture) {
      throw new ApiClientError({
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please log in again.',
        status: 401,
      });
    }

    return successful(
      createFixtureSession(fixture).tokens,
      'Session refreshed.',
    );
  },

  async logout(): Promise<ApiResponse<null>> {
    await mockDelay(200);
    return successful(null, 'Logged out successfully.');
  },
};

export function resetMockAuthService(): void {
  pendingRequests.clear();
  requestSequence = 0;
}
