import type { AppRole } from '../constants/permissions';
import type { UserMembership } from '../models/auth';
import type { StaffRole } from '../models/userManagement';

function inSchool(
  membership: UserMembership,
  schoolId: string,
): boolean {
  return membership.role === 'SUPER_ADMIN' || membership.schoolId === schoolId;
}

// UX guards only. The backend must independently enforce acting membership,
// tenant, branch scope, target membership, role assignment, and permission
// boundaries for every request.
export function canViewStaff(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    inSchool(membership, schoolId) &&
    (role === 'SCHOOL_ADMIN' || role === 'BRANCH_ADMIN')
  );
}

export function canCreateStaff(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    inSchool(membership, schoolId) &&
    (role === 'SCHOOL_ADMIN' || role === 'BRANCH_ADMIN')
  );
}

export const canEditStaff = canCreateStaff;
export function canAssignBranches(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId;
}
export const canChangeMembershipStatus = canCreateStaff;
export function canRevokeUserSessions(
  _role?: AppRole,
  _membership?: UserMembership,
  _schoolId?: string,
): boolean {
  return false;
}
export function canViewUserActivity(
  _role?: AppRole,
  _membership?: UserMembership,
  _schoolId?: string,
): boolean {
  return false;
}

export function canAssignRole(
  actorRole: AppRole,
  targetRole: StaffRole,
): boolean {
  if (actorRole === 'SUPER_ADMIN') return targetRole === 'SCHOOL_ADMIN';
  return (
    actorRole === 'SCHOOL_ADMIN' &&
    (targetRole === 'BRANCH_ADMIN' ||
      targetRole === 'ACCOUNTANT' ||
      targetRole === 'RECEPTIONIST')
  );
}

export function canManageRolePermissions(
  role: AppRole,
  membership: UserMembership,
  schoolId: string,
): boolean {
  return role === 'SCHOOL_ADMIN' && membership.schoolId === schoolId;
}
