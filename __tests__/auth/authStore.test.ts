import type {
  AuthSession,
  UserMembership,
} from '../../src/models/auth';
import { ApiClientError } from '../../src/services/api/apiError';
import type { AuthService } from '../../src/services/auth/authService';
import type { AuthSessionStorage } from '../../src/services/auth/authSessionStorage';
import { createAuthStore } from '../../src/store/auth/authStore';

function makeMembership(
  id: string,
  role: UserMembership['role'],
  status: UserMembership['status'] = 'ACTIVE',
): UserMembership {
  return {
    id,
    role,
    schoolId: 'school-1',
    schoolName: 'Demo School',
    status,
    userId: 'user-1',
  };
}

function makeSession(
  memberships: UserMembership[],
  userStatus: AuthSession['user']['status'] = 'ACTIVE',
): AuthSession {
  return {
    memberships,
    tokens: {
      accessToken: 'access-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      refreshToken: 'refresh-token',
    },
    user: {
      id: 'user-1',
      name: 'Test User',
      status: userStatus,
    },
  };
}

function setup(session = makeSession([makeMembership('membership-1', 'SCHOOL_ADMIN')])) {
  const service = {
    logout: jest.fn().mockResolvedValue({
      data: null,
      message: 'Logged out',
      success: true,
    }),
    refreshSession: jest.fn(),
    requestPlatformOtp: jest.fn(),
    requestSchoolOtp: jest.fn().mockResolvedValue({
      data: {
        destinationMasked: '+91 ••••••3210',
        expiresInSeconds: 300,
        requestId: 'request-1',
        resendAvailableInSeconds: 30,
      },
      message: 'Sent',
      success: true,
    }),
    restoreSession: jest.fn().mockResolvedValue({
      data: session,
      message: 'Restored',
      success: true,
    }),
    verifyOtp: jest.fn().mockResolvedValue({
      data: session,
      message: 'Verified',
      success: true,
    }),
  } as jest.Mocked<AuthService>;
  const sessionStorage = {
    clear: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue(null),
    saveActiveMembershipId: jest.fn().mockResolvedValue(undefined),
    saveTokens: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<AuthSessionStorage>;
  const store = createAuthStore({ service, sessionStorage });
  return { service, sessionStorage, store };
}

async function requestAndVerify(
  setupResult: ReturnType<typeof setup>,
): Promise<void> {
  await setupResult.store.getState().requestSchoolOtp({
    mobile: '9876543210',
    schoolCode: 'OMT001',
  });
  await setupResult.store.getState().verifyOtp('123456');
}

describe('auth store', () => {
  it('initializes as unauthenticated when no stored session exists', async () => {
    const { store } = setup();
    await store.getState().initializeAuth();
    expect(store.getState().status).toBe('unauthenticated');
    expect(store.getState().accessTokenAvailable).toBe(false);
  });

  it('auto-selects one active membership after OTP verification', async () => {
    const result = setup();
    await requestAndVerify(result);
    expect(result.store.getState().status).toBe('authenticated');
    expect(result.store.getState().activeMembership?.role).toBe('SCHOOL_ADMIN');
    expect(result.sessionStorage.saveActiveMembershipId).toHaveBeenCalledWith(
      'membership-1',
    );
  });

  it('requires workspace selection for multiple memberships', async () => {
    const result = setup(
      makeSession([
        makeMembership('parent', 'PARENT'),
        makeMembership('accountant', 'ACCOUNTANT'),
      ]),
    );
    await requestAndVerify(result);
    expect(result.store.getState().status).toBe('membershipRequired');
    expect(result.store.getState().activeMembership).toBeNull();

    await result.store.getState().selectMembership('accountant');
    expect(result.store.getState().status).toBe('authenticated');
    expect(result.store.getState().activeMembership?.role).toBe('ACCOUNTANT');
  });

  it('rejects inactive workspace selection', async () => {
    const result = setup(
      makeSession([
        makeMembership('active', 'PARENT'),
        makeMembership('inactive', 'ACCOUNTANT', 'INACTIVE'),
      ]),
    );
    await requestAndVerify(result);
    const selected = await result.store
      .getState()
      .selectMembership('inactive');
    expect(selected).toBe(false);
    expect(result.store.getState().error?.code).toBe('INVALID_MEMBERSHIP');
  });

  it('clears local session state during logout', async () => {
    const result = setup();
    await requestAndVerify(result);
    await result.store.getState().logout();
    expect(result.service.logout).toHaveBeenCalledTimes(1);
    expect(result.sessionStorage.clear).toHaveBeenCalled();
    expect(result.store.getState().status).toBe('unauthenticated');
    expect(result.store.getState().activeMembership).toBeNull();
  });

  it('expires the session and clears protected state', async () => {
    const result = setup();
    await requestAndVerify(result);
    await result.store.getState().expireSession();
    expect(result.store.getState().status).toBe('sessionExpired');
    expect(result.store.getState().user).toBeNull();
  });

  it('routes inactive users and memberships safely', async () => {
    const inactiveUser = setup(
      makeSession([makeMembership('membership-1', 'PARENT')], 'INACTIVE'),
    );
    await requestAndVerify(inactiveUser);
    expect(inactiveUser.store.getState().status).toBe('inactive');
    expect(inactiveUser.store.getState().inactiveReason).toBe('USER_INACTIVE');

    const inactiveMembership = setup(
      makeSession([
        makeMembership('membership-inactive', 'PARENT', 'INACTIVE'),
      ]),
    );
    await requestAndVerify(inactiveMembership);
    expect(inactiveMembership.store.getState().inactiveReason).toBe(
      'MEMBERSHIP_INACTIVE',
    );
  });

  it('handles an expired restored session', async () => {
    const result = setup();
    result.sessionStorage.read.mockResolvedValue({
      activeMembershipId: null,
      tokens: {
        accessToken: 'expired',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        refreshToken: 'refresh-token',
      },
    });
    result.service.restoreSession.mockRejectedValue(
      new ApiClientError({
        code: 'SESSION_EXPIRED',
        message: 'Expired',
        status: 401,
      }),
    );
    await result.store.getState().initializeAuth();
    expect(result.store.getState().status).toBe('sessionExpired');
  });
});
