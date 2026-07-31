import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  BulkRefreshFinesInput,
  FeeDueDetails,
  FeeDueGenerationDraft,
  FeeDueListItem,
  FeeDueListQuery,
  FeeGenerationPreview,
  FeeGenerationResult,
  FeeGenerationRun,
  FeeGenerationRunDetails,
  FeeOutstandingSummary,
  FineCalculationResult,
  FineRefreshResult,
  GenerationHistoryQuery,
  PreviewFeeGenerationInput,
  StudentFeeDueSummary,
} from '../../models/feeDue';
import type { AcademicSessionStatus } from '../../models/organization';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { FeeDueService } from '../../services/feeDue/feeDueService';
import { feeDueService } from '../../services/feeDue/feeDueServiceResolver';
import { systemFeeDueClock } from '../../utils/feeDueClock';
import {
  canCancelFeeDue,
  canGenerateFeeDues,
  canRefreshFeeFines,
  canViewFeeDues,
  canViewGenerationHistory,
  canWaiveFeeDue,
  canWaiveFeeFine,
} from '../../utils/feeDuePermissions';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

interface FeeDueContext {
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  asOfDate: string;
}

const emptyPage = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});

export function createFeeDueDraft(context?: Partial<FeeDueContext>): FeeDueGenerationDraft {
  return {
    input: {
      academicSessionId: context?.academicSessionId ?? '',
      asOfDate: context?.asOfDate ?? systemFeeDueClock.today(),
      branchId: context?.branchId ?? '',
      classIds: [],
      feeHeadIds: [],
      feeScope: 'ALL',
      generationType: 'BRANCH',
      includePreviousEligiblePeriods: false,
      requestedByUserId: '',
      requestedPeriodKeys: [],
      schoolId: context?.schoolId ?? '',
      sectionIds: [],
      studentIds: [],
    },
    step: 1,
  };
}

export interface FeeDueState {
  context: FeeDueContext | null;
  sessionStatus?: AcademicSessionStatus;
  outstanding: FeeOutstandingSummary | null;
  generationDraft: FeeDueGenerationDraft;
  generationPreview: FeeGenerationPreview | null;
  generationResult: FeeGenerationResult | null;
  generationHistory: PaginatedResponse<FeeGenerationRun>;
  generationHistoryQuery: GenerationHistoryQuery;
  currentGenerationRun: FeeGenerationRunDetails | null;
  feeDues: PaginatedResponse<FeeDueListItem>;
  dueQuery: FeeDueListQuery;
  currentStudentDues: StudentFeeDueSummary | null;
  currentFeeDue: FeeDueDetails | null;
  finePreview: FineCalculationResult | null;
  parentFeeSummary: StudentFeeDueSummary | null;
  studentSelfFeeSummary: StudentFeeDueSummary | null;
  lastFineRefresh: FineRefreshResult | null;
  isLoadingOutstanding: boolean;
  isPreviewingGeneration: boolean;
  isGeneratingFees: boolean;
  isLoadingGenerationHistory: boolean;
  isLoadingGenerationRun: boolean;
  isLoadingFeeDues: boolean;
  isLoadingStudentDues: boolean;
  isLoadingFeeDue: boolean;
  isPreviewingFine: boolean;
  isRefreshingFine: boolean;
  isWaivingFine: boolean;
  isWaivingFeeDue: boolean;
  isCancellingFeeDue: boolean;
  isLoadingParentFees: boolean;
  isLoadingStudentFees: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface FeeDueActions {
  setContext: (context: FeeDueContext | null, status?: AcademicSessionStatus) => void;
  loadOutstanding: () => Promise<void>;
  updateGenerationDraft: (draft: Partial<FeeDueGenerationDraft>) => void;
  resetGenerationDraft: () => void;
  previewGeneration: (input?: PreviewFeeGenerationInput) => Promise<boolean>;
  commitGeneration: () => Promise<boolean>;
  setGenerationHistoryQuery: (query: Partial<GenerationHistoryQuery>) => void;
  loadGenerationHistory: () => Promise<void>;
  loadGenerationRun: (id: string) => Promise<boolean>;
  setDueQuery: (query: Partial<FeeDueListQuery>) => void;
  loadFeeDues: () => Promise<void>;
  loadStudentDues: (studentId: string) => Promise<boolean>;
  loadFeeDue: (id: string) => Promise<boolean>;
  previewFine: (id: string, asOfDate: string) => Promise<boolean>;
  refreshFine: (id: string, asOfDate: string) => Promise<boolean>;
  bulkRefreshFines: (input: BulkRefreshFinesInput) => Promise<boolean>;
  waiveFine: (id: string, amountPaise: number, reason: string, full: boolean) => Promise<boolean>;
  waiveDue: (id: string, reason: string) => Promise<boolean>;
  cancelDue: (id: string, reason: string) => Promise<boolean>;
  loadParentFees: (membershipId: string, studentId: string, schoolId: string, asOfDate: string) => Promise<boolean>;
  loadStudentSelfFees: (membershipId: string, schoolId: string, asOfDate: string) => Promise<boolean>;
  clearFeedback: () => void;
  reset: () => void;
}

export type FeeDueStoreState = FeeDueState & FeeDueActions;

export const INITIAL_FEE_DUE_STATE: FeeDueState = {
  context: null,
  currentFeeDue: null,
  currentGenerationRun: null,
  currentStudentDues: null,
  dueQuery: { asOfDate: systemFeeDueClock.today(), page: 1, pageSize: 20, sort: 'DUE_DATE_ASC', status: 'ALL' },
  error: null,
  feeDues: emptyPage(),
  finePreview: null,
  generationDraft: createFeeDueDraft(),
  generationHistory: emptyPage(),
  generationHistoryQuery: { page: 1, pageSize: 20, status: 'ALL', generationType: 'ALL' },
  generationPreview: null,
  generationResult: null,
  isCancellingFeeDue: false,
  isGeneratingFees: false,
  isLoadingFeeDue: false,
  isLoadingFeeDues: false,
  isLoadingGenerationHistory: false,
  isLoadingGenerationRun: false,
  isLoadingOutstanding: false,
  isLoadingParentFees: false,
  isLoadingStudentDues: false,
  isLoadingStudentFees: false,
  isPreviewingFine: false,
  isPreviewingGeneration: false,
  isRefreshingFine: false,
  isWaivingFeeDue: false,
  isWaivingFine: false,
  lastFineRefresh: null,
  outstanding: null,
  parentFeeSummary: null,
  studentSelfFeeSummary: null,
  successMessage: null,
};

function normalize(error: unknown): ApiError {
  return error instanceof ApiClientError
    ? { code: error.code, fieldErrors: error.fieldErrors, message: error.message, status: error.status }
    : { code: 'UNEXPECTED_ERROR', message: 'Something went wrong. Try again.' };
}

export function createFeeDueStore({
  service,
  getMembership,
  getPermissions,
}: {
  service: FeeDueService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => PermissionKey[];
}): StoreApi<FeeDueStoreState> {
  return createStore<FeeDueStoreState>()((set, get) => {
    const actor = () => getMembership() ?? (() => { throw new ApiClientError({ code: 'FEE_DUE_ACCESS_DENIED', message: 'Select an active workspace.', status: 403 }); })();
    const selected = () => get().context ?? (() => { throw new ApiClientError({ code: 'FEE_DUE_CONTEXT_REQUIRED', message: 'Select Fee Due context.', status: 400 }); })();
    const authorize = (check: (membership: UserMembership, permissions: PermissionKey[]) => boolean, message: string) => {
      const membership = actor();
      if (!check(membership, getPermissions(membership))) throw new ApiClientError({ code: 'FEE_DUE_ACCESS_DENIED', message, status: 403 });
      return membership;
    };
    const view = () => {
      const value = selected();
      authorize((membership, permissions) => canViewFeeDues(membership, permissions, value.schoolId, value.branchId), 'You cannot view Fee Dues in this context.');
      return value;
    };
    const same = (value: FeeDueContext) => JSON.stringify(get().context) === JSON.stringify(value);
    const operation = (
      check: (membership: UserMembership, permissions: PermissionKey[], value: FeeDueContext) => boolean,
      message: string,
    ) => {
      const value = selected();
      authorize((membership, permissions) => check(membership, permissions, value), message);
      return value;
    };
    return {
      ...INITIAL_FEE_DUE_STATE,
      setContext(next, status) {
        const current = get().context;
        if (!next) return set({ ...INITIAL_FEE_DUE_STATE, generationDraft: createFeeDueDraft() });
        const schoolChanged = current?.schoolId !== next.schoolId;
        const scopeChanged = schoolChanged || current?.branchId !== next.branchId || current?.academicSessionId !== next.academicSessionId;
        set({
          ...(schoolChanged ? INITIAL_FEE_DUE_STATE : {}),
          context: next,
          currentFeeDue: scopeChanged ? null : get().currentFeeDue,
          currentGenerationRun: scopeChanged ? null : get().currentGenerationRun,
          currentStudentDues: scopeChanged ? null : get().currentStudentDues,
          feeDues: scopeChanged ? emptyPage() : get().feeDues,
          generationDraft: scopeChanged ? createFeeDueDraft(next) : get().generationDraft,
          generationPreview: scopeChanged ? null : get().generationPreview,
          generationResult: scopeChanged ? null : get().generationResult,
          outstanding: scopeChanged ? null : get().outstanding,
          sessionStatus: status,
        });
      },
      async loadOutstanding() {
        set({ error: null, isLoadingOutstanding: true });
        try {
          const value = view();
          const response = await service.getOutstandingSummary(value.schoolId, value.branchId, value.academicSessionId, value.asOfDate);
          if (!same(value)) return;
          set({ isLoadingOutstanding: false, outstanding: response.data });
        } catch (error) { set({ error: normalize(error), isLoadingOutstanding: false }); }
      },
      updateGenerationDraft(draft) { set(state => ({ generationDraft: { ...state.generationDraft, ...draft } })); },
      resetGenerationDraft() { set({ generationDraft: createFeeDueDraft(get().context ?? undefined), generationPreview: null }); },
      async previewGeneration(input) {
        if (get().isPreviewingGeneration) return false;
        set({ error: null, isPreviewingGeneration: true });
        try {
          const value = operation((membership, permissions, contextValue) => canGenerateFeeDues(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot generate Fee Dues.');
          const membership = actor();
          const payload = input ?? { ...get().generationDraft.input, requestedByUserId: membership.userId };
          const response = await service.previewFeeGeneration(value.schoolId, payload);
          if (!same(value)) return false;
          set({ generationPreview: response.data, isPreviewingGeneration: false, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isPreviewingGeneration: false }); return false; }
      },
      async commitGeneration() {
        if (get().isGeneratingFees) return false;
        set({ error: null, isGeneratingFees: true });
        try {
          const value = operation((membership, permissions, contextValue) => canGenerateFeeDues(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot commit Fee generation.');
          const preview = get().generationPreview ?? (() => { throw new ApiClientError({ code: 'PREVIEW_REQUIRED', message: 'Create a valid preview first.', status: 400 }); })();
          const response = await service.commitFeeGeneration(value.schoolId, { previewId: preview.previewId, requestedByUserId: actor().userId, schoolId: value.schoolId });
          set({ generationDraft: createFeeDueDraft(value), generationPreview: null, generationResult: response.data, isGeneratingFees: false, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isGeneratingFees: false }); return false; }
      },
      setGenerationHistoryQuery(query) { set(state => ({ generationHistoryQuery: { ...state.generationHistoryQuery, ...query } })); },
      async loadGenerationHistory() {
        set({ error: null, isLoadingGenerationHistory: true });
        try {
          const value = view();
          authorize((membership, permissions) => canViewGenerationHistory(membership, permissions, value.schoolId, value.branchId), 'You cannot view generation history.');
          const response = await service.getGenerationHistory(value.schoolId, { ...get().generationHistoryQuery, academicSessionId: value.academicSessionId, branchId: value.branchId });
          if (!same(value)) return;
          set({ generationHistory: response.data, isLoadingGenerationHistory: false });
        } catch (error) { set({ error: normalize(error), isLoadingGenerationHistory: false }); }
      },
      async loadGenerationRun(id) {
        set({ error: null, isLoadingGenerationRun: true });
        try {
          const value = view();
          const response = await service.getGenerationRun(value.schoolId, id);
          set({ currentGenerationRun: response.data, isLoadingGenerationRun: false });
          return true;
        } catch (error) { set({ error: normalize(error), isLoadingGenerationRun: false }); return false; }
      },
      setDueQuery(query) { set(state => ({ dueQuery: { ...state.dueQuery, ...query } })); },
      async loadFeeDues() {
        set({ error: null, isLoadingFeeDues: true });
        try {
          const value = view();
          const response = await service.getFeeDues(value.schoolId, { ...get().dueQuery, academicSessionId: value.academicSessionId, asOfDate: value.asOfDate, branchId: value.branchId });
          if (!same(value)) return;
          set({ feeDues: response.data, isLoadingFeeDues: false });
        } catch (error) { set({ error: normalize(error), isLoadingFeeDues: false }); }
      },
      async loadStudentDues(studentId) {
        set({ error: null, isLoadingStudentDues: true });
        try {
          const value = view();
          const response = await service.getStudentFeeDues(value.schoolId, studentId, { academicSessionId: value.academicSessionId, asOfDate: value.asOfDate });
          set({ currentStudentDues: response.data, isLoadingStudentDues: false });
          return true;
        } catch (error) { set({ error: normalize(error), isLoadingStudentDues: false }); return false; }
      },
      async loadFeeDue(id) {
        set({ error: null, isLoadingFeeDue: true });
        try {
          const value = view();
          const response = await service.getFeeDue(value.schoolId, id);
          if (response.data.item.due.branchId !== value.branchId) throw new ApiClientError({ code: 'FEE_DUE_BRANCH_MISMATCH', message: 'Fee Due is outside the selected branch.', status: 403 });
          set({ currentFeeDue: response.data, isLoadingFeeDue: false });
          return true;
        } catch (error) { set({ error: normalize(error), isLoadingFeeDue: false }); return false; }
      },
      async previewFine(id, asOfDate) {
        set({ error: null, isPreviewingFine: true });
        try {
          const value = view();
          const response = await service.calculateFinePreview(value.schoolId, id, asOfDate);
          set({ finePreview: response.data, isPreviewingFine: false });
          return true;
        } catch (error) { set({ error: normalize(error), isPreviewingFine: false }); return false; }
      },
      async refreshFine(id, asOfDate) {
        if (get().isRefreshingFine) return false;
        set({ error: null, isRefreshingFine: true });
        try {
          const value = operation((membership, permissions, contextValue) => canRefreshFeeFines(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot refresh Fines.');
          const response = await service.refreshFeeDueFine(value.schoolId, id, asOfDate, actor().userId);
          set({ currentFeeDue: response.data, isRefreshingFine: false, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isRefreshingFine: false }); return false; }
      },
      async bulkRefreshFines(input) {
        if (get().isRefreshingFine) return false;
        set({ error: null, isRefreshingFine: true });
        try {
          const value = operation((membership, permissions, contextValue) => canRefreshFeeFines(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot refresh Fines.');
          const response = await service.bulkRefreshFines(value.schoolId, input);
          set({ isRefreshingFine: false, lastFineRefresh: response.data, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isRefreshingFine: false }); return false; }
      },
      async waiveFine(id, amountPaise, reason, full) {
        if (get().isWaivingFine) return false;
        set({ error: null, isWaivingFine: true });
        try {
          const value = operation((membership, permissions, contextValue) => canWaiveFeeFine(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot waive Fines.');
          const response = await service.waiveFeeDueFine(value.schoolId, id, { amountPaise, approvedByUserId: actor().userId, reason, type: full ? 'FULL_FINE' : 'PARTIAL_FINE' });
          set({ currentFeeDue: response.data, isWaivingFine: false, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isWaivingFine: false }); return false; }
      },
      async waiveDue(id, reason) {
        if (get().isWaivingFeeDue) return false;
        set({ error: null, isWaivingFeeDue: true });
        try {
          const value = operation((membership, permissions, contextValue) => canWaiveFeeDue(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot waive a Fee Due.');
          const response = await service.waiveFeeDue(value.schoolId, id, { approvedByUserId: actor().userId, reason });
          set({ currentFeeDue: response.data, isWaivingFeeDue: false, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isWaivingFeeDue: false }); return false; }
      },
      async cancelDue(id, reason) {
        if (get().isCancellingFeeDue) return false;
        set({ error: null, isCancellingFeeDue: true });
        try {
          const value = operation((membership, permissions, contextValue) => canCancelFeeDue(membership, permissions, contextValue.schoolId, contextValue.branchId, get().sessionStatus), 'You cannot cancel a Fee Due.');
          const response = await service.cancelFeeDue(value.schoolId, id, { cancelledByUserId: actor().userId, reason });
          set({ currentFeeDue: response.data, isCancellingFeeDue: false, successMessage: response.message });
          return true;
        } catch (error) { set({ error: normalize(error), isCancellingFeeDue: false }); return false; }
      },
      async loadParentFees(membershipId, studentId, schoolId, asOfDate) {
        set({ error: null, isLoadingParentFees: true });
        try {
          const membership = actor();
          if (membership.role !== 'PARENT' || membership.id !== membershipId) throw new ApiClientError({ code: 'PARENT_FEE_ACCESS_DENIED', message: 'Active Parent membership required.', status: 403 });
          const response = await service.getParentStudentFees(schoolId, membershipId, studentId, asOfDate);
          set({ isLoadingParentFees: false, parentFeeSummary: response.data });
          return true;
        } catch (error) { set({ error: normalize(error), isLoadingParentFees: false }); return false; }
      },
      async loadStudentSelfFees(membershipId, schoolId, asOfDate) {
        set({ error: null, isLoadingStudentFees: true });
        try {
          const membership = actor();
          if (membership.role !== 'STUDENT' || membership.id !== membershipId) throw new ApiClientError({ code: 'STUDENT_FEE_ACCESS_DENIED', message: 'Active Student membership required.', status: 403 });
          const response = await service.getStudentSelfFees(schoolId, membershipId, asOfDate);
          set({ isLoadingStudentFees: false, studentSelfFeeSummary: response.data });
          return true;
        } catch (error) { set({ error: normalize(error), isLoadingStudentFees: false }); return false; }
      },
      clearFeedback() { set({ error: null, successMessage: null }); },
      reset() { set({ ...INITIAL_FEE_DUE_STATE, generationDraft: createFeeDueDraft() }); },
    };
  });
}

const permissions = (membership: UserMembership) => {
  const configuration = userManagementStore.getState().roleConfiguration;
  return getEffectivePermissions(
    membership.role,
    configuration?.role === membership.role && configuration.schoolId === membership.schoolId ? configuration : null,
  );
};

export const feeDueStore = createFeeDueStore({
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: permissions,
  service: feeDueService,
});

let lastMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const next = state.activeMembership?.id;
  if (next !== lastMembershipId) {
    lastMembershipId = next;
    feeDueStore.getState().reset();
  }
});

export const useFeeDueStore = <T>(selector: (state: FeeDueStoreState) => T): T =>
  useStore(feeDueStore, selector);
