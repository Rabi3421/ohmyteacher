import type { AuthSession, UserMembership } from '../../src/models/auth';
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
    school: {
      address: '',
      createdAt: '2026-01-01T00:00:00Z',
      email: '',
      id: 'school-1',
      name: 'Demo School',
      phone: '',
      status: 'ACTIVE',
      upiId: '',
    },
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

function setup(
  session = makeSession([makeMembership('membership-1', 'SCHOOL_ADMIN')]),
) {
  const service = {
    getCurrentSchool: jest.fn().mockResolvedValue({
      data: session.school,
      message: 'School loaded',
      success: true,
    }),
    getCurrentUser: jest.fn().mockResolvedValue({
      data: { memberships: session.memberships, user: session.user },
      message: 'Profile loaded',
      success: true,
    }),
    logout: jest.fn().mockResolvedValue({
      data: null,
      message: 'Logged out',
      success: true,
    }),
    refreshSession: jest.fn(),
    resendOtp: jest.fn().mockResolvedValue({
      data: {
        destinationMasked: '+91 ••••••3210',
        expiresInSeconds: 300,
        resendAvailableInSeconds: 30,
      },
      message: 'Sent again',
      success: true,
    }),
    requestOtp: jest.fn().mockResolvedValue({
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
    updateCurrentSchool: jest.fn().mockResolvedValue({
      data: session.school,
      message: 'School updated',
      success: true,
    }),
    updateCurrentUser: jest.fn().mockResolvedValue({
      data: { memberships: session.memberships, user: session.user },
      message: 'Profile updated',
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
  await setupResult.store.getState().requestOtp({
    mobile: '9876543210',
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
    expect(result.sessionStorage.saveTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      }),
    );
  });

  it('routes a verified super admin through the same login flow', async () => {
    const platformSession = makeSession([
      {
        id: 'platform-admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        userId: 'user-1',
      },
    ]);
    platformSession.school = undefined;
    const platformAccount = setup(platformSession);
    await platformAccount.store.getState().requestOtp({ mobile: '9999999999' });
    expect(await platformAccount.store.getState().verifyOtp('123456')).toBe(
      true,
    );
    expect(platformAccount.store.getState().status).toBe('authenticated');
    expect(platformAccount.store.getState().activeMembership?.role).toBe(
      'SUPER_ADMIN',
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
    const selected = await result.store.getState().selectMembership('inactive');
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

  it('routes an incomplete school admin to persisted onboarding', async () => {
    const session = makeSession([makeMembership('admin', 'SCHOOL_ADMIN')]);
    session.isNewUser = true;
    session.user.name = '';
    session.school = undefined;
    const result = setup(session);
    await requestAndVerify(result);
    expect(result.store.getState().status).toBe('onboardingRequired');
  });

  it('routes an inactive school to the inactive state', async () => {
    const session = makeSession([makeMembership('admin', 'SCHOOL_ADMIN')]);
    if (!session.school) throw new Error('Expected school fixture.');
    session.school.status = 'INACTIVE';
    const result = setup(session);
    await requestAndVerify(result);
    expect(result.store.getState().status).toBe('inactive');
    expect(result.store.getState().inactiveReason).toBe('SCHOOL_INACTIVE');
  });

  it('retries school onboarding without repeating a successful profile update', async () => {
    const session = makeSession([makeMembership('admin', 'SCHOOL_ADMIN')]);
    session.user.name = '';
    if (!session.school) throw new Error('Expected school fixture.');
    session.school.name = '';
    const result = setup(session);
    await requestAndVerify(result);
    const completedUser = { ...session.user, name: 'Asha Admin' };
    const completedSchool = { ...session.school, name: 'Demo School' };
    result.service.updateCurrentUser.mockResolvedValue({
      data: { memberships: session.memberships, user: completedUser },
      message: 'Profile updated',
      success: true,
    });
    result.service.updateCurrentSchool
      .mockRejectedValueOnce(
        new ApiClientError({
          kind: 'network',
          message: 'Unable to connect',
        }),
      )
      .mockResolvedValueOnce({
        data: completedSchool,
        message: 'School updated',
        success: true,
      });
    result.service.getCurrentUser.mockResolvedValue({
      data: { memberships: session.memberships, user: completedUser },
      message: 'Profile loaded',
      success: true,
    });
    result.service.getCurrentSchool.mockResolvedValue({
      data: completedSchool,
      message: 'School loaded',
      success: true,
    });
    result.sessionStorage.read.mockResolvedValue({
      activeMembershipId: null,
      tokens: session.tokens,
    });
    const input = {
      name: 'Asha Admin',
      school: { name: 'Demo School' },
    };

    expect(await result.store.getState().completeOnboarding(input)).toBe(false);
    expect(await result.store.getState().completeOnboarding(input)).toBe(true);
    expect(result.service.updateCurrentUser).toHaveBeenCalledTimes(1);
    expect(result.service.updateCurrentSchool).toHaveBeenCalledTimes(2);
    expect(result.store.getState().status).toBe('authenticated');
  });

  it.each(['teacher', 'future_role'])(
    'routes %s to the stable unsupported-role state without escalation',
    async unsupportedRole => {
      const session = makeSession([]);
      session.unsupportedRole = unsupportedRole;
      const result = setup(session);
      await requestAndVerify(result);
      expect(result.store.getState().status).toBe('unsupportedRole');
      expect(result.store.getState().activeMembership).toBeNull();
      expect(result.store.getState().accessTokenAvailable).toBe(true);
    },
  );

  it('prevents duplicate OTP verification submissions', async () => {
    const result = setup();
    let resolveVerification: (() => void) | undefined;
    result.service.verifyOtp.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveVerification = () =>
            resolve({
              data: makeSession([makeMembership('admin', 'SCHOOL_ADMIN')]),
              message: 'Verified',
              success: true,
            });
        }),
    );
    await result.store.getState().requestOtp({ mobile: '9876543210' });
    const first = result.store.getState().verifyOtp('123456');
    const second = result.store.getState().verifyOtp('123456');
    expect(await second).toBe(false);
    expect(result.service.verifyOtp).toHaveBeenCalledTimes(1);
    resolveVerification?.();
    await first;
  });

  it('resets resend timing only after a confirmed resend', async () => {
    const result = setup();
    await result.store.getState().requestOtp({ mobile: '9876543210' });
    const original = result.store.getState().pendingOtpRequest;
    result.service.resendOtp.mockRejectedValueOnce(
      new ApiClientError({ message: 'Please wait', status: 429 }),
    );
    expect(await result.store.getState().resendOtp()).toBe(false);
    expect(result.store.getState().pendingOtpRequest).toBe(original);
    expect(await result.store.getState().resendOtp()).toBe(true);
    expect(result.store.getState().pendingOtpRequest).not.toBe(original);
  });

  it('coalesces duplicate app-start restoration', async () => {
    const result = setup();
    result.sessionStorage.read.mockResolvedValue({
      activeMembershipId: null,
      tokens: makeSession([]).tokens,
    });
    let resolveRestore: (() => void) | undefined;
    result.service.restoreSession.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveRestore = () =>
            resolve({
              data: makeSession([makeMembership('admin', 'SCHOOL_ADMIN')]),
              message: 'Restored',
              success: true,
            });
        }),
    );
    const first = result.store.getState().initializeAuth();
    const second = result.store.getState().initializeAuth();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    expect(result.service.restoreSession).toHaveBeenCalledTimes(1);
    resolveRestore?.();
    await Promise.all([first, second]);
  });

  it('keeps secure credentials during a recoverable network startup failure', async () => {
    const result = setup();
    result.sessionStorage.read.mockResolvedValue({
      activeMembershipId: null,
      tokens: makeSession([]).tokens,
    });
    result.service.restoreSession.mockRejectedValue(
      new ApiClientError({
        code: 'NETWORK_ERROR',
        kind: 'network',
        message: 'Unable to connect',
      }),
    );
    await result.store.getState().initializeAuth();
    expect(result.store.getState().status).toBe('initializing');
    expect(result.store.getState().error?.kind).toBe('network');
    expect(result.sessionStorage.clear).not.toHaveBeenCalled();
  });

  it('always clears local state when remote logout fails', async () => {
    const result = setup();
    await requestAndVerify(result);
    result.service.logout.mockRejectedValue(new Error('offline'));
    await result.store.getState().logout();
    expect(result.sessionStorage.clear).toHaveBeenCalled();
    expect(result.store.getState().status).toBe('unauthenticated');
  });
});
