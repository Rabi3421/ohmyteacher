import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { AppRole } from '../../constants/permissions';
import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  CreateStaffMembershipInput,
  MembershipStatus,
  RoleDefinition,
  SchoolRoleConfiguration,
  StaffRole,
  StaffUserDetails,
  StaffUserListQuery,
  StaffUserSummary,
  UpdateUserIdentityInput,
  UserActivity,
  UserIdentity,
  UserSessionSummary,
  UserStatus,
} from '../../models/userManagement';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { UserManagementService } from '../../services/userManagement/userManagementService';
import { userManagementService } from '../../services/userManagement/userManagementServiceResolver';
import {
  canAssignRole,
  canCreateStaff,
  canEditStaff,
  canManageRolePermissions,
  canRevokeUserSessions,
  canViewStaff,
  canViewUserActivity,
} from '../../utils/userManagementPermissions';
import { authStore } from '../auth/authStore';

export interface UserManagementState {
  staff: PaginatedResponse<StaffUserSummary>;
  staffQuery: StaffUserListQuery;
  currentStaff: StaffUserDetails | null;
  foundIdentity: UserIdentity | null;
  roles: RoleDefinition[];
  currentRole: RoleDefinition | null;
  roleConfiguration: SchoolRoleConfiguration | null;
  activeSessions: UserSessionSummary[];
  activity: PaginatedResponse<UserActivity>;
  isLoadingStaff: boolean;
  isLoadingStaffDetails: boolean;
  isSearchingIdentity: boolean;
  isCreatingStaff: boolean;
  isUpdatingIdentity: boolean;
  isUpdatingMembership: boolean;
  isLoadingRoles: boolean;
  isSavingPermissions: boolean;
  isLoadingSessions: boolean;
  isRevokingSessions: boolean;
  isLoadingActivity: boolean;
  isSendingInstructions: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface UserManagementActions {
  setStaffQuery: (query: Partial<StaffUserListQuery>) => void;
  loadStaff: (schoolId: string) => Promise<void>;
  loadStaffUser: (
    schoolId: string,
    membershipId: string,
  ) => Promise<boolean>;
  findIdentity: (mobile: string) => Promise<UserIdentity | null>;
  createStaff: (
    schoolId: string,
    input: CreateStaffMembershipInput,
  ) => Promise<StaffUserDetails | null>;
  updateIdentity: (
    schoolId: string,
    membershipId: string,
    input: UpdateUserIdentityInput,
  ) => Promise<boolean>;
  updateUserStatus: (
    schoolId: string,
    membershipId: string,
    status: UserStatus,
  ) => Promise<boolean>;
  updateMembershipStatus: (
    schoolId: string,
    membershipId: string,
    status: MembershipStatus,
  ) => Promise<boolean>;
  changeRole: (
    schoolId: string,
    membershipId: string,
    role: StaffRole,
  ) => Promise<boolean>;
  assignBranches: (
    schoolId: string,
    membershipId: string,
    branchIds: string[],
  ) => Promise<boolean>;
  loadRoles: (schoolId: string) => Promise<void>;
  selectRole: (role: AppRole) => void;
  loadRoleConfiguration: (
    schoolId: string,
    role: AppRole,
  ) => Promise<void>;
  saveRoleConfiguration: (
    schoolId: string,
    role: AppRole,
    enabledPermissions: PermissionKey[],
    disabledPermissions: PermissionKey[],
  ) => Promise<boolean>;
  loadActiveSessions: (
    schoolId: string,
    membershipId: string,
  ) => Promise<void>;
  revokeSession: (
    schoolId: string,
    membershipId: string,
    sessionId: string,
  ) => Promise<boolean>;
  revokeOtherSessions: (
    schoolId: string,
    membershipId: string,
  ) => Promise<boolean>;
  revokeAllSessions: (
    schoolId: string,
    membershipId: string,
  ) => Promise<boolean>;
  resendLoginInstructions: (
    schoolId: string,
    membershipId: string,
  ) => Promise<boolean>;
  loadActivity: (
    schoolId: string,
    membershipId: string,
  ) => Promise<void>;
  clearFeedback: () => void;
  reset: () => void;
}

export type UserManagementStoreState =
  UserManagementState & UserManagementActions;

interface Dependencies {
  service: UserManagementService;
  getMembership: () => UserMembership | null;
}

function emptyPage<T>(): PaginatedResponse<T> {
  return {
    items: [],
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  };
}

export const INITIAL_USER_MANAGEMENT_STATE: UserManagementState = {
  activeSessions: [],
  activity: emptyPage<UserActivity>(),
  currentRole: null,
  currentStaff: null,
  error: null,
  foundIdentity: null,
  isCreatingStaff: false,
  isLoadingActivity: false,
  isLoadingRoles: false,
  isLoadingSessions: false,
  isLoadingStaff: false,
  isLoadingStaffDetails: false,
  isRevokingSessions: false,
  isSavingPermissions: false,
  isSearchingIdentity: false,
  isSendingInstructions: false,
  isUpdatingIdentity: false,
  isUpdatingMembership: false,
  roleConfiguration: null,
  roles: [],
  staff: emptyPage<StaffUserSummary>(),
  staffQuery: {
    branchId: 'ALL',
    page: 1,
    pageSize: 20,
    role: 'ALL',
    status: 'ALL',
  },
  successMessage: null,
};

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      fieldErrors: error.fieldErrors,
      message: error.message,
      status: error.status,
    };
  }
  return {
    code: 'UNEXPECTED_ERROR',
    message: 'Something went wrong. Try again.',
  };
}

function accessError(message: string): ApiClientError {
  return new ApiClientError({
    code: 'USER_MANAGEMENT_ACCESS_DENIED',
    message,
    status: 403,
  });
}

export function createUserManagementStore({
  service,
  getMembership,
}: Dependencies): StoreApi<UserManagementStoreState> {
  return createStore<UserManagementStoreState>()((set, get) => {
    function membership(): UserMembership {
      const active = getMembership();
      if (!active) throw accessError('Select a valid workspace to continue.');
      return active;
    }

    function authorizeView(schoolId: string): UserMembership {
      const active = membership();
      if (!canViewStaff(active.role, active, schoolId)) {
        throw accessError('You cannot view staff in this school.');
      }
      return active;
    }

    function authorizeManage(schoolId: string): UserMembership {
      const active = membership();
      if (!canEditStaff(active.role, active, schoolId)) {
        throw accessError('You cannot manage staff in this school.');
      }
      return active;
    }

    function targetAllowed(
      actor: UserMembership,
      target: StaffUserDetails,
    ): void {
      if (
        actor.role === 'BRANCH_ADMIN' &&
        (!actor.branchId ||
          !target.membership.branchIds.includes(actor.branchId))
      ) {
        throw accessError('You cannot access staff outside your branch.');
      }
      if (
        actor.role === 'SUPER_ADMIN' &&
        target.membership.role !== 'SCHOOL_ADMIN'
      ) {
        throw accessError(
          'Super Admin can manage only School Admin memberships in this context.',
        );
      }
    }

    return {
      ...INITIAL_USER_MANAGEMENT_STATE,

      setStaffQuery(query) {
        set(state => ({ staffQuery: { ...state.staffQuery, ...query } }));
      },

      async loadStaff(schoolId) {
        set({ error: null, isLoadingStaff: true });
        try {
          const active = authorizeView(schoolId);
          const scopedQuery =
            active.role === 'SUPER_ADMIN'
              ? { ...get().staffQuery, role: 'SCHOOL_ADMIN' as const }
              : active.role === 'BRANCH_ADMIN' && active.branchId
                ? { ...get().staffQuery, branchId: active.branchId }
                : get().staffQuery;
          const response = await service.getStaffUsers(
            schoolId,
            scopedQuery,
          );
          const items =
            active.role === 'BRANCH_ADMIN'
              ? response.data.items.filter(
                  item =>
                    Boolean(active.branchId) &&
                    item.membership.branchIds.includes(active.branchId!),
                )
              : active.role === 'SUPER_ADMIN'
                ? response.data.items.filter(
                    item => item.membership.role === 'SCHOOL_ADMIN',
                  )
                : response.data.items;
          set({
            isLoadingStaff: false,
            staff: {
              ...response.data,
              items,
              totalItems:
                items.length === response.data.items.length
                  ? response.data.totalItems
                  : items.length,
            },
          });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingStaff: false });
        }
      },

      async loadStaffUser(schoolId, membershipId) {
        set({ error: null, isLoadingStaffDetails: true });
        try {
          const active = authorizeView(schoolId);
          const response = await service.getStaffUser(schoolId, membershipId);
          targetAllowed(active, response.data);
          set({
            currentStaff: response.data,
            isLoadingStaffDetails: false,
          });
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isLoadingStaffDetails: false,
          });
          return false;
        }
      },

      async findIdentity(mobile) {
        set({ error: null, foundIdentity: null, isSearchingIdentity: true });
        try {
          const response = await service.findUserByMobile(mobile);
          set({
            foundIdentity: response.data,
            isSearchingIdentity: false,
          });
          return response.data;
        } catch (error) {
          set({
            error: normalizeError(error),
            isSearchingIdentity: false,
          });
          return null;
        }
      },

      async createStaff(schoolId, input) {
        set({ error: null, isCreatingStaff: true, successMessage: null });
        try {
          const active = membership();
          if (!canCreateStaff(active.role, active, schoolId)) {
            throw accessError('You cannot create staff in this school.');
          }
          if (!canAssignRole(active.role, input.role)) {
            throw accessError('You cannot assign the selected role.');
          }
          const response = await service.createStaffMembership(
            schoolId,
            input,
          );
          set(state => ({
            currentStaff: response.data,
            isCreatingStaff: false,
            staff: {
              ...state.staff,
              items: [response.data, ...state.staff.items],
              totalItems: state.staff.totalItems + 1,
            },
            successMessage: response.message,
          }));
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isCreatingStaff: false });
          return null;
        }
      },

      async updateIdentity(schoolId, membershipId, input) {
        set({ error: null, isUpdatingIdentity: true, successMessage: null });
        try {
          const actor = authorizeManage(schoolId);
          const target =
            get().currentStaff?.membership.id === membershipId
              ? get().currentStaff!
              : (await service.getStaffUser(schoolId, membershipId)).data;
          targetAllowed(actor, target);
          const response = await service.updateUserIdentity(
            target.identity.id,
            input,
          );
          set(state => ({
            currentStaff: state.currentStaff
              ? { ...state.currentStaff, identity: response.data }
              : null,
            isUpdatingIdentity: false,
            staff: {
              ...state.staff,
              items: state.staff.items.map(item =>
                item.membership.id === membershipId
                  ? { ...item, identity: response.data }
                  : item,
              ),
            },
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isUpdatingIdentity: false });
          return false;
        }
      },

      async updateUserStatus(schoolId, membershipId, status) {
        set({ error: null, isUpdatingIdentity: true, successMessage: null });
        try {
          const actor = authorizeManage(schoolId);
          if (actor.role !== 'SUPER_ADMIN') {
            throw accessError(
              'Only platform authority can change global user status.',
            );
          }
          const target = (
            await service.getStaffUser(schoolId, membershipId)
          ).data;
          targetAllowed(actor, target);
          const response = await service.updateUserStatus(
            target.identity.id,
            status,
          );
          set(state => ({
            currentStaff: state.currentStaff
              ? { ...state.currentStaff, identity: response.data }
              : null,
            isUpdatingIdentity: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isUpdatingIdentity: false });
          return false;
        }
      },

      async updateMembershipStatus(schoolId, membershipId, status) {
        set({
          error: null,
          isUpdatingMembership: true,
          successMessage: null,
        });
        try {
          const actor = authorizeManage(schoolId);
          const target = (
            await service.getStaffUser(schoolId, membershipId)
          ).data;
          targetAllowed(actor, target);
          const response = await service.updateMembershipStatus(
            schoolId,
            membershipId,
            status,
          );
          set(state => ({
            currentStaff: state.currentStaff
              ? { ...state.currentStaff, membership: response.data }
              : null,
            isUpdatingMembership: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isUpdatingMembership: false,
          });
          return false;
        }
      },

      async changeRole(schoolId, membershipId, role) {
        set({
          error: null,
          isUpdatingMembership: true,
          successMessage: null,
        });
        try {
          const actor = authorizeManage(schoolId);
          const target = (
            await service.getStaffUser(schoolId, membershipId)
          ).data;
          targetAllowed(actor, target);
          if (!canAssignRole(actor.role, role)) {
            throw accessError('You cannot assign the selected role.');
          }
          const response = await service.changeMembershipRole(
            schoolId,
            membershipId,
            role,
          );
          set({
            activeSessions: [],
            currentStaff: response.data,
            isUpdatingMembership: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isUpdatingMembership: false,
          });
          return false;
        }
      },

      async assignBranches(schoolId, membershipId, branchIds) {
        set({
          error: null,
          isUpdatingMembership: true,
          successMessage: null,
        });
        try {
          const actor = authorizeManage(schoolId);
          const target = (
            await service.getStaffUser(schoolId, membershipId)
          ).data;
          targetAllowed(actor, target);
          const response = await service.assignBranches(
            schoolId,
            membershipId,
            branchIds,
          );
          set(state => ({
            currentStaff: state.currentStaff
              ? {
                  ...state.currentStaff,
                  membership: response.data,
                }
              : null,
            isUpdatingMembership: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isUpdatingMembership: false,
          });
          return false;
        }
      },

      async loadRoles(schoolId) {
        set({ error: null, isLoadingRoles: true });
        try {
          const active = authorizeView(schoolId);
          const response = await service.getRoles(schoolId);
          set({
            isLoadingRoles: false,
            roles: response.data.filter(role =>
              active.role === 'SUPER_ADMIN'
                ? true
                : role.role !== 'SUPER_ADMIN',
            ),
          });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingRoles: false });
        }
      },

      selectRole(role) {
        set(state => ({
          currentRole:
            state.roles.find(item => item.role === role) ?? null,
        }));
      },

      async loadRoleConfiguration(schoolId, role) {
        set({ error: null, isLoadingRoles: true });
        try {
          authorizeView(schoolId);
          const response = await service.getRoleConfiguration(schoolId, role);
          set({
            isLoadingRoles: false,
            roleConfiguration: response.data,
          });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingRoles: false });
        }
      },

      async saveRoleConfiguration(
        schoolId,
        role,
        enabledPermissions,
        disabledPermissions,
      ) {
        set({
          error: null,
          isSavingPermissions: true,
          successMessage: null,
        });
        try {
          const active = membership();
          if (
            !canManageRolePermissions(active.role, active, schoolId)
          ) {
            throw accessError('You cannot configure role permissions.');
          }
          const response = await service.updateRoleConfiguration(
            schoolId,
            role,
            { disabledPermissions, enabledPermissions },
          );
          set({
            isSavingPermissions: false,
            roleConfiguration: response.data,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isSavingPermissions: false,
          });
          return false;
        }
      },

      async loadActiveSessions(schoolId, membershipId) {
        set({ error: null, isLoadingSessions: true });
        try {
          const active = authorizeView(schoolId);
          const target = (
            await service.getStaffUser(schoolId, membershipId)
          ).data;
          targetAllowed(active, target);
          const response = await service.getActiveSessions(
            schoolId,
            membershipId,
          );
          set({
            activeSessions: response.data,
            isLoadingSessions: false,
          });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingSessions: false });
        }
      },

      async revokeSession(schoolId, membershipId, sessionId) {
        set({ error: null, isRevokingSessions: true, successMessage: null });
        try {
          const active = membership();
          if (
            !canRevokeUserSessions(active.role, active, schoolId)
          ) {
            throw accessError('You cannot revoke user sessions.');
          }
          const response = await service.revokeSession(
            schoolId,
            membershipId,
            sessionId,
          );
          set(state => ({
            activeSessions: state.activeSessions.filter(
              item => item.id !== sessionId,
            ),
            isRevokingSessions: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isRevokingSessions: false,
          });
          return false;
        }
      },

      async revokeOtherSessions(schoolId, membershipId) {
        set({ error: null, isRevokingSessions: true, successMessage: null });
        try {
          authorizeManage(schoolId);
          const response = await service.revokeOtherSessions(
            schoolId,
            membershipId,
          );
          set(state => ({
            activeSessions: state.activeSessions.filter(
              item => item.isCurrent,
            ),
            isRevokingSessions: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isRevokingSessions: false,
          });
          return false;
        }
      },

      async revokeAllSessions(schoolId, membershipId) {
        set({ error: null, isRevokingSessions: true, successMessage: null });
        try {
          authorizeManage(schoolId);
          const response = await service.revokeAllSessions(
            schoolId,
            membershipId,
          );
          set({
            activeSessions: [],
            isRevokingSessions: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isRevokingSessions: false,
          });
          return false;
        }
      },

      async resendLoginInstructions(schoolId, membershipId) {
        set({ error: null, isSendingInstructions: true, successMessage: null });
        try {
          authorizeManage(schoolId);
          const response = await service.resendLoginInstructions(
            schoolId,
            membershipId,
          );
          set({
            isSendingInstructions: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({
            error: normalizeError(error),
            isSendingInstructions: false,
          });
          return false;
        }
      },

      async loadActivity(schoolId, membershipId) {
        set({ error: null, isLoadingActivity: true });
        try {
          const active = membership();
          if (!canViewUserActivity(active.role, active, schoolId)) {
            throw accessError('You cannot view user activity.');
          }
          const response = await service.getUserActivity(
            schoolId,
            membershipId,
          );
          set({ activity: response.data, isLoadingActivity: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingActivity: false });
        }
      },

      clearFeedback() {
        set({ error: null, successMessage: null });
      },

      reset() {
        set(INITIAL_USER_MANAGEMENT_STATE);
      },
    };
  });
}

export const userManagementStore = createUserManagementStore({
  getMembership: () => authStore.getState().activeMembership,
  service: userManagementService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    userManagementStore.getState().reset();
  }
});

export function useUserManagementStore<T>(
  selector: (state: UserManagementStoreState) => T,
): T {
  return useStore(userManagementStore, selector);
}
