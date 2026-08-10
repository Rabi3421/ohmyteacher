import type { AppRole } from '../../src/constants/permissions';
import type { UserMembership } from '../../src/models/auth';
import {
  canChangeBranchStatus,
  canChangeSchoolStatus,
  canCreateBranch,
  canCreateSchool,
  canEditBranch,
  canEditSchool,
  canEditSchoolSettings,
  canManageAcademicSessions,
  canViewBranch,
  canViewSchool,
} from '../../src/utils/organizationPermissions';

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
    userId: 'user-1',
  };
}

describe('organization permission guards', () => {
  it('keeps Super Admin out of the current-school boundary', () => {
    const active = membership('SUPER_ADMIN', undefined);
    expect(canCreateSchool(active.role)).toBe(true);
    expect(canChangeSchoolStatus(active.role)).toBe(true);
    expect(canViewSchool(active.role, active, 'school-any')).toBe(false);
    expect(canEditSchool(active.role, active, 'school-any')).toBe(false);
    expect(canCreateBranch(active.role, active, 'school-any')).toBe(false);
    expect(canManageAcademicSessions(active.role, active, 'school-any')).toBe(
      false,
    );
  });

  it('limits School Admin to its own school', () => {
    const active = membership('SCHOOL_ADMIN');
    expect(canViewSchool(active.role, active, 'school-own')).toBe(true);
    expect(canEditSchool(active.role, active, 'school-own')).toBe(true);
    expect(canCreateBranch(active.role, active, 'school-own')).toBe(true);
    expect(canEditBranch(active.role, active, 'school-own')).toBe(true);
    expect(canChangeBranchStatus(active.role, active, 'school-own')).toBe(true);
    expect(canEditSchoolSettings(active.role, active, 'school-own')).toBe(true);
    expect(canViewSchool(active.role, active, 'school-other')).toBe(false);
    expect(canEditSchool(active.role, active, 'school-other')).toBe(false);
    expect(canCreateBranch(active.role, active, 'school-other')).toBe(false);
    expect(canCreateSchool(active.role)).toBe(false);
    expect(canChangeSchoolStatus(active.role)).toBe(false);
  });

  it('allows Branch Admin to read only its own branch', () => {
    const active = membership(
      'BRANCH_ADMIN',
      'school-own',
      'branch-own',
    );
    expect(
      canViewBranch(active.role, active, 'school-own', 'branch-own'),
    ).toBe(true);
    expect(
      canViewBranch(active.role, active, 'school-own', 'branch-other'),
    ).toBe(false);
    expect(
      canViewBranch(active.role, active, 'school-other', 'branch-own'),
    ).toBe(false);
    expect(canCreateBranch(active.role, active, 'school-own')).toBe(false);
    expect(
      canManageAcademicSessions(active.role, active, 'school-own'),
    ).toBe(false);
    expect(canEditSchoolSettings(active.role, active, 'school-own')).toBe(
      false,
    );
  });

  it.each(['ACCOUNTANT', 'RECEPTIONIST', 'PARENT', 'STUDENT'] as const)(
    'blocks %s from organization management',
    role => {
      const active = membership(role);
      expect(canCreateSchool(role)).toBe(false);
      expect(canEditSchool(role, active, 'school-own')).toBe(false);
      expect(canCreateBranch(role, active, 'school-own')).toBe(false);
      expect(canManageAcademicSessions(role, active, 'school-own')).toBe(
        false,
      );
      expect(canEditSchoolSettings(role, active, 'school-own')).toBe(false);
    },
  );
});
