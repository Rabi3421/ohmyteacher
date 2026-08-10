import { ApiClientError } from '../../src/services/api/apiError';
import { LiveBranchService } from '../../src/services/organization/liveBranchService';

const branch = {
  address: '',
  code: 'SCH11-B2',
  created_at: '2026-08-01T10:00:00Z',
  email: '',
  id: 21,
  is_active: true,
  name: 'Second Branch',
  phone: '',
  school: 11,
};

function setup() {
  const client = { get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  return { client, service: new LiveBranchService(client) };
}

describe('LiveBranchService', () => {
  it('loads the server-scoped unfiltered branch list with cancellation', async () => {
    const { client, service } = setup();
    const controller = new AbortController();
    client.get.mockResolvedValue({ branches: [branch], success: true });
    await service.listBranches({ signal: controller.signal });
    expect(client.get).toHaveBeenCalledWith('/branches/', {
      signal: controller.signal,
    });
  });

  it('loads a validated branch detail', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ branch, success: true });
    await service.getBranch('21');
    expect(client.get).toHaveBeenCalledWith('/branches/21/', {
      signal: undefined,
    });
    await expect(service.getBranch('another-school')).rejects.toMatchObject({
      code: 'INVALID_BRANCH_ID',
    });
  });

  it('creates without caller-controlled school, code, status, or Main flag', async () => {
    const { client, service } = setup();
    client.post.mockResolvedValue({ branch, success: true });
    await service.createBranch({ name: ' Second Branch ', phone: '' });
    expect(client.post).toHaveBeenCalledWith('/branches/', {
      name: 'Second Branch',
      phone: '',
    });
  });

  it('patches only supported changed fields', async () => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({ branch, success: true });
    await service.updateBranch('21', { email: ' branch@example.com ' });
    expect(client.patch).toHaveBeenCalledWith('/branches/21/', {
      email: 'branch@example.com',
    });
  });

  it.each([
    ['ACTIVE', true],
    ['INACTIVE', false],
  ] as const)('uses the dedicated %s status endpoint', async (status, value) => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({
      branch: { ...branch, is_active: value },
      success: true,
    });
    await service.setBranchStatus('21', status);
    expect(client.patch).toHaveBeenCalledWith('/branches/21/status/', {
      is_active: value,
    });
  });

  it.each([400, 401, 403, 404, 409, 500])('preserves HTTP %s without mock fallback', async status => {
    const { client, service } = setup();
    client.get.mockRejectedValue(
      new ApiClientError({ message: `Failure ${status}`, status }),
    );
    await expect(service.listBranches()).rejects.toMatchObject({ status });
  });

  it('rejects malformed successful responses', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ success: true });
    await expect(service.listBranches()).rejects.toMatchObject({
      code: 'MALFORMED_ORGANIZATION_RESPONSE',
    });
  });
});
