import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { PermissionKey } from '../../constants/userPermissions';
import type { UserMembership } from '../../models/auth';
import type { PaginatedResponse } from '../../models/common';
import type {
  AdvanceApplicationPreview,
  CollectionContext,
  CollectionDashboardSummary,
  CollectableStudentDueSummary,
  DailyCollectionSummary,
  PaymentAllocationPreview,
  PaymentDetails,
  PaymentListItem,
  PaymentListQuery,
  PaymentPage,
  PaymentReversalResult,
  PaymentWorkflowDraft,
  PostPaymentResult,
  PreviewAdvanceApplicationInput,
  ReceiptDetails,
  ReceiptDocumentResult,
  ReceiptListItem,
  ReceiptListQuery,
  ReceiptPage,
  ReversePaymentInput,
  StudentAdvanceCreditSummary,
  StudentLedgerQuery,
  StudentLedgerSummary,
} from '../../models/collection';
import type { AcademicSessionStatus } from '../../models/organization';
import { ApiClientError, type ApiError } from '../../services/api/apiError';
import type { CollectionService } from '../../services/collection/collectionService';
import { collectionService } from '../../services/collection/collectionServiceResolver';
import {
  canAccessParentReceipt,
  canAccessStudentReceipt,
  canCollectPayment,
  canManageAdvanceCredit,
  canReversePayment,
  canViewAdvanceCredit,
  canViewDailyCollection,
  canViewPayments,
  canViewReceipts,
  canViewStudentLedger,
} from '../../utils/collectionPermissions';
import { getEffectivePermissions } from '../../utils/effectivePermissions';
import { systemFeeDueClock } from '../../utils/feeDueClock';
import { authStore } from '../auth/authStore';
import { userManagementStore } from '../userManagement/userManagementStore';

const emptyPage = <T>(): PaginatedResponse<T> => ({
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
});

let paymentRequestSequence = 0;

export function createPaymentDraft(
  context?: Partial<CollectionContext>,
): PaymentWorkflowDraft {
  return {
    input: {
      academicSessionId: context?.academicSessionId ?? '',
      allocationMode: 'OLDEST_DUE_FIRST',
      amountPaise: 0,
      asOfDate: context?.asOfDate ?? systemFeeDueClock.today(),
      bankName: undefined,
      branchId: context?.branchId ?? '',
      chequeDate: undefined,
      chequeNumber: undefined,
      clientGeneratedRequestId: `collection-${Date.now()}-${++paymentRequestSequence}`,
      collectedByName: '',
      collectedByUserId: '',
      feeDueIds: [],
      manualAllocations: [],
      paymentDate: systemFeeDueClock.today(),
      paymentMode: 'CASH',
      schoolId: context?.schoolId ?? '',
      storeExcessAsAdvance: false,
      studentId: '',
    },
    step: 1,
  };
}

export interface CollectionState {
  context: CollectionContext | null;
  sessionStatus?: AcademicSessionStatus;
  dashboard: CollectionDashboardSummary | null;
  collectableDues: CollectableStudentDueSummary | null;
  paymentDraft: PaymentWorkflowDraft;
  allocationPreview: PaymentAllocationPreview | null;
  paymentResult: PostPaymentResult | null;
  payments: PaymentPage;
  paymentQuery: PaymentListQuery;
  currentPayment: PaymentDetails | null;
  lastReversal: PaymentReversalResult | null;
  receipts: ReceiptPage;
  receiptQuery: ReceiptListQuery;
  currentReceipt: ReceiptDetails | null;
  receiptDocument: ReceiptDocumentResult | null;
  ledger: StudentLedgerSummary | null;
  advance: StudentAdvanceCreditSummary | null;
  advancePreview: AdvanceApplicationPreview | null;
  dailyCollection: DailyCollectionSummary | null;
  parentReceipts: ReceiptListItem[];
  studentReceipts: ReceiptListItem[];
  isLoadingDashboard: boolean;
  isLoadingCollectableDues: boolean;
  isPreviewingAllocation: boolean;
  isPostingPayment: boolean;
  isLoadingPayments: boolean;
  isLoadingPayment: boolean;
  isReversingPayment: boolean;
  isLoadingReceipts: boolean;
  isLoadingReceipt: boolean;
  isLoadingReceiptDocument: boolean;
  isLoadingLedger: boolean;
  isLoadingAdvance: boolean;
  isPreviewingAdvance: boolean;
  isApplyingAdvance: boolean;
  isLoadingDailyCollection: boolean;
  isLoadingParentReceipts: boolean;
  isLoadingStudentReceipts: boolean;
  error: ApiError | null;
  successMessage: string | null;
}

export interface CollectionActions {
  setContext: (
    context: CollectionContext | null,
    sessionStatus?: AcademicSessionStatus,
  ) => void;
  updatePaymentDraft: (draft: Partial<PaymentWorkflowDraft>) => void;
  updatePaymentInput: (input: Partial<PaymentWorkflowDraft['input']>) => void;
  resetPaymentWorkflow: (preserveResult?: boolean) => void;
  loadDashboard: () => Promise<boolean>;
  loadCollectableDues: (
    studentId: string,
    includeUpcoming?: boolean,
    purpose?: 'PAYMENT' | 'ADVANCE',
  ) => Promise<boolean>;
  previewAllocation: () => Promise<boolean>;
  postPayment: () => Promise<boolean>;
  setPaymentQuery: (query: Partial<PaymentListQuery>) => void;
  loadPayments: () => Promise<void>;
  loadPayment: (paymentId: string) => Promise<boolean>;
  reversePayment: (paymentId: string, reason: string) => Promise<boolean>;
  setReceiptQuery: (query: Partial<ReceiptListQuery>) => void;
  loadReceipts: () => Promise<void>;
  loadReceipt: (receiptId: string) => Promise<boolean>;
  loadReceiptDocument: (receiptId: string) => Promise<boolean>;
  loadLedger: (
    studentId: string,
    query?: StudentLedgerQuery,
  ) => Promise<boolean>;
  loadAdvance: (studentId: string) => Promise<boolean>;
  previewAdvance: (
    studentId: string,
    input: PreviewAdvanceApplicationInput,
  ) => Promise<boolean>;
  applyAdvance: (studentId: string) => Promise<boolean>;
  loadDailyCollection: (date?: string) => Promise<boolean>;
  loadParentReceipts: (
    schoolId: string,
    parentMembershipId: string,
    studentId?: string,
  ) => Promise<boolean>;
  loadParentReceipt: (
    schoolId: string,
    parentMembershipId: string,
    receiptId: string,
  ) => Promise<boolean>;
  loadStudentReceipts: (
    schoolId: string,
    studentMembershipId: string,
  ) => Promise<boolean>;
  loadStudentReceipt: (
    schoolId: string,
    studentMembershipId: string,
    receiptId: string,
  ) => Promise<boolean>;
  clearFeedback: () => void;
  reset: () => void;
}

export type CollectionStoreState = CollectionState & CollectionActions;

export const INITIAL_COLLECTION_STATE: CollectionState = {
  advance: null,
  advancePreview: null,
  allocationPreview: null,
  collectableDues: null,
  context: null,
  currentPayment: null,
  currentReceipt: null,
  dailyCollection: null,
  dashboard: null,
  error: null,
  isApplyingAdvance: false,
  isLoadingAdvance: false,
  isLoadingCollectableDues: false,
  isLoadingDailyCollection: false,
  isLoadingDashboard: false,
  isLoadingLedger: false,
  isLoadingParentReceipts: false,
  isLoadingPayment: false,
  isLoadingPayments: false,
  isLoadingReceipt: false,
  isLoadingReceiptDocument: false,
  isLoadingReceipts: false,
  isLoadingStudentReceipts: false,
  isPostingPayment: false,
  isPreviewingAdvance: false,
  isPreviewingAllocation: false,
  isReversingPayment: false,
  lastReversal: null,
  ledger: null,
  parentReceipts: [],
  paymentDraft: createPaymentDraft(),
  paymentQuery: { page: 1, pageSize: 20, status: 'ALL' },
  paymentResult: null,
  payments: emptyPage<PaymentListItem>(),
  receiptDocument: null,
  receiptQuery: { page: 1, pageSize: 20, status: 'ALL' },
  receipts: emptyPage<ReceiptListItem>(),
  studentReceipts: [],
  successMessage: null,
};

const COLLECTION_LOADING_RESET = {
  isApplyingAdvance: false,
  isLoadingAdvance: false,
  isLoadingCollectableDues: false,
  isLoadingDailyCollection: false,
  isLoadingDashboard: false,
  isLoadingLedger: false,
  isLoadingParentReceipts: false,
  isLoadingPayment: false,
  isLoadingPayments: false,
  isLoadingReceipt: false,
  isLoadingReceiptDocument: false,
  isLoadingReceipts: false,
  isLoadingStudentReceipts: false,
  isPostingPayment: false,
  isPreviewingAdvance: false,
  isPreviewingAllocation: false,
  isReversingPayment: false,
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
        code: 'UNEXPECTED_COLLECTION_ERROR',
        message: 'The collection operation could not be completed.',
      };
}

export function createCollectionStore({
  service,
  getMembership,
  getPermissions,
  getActorName,
}: {
  service: CollectionService;
  getMembership: () => UserMembership | null;
  getPermissions: (membership: UserMembership) => PermissionKey[];
  getActorName?: () => string | undefined;
}): StoreApi<CollectionStoreState> {
  return createStore<CollectionStoreState>()((set, get) => {
    const actor = () => {
      const membership = getMembership();
      if (!membership)
        throw new ApiClientError({
          code: 'COLLECTION_ACCESS_DENIED',
          message: 'Select an active workspace.',
          status: 403,
        });
      return membership;
    };
    const selected = () => {
      const value = get().context;
      if (!value)
        throw new ApiClientError({
          code: 'COLLECTION_CONTEXT_REQUIRED',
          message: 'Select Collection context.',
          status: 400,
        });
      return value;
    };
    const permissions = (membership: UserMembership) =>
      getPermissions(membership);
    const deny = (message: string): never => {
      throw new ApiClientError({
        code: 'COLLECTION_ACCESS_DENIED',
        message,
        status: 403,
      });
    };
    const authorize = (
      check: (
        membership: UserMembership,
        permissions: PermissionKey[],
        value: CollectionContext,
      ) => boolean,
      message: string,
    ) => {
      const membership = actor();
      const value = selected();
      if (!check(membership, permissions(membership), value)) deny(message);
      return { membership, value };
    };
    const isCurrent = (value: CollectionContext) =>
      JSON.stringify(value) === JSON.stringify(get().context);
    const requestTokens = {
      advance: 0,
      collectable: 0,
      daily: 0,
      document: 0,
      ledger: 0,
      parentList: 0,
      payment: 0,
      paymentList: 0,
      receipt: 0,
      receiptList: 0,
      studentList: 0,
    };
    type RequestKey = keyof typeof requestTokens;
    const beginRequest = (key: RequestKey) => ++requestTokens[key];
    const isLatestRequest = (key: RequestKey, token: number) =>
      requestTokens[key] === token;
    return {
      ...INITIAL_COLLECTION_STATE,
      setContext(next, sessionStatus) {
        const current = get().context;
        if (!next) {
          set({
            ...INITIAL_COLLECTION_STATE,
            paymentDraft: createPaymentDraft(),
          });
          return;
        }
        const schoolChanged = current?.schoolId !== next.schoolId;
        const scopeChanged =
          schoolChanged ||
          current?.branchId !== next.branchId ||
          current?.academicSessionId !== next.academicSessionId;
        set({
          ...(schoolChanged ? INITIAL_COLLECTION_STATE : {}),
          ...(scopeChanged ? COLLECTION_LOADING_RESET : {}),
          advance: scopeChanged ? null : get().advance,
          advancePreview: scopeChanged ? null : get().advancePreview,
          allocationPreview: scopeChanged ? null : get().allocationPreview,
          collectableDues: scopeChanged ? null : get().collectableDues,
          context: next,
          currentPayment: scopeChanged ? null : get().currentPayment,
          currentReceipt: scopeChanged ? null : get().currentReceipt,
          dailyCollection: scopeChanged ? null : get().dailyCollection,
          dashboard: scopeChanged ? null : get().dashboard,
          ledger: scopeChanged ? null : get().ledger,
          paymentDraft: scopeChanged
            ? createPaymentDraft(next)
            : get().paymentDraft,
          paymentResult: scopeChanged ? null : get().paymentResult,
          payments: scopeChanged ? emptyPage() : get().payments,
          receiptDocument: scopeChanged ? null : get().receiptDocument,
          receipts: scopeChanged ? emptyPage() : get().receipts,
          sessionStatus,
          error: scopeChanged ? null : get().error,
          successMessage: scopeChanged ? null : get().successMessage,
        });
      },
      updatePaymentDraft(draft) {
        set(state => ({
          allocationPreview:
            draft.input || draft.step !== state.paymentDraft.step
              ? null
              : state.allocationPreview,
          paymentDraft: {
            ...state.paymentDraft,
            ...draft,
            input: draft.input
              ? { ...state.paymentDraft.input, ...draft.input }
              : state.paymentDraft.input,
          },
        }));
      },
      updatePaymentInput(input) {
        set(state => ({
          allocationPreview: null,
          paymentDraft: {
            ...state.paymentDraft,
            input: { ...state.paymentDraft.input, ...input },
          },
        }));
      },
      resetPaymentWorkflow(preserveResult = false) {
        set({
          allocationPreview: null,
          collectableDues: null,
          paymentDraft: createPaymentDraft(get().context ?? undefined),
          paymentResult: preserveResult ? get().paymentResult : null,
        });
      },
      async loadDashboard() {
        set({ error: null, isLoadingDashboard: true });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewPayments(
                member,
                granted,
                current.schoolId,
                current.branchId,
              ),
            'You cannot view Collection dashboard data.',
          );
          const response = await service.getCollectionDashboard(
            value.schoolId,
            value.branchId,
            value.academicSessionId,
            value.asOfDate,
          );
          if (!isCurrent(value)) return false;
          set({ dashboard: response.data, isLoadingDashboard: false });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingDashboard: false });
          return false;
        }
      },
      async loadCollectableDues(
        studentId,
        includeUpcoming = false,
        purpose = 'PAYMENT',
      ) {
        const token = beginRequest('collectable');
        set({
          collectableDues: null,
          error: null,
          isLoadingCollectableDues: true,
        });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              purpose === 'ADVANCE'
                ? canManageAdvanceCredit(
                    member,
                    granted,
                    current.schoolId,
                    current.branchId,
                    get().sessionStatus,
                  )
                : canCollectPayment(
                    member,
                    granted,
                    current.schoolId,
                    current.branchId,
                    get().sessionStatus,
                  ),
            purpose === 'ADVANCE'
              ? 'You cannot apply Advance Credit in this context.'
              : 'You cannot collect a Payment in this context.',
          );
          const response = await service.getCollectableStudentDues(
            value.schoolId,
            studentId,
            {
              academicSessionId: value.academicSessionId,
              asOfDate: value.asOfDate,
              branchId: value.branchId,
              includeUpcoming,
            },
          );
          if (!isCurrent(value) || !isLatestRequest('collectable', token))
            return false;
          set({
            collectableDues: response.data,
            isLoadingCollectableDues: false,
            paymentDraft: {
              ...get().paymentDraft,
              input: { ...get().paymentDraft.input, studentId },
            },
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingCollectableDues: false });
          return false;
        }
      },
      async previewAllocation() {
        if (get().isPreviewingAllocation) return false;
        set({ error: null, isPreviewingAllocation: true });
        try {
          const { membership, value } = authorize(
            (member, granted, current) =>
              canCollectPayment(
                member,
                granted,
                current.schoolId,
                current.branchId,
                get().sessionStatus,
              ),
            'You cannot preview a Payment in this context.',
          );
          const input = {
            ...get().paymentDraft.input,
            ...value,
            collectedByName:
              get().paymentDraft.input.collectedByName ||
              getActorName?.() ||
              'Authorized staff',
            collectedByUserId: membership.userId,
          };
          const response = await service.previewPaymentAllocation(
            value.schoolId,
            input,
          );
          if (!isCurrent(value)) return false;
          set({
            allocationPreview: response.data,
            isPreviewingAllocation: false,
            paymentDraft: { input, step: 4 },
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isPreviewingAllocation: false });
          return false;
        }
      },
      async postPayment() {
        if (get().isPostingPayment) return false;
        set({ error: null, isPostingPayment: true });
        try {
          const preview = get().allocationPreview;
          if (!preview)
            throw new ApiClientError({
              code: 'PAYMENT_PREVIEW_REQUIRED',
              message: 'Review the Payment allocation before posting.',
              status: 400,
            });
          const { membership, value } = authorize(
            (member, granted, current) =>
              canCollectPayment(
                member,
                granted,
                current.schoolId,
                current.branchId,
                get().sessionStatus,
              ),
            'You cannot post a Payment in this context.',
          );
          const response = await service.postPayment(value.schoolId, {
            idempotencyKey: `${value.schoolId}::${preview.input.studentId}::${preview.input.clientGeneratedRequestId}`,
            previewId: preview.previewId,
            requestedByUserId: membership.userId,
          });
          if (!isCurrent(value)) return false;
          set({
            allocationPreview: null,
            collectableDues: null,
            isPostingPayment: false,
            paymentDraft: createPaymentDraft(value),
            paymentResult: response.data,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isPostingPayment: false });
          return false;
        }
      },
      setPaymentQuery(query) {
        set(state => ({ paymentQuery: { ...state.paymentQuery, ...query } }));
      },
      async loadPayments() {
        const token = beginRequest('paymentList');
        set({ error: null, isLoadingPayments: true });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewPayments(
                member,
                granted,
                current.schoolId,
                current.branchId,
              ),
            'You cannot view Payments in this context.',
          );
          const response = await service.getPayments(value.schoolId, {
            ...get().paymentQuery,
            academicSessionId: value.academicSessionId,
            branchId: value.branchId,
          });
          if (!isCurrent(value) || !isLatestRequest('paymentList', token))
            return;
          set({ isLoadingPayments: false, payments: response.data });
        } catch (error) {
          set({ error: normalize(error), isLoadingPayments: false });
        }
      },
      async loadPayment(paymentId) {
        const token = beginRequest('payment');
        set({ currentPayment: null, error: null, isLoadingPayment: true });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewPayments(member, granted, current.schoolId),
            'You cannot view this Payment.',
          );
          const response = await service.getPayment(value.schoolId, paymentId);
          if (!isCurrent(value) || !isLatestRequest('payment', token))
            return false;
          if (response.data.payment.branchId !== value.branchId)
            deny('Payment belongs to another branch.');
          set({ currentPayment: response.data, isLoadingPayment: false });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingPayment: false });
          return false;
        }
      },
      async reversePayment(paymentId, reason) {
        if (get().isReversingPayment) return false;
        set({ error: null, isReversingPayment: true });
        try {
          const { membership, value } = authorize(
            (member, granted, current) =>
              canReversePayment(
                member,
                granted,
                current.schoolId,
                current.branchId,
                get().sessionStatus,
              ),
            'You cannot reverse Payments in this context.',
          );
          const input: ReversePaymentInput = {
            asOfDate: value.asOfDate,
            reason,
            reversedByName: getActorName?.() || 'Authorized staff',
            reversedByUserId: membership.userId,
          };
          const response = await service.reversePayment(
            value.schoolId,
            paymentId,
            input,
          );
          if (!isCurrent(value)) return false;
          const details = await service.getPayment(value.schoolId, paymentId);
          set({
            currentPayment: details.data,
            isReversingPayment: false,
            lastReversal: response.data,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isReversingPayment: false });
          return false;
        }
      },
      setReceiptQuery(query) {
        set(state => ({ receiptQuery: { ...state.receiptQuery, ...query } }));
      },
      async loadReceipts() {
        const token = beginRequest('receiptList');
        set({ error: null, isLoadingReceipts: true });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewReceipts(
                member,
                granted,
                current.schoolId,
                current.branchId,
              ),
            'You cannot view Receipts in this context.',
          );
          const response = await service.getReceipts(value.schoolId, {
            ...get().receiptQuery,
            branchId: value.branchId,
          });
          if (!isCurrent(value) || !isLatestRequest('receiptList', token))
            return;
          set({ isLoadingReceipts: false, receipts: response.data });
        } catch (error) {
          set({ error: normalize(error), isLoadingReceipts: false });
        }
      },
      async loadReceipt(receiptId) {
        const token = beginRequest('receipt');
        set({
          currentReceipt: null,
          error: null,
          isLoadingReceipt: true,
          receiptDocument: null,
        });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewReceipts(member, granted, current.schoolId),
            'You cannot view this Receipt.',
          );
          const response = await service.getReceipt(value.schoolId, receiptId);
          if (!isCurrent(value) || !isLatestRequest('receipt', token))
            return false;
          if (response.data.receipt.branchId !== value.branchId)
            deny('Receipt belongs to another branch.');
          set({ currentReceipt: response.data, isLoadingReceipt: false });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingReceipt: false });
          return false;
        }
      },
      async loadReceiptDocument(receiptId) {
        const token = beginRequest('document');
        set({ error: null, isLoadingReceiptDocument: true });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewReceipts(member, granted, current.schoolId),
            'You cannot preview this Receipt document.',
          );
          const response = await service.getReceiptDocument(
            value.schoolId,
            receiptId,
          );
          if (!isCurrent(value) || !isLatestRequest('document', token))
            return false;
          set({
            isLoadingReceiptDocument: false,
            receiptDocument: response.data,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingReceiptDocument: false });
          return false;
        }
      },
      async loadLedger(studentId, query) {
        const token = beginRequest('ledger');
        set({ error: null, isLoadingLedger: true, ledger: null });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewStudentLedger(
                member,
                granted,
                current.schoolId,
                current.branchId,
              ),
            'You cannot view the Student ledger.',
          );
          const response = await service.getStudentLedger(
            value.schoolId,
            studentId,
            {
              ...query,
              academicSessionId: value.academicSessionId,
              branchId: value.branchId,
            },
          );
          if (!isCurrent(value) || !isLatestRequest('ledger', token))
            return false;
          set({ isLoadingLedger: false, ledger: response.data });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingLedger: false });
          return false;
        }
      },
      async loadAdvance(studentId) {
        const token = beginRequest('advance');
        set({ advance: null, error: null, isLoadingAdvance: true });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewAdvanceCredit(
                member,
                granted,
                current.schoolId,
                current.branchId,
              ),
            'You cannot view Advance Credit.',
          );
          const response = await service.getStudentAdvanceCredits(
            value.schoolId,
            studentId,
          );
          if (!isCurrent(value) || !isLatestRequest('advance', token))
            return false;
          set({ advance: response.data, isLoadingAdvance: false });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingAdvance: false });
          return false;
        }
      },
      async previewAdvance(studentId, input) {
        if (get().isPreviewingAdvance) return false;
        set({ error: null, isPreviewingAdvance: true });
        try {
          const { membership, value } = authorize(
            (member, granted, current) =>
              canManageAdvanceCredit(
                member,
                granted,
                current.schoolId,
                current.branchId,
                get().sessionStatus,
              ),
            'You cannot apply Advance Credit.',
          );
          const response = await service.previewAdvanceApplication(
            value.schoolId,
            studentId,
            { ...input, ...value, requestedByUserId: membership.userId },
          );
          if (!isCurrent(value)) return false;
          set({
            advancePreview: response.data,
            isPreviewingAdvance: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isPreviewingAdvance: false });
          return false;
        }
      },
      async applyAdvance(studentId) {
        if (get().isApplyingAdvance) return false;
        set({ error: null, isApplyingAdvance: true });
        try {
          const preview = get().advancePreview;
          if (!preview)
            throw new ApiClientError({
              code: 'ADVANCE_PREVIEW_REQUIRED',
              message: 'Preview the Advance application first.',
              status: 400,
            });
          const { membership, value } = authorize(
            (member, granted, current) =>
              canManageAdvanceCredit(
                member,
                granted,
                current.schoolId,
                current.branchId,
                get().sessionStatus,
              ),
            'You cannot apply Advance Credit.',
          );
          const response = await service.applyAdvanceCredit(
            value.schoolId,
            studentId,
            {
              previewId: preview.previewId,
              requestedByUserId: membership.userId,
            },
          );
          if (!isCurrent(value)) return false;
          const refreshed = await service.getStudentAdvanceCredits(
            value.schoolId,
            studentId,
          );
          set({
            advance: refreshed.data,
            advancePreview: null,
            isApplyingAdvance: false,
            successMessage: response.message,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isApplyingAdvance: false });
          return false;
        }
      },
      async loadDailyCollection(date) {
        const token = beginRequest('daily');
        set({
          dailyCollection: null,
          error: null,
          isLoadingDailyCollection: true,
        });
        try {
          const { value } = authorize(
            (member, granted, current) =>
              canViewDailyCollection(
                member,
                granted,
                current.schoolId,
                current.branchId,
              ),
            'You cannot view Daily Collection.',
          );
          const response = await service.getDailyCollection(
            value.schoolId,
            value.branchId,
            date ?? value.asOfDate,
          );
          if (!isCurrent(value) || !isLatestRequest('daily', token))
            return false;
          set({
            dailyCollection: response.data,
            isLoadingDailyCollection: false,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingDailyCollection: false });
          return false;
        }
      },
      async loadParentReceipts(schoolId, parentMembershipId, studentId) {
        const token = beginRequest('parentList');
        set({
          error: null,
          isLoadingParentReceipts: true,
          parentReceipts: [],
        });
        try {
          const membership = actor();
          if (!canAccessParentReceipt(membership, schoolId, parentMembershipId))
            deny('Parent Receipt access is ownership-only.');
          const response = await service.getParentReceipts(
            schoolId,
            parentMembershipId,
            studentId,
          );
          if (
            getMembership()?.id !== parentMembershipId ||
            !isLatestRequest('parentList', token)
          )
            return false;
          set({
            isLoadingParentReceipts: false,
            parentReceipts: response.data,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingParentReceipts: false });
          return false;
        }
      },
      async loadParentReceipt(schoolId, parentMembershipId, receiptId) {
        const token = beginRequest('receipt');
        set({ currentReceipt: null, error: null, isLoadingReceipt: true });
        try {
          const membership = actor();
          if (!canAccessParentReceipt(membership, schoolId, parentMembershipId))
            deny('Parent Receipt access is ownership-only.');
          const response = await service.getParentReceipt(
            schoolId,
            parentMembershipId,
            receiptId,
          );
          if (
            getMembership()?.id !== parentMembershipId ||
            !isLatestRequest('receipt', token)
          )
            return false;
          set({ currentReceipt: response.data, isLoadingReceipt: false });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingReceipt: false });
          return false;
        }
      },
      async loadStudentReceipts(schoolId, studentMembershipId) {
        const token = beginRequest('studentList');
        set({
          error: null,
          isLoadingStudentReceipts: true,
          studentReceipts: [],
        });
        try {
          const membership = actor();
          if (
            !canAccessStudentReceipt(membership, schoolId, studentMembershipId)
          )
            deny('Student Receipt access is self-only.');
          const response = await service.getStudentSelfReceipts(
            schoolId,
            studentMembershipId,
          );
          if (
            getMembership()?.id !== studentMembershipId ||
            !isLatestRequest('studentList', token)
          )
            return false;
          set({
            isLoadingStudentReceipts: false,
            studentReceipts: response.data,
          });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingStudentReceipts: false });
          return false;
        }
      },
      async loadStudentReceipt(schoolId, studentMembershipId, receiptId) {
        const token = beginRequest('receipt');
        set({ currentReceipt: null, error: null, isLoadingReceipt: true });
        try {
          const membership = actor();
          if (
            !canAccessStudentReceipt(membership, schoolId, studentMembershipId)
          )
            deny('Student Receipt access is self-only.');
          const response = await service.getStudentSelfReceipt(
            schoolId,
            studentMembershipId,
            receiptId,
          );
          if (
            getMembership()?.id !== studentMembershipId ||
            !isLatestRequest('receipt', token)
          )
            return false;
          set({ currentReceipt: response.data, isLoadingReceipt: false });
          return true;
        } catch (error) {
          set({ error: normalize(error), isLoadingReceipt: false });
          return false;
        }
      },
      clearFeedback() {
        set({ error: null, successMessage: null });
      },
      reset() {
        set({
          ...INITIAL_COLLECTION_STATE,
          paymentDraft: createPaymentDraft(),
        });
      },
    };
  });
}

export const collectionStore = createCollectionStore({
  getActorName: () => authStore.getState().user?.name,
  getMembership: () => authStore.getState().activeMembership,
  getPermissions: membership =>
    getEffectivePermissions(
      membership.role,
      userManagementStore.getState().roleConfiguration?.role ===
        membership.role &&
        userManagementStore.getState().roleConfiguration?.schoolId ===
          membership.schoolId
        ? userManagementStore.getState().roleConfiguration
        : null,
    ),
  service: collectionService,
});

let previousCollectionMembershipId = authStore.getState().activeMembership?.id;
authStore.subscribe(state => {
  const membershipId = state.activeMembership?.id;
  if (membershipId !== previousCollectionMembershipId) {
    previousCollectionMembershipId = membershipId;
    collectionStore.getState().reset();
  }
});

export const useCollectionStore = <T>(
  selector: (state: CollectionStoreState) => T,
) => useStore(collectionStore, selector);
