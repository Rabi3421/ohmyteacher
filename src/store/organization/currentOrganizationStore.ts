import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { UserMembership } from '../../models/auth';
import type {
  CreateOrganizationBranchInput,
  CurrentSchool,
  OrganizationBranch,
  OrganizationBranchCollection,
  OrganizationBranchListQuery,
  OrganizationBranchStatus,
  UpdateCurrentSchoolInput,
  UpdateOrganizationBranchInput,
} from '../../models/currentOrganization';
import type { ApiError } from '../../services/api/apiError';
import { ApiClientError } from '../../services/api/apiError';
import type { BranchService } from '../../services/organization/branchService';
import { branchService } from '../../services/organization/branchServiceResolver';
import type { CurrentOrganizationService } from '../../services/organization/currentOrganizationService';
import { currentOrganizationService } from '../../services/organization/organizationServiceResolver';
import { authStore } from '../auth/authStore';
import { academicStore } from '../academic/academicStore';
import { useAppStore } from '../app/appStore';

interface CurrentOrganizationState {
  currentSchool: CurrentSchool | null;
  allBranches: OrganizationBranch[];
  branches: OrganizationBranchCollection;
  currentBranch: OrganizationBranch | null;
  branchQuery: OrganizationBranchListQuery;
  isLoadingSchool: boolean;
  isUpdatingSchool: boolean;
  isLoadingBranches: boolean;
  isSavingBranch: boolean;
  schoolError: ApiError | null;
  branchError: ApiError | null;
  mutationError: ApiError | null;
  successMessage: string | null;
}

interface CurrentOrganizationActions {
  loadCurrentSchool: (schoolId: string) => Promise<boolean>;
  updateCurrentSchool: (
    schoolId: string,
    input: UpdateCurrentSchoolInput,
  ) => Promise<boolean>;
  setBranchQuery: (query: Partial<OrganizationBranchListQuery>) => void;
  loadBranches: (schoolId: string) => Promise<boolean>;
  loadBranch: (schoolId: string, branchId: string) => Promise<boolean>;
  createBranch: (
    schoolId: string,
    input: CreateOrganizationBranchInput,
  ) => Promise<OrganizationBranch | null>;
  updateBranch: (
    schoolId: string,
    branchId: string,
    input: UpdateOrganizationBranchInput,
  ) => Promise<boolean>;
  setBranchStatus: (
    schoolId: string,
    branchId: string,
    status: OrganizationBranchStatus,
  ) => Promise<boolean>;
  cancelSchoolRequest: () => void;
  cancelBranchRequest: () => void;
  clearFeedback: () => void;
  reset: () => void;
}

export type CurrentOrganizationStoreState = CurrentOrganizationState &
  CurrentOrganizationActions;

interface Dependencies {
  currentOrganizationService: CurrentOrganizationService;
  branchService: BranchService;
  getMembership: () => UserMembership | null;
  reconcileSelection?: (
    schoolId: string,
    branches: OrganizationBranch[],
    membership: UserMembership,
  ) => void;
}

const emptyBranches = (): OrganizationBranchCollection => ({
  items: [],
  pagination: null,
  totalItems: 0,
});

export const INITIAL_CURRENT_ORGANIZATION_STATE: CurrentOrganizationState = {
  allBranches: [],
  branchError: null,
  branchQuery: { status: 'ALL' },
  branches: emptyBranches(),
  currentBranch: null,
  currentSchool: null,
  isLoadingBranches: false,
  isLoadingSchool: false,
  isSavingBranch: false,
  isUpdatingSchool: false,
  mutationError: null,
  schoolError: null,
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
  return {
    code: 'UNEXPECTED_ERROR',
    kind: 'unknown',
    message: 'Something went wrong. Try again.',
  };
}

function accessError(code: string, message: string): ApiClientError {
  return new ApiClientError({
    code,
    kind: 'permission',
    message,
    status: 403,
  });
}

function filterBranches(
  items: OrganizationBranch[],
  query: OrganizationBranchListQuery,
): OrganizationBranch[] {
  const search = query.search?.trim().toLowerCase() ?? '';
  return items.filter(
    branch =>
      (query.status === undefined ||
        query.status === 'ALL' ||
        branch.status === query.status) &&
      (!search ||
        branch.name.toLowerCase().includes(search) ||
        branch.code.toLowerCase().includes(search) ||
        branch.address.toLowerCase().includes(search) ||
        branch.email.toLowerCase().includes(search) ||
        branch.phone.includes(search)),
  );
}

function dedupeBranches(items: OrganizationBranch[]): OrganizationBranch[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function createCurrentOrganizationStore({
  branchService: scopedBranchService,
  currentOrganizationService: scopedOrganizationService,
  getMembership,
  reconcileSelection,
}: Dependencies): StoreApi<CurrentOrganizationStoreState> {
  let schoolSequence = 0;
  let branchSequence = 0;
  let schoolController: AbortController | null = null;
  let branchController: AbortController | null = null;
  let mutationSequence = 0;

  return createStore<CurrentOrganizationStoreState>()((set, get) => {
    function membershipForSchool(schoolId: string): UserMembership {
      const membership = getMembership();
      if (
        !membership ||
        !['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role) ||
        membership.schoolId !== schoolId
      ) {
        throw accessError(
          'ORGANIZATION_ACCESS_DENIED',
          'You cannot access this school workspace.',
        );
      }
      return membership;
    }

    function schoolAdminFor(schoolId: string): UserMembership {
      const membership = membershipForSchool(schoolId);
      if (membership.role !== 'SCHOOL_ADMIN') {
        throw accessError(
          'ORGANIZATION_READ_ONLY',
          'Only School Admin can change organization details.',
        );
      }
      if (get().currentSchool?.status === 'INACTIVE') {
        throw accessError(
          'INACTIVE_SCHOOL',
          'This school is inactive. Organization changes are unavailable.',
        );
      }
      return membership;
    }

    function authorizeBranch(
      schoolId: string,
      branchId: string,
    ): UserMembership {
      const membership = membershipForSchool(schoolId);
      if (
        membership.role === 'BRANCH_ADMIN' &&
        membership.branchId !== branchId
      ) {
        throw accessError(
          'BRANCH_ACCESS_DENIED',
          'You cannot access another branch.',
        );
      }
      return membership;
    }

    function applyBranchFilter(
      allBranches: OrganizationBranch[],
      query: OrganizationBranchListQuery,
      source: OrganizationBranchCollection = get().branches,
    ): OrganizationBranchCollection {
      const items = filterBranches(allBranches, query);
      return {
        items,
        pagination: source.pagination,
        totalItems:
          source.pagination === null ? items.length : source.totalItems,
      };
    }

    return {
      ...INITIAL_CURRENT_ORGANIZATION_STATE,

      async loadCurrentSchool(schoolId) {
        const requestId = ++schoolSequence;
        schoolController?.abort();
        schoolController = new AbortController();
        set({ isLoadingSchool: true, schoolError: null });
        try {
          membershipForSchool(schoolId);
          const response = await scopedOrganizationService.getCurrentSchool({
            signal: schoolController.signal,
          });
          if (requestId !== schoolSequence) return false;
          if (response.data.id !== schoolId) {
            throw accessError(
              'SCHOOL_SCOPE_MISMATCH',
              'The server returned a different school workspace.',
            );
          }
          set({
            currentSchool: response.data,
            isLoadingSchool: false,
            schoolError:
              response.data.status === 'INACTIVE'
                ? normalizeError(
                    accessError(
                      'INACTIVE_SCHOOL',
                      'This school is inactive. Management actions are unavailable.',
                    ),
                  )
                : null,
          });
          return true;
        } catch (error) {
          if (requestId !== schoolSequence) return false;
          const normalized = normalizeError(error);
          if (normalized.kind === 'cancelled') {
            set({ isLoadingSchool: false });
            return false;
          }
          set({
            currentSchool: null,
            isLoadingSchool: false,
            schoolError: normalized,
          });
          return false;
        }
      },

      async updateCurrentSchool(schoolId, input) {
        if (get().isUpdatingSchool) return false;
        const owner = ++mutationSequence;
        set({
          isUpdatingSchool: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          schoolAdminFor(schoolId);
          const response = await scopedOrganizationService.updateCurrentSchool(
            input,
          );
          if (owner !== mutationSequence) return false;
          if (response.data.id !== schoolId) {
            throw accessError(
              'SCHOOL_SCOPE_MISMATCH',
              'The server returned a different school workspace.',
            );
          }
          set({
            currentSchool: response.data,
            isUpdatingSchool: false,
            successMessage: response.message,
          });
          await get().loadCurrentSchool(schoolId);
          return true;
        } catch (error) {
          if (owner !== mutationSequence) return false;
          set({
            isUpdatingSchool: false,
            mutationError: normalizeError(error),
          });
          return false;
        }
      },

      setBranchQuery(query) {
        set(state => {
          const branchQuery = { ...state.branchQuery, ...query };
          return {
            branchQuery,
            branches: applyBranchFilter(
              state.allBranches,
              branchQuery,
              state.branches,
            ),
          };
        });
      },

      async loadBranches(schoolId) {
        const requestId = ++branchSequence;
        branchController?.abort();
        branchController = new AbortController();
        set({ branchError: null, isLoadingBranches: true });
        try {
          const membership = membershipForSchool(schoolId);
          if (
            membership.role === 'BRANCH_ADMIN' &&
            !membership.branchId
          ) {
            throw accessError(
              'BRANCH_SCOPE_UNAVAILABLE',
              'Your assigned branch is unavailable. Contact your School Admin.',
            );
          }
          const response = await scopedBranchService.listBranches({
            signal: branchController.signal,
          });
          if (requestId !== branchSequence) return false;
          let allBranches = dedupeBranches(response.data.items).filter(
            branch => branch.schoolId === schoolId,
          );
          if (membership.role === 'BRANCH_ADMIN') {
            allBranches = allBranches.filter(
              branch => branch.id === membership.branchId,
            );
            if (allBranches.length === 0) {
              throw accessError(
                'BRANCH_SCOPE_UNAVAILABLE',
                'Your assigned branch is unavailable. Contact your School Admin.',
              );
            }
          }
          const source: OrganizationBranchCollection = {
            items: allBranches,
            pagination: response.data.pagination,
            totalItems:
              response.data.pagination === null
                ? allBranches.length
                : response.data.totalItems,
          };
          const branchError =
            membership.role === 'BRANCH_ADMIN' &&
            allBranches[0]?.status === 'INACTIVE'
              ? normalizeError(
                  accessError(
                    'INACTIVE_BRANCH',
                    'Your assigned branch is inactive. Branch operations are unavailable.',
                  ),
                )
              : null;
          set({
            allBranches,
            branchError,
            branches: applyBranchFilter(
              allBranches,
              get().branchQuery,
              source,
            ),
            isLoadingBranches: false,
          });
          reconcileSelection?.(schoolId, allBranches, membership);
          return true;
        } catch (error) {
          if (requestId !== branchSequence) return false;
          const normalized = normalizeError(error);
          if (normalized.kind === 'cancelled') {
            set({ isLoadingBranches: false });
            return false;
          }
          set({
            allBranches: [],
            branchError: normalized,
            branches: emptyBranches(),
            isLoadingBranches: false,
          });
          return false;
        }
      },

      async loadBranch(schoolId, branchId) {
        const requestId = ++branchSequence;
        branchController?.abort();
        branchController = new AbortController();
        set({
          branchError: null,
          currentBranch: null,
          isLoadingBranches: true,
        });
        try {
          authorizeBranch(schoolId, branchId);
          const response = await scopedBranchService.getBranch(branchId, {
            signal: branchController.signal,
          });
          if (requestId !== branchSequence) return false;
          if (
            response.data.id !== branchId ||
            response.data.schoolId !== schoolId
          ) {
            throw accessError(
              'BRANCH_SCOPE_MISMATCH',
              'The server returned a different branch workspace.',
            );
          }
          set({
            branchError:
              response.data.status === 'INACTIVE'
                ? normalizeError(
                    accessError(
                      'INACTIVE_BRANCH',
                      'This branch is inactive.',
                    ),
                  )
                : null,
            currentBranch: response.data,
            isLoadingBranches: false,
          });
          return true;
        } catch (error) {
          if (requestId !== branchSequence) return false;
          const normalized = normalizeError(error);
          if (normalized.kind === 'cancelled') {
            set({ isLoadingBranches: false });
            return false;
          }
          set({
            branchError: normalized,
            currentBranch: null,
            isLoadingBranches: false,
          });
          return false;
        }
      },

      async createBranch(schoolId, input) {
        if (get().isSavingBranch) return null;
        const owner = ++mutationSequence;
        set({
          isSavingBranch: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          schoolAdminFor(schoolId);
          const response = await scopedBranchService.createBranch(input);
          if (owner !== mutationSequence) return null;
          if (response.data.schoolId !== schoolId) {
            throw accessError(
              'BRANCH_SCOPE_MISMATCH',
              'The server returned a branch from another school.',
            );
          }
          set({
            currentBranch: response.data,
            isSavingBranch: false,
            successMessage: response.message,
          });
          await get().loadBranches(schoolId);
          await get().loadBranch(schoolId, response.data.id);
          return response.data;
        } catch (error) {
          if (owner !== mutationSequence) return null;
          set({
            isSavingBranch: false,
            mutationError: normalizeError(error),
          });
          return null;
        }
      },

      async updateBranch(schoolId, branchId, input) {
        if (get().isSavingBranch) return false;
        const owner = ++mutationSequence;
        set({
          isSavingBranch: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          schoolAdminFor(schoolId);
          authorizeBranch(schoolId, branchId);
          const response = await scopedBranchService.updateBranch(
            branchId,
            input,
          );
          if (owner !== mutationSequence) return false;
          if (
            response.data.id !== branchId ||
            response.data.schoolId !== schoolId
          ) {
            throw accessError(
              'BRANCH_SCOPE_MISMATCH',
              'The server returned a different branch workspace.',
            );
          }
          set({ isSavingBranch: false, successMessage: response.message });
          await get().loadBranches(schoolId);
          await get().loadBranch(schoolId, branchId);
          return true;
        } catch (error) {
          if (owner !== mutationSequence) return false;
          set({
            isSavingBranch: false,
            mutationError: normalizeError(error),
          });
          return false;
        }
      },

      async setBranchStatus(schoolId, branchId, status) {
        if (get().isSavingBranch) return false;
        const owner = ++mutationSequence;
        set({
          isSavingBranch: true,
          mutationError: null,
          successMessage: null,
        });
        try {
          schoolAdminFor(schoolId);
          authorizeBranch(schoolId, branchId);
          const response = await scopedBranchService.setBranchStatus(
            branchId,
            status,
          );
          if (owner !== mutationSequence) return false;
          if (
            response.data.id !== branchId ||
            response.data.schoolId !== schoolId
          ) {
            throw accessError(
              'BRANCH_SCOPE_MISMATCH',
              'The server returned a different branch workspace.',
            );
          }
          set({ isSavingBranch: false, successMessage: response.message });
          await get().loadBranches(schoolId);
          await get().loadBranch(schoolId, branchId);
          return true;
        } catch (error) {
          if (owner !== mutationSequence) return false;
          set({
            isSavingBranch: false,
            mutationError: normalizeError(error),
          });
          return false;
        }
      },

      cancelSchoolRequest() {
        schoolSequence += 1;
        schoolController?.abort();
        schoolController = null;
        set({ isLoadingSchool: false });
      },

      cancelBranchRequest() {
        branchSequence += 1;
        branchController?.abort();
        branchController = null;
        set({ isLoadingBranches: false });
      },

      clearFeedback() {
        set({
          branchError: null,
          mutationError: null,
          schoolError: null,
          successMessage: null,
        });
      },

      reset() {
        schoolSequence += 1;
        branchSequence += 1;
        mutationSequence += 1;
        schoolController?.abort();
        branchController?.abort();
        schoolController = null;
        branchController = null;
        set(INITIAL_CURRENT_ORGANIZATION_STATE);
      },
    };
  });
}

export function reconcileLiveBranchSelection(
  schoolId: string,
  branches: OrganizationBranch[],
  membership: UserMembership,
): void {
  const activeBranches = branches.filter(branch => branch.status === 'ACTIVE');
  const selected = useAppStore.getState().selectedBranchId;
  const branchId =
    membership.role === 'BRANCH_ADMIN'
      ? activeBranches.find(branch => branch.id === membership.branchId)?.id ??
        null
      : activeBranches.some(branch => branch.id === selected)
        ? selected
        : activeBranches[0]?.id ?? null;
  useAppStore.getState().setSelectedSchoolId(schoolId);
  useAppStore.getState().setSelectedBranchId(branchId);

  const academicContext = academicStore.getState().context;
  if (
    academicContext?.schoolId === schoolId &&
    !activeBranches.some(branch => branch.id === academicContext.branchId)
  ) {
    academicStore.getState().setContext(null);
  }
}

export const currentOrganizationStore = createCurrentOrganizationStore({
  branchService,
  currentOrganizationService,
  getMembership: () => authStore.getState().activeMembership,
  reconcileSelection: reconcileLiveBranchSelection,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    currentOrganizationStore.getState().reset();
  }
});

export function useCurrentOrganizationStore<T>(
  selector: (state: CurrentOrganizationStoreState) => T,
): T {
  return useStore(currentOrganizationStore, selector);
}
