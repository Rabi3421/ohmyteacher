import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { AcademicSessionStatus } from '../models/organization';
import { hasPermission } from './effectivePermissions';

function scope(
  membership: UserMembership,
  schoolId: string,
  branchId?: string,
) {
  return (
    (membership.role === 'SUPER_ADMIN' || membership.schoolId === schoolId) &&
    (!branchId ||
      membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      membership.branchId === branchId)
  );
}

function allowed(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string | undefined,
  permission: PermissionKey,
  sessionStatus?: AcademicSessionStatus,
) {
  return (
    !['RECEPTIONIST', 'PARENT', 'STUDENT'].includes(membership.role) &&
    scope(membership, schoolId, branchId) &&
    sessionStatus !== 'CLOSED' &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasPermission(permissions, permission))
  );
}

export const canViewFeeSetup = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  !['RECEPTIONIST', 'PARENT', 'STUDENT'].includes(membership.role) &&
  scope(membership, schoolId, branchId) &&
  (membership.role === 'SUPER_ADMIN' ||
    membership.role === 'SCHOOL_ADMIN' ||
    hasPermission(permissions, 'fees.view'));

export const canManageFeeHeads = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    undefined,
    'fees.structure.manage',
    sessionStatus,
  ) && membership.role !== 'BRANCH_ADMIN';

export const canManageFeeStructures = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.structure.manage',
    sessionStatus,
  );

export const canManageStudentFeeAssignments = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.student_assignment.manage',
    sessionStatus,
  );

export const canManageDiscountDefinitions = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    undefined,
    'fees.discount.manage',
    sessionStatus,
  );

export const canManageFineRules = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    undefined,
    'fees.fine.manage',
    sessionStatus,
  );

export const canApplyAmountOverride = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.override.manage',
    sessionStatus,
  );

export const canApplyExemption = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  allowed(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.exemption.manage',
    sessionStatus,
  );
