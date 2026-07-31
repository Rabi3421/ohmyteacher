import type { AppRole } from '../constants/permissions';

export type RoleNavigatorKey =
  | 'SuperAdminNavigator'
  | 'SchoolAdminNavigator'
  | 'BranchAdminNavigator'
  | 'AccountantNavigator'
  | 'ReceptionistNavigator'
  | 'ParentNavigator'
  | 'StudentNavigator';

const ROLE_NAVIGATORS: Record<AppRole, RoleNavigatorKey> = {
  SUPER_ADMIN: 'SuperAdminNavigator',
  SCHOOL_ADMIN: 'SchoolAdminNavigator',
  BRANCH_ADMIN: 'BranchAdminNavigator',
  ACCOUNTANT: 'AccountantNavigator',
  RECEPTIONIST: 'ReceptionistNavigator',
  PARENT: 'ParentNavigator',
  STUDENT: 'StudentNavigator',
};

export function getNavigatorForRole(role: string): RoleNavigatorKey | null {
  return ROLE_NAVIGATORS[role as AppRole] ?? null;
}
