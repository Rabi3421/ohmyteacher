import type { UserMembership } from '../../src/models/auth';
import type { ApiResponse } from '../../src/models/common';
import type {
  CurrentSchool,
  OrganizationBranch,
  OrganizationBranchCollection,
} from '../../src/models/currentOrganization';
import { ApiClientError } from '../../src/services/api/apiError';
import type { BranchService } from '../../src/services/organization/branchService';
import type { CurrentOrganizationService } from '../../src/services/organization/currentOrganizationService';
import { createCurrentOrganizationStore } from '../../src/store/organization/currentOrganizationStore';

const school: CurrentSchool = {
  address: 'Address',
  createdAt: '2026-08-01T10:00:00Z',
  email: '',
  id: '11',
  name: 'School',
  phone: '',
  status: 'ACTIVE',
  upiId: '',
};

const branch = (id: string, status: OrganizationBranch['status'] = 'ACTIVE'): OrganizationBranch => ({
  address: 'Address',
  code: `SCH11-B${id}`,
  createdAt: '2026-08-01T10:00:00Z',
  email: '',
  id,
  name: `Branch ${id}`,
  phone: '',
  schoolId: '11',
  status,
});

function response<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data, message, success: true };
}

function membership(
  role: UserMembership['role'] = 'SCHOOL_ADMIN',
  branchId?: string,
): UserMembership {
  return {
    branchId,
    id: `membership-${role}`,
    role,
    schoolId: '11',
    status: 'ACTIVE',
    userId: '1',
  };
}

function setup(active = membership()) {
  const organization: jest.Mocked<CurrentOrganizationService> = {
    getCurrentSchool: jest.fn().mockResolvedValue(response(school)),
    updateCurrentSchool: jest.fn().mockResolvedValue(response(school)),
  };
  const branches: jest.Mocked<BranchService> = {
    createBranch: jest.fn().mockResolvedValue(response(branch('21'))),
    getBranch: jest.fn().mockResolvedValue(response(branch('21'))),
    listBranches: jest.fn().mockResolvedValue(
      response({ items: [branch('21')], pagination: null, totalItems: 1 }),
    ),
    setBranchStatus: jest.fn().mockResolvedValue(response(branch('21'))),
    updateBranch: jest.fn().mockResolvedValue(response(branch('21'))),
  };
  const reconcile = jest.fn();
  const store = createCurrentOrganizationStore({
    branchService: branches,
    currentOrganizationService: organization,
    getMembership: () => active,
    reconcileSelection: reconcile,
  });
  return { branches, organization, reconcile, store };
}

describe('current organization store', () => {
  it('loads only the authenticated current school and verifies response scope', async () => {
    const { organization, store } = setup();
    expect(await store.getState().loadCurrentSchool('11')).toBe(true);
    expect(store.getState().currentSchool).toEqual(school);
    expect(organization.getCurrentSchool).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
  });

  it.each(['SUPER_ADMIN', 'PARENT'] as const)(
    'denies %s before a current-school request',
    async role => {
      const { organization, store } = setup(membership(role));
      expect(await store.getState().loadCurrentSchool('11')).toBe(false);
      expect(organization.getCurrentSchool).not.toHaveBeenCalled();
      expect(store.getState().schoolError?.status).toBe(403);
    },
  );

  it('denies a route for another school before transport', async () => {
    const { branches, store } = setup();
    expect(await store.getState().loadBranches('99')).toBe(false);
    expect(branches.listBranches).not.toHaveBeenCalled();
  });

  it('blocks Branch Admin without an assignment instead of fabricating scope', async () => {
    const { branches, store } = setup(membership('BRANCH_ADMIN'));
    expect(await store.getState().loadBranches('11')).toBe(false);
    expect(branches.listBranches).not.toHaveBeenCalled();
    expect(store.getState().branchError?.code).toBe('BRANCH_SCOPE_UNAVAILABLE');
  });

  it('limits Branch Admin to its assigned returned branch', async () => {
    const { branches, store } = setup(membership('BRANCH_ADMIN', '22'));
    branches.listBranches.mockResolvedValue(
      response({
        items: [branch('21'), branch('22')],
        pagination: null,
        totalItems: 2,
      }),
    );
    expect(await store.getState().loadBranches('11')).toBe(true);
    expect(store.getState().allBranches.map(item => item.id)).toEqual(['22']);
    expect(await store.getState().loadBranch('11', '21')).toBe(false);
    expect(branches.getBranch).not.toHaveBeenCalled();
  });

  it('deduplicates and locally filters the live unpaginated list', async () => {
    const { branches, store } = setup();
    branches.listBranches.mockResolvedValue(
      response({
        items: [branch('21'), branch('21'), { ...branch('22', 'INACTIVE'), name: 'Puri' }],
        pagination: null,
        totalItems: 3,
      }),
    );
    await store.getState().loadBranches('11');
    store.getState().setBranchQuery({ search: 'puri', status: 'INACTIVE' });
    expect(store.getState().branches.items.map(item => item.id)).toEqual(['22']);
    expect(branches.listBranches).toHaveBeenCalledTimes(1);
  });

  it('prevents an old branch-list response from overwriting a newer one', async () => {
    const { branches, store } = setup();
    let resolveOld: ((value: ApiResponse<OrganizationBranchCollection>) => void) | undefined;
    branches.listBranches
      .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(
        response({ items: [branch('22')], pagination: null, totalItems: 1 }),
      );
    const old = store.getState().loadBranches('11');
    await store.getState().loadBranches('11');
    resolveOld?.(response({ items: [branch('21')], pagination: null, totalItems: 1 }));
    await old;
    expect(store.getState().allBranches[0].id).toBe('22');
  });

  it('allows Branch Admin to read school but blocks every mutation', async () => {
    const { branches, organization, store } = setup(
      membership('BRANCH_ADMIN', '21'),
    );
    expect(await store.getState().loadCurrentSchool('11')).toBe(true);
    expect(await store.getState().updateCurrentSchool('11', { name: 'No' })).toBe(false);
    expect(await store.getState().createBranch('11', { name: 'No' })).toBeNull();
    expect(organization.updateCurrentSchool).not.toHaveBeenCalled();
    expect(branches.createBranch).not.toHaveBeenCalled();
  });

  it('locks duplicate creation and refreshes list/detail after success', async () => {
    const { branches, store } = setup();
    let resolveCreate: ((value: ApiResponse<OrganizationBranch>) => void) | undefined;
    branches.createBranch.mockImplementation(
      () => new Promise(resolve => { resolveCreate = resolve; }),
    );
    const first = store.getState().createBranch('11', { name: 'New' });
    expect(await store.getState().createBranch('11', { name: 'Duplicate' })).toBeNull();
    resolveCreate?.(response(branch('21')));
    await first;
    expect(branches.createBranch).toHaveBeenCalledTimes(1);
    expect(branches.listBranches).toHaveBeenCalledTimes(1);
    expect(branches.getBranch).toHaveBeenCalledWith('21', expect.anything());
  });

  it('preserves authoritative branch state after mutation failure', async () => {
    const { branches, store } = setup();
    store.setState({ currentBranch: branch('21') });
    branches.setBranchStatus.mockRejectedValue(
      new ApiClientError({ message: 'Server failed', status: 500 }),
    );
    expect(await store.getState().setBranchStatus('11', '21', 'INACTIVE')).toBe(false);
    expect(store.getState().currentBranch?.status).toBe('ACTIVE');
    expect(store.getState().mutationError?.status).toBe(500);
  });

  it('reconciles selected branch after every authoritative list load', async () => {
    const { reconcile, store } = setup();
    await store.getState().loadBranches('11');
    expect(reconcile).toHaveBeenCalledWith('11', [branch('21')], expect.objectContaining({ role: 'SCHOOL_ADMIN' }));
  });
});
