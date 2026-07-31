import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  AdvanceApplicationPreview,
  AdvanceApplicationResult,
  ApplyAdvanceCreditInput,
  CollectableDueQuery,
  CollectableStudentDueSummary,
  CollectionDashboardSummary,
  DailyCollectionSummary,
  PaymentAllocationPreview,
  PaymentDetails,
  PaymentListItem,
  PaymentListQuery,
  PaymentReversalResult,
  PostPaymentInput,
  PostPaymentResult,
  PreviewAdvanceApplicationInput,
  PreviewPaymentInput,
  ReceiptDetails,
  ReceiptDocumentResult,
  ReceiptListItem,
  ReceiptListQuery,
  ReversePaymentInput,
  StudentAdvanceCreditSummary,
  StudentLedgerQuery,
  StudentLedgerSummary,
} from '../../models/collection';

export interface CollectionService {
  getCollectionDashboard(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    date: string,
  ): Promise<ApiResponse<CollectionDashboardSummary>>;
  getCollectableStudentDues(
    schoolId: string,
    studentId: string,
    query: CollectableDueQuery,
  ): Promise<ApiResponse<CollectableStudentDueSummary>>;
  previewPaymentAllocation(
    schoolId: string,
    input: PreviewPaymentInput,
  ): Promise<ApiResponse<PaymentAllocationPreview>>;
  postPayment(
    schoolId: string,
    input: PostPaymentInput,
  ): Promise<ApiResponse<PostPaymentResult>>;
  getPayments(
    schoolId: string,
    query: PaymentListQuery,
  ): Promise<ApiResponse<PaginatedResponse<PaymentListItem>>>;
  getPayment(
    schoolId: string,
    paymentId: string,
  ): Promise<ApiResponse<PaymentDetails>>;
  reversePayment(
    schoolId: string,
    paymentId: string,
    input: ReversePaymentInput,
  ): Promise<ApiResponse<PaymentReversalResult>>;
  getReceipts(
    schoolId: string,
    query: ReceiptListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ReceiptListItem>>>;
  getReceipt(
    schoolId: string,
    receiptId: string,
  ): Promise<ApiResponse<ReceiptDetails>>;
  getReceiptDocument(
    schoolId: string,
    receiptId: string,
  ): Promise<ApiResponse<ReceiptDocumentResult>>;
  getStudentLedger(
    schoolId: string,
    studentId: string,
    query?: StudentLedgerQuery,
  ): Promise<ApiResponse<StudentLedgerSummary>>;
  getStudentAdvanceCredits(
    schoolId: string,
    studentId: string,
  ): Promise<ApiResponse<StudentAdvanceCreditSummary>>;
  previewAdvanceApplication(
    schoolId: string,
    studentId: string,
    input: PreviewAdvanceApplicationInput,
  ): Promise<ApiResponse<AdvanceApplicationPreview>>;
  applyAdvanceCredit(
    schoolId: string,
    studentId: string,
    input: ApplyAdvanceCreditInput,
  ): Promise<ApiResponse<AdvanceApplicationResult>>;
  getDailyCollection(
    schoolId: string,
    branchId: string,
    date: string,
  ): Promise<ApiResponse<DailyCollectionSummary>>;
  getParentReceipts(
    schoolId: string,
    parentMembershipId: string,
    studentId?: string,
  ): Promise<ApiResponse<ReceiptListItem[]>>;
  getParentReceipt(
    schoolId: string,
    parentMembershipId: string,
    receiptId: string,
  ): Promise<ApiResponse<ReceiptDetails>>;
  getStudentSelfReceipts(
    schoolId: string,
    studentMembershipId: string,
  ): Promise<ApiResponse<ReceiptListItem[]>>;
  getStudentSelfReceipt(
    schoolId: string,
    studentMembershipId: string,
    receiptId: string,
  ): Promise<ApiResponse<ReceiptDetails>>;
}
