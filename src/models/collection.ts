import type { ID, PaginatedResponse } from './common';
import type { FeeDue, FeeDueStatus } from './feeDue';

export type PaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE';
export type PaymentStatus = 'POSTED' | 'REVERSED';
export type ReceiptStatus = 'ACTIVE' | 'CANCELLED';
export type AdvanceCreditEntryType =
  | 'PAYMENT_CREDIT'
  | 'DUE_APPLICATION'
  | 'REVERSAL'
  | 'ADJUSTMENT';
export type StudentLedgerEntryType =
  | 'FEE_DUE_CREATED'
  | 'FINE_ACCRUED'
  | 'FINE_WAIVED'
  | 'FEE_DUE_WAIVED'
  | 'FEE_DUE_CANCELLED'
  | 'PAYMENT_POSTED'
  | 'PAYMENT_ALLOCATED'
  | 'ADVANCE_CREDITED'
  | 'ADVANCE_APPLIED'
  | 'PAYMENT_REVERSED'
  | 'ADJUSTMENT';
export type CollectionActivityType =
  | 'PAYMENT_PREVIEWED'
  | 'PAYMENT_POSTED'
  | 'PAYMENT_ALLOCATED'
  | 'ADVANCE_CREDIT_CREATED'
  | 'ADVANCE_CREDIT_APPLIED'
  | 'RECEIPT_CREATED'
  | 'RECEIPT_DOCUMENT_REQUESTED'
  | 'PAYMENT_REVERSED'
  | 'RECEIPT_CANCELLED';

export interface CollectionContext {
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  asOfDate: string;
}

export interface Payment {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  studentId: ID;
  enrollmentId?: ID;
  paymentNumber: string;
  amountPaise: number;
  allocatedAmountPaise: number;
  advanceAmountPaise: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  payerName?: string;
  payerMobile?: string;
  remarks?: string;
  collectedByUserId: ID;
  collectedByName: string;
  idempotencyKey: string;
  status: PaymentStatus;
  receiptId?: ID;
  reversedAt?: string;
  reversedByUserId?: ID;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocation {
  id: ID;
  schoolId: ID;
  paymentId: ID;
  feeDueId: ID;
  feeAmountAppliedPaise: number;
  fineAmountAppliedPaise: number;
  totalAppliedPaise: number;
  allocationOrder: number;
  feeHeadNameSnapshot: string;
  periodLabelSnapshot: string;
  resultingDueStatus: FeeDueStatus;
  createdAt: string;
}

export interface AdvanceAllocation {
  id: ID;
  schoolId: ID;
  studentId: ID;
  feeDueId: ID;
  advanceEntryId: ID;
  feeAmountAppliedPaise: number;
  fineAmountAppliedPaise: number;
  totalAppliedPaise: number;
  createdAt: string;
}

export interface StudentAdvanceCreditEntry {
  id: ID;
  schoolId: ID;
  branchId: ID;
  studentId: ID;
  paymentId?: ID;
  feeDueId?: ID;
  entryType: AdvanceCreditEntryType;
  creditAmountPaise: number;
  debitAmountPaise: number;
  runningBalancePaise: number;
  description: string;
  createdByUserId: ID;
  createdAt: string;
}

export interface ReceiptSchoolSnapshot {
  name: string;
  code: string;
  address: string;
  mobile: string;
  logoUrl?: string;
}
export interface ReceiptBranchSnapshot {
  name: string;
  code: string;
  address: string;
  mobile: string;
}
export interface ReceiptStudentSnapshot {
  name: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
}
export interface ReceiptPayerSnapshot {
  name?: string;
  mobile?: string;
}
export interface ReceiptAllocationSnapshot {
  feeDueId: ID;
  feeHeadName: string;
  periodLabel: string;
  dueDate: string;
  feeAmountAppliedPaise: number;
  fineAmountAppliedPaise: number;
  totalAppliedPaise: number;
  resultingDueStatus: FeeDueStatus;
}

export interface Receipt {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  studentId: ID;
  paymentId: ID;
  receiptNumber: string;
  status: ReceiptStatus;
  issuedAt: string;
  schoolSnapshot: ReceiptSchoolSnapshot;
  branchSnapshot: ReceiptBranchSnapshot;
  studentSnapshot: ReceiptStudentSnapshot;
  payerSnapshot?: ReceiptPayerSnapshot;
  paymentMode: PaymentMode;
  paymentReference?: string;
  paymentAmountPaise: number;
  allocatedAmountPaise: number;
  advanceAmountPaise: number;
  allocationSnapshots: ReceiptAllocationSnapshot[];
  collectedByName: string;
  cancelledAt?: string;
  cancellationReason?: string;
  documentStatus: 'PREVIEW_READY' | 'DOCUMENT_PENDING' | 'DOCUMENT_READY';
  documentUrl?: string;
  createdAt: string;
}

export interface PaymentReversal {
  id: ID;
  schoolId: ID;
  paymentId: ID;
  reversalNumber: string;
  amountPaise: number;
  reason: string;
  reversedByUserId: ID;
  reversedByName: string;
  reversedAt: string;
}

export interface StudentLedgerEntry {
  id: ID;
  schoolId: ID;
  branchId?: ID;
  academicSessionId?: ID;
  studentId: ID;
  entryType: StudentLedgerEntryType;
  feeDueId?: ID;
  feeHeadId?: ID;
  paymentId?: ID;
  receiptId?: ID;
  advanceEntryId?: ID;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
  description: string;
  effectiveDate: string;
  createdByUserId?: ID;
  createdAt: string;
}

export interface CollectionActivity {
  id: ID;
  schoolId: ID;
  branchId: ID;
  studentId: ID;
  paymentId?: ID;
  receiptId?: ID;
  feeDueIds: ID[];
  action: CollectionActivityType;
  amountPaise?: number;
  performedByUserId: ID;
  performedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface CollectableDueItem {
  due: FeeDue;
  remainingFeePaise: number;
  remainingFinePaise: number;
}
export interface CollectableStudentDueSummary {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  advanceBalancePaise: number;
  totalOutstandingPaise: number;
  dues: CollectableDueItem[];
}

export interface ProposedAllocation {
  feeDueId: ID;
  feeHeadName: string;
  periodLabel: string;
  dueDate: string;
  dueStatus: FeeDueStatus;
  outstandingBeforePaise: number;
  fineAmountAppliedPaise: number;
  feeAmountAppliedPaise: number;
  totalAppliedPaise: number;
  outstandingAfterPaise: number;
  resultingStatus: FeeDueStatus;
  allocationOrder: number;
}

export interface PaymentDetailsInput {
  amountPaise: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  referenceNumber?: string;
  chequeNumber?: string;
  chequeDate?: string;
  bankName?: string;
  payerName?: string;
  payerMobile?: string;
  remarks?: string;
}
export interface PreviewPaymentInput
  extends CollectionContext,
    PaymentDetailsInput {
  studentId: ID;
  feeDueIds: ID[];
  allocationMode: 'OLDEST_DUE_FIRST' | 'MANUAL';
  manualAllocations: Array<{ feeDueId: ID; amountPaise: number }>;
  storeExcessAsAdvance: boolean;
  clientGeneratedRequestId: string;
  collectedByUserId: ID;
  collectedByName: string;
  simulateFailure?: boolean;
}
export interface PaymentAllocationPreview {
  previewId: ID;
  expiresAt: string;
  input: PreviewPaymentInput;
  allocations: ProposedAllocation[];
  allocatedAmountPaise: number;
  advanceAmountPaise: number;
  unexplainedAmountPaise: number;
  paymentAmountPaise: number;
  isReconciled: boolean;
  generatedAt: string;
}
export interface PostPaymentInput {
  previewId: ID;
  idempotencyKey: string;
  requestedByUserId: ID;
}
export interface PostPaymentResult {
  payment: Payment;
  allocations: PaymentAllocation[];
  receipt: Receipt;
  advanceEntry?: StudentAdvanceCreditEntry;
}

export interface PaymentListItem {
  payment: Payment;
  receiptNumber?: string;
  studentName: string;
  admissionNumber: string;
  branchName: string;
}
export interface PaymentDetails {
  payment: Payment;
  allocations: PaymentAllocation[];
  receipt?: Receipt;
  advanceEntry?: StudentAdvanceCreditEntry;
  reversal?: PaymentReversal;
  ledgerEntries: StudentLedgerEntry[];
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  branchName: string;
}
export interface PaymentListQuery {
  branchId?: ID | 'ALL';
  academicSessionId?: ID | 'ALL';
  search?: string;
  paymentMode?: PaymentMode | 'ALL';
  status?: PaymentStatus | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  collectedByUserId?: ID;
  page?: number;
  pageSize?: number;
}

export interface ReceiptListItem {
  receipt: Receipt;
  studentName: string;
  admissionNumber: string;
  branchName: string;
  paymentNumber: string;
}
export interface ReceiptDetails {
  receipt: Receipt;
  payment: Payment;
  allocations: PaymentAllocation[];
}
export interface ReceiptListQuery {
  branchId?: ID | 'ALL';
  search?: string;
  paymentMode?: PaymentMode | 'ALL';
  status?: ReceiptStatus | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}
export interface ReceiptDocumentResult {
  receiptId: ID;
  status: Receipt['documentStatus'];
  developmentUri?: string;
  message: string;
}

export interface StudentAdvanceCreditSummary {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  availableBalancePaise: number;
  entries: StudentAdvanceCreditEntry[];
}
export interface PreviewAdvanceApplicationInput {
  branchId: ID;
  academicSessionId: ID;
  asOfDate: string;
  feeDueIds: ID[];
  requestedByUserId: ID;
}
export interface AdvanceApplicationPreview {
  previewId: ID;
  studentId: ID;
  availableBalancePaise: number;
  amountToApplyPaise: number;
  remainingBalancePaise: number;
  allocations: ProposedAllocation[];
  input: PreviewAdvanceApplicationInput;
}
export interface ApplyAdvanceCreditInput {
  previewId: ID;
  requestedByUserId: ID;
}
export interface AdvanceApplicationResult {
  appliedAmountPaise: number;
  remainingBalancePaise: number;
  entries: StudentAdvanceCreditEntry[];
  allocations: AdvanceAllocation[];
}

export interface ReversePaymentInput {
  reason: string;
  reversedByUserId: ID;
  reversedByName: string;
  asOfDate: string;
}
export interface PaymentReversalResult {
  payment: Payment;
  reversal: PaymentReversal;
  receipt: Receipt;
  affectedFeeDueIds: ID[];
}

export interface StudentLedgerQuery {
  branchId?: ID | 'ALL';
  academicSessionId?: ID | 'ALL';
  entryType?: StudentLedgerEntryType | 'ALL';
  feeHeadId?: ID | 'ALL';
  dateFrom?: string;
  dateTo?: string;
}
export interface StudentLedgerSummary {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  feeOutstandingPaise: number;
  fineOutstandingPaise: number;
  advanceBalancePaise: number;
  netFinancialPositionPaise: number;
  entries: StudentLedgerEntry[];
}

export interface ModeCollectionSummary {
  mode: PaymentMode;
  count: number;
  amountPaise: number;
}
export interface CollectorCollectionSummary {
  userId: ID;
  name: string;
  paymentCount: number;
  grossCollectionPaise: number;
  reversedAmountPaise: number;
  netCollectionPaise: number;
}
export interface DailyCollectionSummary {
  schoolId: ID;
  branchId: ID;
  date: string;
  totalPostedPaymentsPaise: number;
  advanceCollectedPaise: number;
  reversedAmountPaise: number;
  netCollectionPaise: number;
  receiptCount: number;
  collectorCount: number;
  paymentCount: number;
  modes: ModeCollectionSummary[];
  collectors: CollectorCollectionSummary[];
}
export interface CollectionDashboardSummary extends DailyCollectionSummary {
  latestPayments: PaymentListItem[];
  recentReversals: PaymentReversal[];
  studentsWithAdvance: number;
}

export interface CollectableDueQuery {
  branchId?: ID;
  academicSessionId?: ID;
  asOfDate: string;
  includeUpcoming?: boolean;
}
export type PaymentPage = PaginatedResponse<PaymentListItem>;
export type ReceiptPage = PaginatedResponse<ReceiptListItem>;

export interface PaymentWorkflowDraft {
  step: 1 | 2 | 3 | 4 | 5;
  input: PreviewPaymentInput;
}
