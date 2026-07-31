import type { AppRole } from '../../src/constants/permissions';
import type { UserMembership } from '../../src/models/auth';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';
import * as permissions from '../../src/utils/marksResultPermissions';

const member = (role: AppRole): UserMembership => ({
  branchId: role === 'BRANCH_ADMIN' ? 'branch-main' : undefined,
  id: role,
  role,
  schoolId: role === 'SUPER_ADMIN' ? undefined : 'school-omt',
  status: 'ACTIVE',
  userId: 'actor',
});
const context = (role: AppRole) => ({
  branchId: 'branch-main',
  examStatus: 'IN_PROGRESS' as const,
  markSheetStatus: 'DRAFT' as const,
  membership: member(role),
  permissions: getEffectivePermissions(role),
  schoolId: 'school-omt',
  sessionStatus: 'ACTIVE' as const,
});

describe('Marks and Results permission guards', () => {
  it.each(['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const)(
    'grants %s full in-scope access',
    role => {
      const value = context(role);
      expect(permissions.canEnterMarks(value)).toBe(true);
      expect(permissions.canSubmitMarks(value)).toBe(true);
      expect(permissions.canCalculateResults(value)).toBe(true);
      expect(permissions.canPublishResults(value)).toBe(true);
    },
  );
  it('gives Branch Admin safe defaults and keeps elevated actions configurable', () => {
    const value = context('BRANCH_ADMIN');
    expect(permissions.canSubmitMarks(value)).toBe(true);
    expect(
      permissions.canLockMarks({ ...value, markSheetStatus: 'SUBMITTED' }),
    ).toBe(true);
    expect(
      permissions.canUnlockMarks({ ...value, markSheetStatus: 'LOCKED' }),
    ).toBe(false);
    expect(permissions.canPublishResults(value)).toBe(false);
  });
  it.each(['ACCOUNTANT', 'RECEPTIONIST', 'PARENT', 'STUDENT'] as const)(
    'blocks internal Marks/Result processing for %s',
    role => {
      expect(permissions.canViewMarks(context(role))).toBe(false);
      expect(permissions.canViewResults(context(role))).toBe(false);
    },
  );
  it('enforces Branch, closed-session, publication and lifecycle boundaries', () => {
    const value = context('BRANCH_ADMIN');
    expect(permissions.canViewMarks({ ...value, branchId: 'other' })).toBe(
      false,
    );
    expect(
      permissions.canEnterMarks({ ...value, sessionStatus: 'CLOSED' }),
    ).toBe(false);
    expect(permissions.canEnterMarks({ ...value, examStatus: 'DRAFT' })).toBe(
      false,
    );
    expect(
      permissions.canReturnMarksToDraft({
        ...value,
        hasActivePublication: true,
        markSheetStatus: 'SUBMITTED',
      }),
    ).toBe(false);
  });
});
