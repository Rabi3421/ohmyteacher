import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  CopyExamInput,
  CreateExamInput,
  CreateExamTermInput,
  CreateExamTypeInput,
  CreateGradingSchemeInput,
  Exam,
  ExamClassConfiguration,
  ExamCopyPreview,
  ExamCopyResult,
  ExamDetails,
  ExaminationContext,
  ExaminationSetupSummary,
  ExamListQuery,
  ExamSetupValidationResult,
  ExamSubjectPaper,
  ExamTerm,
  ExamTermListQuery,
  ExamType,
  ExamTypeListQuery,
  GradingScheme,
  GradingSchemeListQuery,
  PreviewCopyExamInput,
  UpdateExamClassConfigurationsInput,
  UpdateExamScheduleInput,
  UpdateExamSubjectPapersInput,
} from '../../models/examination';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { ExaminationSetupService } from '../../services/examinationSetup/examinationSetupService';
import { examinationSetupService } from '../../services/examinationSetup/examinationSetupServiceResolver';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

const emptyPage = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});

const loading = {
  isLoadingSummary: false,
  isLoadingTerms: false,
  isSavingTerm: false,
  isLoadingExamTypes: false,
  isSavingExamType: false,
  isLoadingGradingSchemes: false,
  isSavingGradingScheme: false,
  isLoadingExams: false,
  isLoadingExam: false,
  isSavingExam: false,
  isSavingClassConfigurations: false,
  isSavingSubjectPapers: false,
  isSavingSchedule: false,
  isValidatingSetup: false,
  isSchedulingExam: false,
  isReturningToDraft: false,
  isPreviewingCopy: false,
  isCopyingExam: false,
  isCancellingExam: false,
};

export interface ExaminationSetupState {
  context: ExaminationContext | null;
  summary: ExaminationSetupSummary | null;
  terms: PaginatedResponse<ExamTerm>;
  termQuery: ExamTermListQuery;
  selectedTerm: ExamTerm | null;
  examTypes: PaginatedResponse<ExamType>;
  examTypeQuery: ExamTypeListQuery;
  selectedExamType: ExamType | null;
  gradingSchemes: PaginatedResponse<GradingScheme>;
  gradingSchemeQuery: GradingSchemeListQuery;
  selectedGradingScheme: GradingScheme | null;
  gradingSchemeDraft: Partial<CreateGradingSchemeInput>;
  exams: PaginatedResponse<Exam>;
  examQuery: ExamListQuery;
  selectedExam: ExamDetails | null;
  examDraft: Partial<CreateExamInput>;
  classConfigurations: ExamClassConfiguration[];
  selectedClassConfiguration: ExamClassConfiguration | null;
  subjectPapers: ExamSubjectPaper[];
  schedulePreview: ExamSubjectPaper[];
  setupValidation: ExamSetupValidationResult | null;
  copyPreview: ExamCopyPreview | null;
  copyResult: ExamCopyResult | null;
  error: ApiError | null;
  successMessage: string | null;
  isLoadingSummary: boolean;
  isLoadingTerms: boolean;
  isSavingTerm: boolean;
  isLoadingExamTypes: boolean;
  isSavingExamType: boolean;
  isLoadingGradingSchemes: boolean;
  isSavingGradingScheme: boolean;
  isLoadingExams: boolean;
  isLoadingExam: boolean;
  isSavingExam: boolean;
  isSavingClassConfigurations: boolean;
  isSavingSubjectPapers: boolean;
  isSavingSchedule: boolean;
  isValidatingSetup: boolean;
  isSchedulingExam: boolean;
  isReturningToDraft: boolean;
  isPreviewingCopy: boolean;
  isCopyingExam: boolean;
  isCancellingExam: boolean;
}

export interface ExaminationSetupActions {
  setContext(value: ExaminationContext | null): void;
  loadSummary(): Promise<boolean>;
  setTermQuery(value: Partial<ExamTermListQuery>): void;
  loadTerms(): Promise<boolean>;
  loadTerm(id: string): Promise<boolean>;
  saveTerm(input: CreateExamTermInput, id?: string): Promise<boolean>;
  updateTermStatus(id: string, status: ExamTerm['status']): Promise<boolean>;
  setExamTypeQuery(value: Partial<ExamTypeListQuery>): void;
  loadExamTypes(): Promise<boolean>;
  loadExamType(id: string): Promise<boolean>;
  saveExamType(input: CreateExamTypeInput, id?: string): Promise<boolean>;
  updateExamTypeStatus(
    id: string,
    status: ExamType['status'],
  ): Promise<boolean>;
  setGradingSchemeQuery(value: Partial<GradingSchemeListQuery>): void;
  loadGradingSchemes(): Promise<boolean>;
  loadGradingScheme(id: string): Promise<boolean>;
  setGradingSchemeDraft(value: Partial<CreateGradingSchemeInput>): void;
  saveGradingScheme(id?: string): Promise<boolean>;
  updateGradingSchemeStatus(
    id: string,
    status: GradingScheme['status'],
  ): Promise<boolean>;
  setExamQuery(value: Partial<ExamListQuery>): void;
  loadExams(): Promise<boolean>;
  loadExam(id: string): Promise<boolean>;
  setExamDraft(value: Partial<CreateExamInput>): void;
  saveExam(id?: string): Promise<boolean>;
  saveClassConfigurations(
    input: UpdateExamClassConfigurationsInput,
  ): Promise<boolean>;
  selectClassConfiguration(value: ExamClassConfiguration | null): void;
  saveSubjectPapers(
    configurationId: string,
    input: UpdateExamSubjectPapersInput,
  ): Promise<boolean>;
  saveSchedule(input: UpdateExamScheduleInput): Promise<boolean>;
  validateSetup(): Promise<boolean>;
  scheduleExam(): Promise<boolean>;
  returnToDraft(): Promise<boolean>;
  previewCopy(input: PreviewCopyExamInput): Promise<boolean>;
  copyExam(input: CopyExamInput): Promise<boolean>;
  cancelExam(reason: string): Promise<boolean>;
  clearCreationDraft(): void;
  clearFeedback(): void;
  reset(): void;
}

export type ExaminationSetupStoreState = ExaminationSetupState &
  ExaminationSetupActions;

export const INITIAL_EXAMINATION_SETUP_STATE: ExaminationSetupState = {
  ...loading,
  classConfigurations: [],
  context: null,
  copyPreview: null,
  copyResult: null,
  error: null,
  examDraft: {},
  examQuery: { page: 1, pageSize: 20, status: 'ALL' },
  examTypeQuery: { page: 1, pageSize: 20, status: 'ALL' },
  examTypes: emptyPage(),
  exams: emptyPage(),
  gradingSchemeDraft: {},
  gradingSchemeQuery: { page: 1, pageSize: 20, status: 'ALL' },
  gradingSchemes: emptyPage(),
  schedulePreview: [],
  selectedClassConfiguration: null,
  selectedExam: null,
  selectedExamType: null,
  selectedGradingScheme: null,
  selectedTerm: null,
  setupValidation: null,
  subjectPapers: [],
  successMessage: null,
  summary: null,
  termQuery: { page: 1, pageSize: 20, status: 'ALL' },
  terms: emptyPage(),
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
        code: 'UNEXPECTED_EXAMINATION_ERROR',
        message: 'The Examination Setup operation could not be completed.',
      };
}

export function createExaminationSetupStore(input: {
  service: ExaminationSetupService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => PermissionKey[];
}): StoreApi<ExaminationSetupStoreState> {
  let contextVersion = 0;
  const operationVersions = new Map<string, number>();
  return createStore<ExaminationSetupStoreState>()((set, get) => {
    const deny = (message: string): never => {
      throw new ApiClientError({
        code: 'EXAMINATION_ACCESS_DENIED',
        message,
        status: 403,
      });
    };
    const selectedContext = () =>
      get().context ?? deny('Select an Examination context.');
    const requirePermission = (permission: PermissionKey) => {
      const membership =
        input.getMembership() ?? deny('Select an active workspace.');
      if (!input.getPermissions(membership).includes(permission))
        deny('You do not have permission for this Examination action.');
      const context = selectedContext();
      if (
        membership.role !== 'SUPER_ADMIN' &&
        membership.schoolId !== context.schoolId
      )
        deny('This School is outside your workspace.');
      if (
        membership.role === 'BRANCH_ADMIN' &&
        membership.branchId !== context.branchId
      )
        deny('This Branch is outside your assignment.');
      return membership;
    };
    const run = async <T>(options: {
      key: string;
      loading: keyof ExaminationSetupState;
      permission: PermissionKey;
      action: () => Promise<{ data: T; message: string }>;
      success: (data: T) => Partial<ExaminationSetupState>;
    }): Promise<boolean> => {
      const version = contextVersion;
      const operationVersion = (operationVersions.get(options.key) ?? 0) + 1;
      operationVersions.set(options.key, operationVersion);
      set({
        error: null,
        [options.loading]: true,
      } as Partial<ExaminationSetupState>);
      try {
        requirePermission(options.permission);
        const response = await options.action();
        if (
          contextVersion !== version ||
          operationVersions.get(options.key) !== operationVersion
        )
          return false;
        set({
          ...options.success(response.data),
          [options.loading]: false,
          successMessage: response.message,
        } as Partial<ExaminationSetupState>);
        return true;
      } catch (error) {
        if (
          contextVersion === version &&
          operationVersions.get(options.key) === operationVersion
        )
          set({
            error: normalize(error),
            [options.loading]: false,
          } as Partial<ExaminationSetupState>);
        return false;
      }
    };
    const context = () => selectedContext();
    const currentExam = () => get().selectedExam ?? deny('Open an Exam first.');
    return {
      ...INITIAL_EXAMINATION_SETUP_STATE,
      setContext(value) {
        const previous = get().context;
        if (JSON.stringify(previous) === JSON.stringify(value)) return;
        contextVersion++;
        operationVersions.clear();
        const schoolChanged = previous?.schoolId !== value?.schoolId;
        set({
          ...loading,
          context: value,
          summary: null,
          exams: emptyPage(),
          selectedExam: null,
          classConfigurations: [],
          selectedClassConfiguration: null,
          subjectPapers: [],
          schedulePreview: [],
          setupValidation: null,
          copyPreview: null,
          copyResult: null,
          error: null,
          successMessage: null,
          examDraft: {},
          ...(schoolChanged
            ? {
                terms: emptyPage(),
                selectedTerm: null,
                examTypes: emptyPage(),
                selectedExamType: null,
                gradingSchemes: emptyPage(),
                selectedGradingScheme: null,
                gradingSchemeDraft: {},
              }
            : { terms: emptyPage(), selectedTerm: null }),
        });
      },
      loadSummary() {
        const value = context();
        return run({
          key: 'summary',
          loading: 'isLoadingSummary',
          permission: 'exams.view',
          action: () =>
            input.service.getExaminationSetupSummary(
              value.schoolId,
              value.branchId,
              value.academicSessionId,
            ),
          success: summary => ({ summary }),
        });
      },
      setTermQuery(value) {
        set({ termQuery: { ...get().termQuery, ...value } });
      },
      loadTerms() {
        const value = context();
        return run({
          key: 'terms',
          loading: 'isLoadingTerms',
          permission: 'exams.view',
          action: () =>
            input.service.getExamTerms(
              value.schoolId,
              value.academicSessionId,
              get().termQuery,
            ),
          success: terms => ({ terms }),
        });
      },
      loadTerm(id) {
        const value = context();
        return run({
          key: 'term',
          loading: 'isLoadingTerms',
          permission: 'exams.view',
          action: () =>
            input.service.getExamTerm(
              value.schoolId,
              value.academicSessionId,
              id,
            ),
          success: selectedTerm => ({ selectedTerm }),
        });
      },
      saveTerm(value, id) {
        if (get().isSavingTerm) return Promise.resolve(false);
        const selected = context();
        return run({
          key: 'saveTerm',
          loading: 'isSavingTerm',
          permission: 'exams.terms.manage',
          action: () =>
            id
              ? input.service.updateExamTerm(
                  selected.schoolId,
                  selected.academicSessionId,
                  id,
                  value,
                )
              : input.service.createExamTerm(
                  selected.schoolId,
                  selected.academicSessionId,
                  value,
                ),
          success: selectedTerm => ({ selectedTerm }),
        });
      },
      updateTermStatus(id, status) {
        const value = context();
        return run({
          key: 'saveTerm',
          loading: 'isSavingTerm',
          permission: 'exams.terms.manage',
          action: () =>
            input.service.updateExamTermStatus(
              value.schoolId,
              value.academicSessionId,
              id,
              status,
            ),
          success: selectedTerm => ({ selectedTerm }),
        });
      },
      setExamTypeQuery(value) {
        set({ examTypeQuery: { ...get().examTypeQuery, ...value } });
      },
      loadExamTypes() {
        const value = context();
        return run({
          key: 'types',
          loading: 'isLoadingExamTypes',
          permission: 'exams.view',
          action: () =>
            input.service.getExamTypes(value.schoolId, get().examTypeQuery),
          success: examTypes => ({ examTypes }),
        });
      },
      loadExamType(id) {
        const value = context();
        return run({
          key: 'type',
          loading: 'isLoadingExamTypes',
          permission: 'exams.view',
          action: () => input.service.getExamType(value.schoolId, id),
          success: selectedExamType => ({ selectedExamType }),
        });
      },
      saveExamType(value, id) {
        if (get().isSavingExamType) return Promise.resolve(false);
        const selected = context();
        return run({
          key: 'saveType',
          loading: 'isSavingExamType',
          permission: 'exams.types.manage',
          action: () =>
            id
              ? input.service.updateExamType(selected.schoolId, id, value)
              : input.service.createExamType(selected.schoolId, value),
          success: selectedExamType => ({ selectedExamType }),
        });
      },
      updateExamTypeStatus(id, status) {
        const value = context();
        return run({
          key: 'saveType',
          loading: 'isSavingExamType',
          permission: 'exams.types.manage',
          action: () =>
            input.service.updateExamTypeStatus(value.schoolId, id, status),
          success: selectedExamType => ({ selectedExamType }),
        });
      },
      setGradingSchemeQuery(value) {
        set({ gradingSchemeQuery: { ...get().gradingSchemeQuery, ...value } });
      },
      loadGradingSchemes() {
        const value = context();
        return run({
          key: 'schemes',
          loading: 'isLoadingGradingSchemes',
          permission: 'exams.view',
          action: () =>
            input.service.getGradingSchemes(
              value.schoolId,
              get().gradingSchemeQuery,
            ),
          success: gradingSchemes => ({ gradingSchemes }),
        });
      },
      loadGradingScheme(id) {
        const value = context();
        return run({
          key: 'scheme',
          loading: 'isLoadingGradingSchemes',
          permission: 'exams.view',
          action: () => input.service.getGradingScheme(value.schoolId, id),
          success: selectedGradingScheme => ({
            gradingSchemeDraft: selectedGradingScheme,
            selectedGradingScheme,
          }),
        });
      },
      setGradingSchemeDraft(value) {
        set({ gradingSchemeDraft: { ...get().gradingSchemeDraft, ...value } });
      },
      saveGradingScheme(id) {
        if (get().isSavingGradingScheme) return Promise.resolve(false);
        const value = context();
        const draft = get().gradingSchemeDraft as CreateGradingSchemeInput;
        return run({
          key: 'saveScheme',
          loading: 'isSavingGradingScheme',
          permission: 'exams.grading.manage',
          action: () =>
            id
              ? input.service.updateGradingScheme(value.schoolId, id, draft)
              : input.service.createGradingScheme(value.schoolId, draft),
          success: selectedGradingScheme => ({
            gradingSchemeDraft: {},
            selectedGradingScheme,
          }),
        });
      },
      updateGradingSchemeStatus(id, status) {
        const value = context();
        return run({
          key: 'saveScheme',
          loading: 'isSavingGradingScheme',
          permission: 'exams.grading.manage',
          action: () =>
            input.service.updateGradingSchemeStatus(value.schoolId, id, status),
          success: selectedGradingScheme => ({ selectedGradingScheme }),
        });
      },
      setExamQuery(value) {
        set({ examQuery: { ...get().examQuery, ...value } });
      },
      loadExams() {
        const value = context();
        return run({
          key: 'exams',
          loading: 'isLoadingExams',
          permission: 'exams.view',
          action: () =>
            input.service.getExams(
              value.schoolId,
              value.branchId,
              value.academicSessionId,
              get().examQuery,
            ),
          success: exams => ({ exams }),
        });
      },
      loadExam(id) {
        const value = context();
        return run({
          key: 'exam',
          loading: 'isLoadingExam',
          permission: 'exams.view',
          action: () =>
            input.service.getExam(
              value.schoolId,
              value.branchId,
              value.academicSessionId,
              id,
            ),
          success: selectedExam => ({
            classConfigurations: selectedExam.classConfigurations,
            schedulePreview: selectedExam.subjectPapers,
            selectedExam,
            setupValidation: selectedExam.setupValidation,
            subjectPapers: selectedExam.subjectPapers,
          }),
        });
      },
      setExamDraft(value) {
        set({
          examDraft: { ...get().examDraft, ...value },
          setupValidation: null,
        });
      },
      saveExam(id) {
        if (get().isSavingExam) return Promise.resolve(false);
        const value = context();
        const draft = get().examDraft as CreateExamInput;
        return run({
          key: 'saveExam',
          loading: 'isSavingExam',
          permission: 'exams.manage',
          action: () =>
            id
              ? input.service.updateExam(value.schoolId, id, draft)
              : input.service.createExam(value.schoolId, draft),
          success: selectedExam => ({
            classConfigurations: selectedExam.classConfigurations,
            examDraft: {},
            selectedExam,
            setupValidation: selectedExam.setupValidation,
            subjectPapers: selectedExam.subjectPapers,
          }),
        });
      },
      saveClassConfigurations(value) {
        if (get().isSavingClassConfigurations) return Promise.resolve(false);
        const selected = context();
        const exam = currentExam();
        return run({
          key: 'classes',
          loading: 'isSavingClassConfigurations',
          permission: 'exams.manage',
          action: () =>
            input.service.updateExamClassConfigurations(
              selected.schoolId,
              exam.id,
              value,
            ),
          success: classConfigurations => ({
            classConfigurations,
            setupValidation: null,
          }),
        });
      },
      selectClassConfiguration(value) {
        set({ selectedClassConfiguration: value });
      },
      saveSubjectPapers(configurationId, value) {
        if (get().isSavingSubjectPapers) return Promise.resolve(false);
        const selected = context();
        const exam = currentExam();
        return run({
          key: 'papers',
          loading: 'isSavingSubjectPapers',
          permission: 'exams.manage',
          action: () =>
            input.service.updateExamSubjectPapers(
              selected.schoolId,
              exam.id,
              configurationId,
              value,
            ),
          success: values => ({
            setupValidation: null,
            subjectPapers: [
              ...get().subjectPapers.filter(
                item => item.examClassConfigurationId !== configurationId,
              ),
              ...values,
            ],
          }),
        });
      },
      saveSchedule(value) {
        if (get().isSavingSchedule) return Promise.resolve(false);
        const selected = context();
        const exam = currentExam();
        return run({
          key: 'schedule',
          loading: 'isSavingSchedule',
          permission: 'exams.schedule.manage',
          action: () =>
            input.service.updateExamSchedule(selected.schoolId, exam.id, value),
          success: subjectPapers => ({
            schedulePreview: subjectPapers,
            setupValidation: null,
            subjectPapers,
          }),
        });
      },
      validateSetup() {
        const value = context();
        const exam = currentExam();
        return run({
          key: 'validate',
          loading: 'isValidatingSetup',
          permission: 'exams.view',
          action: () =>
            input.service.validateExamSetup(value.schoolId, exam.id),
          success: setupValidation => ({ setupValidation }),
        });
      },
      scheduleExam() {
        if (get().isSchedulingExam) return Promise.resolve(false);
        const value = context();
        const exam = currentExam();
        return run({
          key: 'scheduleExam',
          loading: 'isSchedulingExam',
          permission: 'exams.schedule.manage',
          action: () => input.service.scheduleExam(value.schoolId, exam.id),
          success: selectedExam => ({
            selectedExam,
            setupValidation: selectedExam.setupValidation,
          }),
        });
      },
      returnToDraft() {
        if (get().isReturningToDraft) return Promise.resolve(false);
        const value = context();
        const exam = currentExam();
        return run({
          key: 'returnDraft',
          loading: 'isReturningToDraft',
          permission: 'exams.schedule.manage',
          action: () =>
            input.service.returnExamToDraft(value.schoolId, exam.id),
          success: selectedExam => ({
            selectedExam,
            setupValidation: selectedExam.setupValidation,
          }),
        });
      },
      previewCopy(value) {
        const selected = context();
        const exam = currentExam();
        return run({
          key: 'copyPreview',
          loading: 'isPreviewingCopy',
          permission: 'exams.manage',
          action: () =>
            input.service.previewCopyExam(selected.schoolId, exam.id, value),
          success: copyPreview => ({ copyPreview }),
        });
      },
      copyExam(value) {
        if (get().isCopyingExam) return Promise.resolve(false);
        const selected = context();
        const exam = currentExam();
        return run({
          key: 'copyExam',
          loading: 'isCopyingExam',
          permission: 'exams.manage',
          action: () =>
            input.service.copyExam(selected.schoolId, exam.id, value),
          success: copyResult => ({ copyPreview: null, copyResult }),
        });
      },
      cancelExam(reason) {
        if (get().isCancellingExam) return Promise.resolve(false);
        const value = context();
        const exam = currentExam();
        const actor = requirePermission('exams.cancel');
        return run({
          key: 'cancelExam',
          loading: 'isCancellingExam',
          permission: 'exams.cancel',
          action: () =>
            input.service.cancelExam(value.schoolId, exam.id, {
              actingUserId: actor.userId,
              reason,
            }),
          success: selectedExam => ({ selectedExam }),
        });
      },
      clearCreationDraft() {
        set({
          copyPreview: null,
          examDraft: {},
          gradingSchemeDraft: {},
          setupValidation: null,
        });
      },
      clearFeedback() {
        set({ error: null, successMessage: null });
      },
      reset() {
        contextVersion++;
        operationVersions.clear();
        set(INITIAL_EXAMINATION_SETUP_STATE);
      },
    };
  });
}

export const examinationSetupStore = createExaminationSetupStore({
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: membership => {
    const configuration = userManagementStore.getState().roleConfiguration;
    return getEffectivePermissions(
      membership.role,
      configuration &&
        configuration.schoolId === membership.schoolId &&
        configuration.role === membership.role
        ? configuration
        : null,
    );
  },
  service: examinationSetupService,
});

let previousMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousMembershipId) {
    previousMembershipId = membershipId;
    examinationSetupStore.getState().reset();
  }
});

export function useExaminationSetupStore<T>(
  selector: (state: ExaminationSetupStoreState) => T,
): T {
  return useStore(examinationSetupStore, selector);
}
