import type { AppRole } from '../../src/constants/permissions';
import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import {
  canAssignClassSubjects,
  canManageClasses,
  canManageSections,
  canManageSubjects,
  canViewClasses,
  canViewSections,
  canViewSubjects,
} from '../../src/utils/academicPermissions';

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

const viewPermissions: PermissionKey[] = [
  'academic.class.view',
  'academic.section.view',
  'academic.subject.view',
];
const managePermissions: PermissionKey[] = [
  ...viewPermissions,
  'academic.class.manage',
  'academic.section.manage',
];

describe('academic permission guards', () => {
  it('grants Super Admin full selected-school context access', () => {
    const active = membership('SUPER_ADMIN', undefined);
    expect(canViewClasses(active, [], 'school-any', 'branch-any')).toBe(true);
    expect(
      canManageClasses(active, [], 'school-any', 'branch-any', 'ACTIVE'),
    ).toBe(true);
    expect(canManageSubjects(active, [], 'school-any')).toBe(true);
  });

  it('grants School Admin full access in its own school', () => {
    const active = membership('SCHOOL_ADMIN');
    expect(canViewClasses(active, [], 'school-omt', 'branch-any')).toBe(true);
    expect(
      canManageSections(active, [], 'school-omt', 'branch-any', 'UPCOMING'),
    ).toBe(true);
    expect(canManageSubjects(active, [], 'school-omt')).toBe(true);
  });

  it('blocks School Admin from another school', () => {
    const active = membership('SCHOOL_ADMIN');
    expect(canViewClasses(active, [], 'school-other', 'branch-main')).toBe(
      false,
    );
    expect(canViewSubjects(active, [], 'school-other')).toBe(false);
  });

  it('allows Branch Admin views only in its assigned branch', () => {
    const active = membership('BRANCH_ADMIN', 'school-omt', 'branch-main');
    expect(
      canViewClasses(active, viewPermissions, 'school-omt', 'branch-main'),
    ).toBe(true);
    expect(
      canViewSections(active, viewPermissions, 'school-omt', 'branch-other'),
    ).toBe(false);
  });

  it('keeps Branch Admin read-only without manage permissions', () => {
    const active = membership('BRANCH_ADMIN', 'school-omt', 'branch-main');
    expect(
      canManageClasses(
        active,
        viewPermissions,
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
    expect(
      canManageSections(
        active,
        viewPermissions,
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(false);
  });

  it('uses effective Branch Admin manage permissions', () => {
    const active = membership('BRANCH_ADMIN', 'school-omt', 'branch-main');
    expect(
      canManageClasses(
        active,
        managePermissions,
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
    expect(
      canAssignClassSubjects(
        active,
        managePermissions,
        'school-omt',
        'branch-main',
        'ACTIVE',
      ),
    ).toBe(true);
  });

  it('makes closed sessions read-only for every role', () => {
    const superAdmin = membership('SUPER_ADMIN', undefined);
    const schoolAdmin = membership('SCHOOL_ADMIN');
    expect(
      canManageClasses(
        superAdmin,
        [],
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
    expect(
      canAssignClassSubjects(
        schoolAdmin,
        [],
        'school-omt',
        'branch-main',
        'CLOSED',
      ),
    ).toBe(false);
  });

  it.each(['ACCOUNTANT', 'RECEPTIONIST'] as const)(
    'blocks %s from academic setup management',
    role => {
      const active = membership(role, 'school-omt', 'branch-main');
      expect(
        canManageClasses(
          active,
          [],
          'school-omt',
          'branch-main',
          'ACTIVE',
        ),
      ).toBe(false);
      expect(canManageSubjects(active, [], 'school-omt')).toBe(false);
    },
  );

  it.each(['PARENT', 'STUDENT'] as const)(
    'blocks %s from academic setup routes and data access',
    role => {
      const active = membership(role);
      expect(
        canViewClasses(active, [], 'school-omt', 'branch-main'),
      ).toBe(false);
      expect(canViewSubjects(active, [], 'school-omt')).toBe(false);
    },
  );
});
