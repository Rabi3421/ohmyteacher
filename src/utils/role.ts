import type { AppRole } from '../constants/permissions';

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

export function isSupportedRole(role: string): role is AppRole {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role);
}
