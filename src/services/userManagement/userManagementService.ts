import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  ActivityQuery,
  CreateStaffMembershipInput,
  MembershipStatus,
  SchoolRoleConfiguration,
  StaffMembership,
  StaffRole,
  StaffUserDetails,
  StaffUserListQuery,
  StaffUserSummary,
  UpdateMembershipInput,
  UpdateRoleConfigurationInput,
  UpdateUserIdentityInput,
  UserActivity,
  UserIdentity,
  UserSessionSummary,
  UserStatus,
  RoleDefinition,
} from '../../models/userManagement';
import type { AppRole } from '../../constants/permissions';

export interface UserManagementService {
  getStaffUsers(
    schoolId: string,
    query: StaffUserListQuery,
  ): Promise<ApiResponse<PaginatedResponse<StaffUserSummary>>>;
  getStaffUser(
    schoolId: string,
    membershipId: string,
  ): Promise<ApiResponse<StaffUserDetails>>;
  findUserByMobile(
    mobile: string,
  ): Promise<ApiResponse<UserIdentity | null>>;
  createStaffMembership(
    schoolId: string,
    input: CreateStaffMembershipInput,
  ): Promise<ApiResponse<StaffUserDetails>>;
  updateUserIdentity(
    userId: string,
    input: UpdateUserIdentityInput,
  ): Promise<ApiResponse<UserIdentity>>;
  updateUserStatus(
    userId: string,
    status: UserStatus,
  ): Promise<ApiResponse<UserIdentity>>;
  updateMembership(
    schoolId: string,
    membershipId: string,
    input: UpdateMembershipInput,
  ): Promise<ApiResponse<StaffMembership>>;
  changeMembershipRole(
    schoolId: string,
    membershipId: string,
    role: StaffRole,
  ): Promise<ApiResponse<StaffUserDetails>>;
  assignBranches(
    schoolId: string,
    membershipId: string,
    branchIds: string[],
  ): Promise<ApiResponse<StaffMembership>>;
  updateMembershipStatus(
    schoolId: string,
    membershipId: string,
    status: MembershipStatus,
  ): Promise<ApiResponse<StaffMembership>>;
  getRoles(schoolId: string): Promise<ApiResponse<RoleDefinition[]>>;
  getRoleConfiguration(
    schoolId: string,
    role: AppRole,
  ): Promise<ApiResponse<SchoolRoleConfiguration>>;
  updateRoleConfiguration(
    schoolId: string,
    role: AppRole,
    input: UpdateRoleConfigurationInput,
  ): Promise<ApiResponse<SchoolRoleConfiguration>>;
  getActiveSessions(
    schoolId: string,
    membershipId: string,
  ): Promise<ApiResponse<UserSessionSummary[]>>;
  revokeSession(
    schoolId: string,
    membershipId: string,
    sessionId: string,
  ): Promise<ApiResponse<null>>;
  revokeOtherSessions(
    schoolId: string,
    membershipId: string,
  ): Promise<ApiResponse<null>>;
  revokeAllSessions(
    schoolId: string,
    membershipId: string,
  ): Promise<ApiResponse<null>>;
  resendLoginInstructions(
    schoolId: string,
    membershipId: string,
  ): Promise<ApiResponse<null>>;
  getUserActivity(
    schoolId: string,
    membershipId: string,
    query?: ActivityQuery,
  ): Promise<ApiResponse<PaginatedResponse<UserActivity>>>;
}
