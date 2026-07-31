import { ApiClientError } from '../api/apiError';
import type { UserManagementService } from './userManagementService';

function unavailable(): never {
  throw new ApiClientError({
    code: 'REAL_API_NOT_CONFIGURED',
    message: 'The user-management API is not configured in this build.',
  });
}

export const apiUserManagementService: UserManagementService = {
  getStaffUsers: async () => unavailable(),
  getStaffUser: async () => unavailable(),
  findUserByMobile: async () => unavailable(),
  createStaffMembership: async () => unavailable(),
  updateUserIdentity: async () => unavailable(),
  updateUserStatus: async () => unavailable(),
  updateMembership: async () => unavailable(),
  changeMembershipRole: async () => unavailable(),
  assignBranches: async () => unavailable(),
  updateMembershipStatus: async () => unavailable(),
  getRoles: async () => unavailable(),
  getRoleConfiguration: async () => unavailable(),
  updateRoleConfiguration: async () => unavailable(),
  getActiveSessions: async () => unavailable(),
  revokeSession: async () => unavailable(),
  revokeOtherSessions: async () => unavailable(),
  revokeAllSessions: async () => unavailable(),
  resendLoginInstructions: async () => unavailable(),
  getUserActivity: async () => unavailable(),
};
