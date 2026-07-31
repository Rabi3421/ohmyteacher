import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type {
  AuthSession,
  AuthTokens,
  AuthUser,
  InactiveReason,
  PendingOtpRequest,
  PlatformOtpInput,
  SchoolOtpInput,
  UserMembership,
} from '../../models/auth';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { AuthService } from '../../services/auth/authService';
import {
  authSessionStorage,
  type AuthSessionStorage,
} from '../../services/auth/authSessionStorage';
import { mockAuthService } from '../../services/auth/mockAuthService';

export type AuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'otpRequired'
  | 'membershipRequired'
  | 'authenticated'
  | 'sessionExpired'
  | 'inactive';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  memberships: UserMembership[];
  activeMembership: UserMembership | null;
  pendingOtpRequest: PendingOtpRequest | null;
  accessTokenAvailable: boolean;
  isLoading: boolean;
  error: ApiError | null;
  inactiveReason: InactiveReason | null;
}

export interface AuthActions {
  initializeAuth: () => Promise<void>;
  requestSchoolOtp: (input: SchoolOtpInput) => Promise<boolean>;
  requestPlatformOtp: (input: PlatformOtpInput) => Promise<boolean>;
  resendOtp: () => Promise<boolean>;
  verifyOtp: (otp: string) => Promise<boolean>;
  selectMembership: (membershipId: string) => Promise<boolean>;
  switchWorkspace: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  expireSession: () => Promise<void>;
  clearError: () => void;
  resetAuthFlow: () => Promise<void>;
}

export type AuthStoreState = AuthState & AuthActions;

interface AuthStoreDependencies {
  service: AuthService;
  sessionStorage: AuthSessionStorage;
}

export const INITIAL_AUTH_STATE: AuthState = {
  accessTokenAvailable: false,
  activeMembership: null,
  error: null,
  inactiveReason: null,
  isLoading: false,
  memberships: [],
  pendingOtpRequest: null,
  status: 'initializing',
  user: null,
};

const AUTH_INITIALIZATION_TIMEOUT_MS = 10_000;

async function withInitializationTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new ApiClientError({
            code: 'INITIALIZATION_TIMEOUT',
            message:
              'Session restoration is taking longer than expected. Please try again.',
          }),
        ),
      AUTH_INITIALIZATION_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      fieldErrors: error.fieldErrors,
      message: error.message,
      status: error.status,
    };
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Please try again.',
  };
}

export function createAuthStore({
  service,
  sessionStorage,
}: AuthStoreDependencies): StoreApi<AuthStoreState> {
  return createStore<AuthStoreState>()((set, get) => {
    async function clearStoredSession(): Promise<void> {
      try {
        await sessionStorage.clear();
      } catch {
        // Local state must still be cleared even if device storage is unavailable.
      }
    }

    async function applySession(
      session: AuthSession,
      preferredMembershipId: string | null = null,
    ): Promise<void> {
      if (session.user.status !== 'ACTIVE') {
        await clearStoredSession();
        set({
          ...INITIAL_AUTH_STATE,
          inactiveReason: 'USER_INACTIVE',
          status: 'inactive',
          user: session.user,
        });
        return;
      }

      const activeMemberships = session.memberships.filter(
        membership => membership.status === 'ACTIVE',
      );
      if (activeMemberships.length === 0) {
        await clearStoredSession();
        set({
          ...INITIAL_AUTH_STATE,
          inactiveReason: 'MEMBERSHIP_INACTIVE',
          memberships: session.memberships,
          status: 'inactive',
          user: session.user,
        });
        return;
      }

      await sessionStorage.saveTokens(session.tokens);
      const preferredMembership =
        activeMemberships.find(
          membership => membership.id === preferredMembershipId,
        ) ?? null;
      const selectedMembership =
        preferredMembership ??
        (activeMemberships.length === 1 ? activeMemberships[0] : null);

      await sessionStorage.saveActiveMembershipId(
        selectedMembership?.id ?? null,
      );
      set({
        accessTokenAvailable: true,
        activeMembership: selectedMembership,
        error: null,
        inactiveReason: null,
        isLoading: false,
        memberships: session.memberships,
        pendingOtpRequest: null,
        status: selectedMembership
          ? 'authenticated'
          : 'membershipRequired',
        user: session.user,
      });
    }

    async function requestOtp(
      context:
        | { kind: 'school'; input: SchoolOtpInput }
        | { kind: 'platform'; input: PlatformOtpInput },
    ): Promise<boolean> {
      if (get().isLoading) {
        return false;
      }

      set({ error: null, isLoading: true });
      try {
        const response =
          context.kind === 'school'
            ? await service.requestSchoolOtp(context.input)
            : await service.requestPlatformOtp(context.input);
        set({
          error: null,
          isLoading: false,
          pendingOtpRequest: {
            ...response.data,
            context,
            requestedAt: new Date().toISOString(),
          },
          status: 'otpRequired',
        });
        return true;
      } catch (error) {
        set({ error: normalizeError(error), isLoading: false });
        return false;
      }
    }

    async function restoreSession(): Promise<void> {
      set({ error: null, isLoading: true, status: 'initializing' });
      try {
        const stored = await withInitializationTimeout(sessionStorage.read());
        if (!stored) {
          await clearStoredSession();
          set({
            ...INITIAL_AUTH_STATE,
            isLoading: false,
            status: 'unauthenticated',
          });
          return;
        }

        let tokens: AuthTokens = stored.tokens;
        if (new Date(tokens.expiresAt).getTime() <= Date.now()) {
          const refreshed = await withInitializationTimeout(
            service.refreshSession(tokens.refreshToken),
          );
          tokens = refreshed.data;
          await sessionStorage.saveTokens(tokens);
        }

        const response = await withInitializationTimeout(
          service.restoreSession(tokens.accessToken),
        );
        await applySession(response.data, stored.activeMembershipId);
      } catch (error) {
        const normalized = normalizeError(error);
        if (
          normalized.code === 'SESSION_EXPIRED' ||
          normalized.status === 401
        ) {
          await clearStoredSession();
          set({
            ...INITIAL_AUTH_STATE,
            error: null,
            isLoading: false,
            status: 'sessionExpired',
          });
          return;
        }

        set({
          ...INITIAL_AUTH_STATE,
          error: normalized,
          isLoading: false,
          status: 'initializing',
        });
      }
    }

    return {
      ...INITIAL_AUTH_STATE,

      initializeAuth: restoreSession,
      restoreSession,

      requestSchoolOtp(input) {
        return requestOtp({ input, kind: 'school' });
      },

      requestPlatformOtp(input) {
        return requestOtp({ input, kind: 'platform' });
      },

      async resendOtp() {
        const pending = get().pendingOtpRequest;
        if (!pending) {
          set({
            error: {
              code: 'OTP_REQUEST_MISSING',
              message: 'Return to login and request a new OTP.',
            },
          });
          return false;
        }

        return requestOtp(pending.context);
      },

      async verifyOtp(otp) {
        if (get().isLoading) {
          return false;
        }

        const pending = get().pendingOtpRequest;
        if (!pending) {
          set({
            error: {
              code: 'OTP_REQUEST_MISSING',
              message: 'Return to login and request a new OTP.',
            },
          });
          return false;
        }

        set({ error: null, isLoading: true });
        try {
          const response = await service.verifyOtp({
            otp,
            requestId: pending.requestId,
          });
          await applySession(response.data);
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoading: false });
          return false;
        }
      },

      async selectMembership(membershipId) {
        const membership = get().memberships.find(
          item => item.id === membershipId,
        );
        if (!membership || membership.status !== 'ACTIVE') {
          set({
            error: {
              code: 'INVALID_MEMBERSHIP',
              message: 'This workspace is not available for your account.',
            },
          });
          return false;
        }

        set({ error: null, isLoading: true });
        try {
          await sessionStorage.saveActiveMembershipId(membership.id);
          set({
            activeMembership: membership,
            error: null,
            isLoading: false,
            status: 'authenticated',
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoading: false });
          return false;
        }
      },

      async switchWorkspace() {
        const activeMemberships = get().memberships.filter(
          membership => membership.status === 'ACTIVE',
        );
        if (activeMemberships.length < 2) {
          return;
        }

        try {
          await sessionStorage.saveActiveMembershipId(null);
        } finally {
          set({
            activeMembership: null,
            error: null,
            status: 'membershipRequired',
          });
        }
      },

      async refreshSession() {
        try {
          const stored = await sessionStorage.read();
          if (!stored) {
            await get().expireSession();
            return false;
          }
          const response = await service.refreshSession(
            stored.tokens.refreshToken,
          );
          await sessionStorage.saveTokens(response.data);
          set({ accessTokenAvailable: true, error: null });
          return true;
        } catch {
          await get().expireSession();
          return false;
        }
      },

      async logout() {
        set({ isLoading: true });
        try {
          await service.logout();
        } catch {
          // Server logout failure must not block local session cleanup.
        } finally {
          await clearStoredSession();
          set({
            ...INITIAL_AUTH_STATE,
            isLoading: false,
            status: 'unauthenticated',
          });
        }
      },

      async expireSession() {
        await clearStoredSession();
        set({
          ...INITIAL_AUTH_STATE,
          isLoading: false,
          status: 'sessionExpired',
        });
      },

      clearError() {
        set({ error: null });
      },

      async resetAuthFlow() {
        await clearStoredSession();
        set({
          ...INITIAL_AUTH_STATE,
          isLoading: false,
          status: 'unauthenticated',
        });
      },
    };
  });
}

export const authStore = createAuthStore({
  service: mockAuthService,
  sessionStorage: authSessionStorage,
});

export function useAuthStore<T>(
  selector: (state: AuthStoreState) => T,
): T {
  return useStore(authStore, selector);
}
