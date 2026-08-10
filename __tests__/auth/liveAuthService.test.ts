import { ApiClientError } from '../../src/services/api/apiError';
import {
  createLiveAuthService,
  LiveAuthRepository,
} from '../../src/services/auth/liveAuthService';

const backendUser = {
  branch: null,
  date_joined: '2026-01-01T00:00:00Z',
  id: 7,
  is_active: true,
  name: 'Asha Admin',
  phone_number: '9876543210',
  role: 'admin',
  school: 3,
};

const backendSchool = {
  address: 'Bhubaneswar',
  created_at: '2026-01-01T00:00:00Z',
  email: 'school@example.com',
  id: 3,
  is_active: true,
  name: 'Demo School',
  phone: '9876543210',
  upi_id: 'school@bank',
};

function setupRepository() {
  const client = {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  };
  return { client, repository: new LiveAuthRepository(client) };
}

describe('LiveAuthRepository', () => {
  it('maps the send OTP request and response', async () => {
    const { client, repository } = setupRepository();
    client.post.mockResolvedValue({
      expires_in_minutes: 5,
      message: 'OTP sent successfully',
      success: true,
    });

    const response = await repository.sendOtp('98765 43210');

    expect(client.post).toHaveBeenCalledWith(
      '/auth/send-otp/',
      { phone_number: '9876543210' },
      { auth: 'none' },
    );
    expect(response.data.expiresInSeconds).toBe(300);
    expect(response.data.requestId).toBeUndefined();
  });

  it('maps the resend OTP request independently', async () => {
    const { client, repository } = setupRepository();
    client.post.mockResolvedValue({
      expires_in_minutes: 5,
      message: 'OTP sent successfully',
      success: true,
    });
    await repository.resendOtp('9876543210');
    expect(client.post).toHaveBeenCalledWith(
      '/auth/resend-otp/',
      { phone_number: '9876543210' },
      { auth: 'none' },
    );
  });

  it.each([false, true])(
    'maps verification success when is_new_user is %s',
    async isNewUser => {
      const { client, repository } = setupRepository();
      client.post.mockResolvedValue({
        access: 'access-token',
        is_new_user: isNewUser,
        message: isNewUser ? 'Signup complete' : 'Login successful',
        refresh: 'refresh-token',
        success: true,
        user: backendUser,
      });
      const response = await repository.verifyOtp('9876543210', '123456');
      expect(client.post).toHaveBeenCalledWith(
        '/auth/verify-otp/',
        { otp: '123456', phone_number: '9876543210' },
        { auth: 'none' },
      );
      expect(response.data.isNewUser).toBe(isNewUser);
      expect(response.data.tokens).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    },
  );

  it('rejects a malformed verification response', async () => {
    const { client, repository } = setupRepository();
    client.post.mockResolvedValue({ success: true });
    await expect(
      repository.verifyOtp('9876543210', '123456'),
    ).rejects.toMatchObject({ code: 'MALFORMED_AUTH_RESPONSE' });
  });

  it('maps incorrect OTP errors to the OTP field', async () => {
    const { client, repository } = setupRepository();
    client.post.mockRejectedValue(
      new ApiClientError({
        code: 'INVALID_OTP',
        kind: 'validation',
        message: 'Invalid OTP',
        status: 400,
      }),
    );
    await expect(
      repository.verifyOtp('9876543210', '000000'),
    ).rejects.toMatchObject({ fieldErrors: { otp: 'Invalid OTP' } });
  });

  it('fetches and updates the authenticated profile', async () => {
    const { client, repository } = setupRepository();
    client.get.mockResolvedValue({ success: true, user: backendUser });
    client.patch.mockResolvedValue({
      success: true,
      user: { ...backendUser, name: 'Updated Name' },
    });
    expect((await repository.getCurrentUser()).data.user.name).toBe(
      'Asha Admin',
    );
    expect((await repository.updateCurrentUser('Updated Name')).data.user.name).toBe(
      'Updated Name',
    );
    expect(client.get).toHaveBeenCalledWith('/auth/me/');
    expect(client.patch).toHaveBeenCalledWith('/auth/me/', {
      name: 'Updated Name',
    });
  });

  it('fetches and updates school onboarding fields', async () => {
    const { client, repository } = setupRepository();
    client.get.mockResolvedValue({ success: true, school: backendSchool });
    client.patch.mockResolvedValue({ success: true, school: backendSchool });
    expect((await repository.getCurrentSchool()).data.upiId).toBe('school@bank');
    await repository.updateCurrentSchool({
      address: 'Bhubaneswar',
      email: 'school@example.com',
      name: 'Demo School',
      phone: '9876543210',
      upiId: 'school@bank',
    });
    expect(client.get).toHaveBeenCalledWith('/school/', {
      signal: undefined,
    });
    expect(client.patch).toHaveBeenCalledWith('/school/', {
      address: 'Bhubaneswar',
      email: 'school@example.com',
      name: 'Demo School',
      phone: '9876543210',
      upi_id: 'school@bank',
    });
  });

  it('preserves the old refresh token when rotation omits one', async () => {
    const { client, repository } = setupRepository();
    client.post.mockResolvedValue({ access: 'new-access', success: true });
    const response = await repository.refreshSession('old-refresh');
    expect(response.data.refreshToken).toBe('old-refresh');
  });

  it('sends the refresh token in the exact logout shape', async () => {
    const { client, repository } = setupRepository();
    client.post.mockResolvedValue({ message: 'Logged out', success: true });
    await repository.logout('refresh-token');
    expect(client.post).toHaveBeenCalledWith(
      '/auth/logout/',
      { refresh: 'refresh-token' },
      { auth: 'none' },
    );
  });
});

describe('live auth service restoration', () => {
  it('loads school completion state only for a school admin', async () => {
    const { client, repository } = setupRepository();
    client.get
      .mockResolvedValueOnce({ success: true, user: backendUser })
      .mockResolvedValueOnce({ success: true, school: backendSchool });
    const sessionStorage = {
      clear: jest.fn(),
      read: jest.fn().mockResolvedValue({
        activeMembershipId: null,
        tokens: {
          accessToken: 'access',
          expiresAt: '2099-01-01T00:00:00Z',
          refreshToken: 'refresh',
        },
      }),
      saveActiveMembershipId: jest.fn(),
      saveTokens: jest.fn(),
    };
    const service = createLiveAuthService({ repository, sessionStorage });
    const response = await service.restoreSession('access');
    expect(client.get).toHaveBeenNthCalledWith(1, '/auth/me/');
    expect(client.get).toHaveBeenNthCalledWith(2, '/school/', {
      signal: undefined,
    });
    expect(response.data.school?.name).toBe('Demo School');
  });
});
