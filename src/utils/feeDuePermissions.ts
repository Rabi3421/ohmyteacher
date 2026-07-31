import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { AcademicSessionStatus } from '../models/organization';
import { hasPermission } from './effectivePermissions';

const staffRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'];

function scoped(
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

function operational(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  permission: PermissionKey,
  sessionStatus?: AcademicSessionStatus,
) {
  return (
    staffRoles.includes(membership.role) &&
    scoped(membership, schoolId, branchId) &&
    sessionStatus !== 'CLOSED' &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasPermission(permissions, permission))
  );
}

export const canViewFeeDues = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  staffRoles.includes(membership.role) &&
  scoped(membership, schoolId, branchId) &&
  (membership.role === 'SUPER_ADMIN' ||
    membership.role === 'SCHOOL_ADMIN' ||
    hasPermission(permissions, 'fees.due.view'));

export const canViewGenerationHistory = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  canViewFeeDues(membership, permissions, schoolId, branchId) &&
  (membership.role === 'SUPER_ADMIN' ||
    membership.role === 'SCHOOL_ADMIN' ||
    hasPermission(permissions, 'fees.generation_history.view'));

export const canGenerateFeeDues = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  operational(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.due.generate',
    sessionStatus,
  );

export const canRefreshFeeFines = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  operational(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.fine.refresh',
    sessionStatus,
  );

export const canWaiveFeeFine = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  operational(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.fine.waive',
    sessionStatus,
  );

export const canWaiveFeeDue = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  operational(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.due.waive',
    sessionStatus,
  );

export const canCancelFeeDue = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  operational(
    membership,
    permissions,
    schoolId,
    branchId,
    'fees.due.cancel',
    sessionStatus,
  );
