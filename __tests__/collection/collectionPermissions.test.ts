import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import { APP_ROLES } from '../../src/constants/permissions';
import {
  canAccessParentReceipt,
  canAccessStudentReceipt,
  canCollectPayment,
  canManageAdvanceCredit,
  canReversePayment,
  canViewDailyCollection,
  canViewPayments,
} from '../../src/utils/collectionPermissions';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const member = (
  role: UserMembership['role'],
  patch: Partial<UserMembership> = {},
): UserMembership => ({
  branchId: 'branch-main',
  id: `membership-${role}`,
  role,
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: `user-${role}`,
  ...patch,
});
const permissions = (...values: PermissionKey[]) => values;

describe('Collection permissions', () => {
  it('keeps Teacher absent from application roles', () => {
    expect(APP_ROLES).not.toContain('TEACHER');
  });

  it('allows Super and School Admin across their selected School scope', () => {
    expect(
      canReversePayment(
        member('SUPER_ADMIN', { schoolId: undefined, branchId: undefined }),
        [],
        'another-school',
        'another-branch',
        'ACTIVE',
      ),
    ).toBe(true);
    expect(
      canManageAdvanceCredit(
        member('SCHOOL_ADMIN', { branchId: undefined }),
        [],
        'school-omt',
        'branch-other',
        'ACTIVE',
      ),
    ).toBe(true);
  });

  it('enforces assigned branch for Branch Admin', () => {
    const actor = member('BRANCH_ADMIN');
    expect(
      canViewPayments(
        actor,
        permissions('payments.view'),
        'school-omt',
        'branch-main',
      ),
    ).toBe(true);
    expect(
      canViewPayments(
        actor,
        permissions('payments.view'),
        'school-omt',
        'branch-other',
      ),
    ).toBe(false);
  });

  it('gives Accountant default collection but never reversal', () => {
    const actor = member('ACCOUNTANT');
    const granted = getEffectivePermissions('ACCOUNTANT');
    expect(
      canCollectPayment(actor, granted, 'school-omt', 'branch-main', 'ACTIVE'),
    ).toBe(true);
    expect(
      canViewDailyCollection(actor, granted, 'school-omt', 'branch-main'),
    ).toBe(true);
    expect(
      canReversePayment(actor, granted, 'school-omt', 'branch-main', 'ACTIVE'),
    ).toBe(false);
    expect(
      canManageAdvanceCredit(
        actor,
        granted,
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
  });

  it('keeps Receptionist collection optional and Advance/reversal unavailable', () => {
    const actor = member('RECEPTIONIST');
    expect(
      canCollectPayment(
        actor,
        getEffectivePermissions('RECEPTIONIST'),
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
    expect(
      canCollectPayment(
        actor,
        permissions('payments.collect'),
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
    expect(
      canReversePayment(
        actor,
        getEffectivePermissions('RECEPTIONIST'),
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
  });

  it('blocks every mutation for closed academic sessions', () => {
    const actor = member('BRANCH_ADMIN');
    expect(
      canCollectPayment(
        actor,
        permissions('payments.collect'),
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
    expect(
      canReversePayment(
        actor,
        permissions('payments.reverse'),
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
    expect(
      canManageAdvanceCredit(
        actor,
        permissions('payments.advance.manage'),
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
  });

  it('requires exact active Parent and Student memberships', () => {
    expect(
      canAccessParentReceipt(
        member('PARENT', { id: 'membership-parent' }),
        'school-omt',
        'membership-parent',
      ),
    ).toBe(true);
    expect(
      canAccessParentReceipt(
        member('PARENT', { id: 'membership-parent' }),
        'school-omt',
        'other',
      ),
    ).toBe(false);
    expect(
      canAccessStudentReceipt(
        member('STUDENT', { id: 'membership-student' }),
        'school-omt',
        'membership-student',
      ),
    ).toBe(true);
    expect(
      canAccessStudentReceipt(
        member('STUDENT', { id: 'membership-student', status: 'INACTIVE' }),
        'school-omt',
        'membership-student',
      ),
    ).toBe(false);
  });
});
