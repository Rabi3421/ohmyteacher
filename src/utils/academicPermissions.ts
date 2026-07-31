import type { PermissionKey } from '../constants/userPermissions';
import type { UserMembership } from '../models/auth';
import type { AcademicSessionStatus } from '../models/organization';
import { hasAllPermissions, hasPermission } from './effectivePermissions';

function contextAllowed(
  membership: UserMembership,
  schoolId: string,
  branchId?: string,
): boolean {
  if (membership.role === 'SUPER_ADMIN') return true;
  if (membership.schoolId !== schoolId) return false;
  return (
    membership.role !== 'BRANCH_ADMIN' ||
    !branchId ||
    membership.branchId === branchId
  );
}

function view(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string | undefined,
  permission: PermissionKey,
): boolean {
  return (
    contextAllowed(membership, schoolId, branchId) &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasPermission(permissions, permission))
  );
}

function manage(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string | undefined,
  sessionStatus: AcademicSessionStatus | undefined,
  permission: PermissionKey,
): boolean {
  return (
    sessionStatus !== 'CLOSED' &&
    view(membership, permissions, schoolId, branchId, permission) &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasPermission(permissions, permission.replace('.view', '.manage') as PermissionKey))
  );
}

export const canViewClasses = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  view(
    membership,
    permissions,
    schoolId,
    branchId,
    'academic.class.view',
  );

export const canManageClasses = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  manage(
    membership,
    permissions,
    schoolId,
    branchId,
    sessionStatus,
    'academic.class.view',
  );

export const canViewSections = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId?: string,
) =>
  view(
    membership,
    permissions,
    schoolId,
    branchId,
    'academic.section.view',
  );

export const canManageSections = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
) =>
  manage(
    membership,
    permissions,
    schoolId,
    branchId,
    sessionStatus,
    'academic.section.view',
  );

export const canViewSubjects = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
) =>
  view(
    membership,
    permissions,
    schoolId,
    undefined,
    'academic.subject.view',
  );

export const canManageSubjects = (
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
) =>
  contextAllowed(membership, schoolId) &&
  (membership.role === 'SUPER_ADMIN' ||
    membership.role === 'SCHOOL_ADMIN' ||
    hasPermission(permissions, 'academic.subject.manage'));

export function canAssignClassSubjects(
  membership: UserMembership,
  permissions: readonly PermissionKey[],
  schoolId: string,
  branchId: string,
  sessionStatus?: AcademicSessionStatus,
): boolean {
  return (
    sessionStatus !== 'CLOSED' &&
    contextAllowed(membership, schoolId, branchId) &&
    (membership.role === 'SUPER_ADMIN' ||
      membership.role === 'SCHOOL_ADMIN' ||
      hasAllPermissions(permissions, [
        'academic.class.manage',
        'academic.subject.view',
      ]))
  );
}
