import type { UserMembership } from '../../src/models/auth';
import {
  mockOrganizationService,
  resetMockOrganizationData,
} from '../../src/services/organization/mockOrganizationService';
import { createOrganizationStore } from '../../src/store/organization/organizationStore';

function activeMembership(
  role: UserMembership['role'],
  branchId?: string,
): UserMembership {
  return {
    branchId,
    id: `membership-${role}`,
    role,
    schoolId: 'school-omt',
    status: 'ACTIVE',
    userId: 'user-1',
  };
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockOrganizationData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('organization store tenant boundaries', () => {
  it('blocks School Admin from another school before calling the service', async () => {
    const store = createOrganizationStore({
      getMembership: () => activeMembership('SCHOOL_ADMIN'),
      service: mockOrganizationService,
    });

    await expect(store.getState().loadSchool('school-other')).resolves.toBe(
      false,
    );
    expect(store.getState().error).toMatchObject({
      code: 'ORGANIZATION_ACCESS_DENIED',
      status: 403,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('blocks Branch Admin management operations', async () => {
    const store = createOrganizationStore({
      getMembership: () => activeMembership('BRANCH_ADMIN', 'branch-main'),
      service: mockOrganizationService,
    });

    await expect(
      store.getState().createBranch('school-omt', {
        address: {
          city: 'Puri',
          country: 'India',
          line1: '1 Beach Road',
          pinCode: '752001',
          state: 'Odisha',
        },
        code: 'PURI',
        mobile: '9876500200',
        name: 'Puri Branch',
      }),
    ).resolves.toBeNull();
    expect(store.getState().error?.code).toBe(
      'ORGANIZATION_ACCESS_DENIED',
    );
    expect(store.getState().isSavingBranch).toBe(false);
  });

  it('blocks Branch Admin from reading a different branch', async () => {
    const store = createOrganizationStore({
      getMembership: () => activeMembership('BRANCH_ADMIN', 'branch-main'),
      service: mockOrganizationService,
    });

    await expect(
      store
        .getState()
        .loadBranch('school-omt', 'branch-greenfield-puri'),
    ).resolves.toBe(false);
    expect(store.getState().currentBranch).toBeNull();
    expect(store.getState().error?.code).toBe(
      'ORGANIZATION_ACCESS_DENIED',
    );
  });

  it('exposes only the active school session to Branch Admin', async () => {
    const store = createOrganizationStore({
      getMembership: () => activeMembership('BRANCH_ADMIN', 'branch-main'),
      service: mockOrganizationService,
    });

    const loading = store.getState().loadAcademicSessions('school-omt');
    expect(store.getState().isLoadingSessions).toBe(true);
    jest.runOnlyPendingTimers();
    await loading;

    expect(store.getState().academicSessions).toHaveLength(1);
    expect(store.getState().academicSessions[0].status).toBe('ACTIVE');
    expect(store.getState().isLoadingSessions).toBe(false);
  });
});
