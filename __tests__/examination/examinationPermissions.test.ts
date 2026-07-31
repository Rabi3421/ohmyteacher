import type { AppRole } from '../../src/constants/permissions';
import type { PermissionKey } from '../../src/constants/userPermissions';
import type { UserMembership } from '../../src/models/auth';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';
import {
  canCancelExam,
  canCopyExam,
  canCreateExam,
  canManageExamTypes,
  canScheduleExam,
  canViewExaminationSetup,
  isExaminationRole,
} from '../../src/utils/examinationPermissions';

const member = (role: AppRole, branchId?: string): UserMembership => ({
  branchId,
  id: role,
  role,
  schoolId: role === 'SUPER_ADMIN' ? undefined : 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
});
const context = (
  role: AppRole,
  permissions: PermissionKey[] = getEffectivePermissions(role),
) => ({
  branchId: 'branch-main',
  examStatus: 'DRAFT' as const,
  membership: member(role, role === 'BRANCH_ADMIN' ? 'branch-main' : undefined),
  permissions,
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
});

describe('Examination permission guards', () => {
  it.each(['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const)(
    'grants %s full selected-School setup access',
    role => {
      expect(canViewExaminationSetup(context(role))).toBe(true);
      expect(canManageExamTypes(context(role))).toBe(true);
      expect(canCreateExam(context(role))).toBe(true);
    },
  );

  it('grants Branch Admin assigned-Branch create/schedule but configurable cancellation', () => {
    const value = context('BRANCH_ADMIN');
    expect(canCreateExam(value)).toBe(true);
    expect(canScheduleExam(value)).toBe(true);
    expect(canManageExamTypes(value)).toBe(false);
    expect(canCancelExam(value)).toBe(false);
    expect(
      canCancelExam({
        ...value,
        permissions: [...value.permissions, 'exams.cancel'],
      }),
    ).toBe(true);
    expect(
      canViewExaminationSetup({ ...value, branchId: 'other-branch' }),
    ).toBe(false);
  });

  it.each(['ACCOUNTANT', 'RECEPTIONIST', 'PARENT', 'STUDENT'] as const)(
    'blocks %s from Examination Setup',
    role => {
      expect(canViewExaminationSetup(context(role))).toBe(false);
      expect(isExaminationRole(role)).toBe(false);
    },
  );

  it('makes closed Sessions read-only', () => {
    expect(
      canCreateExam({ ...context('SCHOOL_ADMIN'), sessionStatus: 'CLOSED' }),
    ).toBe(false);
    expect(
      canCopyExam({ ...context('SCHOOL_ADMIN'), sessionStatus: 'CLOSED' }),
    ).toBe(true);
  });
});
