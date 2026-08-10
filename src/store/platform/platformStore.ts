import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { UserMembership } from '../../models/auth';
import type {
  CreatePlatformSchoolInput,
  CreatePlatformSchoolResult,
  PlatformDashboard,
  PlatformSchool,
  PlatformSchoolQuery,
  PlatformSchoolStatus,
  UpdatePlatformSchoolInput,
} from '../../models/platform';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { PlatformService } from '../../services/platform/platformService';
import { platformService } from '../../services/platform/platformServiceResolver';
import { authStore } from '../auth/authStore';

export interface PlatformState {
  dashboard: PlatformDashboard | null;
  allSchools: PlatformSchool[];
  schools: PlatformSchool[];
  schoolTotalItems: number;
  schoolQuery: PlatformSchoolQuery;
  currentSchool: PlatformSchool | null;
  createResult: CreatePlatformSchoolResult | null;
  paginationAvailable: boolean;
  isLoadingDashboard: boolean;
  isLoadingSchools: boolean;
  isLoadingSchool: boolean;
  isCreatingSchool: boolean;
  isMutatingSchool: boolean;
  dashboardError: ApiError | null;
  listError: ApiError | null;
  detailError: ApiError | null;
  mutationError: ApiError | null;
  successMessage: string | null;
}

export interface PlatformActions {
  setSchoolQuery: (query: Partial<PlatformSchoolQuery>) => void;
  loadDashboard: () => Promise<void>;
  cancelDashboardRequest: () => void;
  loadSchools: () => Promise<void>;
  cancelSchoolListRequest: () => void;
  loadSchool: (schoolId: string) => Promise<boolean>;
  cancelSchoolDetailRequest: () => void;
  createSchool: (
    input: CreatePlatformSchoolInput,
  ) => Promise<CreatePlatformSchoolResult | null>;
  updateSchool: (
    schoolId: string,
    input: UpdatePlatformSchoolInput,
  ) => Promise<boolean>;
  setSchoolStatus: (
    schoolId: string,
    status: PlatformSchoolStatus,
  ) => Promise<boolean>;
  clearFeedback: () => void;
  reset: () => void;
}

export type PlatformStoreState = PlatformState & PlatformActions;

interface Dependencies {
  service: PlatformService;
  getMembership: () => UserMembership | null;
}

export const INITIAL_PLATFORM_STATE: PlatformState = {
  allSchools: [],
  createResult: null,
  currentSchool: null,
  dashboard: null,
  dashboardError: null,
  detailError: null,
  isCreatingSchool: false,
  isLoadingDashboard: false,
  isLoadingSchool: false,
  isLoadingSchools: false,
  isMutatingSchool: false,
  listError: null,
  mutationError: null,
  paginationAvailable: false,
  schoolQuery: { status: 'ALL' },
  schoolTotalItems: 0,
  schools: [],
  successMessage: null,
};

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      fieldErrors: error.fieldErrors,
      kind: error.kind,
      message: error.message,
      nonFieldErrors: error.nonFieldErrors,
      retryable: error.retryable,
      status: error.status,
    };
  }
  return {
    code: 'UNEXPECTED_ERROR',
    kind: 'unknown',
    message: 'Something went wrong. Please try again.',
  };
}

function accessError(): ApiClientError {
  return new ApiClientError({
    code: 'PLATFORM_ACCESS_DENIED',
    kind: 'permission',
    message: 'Only a verified Super Admin can access platform management.',
    status: 403,
  });
}

function invalidSchoolId(): ApiClientError {
  return new ApiClientError({
    code: 'INVALID_SCHOOL_ID',
    kind: 'validation',
    message: 'This school reference is invalid.',
    status: 400,
  });
}

function isValidSchoolId(schoolId: string): boolean {
  return /^[1-9]\d*$/.test(schoolId);
}

function uniqueSchools(schools: PlatformSchool[]): PlatformSchool[] {
  const ids = new Set<string>();
  return schools.filter(school => {
    if (ids.has(school.id)) return false;
    ids.add(school.id);
    return true;
  });
}

function filterSchools(
  schools: PlatformSchool[],
  query: PlatformSchoolQuery,
): PlatformSchool[] {
  const search = query.search?.trim().toLowerCase() ?? '';
  return schools.filter(
    school =>
      (!query.status ||
        query.status === 'ALL' ||
        school.status === query.status) &&
      (!search ||
        school.name.toLowerCase().includes(search) ||
        school.phone.toLowerCase().includes(search) ||
        school.email.toLowerCase().includes(search) ||
        school.address.toLowerCase().includes(search)),
  );
}

export function createPlatformStore({
  service,
  getMembership,
}: Dependencies): StoreApi<PlatformStoreState> {
  return createStore<PlatformStoreState>()((set, get) => {
    let dashboardRequest = 0;
    let listRequest = 0;
    let detailRequest = 0;
    let lifecycle = 0;
    let dashboardController: AbortController | null = null;
    let listController: AbortController | null = null;
    let detailController: AbortController | null = null;

    function authorize(): void {
      if (getMembership()?.role !== 'SUPER_ADMIN') throw accessError();
    }

    function cancelRequests(): void {
      dashboardController?.abort();
      listController?.abort();
      detailController?.abort();
      dashboardController = null;
      listController = null;
      detailController = null;
      dashboardRequest += 1;
      listRequest += 1;
      detailRequest += 1;
    }

    return {
      ...INITIAL_PLATFORM_STATE,

      setSchoolQuery(query) {
        set(state => {
          const schoolQuery = { ...state.schoolQuery, ...query };
          return {
            schoolQuery,
            schools: filterSchools(state.allSchools, schoolQuery),
          };
        });
      },

      cancelDashboardRequest() {
        dashboardRequest += 1;
        dashboardController?.abort();
        dashboardController = null;
        set({ isLoadingDashboard: false });
      },

      async loadDashboard() {
        const requestId = ++dashboardRequest;
        dashboardController?.abort();
        const controller = new AbortController();
        dashboardController = controller;
        set({ dashboardError: null, isLoadingDashboard: true });
        try {
          authorize();
          const response = await service.getPlatformDashboard({
            signal: controller.signal,
          });
          if (requestId !== dashboardRequest) return;
          set({ dashboard: response.data, isLoadingDashboard: false });
        } catch (error) {
          if (requestId !== dashboardRequest) return;
          const normalized = normalizeError(error);
          if (normalized.kind === 'cancelled') {
            set({ isLoadingDashboard: false });
          } else {
            set({ dashboardError: normalized, isLoadingDashboard: false });
          }
        } finally {
          if (requestId === dashboardRequest) dashboardController = null;
        }
      },

      cancelSchoolListRequest() {
        listRequest += 1;
        listController?.abort();
        listController = null;
        set({ isLoadingSchools: false });
      },

      async loadSchools() {
        const requestId = ++listRequest;
        listController?.abort();
        const controller = new AbortController();
        listController = controller;
        set({ isLoadingSchools: true, listError: null });
        try {
          authorize();
          const response = await service.listSchools({
            signal: controller.signal,
          });
          if (requestId !== listRequest) return;
          const allSchools = uniqueSchools(response.data.items);
          set(state => ({
            allSchools,
            isLoadingSchools: false,
            paginationAvailable: response.data.pagination !== null,
            schoolTotalItems: response.data.totalItems,
            schools: filterSchools(allSchools, state.schoolQuery),
          }));
        } catch (error) {
          if (requestId !== listRequest) return;
          const normalized = normalizeError(error);
          if (normalized.kind === 'cancelled') {
            set({ isLoadingSchools: false });
          } else {
            set({ isLoadingSchools: false, listError: normalized });
          }
        } finally {
          if (requestId === listRequest) listController = null;
        }
      },

      cancelSchoolDetailRequest() {
        detailRequest += 1;
        detailController?.abort();
        detailController = null;
        set({ isLoadingSchool: false });
      },

      async loadSchool(schoolId) {
        const requestId = ++detailRequest;
        detailController?.abort();
        const controller = new AbortController();
        detailController = controller;
        set(state => ({
          currentSchool:
            state.currentSchool?.id === schoolId ? state.currentSchool : null,
          detailError: null,
          isLoadingSchool: true,
        }));
        try {
          authorize();
          if (!isValidSchoolId(schoolId)) throw invalidSchoolId();
          const response = await service.getSchool(schoolId, {
            signal: controller.signal,
          });
          if (requestId !== detailRequest) return false;
          set({ currentSchool: response.data, isLoadingSchool: false });
          return true;
        } catch (error) {
          if (requestId !== detailRequest) return false;
          const normalized = normalizeError(error);
          if (normalized.kind === 'cancelled') {
            set({ isLoadingSchool: false });
          } else {
            set({ detailError: normalized, isLoadingSchool: false });
          }
          return false;
        } finally {
          if (requestId === detailRequest) detailController = null;
        }
      },

      async createSchool(input) {
        if (get().isCreatingSchool) return null;
        const generation = lifecycle;
        set({
          createResult: null,
          isCreatingSchool: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          authorize();
          const response = await service.createSchool(input);
          if (generation !== lifecycle) return null;
          set({
            createResult: response.data,
            currentSchool: response.data.school,
            isCreatingSchool: false,
            successMessage: response.message,
          });
          await Promise.allSettled([
            get().loadSchools(),
            get().loadDashboard(),
          ]);
          return response.data;
        } catch (error) {
          set({
            isCreatingSchool: false,
            mutationError: normalizeError(error),
          });
          return null;
        }
      },

      async updateSchool(schoolId, input) {
        if (get().isMutatingSchool) return false;
        const generation = lifecycle;
        set({
          isMutatingSchool: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          authorize();
          if (!isValidSchoolId(schoolId)) throw invalidSchoolId();
          const response = await service.updateSchool(schoolId, input);
          if (generation !== lifecycle) return false;
          const ownsDetail = get().currentSchool?.id === schoolId;
          set(state => ({
            currentSchool:
              state.currentSchool?.id === schoolId
                ? response.data
                : state.currentSchool,
            isMutatingSchool: false,
            successMessage: response.message,
          }));
          await Promise.allSettled([
            ownsDetail ? get().loadSchool(schoolId) : Promise.resolve(false),
            get().loadSchools(),
          ]);
          return true;
        } catch (error) {
          set({
            isMutatingSchool: false,
            mutationError: normalizeError(error),
          });
          return false;
        }
      },

      async setSchoolStatus(schoolId, status) {
        if (get().isMutatingSchool) return false;
        const generation = lifecycle;
        set({
          isMutatingSchool: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          authorize();
          if (!isValidSchoolId(schoolId)) throw invalidSchoolId();
          const response = await service.setSchoolStatus(schoolId, status);
          if (generation !== lifecycle) return false;
          const ownsDetail = get().currentSchool?.id === schoolId;
          set(state => ({
            currentSchool:
              state.currentSchool?.id === schoolId
                ? response.data
                : state.currentSchool,
            isMutatingSchool: false,
            successMessage: response.message,
          }));
          await Promise.allSettled([
            ownsDetail ? get().loadSchool(schoolId) : Promise.resolve(false),
            get().loadSchools(),
            get().loadDashboard(),
          ]);
          return true;
        } catch (error) {
          set({
            isMutatingSchool: false,
            mutationError: normalizeError(error),
          });
          return false;
        }
      },

      clearFeedback() {
        set({
          detailError: null,
          mutationError: null,
          successMessage: null,
        });
      },

      reset() {
        lifecycle += 1;
        cancelRequests();
        set(INITIAL_PLATFORM_STATE);
      },
    };
  });
}

export const platformStore = createPlatformStore({
  getMembership: () => authStore.getState().activeMembership,
  service: platformService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    platformStore.getState().reset();
  }
});

export function usePlatformStore<T>(
  selector: (state: PlatformStoreState) => T,
): T {
  return useStore(platformStore, selector);
}
