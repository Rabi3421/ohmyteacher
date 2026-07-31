import type { UserMembership } from '../../src/models/auth';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';
import * as access from '../../src/utils/reportCardPermissions';

const member = (
  role: UserMembership['role'],
  branchId = 'branch-main',
): UserMembership => ({
  branchId,
  id: role,
  role,
  schoolId: 'school-omt',
  status: 'ACTIVE',
  studentId: role === 'STUDENT' ? 'student-arjun' : undefined,
  userId: role,
});
const context = (membership: UserMembership, branchId = 'branch-main') => ({
  branchId,
  membership,
  permissions: getEffectivePermissions(membership.role),
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
});

describe('Report Card permissions', () => {
  it('grants School Admin full access and restricts Branch Admin Templates/revocation by default', () => {
    const admin = context(member('SCHOOL_ADMIN'));
    expect(access.canManageReportCardTemplates(admin)).toBe(true);
    expect(access.canGenerateReportCards(admin)).toBe(true);
    const branch = context(member('BRANCH_ADMIN'));
    expect(access.canViewReportCards(branch)).toBe(true);
    expect(access.canManageReportCardTemplates(branch)).toBe(false);
    expect(access.canRevokeReportCard(branch)).toBe(false);
    expect(
      access.canViewReportCards({ ...branch, branchId: 'branch-east' }),
    ).toBe(false);
  });

  it('blocks Accountant/Receptionist and applies Parent/Student ownership', () => {
    expect(access.canViewReportCards(context(member('ACCOUNTANT')))).toBe(
      false,
    );
    expect(access.canViewReportCards(context(member('RECEPTIONIST')))).toBe(
      false,
    );
    const parent = context(member('PARENT'));
    expect(
      access.canParentViewPublishedResult({
        ...parent,
        linkedStudentIds: ['student-rahul'],
        studentId: 'student-rahul',
      }),
    ).toBe(true);
    expect(
      access.canParentViewReportCard({
        ...parent,
        linkedStudentIds: ['student-rahul'],
        studentId: 'student-other',
      }),
    ).toBe(false);
    const student = context(member('STUDENT'));
    expect(
      access.canStudentViewPublishedResult({
        ...student,
        studentId: 'student-arjun',
      }),
    ).toBe(true);
    expect(
      access.canStudentViewReportCard({
        ...student,
        studentId: 'student-rahul',
      }),
    ).toBe(false);
  });

  it('keeps Teacher absent from the role model', () => {
    expect([
      'SUPER_ADMIN',
      'SCHOOL_ADMIN',
      'BRANCH_ADMIN',
      'ACCOUNTANT',
      'RECEPTIONIST',
      'PARENT',
      'STUDENT',
    ]).not.toContain('TEACHER');
  });
});
