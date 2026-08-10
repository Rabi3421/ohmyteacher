import { ApiClientError } from '../../src/services/api/apiError';
import { LiveCurrentOrganizationService } from '../../src/services/organization/liveCurrentOrganizationService';

const school = {
  address: '1 School Road',
  created_at: '2026-08-01T10:00:00Z',
  email: 'school@example.com',
  id: 11,
  is_active: true,
  name: 'Sunrise School',
  phone: '9876543210',
  upi_id: 'school@bank',
};

function setup() {
  const client = { get: jest.fn(), patch: jest.fn() };
  return { client, service: new LiveCurrentOrganizationService(client) };
}

describe('LiveCurrentOrganizationService', () => {
  it('loads the authenticated current school without a school ID', async () => {
    const { client, service } = setup();
    const controller = new AbortController();
    client.get.mockResolvedValue({ school, success: true });
    await service.getCurrentSchool({ signal: controller.signal });
    expect(client.get).toHaveBeenCalledWith('/school/', {
      signal: controller.signal,
    });
  });

  it('patches only exact writable changed fields', async () => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({ school, success: true });
    await service.updateCurrentSchool({ name: ' Sunrise ', upiId: 'school@bank' });
    expect(client.patch).toHaveBeenCalledWith('/school/', {
      name: 'Sunrise',
      upi_id: 'school@bank',
    });
  });

  it('maps validation fields and preserves normalized live errors', async () => {
    const { client, service } = setup();
    client.patch.mockRejectedValue(
      new ApiClientError({
        fieldErrors: { upi_id: 'Invalid' },
        kind: 'validation',
        message: 'Invalid data',
        status: 400,
      }),
    );
    await expect(service.updateCurrentSchool({ upiId: 'invalid' })).rejects.toMatchObject({
      fieldErrors: { upiId: 'Invalid' },
      status: 400,
    });
  });

  it.each([401, 403, 404, 409, 500])('never falls back after HTTP %s', async status => {
    const { client, service } = setup();
    client.get.mockRejectedValue(
      new ApiClientError({ message: `Failure ${status}`, status }),
    );
    await expect(service.getCurrentSchool()).rejects.toMatchObject({ status });
  });

  it('rejects malformed successful school responses', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ success: true });
    await expect(service.getCurrentSchool()).rejects.toMatchObject({
      code: 'MALFORMED_AUTH_RESPONSE',
    });
  });
});
