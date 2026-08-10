import type { AppRole } from '../constants/permissions';
import type { UserMembership } from '../models/auth';

// These guards improve the frontend experience only. The Python backend must
// independently enforce every permission and tenant boundary.
export function canViewSchool(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    ['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role) &&
    membership.schoolId === schoolId
  );
}

export function canCreateSchool(role: AppRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canEditSchool(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId
  );
}

export function canChangeSchoolStatus(role: AppRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canCreateBranch(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId
  );
}

export const canEditBranch = canCreateBranch;
export const canChangeBranchStatus = canCreateBranch;

export function canViewBranch(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
  branchId: string,
): boolean {
  if (!['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(role)) return false;
  if (membership.schoolId !== schoolId) {
    return false;
  }
  return role !== 'BRANCH_ADMIN' || membership.branchId === branchId;
}

export function canManageAcademicSessions(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId
  );
}

export function canEditSchoolSettings(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return canManageAcademicSessions(role, membership, schoolId);
}
