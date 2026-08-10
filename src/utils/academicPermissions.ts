import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { AcademicSessionStatus } from '../models/organization';

// Phase 20 mirrors Django's fixed role checks. Configurable permission mocks
// intentionally do not grant authority over live academic endpoints.
function schoolScope(membership: UserMembership, schoolId: string): boolean {
  return membership.schoolId === schoolId &&
    (membership.role === 'SCHOOL_ADMIN' || membership.role === 'BRANCH_ADMIN');
}

function branchScope(
  membership: UserMembership,
  schoolId: string,
  branchId?: string,
): boolean {
  if (!schoolScope(membership, schoolId)) return false;
  return membership.role !== 'BRANCH_ADMIN' ||
    !branchId ||
    membership.branchId === branchId;
}

export const canViewClasses = (
  membership: UserMembership,
  _permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) => branchScope(membership, schoolId, branchId);

export const canManageClasses = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) => sessionStatus !== 'CLOSED' && canViewClasses(membership, permissions, schoolId, branchId);

export const canViewSections = canViewClasses;
export const canManageSections = canManageClasses;

export const canViewSubjects = (
  membership: UserMembership,
  _permissions: readonly PermissionKey[],
  schoolId: string,
) => schoolScope(membership, schoolId);

export const canManageSubjects = (
  membership: UserMembership,
  _permissions: readonly PermissionKey[],
  schoolId: string,
) => membership.role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId;

export function canAssignClassSubjects(
  membership: UserMembership,
  _permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
): boolean {
  return sessionStatus !== 'CLOSED' && branchScope(membership, schoolId, branchId);
}
