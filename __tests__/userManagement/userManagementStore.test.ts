import type { AppRole } from '../../src/constants/permissions';
import type { UserMembership } from '../../src/models/auth';
import {
  mockUserManagementService,
  resetMockUserManagementData,
} from '../../src/services/userManagement/mockUserManagementService';
import { createUserManagementStore } from '../../src/store/userManagement/userManagementStore';

function membership(
  role: AppRole,
  schoolId = 'school-omt',
  branchId?: string,
): UserMembership {
  return {
    branchId,
    id: `membership-${role}`,
    role,
    schoolId,
    status: 'ACTIVE',
    userId: 'actor',
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockUserManagementData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('user-management store tenant guards', () => {
  it('allows School Admin own-school staff and blocks another school', async () => {
    const store = createUserManagementStore({
      getMembership: () => membership('SCHOOL_ADMIN'),
      service: mockUserManagementService,
    });
    const loading = store.getState().loadStaff('school-omt');
    jest.runOnlyPendingTimers();
    await loading;
    expect(store.getState().staff.totalItems).toBeGreaterThan(0);

    await store.getState().loadStaff('school-greenfield');
    expect(store.getState().error).toMatchObject({
      code: 'USER_MANAGEMENT_ACCESS_DENIED',
      status: 403,
    });
  });

  it('restricts Branch Admin list and details to its branch scope', async () => {
    const store = createUserManagementStore({
      getMembership: () =>
        membership('BRANCH_ADMIN', 'school-omt', 'branch-main'),
      service: mockUserManagementService,
    });
    const list = store.getState().loadStaff('school-omt');
    jest.runOnlyPendingTimers();
    await list;
    expect(
      store
        .getState()
        .staff.items.every(item =>
          item.membership.branchIds.includes('branch-main'),
        ),
    ).toBe(true);

    const details = store
      .getState()
      .loadStaffUser('school-omt', 'membership-school-admin');
    jest.runOnlyPendingTimers();
    await expect(details).resolves.toBe(false);
    expect(store.getState().error?.code).toBe(
      'USER_MANAGEMENT_ACCESS_DENIED',
    );
  });

  it.each(['ACCOUNTANT', 'RECEPTIONIST', 'PARENT', 'STUDENT'] as const)(
    'blocks %s from loading staff',
    async role => {
      const store = createUserManagementStore({
        getMembership: () => membership(role),
        service: mockUserManagementService,
      });
      await store.getState().loadStaff('school-omt');
      expect(store.getState().staff.items).toHaveLength(0);
      expect(store.getState().error?.code).toBe(
        'USER_MANAGEMENT_ACCESS_DENIED',
      );
      expect(jest.getTimerCount()).toBe(0);
    },
  );

  it('rejects prohibited role assignment before service mutation', async () => {
    const store = createUserManagementStore({
      getMembership: () => membership('SCHOOL_ADMIN'),
      service: mockUserManagementService,
    });
    const created = await store.getState().createStaff('school-omt', {
      branchIds: [],
      identity: {
        mobile: '9811111111',
        name: 'Prohibited Admin',
      },
      role: 'SCHOOL_ADMIN',
      status: 'ACTIVE',
    });
    expect(created).toBeNull();
    expect(store.getState().error?.code).toBe(
      'USER_MANAGEMENT_ACCESS_DENIED',
    );
    expect(jest.getTimerCount()).toBe(0);
  });
});
