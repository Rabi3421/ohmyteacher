import { ApiClientError } from '../../src/services/api/apiError';
import {
  mapBackendRole,
  mapBackendSchool,
  mapBackendUser,
  mapOtpRequest,
  parseRefreshResponse,
  parseVerifyOtpResponse,
} from '../../src/services/auth/authMapper';

const user = {
  branch: 4,
  date_joined: '2026-01-01T00:00:00Z',
  id: 7,
  is_active: true,
  name: 'Asha Admin',
  phone_number: '+919876543210',
  role: 'admin',
  school: 3,
};

describe('live auth mappers', () => {
  it.each([
    ['super_admin', 'SUPER_ADMIN'],
    ['admin', 'SCHOOL_ADMIN'],
    ['branch_admin', 'BRANCH_ADMIN'],
    ['student', 'PARENT'],
    ['teacher', null],
    ['future_role', null],
  ] as const)('maps backend role %s safely', (backend, frontend) => {
    expect(mapBackendRole(backend)).toBe(frontend);
  });

  it('creates one scoped frontend membership from a supported user', () => {
    const identity = mapBackendUser(user);
    expect(identity.user).toMatchObject({
      id: '7',
      mobile: '+919876543210',
      name: 'Asha Admin',
      status: 'ACTIVE',
    });
    expect(identity.memberships).toEqual([
      expect.objectContaining({
        branchId: '4',
        role: 'SCHOOL_ADMIN',
        schoolId: '3',
      }),
    ]);
  });

  it('keeps unsupported roles authenticated without memberships', () => {
    const identity = mapBackendUser({ ...user, role: 'teacher' });
    expect(identity.memberships).toEqual([]);
    expect(identity.unsupportedRole).toBe('teacher');
  });

  it('rejects malformed user data at the API boundary', () => {
    expect(() => mapBackendUser({ ...user, id: '7' })).toThrow(ApiClientError);
  });

  it('maps OTP expiry and cooldown without fabricating a request id', () => {
    expect(
      mapOtpRequest(
        { expires_in_minutes: 5, message: 'Sent', success: true },
        '9876543210',
      ),
    ).toEqual({
      destinationMasked: '+91 ••••••3210',
      expiresInSeconds: 300,
      resendAvailableInSeconds: 30,
    });
  });

  it('accepts a valid verification envelope', () => {
    expect(
      parseVerifyOtpResponse({
        access: 'access',
        is_new_user: true,
        message: 'Signup complete',
        refresh: 'refresh',
        success: true,
        user,
      }).is_new_user,
    ).toBe(true);
  });

  it.each(['access', 'refresh'] as const)(
    'rejects verification with a missing %s token',
    token => {
      const response = {
        access: 'access',
        is_new_user: false,
        message: 'Login successful',
        refresh: 'refresh',
        success: true,
        user,
      };
      delete response[token];
      expect(() => parseVerifyOtpResponse(response)).toThrow(ApiClientError);
    },
  );

  it('preserves an optional rotated refresh token', () => {
    expect(
      parseRefreshResponse({
        access: 'new-access',
        refresh: 'new-refresh',
        success: true,
      }),
    ).toEqual({
      access: 'new-access',
      refresh: 'new-refresh',
      success: true,
    });
  });

  it('maps school snake_case fields to the domain model', () => {
    expect(
      mapBackendSchool({
        address: 'Bhubaneswar',
        created_at: '2026-01-01T00:00:00Z',
        email: 'school@example.com',
        id: 3,
        is_active: true,
        name: 'Demo School',
        phone: '9876543210',
        upi_id: 'school@bank',
      }),
    ).toMatchObject({ id: '3', status: 'ACTIVE', upiId: 'school@bank' });
  });
});
