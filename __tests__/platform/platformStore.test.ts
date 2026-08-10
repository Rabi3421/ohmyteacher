import type { UserMembership } from '../../src/models/auth';
import type { ApiResponse } from '../../src/models/common';
import type {
  PlatformDashboard,
  PlatformSchool,
  PlatformSchoolCollection,
} from '../../src/models/platform';
import { ApiClientError } from '../../src/services/api/apiError';
import type { PlatformService } from '../../src/services/platform/platformService';
import { createPlatformStore } from '../../src/store/platform/platformStore';

const membership = (role: UserMembership['role']): UserMembership => ({
  id: `membership-${role}`,
  role,
  status: 'ACTIVE',
  userId: 'user-1',
});

const school = (id: string, name = `School ${id}`): PlatformSchool => ({
  address: 'Bhubaneswar',
  createdAt: '2026-08-01T10:00:00Z',
  email: `${id}@example.com`,
  id,
  name,
  phone: '9876543210',
  status: 'ACTIVE',
  upiId: '',
});

const dashboard: PlatformDashboard = {
  activeSchools: 1,
  thisMonthCollection: '0',
  totalBranches: 1,
  totalSchools: 1,
  totalStudents: 0,
  totalTeachers: 0,
};

function response<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data, message, success: true };
}

function setup(role: UserMembership['role'] = 'SUPER_ADMIN') {
  const service: jest.Mocked<PlatformService> = {
    createSchool: jest.fn().mockResolvedValue(
      response({
        admin: {
          dateJoined: '2026-08-01T10:00:00Z',
          id: '21',
          mobile: '+919876543210',
          name: 'Initial Admin',
          role: 'SCHOOL_ADMIN',
          schoolId: '11',
          status: 'ACTIVE',
        },
        school: school('11'),
      }),
    ),
    getPlatformDashboard: jest.fn().mockResolvedValue(response(dashboard)),
    getSchool: jest.fn().mockResolvedValue(response(school('11'))),
    listSchools: jest.fn().mockResolvedValue(
      response({ items: [school('11')], pagination: null, totalItems: 1 }),
    ),
    setSchoolStatus: jest.fn().mockResolvedValue(response(school('11'))),
    updateSchool: jest.fn().mockResolvedValue(response(school('11'))),
  };
  const store = createPlatformStore({
    getMembership: () => membership(role),
    service,
  });
  return { service, store };
}

describe('platform store', () => {
  it('loads dashboard only for Super Admin', async () => {
    const allowed = setup();
    await allowed.store.getState().loadDashboard();
    expect(allowed.store.getState().dashboard).toEqual(dashboard);
  });

  it.each(['SCHOOL_ADMIN', 'BRANCH_ADMIN', 'PARENT'] as const)(
    'denies %s before making a platform request',
    async role => {
      const denied = setup(role);
      await denied.store.getState().loadDashboard();
      expect(denied.service.getPlatformDashboard).not.toHaveBeenCalled();
      expect(denied.store.getState().dashboardError).toMatchObject({
        code: 'PLATFORM_ACCESS_DENIED',
        status: 403,
      });
    },
  );

  it('deduplicates live records and filters the fetched dataset locally', async () => {
    const { service, store } = setup();
    service.listSchools.mockResolvedValue(
      response({
        items: [
          school('11', 'Sunrise School'),
          school('11', 'Duplicate'),
          { ...school('12', 'Moonlight School'), status: 'INACTIVE' },
        ],
        pagination: null,
        totalItems: 3,
      }),
    );
    await store.getState().loadSchools();
    expect(store.getState().allSchools).toHaveLength(2);
    store.getState().setSchoolQuery({ search: 'moon', status: 'INACTIVE' });
    expect(store.getState().schools.map(item => item.id)).toEqual(['12']);
    expect(service.listSchools).toHaveBeenCalledTimes(1);
  });

  it('prevents an older school-list response from overwriting a newer one', async () => {
    const { service, store } = setup();
    let resolveFirst:
      | ((value: ApiResponse<PlatformSchoolCollection>) => void)
      | undefined;
    service.listSchools
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(
        response({
          items: [school('12', 'New response')],
          pagination: null,
          totalItems: 1,
        }),
      );
    const first = store.getState().loadSchools();
    const second = store.getState().loadSchools();
    await second;
    resolveFirst?.(
      response({
        items: [school('11', 'Old response')],
        pagination: null,
        totalItems: 1,
      }),
    );
    await first;
    expect(store.getState().schools[0].name).toBe('New response');
  });

  it('rejects invalid detail IDs before calling the service', async () => {
    const { service, store } = setup();
    expect(await store.getState().loadSchool('invalid')).toBe(false);
    expect(service.getSchool).not.toHaveBeenCalled();
    expect(store.getState().detailError?.code).toBe('INVALID_SCHOOL_ID');
  });

  it('locks duplicate school creation and refreshes list/dashboard', async () => {
    const { service, store } = setup();
    let resolveCreate:
      | ((value: Awaited<ReturnType<PlatformService['createSchool']>>) => void)
      | undefined;
    service.createSchool.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreate = resolve;
        }),
    );
    const input = {
      adminMobile: '9876543210',
      adminName: 'Initial Admin',
      schoolName: 'Sunrise School',
    };
    const first = store.getState().createSchool(input);
    expect(await store.getState().createSchool(input)).toBeNull();
    resolveCreate?.(
      response({
        admin: {
          dateJoined: '2026-08-01T10:00:00Z',
          id: '21',
          mobile: '+919876543210',
          name: 'Initial Admin',
          role: 'SCHOOL_ADMIN',
          schoolId: '11',
          status: 'ACTIVE',
        },
        school: school('11'),
      }),
    );
    await first;
    expect(service.createSchool).toHaveBeenCalledTimes(1);
    expect(service.listSchools).toHaveBeenCalledTimes(1);
    expect(service.getPlatformDashboard).toHaveBeenCalledTimes(1);
  });

  it('keeps authoritative state unchanged when status mutation fails', async () => {
    const { service, store } = setup();
    store.setState({ currentSchool: school('11') });
    service.setSchoolStatus.mockRejectedValue(
      new ApiClientError({
        kind: 'server',
        message: 'Server failed',
        status: 500,
      }),
    );
    expect(await store.getState().setSchoolStatus('11', 'INACTIVE')).toBe(false);
    expect(store.getState().currentSchool?.status).toBe('ACTIVE');
    expect(store.getState().mutationError?.status).toBe(500);
  });

  it('does not let one school update replace another selected school', async () => {
    const { service, store } = setup();
    let resolveUpdate:
      | ((value: ApiResponse<PlatformSchool>) => void)
      | undefined;
    service.updateSchool.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveUpdate = resolve;
        }),
    );
    store.setState({ currentSchool: school('11') });
    const update = store.getState().updateSchool('11', { name: 'Updated' });
    store.setState({ currentSchool: school('12', 'Selected School') });
    resolveUpdate?.(response({ ...school('11'), name: 'Updated' }));
    await update;
    expect(store.getState().currentSchool?.id).toBe('12');
    expect(service.getSchool).not.toHaveBeenCalled();
  });

  it('refetches detail, list, and dashboard after status success', async () => {
    const { service, store } = setup();
    const inactive = { ...school('11'), status: 'INACTIVE' as const };
    store.setState({ currentSchool: school('11') });
    service.setSchoolStatus.mockResolvedValue(response(inactive));
    service.getSchool.mockResolvedValue(response(inactive));
    service.listSchools.mockResolvedValue(
      response({ items: [inactive], pagination: null, totalItems: 1 }),
    );
    expect(await store.getState().setSchoolStatus('11', 'INACTIVE')).toBe(true);
    expect(service.getSchool).toHaveBeenCalledWith('11', expect.anything());
    expect(service.listSchools).toHaveBeenCalledTimes(1);
    expect(service.getPlatformDashboard).toHaveBeenCalledTimes(1);
    expect(store.getState().currentSchool?.status).toBe('INACTIVE');
  });

  it('does not convert backend 403 into session expiry or role elevation', async () => {
    const { service, store } = setup();
    service.getPlatformDashboard.mockRejectedValue(
      new ApiClientError({
        kind: 'permission',
        message: 'Forbidden',
        status: 403,
      }),
    );
    await store.getState().loadDashboard();
    expect(store.getState().dashboard).toBeNull();
    expect(store.getState().dashboardError?.kind).toBe('permission');
  });
});
