import type { CreateStaffMembershipInput } from '../../src/models/userManagement';
import {
  mockUserManagementService,
  resetMockUserManagementData,
} from '../../src/services/userManagement/mockUserManagementService';
import { SCHOOL_AUTH_FIXTURES } from '../../src/services/auth/authFixtures';

async function finishMockDelay<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}

const NEW_STAFF: CreateStaffMembershipInput = {
  branchIds: ['branch-main'],
  identity: {
    email: 'new.accountant@example.in',
    mobile: '9811111111',
    name: 'New Accountant',
  },
  role: 'ACCOUNTANT',
  status: 'ACTIVE',
};

beforeEach(() => {
  jest.useFakeTimers();
  resetMockUserManagementData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mock user-management service', () => {
  it('lists, searches, filters, and paginates staff', async () => {
    const list = await finishMockDelay(
      mockUserManagementService.getStaffUsers('school-omt', {
        page: 1,
        pageSize: 2,
      }),
    );
    expect(list.data.items).toHaveLength(2);
    expect(list.data.totalItems).toBeGreaterThanOrEqual(5);

    const search = await finishMockDelay(
      mockUserManagementService.getStaffUsers('school-omt', {
        search: '9876543211',
      }),
    );
    expect(search.data.items[0].membership.id).toBe(
      'membership-accountant',
    );

    const filtered = await finishMockDelay(
      mockUserManagementService.getStaffUsers('school-omt', {
        role: 'RECEPTIONIST',
        status: 'INACTIVE',
      }),
    );
    expect(filtered.data.items).toHaveLength(1);
    expect(filtered.data.items[0].membership.status).toBe('INACTIVE');
  });

  it('creates a new identity and compatible authentication membership', async () => {
    const response = await finishMockDelay(
      mockUserManagementService.createStaffMembership(
        'school-omt',
        NEW_STAFF,
      ),
    );
    expect(response.data.identity).toMatchObject({
      mobile: NEW_STAFF.identity.mobile,
      name: NEW_STAFF.identity.name,
      status: 'ACTIVE',
    });
    expect(response.data.membership).toMatchObject({
      branchIds: ['branch-main'],
      role: 'ACCOUNTANT',
      schoolId: 'school-omt',
    });
    expect(SCHOOL_AUTH_FIXTURES['9811111111'].memberships[0]).toMatchObject({
      branchId: 'branch-main',
      role: 'ACCOUNTANT',
      schoolId: 'school-omt',
    });
  });

  it('reuses an existing global identity for a new school membership', async () => {
    const identity = await finishMockDelay(
      mockUserManagementService.findUserByMobile('9860000099'),
    );
    expect(identity.data?.id).toBe('user-existing-amit');

    const response = await finishMockDelay(
      mockUserManagementService.createStaffMembership('school-omt', {
        ...NEW_STAFF,
        identity: {
          email: 'amit@example.in',
          mobile: '9860000099',
          name: 'Amit Kumar',
        },
      }),
    );
    expect(response.data.identity.id).toBe('user-existing-amit');
    expect(
      SCHOOL_AUTH_FIXTURES['9860000099'].memberships.map(
        membership => membership.schoolId,
      ),
    ).toEqual(expect.arrayContaining(['school-sunrise', 'school-omt']));
  });

  it('prevents duplicate memberships and inactive identity reuse', async () => {
    const duplicate = mockUserManagementService.createStaffMembership(
      'school-omt',
      {
        ...NEW_STAFF,
        identity: {
          mobile: '9876543211',
          name: 'Vikram Rao',
        },
      },
    );
    await expect(finishMockDelay(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_MEMBERSHIP',
    });

    const inactive = mockUserManagementService.createStaffMembership(
      'school-omt',
      {
        ...NEW_STAFF,
        identity: {
          mobile: '9860000088',
          name: 'Disabled Identity',
        },
      },
    );
    await expect(finishMockDelay(inactive)).rejects.toMatchObject({
      code: 'INACTIVE_USER_CONFLICT',
    });
  });

  it('validates branch ownership and active status', async () => {
    const invalid = mockUserManagementService.createStaffMembership(
      'school-omt',
      {
        ...NEW_STAFF,
        branchIds: ['branch-greenfield-puri'],
      },
    );
    await expect(finishMockDelay(invalid)).rejects.toMatchObject({
      code: 'INVALID_BRANCH_ASSIGNMENT',
    });

    const assigned = await finishMockDelay(
      mockUserManagementService.assignBranches(
        'school-greenfield',
        'membership-greenfield-branches',
        ['branch-school-greenfield-main', 'branch-greenfield-puri'],
      ),
    );
    expect(assigned.data.branchIds).toHaveLength(2);
  });

  it('changes role, recalculates access, revokes sessions, and logs activity', async () => {
    const changed = await finishMockDelay(
      mockUserManagementService.changeMembershipRole(
        'school-omt',
        'membership-accountant',
        'BRANCH_ADMIN',
      ),
    );
    expect(changed.data.membership.role).toBe('BRANCH_ADMIN');
    expect(changed.data.activeSessionCount).toBe(0);
    expect(changed.data.effectiveAccess.permissions).toContain('exams.manage');

    const activity = await finishMockDelay(
      mockUserManagementService.getUserActivity(
        'school-omt',
        'membership-accountant',
      ),
    );
    expect(activity.data.items[0].action).toBe('ROLE_CHANGED');
  });

  it('protects the last active School Admin from role/status removal', async () => {
    const deactivation =
      mockUserManagementService.updateMembershipStatus(
        'school-omt',
        'membership-school-admin',
        'INACTIVE',
      );
    await expect(finishMockDelay(deactivation)).rejects.toMatchObject({
      code: 'LAST_ACTIVE_SCHOOL_ADMIN',
    });

    const roleChange = mockUserManagementService.changeMembershipRole(
      'school-omt',
      'membership-school-admin',
      'BRANCH_ADMIN',
    );
    await expect(finishMockDelay(roleChange)).rejects.toMatchObject({
      code: 'LAST_ACTIVE_SCHOOL_ADMIN',
    });
  });

  it('deactivates memberships without deletion and revokes sessions', async () => {
    const updated = await finishMockDelay(
      mockUserManagementService.updateMembershipStatus(
        'school-omt',
        'membership-accountant',
        'INACTIVE',
      ),
    );
    expect(updated.data.status).toBe('INACTIVE');
    const sessions = await finishMockDelay(
      mockUserManagementService.getActiveSessions(
        'school-omt',
        'membership-accountant',
      ),
    );
    expect(sessions.data).toHaveLength(0);
    const details = await finishMockDelay(
      mockUserManagementService.getStaffUser(
        'school-omt',
        'membership-accountant',
      ),
    );
    expect(details.data.identity.name).toBe('Vikram Rao');
  });

  it('revokes selected and all other sessions', async () => {
    await finishMockDelay(
      mockUserManagementService.revokeSession(
        'school-omt',
        'membership-accountant',
        'session-accountant-web',
      ),
    );
    let sessions = await finishMockDelay(
      mockUserManagementService.getActiveSessions(
        'school-omt',
        'membership-accountant',
      ),
    );
    expect(sessions.data.map(session => session.id)).toEqual([
      'session-accountant-current',
    ]);

    await finishMockDelay(
      mockUserManagementService.revokeAllSessions(
        'school-omt',
        'membership-accountant',
      ),
    );
    sessions = await finishMockDelay(
      mockUserManagementService.getActiveSessions(
        'school-omt',
        'membership-accountant',
      ),
    );
    expect(sessions.data).toHaveLength(0);
  });

  it('applies valid role permissions and rejects prohibited boundaries', async () => {
    const configuration = await finishMockDelay(
      mockUserManagementService.updateRoleConfiguration(
        'school-omt',
        'ACCOUNTANT',
        {
          disabledPermissions: ['receipts.share'],
          enabledPermissions: ['fee_reports.export'],
        },
      ),
    );
    expect(configuration.data.enabledPermissions).toEqual([
      'fee_reports.export',
    ]);

    const accountantExam =
      mockUserManagementService.updateRoleConfiguration(
        'school-omt',
        'ACCOUNTANT',
        {
          disabledPermissions: [],
          enabledPermissions: ['exams.manage'],
        },
      );
    await expect(finishMockDelay(accountantExam)).rejects.toMatchObject({
      code: 'PERMISSION_BOUNDARY_VIOLATION',
    });

    const receptionistCancel =
      mockUserManagementService.updateRoleConfiguration(
        'school-omt',
        'RECEPTIONIST',
        {
          disabledPermissions: [],
          enabledPermissions: ['receipts.cancel'],
        },
      );
    await expect(finishMockDelay(receptionistCancel)).rejects.toMatchObject({
      code: 'PERMISSION_BOUNDARY_VIOLATION',
    });
  });

  it('records login-instruction and session activity without secrets', async () => {
    await finishMockDelay(
      mockUserManagementService.resendLoginInstructions(
        'school-omt',
        'membership-accountant',
      ),
    );
    const result = await finishMockDelay(
      mockUserManagementService.getUserActivity(
        'school-omt',
        'membership-accountant',
      ),
    );
    expect(result.data.items[0].action).toBe('LOGIN_INSTRUCTIONS_SENT');
    expect(JSON.stringify(result.data.items)).not.toContain('123456');
    expect(JSON.stringify(result.data.items)).not.toContain('mock-access');
  });
});
