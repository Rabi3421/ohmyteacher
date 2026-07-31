import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type { ExamStatus } from '../../models/examination';
import type {
  CalculateResultsInput,
  ClassResultSummary,
  GetRankListInput,
  MarkSheetDetails,
  MarkSheetHistoryRecord,
  MarkSheetListQuery,
  MarkSheetSummary,
  MarksDashboardSummary,
  PreviewResultCalculationInput,
  PublishResultsInput,
  RankEntry,
  ResultCalculationPreview,
  ResultCalculationResult,
  ResultListQuery,
  ResultProcessingSummary,
  ResultPublicationHistory,
  ResultReviewRecord,
  ReviewResultsInput,
  SectionResultSummary,
  StudentPaperMarkInput,
  StudentResultDetails,
} from '../../models/marksResult';
import type { AcademicSessionStatus } from '../../models/organization';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { MarksResultService } from '../../services/marksResult/marksResultService';
import { marksResultService } from '../../services/marksResult/marksResultServiceResolver';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

export interface MarksResultContext {
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  sessionStatus: AcademicSessionStatus;
  examId: string;
  examStatus: ExamStatus;
}

const emptyPage = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});
const loading = {
  isLoadingMarksDashboard: false,
  isLoadingMarkSheets: false,
  isLoadingMarkSheet: false,
  isSavingDraft: false,
  isSubmittingMarkSheet: false,
  isReturningMarkSheetToDraft: false,
  isLockingMarkSheet: false,
  isUnlockingMarkSheet: false,
  isLoadingMarkHistory: false,
  isLoadingResultSummary: false,
  isPreviewingCalculation: false,
  isCalculatingResults: false,
  isLoadingClassResults: false,
  isLoadingSectionResults: false,
  isLoadingStudentResult: false,
  isReviewingResults: false,
  isPublishingResults: false,
  isUnpublishingResults: false,
  isLoadingPublicationHistory: false,
  isLoadingRankList: false,
};

export interface MarksResultState {
  context: MarksResultContext | null;
  dashboard: MarksDashboardSummary | null;
  markSheets: PaginatedResponse<MarkSheetSummary>;
  markSheetQuery: MarkSheetListQuery;
  selectedMarkSheet: MarkSheetDetails | null;
  marksDraft: StudentPaperMarkInput[];
  selectedStudentIndex: number;
  markHistory: MarkSheetHistoryRecord[];
  resultSummary: ResultProcessingSummary | null;
  calculationDraft: PreviewResultCalculationInput | null;
  calculationPreview: ResultCalculationPreview | null;
  calculationResult: ResultCalculationResult | null;
  classResults: ClassResultSummary | null;
  sectionResults: SectionResultSummary | null;
  selectedStudentResult: StudentResultDetails | null;
  reviewRecords: ResultReviewRecord[];
  publicationHistory: ResultPublicationHistory[];
  rankList: RankEntry[];
  error: ApiError | null;
  successMessage: string | null;
  hasUnsavedMarks: boolean;
  isVersionConflict: boolean;
  isLoadingMarksDashboard: boolean;
  isLoadingMarkSheets: boolean;
  isLoadingMarkSheet: boolean;
  isSavingDraft: boolean;
  isSubmittingMarkSheet: boolean;
  isReturningMarkSheetToDraft: boolean;
  isLockingMarkSheet: boolean;
  isUnlockingMarkSheet: boolean;
  isLoadingMarkHistory: boolean;
  isLoadingResultSummary: boolean;
  isPreviewingCalculation: boolean;
  isCalculatingResults: boolean;
  isLoadingClassResults: boolean;
  isLoadingSectionResults: boolean;
  isLoadingStudentResult: boolean;
  isReviewingResults: boolean;
  isPublishingResults: boolean;
  isUnpublishingResults: boolean;
  isLoadingPublicationHistory: boolean;
  isLoadingRankList: boolean;
}

export interface MarksResultActions {
  setContext(value: MarksResultContext | null): void;
  setMarkSheetQuery(value: Partial<MarkSheetListQuery>): void;
  loadDashboard(): Promise<boolean>;
  loadMarkSheets(): Promise<boolean>;
  loadMarkSheet(id: string, preserveDraft?: boolean): Promise<boolean>;
  setMarksDraft(value: StudentPaperMarkInput[]): void;
  setSelectedStudentIndex(value: number): void;
  saveDraft(): Promise<boolean>;
  submitMarkSheet(): Promise<boolean>;
  returnMarkSheetToDraft(reason: string): Promise<boolean>;
  lockMarkSheet(): Promise<boolean>;
  unlockMarkSheet(reason: string): Promise<boolean>;
  loadMarkHistory(): Promise<boolean>;
  loadResultSummary(): Promise<boolean>;
  setCalculationDraft(value: PreviewResultCalculationInput | null): void;
  previewCalculation(): Promise<boolean>;
  calculateResults(): Promise<boolean>;
  loadClassResults(
    configurationId: string,
    query?: ResultListQuery,
  ): Promise<boolean>;
  loadSectionResults(
    sectionId: string,
    query?: ResultListQuery,
  ): Promise<boolean>;
  loadStudentResult(studentId: string): Promise<boolean>;
  reviewResults(
    input: Omit<ReviewResultsInput, 'actingUserId' | 'actingUserName'>,
  ): Promise<boolean>;
  publishResults(
    input: Omit<PublishResultsInput, 'actingUserId' | 'actingUserName'>,
  ): Promise<boolean>;
  unpublishResults(batchId: string, reason: string): Promise<boolean>;
  loadPublicationHistory(): Promise<boolean>;
  loadRankList(input: GetRankListInput): Promise<boolean>;
  clearCalculation(): void;
  clearFeedback(): void;
  reset(): void;
}

export type MarksResultStoreState = MarksResultState & MarksResultActions;
export const INITIAL_MARKS_RESULT_STATE: MarksResultState = {
  ...loading,
  calculationDraft: null,
  calculationPreview: null,
  calculationResult: null,
  classResults: null,
  context: null,
  dashboard: null,
  error: null,
  hasUnsavedMarks: false,
  isVersionConflict: false,
  markHistory: [],
  markSheetQuery: { page: 1, pageSize: 20, status: 'ALL' },
  markSheets: emptyPage(),
  marksDraft: [],
  publicationHistory: [],
  rankList: [],
  resultSummary: null,
  reviewRecords: [],
  sectionResults: null,
  selectedMarkSheet: null,
  selectedStudentIndex: 0,
  selectedStudentResult: null,
  successMessage: null,
};

function normalize(error: unknown): ApiError {
  return error instanceof ApiClientError
    ? {
        code: error.code,
        fieldErrors: error.fieldErrors,
        message: error.message,
        status: error.status,
      }
    : {
        code: 'UNEXPECTED_MARKS_RESULT_ERROR',
        message: 'The Marks and Results operation could not be completed.',
      };
}

export function createMarksResultStore(input: {
  service: MarksResultService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => PermissionKey[];
}): StoreApi<MarksResultStoreState> {
  let contextVersion = 0;
  const operationVersions = new Map<string, number>();
  return createStore<MarksResultStoreState>()((set, get) => {
    const deny = (message: string): never => {
      throw new ApiClientError({
        code: 'MARKS_RESULTS_ACCESS_DENIED',
        message,
        status: 403,
      });
    };
    const context = () =>
      get().context ?? deny('Select a Marks and Results context.');
    const requirePermission = (permission: PermissionKey) => {
      const membership =
        input.getMembership() ?? deny('Select an active workspace.');
      const value = context();
      if (
        !['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(
          membership.role,
        ) ||
        !input.getPermissions(membership).includes(permission)
      )
        deny('You do not have permission for this Marks and Results action.');
      if (
        membership.role !== 'SUPER_ADMIN' &&
        membership.schoolId !== value.schoolId
      )
        deny('This School is outside your workspace.');
      if (
        membership.role === 'BRANCH_ADMIN' &&
        membership.branchId !== value.branchId
      )
        deny('This Branch is outside your assignment.');
      return membership;
    };
    const run = async <T>(options: {
      key: string;
      loading: keyof MarksResultState;
      permission: PermissionKey;
      extraPermission?: PermissionKey;
      mutable?: boolean;
      action: () => Promise<{ data: T; message: string }>;
      success: (data: T) => Partial<MarksResultState>;
      preserveDraftOnConflict?: boolean;
    }) => {
      const version = contextVersion;
      const operation = (operationVersions.get(options.key) ?? 0) + 1;
      operationVersions.set(options.key, operation);
      try {
        requirePermission(options.permission);
        if (options.extraPermission) requirePermission(options.extraPermission);
        const selected = context();
        if (
          options.mutable &&
          (selected.sessionStatus === 'CLOSED' ||
            ['DRAFT', 'CANCELLED'].includes(selected.examStatus))
        )
          deny('This Exam context is read-only for Marks and Results.');
        if (get()[options.loading]) return false;
        set({
          [options.loading]: true,
          error: null,
          successMessage: null,
        } as Partial<MarksResultState>);
        const response = await options.action();
        if (
          version !== contextVersion ||
          operationVersions.get(options.key) !== operation
        )
          return false;
        set({
          ...options.success(response.data),
          [options.loading]: false,
          successMessage: response.message,
        } as Partial<MarksResultState>);
        return true;
      } catch (error) {
        if (
          version === contextVersion &&
          operationVersions.get(options.key) === operation
        ) {
          const normalized = normalize(error);
          set({
            [options.loading]: false,
            error: normalized,
            isVersionConflict: normalized.code === 'MARKS_VERSION_CONFLICT',
            ...(options.preserveDraftOnConflict &&
            normalized.code === 'MARKS_VERSION_CONFLICT'
              ? { hasUnsavedMarks: true }
              : {}),
          } as Partial<MarksResultState>);
        }
        return false;
      }
    };
    const actor = () => {
      const member =
        input.getMembership() ?? deny('Select an active workspace.');
      return {
        actingUserId: member.userId,
        actingUserName: member.role.replaceAll('_', ' '),
      };
    };
    const selectedSheet = () =>
      get().selectedMarkSheet ?? deny('Select a Mark Sheet.');
    return {
      ...INITIAL_MARKS_RESULT_STATE,
      setContext(value) {
        const old = get().context;
        if (
          old?.schoolId !== value?.schoolId ||
          old?.branchId !== value?.branchId ||
          old?.academicSessionId !== value?.academicSessionId ||
          old?.examId !== value?.examId
        ) {
          contextVersion++;
          operationVersions.clear();
          set({ ...INITIAL_MARKS_RESULT_STATE, context: value });
        } else set({ context: value });
      },
      setMarkSheetQuery(value) {
        set(state => ({
          markSheetQuery: { ...state.markSheetQuery, ...value },
        }));
      },
      loadDashboard() {
        const c = context();
        return run({
          key: 'dashboard',
          loading: 'isLoadingMarksDashboard',
          permission: 'marks.view',
          action: () =>
            input.service.getMarksDashboard(
              c.schoolId,
              c.branchId,
              c.academicSessionId,
              c.examId,
            ),
          success: dashboard => ({ dashboard }),
        });
      },
      loadMarkSheets() {
        const c = context();
        return run({
          key: 'sheets',
          loading: 'isLoadingMarkSheets',
          permission: 'marks.view',
          action: () =>
            input.service.getMarkSheets(
              c.schoolId,
              c.examId,
              get().markSheetQuery,
            ),
          success: markSheets => ({ markSheets }),
        });
      },
      loadMarkSheet(id, preserveDraft = false) {
        const c = context();
        return run({
          key: `sheet:${id}`,
          loading: 'isLoadingMarkSheet',
          permission: 'marks.view',
          action: () => input.service.getMarkSheet(c.schoolId, c.examId, id),
          success: sheet => ({
            selectedMarkSheet: sheet,
            ...(preserveDraft && get().hasUnsavedMarks
              ? {}
              : {
                  marksDraft: sheet.students.map(item => ({
                    attendanceStatus: item.mark.attendanceStatus,
                    componentMarks: item.mark.componentMarks.map(component => ({
                      assessmentComponentId: component.assessmentComponentId,
                      marksObtained: component.marksObtained,
                    })),
                    exemptionReason: item.mark.exemptionReason,
                    expectedVersion: item.mark.version,
                    remarks: item.mark.remarks,
                    studentId: item.studentId,
                  })),
                  hasUnsavedMarks: false,
                }),
            isVersionConflict: false,
          }),
        });
      },
      setMarksDraft(value) {
        set({
          marksDraft: value,
          hasUnsavedMarks: true,
          isVersionConflict: false,
        });
      },
      setSelectedStudentIndex(value) {
        set({ selectedStudentIndex: value });
      },
      saveDraft() {
        const c = context();
        const sheet = selectedSheet();
        return run({
          key: 'saveDraft',
          loading: 'isSavingDraft',
          permission: 'marks.enter',
          extraPermission: get().marksDraft.some(
            item => item.attendanceStatus === 'EXEMPT',
          )
            ? 'marks.exempt'
            : undefined,
          mutable: true,
          preserveDraftOnConflict: true,
          action: () =>
            input.service.saveMarkSheetDraft(c.schoolId, c.examId, sheet.id, {
              ...actor(),
              expectedVersion: sheet.version,
              marks: get().marksDraft,
            }),
          success: selectedMarkSheet => ({
            selectedMarkSheet,
            marksDraft: selectedMarkSheet.students.map(item => ({
              attendanceStatus: item.mark.attendanceStatus,
              componentMarks: item.mark.componentMarks.map(component => ({
                assessmentComponentId: component.assessmentComponentId,
                marksObtained: component.marksObtained,
              })),
              exemptionReason: item.mark.exemptionReason,
              expectedVersion: item.mark.version,
              remarks: item.mark.remarks,
              studentId: item.studentId,
            })),
            hasUnsavedMarks: false,
            isVersionConflict: false,
          }),
        });
      },
      submitMarkSheet() {
        const c = context();
        const sheet = selectedSheet();
        return run({
          key: 'submit',
          loading: 'isSubmittingMarkSheet',
          permission: 'marks.submit',
          mutable: true,
          action: () =>
            input.service.submitMarkSheet(c.schoolId, c.examId, sheet.id, {
              ...actor(),
              expectedVersion: sheet.version,
            }),
          success: selectedMarkSheet => ({ selectedMarkSheet }),
        });
      },
      returnMarkSheetToDraft(reason) {
        const c = context();
        const sheet = selectedSheet();
        return run({
          key: 'returnDraft',
          loading: 'isReturningMarkSheetToDraft',
          permission: 'marks.submit',
          mutable: true,
          action: () =>
            input.service.returnMarkSheetToDraft(
              c.schoolId,
              c.examId,
              sheet.id,
              { ...actor(), reason },
            ),
          success: selectedMarkSheet => ({ selectedMarkSheet }),
        });
      },
      lockMarkSheet() {
        const c = context();
        const sheet = selectedSheet();
        return run({
          key: 'lock',
          loading: 'isLockingMarkSheet',
          permission: 'marks.lock',
          mutable: true,
          action: () =>
            input.service.lockMarkSheet(c.schoolId, c.examId, sheet.id, {
              ...actor(),
              expectedVersion: sheet.version,
            }),
          success: selectedMarkSheet => ({ selectedMarkSheet }),
        });
      },
      unlockMarkSheet(reason) {
        const c = context();
        const sheet = selectedSheet();
        return run({
          key: 'unlock',
          loading: 'isUnlockingMarkSheet',
          permission: 'marks.unlock',
          mutable: true,
          action: () =>
            input.service.unlockMarkSheet(c.schoolId, c.examId, sheet.id, {
              ...actor(),
              reason,
            }),
          success: selectedMarkSheet => ({ selectedMarkSheet }),
        });
      },
      loadMarkHistory() {
        const c = context();
        const sheet = selectedSheet();
        return run({
          key: 'history',
          loading: 'isLoadingMarkHistory',
          permission: 'marks.history.view',
          action: () =>
            input.service.getMarkSheetHistory(c.schoolId, c.examId, sheet.id),
          success: markHistory => ({ markHistory }),
        });
      },
      loadResultSummary() {
        const c = context();
        return run({
          key: 'resultSummary',
          loading: 'isLoadingResultSummary',
          permission: 'results.view',
          action: () =>
            input.service.getResultProcessingSummary(
              c.schoolId,
              c.branchId,
              c.academicSessionId,
              c.examId,
            ),
          success: resultSummary => ({ resultSummary }),
        });
      },
      setCalculationDraft(value) {
        set({ calculationDraft: value, calculationPreview: null });
      },
      previewCalculation() {
        const c = context();
        const draft =
          get().calculationDraft ?? deny('Select a calculation scope.');
        return run({
          key: 'preview',
          loading: 'isPreviewingCalculation',
          permission: 'results.calculate',
          mutable: true,
          action: () =>
            input.service.previewResultCalculation(c.schoolId, c.examId, draft),
          success: calculationPreview => ({ calculationPreview }),
        });
      },
      calculateResults() {
        const c = context();
        const draft =
          get().calculationDraft ?? deny('Select a calculation scope.');
        const preview =
          get().calculationPreview ?? deny('Preview the calculation first.');
        return run({
          key: 'calculate',
          loading: 'isCalculatingResults',
          permission: 'results.calculate',
          mutable: true,
          action: () =>
            input.service.calculateResults(c.schoolId, c.examId, {
              ...draft,
              ...actor(),
              previewId: preview.previewId,
            } as CalculateResultsInput),
          success: calculationResult => ({
            calculationResult,
            calculationDraft: null,
            calculationPreview: null,
          }),
        });
      },
      loadClassResults(id, query) {
        const c = context();
        return run({
          key: `class:${id}`,
          loading: 'isLoadingClassResults',
          permission: 'results.view',
          action: () =>
            input.service.getClassResults(c.schoolId, c.examId, id, query),
          success: classResults => ({ classResults }),
        });
      },
      loadSectionResults(id, query) {
        const c = context();
        return run({
          key: `section:${id}`,
          loading: 'isLoadingSectionResults',
          permission: 'results.view',
          action: () =>
            input.service.getSectionResults(c.schoolId, c.examId, id, query),
          success: sectionResults => ({ sectionResults }),
        });
      },
      loadStudentResult(id) {
        const c = context();
        return run({
          key: `student:${id}`,
          loading: 'isLoadingStudentResult',
          permission: 'results.view',
          action: () =>
            input.service.getStudentResult(c.schoolId, c.examId, id),
          success: selectedStudentResult => ({ selectedStudentResult }),
        });
      },
      reviewResults(value) {
        const c = context();
        return run({
          key: 'review',
          loading: 'isReviewingResults',
          permission: 'results.review',
          mutable: true,
          action: () =>
            input.service.reviewResults(c.schoolId, c.examId, {
              ...value,
              ...actor(),
            }),
          success: record => ({
            reviewRecords: [...get().reviewRecords, record],
          }),
        });
      },
      publishResults(value) {
        const c = context();
        return run({
          key: 'publish',
          loading: 'isPublishingResults',
          permission: 'results.publish',
          mutable: true,
          action: () =>
            input.service.publishResults(c.schoolId, c.examId, {
              ...value,
              ...actor(),
            } as PublishResultsInput),
          success: batch => ({
            publicationHistory: [batch, ...get().publicationHistory],
          }),
        });
      },
      unpublishResults(id, reason) {
        const c = context();
        return run({
          key: 'unpublish',
          loading: 'isUnpublishingResults',
          permission: 'results.unpublish',
          mutable: true,
          action: () =>
            input.service.unpublishResults(c.schoolId, c.examId, id, {
              ...actor(),
              reason,
            } as Parameters<MarksResultService['unpublishResults']>[3]),
          success: batch => ({
            publicationHistory: get().publicationHistory.map(item =>
              item.id === batch.id ? batch : item,
            ),
          }),
        });
      },
      loadPublicationHistory() {
        const c = context();
        return run({
          key: 'publicationHistory',
          loading: 'isLoadingPublicationHistory',
          permission: 'results.publication_history.view',
          action: () =>
            input.service.getPublicationHistory(c.schoolId, c.examId),
          success: publicationHistory => ({ publicationHistory }),
        });
      },
      loadRankList(value) {
        const c = context();
        return run({
          key: 'ranks',
          loading: 'isLoadingRankList',
          permission: 'results.rank.view',
          action: () => input.service.getRankList(c.schoolId, c.examId, value),
          success: rankList => ({ rankList }),
        });
      },
      clearCalculation() {
        set({
          calculationDraft: null,
          calculationPreview: null,
          calculationResult: null,
        });
      },
      clearFeedback() {
        set({ error: null, successMessage: null, isVersionConflict: false });
      },
      reset() {
        contextVersion++;
        operationVersions.clear();
        set(INITIAL_MARKS_RESULT_STATE);
      },
    };
  });
}

export const marksResultStore = createMarksResultStore({
  service: marksResultService,
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: membership => {
    const config = userManagementStore.getState().roleConfiguration;
    return getEffectivePermissions(
      membership.role,
      config?.schoolId === membership.schoolId &&
        config?.role === membership.role
        ? config
        : null,
    );
  },
});
let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const id = state.activeMembership?.id;
  if (id !== previousMembershipId) {
    previousMembershipId = id;
    marksResultStore.getState().reset();
  }
});
export function useMarksResultStore<T>(
  selector: (state: MarksResultStoreState) => T,
): T {
  return useStore(marksResultStore, selector);
}
