import { apiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
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
import type { CollectionService } from './collectionService';

// ---- Backend response shapes ------------------------------------------------

interface BackendPaymentAlloc {
  invoice: number;
  invoice_title: string;
  amount: string;
}

interface BackendPayment {
  id: number;
  student: number;
  branch: number;
  amount: string;
  mode: string;
  payment_date: string;
  reference_number: string;
  remarks: string;
  collected_by: number;
  is_cancelled: boolean;
  allocations: BackendPaymentAlloc[];
  receipt_number: string;
  created_at: string;
  receipt_id?: number;
}

interface BackendReceipt {
  id: number;
  receipt_number: string;
  student: number;
  student_name: string;
  payment: BackendPayment;
  created_at: string;
}

interface BackendLedgerSummary {
  summary: {
    total_invoiced: string;
    total_paid: string;
    total_due: string;
  };
  student: {
    id: number;
    name: string;
    admission_number: string;
    branch: number;
    school_class: number;
    section: number;
  };
  invoices: Array<{
    id: number;
    title: string;
    due_date: string;
    total_amount: string;
    paid_amount: string;
    balance_due: string;
    status: string;
  }>;
  payments: BackendPayment[];
}

// ---- Helpers ----------------------------------------------------------------

const MODE_MAP: Record<string, string> = {
  cash: 'CASH',
  upi: 'UPI',
  bank_transfer: 'BANK_TRANSFER',
  cheque: 'CHEQUE',
  card: 'CARD',
};

function toPaise(amount: string | undefined | null): number {
  return Math.round(parseFloat(amount || '0') * 100);
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data, message, success: true };
}

function paginate<T>(items: T[], page = 1, pageSize = 20): PaginatedResponse<T> {
  return {
    items,
    page,
    pageSize,
    totalItems: items.length,
    totalPages: items.length ? Math.ceil(items.length / pageSize) : 0,
  };
}

function notSupported(operation: string): never {
  throw new ApiClientError({
    code: 'OPERATION_NOT_SUPPORTED',
    message: `${operation} is not available in this version.`,
    status: 501,
  });
}

// ---- Payment preview storage (in-memory, single session) --------------------

interface StoredPreview {
  input: PreviewPaymentInput;
  preview: PaymentAllocationPreview;
}

const previewStore = new Map<string, StoredPreview>();

// ---- Mapping helpers --------------------------------------------------------

function mapPaymentToFrontend(p: BackendPayment): import('../../models/collection').Payment {
  return {
    id: String(p.id),
    schoolId: String(p.branch),
    branchId: String(p.branch),
    academicSessionId: '',
    studentId: String(p.student),
    paymentNumber: `PAY-${p.id}`,
    amountPaise: toPaise(p.amount),
    allocatedAmountPaise: p.allocations.reduce((s, a) => s + toPaise(a.amount), 0),
    advanceAmountPaise: 0,
    paymentMode: (MODE_MAP[p.mode] ?? 'CASH') as import('../../models/collection').PaymentMode,
    paymentDate: p.payment_date,
    referenceNumber: p.reference_number || undefined,
    remarks: p.remarks || undefined,
    collectedByUserId: String(p.collected_by),
    collectedByName: '',
    idempotencyKey: `pay-${p.id}`,
    status: p.is_cancelled ? 'REVERSED' : 'POSTED',
    receiptId: p.receipt_id ? String(p.receipt_id) : undefined,
    createdAt: p.created_at,
    updatedAt: p.created_at,
  };
}

function mapReceiptToFrontend(r: BackendReceipt): import('../../models/collection').Receipt {
  return {
    id: String(r.id),
    schoolId: String(r.payment.branch),
    branchId: String(r.payment.branch),
    academicSessionId: '',
    studentId: String(r.student),
    paymentId: String(r.payment.id),
    receiptNumber: r.receipt_number,
    status: r.payment.is_cancelled ? 'CANCELLED' : 'ACTIVE',
    issuedAt: r.created_at,
    schoolSnapshot: { name: '', code: '', address: '', mobile: '' },
    branchSnapshot: { name: '', code: '', address: '', mobile: '' },
    studentSnapshot: { name: r.student_name, admissionNumber: '', className: '', sectionName: '' },
    paymentMode: (MODE_MAP[r.payment.mode] ?? 'CASH') as import('../../models/collection').PaymentMode,
    paymentAmountPaise: toPaise(r.payment.amount),
    allocatedAmountPaise: r.payment.allocations.reduce((s, a) => s + toPaise(a.amount), 0),
    advanceAmountPaise: 0,
    allocationSnapshots: r.payment.allocations.map((a, i) => ({
      feeDueId: String(a.invoice),
      feeHeadName: a.invoice_title,
      periodLabel: a.invoice_title,
      dueDate: '',
      feeAmountAppliedPaise: toPaise(a.amount),
      fineAmountAppliedPaise: 0,
      totalAppliedPaise: toPaise(a.amount),
      resultingDueStatus: 'PAID' as const,
    })),
    collectedByName: '',
    documentStatus: 'PREVIEW_READY',
    createdAt: r.created_at,
  };
}

// ---- Service implementation -------------------------------------------------

export const apiCollectionService: CollectionService = {
  async getCollectionDashboard(_schoolId, _branchId, _sessionId, date) {
    const raw = await apiClient.get<unknown>('/reports/daily-collection/', {
      query: { date },
    });
    const data = raw as Record<string, unknown>;
    const totalPaise = toPaise(data.total_collection as string);
    const byMode = (data.by_mode as Record<string, string>) ?? {};

    const byModeArr = Object.entries(byMode).map(([mode, amount]) => ({
      paymentMode: (MODE_MAP[mode] ?? mode) as import('../../models/collection').PaymentMode,
      totalAmountPaise: toPaise(amount),
      transactionCount: 0,
    }));

    const summary: CollectionDashboardSummary = {
      schoolId: '',
      branchId: _branchId,
      date,
      totalPostedPaymentsPaise: totalPaise,
      advanceCollectedPaise: 0,
      reversedAmountPaise: 0,
      netCollectionPaise: totalPaise,
      receiptCount: (data.payment_count as number) ?? 0,
      collectorCount: 0,
      paymentCount: (data.payment_count as number) ?? 0,
      modes: byModeArr.map(m => ({ mode: m.paymentMode, count: 0, amountPaise: m.totalAmountPaise })),
      collectors: [],
      latestPayments: [],
      recentReversals: [],
      studentsWithAdvance: 0,
    };
    return success(summary);
  },

  async getCollectableStudentDues(_schoolId, studentId, _query: CollectableDueQuery) {
    const raw = await apiClient.get<unknown>('/fees/invoices/', {
      query: { student: studentId },
    });
    const data = raw as Record<string, unknown>;
    const invoices = (Array.isArray(data.invoices) ? data.invoices : []) as Array<{
      id: number;
      title: string;
      due_date: string;
      balance_due: string;
      total_amount: string;
      paid_amount: string;
      fine: string;
      status: string;
      month: number | null;
      year: number | null;
      items: Array<{ fee_head: number; fee_head_name: string; amount: string }>;
    }>;

    const collectableStatuses = new Set(['pending', 'partial', 'overdue']);
    const dues = invoices
      .filter(inv => collectableStatuses.has(inv.status))
      .map(inv => {
        const balancePaise = toPaise(inv.balance_due);
        const finePaise = toPaise(inv.fine);
        const feePaise = Math.max(0, balancePaise - finePaise);
        return {
          due: {
            id: String(inv.id),
            schoolId: '',
            branchId: '',
            academicSessionId: '',
            studentId,
            enrollmentId: studentId,
            feeAssignmentId: String(inv.id),
            feeStructureId: String(inv.id),
            feeStructureItemId: String(inv.id),
            feeHeadId: String(inv.items?.[0]?.fee_head ?? inv.id),
            feeHeadNameSnapshot: inv.items?.[0]?.fee_head_name ?? inv.title,
            feeHeadCodeSnapshot: '',
            studentNameSnapshot: '',
            admissionNumberSnapshot: '',
            branchNameSnapshot: '',
            classNameSnapshot: '',
            sectionNameSnapshot: '',
            periodType: inv.month ? 'MONTH' : 'ONE_TIME',
            periodKey: inv.month ? `${inv.year}-${String(inv.month).padStart(2, '0')}` : String(inv.id),
            periodLabel: inv.title,
            frequencySnapshot: inv.month ? 'MONTHLY' : 'ONE_TIME',
            dueDate: inv.due_date,
            baseAmountPaise: toPaise(inv.total_amount),
            overrideAmountPaise: 0,
            exemptionAmountPaise: 0,
            discountAmountPaise: 0,
            netFeeAmountPaise: toPaise(inv.total_amount),
            fineAmountPaise: finePaise,
            fineWaivedAmountPaise: 0,
            paidAmountPaise: toPaise(inv.paid_amount),
            outstandingAmountPaise: balancePaise,
            status: ({ pending: 'PENDING', partial: 'PARTIALLY_PAID', overdue: 'OVERDUE' } as Record<string, import('../../models/feeDue').FeeDueStatus>)[inv.status] ?? 'PENDING',
            calculationSnapshot: {
              feeStructureName: '',
              feeStructureItemId: String(inv.id),
              frequency: inv.month ? 'MONTHLY' : 'ONE_TIME',
              dueRule: { type: 'FIXED_DATE', date: inv.due_date } as import('../../models/fee').FeeDueRule,
              applicability: 'ALL',
              mandatory: true,
              selected: true,
              overrideType: 'DEFAULT_AMOUNT',
              discountNames: [],
              generatedAsOfDate: inv.due_date,
              warnings: [],
            },
            generatedByRunId: String(inv.id),
            generatedAt: inv.due_date,
            createdAt: inv.due_date,
            updatedAt: inv.due_date,
          } as import('../../models/feeDue').FeeDue,
          remainingFeePaise: feePaise,
          remainingFinePaise: Math.min(finePaise, balancePaise),
        };
      });

    const totalOutstanding = dues.reduce((s, d) => s + d.due.outstandingAmountPaise, 0);

    const summary: CollectableStudentDueSummary = {
      studentId,
      studentName: '',
      admissionNumber: '',
      className: '',
      sectionName: '',
      advanceBalancePaise: 0,
      totalOutstandingPaise: totalOutstanding,
      dues,
    };
    return success(summary);
  },

  async previewPaymentAllocation(_schoolId, input: PreviewPaymentInput) {
    const previewId = `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const totalPaise = input.amountPaise;
    const allocations = input.feeDueIds.map((id, i) => ({
      feeDueId: id,
      feeHeadName: `Invoice ${id}`,
      periodLabel: `Invoice ${id}`,
      dueDate: '',
      dueStatus: 'PENDING' as const,
      outstandingBeforePaise: totalPaise,
      feeAmountAppliedPaise: totalPaise,
      fineAmountAppliedPaise: 0,
      totalAppliedPaise: totalPaise,
      outstandingAfterPaise: 0,
      resultingStatus: 'PAID' as const,
      allocationOrder: i + 1,
    }));

    const preview: PaymentAllocationPreview = {
      previewId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      input,
      allocations,
      allocatedAmountPaise: totalPaise,
      advanceAmountPaise: 0,
      unexplainedAmountPaise: 0,
      paymentAmountPaise: totalPaise,
      isReconciled: true,
      generatedAt: new Date().toISOString(),
    };

    previewStore.set(previewId, { input, preview });
    return success(preview, 'Payment preview ready. Confirm to post payment.');
  },

  async postPayment(_schoolId, postInput: PostPaymentInput) {
    const stored = previewStore.get(postInput.previewId);
    if (!stored) {
      throw new ApiClientError({
        code: 'PAYMENT_PREVIEW_INVALID',
        message: 'Payment preview expired or not found. Please start over.',
        status: 400,
      });
    }

    const { input } = stored;
    const amountRupees = (input.amountPaise / 100).toFixed(2);
    const modeBackend: Record<string, string> = {
      CASH: 'cash',
      UPI: 'upi',
      BANK_TRANSFER: 'bank_transfer',
      CHEQUE: 'cheque',
      CARD: 'card',
    };

    const primaryInvoiceId = input.feeDueIds[0] ? parseInt(input.feeDueIds[0], 10) : undefined;

    const body: Record<string, unknown> = {
      student: parseInt(input.studentId, 10),
      amount: amountRupees,
      mode: modeBackend[input.paymentMode] ?? 'cash',
      payment_date: input.paymentDate,
    };
    if (primaryInvoiceId) body.invoice = primaryInvoiceId;
    if (input.referenceNumber) body.reference_number = input.referenceNumber;
    if (input.remarks) body.remarks = input.remarks;

    const raw = await apiClient.post<unknown>('/payments/', body);
    const data = raw as Record<string, unknown>;
    const backendPayment = data.payment as BackendPayment;

    previewStore.delete(postInput.previewId);

    const frontendPayment = mapPaymentToFrontend(backendPayment);
    frontendPayment.receiptId = String(backendPayment.receipt_id ?? '');

    const receiptId = String(backendPayment.receipt_id ?? backendPayment.id);
    const receipt: import('../../models/collection').Receipt = {
      id: receiptId,
      schoolId: frontendPayment.schoolId,
      branchId: frontendPayment.branchId,
      academicSessionId: '',
      studentId: frontendPayment.studentId,
      paymentId: frontendPayment.id,
      receiptNumber: backendPayment.receipt_number || `REC-${receiptId}`,
      status: 'ACTIVE',
      issuedAt: frontendPayment.createdAt,
      schoolSnapshot: { name: '', code: '', address: '', mobile: '' },
      branchSnapshot: { name: '', code: '', address: '', mobile: '' },
      studentSnapshot: { name: '', admissionNumber: '', className: '', sectionName: '' },
      paymentMode: frontendPayment.paymentMode,
      paymentAmountPaise: frontendPayment.amountPaise,
      allocatedAmountPaise: frontendPayment.allocatedAmountPaise,
      advanceAmountPaise: 0,
      allocationSnapshots: backendPayment.allocations.map(a => ({
        feeDueId: String(a.invoice),
        feeHeadName: a.invoice_title,
        periodLabel: a.invoice_title,
        dueDate: '',
        feeAmountAppliedPaise: toPaise(a.amount),
        fineAmountAppliedPaise: 0,
        totalAppliedPaise: toPaise(a.amount),
        resultingDueStatus: 'PAID' as const,
      })),
      collectedByName: '',
      documentStatus: 'PREVIEW_READY',
      createdAt: frontendPayment.createdAt,
    };

    const result: PostPaymentResult = {
      payment: frontendPayment,
      receipt,
      allocations: backendPayment.allocations.map((a, i) => ({
        id: `alloc-${i}`,
        schoolId: frontendPayment.schoolId,
        paymentId: frontendPayment.id,
        feeDueId: String(a.invoice),
        feeAmountAppliedPaise: toPaise(a.amount),
        fineAmountAppliedPaise: 0,
        totalAppliedPaise: toPaise(a.amount),
        allocationOrder: i + 1,
        feeHeadNameSnapshot: a.invoice_title,
        periodLabelSnapshot: a.invoice_title,
        resultingDueStatus: 'PAID' as const,
        createdAt: frontendPayment.createdAt,
      })),
    };

    return success(result, 'Payment posted and receipt created.');
  },

  async getPayments(_schoolId, query: PaymentListQuery) {
    const params: Record<string, string | number | undefined> = {};
    if (query.branchId && query.branchId !== 'ALL') params.branch = query.branchId;

    const raw = await apiClient.get<unknown>('/payments/', { query: params });
    const data = raw as Record<string, unknown>;
    const payments = (Array.isArray(data.payments) ? data.payments : []) as BackendPayment[];

    const items: PaymentListItem[] = payments.map(p => ({
      payment: mapPaymentToFrontend(p),
      studentName: '',
      admissionNumber: '',
      branchName: '',
      receiptNumber: p.receipt_number,
    }));

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    return success({
      items: items.slice(start, start + pageSize),
      page,
      pageSize,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / pageSize) || 0,
    });
  },

  async getPayment(_schoolId, paymentId) {
    const raw = await apiClient.get<unknown>(`/payments/${paymentId}/receipt/`);
    const data = raw as Record<string, unknown>;
    const receipt = data.receipt as BackendReceipt;

    const details: PaymentDetails = {
      payment: mapPaymentToFrontend(receipt.payment),
      receipt: mapReceiptToFrontend(receipt),
      studentName: receipt.student_name,
      admissionNumber: '',
      className: '',
      sectionName: '',
      branchName: '',
      allocations: receipt.payment.allocations.map((a, i) => ({
        id: `alloc-${i}`,
        schoolId: '',
        paymentId: String(receipt.payment.id),
        feeDueId: String(a.invoice),
        feeAmountAppliedPaise: toPaise(a.amount),
        fineAmountAppliedPaise: 0,
        totalAppliedPaise: toPaise(a.amount),
        allocationOrder: i + 1,
        feeHeadNameSnapshot: a.invoice_title,
        periodLabelSnapshot: a.invoice_title,
        resultingDueStatus: 'PAID' as const,
        createdAt: receipt.payment.created_at,
      })),
      ledgerEntries: [],
    };
    return success(details);
  },

  async reversePayment(_schoolId, paymentId, _input: ReversePaymentInput) {
    const receiptRaw = await apiClient.get<unknown>(`/payments/${paymentId}/receipt/`);
    const receiptData = (receiptRaw as Record<string, unknown>).receipt as BackendReceipt;
    const receiptId = receiptData.id;

    await apiClient.post<unknown>(`/receipts/${receiptId}/cancel/`, {});

    const reversedPayment = mapPaymentToFrontend({ ...receiptData.payment, is_cancelled: true });
    const result: PaymentReversalResult = {
      payment: reversedPayment,
      reversal: {
        id: `rev-${receiptId}`,
        schoolId: '',
        paymentId: String(receiptData.payment.id),
        reversalNumber: `REV-${receiptId}`,
        amountPaise: toPaise(receiptData.payment.amount),
        reason: 'Payment cancelled',
        reversedByUserId: '',
        reversedByName: '',
        reversedAt: new Date().toISOString(),
      },
      receipt: { ...mapReceiptToFrontend(receiptData), status: 'CANCELLED' },
      affectedFeeDueIds: receiptData.payment.allocations.map(a => String(a.invoice)),
    };
    return success(result, 'Payment reversed and receipt cancelled.');
  },

  async getReceipts(_schoolId, _query: ReceiptListQuery) {
    return success(paginate<import('../../models/collection').ReceiptListItem>([]));
  },

  async getReceipt(_schoolId, receiptId) {
    const raw = await apiClient.get<unknown>(`/payments/${receiptId}/receipt/`);
    const data = raw as Record<string, unknown>;
    const receipt = data.receipt as BackendReceipt;
    const details: ReceiptDetails = {
      receipt: mapReceiptToFrontend(receipt),
      payment: mapPaymentToFrontend(receipt.payment),
      allocations: receipt.payment.allocations.map((a, i) => ({
        id: `alloc-${i}`,
        schoolId: '',
        paymentId: String(receipt.payment.id),
        feeDueId: String(a.invoice),
        feeAmountAppliedPaise: toPaise(a.amount),
        fineAmountAppliedPaise: 0,
        totalAppliedPaise: toPaise(a.amount),
        allocationOrder: i + 1,
        feeHeadNameSnapshot: a.invoice_title,
        periodLabelSnapshot: a.invoice_title,
        resultingDueStatus: 'PAID' as const,
        createdAt: receipt.payment.created_at,
      })),
    };
    return success(details);
  },

  async getReceiptDocument(_schoolId, _receiptId): Promise<ApiResponse<ReceiptDocumentResult>> {
    notSupported('getReceiptDocument');
  },

  async getStudentLedger(_schoolId, studentId, _query?: StudentLedgerQuery) {
    const raw = await apiClient.get<unknown>(`/students/${studentId}/ledger/`);
    const data = raw as BackendLedgerSummary;

    const totalInvoicedPaise = toPaise(data.summary?.total_invoiced);
    const totalPaidPaise = toPaise(data.summary?.total_paid);
    const totalDuePaise = toPaise(data.summary?.total_due);

    const entries: import('../../models/collection').StudentLedgerEntry[] = [
      ...(data.invoices ?? []).map(inv => ({
        id: `inv-${inv.id}`,
        schoolId: '',
        branchId: '',
        academicSessionId: '',
        studentId,
        entryType: 'FEE_DUE_CREATED' as const,
        feeDueId: String(inv.id),
        debitPaise: toPaise(inv.total_amount),
        creditPaise: 0,
        runningBalancePaise: 0,
        description: inv.title,
        effectiveDate: inv.due_date,
        createdAt: inv.due_date,
      })),
      ...(data.payments ?? []).map(p => ({
        id: `pay-${p.id}`,
        schoolId: '',
        branchId: '',
        academicSessionId: '',
        studentId,
        entryType: 'PAYMENT_ALLOCATED' as const,
        paymentId: String(p.id),
        debitPaise: 0,
        creditPaise: toPaise(p.amount),
        runningBalancePaise: 0,
        description: `Payment - ${p.mode}`,
        effectiveDate: p.payment_date,
        createdAt: p.created_at,
      })),
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    const summary: StudentLedgerSummary = {
      studentId,
      studentName: data.student?.name ?? '',
      admissionNumber: '',
      feeOutstandingPaise: totalDuePaise,
      fineOutstandingPaise: 0,
      advanceBalancePaise: 0,
      netFinancialPositionPaise: totalDuePaise,
      entries,
    };
    return success(summary);
  },

  async getStudentAdvanceCredits(_schoolId, studentId): Promise<ApiResponse<StudentAdvanceCreditSummary>> {
    return success({
      studentId,
      studentName: '',
      admissionNumber: '',
      availableBalancePaise: 0,
      entries: [],
    });
  },

  async previewAdvanceApplication(_schoolId, _studentId, _input: PreviewAdvanceApplicationInput): Promise<ApiResponse<AdvanceApplicationPreview>> {
    notSupported('previewAdvanceApplication');
  },

  async applyAdvanceCredit(_schoolId, _studentId, _input: ApplyAdvanceCreditInput): Promise<ApiResponse<AdvanceApplicationResult>> {
    notSupported('applyAdvanceCredit');
  },

  async getDailyCollection(_schoolId, _branchId, date) {
    const raw = await apiClient.get<unknown>('/reports/daily-collection/', { query: { date } });
    const data = raw as Record<string, unknown>;
    const totalPaise = toPaise(data.total_collection as string);
    const byMode = (data.by_mode as Record<string, string>) ?? {};

    const modeMap2: Record<string, string> = { cash: 'CASH', upi: 'UPI', bank_transfer: 'BANK_TRANSFER', cheque: 'CHEQUE', card: 'CARD' };
    const summary: DailyCollectionSummary = {
      schoolId: '',
      branchId: _branchId,
      date,
      totalPostedPaymentsPaise: totalPaise,
      advanceCollectedPaise: 0,
      reversedAmountPaise: 0,
      netCollectionPaise: totalPaise,
      receiptCount: (data.payment_count as number) ?? 0,
      collectorCount: 0,
      paymentCount: (data.payment_count as number) ?? 0,
      modes: Object.entries(byMode).map(([mode, amount]) => ({
        mode: (modeMap2[mode] ?? 'CASH') as import('../../models/collection').PaymentMode,
        count: 0,
        amountPaise: toPaise(amount),
      })),
      collectors: [],
    };
    return success(summary);
  },

  async getParentReceipts(_schoolId, _parentMembershipId, _studentId) {
    return success<import('../../models/collection').ReceiptListItem[]>([]);
  },

  async getParentReceipt(_schoolId, _parentMembershipId, _receiptId) {
    notSupported('getParentReceipt');
  },

  async getStudentSelfReceipts(_schoolId, _studentMembershipId) {
    return success<import('../../models/collection').ReceiptListItem[]>([]);
  },

  async getStudentSelfReceipt(_schoolId, _studentMembershipId, _receiptId) {
    notSupported('getStudentSelfReceipt');
  },
};
