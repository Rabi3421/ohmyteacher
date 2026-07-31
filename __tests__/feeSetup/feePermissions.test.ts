import { APP_ROLES } from '../../src/constants/permissions';
import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import {
  canApplyExemption,
  canManageDiscountDefinitions,
  canManageFeeHeads,
  canManageFineRules,
  canManageFeeStructures,
  canManageStudentFeeAssignments,
  canViewFeeSetup,
} from '../../src/utils/feePermissions';

const actor = (
  role: UserMembership['role'],
  patch: Partial<UserMembership> = {},
): UserMembership => ({
  id: role,
  role,
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
  ...patch,
});

describe('Fee Setup permissions', () => {
  it('gives School Admin full Fee Setup access', () => {
    const admin = actor('SCHOOL_ADMIN');
    expect(canManageFeeHeads(admin, [], 'school-omt')).toBe(true);
    expect(
      canManageFeeStructures(
        admin,
        [],
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
    expect(canManageDiscountDefinitions(admin, [], 'school-omt')).toBe(true);
  });
  it('keeps Branch Admin in the assigned branch', () => {
    const admin = actor('BRANCH_ADMIN', { branchId: 'branch-main' });
    const permissions: PermissionKey[] = ['fees.view', 'fees.structure.manage'];
    expect(
      canManageFeeStructures(
        admin,
        permissions,
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
    expect(
      canManageFeeStructures(
        admin,
        permissions,
        'school-omt',
        'branch-other',
        'ACTIVE',
      ),
    ).toBe(false);
  });
  it('uses configurable Branch Admin assignment permission', () => {
    const admin = actor('BRANCH_ADMIN', { branchId: 'branch-main' });
    expect(
      canManageStudentFeeAssignments(
        admin,
        ['fees.view'],
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
    expect(
      canManageStudentFeeAssignments(
        admin,
        ['fees.view', 'fees.student_assignment.manage'],
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
  });
  it('keeps Accountant read-only', () => {
    const accountant = actor('ACCOUNTANT', { branchId: 'branch-main' });
    expect(
      canViewFeeSetup(
        accountant,
        ['fees.view'],
        'school-omt',
        'branch-main',
      ),
    ).toBe(true);
    expect(
      canManageFeeStructures(
        accountant,
        ['fees.view'],
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
    expect(
      canApplyExemption(
        accountant,
        ['fees.view'],
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
  });
  it.each(['RECEPTIONIST', 'PARENT', 'STUDENT'] as const)(
    'blocks %s from Fee Setup',
    role => {
      expect(
        canViewFeeSetup(
          actor(role),
          ['fees.view'],
          'school-omt',
          'branch-main',
        ),
      ).toBe(false);
    },
  );
  it('makes closed sessions read-only', () => {
    expect(
      canManageFeeStructures(
        actor('SCHOOL_ADMIN'),
        [],
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
    expect(
      canManageFeeHeads(actor('SCHOOL_ADMIN'), [], 'school-omt', 'CLOSED'),
    ).toBe(false);
    expect(
      canManageDiscountDefinitions(
        actor('SCHOOL_ADMIN'),
        [],
        'school-omt',
        'CLOSED',
      ),
    ).toBe(false);
    expect(
      canManageFineRules(
        actor('SCHOOL_ADMIN'),
        [],
        'school-omt',
        'CLOSED',
      ),
    ).toBe(false);
  });
  it('does not introduce Teacher', () => {
    expect(APP_ROLES).not.toContain('TEACHER');
  });
});
