import type { AppRole } from '../constants/permissions';
import type {
  PermissionGroup,
  PermissionKey,
} from '../constants/userPermissions';
import type { AccountStatus } from './auth';
import type { ID } from './common';

export type StaffRole =
  | 'SCHOOL_ADMIN'
  | 'BRANCH_ADMIN'
  | 'ACCOUNTANT'
  | 'RECEPTIONIST';
export type MembershipStatus = 'ACTIVE' | 'INACTIVE';
export type UserStatus = AccountStatus;
export type RoleScope = 'PLATFORM' | 'SCHOOL' | 'BRANCH' | 'SELF';

export interface UserIdentity {
  id: ID;
  name: string;
  mobile: string;
  email?: string;
  avatarUrl?: string;
  status: UserStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffMembership {
  id: ID;
  userId: ID;
  schoolId: ID;
  role: StaffRole;
  status: MembershipStatus;
  branchIds: ID[];
  createdAt: string;
  updatedAt: string;
}

export interface BranchAssignmentSummary {
  id: ID;
  name: string;
  code: string;
}

export interface StaffUserSummary {
  identity: UserIdentity;
  membership: StaffMembership;
  branches: BranchAssignmentSummary[];
}

export interface StaffUserDetails extends StaffUserSummary {
  schoolName: string;
  effectiveAccess: EffectiveAccess;
  activeSessionCount: number;
}

export interface PermissionDefinition {
  key: PermissionKey;
  group: PermissionGroup;
  label: string;
  description: string;
}

export interface RoleDefinition {
  role: AppRole;
  label: string;
  description: string;
  scope: RoleScope;
  defaultPermissions: PermissionKey[];
  configurablePermissions: PermissionKey[];
  prohibitedPermissions: PermissionKey[];
  isSystemRole: true;
  activeMembershipCount: number;
}

export interface SchoolRoleConfiguration {
  schoolId: ID;
  role: AppRole;
  enabledPermissions: PermissionKey[];
  disabledPermissions: PermissionKey[];
  updatedAt: string;
}

export interface EffectiveAccess {
  role: AppRole;
  scope: RoleScope;
  branchIds: ID[];
  permissions: PermissionKey[];
}

export type UserActivityAction =
  | 'STAFF_USER_CREATED'
  | 'MEMBERSHIP_CREATED'
  | 'ROLE_CHANGED'
  | 'BRANCH_ASSIGNMENT_CHANGED'
  | 'MEMBERSHIP_ACTIVATED'
  | 'MEMBERSHIP_DEACTIVATED'
  | 'USER_STATUS_CHANGED'
  | 'PERMISSIONS_UPDATED'
  | 'SESSIONS_REVOKED'
  | 'LOGIN_INSTRUCTIONS_SENT';

export interface UserActivity {
  id: ID;
  schoolId: ID;
  targetUserId: ID;
  targetMembershipId?: ID;
  action: UserActivityAction;
  description: string;
  performedByUserId: ID;
  performedByName: string;
  performedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface UserSessionSummary {
  id: ID;
  membershipId: ID;
  deviceLabel: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  approximateDeviceId: string;
  loggedInAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'REVOKED';
}

export interface StaffUserListQuery {
  search?: string;
  role?: StaffRole | 'ALL';
  branchId?: ID | 'ALL';
  status?: MembershipStatus | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface CreateStaffMembershipInput {
  identity: {
    name: string;
    mobile: string;
    email?: string;
  };
  role: StaffRole;
  branchIds: ID[];
  status: MembershipStatus;
}

export type UpdateUserIdentityInput = Pick<
  UserIdentity,
  'name' | 'mobile' | 'email'
>;

export type UpdateMembershipInput = Pick<
  StaffMembership,
  'status' | 'branchIds'
>;

export interface UpdateRoleConfigurationInput {
  enabledPermissions: PermissionKey[];
  disabledPermissions: PermissionKey[];
}

export interface ActivityQuery {
  page?: number;
  pageSize?: number;
}
