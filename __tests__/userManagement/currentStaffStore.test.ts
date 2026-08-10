import type { UserMembership } from '../../src/models/auth';
import type { LiveStaffUser } from '../../src/models/liveStaff';
import { ApiClientError } from '../../src/services/api/apiError';
import type { StaffUserService } from '../../src/services/userManagement/staffUserService';
import { createCurrentStaffStore } from '../../src/store/userManagement/currentStaffStore';

const teacher: LiveStaffUser = {
  branch: { id: '21', name: 'Main Branch', status: 'ACTIVE' },
  id: '31',
  joinedAt: '2026-08-01T10:00:00Z',
  mobile: '+919111100003',
  name: 'Teacher One',
  role: 'TEACHER',
  schoolId: '11',
  status: 'ACTIVE',
};

function membership(role: 'SCHOOL_ADMIN' | 'BRANCH_ADMIN', branchId?: string): UserMembership {
  return { branchId, id: `membership-${role}`, role, schoolId: '11', status: 'ACTIVE', userId: '1' };
}

function response<T>(data: T) {
  return Promise.resolve({ data, message: 'ok', success: true });
}

function setup(
  actor: UserMembership = membership('SCHOOL_ADMIN'),
  inactive: { branch?: boolean; school?: boolean } = {},
) {
  const service: StaffUserService = {
    createStaff: jest.fn(input => response({ ...teacher, name: input.name, role: input.role })),
    getStaff: jest.fn(() => response(teacher)),
    listStaff: jest.fn(() => response({ items: [teacher], pagination: null, totalItems: 1 })),
    setStaffStatus: jest.fn((_id, status) => response({ ...teacher, status })),
    updateStaff: jest.fn((_id, input) => response({ ...teacher, name: input.name ?? teacher.name, branch: input.branchId ? { id: input.branchId } : teacher.branch })),
  };
  return {
    service,
    store: createCurrentStaffStore({
      getBranchStatus: () => inactive.branch ? 'INACTIVE' : 'ACTIVE',
      getMembership: () => actor,
      getSchoolStatus: () => inactive.school ? 'INACTIVE' : 'ACTIVE',
      service,
    }),
  };
}

describe('current live staff store', () => {
  it('loads server-scoped users and filters locally without another request', async () => {
    const { service, store } = setup();
    await expect(store.getState().loadStaff('11')).resolves.toBe(true);
    store.getState().setQuery({ search: 'missing' });
    expect(store.getState().staff.items).toEqual([]);
    expect(service.listStaff).toHaveBeenCalledTimes(1);
  });

  it('drops cross-tenant records instead of caching them', async () => {
    const { service, store } = setup();
    (service.listStaff as jest.Mock).mockReturnValue(response({ items: [{ ...teacher, schoolId: '12' }], pagination: null, totalItems: 1 }));
    await store.getState().loadStaff('11');
    expect(store.getState().allStaff).toEqual([]);
  });

  it('requires Branch Admin assignment and keeps its list to own-branch Teachers', async () => {
    const missing = setup(membership('BRANCH_ADMIN'));
    await expect(missing.store.getState().loadStaff('11')).resolves.toBe(false);
    expect(missing.store.getState().error?.code).toBe('STAFF_BRANCH_REQUIRED');

    const scoped = setup(membership('BRANCH_ADMIN', '21'));
    (scoped.service.listStaff as jest.Mock).mockReturnValue(response({
      items: [teacher, { ...teacher, id: '32', branch: { id: '22' } }, { ...teacher, id: '33', role: 'BRANCH_ADMIN' }],
      pagination: null,
      totalItems: 3,
    }));
    await scoped.store.getState().loadStaff('11');
    expect(scoped.store.getState().allStaff.map(item => item.id)).toEqual(['31']);
  });

  it('clears stale detail and ignores an older response', async () => {
    const { service, store } = setup();
    let firstRelease: ((value: ReturnType<typeof response<LiveStaffUser>>) => void) | undefined;
    (service.getStaff as jest.Mock)
      .mockImplementationOnce(() => new Promise(resolve => { firstRelease = resolve; }))
      .mockReturnValueOnce(response({ ...teacher, id: '32', name: 'Newer' }));
    const first = store.getState().loadStaffUser('11', '31');
    const second = store.getState().loadStaffUser('11', '32');
    await second;
    expect(store.getState().currentStaff?.id).toBe('32');
    firstRelease?.(response(teacher));
    await first;
    expect(store.getState().currentStaff?.id).toBe('32');
  });

  it('allows Branch Admin to create only a Teacher in its own branch', async () => {
    const { service, store } = setup(membership('BRANCH_ADMIN', '21'));
    await expect(store.getState().createStaff('11', { branchId: '22', mobile: '9111100003', name: 'Teacher', role: 'TEACHER' })).resolves.toBeNull();
    expect(service.createStaff).not.toHaveBeenCalled();
    await expect(store.getState().createStaff('11', { branchId: '21', mobile: '9111100003', name: 'Teacher', role: 'TEACHER' })).resolves.toMatchObject({ role: 'TEACHER' });
  });

  it('maps validation errors, preserves form authority and prevents duplicate save', async () => {
    const { service, store } = setup();
    (service.updateStaff as jest.Mock).mockRejectedValue(new ApiClientError({ fieldErrors: { name: 'Required' }, message: 'Invalid', status: 400 }));
    await expect(store.getState().updateStaff('11', '31', { name: '' })).resolves.toBe(false);
    expect(store.getState().error?.fieldErrors).toEqual({ name: 'Required' });
  });

  it('blocks self-status mutation and leaves authoritative state unchanged', async () => {
    const { service, store } = setup({ ...membership('SCHOOL_ADMIN'), userId: '31' });
    await expect(store.getState().setStaffStatus('11', '31', 'INACTIVE')).resolves.toBe(false);
    expect(service.setStaffStatus).not.toHaveBeenCalled();
    expect(store.getState().error?.code).toBe('SELF_DEACTIVATION_DENIED');
  });

  it('does not surface cancellation as a user-facing error', async () => {
    const { service, store } = setup();
    (service.listStaff as jest.Mock).mockRejectedValue(new ApiClientError({ kind: 'cancelled', message: 'cancelled' }));
    await store.getState().loadStaff('11');
    expect(store.getState().error).toBeNull();
  });

  it('permits reads but blocks mutations for an inactive school or Branch Admin branch', async () => {
    const schoolInactive = setup(membership('SCHOOL_ADMIN'), { school: true });
    await expect(schoolInactive.store.getState().loadStaff('11')).resolves.toBe(true);
    await expect(schoolInactive.store.getState().createStaff('11', { branchId: '21', mobile: '9111100003', name: 'Teacher', role: 'TEACHER' })).resolves.toBeNull();
    expect(schoolInactive.store.getState().error?.code).toBe('INACTIVE_SCHOOL');

    const branchInactive = setup(membership('BRANCH_ADMIN', '21'), { branch: true });
    await expect(branchInactive.store.getState().setStaffStatus('11', '31', 'INACTIVE')).resolves.toBe(false);
    expect(branchInactive.store.getState().error?.code).toBe('INACTIVE_BRANCH');
  });
});
