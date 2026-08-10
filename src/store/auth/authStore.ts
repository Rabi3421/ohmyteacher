import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type {
  AuthIdentity,
  AuthOnboardingInput,
  AuthSchool,
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
import { authService } from '../../services/auth/authServiceResolver';
import {
  authSessionStorage,
  type AuthSessionStorage,
} from '../../services/auth/authSessionStorage';

export type AuthStatus =
  | 'initializing'
  | 'unauthenticated'
  | 'otpRequired'
  | 'membershipRequired'
  | 'onboardingRequired'
  | 'unsupportedRole'
  | 'authenticated'
  | 'sessionExpired'
  | 'inactive';

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  school: AuthSchool | null;
  memberships: UserMembership[];
  activeMembership: UserMembership | null;
  pendingOtpRequest: PendingOtpRequest | null;
  accessTokenAvailable: boolean;
  isLoading: boolean;
  error: ApiError | null;
  inactiveReason: InactiveReason | null;
  unsupportedRole: string | null;
}

export interface AuthActions {
  initializeAuth: () => Promise<void>;
  requestSchoolOtp: (input: SchoolOtpInput) => Promise<boolean>;
  requestPlatformOtp: (input: PlatformOtpInput) => Promise<boolean>;
  resendOtp: () => Promise<boolean>;
  verifyOtp: (otp: string) => Promise<boolean>;
  loadOnboarding: () => Promise<void>;
  completeOnboarding: (input: AuthOnboardingInput) => Promise<boolean>;
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
  school: null,
  status: 'initializing',
  unsupportedRole: null,
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
            kind: 'timeout',
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
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      fieldErrors: error.fieldErrors,
      kind: error.kind,
      message: error.message,
      nonFieldErrors: error.nonFieldErrors,
      retryable: error.retryable,
      status: error.status,
    };
  }
  return {
    code: 'UNEXPECTED_ERROR',
    kind: 'unknown',
    message: 'Something went wrong. Please try again.',
  };
}

function phoneFromPending(pending: PendingOtpRequest): string {
  return pending.context.kind === 'school'
    ? pending.context.input.mobile
    : pending.context.input.identifier;
}

function onboardingComplete(user: AuthUser, school: AuthSchool | undefined): boolean {
  return Boolean(user.name.trim() && school?.name.trim());
}

function identitySession(
  identity: AuthIdentity,
  tokens: AuthTokens,
  school?: AuthSchool,
): AuthSession {
  return { ...identity, school, tokens };
}

export function createAuthStore({
  service,
  sessionStorage,
}: AuthStoreDependencies): StoreApi<AuthStoreState> {
  return createStore<AuthStoreState>()((set, get) => {
    let initializationPromise: Promise<void> | null = null;

    async function clearStoredSession(): Promise<void> {
      try {
        await sessionStorage.clear();
      } catch {
        // Navigation must still leave protected state if Keychain is unavailable.
      }
    }

    async function persistTokens(tokens: AuthTokens): Promise<void> {
      try {
        await sessionStorage.saveTokens(tokens);
      } catch (error) {
        await clearStoredSession();
        throw error;
      }
    }

    async function applySession(
      session: AuthSession,
      options: {
        persistTokens?: boolean;
        preferredMembershipId?: string | null;
      } = {},
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

      if (session.school?.status === 'INACTIVE') {
        await clearStoredSession();
        set({
          ...INITIAL_AUTH_STATE,
          inactiveReason: 'SCHOOL_INACTIVE',
          school: session.school,
          status: 'inactive',
          user: session.user,
        });
        return;
      }

      if (options.persistTokens !== false) {
        await persistTokens(session.tokens);
      }

      if (session.unsupportedRole) {
        set({
          accessTokenAvailable: true,
          activeMembership: null,
          error: null,
          inactiveReason: null,
          isLoading: false,
          memberships: [],
          pendingOtpRequest: null,
          school: session.school ?? null,
          status: 'unsupportedRole',
          unsupportedRole: session.unsupportedRole,
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

      const preferredMembership = activeMemberships.find(
        membership => membership.id === options.preferredMembershipId,
      );
      const selectedMembership =
        preferredMembership ??
        (activeMemberships.length === 1 ? activeMemberships[0] : null);
      await sessionStorage.saveActiveMembershipId(
        selectedMembership?.id ?? null,
      );

      const needsOnboarding = Boolean(
        selectedMembership?.role === 'SCHOOL_ADMIN' &&
          !onboardingComplete(session.user, session.school),
      );
      set({
        accessTokenAvailable: true,
        activeMembership: selectedMembership,
        error: null,
        inactiveReason: null,
        isLoading: false,
        memberships: session.memberships,
        pendingOtpRequest: null,
        school: session.school ?? null,
        status: needsOnboarding
          ? 'onboardingRequired'
          : selectedMembership
            ? 'authenticated'
            : 'membershipRequired',
        unsupportedRole: null,
        user: session.user,
      });
    }

    async function requestOtp(
      context:
        | { kind: 'school'; input: SchoolOtpInput }
        | { kind: 'platform'; input: PlatformOtpInput },
    ): Promise<boolean> {
      if (get().isLoading) return false;
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

    async function performRestore(): Promise<void> {
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

        let tokens = stored.tokens;
        if (new Date(tokens.expiresAt).getTime() <= Date.now()) {
          const refreshed = await withInitializationTimeout(
            service.refreshSession(tokens.refreshToken),
          );
          tokens = refreshed.data;
          await persistTokens(tokens);
        }

        const response = await withInitializationTimeout(
          service.restoreSession(tokens.accessToken),
        );
        await applySession(response.data, {
          persistTokens: false,
          preferredMembershipId: stored.activeMembershipId,
        });
      } catch (error) {
        const normalized = normalizeError(error);
        if (normalized.code === 'SESSION_EXPIRED' || normalized.status === 401) {
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
          accessTokenAvailable: true,
          error: normalized,
          isLoading: false,
          status: 'initializing',
        });
      }
    }

    function restoreOnce(): Promise<void> {
      if (!initializationPromise) {
        initializationPromise = performRestore().finally(() => {
          initializationPromise = null;
        });
      }
      return initializationPromise;
    }

    return {
      ...INITIAL_AUTH_STATE,
      initializeAuth: restoreOnce,
      restoreSession: restoreOnce,

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
        if (get().isLoading) return false;

        set({ error: null, isLoading: true });
        try {
          const response = await service.resendOtp(phoneFromPending(pending));
          set({
            error: null,
            isLoading: false,
            pendingOtpRequest: {
              ...response.data,
              context: pending.context,
              requestedAt: new Date().toISOString(),
            },
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoading: false });
          return false;
        }
      },

      async verifyOtp(otp) {
        if (get().isLoading) return false;
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
            phoneNumber: phoneFromPending(pending),
            requestId: pending.requestId,
          });
          await applySession(response.data);
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoading: false });
          return false;
        }
      },

      async loadOnboarding() {
        if (get().isLoading) return;
        set({ error: null, isLoading: true });
        try {
          const [identity, school, stored] = await Promise.all([
            service.getCurrentUser(),
            service.getCurrentSchool(),
            sessionStorage.read(),
          ]);
          if (!stored) {
            await get().expireSession();
            return;
          }
          await applySession(
            identitySession(identity.data, stored.tokens, school.data),
            { persistTokens: false },
          );
        } catch (error) {
          const normalized = normalizeError(error);
          if (normalized.status === 401) {
            await get().expireSession();
          } else {
            set({ error: normalized, isLoading: false });
          }
        }
      },

      async completeOnboarding(input) {
        if (get().isLoading) return false;
        const fieldErrors: Record<string, string> = {};
        if (!input.name.trim()) fieldErrors.name = 'Name is required.';
        if (!input.school.name.trim()) {
          fieldErrors.schoolName = 'School name is required.';
        }
        if (Object.keys(fieldErrors).length > 0) {
          set({
            error: {
              code: 'VALIDATION_ERROR',
              fieldErrors,
              kind: 'validation',
              message: 'Complete the required fields.',
            },
          });
          return false;
        }

        set({ error: null, isLoading: true });
        try {
          const currentUser = get().user;
          if (!currentUser) {
            throw new ApiClientError({
              code: 'ONBOARDING_SESSION_MISSING',
              kind: 'authentication',
              message: 'Your session could not be restored. Please sign in again.',
              status: 401,
            });
          }
          let identity: AuthIdentity = {
            memberships: get().memberships,
            user: currentUser,
          };
          if (identity.user.name.trim() !== input.name.trim()) {
            identity = (await service.updateCurrentUser(input.name.trim())).data;
            set({ memberships: identity.memberships, user: identity.user });
          }

          await service.updateCurrentSchool(input.school);
          const [confirmedIdentity, confirmedSchool, stored] = await Promise.all([
            service.getCurrentUser(),
            service.getCurrentSchool(),
            sessionStorage.read(),
          ]);
          if (!stored) {
            await get().expireSession();
            return false;
          }
          await applySession(
            identitySession(
              confirmedIdentity.data,
              stored.tokens,
              confirmedSchool.data,
            ),
            { persistTokens: false },
          );
          return get().status === 'authenticated';
        } catch (error) {
          const normalized = normalizeError(error);
          if (normalized.status === 401) {
            await get().expireSession();
          } else {
            set({ error: normalized, isLoading: false });
          }
          return false;
        }
      },

      async selectMembership(membershipId) {
        const membership = get().memberships.find(item => item.id === membershipId);
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
        if (activeMemberships.length < 2) return;
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
          await persistTokens(response.data);
          set({ accessTokenAvailable: true, error: null });
          return true;
        } catch {
          await get().expireSession();
          return false;
        }
      },

      async logout() {
        if (get().isLoading) return;
        set({ isLoading: true });
        try {
          await service.logout();
        } catch {
          // Local logout is deliberate even when the token is already invalid
          // or the backend is unreachable.
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
  service: authService,
  sessionStorage: authSessionStorage,
});

export function useAuthStore<T>(selector: (state: AuthStoreState) => T): T {
  return useStore(authStore, selector);
}
