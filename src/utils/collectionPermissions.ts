import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { AcademicSessionStatus } from '../models/organization';
import { hasPermission } from './effectivePermissions';

const STAFF_ROLES = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'BRANCH_ADMIN',
  'ACCOUNTANT',
  'RECEPTIONIST',
];

function inScope(
  membership: UserMembership,
  schoolId: string,
  branchId?: string,
): boolean {
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
): boolean {
  return (
    STAFF_ROLES.includes(membership.role) &&
    inScope(membership, schoolId, branchId) &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasPermission(permissions, permission))
  );
}

function mutable(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  permission: PermissionKey,
  sessionStatus?: AcademicSessionStatus,
): boolean {
  return (
    sessionStatus !== 'CLOSED' &&
    allowed(membership, permissions, schoolId, branchId, permission)
  );
}

export const canViewPayments = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) => allowed(membership, permissions, schoolId, branchId, 'payments.view');

export const canCollectPayment = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  mutable(
    membership,
    permissions,
    schoolId,
    branchId,
    'payments.collect',
    sessionStatus,
  );

export const canReversePayment = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  mutable(
    membership,
    permissions,
    schoolId,
    branchId,
    'payments.reverse',
    sessionStatus,
  );

export const canViewReceipts = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) => allowed(membership, permissions, schoolId, branchId, 'receipts.view');

export const canViewStudentLedger = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) => allowed(membership, permissions, schoolId, branchId, 'ledger.view');

export const canViewAdvanceCredit = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  allowed(membership, permissions, schoolId, branchId, 'payments.advance.view');

export const canManageAdvanceCredit = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  mutable(
    membership,
    permissions,
    schoolId,
    branchId,
    'payments.advance.manage',
    sessionStatus,
  );

export const canViewDailyCollection = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  allowed(membership, permissions, schoolId, branchId, 'collection.daily.view');

export const canAccessParentReceipt = (
  membership: UserMembership,
  schoolId: string,
  parentMembershipId: string,
) =>
  membership.role === 'PARENT' &&
  membership.status === 'ACTIVE' &&
  membership.schoolId === schoolId &&
  membership.id === parentMembershipId;

export const canAccessStudentReceipt = (
  membership: UserMembership,
  schoolId: string,
  studentMembershipId: string,
) =>
  membership.role === 'STUDENT' &&
  membership.status === 'ACTIVE' &&
  membership.schoolId === schoolId &&
  membership.id === studentMembershipId;
