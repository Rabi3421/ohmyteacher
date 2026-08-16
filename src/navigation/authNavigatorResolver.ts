import type { AuthStatus } from '../store/auth/authStore';

export type AuthInitialRoute = 'OtpVerification' | 'Welcome';

export function getAuthInitialRoute(status: AuthStatus): AuthInitialRoute {
  return status === 'otpRequired' ? 'OtpVerification' : 'Welcome';
}
