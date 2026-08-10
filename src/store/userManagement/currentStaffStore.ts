import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { UserMembership } from '../../models/auth';
import type {
  CreateLiveStaffInput,
  LiveStaffCollection,
  LiveStaffListQuery,
  LiveStaffStatus,
  LiveStaffUser,
  UpdateLiveStaffInput,
} from '../../models/liveStaff';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { StaffUserService } from '../../services/userManagement/staffUserService';
import { staffUserService } from '../../services/userManagement/staffUserServiceResolver';
import { authStore } from '../auth/authStore';
import { currentOrganizationStore } from '../organization/currentOrganizationStore';

interface CurrentStaffState {
  allStaff: LiveStaffUser[];
  staff: LiveStaffCollection;
  query: LiveStaffListQuery;
  currentStaff: LiveStaffUser | null;
  isLoading: boolean;
  isLoadingDetails: boolean;
  isCreating: boolean;
  isSaving: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

interface CurrentStaffActions {
  setQuery: (query: Partial<LiveStaffListQuery>) => void;
  loadStaff: (schoolId: string) => Promise<boolean>;
  loadStaffUser: (schoolId: string, staffId: string) => Promise<boolean>;
  createStaff: (
    schoolId: string,
    input: CreateLiveStaffInput,
  ) => Promise<LiveStaffUser | null>;
  updateStaff: (
    schoolId: string,
    staffId: string,
    input: UpdateLiveStaffInput,
  ) => Promise<boolean>;
  setStaffStatus: (
    schoolId: string,
    staffId: string,
    status: LiveStaffStatus,
  ) => Promise<boolean>;
  cancelListRequest: () => void;
  cancelDetailRequest: () => void;
  clearFeedback: () => void;
  reset: () => void;
}

export type CurrentStaffStoreState = CurrentStaffState & CurrentStaffActions;

interface Dependencies {
  service: StaffUserService;
  getMembership: () => UserMembership | null;
  getSchoolStatus?: (schoolId: string) => 'ACTIVE' | 'INACTIVE' | undefined;
  getBranchStatus?: (branchId: string) => 'ACTIVE' | 'INACTIVE' | undefined;
}

const emptyCollection = (): LiveStaffCollection => ({
  items: [],
  pagination: null,
  totalItems: 0,
});

export const INITIAL_CURRENT_STAFF_STATE: CurrentStaffState = {
  allStaff: [],
  currentStaff: null,
  error: null,
  isCreating: false,
  isLoading: false,
  isLoadingDetails: false,
  isSaving: false,
  query: { branchId: 'ALL', role: 'ALL', status: 'ALL' },
  staff: emptyCollection(),
  successMessage: null,
};

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      fieldErrors: error.fieldErrors,
      kind: error.kind,
      message: error.message,
      retryable: error.retryable,
      status: error.status,
    };
  }
  return { code: 'UNEXPECTED_ERROR', kind: 'unknown', message: 'Something went wrong. Try again.' };
}

function accessError(code: string, message: string): ApiClientError {
  return new ApiClientError({ code, kind: 'permission', message, status: 403 });
}

function filterStaff(
  items: LiveStaffUser[],
  query: LiveStaffListQuery,
): LiveStaffUser[] {
  const search = query.search?.trim().toLowerCase() ?? '';
  return items.filter(
    item =>
      (!search ||
        item.name.toLowerCase().includes(search) ||
        item.mobile.toLowerCase().includes(search)) &&
      (!query.role || query.role === 'ALL' || item.role === query.role) &&
      (!query.branchId ||
        query.branchId === 'ALL' ||
        item.branch.id === query.branchId) &&
      (!query.status || query.status === 'ALL' || item.status === query.status),
  );
}

function collection(items: LiveStaffUser[]): LiveStaffCollection {
  return { items, pagination: null, totalItems: items.length };
}

export function createCurrentStaffStore({
  getBranchStatus,
  getMembership,
  getSchoolStatus,
  service,
}: Dependencies): StoreApi<CurrentStaffStoreState> {
  let listSequence = 0;
  let detailSequence = 0;
  let listController: AbortController | null = null;
  let detailController: AbortController | null = null;

  return createStore<CurrentStaffStoreState>()((set, get) => {
    function actorFor(schoolId: string): UserMembership {
      const actor = getMembership();
      if (
        !actor ||
        actor.schoolId !== schoolId ||
        !['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(actor.role) ||
        actor.status !== 'ACTIVE'
      ) {
        throw accessError('STAFF_ACCESS_DENIED', 'You cannot access staff in this school.');
      }
      if (actor.role === 'BRANCH_ADMIN' && !actor.branchId) {
        throw accessError('STAFF_BRANCH_REQUIRED', 'Your account has no branch assignment.');
      }
      return actor;
    }

    function targetAllowed(
      actor: UserMembership,
      target: LiveStaffUser,
      schoolId: string,
    ): void {
      if (target.schoolId !== schoolId) {
        throw accessError('STAFF_TENANT_MISMATCH', 'This staff record is outside the current school.');
      }
      if (
        actor.role === 'BRANCH_ADMIN' &&
        (target.role !== 'TEACHER' || target.branch.id !== actor.branchId)
      ) {
        throw accessError('STAFF_BRANCH_ACCESS_DENIED', 'You cannot access staff outside your branch.');
      }
    }

    function actorForMutation(schoolId: string): UserMembership {
      const actor = actorFor(schoolId);
      const schoolStatus = getSchoolStatus?.(schoolId);
      if (getSchoolStatus && schoolStatus === undefined) {
        throw accessError('STAFF_SCHOOL_CONTEXT_REQUIRED', 'Load the current school before changing staff.');
      }
      if (schoolStatus === 'INACTIVE') {
        throw accessError('INACTIVE_SCHOOL', 'This school is inactive. Staff changes are unavailable.');
      }
      if (
        actor.role === 'BRANCH_ADMIN' &&
        actor.branchId &&
        getBranchStatus &&
        getBranchStatus(actor.branchId) !== 'ACTIVE'
      ) {
        throw accessError('INACTIVE_BRANCH', 'Your active branch context is unavailable. Staff changes are blocked.');
      }
      return actor;
    }

    function apply(items: LiveStaffUser[], query = get().query): void {
      set({ allStaff: items, staff: collection(filterStaff(items, query)) });
    }

    function replaceStaff(updated: LiveStaffUser): void {
      const next = get().allStaff.map(item =>
        item.id === updated.id ? updated : item,
      );
      apply(next);
      set(state => ({
        currentStaff:
          state.currentStaff?.id === updated.id ? updated : state.currentStaff,
      }));
    }

    return {
      ...INITIAL_CURRENT_STAFF_STATE,

      setQuery(query) {
        const nextQuery = { ...get().query, ...query };
        set({ query: nextQuery, staff: collection(filterStaff(get().allStaff, nextQuery)) });
      },

      async loadStaff(schoolId) {
        const sequence = ++listSequence;
        listController?.abort();
        listController = new AbortController();
        set({ error: null, isLoading: true });
        try {
          const actor = actorFor(schoolId);
          const response = await service.listStaff(undefined, {
            signal: listController.signal,
          });
          if (sequence !== listSequence) return false;
          const items = response.data.items.filter(item => {
            if (item.schoolId !== schoolId) return false;
            return actor.role !== 'BRANCH_ADMIN' ||
              (item.role === 'TEACHER' && item.branch.id === actor.branchId);
          });
          apply(items);
          set({ isLoading: false });
          return true;
        } catch (error) {
          if (sequence !== listSequence) return false;
          if (error instanceof ApiClientError && error.kind === 'cancelled') {
            set({ isLoading: false });
            return false;
          }
          set({ error: normalizeError(error), isLoading: false });
          return false;
        }
      },

      async loadStaffUser(schoolId, id) {
        const sequence = ++detailSequence;
        detailController?.abort();
        detailController = new AbortController();
        set(state => ({
          currentStaff: state.currentStaff?.id === id ? state.currentStaff : null,
          error: null,
          isLoadingDetails: true,
        }));
        try {
          const actor = actorFor(schoolId);
          const response = await service.getStaff(id, {
            signal: detailController.signal,
          });
          if (sequence !== detailSequence) return false;
          targetAllowed(actor, response.data, schoolId);
          set({ currentStaff: response.data, isLoadingDetails: false });
          return true;
        } catch (error) {
          if (sequence !== detailSequence) return false;
          if (error instanceof ApiClientError && error.kind === 'cancelled') {
            set({ isLoadingDetails: false });
            return false;
          }
          set({ currentStaff: null, error: normalizeError(error), isLoadingDetails: false });
          return false;
        }
      },

      async createStaff(schoolId, input) {
        if (get().isCreating) return null;
        set({ error: null, isCreating: true, successMessage: null });
        try {
          const actor = actorForMutation(schoolId);
          if (
            actor.role === 'BRANCH_ADMIN' &&
            (input.role !== 'TEACHER' || input.branchId !== actor.branchId)
          ) {
            throw accessError('STAFF_CREATE_DENIED', 'Branch Admin can create Teachers only in their own branch.');
          }
          const response = await service.createStaff(input);
          targetAllowed(actor, response.data, schoolId);
          set({ currentStaff: response.data, isCreating: false, successMessage: response.message });
          await get().loadStaff(schoolId);
          return response.data;
        } catch (error) {
          set({ error: normalizeError(error), isCreating: false });
          return null;
        }
      },

      async updateStaff(schoolId, id, input) {
        if (get().isSaving) return false;
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const actor = actorForMutation(schoolId);
          const target = get().currentStaff?.id === id
            ? get().currentStaff!
            : (await service.getStaff(id)).data;
          targetAllowed(actor, target, schoolId);
          if (actor.role === 'BRANCH_ADMIN' && input.branchId !== undefined) {
            throw accessError('STAFF_BRANCH_CHANGE_DENIED', 'Branch Admin cannot reassign staff.');
          }
          const response = await service.updateStaff(id, input);
          targetAllowed(actor, response.data, schoolId);
          replaceStaff(response.data);
          set({ isSaving: false, successMessage: response.message });
          await get().loadStaffUser(schoolId, id);
          await get().loadStaff(schoolId);
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSaving: false });
          return false;
        }
      },

      async setStaffStatus(schoolId, id, status) {
        if (get().isSaving) return false;
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const actor = actorForMutation(schoolId);
          if (actor.userId === id) {
            throw accessError('SELF_DEACTIVATION_DENIED', 'You cannot change your own status here.');
          }
          const target = get().currentStaff?.id === id
            ? get().currentStaff!
            : (await service.getStaff(id)).data;
          targetAllowed(actor, target, schoolId);
          const response = await service.setStaffStatus(id, status);
          targetAllowed(actor, response.data, schoolId);
          replaceStaff(response.data);
          set({ isSaving: false, successMessage: response.message });
          await get().loadStaffUser(schoolId, id);
          await get().loadStaff(schoolId);
          return true;
        } catch (error) {
          set({ error: normalizeError(error), isSaving: false });
          return false;
        }
      },

      cancelListRequest() {
        listSequence += 1;
        listController?.abort();
        listController = null;
        set({ isLoading: false });
      },

      cancelDetailRequest() {
        detailSequence += 1;
        detailController?.abort();
        detailController = null;
        set({ isLoadingDetails: false });
      },

      clearFeedback() {
        set({ error: null, successMessage: null });
      },

      reset() {
        listSequence += 1;
        detailSequence += 1;
        listController?.abort();
        detailController?.abort();
        set(INITIAL_CURRENT_STAFF_STATE);
      },
    };
  });
}

export const currentStaffStore = createCurrentStaffStore({
  getBranchStatus: branchId =>
    currentOrganizationStore
      .getState()
      .allBranches.find(branch => branch.id === branchId)?.status,
  getMembership: () => authStore.getState().activeMembership,
  getSchoolStatus: schoolId => {
    const school = currentOrganizationStore.getState().currentSchool;
    return school?.id === schoolId ? school.status : undefined;
  },
  service: staffUserService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    currentStaffStore.getState().reset();
  }
});

export function useCurrentStaffStore<T>(
  selector: (state: CurrentStaffStoreState) => T,
): T {
  return useStore(currentStaffStore, selector);
}
