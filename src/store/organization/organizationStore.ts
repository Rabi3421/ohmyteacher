import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  AcademicSession,
  Branch,
  BranchListQuery,
  BranchStatus,
  CreateAcademicSessionInput,
  CreateBranchInput,
  CreateSchoolInput,
  CreateSchoolResult,
  School,
  SchoolListQuery,
  SchoolSettings,
  SchoolStatus,
  UpdateAcademicSessionInput,
  UpdateBranchInput,
  UpdateSchoolInput,
  UpdateSchoolSettingsInput,
} from '../../models/organization';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import {
  organizationService,
} from '../../services/organization/organizationServiceResolver';
import type { OrganizationService } from '../../services/organization/organizationService';
import { authStore } from '../auth/authStore';

export interface OrganizationState {
  schools: PaginatedResponse<School>;
  schoolQuery: SchoolListQuery;
  currentSchool: School | null;
  branches: PaginatedResponse<Branch>;
  branchQuery: BranchListQuery;
  currentBranch: Branch | null;
  academicSessions: AcademicSession[];
  schoolSettings: SchoolSettings | null;
  createSchoolResult: CreateSchoolResult | null;
  isLoadingSchools: boolean;
  isLoadingSchool: boolean;
  isCreatingSchool: boolean;
  isUpdatingSchool: boolean;
  isLoadingBranches: boolean;
  isSavingBranch: boolean;
  isLoadingSessions: boolean;
  isSavingSession: boolean;
  isLoadingSettings: boolean;
  isSavingSettings: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface OrganizationActions {
  setSchoolQuery: (query: Partial<SchoolListQuery>) => void;
  loadSchools: () => Promise<void>;
  loadSchool: (schoolId: string) => Promise<boolean>;
  createSchool: (input: CreateSchoolInput) => Promise<CreateSchoolResult | null>;
  updateSchool: (schoolId: string, input: UpdateSchoolInput) => Promise<boolean>;
  updateSchoolStatus: (
    schoolId: string,
    status: SchoolStatus,
  ) => Promise<boolean>;
  setBranchQuery: (query: Partial<BranchListQuery>) => void;
  loadBranches: (schoolId: string) => Promise<void>;
  loadBranch: (schoolId: string, branchId: string) => Promise<boolean>;
  createBranch: (
    schoolId: string,
    input: CreateBranchInput,
  ) => Promise<Branch | null>;
  updateBranch: (
    schoolId: string,
    branchId: string,
    input: UpdateBranchInput,
  ) => Promise<boolean>;
  updateBranchStatus: (
    schoolId: string,
    branchId: string,
    status: BranchStatus,
  ) => Promise<boolean>;
  loadAcademicSessions: (schoolId: string) => Promise<void>;
  createAcademicSession: (
    schoolId: string,
    input: CreateAcademicSessionInput,
  ) => Promise<AcademicSession | null>;
  updateAcademicSession: (
    schoolId: string,
    sessionId: string,
    input: UpdateAcademicSessionInput,
  ) => Promise<boolean>;
  activateAcademicSession: (
    schoolId: string,
    sessionId: string,
  ) => Promise<boolean>;
  closeAcademicSession: (
    schoolId: string,
    sessionId: string,
  ) => Promise<boolean>;
  loadSchoolSettings: (schoolId: string) => Promise<void>;
  updateSchoolSettings: (
    schoolId: string,
    input: UpdateSchoolSettingsInput,
  ) => Promise<boolean>;
  clearFeedback: () => void;
  clearSelection: () => void;
  reset: () => void;
}

export type OrganizationStoreState = OrganizationState & OrganizationActions;

interface Dependencies {
  service: OrganizationService;
  getMembership: () => UserMembership | null;
}

const emptyPage = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});

export const INITIAL_ORGANIZATION_STATE: OrganizationState = {
  academicSessions: [],
  branchQuery: { page: 1, pageSize: 20, status: 'ALL' },
  branches: emptyPage<Branch>(),
  createSchoolResult: null,
  currentBranch: null,
  currentSchool: null,
  error: null,
  isCreatingSchool: false,
  isLoadingBranches: false,
  isLoadingSchool: false,
  isLoadingSchools: false,
  isLoadingSessions: false,
  isLoadingSettings: false,
  isSavingBranch: false,
  isSavingSession: false,
  isSavingSettings: false,
  isUpdatingSchool: false,
  schoolQuery: { page: 1, pageSize: 20, status: 'ALL' },
  schoolSettings: null,
  schools: emptyPage<School>(),
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
  return { code: 'UNEXPECTED_ERROR', message: 'Something went wrong. Try again.' };
}

function accessError(message: string): ApiClientError {
  return new ApiClientError({
    code: 'ORGANIZATION_ACCESS_DENIED',
    message,
    status: 403,
  });
}

export function createOrganizationStore({
  service,
  getMembership,
}: Dependencies): StoreApi<OrganizationStoreState> {
  return createStore<OrganizationStoreState>()((set, get) => {
    function membership(): UserMembership {
      return (
        getMembership() ??
        (() => {
          throw accessError('Select a valid workspace to continue.');
        })()
      );
    }

    function authorizeSchool(schoolId: string): UserMembership {
      const active = membership();
      if (
        active.role !== 'SUPER_ADMIN' &&
        active.schoolId !== schoolId
      ) {
        throw accessError('You cannot access another school.');
      }
      return active;
    }

    function authorizeManagement(schoolId: string): UserMembership {
      const active = authorizeSchool(schoolId);
      if (
        active.role !== 'SUPER_ADMIN' &&
        active.role !== 'SCHOOL_ADMIN'
      ) {
        throw accessError('This workspace has read-only organization access.');
      }
      return active;
    }

    return {
      ...INITIAL_ORGANIZATION_STATE,

      setSchoolQuery(query) {
        set(state => ({
          schoolQuery: { ...state.schoolQuery, ...query },
        }));
      },

      async loadSchools() {
        set({ error: null, isLoadingSchools: true });
        try {
          if (membership().role !== 'SUPER_ADMIN') {
            throw accessError('Only Super Admin can view all schools.');
          }
          const response = await service.getSchools(get().schoolQuery);
          set({ isLoadingSchools: false, schools: response.data });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingSchools: false });
        }
      },

      async loadSchool(schoolId) {
        set({ error: null, isLoadingSchool: true });
        try {
          authorizeSchool(schoolId);
          const response = await service.getSchool(schoolId);
          set({ currentSchool: response.data, isLoadingSchool: false });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingSchool: false });
          return false;
        }
      },

      async createSchool(input) {
        set({ error: null, isCreatingSchool: true, successMessage: null });
        try {
          if (membership().role !== 'SUPER_ADMIN') {
            throw accessError('Only Super Admin can create schools.');
          }
          const response = await service.createSchool(input);
          set(state => ({
            createSchoolResult: response.data,
            currentSchool: response.data.school,
            isCreatingSchool: false,
            schools: {
              ...state.schools,
              items: [response.data.school, ...state.schools.items],
              totalItems: state.schools.totalItems + 1,
            },
            successMessage: response.message,
          }));
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isCreatingSchool: false });
          return null;
        }
      },

      async updateSchool(schoolId, input) {
        set({ error: null, isUpdatingSchool: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.updateSchool(schoolId, input);
          set(state => ({
            currentSchool: response.data,
            isUpdatingSchool: false,
            schools: {
              ...state.schools,
              items: state.schools.items.map(item =>
                item.id === schoolId ? response.data : item,
              ),
            },
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isUpdatingSchool: false });
          return false;
        }
      },

      async updateSchoolStatus(schoolId, status) {
        set({ error: null, isUpdatingSchool: true, successMessage: null });
        try {
          if (membership().role !== 'SUPER_ADMIN') {
            throw accessError('Only Super Admin can change school status.');
          }
          const response = await service.updateSchoolStatus(schoolId, status);
          set(state => ({
            currentSchool: response.data,
            isUpdatingSchool: false,
            schools: {
              ...state.schools,
              items: state.schools.items.map(item =>
                item.id === schoolId ? response.data : item,
              ),
            },
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isUpdatingSchool: false });
          return false;
        }
      },

      setBranchQuery(query) {
        set(state => ({ branchQuery: { ...state.branchQuery, ...query } }));
      },

      async loadBranches(schoolId) {
        set({ error: null, isLoadingBranches: true });
        try {
          const active = authorizeSchool(schoolId);
          const response = await service.getBranches(
            schoolId,
            get().branchQuery,
          );
          const data =
            active.role === 'BRANCH_ADMIN'
              ? {
                  ...response.data,
                  items: response.data.items.filter(
                    item => item.id === active.branchId,
                  ),
                  totalItems: response.data.items.filter(
                    item => item.id === active.branchId,
                  ).length,
                }
              : response.data;
          set({ branches: data, isLoadingBranches: false });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingBranches: false });
        }
      },

      async loadBranch(schoolId, branchId) {
        set({ error: null, isLoadingBranches: true });
        try {
          const active = authorizeSchool(schoolId);
          if (
            active.role === 'BRANCH_ADMIN' &&
            active.branchId !== branchId
          ) {
            throw accessError('You cannot access another branch.');
          }
          const response = await service.getBranch(schoolId, branchId);
          set({ currentBranch: response.data, isLoadingBranches: false });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isLoadingBranches: false });
          return false;
        }
      },

      async createBranch(schoolId, input) {
        set({ error: null, isSavingBranch: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.createBranch(schoolId, input);
          set(state => ({
            branches: {
              ...state.branches,
              items: [...state.branches.items, response.data],
              totalItems: state.branches.totalItems + 1,
            },
            currentBranch: response.data,
            isSavingBranch: false,
            successMessage: response.message,
          }));
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isSavingBranch: false });
          return null;
        }
      },

      async updateBranch(schoolId, branchId, input) {
        set({ error: null, isSavingBranch: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.updateBranch(
            schoolId,
            branchId,
            input,
          );
          set(state => ({
            branches: {
              ...state.branches,
              items: state.branches.items.map(item =>
                item.id === branchId ? response.data : item,
              ),
            },
            currentBranch: response.data,
            isSavingBranch: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingBranch: false });
          return false;
        }
      },

      async updateBranchStatus(schoolId, branchId, status) {
        set({ error: null, isSavingBranch: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.updateBranchStatus(
            schoolId,
            branchId,
            status,
          );
          set(state => ({
            branches: {
              ...state.branches,
              items: state.branches.items.map(item =>
                item.id === branchId ? response.data : item,
              ),
            },
            currentBranch:
              state.currentBranch?.id === branchId
                ? response.data
                : state.currentBranch,
            isSavingBranch: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingBranch: false });
          return false;
        }
      },

      async loadAcademicSessions(schoolId) {
        set({ error: null, isLoadingSessions: true });
        try {
          const active = authorizeSchool(schoolId);
          const response = await service.getAcademicSessions(schoolId);
          set({
            academicSessions:
              active.role === 'BRANCH_ADMIN'
                ? response.data.filter(item => item.status === 'ACTIVE')
                : response.data,
            isLoadingSessions: false,
          });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingSessions: false });
        }
      },

      async createAcademicSession(schoolId, input) {
        set({ error: null, isSavingSession: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.createAcademicSession(schoolId, input);
          set(state => ({
            academicSessions: [...state.academicSessions, response.data],
            isSavingSession: false,
            successMessage: response.message,
          }));
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isSavingSession: false });
          return null;
        }
      },

      async updateAcademicSession(schoolId, sessionId, input) {
        set({ error: null, isSavingSession: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.updateAcademicSession(
            schoolId,
            sessionId,
            input,
          );
          set(state => ({
            academicSessions: state.academicSessions.map(item =>
              item.id === sessionId ? response.data : item,
            ),
            isSavingSession: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingSession: false });
          return false;
        }
      },

      async activateAcademicSession(schoolId, sessionId) {
        set({ error: null, isSavingSession: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.activateAcademicSession(
            schoolId,
            sessionId,
          );
          set({
            academicSessions: response.data,
            isSavingSession: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingSession: false });
          return false;
        }
      },

      async closeAcademicSession(schoolId, sessionId) {
        set({ error: null, isSavingSession: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.closeAcademicSession(
            schoolId,
            sessionId,
          );
          set(state => ({
            academicSessions: state.academicSessions.map(item =>
              item.id === sessionId ? response.data : item,
            ),
            isSavingSession: false,
            successMessage: response.message,
          }));
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingSession: false });
          return false;
        }
      },

      async loadSchoolSettings(schoolId) {
        set({ error: null, isLoadingSettings: true });
        try {
          authorizeSchool(schoolId);
          const response = await service.getSchoolSettings(schoolId);
          set({ isLoadingSettings: false, schoolSettings: response.data });
        } catch (error) {
          set({ error: normalizeError(error), isLoadingSettings: false });
        }
      },

      async updateSchoolSettings(schoolId, input) {
        set({ error: null, isSavingSettings: true, successMessage: null });
        try {
          authorizeManagement(schoolId);
          const response = await service.updateSchoolSettings(schoolId, input);
          set({
            isSavingSettings: false,
            schoolSettings: response.data,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSavingSettings: false });
          return false;
        }
      },

      clearFeedback() {
        set({ error: null, successMessage: null });
      },

      clearSelection() {
        set({
          academicSessions: [],
          branches: emptyPage<Branch>(),
          currentBranch: null,
          currentSchool: null,
          schoolSettings: null,
        });
      },

      reset() {
        set(INITIAL_ORGANIZATION_STATE);
      },
    };
  });
}

export const organizationStore = createOrganizationStore({
  getMembership: () => authStore.getState().activeMembership,
  service: organizationService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    organizationStore.getState().reset();
  }
});

export function useOrganizationStore<T>(
  selector: (state: OrganizationStoreState) => T,
): T {
  return useStore(organizationStore, selector);
}
