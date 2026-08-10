import type { AppRole } from '../constants/permissions';
import type { BackendStaffRole } from '../models/liveStaff';

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  SCHOOL_ADMIN: 'School Admin',
  BRANCH_ADMIN: 'Branch Admin',
  ACCOUNTANT: 'Accountant',
  RECEPTIONIST: 'Receptionist',
  PARENT: 'Parent',
  STUDENT: 'Student',
};

export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role];
}

export function getBackendStaffRoleLabel(role: BackendStaffRole): string {
  return role === 'BRANCH_ADMIN' ? 'Branch Admin' : 'Teacher';
}

export function isSupportedRole(role: string): role is AppRole {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role);
}
