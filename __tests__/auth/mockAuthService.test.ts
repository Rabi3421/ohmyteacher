import { ApiClientError } from '../../src/services/api/apiError';
import { MOCK_AUTH } from '../../src/services/auth/authFixtures';
import {
  mockAuthService,
  resetMockAuthService,
} from '../../src/services/auth/mockAuthService';

async function finishMockDelay<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockAuthService();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mock authentication scenarios', () => {
  it.each([
    ['9876543210', 'SCHOOL_ADMIN'],
    ['9876543211', 'ACCOUNTANT'],
    ['9876543215', 'BRANCH_ADMIN'],
    ['9876543216', 'RECEPTIONIST'],
    ['9876543217', 'STUDENT'],
  ] as const)('verifies school fixture %s as %s', async (mobile, role) => {
    const request = await finishMockDelay(
      mockAuthService.requestOtp({
        mobile,
      }),
    );
    const session = await finishMockDelay(
      mockAuthService.verifyOtp({
        otp: MOCK_AUTH.otp,
        requestId: request.data.requestId,
      }),
    );
    expect(session.data.memberships[0].role).toBe(role);
  });

  it('returns multiple verified memberships without selecting a role', async () => {
    const request = await finishMockDelay(
      mockAuthService.requestOtp({
        mobile: '9876543212',
      }),
    );
    const session = await finishMockDelay(
      mockAuthService.verifyOtp({
        otp: MOCK_AUTH.otp,
        requestId: request.data.requestId,
      }),
    );
    expect(session.data.memberships.map(item => item.role)).toEqual([
      'PARENT',
      'ACCOUNTANT',
    ]);
  });

  it('includes child context for parent workspaces', async () => {
    const request = await finishMockDelay(
      mockAuthService.requestOtp({
        mobile: '9876543213',
      }),
    );
    const session = await finishMockDelay(
      mockAuthService.verifyOtp({
        otp: MOCK_AUTH.otp,
        requestId: request.data.requestId,
      }),
    );
    expect(session.data.memberships.map(item => item.studentName)).toEqual([
      'Aarav Kumar',
      'Anaya Kumar',
    ]);
  });

  it('verifies the platform administrator fixture', async () => {
    const request = await finishMockDelay(
      mockAuthService.requestOtp({ mobile: '9999999999' }),
    );
    const session = await finishMockDelay(
      mockAuthService.verifyOtp({
        otp: MOCK_AUTH.otp,
        requestId: request.data.requestId,
      }),
    );
    expect(session.data.memberships[0].role).toBe('SUPER_ADMIN');
  });

  it('normalizes unknown-account and OTP errors', async () => {
    const unknownAccount = mockAuthService.requestOtp({
      mobile: '9000000000',
    });
    jest.runOnlyPendingTimers();
    await expect(unknownAccount).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
    });

    const request = await finishMockDelay(
      mockAuthService.requestOtp({
        mobile: '9876543210',
      }),
    );
    const invalidOtp = mockAuthService.verifyOtp({
      otp: '000000',
      requestId: request.data.requestId,
    });
    jest.runOnlyPendingTimers();
    await expect(invalidOtp).rejects.toBeInstanceOf(ApiClientError);
    await expect(invalidOtp).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });
});
