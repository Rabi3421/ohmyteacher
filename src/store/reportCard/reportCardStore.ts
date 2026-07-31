import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  CommunicationPreview,
  CommunicationRecord,
  ExaminationCommunicationHistoryQuery,
  PreviewResultCommunicationInput,
} from '../../models/communication';
import type { AcademicSessionStatus } from '../../models/organization';
import type {
  CreateReportCardTemplateInput,
  ParentPublishedResultSummary,
  PreviewReportCardGenerationInput,
  ReportCard,
  ReportCardDashboardSummary,
  ReportCardDocumentResult,
  ReportCardGenerationPreview,
  ReportCardGenerationResult,
  ReportCardGenerationRun,
  ReportCardGenerationRunDetails,
  ReportCardListQuery,
  ReportCardTemplate,
  ReportCardTemplateListQuery,
  SelfServiceResultDetails,
  StudentPublishedResultSummary,
} from '../../models/reportCard';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { CommunicationService } from '../../services/communication/communicationService';
import { communicationService } from '../../services/communication/communicationServiceResolver';
import type { ReportCardService } from '../../services/reportCard/reportCardService';
import { reportCardService } from '../../services/reportCard/reportCardServiceResolver';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

export interface ReportCardContext {
  schoolId: string;
  branchId: string;
  academicSessionId: string;
  examId: string;
  sessionStatus: AcademicSessionStatus;
}

const page = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});
const loading = {
  isLoadingDashboard: false,
  isLoadingTemplates: false,
  isSavingTemplate: false,
  isPreviewingTemplate: false,
  isPreviewingGeneration: false,
  isGeneratingReportCards: false,
  isLoadingGenerationHistory: false,
  isLoadingGenerationRun: false,
  isLoadingReportCards: false,
  isLoadingReportCard: false,
  isLoadingDocument: false,
  isRevokingReportCard: false,
  isLoadingParentResults: false,
  isLoadingParentResult: false,
  isLoadingParentReportCards: false,
  isLoadingParentReportCard: false,
  isLoadingStudentResults: false,
  isLoadingStudentResult: false,
  isLoadingStudentReportCards: false,
  isLoadingStudentReportCard: false,
  isPreviewingCommunication: false,
  isSendingCommunication: false,
  isLoadingCommunicationHistory: false,
};

export interface ReportCardState {
  context: ReportCardContext | null;
  dashboard: ReportCardDashboardSummary | null;
  templates: PaginatedResponse<ReportCardTemplate>;
  templateFilters: ReportCardTemplateListQuery;
  selectedTemplate: ReportCardTemplate | null;
  templateDraft: Partial<CreateReportCardTemplateInput>;
  templatePreview: ReportCardTemplate | null;
  generationDraft: PreviewReportCardGenerationInput | null;
  generationPreview: ReportCardGenerationPreview | null;
  generationResult: ReportCardGenerationResult | null;
  generationHistory: PaginatedResponse<ReportCardGenerationRun>;
  selectedGenerationRun: ReportCardGenerationRunDetails | null;
  reportCards: PaginatedResponse<ReportCard>;
  reportCardFilters: ReportCardListQuery;
  selectedReportCard: ReportCard | null;
  documentState: ReportCardDocumentResult | null;
  parentResults: ParentPublishedResultSummary[];
  parentSelectedResult: SelfServiceResultDetails | null;
  parentReportCards: ReportCard[];
  parentSelectedReportCard: ReportCard | null;
  studentResults: StudentPublishedResultSummary[];
  studentSelectedResult: SelfServiceResultDetails | null;
  studentReportCards: ReportCard[];
  studentSelectedReportCard: ReportCard | null;
  communicationDraft: Partial<PreviewResultCommunicationInput>;
  communicationPreview: CommunicationPreview | null;
  examinationCommunicationHistory: PaginatedResponse<CommunicationRecord>;
  error: ApiError | null;
  successMessage: string | null;
  isSharingReportCard: boolean;
  isGeneratingLocked: boolean;
  isSharingLocked: boolean;
  isLoadingDashboard: boolean;
  isLoadingTemplates: boolean;
  isSavingTemplate: boolean;
  isPreviewingTemplate: boolean;
  isPreviewingGeneration: boolean;
  isGeneratingReportCards: boolean;
  isLoadingGenerationHistory: boolean;
  isLoadingGenerationRun: boolean;
  isLoadingReportCards: boolean;
  isLoadingReportCard: boolean;
  isLoadingDocument: boolean;
  isRevokingReportCard: boolean;
  isLoadingParentResults: boolean;
  isLoadingParentResult: boolean;
  isLoadingParentReportCards: boolean;
  isLoadingParentReportCard: boolean;
  isLoadingStudentResults: boolean;
  isLoadingStudentResult: boolean;
  isLoadingStudentReportCards: boolean;
  isLoadingStudentReportCard: boolean;
  isPreviewingCommunication: boolean;
  isSendingCommunication: boolean;
  isLoadingCommunicationHistory: boolean;
}

export interface ReportCardActions {
  setContext(value: ReportCardContext | null): void;
  setTemplateFilters(value: Partial<ReportCardTemplateListQuery>): void;
  setTemplateDraft(value: Partial<CreateReportCardTemplateInput>): void;
  setGenerationDraft(value: PreviewReportCardGenerationInput | null): void;
  setReportCardFilters(value: Partial<ReportCardListQuery>): void;
  setCommunicationDraft(value: Partial<PreviewResultCommunicationInput>): void;
  loadDashboard(): Promise<boolean>;
  loadTemplates(): Promise<boolean>;
  loadTemplate(id: string): Promise<boolean>;
  previewTemplate(): boolean;
  saveTemplate(id?: string): Promise<boolean>;
  previewGeneration(): Promise<boolean>;
  generateReportCards(): Promise<boolean>;
  loadGenerationHistory(): Promise<boolean>;
  loadGenerationRun(id: string): Promise<boolean>;
  loadReportCards(): Promise<boolean>;
  loadReportCard(id: string): Promise<boolean>;
  loadDocument(id: string): Promise<boolean>;
  revokeReportCard(id: string, reason: string): Promise<boolean>;
  loadParentResults(membershipId: string, studentId?: string): Promise<boolean>;
  loadParentResult(membershipId: string, id: string): Promise<boolean>;
  loadParentReportCards(
    membershipId: string,
    studentId?: string,
  ): Promise<boolean>;
  loadParentReportCard(membershipId: string, id: string): Promise<boolean>;
  loadStudentResults(membershipId: string): Promise<boolean>;
  loadStudentResult(membershipId: string, id: string): Promise<boolean>;
  loadStudentReportCards(membershipId: string): Promise<boolean>;
  loadStudentReportCard(membershipId: string, id: string): Promise<boolean>;
  previewCommunication(): Promise<boolean>;
  sendCommunication(): Promise<boolean>;
  shareReportCard(
    id: string,
    mode?: 'MANUAL_SHARE' | 'PROVIDER_SEND',
  ): Promise<boolean>;
  loadCommunicationHistory(
    query?: ExaminationCommunicationHistoryQuery,
  ): Promise<boolean>;
  clearFeedback(): void;
  reset(): void;
}

export type ReportCardStoreState = ReportCardState & ReportCardActions;

export const INITIAL_REPORT_CARD_STATE: ReportCardState = {
  ...loading,
  communicationDraft: {},
  communicationPreview: null,
  context: null,
  dashboard: null,
  documentState: null,
  error: null,
  examinationCommunicationHistory: page(),
  generationDraft: null,
  generationHistory: page(),
  generationPreview: null,
  generationResult: null,
  isGeneratingLocked: false,
  isSharingLocked: false,
  isSharingReportCard: false,
  parentReportCards: [],
  parentResults: [],
  parentSelectedReportCard: null,
  parentSelectedResult: null,
  reportCardFilters: {
    page: 1,
    pageSize: 20,
    status: 'ALL',
    documentStatus: 'ALL',
  },
  reportCards: page(),
  selectedGenerationRun: null,
  selectedReportCard: null,
  selectedTemplate: null,
  studentReportCards: [],
  studentResults: [],
  studentSelectedReportCard: null,
  studentSelectedResult: null,
  successMessage: null,
  templateDraft: {},
  templateFilters: { page: 1, pageSize: 20, status: 'ALL' },
  templatePreview: null,
  templates: page(),
};

const normalized = (error: unknown): ApiError =>
  error instanceof ApiClientError
    ? {
        code: error.code,
        fieldErrors: error.fieldErrors,
        message: error.message,
        status: error.status,
      }
    : {
        code: 'UNEXPECTED_REPORT_CARD_ERROR',
        message: 'The Report Card operation could not be completed.',
      };

export function createReportCardStore(input: {
  service: ReportCardService;
  communication: CommunicationService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => PermissionKey[];
}): StoreApi<ReportCardStoreState> {
  let contextVersion = 0;
  const operationVersions = new Map<string, number>();
  return createStore<ReportCardStoreState>()((set, get) => {
    const current = () =>
      get().context ??
      (() => {
        throw new ApiClientError({
          code: 'REPORT_CARD_CONTEXT_REQUIRED',
          message: 'Select a Report Card context.',
          status: 422,
        });
      })();
    const actor = () => {
      const membership = input.getMembership();
      if (!membership)
        throw new ApiClientError({
          code: 'REPORT_CARD_ACCESS_DENIED',
          message: 'Select an active workspace.',
          status: 403,
        });
      return {
        membership,
        name:
          membership.studentName ?? membership.schoolName ?? 'Authorized user',
        userId: membership.userId,
      };
    };
    const staffPermissionByOperation: Partial<Record<string, PermissionKey>> = {
      communicationHistory: 'report_cards.history.view',
      communicationPreview: 'results.communication.send',
      dashboard: 'report_cards.view',
      document: 'report_cards.view',
      generate: 'report_cards.generate',
      generationHistory: 'report_cards.history.view',
      generationRun: 'report_cards.history.view',
      previewGeneration: 'report_cards.generate',
      reportCard: 'report_cards.view',
      reportCards: 'report_cards.view',
      revoke: 'report_cards.revoke',
      saveTemplate: 'report_cards.templates.manage',
      sendCommunication: 'results.communication.send',
      shareReportCard: 'report_cards.share',
      template: 'report_cards.templates.manage',
      templates: 'report_cards.templates.manage',
    };
    const requireStaff = (permission: PermissionKey) => {
      const { membership } = actor();
      const value = current();
      if (
        !['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BRANCH_ADMIN'].includes(
          membership.role,
        ) ||
        !input.getPermissions(membership).includes(permission)
      )
        throw new ApiClientError({
          code: 'REPORT_CARD_ACCESS_DENIED',
          message: 'You do not have permission for this Report Card action.',
          status: 403,
        });
      if (
        membership.role !== 'SUPER_ADMIN' &&
        membership.schoolId !== value.schoolId
      )
        throw new ApiClientError({
          code: 'REPORT_CARD_SCHOOL_FORBIDDEN',
          message: 'This School is outside your workspace.',
          status: 403,
        });
      if (
        membership.role === 'BRANCH_ADMIN' &&
        value.branchId &&
        membership.branchId !== value.branchId
      )
        throw new ApiClientError({
          code: 'REPORT_CARD_BRANCH_FORBIDDEN',
          message: 'This Branch is outside your assignment.',
          status: 403,
        });
    };
    const run = async <T>(
      key: string,
      flag: keyof ReportCardState,
      action: () => Promise<{ data: T; message: string }>,
      success: (data: T) => Partial<ReportCardState>,
    ) => {
      const version = contextVersion;
      const op = (operationVersions.get(key) ?? 0) + 1;
      operationVersions.set(key, op);
      set({ [flag]: true, error: null } as Partial<ReportCardState>);
      try {
        const permission = staffPermissionByOperation[key];
        if (permission) requireStaff(permission);
        const response = await action();
        if (version !== contextVersion || operationVersions.get(key) !== op)
          return false;
        set({
          ...success(response.data),
          [flag]: false,
          successMessage: response.message,
        } as Partial<ReportCardState>);
        return true;
      } catch (error) {
        if (version === contextVersion && operationVersions.get(key) === op)
          set({
            [flag]: false,
            error: normalized(error),
          } as Partial<ReportCardState>);
        return false;
      }
    };
    return {
      ...INITIAL_REPORT_CARD_STATE,
      setContext(value) {
        const old = get().context;
        if (JSON.stringify(old) === JSON.stringify(value)) return;
        contextVersion++;
        operationVersions.clear();
        const schoolChanged = old?.schoolId !== value?.schoolId;
        const broaderChanged =
          schoolChanged ||
          old?.branchId !== value?.branchId ||
          old?.academicSessionId !== value?.academicSessionId;
        set({
          ...INITIAL_REPORT_CARD_STATE,
          context: value,
          templates: schoolChanged ? page() : get().templates,
          templateFilters: schoolChanged
            ? INITIAL_REPORT_CARD_STATE.templateFilters
            : get().templateFilters,
          selectedTemplate: schoolChanged ? null : get().selectedTemplate,
          parentResults: broaderChanged ? [] : get().parentResults,
          studentResults: broaderChanged ? [] : get().studentResults,
        });
      },
      setTemplateFilters(value) {
        set({ templateFilters: { ...get().templateFilters, ...value } });
      },
      setTemplateDraft(value) {
        set({ templateDraft: { ...get().templateDraft, ...value } });
      },
      setGenerationDraft(value) {
        set({
          generationDraft: value,
          generationPreview: null,
          generationResult: null,
        });
      },
      setReportCardFilters(value) {
        set({ reportCardFilters: { ...get().reportCardFilters, ...value } });
      },
      setCommunicationDraft(value) {
        set({
          communicationDraft: { ...get().communicationDraft, ...value },
          communicationPreview: null,
        });
      },
      loadDashboard() {
        const c = current();
        return run(
          'dashboard',
          'isLoadingDashboard',
          () =>
            input.service.getReportCardDashboard(
              c.schoolId,
              c.branchId,
              c.academicSessionId,
              c.examId,
            ),
          dashboard => ({ dashboard }),
        );
      },
      loadTemplates() {
        const c = current();
        return run(
          'templates',
          'isLoadingTemplates',
          () => input.service.getTemplates(c.schoolId, get().templateFilters),
          templates => ({ templates }),
        );
      },
      loadTemplate(id) {
        const c = current();
        return run(
          'template',
          'isLoadingTemplates',
          () => input.service.getTemplate(c.schoolId, id),
          selectedTemplate => ({
            selectedTemplate,
            templateDraft: selectedTemplate,
          }),
        );
      },
      previewTemplate() {
        const draft = get().templateDraft;
        if (
          !draft.title?.trim() ||
          !draft.code?.trim() ||
          !draft.name?.trim()
        ) {
          set({
            error: {
              code: 'REPORT_CARD_TEMPLATE_INVALID',
              message: 'Name, code and title are required.',
            },
          });
          return false;
        }
        const now = new Date().toISOString();
        set({
          templatePreview: {
            ...(draft as CreateReportCardTemplateInput),
            activeUsageCount: 0,
            createdAt: now,
            id: 'local-template-preview',
            schoolId: current().schoolId,
            updatedAt: now,
          },
          error: null,
        });
        return true;
      },
      saveTemplate(id) {
        const c = current();
        const draft = get().templateDraft as CreateReportCardTemplateInput;
        return run(
          'saveTemplate',
          'isSavingTemplate',
          () =>
            id
              ? input.service.updateTemplate(c.schoolId, id, draft)
              : input.service.createTemplate(c.schoolId, draft),
          selectedTemplate => ({
            selectedTemplate,
            templateDraft: {},
            templates: {
              ...get().templates,
              items: id
                ? get().templates.items.map(item =>
                    item.id === id ? selectedTemplate : item,
                  )
                : [selectedTemplate, ...get().templates.items],
            },
          }),
        );
      },
      previewGeneration() {
        const c = current();
        const draft = get().generationDraft;
        if (!draft) {
          set({
            error: {
              code: 'GENERATION_DRAFT_REQUIRED',
              message: 'Complete the generation scope first.',
            },
          });
          return Promise.resolve(false);
        }
        return run(
          'previewGeneration',
          'isPreviewingGeneration',
          () =>
            input.service.previewReportCardGeneration(
              c.schoolId,
              c.examId,
              draft,
            ),
          generationPreview => ({ generationPreview }),
        );
      },
      generateReportCards() {
        if (get().isGeneratingLocked) return Promise.resolve(false);
        const c = current();
        const draft = get().generationDraft;
        const preview = get().generationPreview;
        const user = actor();
        if (!draft || !preview) {
          set({
            error: {
              code: 'GENERATION_PREVIEW_REQUIRED',
              message: 'Preview generation before committing.',
            },
          });
          return Promise.resolve(false);
        }
        set({ isGeneratingLocked: true });
        return run(
          'generate',
          'isGeneratingReportCards',
          () =>
            input.service.generateReportCards(c.schoolId, c.examId, {
              ...draft,
              previewId: preview.previewId,
              requestedByName: user.name,
              requestedByUserId: user.userId,
            }),
          generationResult => ({
            generationDraft: null,
            generationPreview: null,
            generationResult,
            isGeneratingLocked: false,
          }),
        ).finally(() => set({ isGeneratingLocked: false }));
      },
      loadGenerationHistory() {
        const c = current();
        return run(
          'generationHistory',
          'isLoadingGenerationHistory',
          () => input.service.getGenerationHistory(c.schoolId, c.examId),
          generationHistory => ({ generationHistory }),
        );
      },
      loadGenerationRun(id) {
        const c = current();
        return run(
          'generationRun',
          'isLoadingGenerationRun',
          () => input.service.getGenerationRun(c.schoolId, id),
          selectedGenerationRun => ({ selectedGenerationRun }),
        );
      },
      loadReportCards() {
        const c = current();
        return run(
          'reportCards',
          'isLoadingReportCards',
          () =>
            input.service.getReportCards(c.schoolId, {
              ...get().reportCardFilters,
              branchId: c.branchId,
              academicSessionId: c.academicSessionId,
              examId: c.examId,
            }),
          reportCards => ({ reportCards }),
        );
      },
      loadReportCard(id) {
        const c = current();
        return run(
          'reportCard',
          'isLoadingReportCard',
          () => input.service.getReportCard(c.schoolId, id),
          selectedReportCard => ({ selectedReportCard, documentState: null }),
        );
      },
      loadDocument(id) {
        const c = current();
        return run(
          'document',
          'isLoadingDocument',
          () => input.service.getReportCardDocument(c.schoolId, id),
          documentState => ({ documentState }),
        );
      },
      revokeReportCard(id, reason) {
        const c = current();
        const user = actor();
        return run(
          'revoke',
          'isRevokingReportCard',
          () =>
            input.service.revokeReportCard(c.schoolId, id, {
              actingUserId: user.userId,
              actingUserName: user.name,
              reason,
            }),
          selectedReportCard => ({
            selectedReportCard,
            reportCards: {
              ...get().reportCards,
              items: get().reportCards.items.map(item =>
                item.id === id ? selectedReportCard : item,
              ),
            },
          }),
        );
      },
      loadParentResults(membershipId, studentId) {
        const c = current();
        return run(
          'parentResults',
          'isLoadingParentResults',
          () =>
            input.service.getParentPublishedResults(
              c.schoolId,
              membershipId,
              studentId,
            ),
          parentResults => ({ parentResults }),
        );
      },
      loadParentResult(membershipId, id) {
        const c = current();
        return run(
          'parentResult',
          'isLoadingParentResult',
          () =>
            input.service.getParentPublishedResult(
              c.schoolId,
              membershipId,
              id,
            ),
          parentSelectedResult => ({ parentSelectedResult }),
        );
      },
      loadParentReportCards(membershipId, studentId) {
        const c = current();
        return run(
          'parentCards',
          'isLoadingParentReportCards',
          () =>
            input.service.getParentReportCards(
              c.schoolId,
              membershipId,
              studentId,
            ),
          parentReportCards => ({ parentReportCards }),
        );
      },
      loadParentReportCard(membershipId, id) {
        const c = current();
        return run(
          'parentCard',
          'isLoadingParentReportCard',
          () => input.service.getParentReportCard(c.schoolId, membershipId, id),
          parentSelectedReportCard => ({ parentSelectedReportCard }),
        );
      },
      loadStudentResults(membershipId) {
        const c = current();
        return run(
          'studentResults',
          'isLoadingStudentResults',
          () =>
            input.service.getStudentPublishedResults(c.schoolId, membershipId),
          studentResults => ({ studentResults }),
        );
      },
      loadStudentResult(membershipId, id) {
        const c = current();
        return run(
          'studentResult',
          'isLoadingStudentResult',
          () =>
            input.service.getStudentPublishedResult(
              c.schoolId,
              membershipId,
              id,
            ),
          studentSelectedResult => ({ studentSelectedResult }),
        );
      },
      loadStudentReportCards(membershipId) {
        const c = current();
        return run(
          'studentCards',
          'isLoadingStudentReportCards',
          () => input.service.getStudentReportCards(c.schoolId, membershipId),
          studentReportCards => ({ studentReportCards }),
        );
      },
      loadStudentReportCard(membershipId, id) {
        const c = current();
        return run(
          'studentCard',
          'isLoadingStudentReportCard',
          () =>
            input.service.getStudentReportCard(c.schoolId, membershipId, id),
          studentSelectedReportCard => ({ studentSelectedReportCard }),
        );
      },
      previewCommunication() {
        const c = current();
        const draft = get()
          .communicationDraft as PreviewResultCommunicationInput;
        return run(
          'communicationPreview',
          'isPreviewingCommunication',
          () =>
            input.communication.previewResultCommunication(c.schoolId, draft),
          communicationPreview => ({ communicationPreview }),
        );
      },
      sendCommunication() {
        const c = current();
        const preview = get().communicationPreview;
        const user = actor();
        if (!preview) {
          set({
            error: {
              code: 'COMMUNICATION_PREVIEW_REQUIRED',
              message: 'Preview the message before sending.',
            },
          });
          return Promise.resolve(false);
        }
        return run(
          'sendCommunication',
          'isSendingCommunication',
          () =>
            input.communication.sendResultCommunication(c.schoolId, {
              initiatedByName: user.name,
              initiatedByUserId: user.userId,
              previewId: preview.previewId,
            }),
          () => ({ communicationDraft: {}, communicationPreview: null }),
        );
      },
      shareReportCard(id, mode = 'MANUAL_SHARE') {
        if (get().isSharingLocked) return Promise.resolve(false);
        const c = current();
        const user = actor();
        set({ isSharingLocked: true, isSharingReportCard: true });
        return run(
          'shareReportCard',
          'isSendingCommunication',
          () =>
            input.communication.shareReportCard(c.schoolId, id, {
              initiatedByName: user.name,
              initiatedByUserId: user.userId,
              mode,
            }),
          () => ({}),
        ).finally(() =>
          set({ isSharingLocked: false, isSharingReportCard: false }),
        );
      },
      loadCommunicationHistory(query = {}) {
        const c = current();
        return run(
          'communicationHistory',
          'isLoadingCommunicationHistory',
          () =>
            input.communication.getExaminationCommunicationHistory(
              c.schoolId,
              query,
            ),
          examinationCommunicationHistory => ({
            examinationCommunicationHistory,
          }),
        );
      },
      clearFeedback() {
        set({ error: null, successMessage: null });
      },
      reset() {
        contextVersion++;
        operationVersions.clear();
        set(INITIAL_REPORT_CARD_STATE);
      },
    };
  });
}

export const reportCardStore = createReportCardStore({
  communication: communicationService,
  service: reportCardService,
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
    reportCardStore.getState().reset();
  }
});

export function useReportCardStore<T>(
  selector: (state: ReportCardStoreState) => T,
): T {
  return useStore(reportCardStore, selector);
}
