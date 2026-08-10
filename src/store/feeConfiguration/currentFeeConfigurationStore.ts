import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { AcademicContext } from '../../models/academic';
import type { UserMembership } from '../../models/auth';
import type {
  CreateCurrentFeeHeadInput,
  CreateCurrentFeeStructureItemInput,
  CurrentClassFeeStructure,
  CurrentFeeConfigurationSummary,
  CurrentFeeHead,
  CurrentFeeHeadStatus,
  CurrentFeeStructureItem,
  UpdateCurrentFeeHeadInput,
  UpdateCurrentFeeStructureItemInput,
} from '../../models/currentFeeConfiguration';
import type { AcademicSessionStatus } from '../../models/organization';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import {
  mapFeeConfigurationFieldErrors,
} from '../../services/feeConfiguration/currentFeeConfigurationMapper';
import type { CurrentFeeHeadService } from '../../services/feeConfiguration/currentFeeHeadService';
import type { CurrentFeeStructureItemService } from '../../services/feeConfiguration/currentFeeStructureItemService';
import type { CurrentFeeStructureService } from '../../services/feeConfiguration/currentFeeStructureService';
import {
  currentFeeHeadService,
  currentFeeStructureItemService,
  currentFeeStructureService,
} from '../../services/feeConfiguration/currentFeeConfigurationServiceResolver';
import { authStore } from '../auth/authStore';
import { currentOrganizationStore } from '../organization/currentOrganizationStore';

interface CurrentFeeConfigurationState {
  context: AcademicContext | null;
  sessionStatus?: AcademicSessionStatus;
  feeHeads: CurrentFeeHead[];
  structures: CurrentClassFeeStructure[];
  currentFeeHead: CurrentFeeHead | null;
  currentStructure: CurrentClassFeeStructure | null;
  summary: CurrentFeeConfigurationSummary | null;
  isLoadingHeads: boolean;
  isLoadingStructures: boolean;
  isLoadingSummary: boolean;
  isSaving: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

interface CurrentFeeConfigurationActions {
  setContext(context: AcademicContext | null, sessionStatus?: AcademicSessionStatus): void;
  loadSummary(): Promise<void>;
  loadFeeHeads(): Promise<void>;
  loadFeeHead(id: string): Promise<boolean>;
  createFeeHead(input: CreateCurrentFeeHeadInput): Promise<CurrentFeeHead | null>;
  updateFeeHead(id: string, input: UpdateCurrentFeeHeadInput): Promise<boolean>;
  setFeeHeadStatus(id: string, status: CurrentFeeHeadStatus): Promise<boolean>;
  loadStructures(): Promise<void>;
  loadStructure(classId: string): Promise<boolean>;
  createStructureItem(input: CreateCurrentFeeStructureItemInput): Promise<CurrentFeeStructureItem | null>;
  updateStructureItem(id: string, input: UpdateCurrentFeeStructureItemInput): Promise<boolean>;
  clearFeedback(): void;
  reset(): void;
}

export type CurrentFeeConfigurationStoreState = CurrentFeeConfigurationState &
  CurrentFeeConfigurationActions;

interface Dependencies {
  feeHeadService: CurrentFeeHeadService;
  feeStructureService: CurrentFeeStructureService;
  structureItemService: CurrentFeeStructureItemService;
  getMembership: () => UserMembership | null;
  isBranchActive: (branchId: string) => boolean;
  isSchoolActive: (schoolId: string) => boolean;
}

export const INITIAL_CURRENT_FEE_CONFIGURATION_STATE: CurrentFeeConfigurationState = {
  context: null,
  currentFeeHead: null,
  currentStructure: null,
  error: null,
  feeHeads: [],
  isLoadingHeads: false,
  isLoadingStructures: false,
  isLoadingSummary: false,
  isSaving: false,
  sessionStatus: undefined,
  structures: [],
  successMessage: null,
  summary: null,
};

function normalized(error: unknown): ApiError {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      fieldErrors: mapFeeConfigurationFieldErrors(error.fieldErrors),
      kind: error.kind,
      message: error.message,
      retryable: error.retryable,
      status: error.status,
    };
  }
  return {
    code: 'UNEXPECTED_FEE_CONFIGURATION_ERROR',
    kind: 'unknown',
    message: 'Fee configuration could not be completed. Try again.',
  };
}

function denied(code: string, message: string): ApiClientError {
  return new ApiClientError({ code, kind: 'permission', message, status: 403 });
}

export function createCurrentFeeConfigurationStore({
  feeHeadService,
  feeStructureService,
  getMembership,
  isBranchActive,
  isSchoolActive,
  structureItemService,
}: Dependencies): StoreApi<CurrentFeeConfigurationStoreState> {
  let headSequence = 0;
  let structureSequence = 0;
  let summarySequence = 0;
  let headController: AbortController | null = null;
  let structureController: AbortController | null = null;

  return createStore<CurrentFeeConfigurationStoreState>()((set, get) => {
    function contextForView(): { context: AcademicContext; membership: UserMembership } {
      const context = get().context;
      const membership = getMembership();
      if (!context || !membership || !['SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(membership.role)) {
        throw denied('FEE_CONFIGURATION_ACCESS_DENIED', 'Fee configuration is available only to School Admin and Branch Admin.');
      }
      if (membership.schoolId !== context.schoolId) {
        throw denied('FEE_SCHOOL_SCOPE_MISMATCH', 'The selected fee workspace is outside your school.');
      }
      if (membership.role === 'BRANCH_ADMIN' && (!membership.branchId || membership.branchId !== context.branchId)) {
        throw denied('FEE_BRANCH_SCOPE_MISMATCH', 'Branch Admin can access only the assigned branch.');
      }
      return { context, membership };
    }

    function contextForItemMutation(): AcademicContext {
      const { context } = contextForView();
      if (get().sessionStatus === 'CLOSED') {
        throw denied('CLOSED_FEE_CONTEXT', 'Fee configuration changes are unavailable for a closed academic session.');
      }
      if (!isSchoolActive(context.schoolId)) {
        throw denied('INACTIVE_FEE_SCHOOL', 'Fee configuration changes require an active School.');
      }
      if (!isBranchActive(context.branchId)) {
        throw denied('INACTIVE_FEE_BRANCH', 'Fee configuration changes require an active Branch.');
      }
      return context;
    }

    function schoolAdminForHeadMutation(): UserMembership {
      const { context, membership } = contextForView();
      if (membership.role !== 'SCHOOL_ADMIN') {
        throw denied('FEE_HEAD_READ_ONLY', 'Only School Admin can change School-wide Fee Heads.');
      }
      if (get().sessionStatus === 'CLOSED') {
        throw denied('CLOSED_FEE_CONTEXT', 'Fee configuration changes are unavailable for a closed academic session.');
      }
      if (!isSchoolActive(context.schoolId)) {
        throw denied('INACTIVE_FEE_SCHOOL', 'Fee Head changes require an active School.');
      }
      return membership;
    }

    function isCurrent(selected: AcademicContext): boolean {
      const context = get().context;
      return Boolean(
        context &&
          context.schoolId === selected.schoolId &&
          context.branchId === selected.branchId &&
          context.academicSessionId === selected.academicSessionId,
      );
    }

    async function authoritativeHeadList(): Promise<CurrentFeeHead[]> {
      const { context } = contextForView();
      const items = await feeHeadService.list();
      if (items.some(item => item.schoolId !== context.schoolId)) {
        throw new ApiClientError({
          code: 'FEE_SCHOOL_SCOPE_MISMATCH',
          kind: 'server',
          message: 'The server returned a Fee Head outside the current School.',
        });
      }
      return items;
    }

    return {
      ...INITIAL_CURRENT_FEE_CONFIGURATION_STATE,

      setContext(context, sessionStatus) {
        const previous = get().context;
        const schoolChanged = previous?.schoolId !== context?.schoolId;
        const scopeChanged = schoolChanged || previous?.branchId !== context?.branchId || previous?.academicSessionId !== context?.academicSessionId;
        if (scopeChanged) {
          structureController?.abort();
          structureSequence += 1;
        }
        if (schoolChanged) {
          headController?.abort();
          headSequence += 1;
        }
        set({
          context,
          currentFeeHead: schoolChanged ? null : get().currentFeeHead,
          currentStructure: scopeChanged ? null : get().currentStructure,
          error: null,
          feeHeads: schoolChanged ? [] : get().feeHeads,
          isLoadingHeads: false,
          isLoadingStructures: false,
          isLoadingSummary: false,
          sessionStatus,
          structures: scopeChanged ? [] : get().structures,
          summary: scopeChanged ? null : get().summary,
        });
      },

      async loadSummary() {
        const request = ++summarySequence;
        set({ error: null, isLoadingSummary: true });
        try {
          const { context } = contextForView();
          const [heads, structures] = await Promise.all([
            authoritativeHeadList(),
            feeStructureService.list(context),
          ]);
          if (request !== summarySequence || !isCurrent(context)) return;
          set({
            feeHeads: heads,
            isLoadingSummary: false,
            structures,
            summary: {
              activeFeeHeads: heads.filter(item => item.status === 'ACTIVE').length,
              configuredClasses: structures.filter(item => item.items.length > 0).length,
              structureItems: structures.reduce((total, item) => total + item.items.length, 0),
              unconfiguredClasses: structures.filter(item => item.items.length === 0).length,
            },
          });
        } catch (error) {
          if (request !== summarySequence) return;
          set({ error: normalized(error), isLoadingSummary: false });
        }
      },

      async loadFeeHeads() {
        const request = ++headSequence;
        headController?.abort();
        headController = new AbortController();
        set({ error: null, isLoadingHeads: true });
        try {
          const { context } = contextForView();
          const items = await feeHeadService.list({ signal: headController.signal });
          if (request !== headSequence || get().context?.schoolId !== context.schoolId) return;
          if (items.some(item => item.schoolId !== context.schoolId)) {
            throw new ApiClientError({ code: 'FEE_SCHOOL_SCOPE_MISMATCH', kind: 'server', message: 'The server returned a Fee Head outside the current School.' });
          }
          set({ feeHeads: items, isLoadingHeads: false });
        } catch (error) {
          if (request !== headSequence) return;
          const value = normalized(error);
          set({ error: value.kind === 'cancelled' ? null : value, isLoadingHeads: false });
        }
      },

      async loadFeeHead(id) {
        const request = ++headSequence;
        headController?.abort();
        headController = new AbortController();
        set({ currentFeeHead: null, error: null, isLoadingHeads: true });
        try {
          const { context } = contextForView();
          const item = await feeHeadService.get(id, { signal: headController.signal });
          if (request !== headSequence || get().context?.schoolId !== context.schoolId) return false;
          if (item.schoolId !== context.schoolId) throw denied('FEE_SCHOOL_SCOPE_MISMATCH', 'The Fee Head is outside the current School.');
          set({ currentFeeHead: item, isLoadingHeads: false });
          return true;
        } catch (error) {
          if (request !== headSequence) return false;
          const value = normalized(error);
          set({ error: value.kind === 'cancelled' ? null : value, isLoadingHeads: false });
          return false;
        }
      },

      async createFeeHead(input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          schoolAdminForHeadMutation();
          const created = await feeHeadService.create(input);
          const items = await authoritativeHeadList();
          const authoritative = items.find(item => item.id === created.id) ?? null;
          set({ currentFeeHead: authoritative, feeHeads: items, isSaving: false, successMessage: 'Fee Head created.' });
          return authoritative;
        } catch (error) {
          set({ error: normalized(error), isSaving: false });
          return null;
        }
      },

      async updateFeeHead(id, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          schoolAdminForHeadMutation();
          await feeHeadService.update(id, input);
          const [current, items] = await Promise.all([feeHeadService.get(id), authoritativeHeadList()]);
          set({ currentFeeHead: current, feeHeads: items, isSaving: false, successMessage: 'Fee Head updated.' });
          return true;
        } catch (error) {
          set({ error: normalized(error), isSaving: false });
          return false;
        }
      },

      async setFeeHeadStatus(id, status) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          schoolAdminForHeadMutation();
          await feeHeadService.setStatus(id, status);
          const [current, items] = await Promise.all([feeHeadService.get(id), authoritativeHeadList()]);
          set({ currentFeeHead: current, feeHeads: items, isSaving: false, successMessage: `Fee Head ${status === 'ACTIVE' ? 'activated' : 'deactivated'}.` });
          return true;
        } catch (error) {
          set({ error: normalized(error), isSaving: false });
          return false;
        }
      },

      async loadStructures() {
        const request = ++structureSequence;
        structureController?.abort();
        structureController = new AbortController();
        set({ error: null, isLoadingStructures: true });
        try {
          const { context } = contextForView();
          const structures = await feeStructureService.list(context);
          if (request !== structureSequence || !isCurrent(context)) return;
          set({ isLoadingStructures: false, structures });
        } catch (error) {
          if (request !== structureSequence) return;
          set({ error: normalized(error), isLoadingStructures: false });
        }
      },

      async loadStructure(classId) {
        const request = ++structureSequence;
        set({ currentStructure: null, error: null, isLoadingStructures: true });
        try {
          const { context } = contextForView();
          const structure = await feeStructureService.get(context, classId);
          if (request !== structureSequence || !isCurrent(context)) return false;
          set({ currentStructure: structure, isLoadingStructures: false });
          return true;
        } catch (error) {
          if (request !== structureSequence) return false;
          set({ error: normalized(error), isLoadingStructures: false });
          return false;
        }
      },

      async createStructureItem(input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const context = contextForItemMutation();
          if (input.classId.length === 0) {
            throw denied('FEE_CLASS_SCOPE_MISMATCH', 'Select a Class from the current context.');
          }
          const [before, heads] = await Promise.all([
            feeStructureService.get(context, input.classId),
            authoritativeHeadList(),
          ]);
          if (before.classStatus !== 'ACTIVE') throw denied('INACTIVE_FEE_CLASS', 'New items require an active Class.');
          const head = heads.find(item => item.id === input.feeHeadId);
          if (!head || head.status !== 'ACTIVE') throw denied('INACTIVE_FEE_HEAD', 'New items require an active Fee Head.');
          if (before.items.some(item => item.feeHeadId === input.feeHeadId)) {
            throw new ApiClientError({ code: 'DUPLICATE_FEE_STRUCTURE_ITEM', kind: 'validation', message: 'This Fee Head already exists in the selected Class blueprint.', status: 400 });
          }
          const created = await structureItemService.create(input);
          const structure = await feeStructureService.get(context, input.classId);
          set(state => ({
            currentStructure: structure,
            isSaving: false,
            structures: state.structures.map(item => item.classId === structure.classId ? structure : item),
            successMessage: 'Structure Item created.',
          }));
          return structure.items.find(item => item.id === created.id) ?? null;
        } catch (error) {
          set({ error: normalized(error), isSaving: false });
          return null;
        }
      },

      async updateStructureItem(id, input) {
        set({ error: null, isSaving: true, successMessage: null });
        try {
          const context = contextForItemMutation();
          const before = await structureItemService.get(id);
          const currentStructure = await feeStructureService.get(context, before.classId);
          if (currentStructure.classStatus !== 'ACTIVE') throw denied('INACTIVE_FEE_CLASS', 'Items on an inactive Class are read-only.');
          await structureItemService.update(id, input);
          const structure = await feeStructureService.get(context, before.classId);
          set(state => ({
            currentStructure: structure,
            isSaving: false,
            structures: state.structures.map(item => item.classId === structure.classId ? structure : item),
            successMessage: 'Structure Item updated.',
          }));
          return true;
        } catch (error) {
          set({ error: normalized(error), isSaving: false });
          return false;
        }
      },

      clearFeedback() {
        set({ error: null, successMessage: null });
      },

      reset() {
        headController?.abort();
        structureController?.abort();
        headSequence += 1;
        structureSequence += 1;
        summarySequence += 1;
        set(INITIAL_CURRENT_FEE_CONFIGURATION_STATE);
      },
    };
  });
}

export const currentFeeConfigurationStore = createCurrentFeeConfigurationStore({
  feeHeadService: currentFeeHeadService,
  feeStructureService: currentFeeStructureService,
  getMembership: () => authStore.getState().activeMembership,
  isBranchActive: branchId =>
    currentOrganizationStore
      .getState()
      .branches.items.some(branch => branch.id === branchId && branch.status === 'ACTIVE'),
  isSchoolActive: schoolId => {
    const school = currentOrganizationStore.getState().currentSchool;
    return school?.id === schoolId && school.status === 'ACTIVE';
  },
  structureItemService: currentFeeStructureItemService,
});

export function useCurrentFeeConfigurationStore<T>(
  selector: (state: CurrentFeeConfigurationStoreState) => T,
): T {
  return useStore(currentFeeConfigurationStore, selector);
}
