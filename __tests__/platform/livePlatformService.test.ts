import { ApiClientError } from '../../src/services/api/apiError';
import { LivePlatformService } from '../../src/services/platform/livePlatformService';

const school = {
  address: '',
  created_at: '2026-08-01T10:00:00Z',
  email: '',
  id: 11,
  is_active: true,
  name: 'Sunrise School',
  phone: '',
  upi_id: '',
};

const admin = {
  branch: null,
  date_joined: '2026-08-01T10:00:00Z',
  id: 21,
  is_active: true,
  name: 'Initial Admin',
  phone_number: '+919876543210',
  role: 'admin',
  school: 11,
};

function setup() {
  const client = {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  };
  return { client, service: new LivePlatformService(client) };
}

describe('LivePlatformService', () => {
  it('requests the authenticated dashboard path', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({
      active_schools: 1,
      success: true,
      this_month_collection: '0',
      total_branches: 1,
      total_schools: 1,
      total_students: 0,
      total_teachers: 0,
    });
    await service.getPlatformDashboard();
    expect(client.get).toHaveBeenCalledWith('/platform/dashboard/', {
      signal: undefined,
    });
  });

  it('requests the unfiltered school list and supports cancellation', async () => {
    const { client, service } = setup();
    const controller = new AbortController();
    client.get.mockResolvedValue({ schools: [school], success: true });
    await service.listSchools({ signal: controller.signal });
    expect(client.get).toHaveBeenCalledWith('/schools/', {
      signal: controller.signal,
    });
  });

  it('requests a validated school detail ID', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ school, success: true });
    await service.getSchool('11');
    expect(client.get).toHaveBeenCalledWith('/schools/11/', {
      signal: undefined,
    });
    await expect(service.getSchool('not-an-id')).rejects.toMatchObject({
      code: 'INVALID_SCHOOL_ID',
    });
  });

  it('sends the exact school and initial Admin creation body', async () => {
    const { client, service } = setup();
    client.post.mockResolvedValue({ admin, school, success: true });
    await service.createSchool({
      adminMobile: '9876543210',
      adminName: 'Initial Admin',
      schoolName: 'Sunrise School',
    });
    expect(client.post).toHaveBeenCalledWith('/schools/', {
      admin_name: 'Initial Admin',
      admin_phone_number: '9876543210',
      school_name: 'Sunrise School',
    });
  });

  it('maps duplicate Admin phone errors to the form field', async () => {
    const { client, service } = setup();
    client.post.mockRejectedValue(
      new ApiClientError({
        code: 'USER_EXISTS',
        kind: 'validation',
        message: 'This phone number is already registered.',
        status: 400,
      }),
    );
    await expect(
      service.createSchool({
        adminMobile: '9876543210',
        adminName: 'Initial Admin',
        schoolName: 'Sunrise School',
      }),
    ).rejects.toMatchObject({
      fieldErrors: { adminMobile: 'This phone number is already registered.' },
    });
  });

  it('patches only supported school fields', async () => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({
      school: { ...school, email: 'school@example.com' },
      success: true,
    });
    await service.updateSchool('11', {
      email: 'school@example.com',
      upiId: 'school@bank',
    });
    expect(client.patch).toHaveBeenCalledWith('/schools/11/', {
      email: 'school@example.com',
      upi_id: 'school@bank',
    });
  });

  it.each([
    ['INACTIVE', false],
    ['ACTIVE', true],
  ] as const)('patches %s status as a JSON boolean', async (status, value) => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({
      school: { ...school, is_active: value },
      success: true,
    });
    await service.setSchoolStatus('11', status);
    expect(client.patch).toHaveBeenCalledWith('/schools/11/status/', {
      is_active: value,
    });
  });

  it.each([400, 401, 403, 404, 409, 500])(
    'preserves normalized HTTP %s failures without mock fallback',
    async status => {
      const { client, service } = setup();
      client.get.mockRejectedValue(
        new ApiClientError({
          kind: status === 403 ? 'permission' : 'server',
          message: `Failure ${status}`,
          status,
        }),
      );
      await expect(service.getPlatformDashboard()).rejects.toMatchObject({
        message: `Failure ${status}`,
        status,
      });
    },
  );

  it('rejects malformed successful responses', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ success: true });
    await expect(service.listSchools()).rejects.toMatchObject({
      code: 'MALFORMED_PLATFORM_RESPONSE',
    });
  });
});
