import type { AppRole } from '../../src/constants/permissions';
import type { UserMembership } from '../../src/models/auth';
import {
  canAssignBranches,
  canAssignRole,
  canCreateStaff,
  canEditStaff,
  canManageRolePermissions,
  canRevokeUserSessions,
  canViewStaff,
  canViewUserActivity,
} from '../../src/utils/userManagementPermissions';

function membership(
  role: AppRole,
  schoolId = 'school-own',
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

describe('user-management frontend guards', () => {
  it('keeps Super Admin outside current-school live staff routes', () => {
    const actor = membership('SUPER_ADMIN');
    expect(canViewStaff(actor.role, actor, 'school-any')).toBe(false);
    expect(canCreateStaff(actor.role, actor, 'school-any')).toBe(false);
    expect(canAssignRole(actor.role, 'SCHOOL_ADMIN')).toBe(true);
    expect(canAssignRole(actor.role, 'ACCOUNTANT')).toBe(false);
  });

  it('limits School Admin to its own school and allowed roles', () => {
    const actor = membership('SCHOOL_ADMIN');
    expect(canViewStaff(actor.role, actor, 'school-own')).toBe(true);
    expect(canCreateStaff(actor.role, actor, 'school-own')).toBe(true);
    expect(canEditStaff(actor.role, actor, 'school-own')).toBe(true);
    expect(canAssignBranches(actor.role, actor, 'school-own')).toBe(true);
    expect(canRevokeUserSessions(actor.role, actor, 'school-own')).toBe(false);
    expect(canViewUserActivity(actor.role, actor, 'school-own')).toBe(false);
    expect(
      canManageRolePermissions(actor.role, actor, 'school-own'),
    ).toBe(true);
    expect(canViewStaff(actor.role, actor, 'school-other')).toBe(false);
    expect(canCreateStaff(actor.role, actor, 'school-other')).toBe(false);
    expect(canAssignRole(actor.role, 'BRANCH_ADMIN')).toBe(true);
    expect(canAssignRole(actor.role, 'ACCOUNTANT')).toBe(true);
    expect(canAssignRole(actor.role, 'RECEPTIONIST')).toBe(true);
    expect(canAssignRole(actor.role, 'SCHOOL_ADMIN')).toBe(false);
  });

  it('allows Branch Admin scoped Teacher management but no reassignment', () => {
    const actor = membership('BRANCH_ADMIN', 'school-own', 'branch-own');
    expect(canViewStaff(actor.role, actor, 'school-own')).toBe(true);
    expect(canViewUserActivity(actor.role, actor, 'school-own')).toBe(false);
    expect(canCreateStaff(actor.role, actor, 'school-own')).toBe(true);
    expect(canEditStaff(actor.role, actor, 'school-own')).toBe(true);
    expect(canAssignBranches(actor.role, actor, 'school-own')).toBe(false);
    expect(canRevokeUserSessions(actor.role, actor, 'school-own')).toBe(false);
  });

  it.each(['ACCOUNTANT', 'RECEPTIONIST', 'PARENT', 'STUDENT'] as const)(
    'blocks %s from staff management',
    role => {
      const actor = membership(role);
      expect(canViewStaff(role, actor, 'school-own')).toBe(false);
      expect(canCreateStaff(role, actor, 'school-own')).toBe(false);
      expect(canEditStaff(role, actor, 'school-own')).toBe(false);
      expect(canManageRolePermissions(role, actor, 'school-own')).toBe(false);
    },
  );
});
