import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import { hasPermission } from './effectivePermissions';

function schoolAllowed(
  membership: UserMembership,
  schoolId: string,
): boolean {
  return (
    membership.role === 'SUPER_ADMIN' || membership.schoolId === schoolId
  );
}

function branchAllowed(
  membership: UserMembership,
  schoolId: string,
  branchId?: string,
): boolean {
  return (
    schoolAllowed(membership, schoolId) &&
    (!branchId ||
      !['BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(
        membership.role,
      ) ||
      membership.branchId === branchId)
  );
}

function staffPermission(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string | undefined,
  permission: PermissionKey,
): boolean {
  return (
    !['PARENT', 'STUDENT'].includes(membership.role) &&
    branchAllowed(membership, schoolId, branchId) &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasPermission(permissions, permission))
  );
}

export const canViewStudents = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.view',
  );

export const canCreateStudent = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.create',
  );

export const canEditStudent = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.edit',
  );

export const canManageGuardians = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.guardians.manage',
  );

export const canManageEnrollment = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.enrollment.manage',
  );

export const canTransferStudent = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  sourceBranchId?: string,
  destinationBranchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    sourceBranchId,
    'students.transfer',
  ) &&
  branchAllowed(membership, schoolId, destinationBranchId);

export const canManageStudentStatus = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.status.manage',
  );

export const canManageStudentAccess = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.access.manage',
  );

export const canViewStudentHistory = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffPermission(
    membership,
    permissions,
    schoolId,
    branchId,
    'students.history.view',
  );

export function canViewOwnChild(
  membership: UserMembership,
  schoolId: string,
  studentId: string,
  linkedStudentIds: readonly string[],
): boolean {
  return (
    membership.role === 'PARENT' &&
    membership.schoolId === schoolId &&
    linkedStudentIds.includes(studentId)
  );
}

export function canViewOwnStudentProfile(
  membership: UserMembership,
  schoolId: string,
  studentId: string,
): boolean {
  return (
    membership.role === 'STUDENT' &&
    membership.schoolId === schoolId &&
    membership.studentId === studentId
  );
}
