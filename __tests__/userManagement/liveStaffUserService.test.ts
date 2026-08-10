import type { OrganizationBranch } from '../../src/models/currentOrganization';
import { ApiClientError } from '../../src/services/api/apiError';
import type { BranchService } from '../../src/services/organization/branchService';
import { LiveStaffUserService } from '../../src/services/userManagement/liveStaffUserService';

const branch: OrganizationBranch = {
  address: '',
  code: 'SCH11-B1',
  createdAt: '2026-08-01T10:00:00Z',
  email: '',
  id: '21',
  name: 'Main Branch',
  phone: '',
  schoolId: '11',
  status: 'ACTIVE',
};

const user = {
  branch: 21,
  date_joined: '2026-08-01T10:00:00Z',
  id: 31,
  is_active: true,
  name: 'Teacher One',
  phone_number: '+919111100003',
  role: 'teacher',
  school: 11,
};

function setup() {
  const client = { get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  const branchService = {
    listBranches: jest.fn().mockResolvedValue({
      data: { items: [branch], pagination: null, totalItems: 1 },
      message: 'ok',
      success: true,
    }),
  } as unknown as BranchService;
  return { branchService, client, service: new LiveStaffUserService(client, branchService) };
}

describe('LiveStaffUserService', () => {
  it('uses only GET /users/ and applies filters locally', async () => {
    const { client, service } = setup();
    const controller = new AbortController();
    client.get.mockResolvedValue({ success: true, users: [user, { ...user, id: 32, name: 'Branch Admin', role: 'branch_admin' }] });
    const response = await service.listStaff({ role: 'TEACHER', search: 'teacher' }, { signal: controller.signal });
    expect(client.get).toHaveBeenCalledWith('/users/', { signal: controller.signal });
    expect(response.data.items.map(item => item.id)).toEqual(['31']);
  });

  it('loads a validated detail with no school ID in the path', async () => {
    const { client, service } = setup();
    client.get.mockResolvedValue({ success: true, user });
    await service.getStaff('31');
    expect(client.get).toHaveBeenCalledWith('/users/31/', { signal: undefined });
    await expect(service.getStaff('mock-membership')).rejects.toMatchObject({ code: 'INVALID_STAFF_ID' });
  });

  it('creates with the exact supported body after validating the live active branch', async () => {
    const { client, service } = setup();
    client.post.mockResolvedValue({ success: true, user });
    await service.createStaff({ branchId: '21', mobile: '9111100003', name: 'Teacher One', role: 'TEACHER' });
    expect(client.post).toHaveBeenCalledWith('/users/', {
      branch: 21,
      name: 'Teacher One',
      phone_number: '9111100003',
      role: 'teacher',
    });
  });

  it('rejects mock, inaccessible or inactive branch IDs before mutation', async () => {
    const { client, service } = setup();
    await expect(service.createStaff({ branchId: 'branch-mock', mobile: '9111100003', name: 'Teacher One', role: 'TEACHER' })).rejects.toMatchObject({ code: 'INVALID_STAFF_BRANCH' });
    expect(client.post).not.toHaveBeenCalled();
  });

  it('patches only name or one branch and uses the dedicated status endpoint', async () => {
    const { client, service } = setup();
    client.patch.mockResolvedValue({ success: true, user });
    await service.updateStaff('31', { name: 'Updated' });
    expect(client.patch).toHaveBeenNthCalledWith(1, '/users/31/', { name: 'Updated' });
    await service.setStaffStatus('31', 'INACTIVE');
    expect(client.patch).toHaveBeenNthCalledWith(2, '/users/31/status/', { is_active: false });
  });

  it('maps backend validation fields and never falls back to mock', async () => {
    const { client, service } = setup();
    client.post.mockRejectedValue(new ApiClientError({ fieldErrors: { phone_number: 'Duplicate' }, message: 'Invalid', status: 400 }));
    await expect(service.createStaff({ branchId: '21', mobile: '9111100003', name: 'Teacher One', role: 'TEACHER' })).rejects.toMatchObject({
      fieldErrors: { mobile: 'Duplicate' },
      status: 400,
    });
  });

  it.each([401, 403, 404, 409, 500])('preserves HTTP %s errors', async status => {
    const { client, service } = setup();
    client.get.mockRejectedValue(new ApiClientError({ message: `Failure ${status}`, status }));
    await expect(service.listStaff()).rejects.toMatchObject({ status });
  });

  it('rejects malformed success and locks duplicate mutations', async () => {
    const { client, service } = setup();
    let release: ((value: unknown) => void) | undefined;
    client.post.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const first = service.createStaff({ branchId: '21', mobile: '9111100003', name: 'Teacher One', role: 'TEACHER' });
    await Promise.resolve();
    await expect(service.createStaff({ branchId: '21', mobile: '9111100004', name: 'Teacher Two', role: 'TEACHER' })).rejects.toMatchObject({ code: 'STAFF_MUTATION_IN_PROGRESS' });
    release?.({ success: true, user });
    await first;

    client.get.mockResolvedValue({ success: true });
    await expect(service.listStaff()).rejects.toMatchObject({ code: 'MALFORMED_STAFF_RESPONSE' });
  });
});
