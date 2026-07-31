import { APP_ROLES } from '../../src/constants/permissions';
import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import { getBaseRoleDefinition } from '../../src/services/userManagement/roleDefinitions';
import {
  canCreateStudent,
  canEditStudent,
  canTransferStudent,
  canViewOwnChild,
  canViewOwnStudentProfile,
  canViewStudents,
} from '../../src/utils/studentPermissions';

function membership(
  role: UserMembership['role'],
  overrides: Partial<UserMembership> = {},
): UserMembership {
  return {
    id: `membership-${role.toLowerCase()}`,
    role,
    schoolId: 'school-omt',
    status: 'ACTIVE',
    userId: 'actor',
    ...overrides,
  };
}

function permissions(role: UserMembership['role']): PermissionKey[] {
  return [...getBaseRoleDefinition(role).defaultPermissions];
}

describe('student permissions and ownership', () => {
  it('allows Super Admin only after a concrete school context is selected', () => {
    const actor = membership('SUPER_ADMIN', { schoolId: undefined });
    expect(
      canViewStudents(actor, permissions('SUPER_ADMIN'), 'school-greenfield'),
    ).toBe(true);
  });

  it('allows School Admin in the own school and blocks another school', () => {
    const actor = membership('SCHOOL_ADMIN');
    expect(
      canEditStudent(actor, permissions('SCHOOL_ADMIN'), 'school-omt'),
    ).toBe(true);
    expect(
      canEditStudent(actor, permissions('SCHOOL_ADMIN'), 'school-greenfield'),
    ).toBe(false);
  });

  it('keeps Branch Admin inside the assigned branch', () => {
    const actor = membership('BRANCH_ADMIN', { branchId: 'branch-main' });
    expect(
      canViewStudents(
        actor,
        permissions('BRANCH_ADMIN'),
        'school-omt',
        'branch-main',
      ),
    ).toBe(true);
    expect(
      canViewStudents(
        actor,
        permissions('BRANCH_ADMIN'),
        'school-omt',
        'branch-other',
      ),
    ).toBe(false);
  });

  it('lets Receptionist admit but not transfer by default', () => {
    const actor = membership('RECEPTIONIST', { branchId: 'branch-main' });
    const defaults = permissions('RECEPTIONIST');
    expect(
      canCreateStudent(actor, defaults, 'school-omt', 'branch-main'),
    ).toBe(true);
    expect(
      canTransferStudent(
        actor,
        defaults,
        'school-omt',
        'branch-main',
        'branch-main',
      ),
    ).toBe(false);
  });

  it('keeps Accountant read-only for student records', () => {
    const actor = membership('ACCOUNTANT', { branchId: 'branch-main' });
    const defaults = permissions('ACCOUNTANT');
    expect(
      canViewStudents(actor, defaults, 'school-omt', 'branch-main'),
    ).toBe(true);
    expect(
      canCreateStudent(actor, defaults, 'school-omt', 'branch-main'),
    ).toBe(false);
    expect(
      canEditStudent(actor, defaults, 'school-omt', 'branch-main'),
    ).toBe(false);
  });

  it('allows a Parent only a linked child in the own school', () => {
    const actor = membership('PARENT');
    expect(
      canViewOwnChild(actor, 'school-omt', 'student-rahul', [
        'student-rahul',
      ]),
    ).toBe(true);
    expect(
      canViewOwnChild(actor, 'school-omt', 'student-arjun', [
        'student-rahul',
      ]),
    ).toBe(false);
    expect(
      canViewStudents(actor, permissions('PARENT'), 'school-omt'),
    ).toBe(false);
  });

  it('allows a Student only the profile linked to its membership', () => {
    const actor = membership('STUDENT', { studentId: 'student-arjun' });
    expect(
      canViewOwnStudentProfile(actor, 'school-omt', 'student-arjun'),
    ).toBe(true);
    expect(
      canViewOwnStudentProfile(actor, 'school-omt', 'student-rahul'),
    ).toBe(false);
    expect(
      canViewStudents(actor, permissions('STUDENT'), 'school-omt'),
    ).toBe(false);
  });

  it('does not introduce a Teacher application role', () => {
    expect(APP_ROLES).not.toContain('TEACHER');
  });
});
