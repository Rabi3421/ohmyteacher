import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type { FeeDue } from '../../models/feeDue';
import type {
  AdvanceAllocation,
  AdvanceApplicationPreview,
  CollectableDueItem,
  CollectionActivity,
  Payment,
  PaymentAllocation,
  PaymentAllocationPreview,
  PaymentDetails,
  PaymentListItem,
  PaymentReversal,
  PostPaymentResult,
  Receipt,
  ReceiptDetails,
  ReceiptListItem,
  StudentAdvanceCreditEntry,
  StudentLedgerEntry,
} from '../../models/collection';
import { calculateOutstandingAmount } from '../../utils/feeOutstandingCalculation';
import { recalculatePaidFeeDueStatus } from '../../utils/collectionFeeDueStatus';
import {
  calculateAdvanceBalance,
  withAdvanceRunningBalances,
} from '../../utils/advanceCredit';
import { aggregateDailyCollection } from '../../utils/dailyCollection';
import {
  previewPaymentAllocations,
  reconcilePaymentAmounts,
} from '../../utils/paymentAllocation';
import { validatePaymentDetails } from '../../utils/paymentModeValidation';
import { withLedgerRunningBalances } from '../../utils/studentLedger';
import {
  INITIAL_ACADEMIC_CLASSES,
  INITIAL_SECTIONS,
} from '../academic/academicFixtures';
import { ApiClientError } from '../api/apiError';
import { SCHOOL_AUTH_FIXTURES } from '../auth/authFixtures';
import {
  getMockFeeDueRepositorySnapshot,
  updateMockFeeDuesAtomically,
} from '../feeDue/mockFeeDueService';
import { mockDelay } from '../mock/mockDelay';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  INITIAL_PARENT_STUDENT_LINKS,
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_PROFILES,
} from '../student/studentFixtures';
import type { CollectionService } from './collectionService';
import {
  INITIAL_ADVANCE_ENTRIES,
  INITIAL_PAYMENTS,
  INITIAL_RECEIPTS,
  INITIAL_REVERSALS,
} from './collectionFixtures';
import { receiptDocumentService } from './receiptDocumentServiceResolver';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let payments: Payment[] = [];
let allocations: PaymentAllocation[] = [];
let receipts: Receipt[] = [];
let advanceEntries: StudentAdvanceCreditEntry[] = [];
let advanceAllocations: AdvanceAllocation[] = [];
let reversals: PaymentReversal[] = [];
let ledgerEntries: StudentLedgerEntry[] = [];
let activities: CollectionActivity[] = [];
let previews = new Map<string, PaymentAllocationPreview>();
let advancePreviews = new Map<string, AdvanceApplicationPreview>();
let sequence = 1000;

export function resetMockCollectionData(): void {
  payments = clone(INITIAL_PAYMENTS);
  allocations = [];
  receipts = clone(INITIAL_RECEIPTS);
  advanceEntries = clone(INITIAL_ADVANCE_ENTRIES);
  advanceAllocations = [];
  reversals = clone(INITIAL_REVERSALS);
  ledgerEntries = [];
  activities = [];
  previews = new Map();
  advancePreviews = new Map();
  sequence = 1000;
}

export function getMockCollectionRepositorySnapshot() {
  return clone({
    activities,
    advanceAllocations,
    advanceEntries,
    allocations,
    ledgerEntries,
    payments,
    receipts,
    reversals,
  });
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data: clone(data), message, success: true };
}
function fail(
  code: string,
  message: string,
  status = 409,
  fieldErrors?: Record<string, string>,
): never {
  throw new ApiClientError({ code, fieldErrors, message, status });
}
function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  return {
    items: items.slice((safePage - 1) * safeSize, safePage * safeSize),
    page: safePage,
    pageSize: safeSize,
    totalItems: items.length,
    totalPages: items.length ? Math.ceil(items.length / safeSize) : 0,
  };
}

function context(
  schoolId: string,
  branchId: string,
  sessionId?: string,
  mutable = false,
) {
  const school =
    INITIAL_SCHOOLS.find(item => item.id === schoolId) ??
    fail('COLLECTION_SCHOOL_NOT_FOUND', 'School was not found.', 404);
  const branch =
    INITIAL_BRANCHES.find(
      item =>
        item.id === branchId &&
        item.schoolId === schoolId &&
        item.status === 'ACTIVE',
    ) ??
    fail('INVALID_COLLECTION_BRANCH', 'Branch is outside the selected School.');
  const session = sessionId
    ? INITIAL_ACADEMIC_SESSIONS.find(
        item => item.id === sessionId && item.schoolId === schoolId,
      ) ??
      fail(
        'INVALID_COLLECTION_SESSION',
        'Academic Session is outside the selected School.',
      )
    : undefined;
  if (mutable && session?.status === 'CLOSED')
    fail(
      'COLLECTION_SESSION_CLOSED',
      'Closed sessions are historical and read-only.',
    );
  return { branch, school, session };
}
function student(schoolId: string, studentId: string) {
  return (
    INITIAL_STUDENT_PROFILES.find(
      item => item.id === studentId && item.schoolId === schoolId,
    ) ??
    fail(
      'COLLECTION_STUDENT_NOT_FOUND',
      'Student was not found in this School.',
      404,
    )
  );
}
function payment(schoolId: string, id: string) {
  return (
    payments.find(item => item.id === id && item.schoolId === schoolId) ??
    fail('PAYMENT_NOT_FOUND', 'Payment was not found.', 404)
  );
}
function receipt(schoolId: string, id: string) {
  return (
    receipts.find(item => item.id === id && item.schoolId === schoolId) ??
    fail('RECEIPT_NOT_FOUND', 'Receipt was not found.', 404)
  );
}

function currentDues(
  schoolId: string,
  studentId: string,
  asOfDate: string,
  branchId?: string,
  sessionId?: string,
): CollectableDueItem[] {
  return getMockFeeDueRepositorySnapshot()
    .filter(
      due =>
        due.schoolId === schoolId &&
        due.studentId === studentId &&
        (!branchId || due.branchId === branchId) &&
        (!sessionId || due.academicSessionId === sessionId),
    )
    .map(due => {
      const outstandingAmountPaise = calculateOutstandingAmount(due);
      const status = recalculatePaidFeeDueStatus({
        asOfDate,
        dueDate: due.dueDate,
        outstandingAmountPaise,
        paidAmountPaise: due.paidAmountPaise,
        protectedStatus: due.status,
      });
      const effectiveFine = Math.max(
        0,
        due.fineAmountPaise - due.fineWaivedAmountPaise,
      );
      const finePaid = Math.min(due.paidAmountPaise, effectiveFine);
      const feePaid = Math.max(0, due.paidAmountPaise - finePaid);
      return {
        due: { ...due, outstandingAmountPaise, status },
        remainingFeePaise: Math.max(0, due.netFeeAmountPaise - feePaid),
        remainingFinePaise: Math.max(0, effectiveFine - finePaid),
      };
    })
    .filter(
      item =>
        item.due.outstandingAmountPaise > 0 &&
        !['CANCELLED', 'WAIVED', 'PAID'].includes(item.due.status),
    );
}

function profileSnapshot(
  studentId: string,
  branchId: string,
  sessionId: string,
) {
  const enrollment =
    INITIAL_STUDENT_ENROLLMENTS.find(
      item =>
        item.studentId === studentId &&
        item.branchId === branchId &&
        item.academicSessionId === sessionId,
    ) ??
    INITIAL_STUDENT_ENROLLMENTS.find(
      item => item.studentId === studentId && item.branchId === branchId,
    );
  const academicClass = INITIAL_ACADEMIC_CLASSES.find(
    item => item.id === enrollment?.classId,
  );
  const section = INITIAL_SECTIONS.find(
    item => item.id === enrollment?.sectionId,
  );
  return {
    className: academicClass?.name ?? 'Historical enrollment',
    enrollment,
    sectionName: section?.name ?? '—',
  };
}
function address(value: {
  line1: string;
  city: string;
  state: string;
  pinCode: string;
}) {
  return `${value.line1}, ${value.city}, ${value.state} ${value.pinCode}`;
}
function branchCode(branchId: string) {
  return INITIAL_BRANCHES.find(item => item.id === branchId)?.code ?? 'BRANCH';
}
function sessionName(sessionId: string) {
  return (
    INITIAL_ACADEMIC_SESSIONS.find(item => item.id === sessionId)?.name ??
    sessionId
  );
}
function nextNumber(
  prefix: 'PAY' | 'REC' | 'REV',
  branchId: string,
  sessionId: string,
) {
  const count =
    prefix === 'PAY'
      ? payments.length + 1
      : prefix === 'REC'
      ? receipts.length + 1
      : reversals.length + 1;
  return `${prefix}/${branchCode(branchId)}/${sessionName(sessionId)}/${String(
    count,
  ).padStart(6, '0')}`;
}
function advanceFor(schoolId: string, studentId: string) {
  return withAdvanceRunningBalances(
    advanceEntries.filter(
      item => item.schoolId === schoolId && item.studentId === studentId,
    ),
  );
}
function activity(
  action: CollectionActivity['action'],
  input: {
    schoolId: string;
    branchId: string;
    studentId: string;
    userId: string;
    at: string;
    paymentId?: string;
    receiptId?: string;
    feeDueIds?: string[];
    amountPaise?: number;
  },
) {
  activities.push({
    action,
    amountPaise: input.amountPaise,
    branchId: input.branchId,
    feeDueIds: input.feeDueIds ?? [],
    id: `collection-activity-${++sequence}`,
    paymentId: input.paymentId,
    performedAt: input.at,
    performedByUserId: input.userId,
    receiptId: input.receiptId,
    schoolId: input.schoolId,
    studentId: input.studentId,
  });
}

function paymentResult(value: Payment): PostPaymentResult {
  return {
    advanceEntry: advanceEntries.find(
      item =>
        item.paymentId === value.id && item.entryType === 'PAYMENT_CREDIT',
    ),
    allocations: allocations.filter(item => item.paymentId === value.id),
    payment: value,
    receipt: receipts.find(item => item.paymentId === value.id)!,
  };
}
function paymentDetails(schoolId: string, id: string): PaymentDetails {
  const value = payment(schoolId, id);
  const profile = student(schoolId, value.studentId);
  const snap = profileSnapshot(
    value.studentId,
    value.branchId,
    value.academicSessionId,
  );
  return {
    admissionNumber: profile.admissionNumber,
    advanceEntry: advanceEntries.find(
      item => item.paymentId === id && item.entryType === 'PAYMENT_CREDIT',
    ),
    allocations: allocations.filter(item => item.paymentId === id),
    branchName:
      INITIAL_BRANCHES.find(item => item.id === value.branchId)?.name ??
      value.branchId,
    className: snap.className,
    ledgerEntries: ledgerEntries.filter(item => item.paymentId === id),
    payment: value,
    receipt: receipts.find(item => item.paymentId === id),
    reversal: reversals.find(item => item.paymentId === id),
    sectionName: snap.sectionName,
    studentName: profile.fullName,
  };
}
function receiptDetails(schoolId: string, id: string): ReceiptDetails {
  const value = receipt(schoolId, id);
  return {
    allocations: allocations.filter(item => item.paymentId === value.paymentId),
    payment: payment(schoolId, value.paymentId),
    receipt: value,
  };
}
function selfServiceReceiptDetails(
  schoolId: string,
  id: string,
): ReceiptDetails {
  const details = receiptDetails(schoolId, id);
  return {
    ...details,
    payment: {
      ...details.payment,
      collectedByUserId: 'REDACTED',
      remarks: undefined,
    },
  };
}
function paymentListItem(value: Payment): PaymentListItem {
  const profile = student(value.schoolId, value.studentId);
  return {
    admissionNumber: profile.admissionNumber,
    branchName:
      INITIAL_BRANCHES.find(item => item.id === value.branchId)?.name ??
      value.branchId,
    payment: value,
    receiptNumber: receipts.find(item => item.paymentId === value.id)
      ?.receiptNumber,
    studentName: profile.fullName,
  };
}
function receiptListItem(value: Receipt): ReceiptListItem {
  const profile = student(value.schoolId, value.studentId);
  return {
    admissionNumber: profile.admissionNumber,
    branchName: value.branchSnapshot.name,
    paymentNumber: payment(value.schoolId, value.paymentId).paymentNumber,
    receipt: value,
    studentName: profile.fullName,
  };
}

function baseLedger(schoolId: string, studentId: string): StudentLedgerEntry[] {
  const entries: StudentLedgerEntry[] = [];
  getMockFeeDueRepositorySnapshot()
    .filter(due => due.schoolId === schoolId && due.studentId === studentId)
    .forEach(due => {
      entries.push({
        academicSessionId: due.academicSessionId,
        branchId: due.branchId,
        createdAt: due.generatedAt,
        debitPaise: due.netFeeAmountPaise,
        creditPaise: 0,
        description: `${due.feeHeadNameSnapshot} · ${due.periodLabel}`,
        effectiveDate: due.dueDate,
        entryType: 'FEE_DUE_CREATED',
        feeDueId: due.id,
        feeHeadId: due.feeHeadId,
        id: `ledger-due-${due.id}`,
        runningBalancePaise: 0,
        schoolId,
        studentId,
      });
      if (due.fineAmountPaise > 0)
        entries.push({
          academicSessionId: due.academicSessionId,
          branchId: due.branchId,
          createdAt: due.updatedAt,
          creditPaise: due.fineWaivedAmountPaise,
          debitPaise: due.fineAmountPaise,
          description: `Fine · ${due.feeHeadNameSnapshot}`,
          effectiveDate:
            due.fineCalculatedThrough ?? due.updatedAt.slice(0, 10),
          entryType: due.fineWaivedAmountPaise ? 'FINE_WAIVED' : 'FINE_ACCRUED',
          feeDueId: due.id,
          feeHeadId: due.feeHeadId,
          id: `ledger-fine-${due.id}`,
          runningBalancePaise: 0,
          schoolId,
          studentId,
        });
      if (due.status === 'WAIVED' || due.status === 'CANCELLED')
        entries.push({
          academicSessionId: due.academicSessionId,
          branchId: due.branchId,
          createdAt: due.updatedAt,
          creditPaise:
            due.netFeeAmountPaise +
            Math.max(0, due.fineAmountPaise - due.fineWaivedAmountPaise),
          debitPaise: 0,
          description: `${due.status === 'WAIVED' ? 'Waived' : 'Cancelled'} · ${
            due.feeHeadNameSnapshot
          }`,
          effectiveDate: due.updatedAt.slice(0, 10),
          entryType:
            due.status === 'WAIVED' ? 'FEE_DUE_WAIVED' : 'FEE_DUE_CANCELLED',
          feeDueId: due.id,
          feeHeadId: due.feeHeadId,
          id: `ledger-terminal-${due.id}`,
          runningBalancePaise: 0,
          schoolId,
          studentId,
        });
    });
  return entries;
}

function validatePreviewDues(
  preview: PaymentAllocationPreview,
  working: FeeDue[],
) {
  preview.allocations.forEach(line => {
    const due =
      working.find(
        item =>
          item.id === line.feeDueId &&
          item.schoolId === preview.input.schoolId &&
          item.branchId === preview.input.branchId &&
          item.academicSessionId === preview.input.academicSessionId &&
          item.studentId === preview.input.studentId,
      ) ??
      fail(
        'PAYMENT_DUE_CONTEXT_MISMATCH',
        'A selected Fee Due changed context after preview.',
      );
    if (['WAIVED', 'CANCELLED', 'PAID'].includes(due.status))
      fail(
        'PAYMENT_DUE_NOT_COLLECTABLE',
        'A selected Fee Due is no longer collectable.',
      );
    if (calculateOutstandingAmount(due) < line.totalAppliedPaise)
      fail(
        'PAYMENT_ALLOCATION_EXCEEDS_DUE',
        'Allocation exceeds current Fee Due outstanding.',
      );
  });
}

export function createMockCollectionService(): CollectionService {
  return {
    async getCollectionDashboard(schoolId, branchId, academicSessionId, date) {
      await mockDelay(70);
      context(schoolId, branchId, academicSessionId);
      const daily = aggregateDailyCollection({
        branchId,
        date,
        payments,
        reversals,
        schoolId,
      });
      return success({
        ...daily,
        latestPayments: payments
          .filter(
            item =>
              item.schoolId === schoolId &&
              item.branchId === branchId &&
              item.academicSessionId === academicSessionId,
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5)
          .map(paymentListItem),
        recentReversals: reversals
          .filter(item => item.schoolId === schoolId)
          .sort((a, b) => b.reversedAt.localeCompare(a.reversedAt))
          .slice(0, 5),
        studentsWithAdvance: new Set(
          advanceEntries
            .filter(item => item.schoolId === schoolId)
            .map(item => item.studentId)
            .filter(
              id =>
                calculateAdvanceBalance(
                  advanceEntries.filter(
                    item => item.schoolId === schoolId && item.studentId === id,
                  ),
                ) > 0,
            ),
        ).size,
      });
    },
    async getCollectableStudentDues(schoolId, studentId, query) {
      await mockDelay(70);
      const profile = student(schoolId, studentId);
      if (query.branchId && query.academicSessionId)
        context(schoolId, query.branchId, query.academicSessionId);
      const snap = profileSnapshot(
        studentId,
        query.branchId ?? '',
        query.academicSessionId ?? '',
      );
      const dues = currentDues(
        schoolId,
        studentId,
        query.asOfDate,
        query.branchId,
        query.academicSessionId,
      ).filter(item => query.includeUpcoming || item.due.status !== 'UPCOMING');
      return success({
        admissionNumber: profile.admissionNumber,
        advanceBalancePaise: calculateAdvanceBalance(
          advanceFor(schoolId, studentId),
        ),
        className: snap.className,
        dues,
        sectionName: snap.sectionName,
        studentId,
        studentName: profile.fullName,
        totalOutstandingPaise: dues.reduce(
          (sum, item) => sum + item.due.outstandingAmountPaise,
          0,
        ),
      });
    },
    async previewPaymentAllocation(schoolId, input) {
      await mockDelay(90);
      if (input.schoolId !== schoolId)
        fail(
          'PAYMENT_SCHOOL_MISMATCH',
          'Payment School does not match the route.',
        );
      context(schoolId, input.branchId, input.academicSessionId, true);
      student(schoolId, input.studentId);
      const errors = validatePaymentDetails(input);
      if (Object.keys(errors).length)
        fail('PAYMENT_VALIDATION_ERROR', 'Check Payment details.', 400, errors);
      if (new Set(input.feeDueIds).size !== input.feeDueIds.length)
        fail(
          'DUPLICATE_PAYMENT_DUE',
          'A Fee Due was selected more than once.',
          400,
        );
      const available = currentDues(
        schoolId,
        input.studentId,
        input.asOfDate,
        input.branchId,
        input.academicSessionId,
      );
      const selected = input.feeDueIds.map(
        id =>
          available.find(item => item.due.id === id) ??
          fail(
            'PAYMENT_DUE_CONTEXT_MISMATCH',
            'A selected Fee Due is not collectable for this Student.',
          ),
      );
      input.manualAllocations.forEach(value => {
        const due =
          selected.find(item => item.due.id === value.feeDueId) ??
          fail(
            'MANUAL_ALLOCATION_DUE_MISMATCH',
            'Manual allocation targets an unselected Due.',
            400,
          );
        if (
          !Number.isInteger(value.amountPaise) ||
          value.amountPaise < 0 ||
          value.amountPaise > due.due.outstandingAmountPaise
        )
          fail(
            'INVALID_MANUAL_ALLOCATION',
            'Manual allocation must be non-negative and within Due outstanding.',
            400,
          );
      });
      if (
        new Set(input.manualAllocations.map(value => value.feeDueId)).size !==
        input.manualAllocations.length
      )
        fail(
          'DUPLICATE_MANUAL_ALLOCATION',
          'A Fee Due may appear only once in manual allocation.',
          400,
        );
      if (
        input.manualAllocations.reduce(
          (sum, value) => sum + value.amountPaise,
          0,
        ) > input.amountPaise
      )
        fail(
          'MANUAL_ALLOCATION_EXCEEDS_PAYMENT',
          'Manual allocations cannot exceed the Payment amount.',
          400,
        );
      const calculated = previewPaymentAllocations({
        allocationMode: input.allocationMode,
        amountPaise: input.amountPaise,
        asOfDate: input.asOfDate,
        dues: selected,
        manualAllocations: input.manualAllocations,
      });
      const advanceAmountPaise = input.storeExcessAsAdvance
        ? calculated.remainingAmountPaise
        : 0;
      const unexplainedAmountPaise = input.storeExcessAsAdvance
        ? 0
        : calculated.remainingAmountPaise;
      const now = '2026-07-31T12:00:00.000Z';
      const preview: PaymentAllocationPreview = {
        advanceAmountPaise,
        allocatedAmountPaise: calculated.allocatedAmountPaise,
        allocations: calculated.allocations,
        expiresAt: '2026-07-31T12:10:00.000Z',
        generatedAt: now,
        input: clone(input),
        isReconciled: reconcilePaymentAmounts(
          input.amountPaise,
          calculated.allocatedAmountPaise,
          advanceAmountPaise,
        ),
        paymentAmountPaise: input.amountPaise,
        previewId: `payment-preview-${++sequence}`,
        unexplainedAmountPaise,
      };
      previews.set(preview.previewId, clone(preview));
      activity('PAYMENT_PREVIEWED', {
        amountPaise: input.amountPaise,
        at: now,
        branchId: input.branchId,
        feeDueIds: input.feeDueIds,
        schoolId,
        studentId: input.studentId,
        userId: input.collectedByUserId,
      });
      return success(
        preview,
        'Payment allocation preview created without mutation.',
      );
    },
    async postPayment(schoolId, input) {
      await mockDelay(110);
      const duplicate = payments.find(
        item =>
          item.schoolId === schoolId &&
          item.idempotencyKey === input.idempotencyKey,
      );
      if (duplicate)
        return success(
          paymentResult(duplicate),
          'Existing idempotent Payment returned.',
        );
      const preview =
        previews.get(input.previewId) ??
        fail(
          'PAYMENT_PREVIEW_INVALID',
          'Payment preview is missing, expired, or already used.',
        );
      if (preview.input.schoolId !== schoolId || !preview.isReconciled)
        fail(
          'PAYMENT_NOT_RECONCILED',
          'Payment amount must reconcile to allocations plus Advance.',
        );
      context(
        schoolId,
        preview.input.branchId,
        preview.input.academicSessionId,
        true,
      );
      const expectedKey = `${schoolId}::${preview.input.studentId}::${preview.input.clientGeneratedRequestId}`;
      if (input.idempotencyKey !== expectedKey)
        fail(
          'PAYMENT_IDEMPOTENCY_KEY_INVALID',
          'Payment idempotency key is invalid.',
          400,
        );
      if (preview.input.simulateFailure)
        fail('PAYMENT_ATOMIC_FAILURE', 'Simulated atomic posting failure.');
      const now = '2026-07-31T12:01:00.000Z';
      const paymentId = `payment-${++sequence}`;
      const receiptId = `receipt-${++sequence}`;
      const enrollmentId = getMockFeeDueRepositorySnapshot().find(
        due => due.id === preview.allocations[0]?.feeDueId,
      )?.enrollmentId;
      let postedAllocations: PaymentAllocation[] = [];
      updateMockFeeDuesAtomically(working => {
        validatePreviewDues(preview, working);
        postedAllocations = preview.allocations.map(line => ({
          allocationOrder: line.allocationOrder,
          createdAt: now,
          feeAmountAppliedPaise: line.feeAmountAppliedPaise,
          feeDueId: line.feeDueId,
          fineAmountAppliedPaise: line.fineAmountAppliedPaise,
          id: `payment-allocation-${++sequence}`,
          paymentId,
          feeHeadNameSnapshot: line.feeHeadName,
          periodLabelSnapshot: line.periodLabel,
          resultingDueStatus: line.resultingStatus,
          schoolId,
          totalAppliedPaise: line.totalAppliedPaise,
        }));
        preview.allocations.forEach(line => {
          const due = working.find(item => item.id === line.feeDueId)!;
          due.paidAmountPaise += line.totalAppliedPaise;
          due.outstandingAmountPaise = calculateOutstandingAmount(due);
          due.status = recalculatePaidFeeDueStatus({
            asOfDate: preview.input.asOfDate,
            dueDate: due.dueDate,
            outstandingAmountPaise: due.outstandingAmountPaise,
            paidAmountPaise: due.paidAmountPaise,
            protectedStatus: due.status,
          });
          due.updatedAt = now;
        });
      });
      const paymentNumber = nextNumber(
        'PAY',
        preview.input.branchId,
        preview.input.academicSessionId,
      );
      const value: Payment = {
        academicSessionId: preview.input.academicSessionId,
        advanceAmountPaise: preview.advanceAmountPaise,
        allocatedAmountPaise: preview.allocatedAmountPaise,
        amountPaise: preview.input.amountPaise,
        bankName: preview.input.bankName,
        branchId: preview.input.branchId,
        chequeDate: preview.input.chequeDate,
        chequeNumber: preview.input.chequeNumber,
        collectedByName: preview.input.collectedByName,
        collectedByUserId: preview.input.collectedByUserId,
        createdAt: now,
        enrollmentId,
        id: paymentId,
        idempotencyKey: input.idempotencyKey,
        payerMobile: preview.input.payerMobile,
        payerName: preview.input.payerName,
        paymentDate: preview.input.paymentDate,
        paymentMode: preview.input.paymentMode,
        paymentNumber,
        receiptId,
        referenceNumber: preview.input.referenceNumber,
        remarks: preview.input.remarks,
        schoolId,
        status: 'POSTED',
        studentId: preview.input.studentId,
        updatedAt: now,
      };
      const profile = student(schoolId, value.studentId);
      const { branch, school } = context(
        schoolId,
        value.branchId,
        value.academicSessionId,
      );
      const snap = profileSnapshot(
        value.studentId,
        value.branchId,
        value.academicSessionId,
      );
      const receiptValue: Receipt = {
        academicSessionId: value.academicSessionId,
        advanceAmountPaise: value.advanceAmountPaise,
        allocatedAmountPaise: value.allocatedAmountPaise,
        allocationSnapshots: preview.allocations.map(line => ({
          dueDate: line.dueDate,
          feeAmountAppliedPaise: line.feeAmountAppliedPaise,
          feeDueId: line.feeDueId,
          feeHeadName: line.feeHeadName,
          fineAmountAppliedPaise: line.fineAmountAppliedPaise,
          periodLabel: line.periodLabel,
          resultingDueStatus: line.resultingStatus,
          totalAppliedPaise: line.totalAppliedPaise,
        })),
        branchId: value.branchId,
        branchSnapshot: {
          address: address(branch.address),
          code: branch.code,
          mobile: branch.mobile,
          name: branch.name,
        },
        collectedByName: value.collectedByName,
        createdAt: now,
        documentStatus: 'PREVIEW_READY',
        id: receiptId,
        issuedAt: now,
        payerSnapshot:
          value.payerName || value.payerMobile
            ? { mobile: value.payerMobile, name: value.payerName }
            : undefined,
        paymentAmountPaise: value.amountPaise,
        paymentId,
        paymentMode: value.paymentMode,
        paymentReference: value.referenceNumber ?? value.chequeNumber,
        receiptNumber: nextNumber(
          'REC',
          value.branchId,
          value.academicSessionId,
        ),
        schoolId,
        schoolSnapshot: {
          address: address(school.address),
          code: school.code,
          logoUrl: school.logoUrl,
          mobile: school.mobile,
          name: school.name,
        },
        status: 'ACTIVE',
        studentId: value.studentId,
        studentSnapshot: {
          admissionNumber: profile.admissionNumber,
          className: snap.className,
          name: profile.fullName,
          sectionName: snap.sectionName,
        },
      };
      let advanceEntry: StudentAdvanceCreditEntry | undefined;
      if (value.advanceAmountPaise > 0) {
        const current = calculateAdvanceBalance(
          advanceFor(schoolId, value.studentId),
        );
        advanceEntry = {
          branchId: value.branchId,
          createdAt: now,
          createdByUserId: input.requestedByUserId,
          creditAmountPaise: value.advanceAmountPaise,
          debitAmountPaise: 0,
          description: `Unapplied amount from ${paymentNumber}`,
          entryType: 'PAYMENT_CREDIT',
          id: `advance-entry-${++sequence}`,
          paymentId,
          runningBalancePaise: current + value.advanceAmountPaise,
          schoolId,
          studentId: value.studentId,
        };
      }
      const postedLedger: StudentLedgerEntry[] = [
        {
          academicSessionId: value.academicSessionId,
          branchId: value.branchId,
          createdAt: now,
          createdByUserId: input.requestedByUserId,
          creditPaise: 0,
          debitPaise: 0,
          description: `Payment posted · ${paymentNumber}`,
          effectiveDate: value.paymentDate,
          entryType: 'PAYMENT_POSTED',
          id: `ledger-payment-posted-${++sequence}`,
          paymentId,
          receiptId,
          runningBalancePaise: 0,
          schoolId,
          studentId: value.studentId,
        },
        ...postedAllocations.map(allocation => ({
          academicSessionId: value.academicSessionId,
          branchId: value.branchId,
          createdAt: now,
          createdByUserId: input.requestedByUserId,
          creditPaise: allocation.totalAppliedPaise,
          debitPaise: 0,
          description: `Allocation from ${paymentNumber}`,
          effectiveDate: value.paymentDate,
          entryType: 'PAYMENT_ALLOCATED' as const,
          feeDueId: allocation.feeDueId,
          id: `ledger-payment-${++sequence}`,
          paymentId,
          receiptId,
          runningBalancePaise: 0,
          schoolId,
          studentId: value.studentId,
        })),
      ];
      if (advanceEntry)
        postedLedger.push({
          academicSessionId: value.academicSessionId,
          advanceEntryId: advanceEntry.id,
          branchId: value.branchId,
          createdAt: now,
          createdByUserId: input.requestedByUserId,
          creditPaise: 0,
          debitPaise: 0,
          description: `Advance credited from ${paymentNumber}`,
          effectiveDate: value.paymentDate,
          entryType: 'ADVANCE_CREDITED',
          id: `ledger-advance-credit-${++sequence}`,
          paymentId,
          receiptId,
          runningBalancePaise: 0,
          schoolId,
          studentId: value.studentId,
        });
      payments.push(value);
      allocations.push(...postedAllocations);
      receipts.push(receiptValue);
      if (advanceEntry) advanceEntries.push(advanceEntry);
      ledgerEntries.push(...postedLedger);
      previews.delete(preview.previewId);
      activity('PAYMENT_POSTED', {
        amountPaise: value.amountPaise,
        at: now,
        branchId: value.branchId,
        feeDueIds: preview.input.feeDueIds,
        paymentId,
        receiptId,
        schoolId,
        studentId: value.studentId,
        userId: input.requestedByUserId,
      });
      if (postedAllocations.length)
        activity('PAYMENT_ALLOCATED', {
          amountPaise: value.allocatedAmountPaise,
          at: now,
          branchId: value.branchId,
          feeDueIds: postedAllocations.map(item => item.feeDueId),
          paymentId,
          receiptId,
          schoolId,
          studentId: value.studentId,
          userId: input.requestedByUserId,
        });
      if (advanceEntry)
        activity('ADVANCE_CREDIT_CREATED', {
          amountPaise: value.advanceAmountPaise,
          at: now,
          branchId: value.branchId,
          paymentId,
          receiptId,
          schoolId,
          studentId: value.studentId,
          userId: input.requestedByUserId,
        });
      activity('RECEIPT_CREATED', {
        amountPaise: value.amountPaise,
        at: now,
        branchId: value.branchId,
        paymentId,
        receiptId,
        schoolId,
        studentId: value.studentId,
        userId: input.requestedByUserId,
      });
      return success(
        {
          advanceEntry,
          allocations: postedAllocations,
          payment: value,
          receipt: receiptValue,
        },
        'Payment posted atomically and Receipt created.',
      );
    },
    async getPayments(schoolId, query) {
      await mockDelay(70);
      const search = query.search?.toLowerCase().trim();
      const items = payments
        .filter(item => item.schoolId === schoolId)
        .filter(
          item =>
            !query.branchId ||
            query.branchId === 'ALL' ||
            item.branchId === query.branchId,
        )
        .filter(
          item =>
            !query.academicSessionId ||
            query.academicSessionId === 'ALL' ||
            item.academicSessionId === query.academicSessionId,
        )
        .filter(
          item =>
            !query.paymentMode ||
            query.paymentMode === 'ALL' ||
            item.paymentMode === query.paymentMode,
        )
        .filter(
          item =>
            !query.status ||
            query.status === 'ALL' ||
            item.status === query.status,
        )
        .filter(item => !query.dateFrom || item.paymentDate >= query.dateFrom)
        .filter(item => !query.dateTo || item.paymentDate <= query.dateTo)
        .filter(
          item =>
            !query.collectedByUserId ||
            item.collectedByUserId === query.collectedByUserId,
        )
        .map(paymentListItem)
        .filter(
          item =>
            !search ||
            [
              item.studentName,
              item.admissionNumber,
              item.payment.paymentNumber,
              item.receiptNumber,
              item.payment.referenceNumber,
            ].some(value => value?.toLowerCase().includes(search)),
        )
        .sort((a, b) => b.payment.createdAt.localeCompare(a.payment.createdAt));
      return success(paginate(items, query.page, query.pageSize));
    },
    async getPayment(schoolId, paymentId) {
      await mockDelay(60);
      return success(paymentDetails(schoolId, paymentId));
    },
    async reversePayment(schoolId, paymentId, input) {
      await mockDelay(100);
      const value = payment(schoolId, paymentId);
      context(schoolId, value.branchId, value.academicSessionId, true);
      if (value.status === 'REVERSED')
        fail('PAYMENT_ALREADY_REVERSED', 'Payment was already reversed.');
      if (!input.reason.trim())
        fail(
          'PAYMENT_REVERSAL_REASON_REQUIRED',
          'Reversal reason is required.',
          400,
        );
      if (
        advanceEntries.some(
          item =>
            item.paymentId === value.id && item.entryType === 'DUE_APPLICATION',
        )
      )
        fail(
          'PAYMENT_ADVANCE_ALREADY_CONSUMED',
          'Advance created by this Payment was consumed and blocks reversal.',
        );
      const related = allocations.filter(item => item.paymentId === value.id);
      const now = '2026-07-31T13:00:00.000Z';
      updateMockFeeDuesAtomically(working => {
        related.forEach(allocation => {
          const due =
            working.find(
              item =>
                item.id === allocation.feeDueId && item.schoolId === schoolId,
            ) ??
            fail(
              'PAYMENT_REVERSAL_DUE_MISSING',
              'An allocated Fee Due is unavailable.',
            );
          due.paidAmountPaise = Math.max(
            0,
            due.paidAmountPaise - allocation.totalAppliedPaise,
          );
          due.outstandingAmountPaise = calculateOutstandingAmount(due);
          due.status = recalculatePaidFeeDueStatus({
            asOfDate: input.asOfDate,
            dueDate: due.dueDate,
            outstandingAmountPaise: due.outstandingAmountPaise,
            paidAmountPaise: due.paidAmountPaise,
            protectedStatus:
              due.status === 'PAID' || due.status === 'PARTIALLY_PAID'
                ? undefined
                : due.status,
          });
          due.updatedAt = now;
        });
      });
      value.status = 'REVERSED';
      value.reversedAt = now;
      value.reversedByUserId = input.reversedByUserId;
      value.reversalReason = input.reason.trim();
      value.updatedAt = now;
      const receiptValue = receipts.find(item => item.paymentId === value.id)!;
      receiptValue.status = 'CANCELLED';
      receiptValue.cancelledAt = now;
      receiptValue.cancellationReason = input.reason.trim();
      const reversal: PaymentReversal = {
        amountPaise: value.amountPaise,
        id: `reversal-${++sequence}`,
        paymentId: value.id,
        reason: input.reason.trim(),
        reversalNumber: nextNumber(
          'REV',
          value.branchId,
          value.academicSessionId,
        ),
        reversedAt: now,
        reversedByName: input.reversedByName,
        reversedByUserId: input.reversedByUserId,
        schoolId,
      };
      reversals.push(reversal);
      if (value.advanceAmountPaise > 0) {
        const balance = calculateAdvanceBalance(
          advanceFor(schoolId, value.studentId),
        );
        advanceEntries.push({
          branchId: value.branchId,
          createdAt: now,
          createdByUserId: input.reversedByUserId,
          creditAmountPaise: 0,
          debitAmountPaise: value.advanceAmountPaise,
          description: `Reversal of Advance from ${value.paymentNumber}`,
          entryType: 'REVERSAL',
          id: `advance-reversal-${++sequence}`,
          paymentId: value.id,
          runningBalancePaise: Math.max(0, balance - value.advanceAmountPaise),
          schoolId,
          studentId: value.studentId,
        });
      }
      ledgerEntries.push(
        ...related.map(item => ({
          academicSessionId: value.academicSessionId,
          branchId: value.branchId,
          createdAt: now,
          createdByUserId: input.reversedByUserId,
          creditPaise: 0,
          debitPaise: item.totalAppliedPaise,
          description: `Reversal of ${value.paymentNumber}`,
          effectiveDate: input.asOfDate,
          entryType: 'PAYMENT_REVERSED' as const,
          feeDueId: item.feeDueId,
          id: `ledger-reversal-${++sequence}`,
          paymentId: value.id,
          receiptId: receiptValue.id,
          runningBalancePaise: 0,
          schoolId,
          studentId: value.studentId,
        })),
      );
      activity('PAYMENT_REVERSED', {
        amountPaise: value.amountPaise,
        at: now,
        branchId: value.branchId,
        feeDueIds: related.map(item => item.feeDueId),
        paymentId: value.id,
        receiptId: receiptValue.id,
        schoolId,
        studentId: value.studentId,
        userId: input.reversedByUserId,
      });
      activity('RECEIPT_CANCELLED', {
        at: now,
        branchId: value.branchId,
        paymentId: value.id,
        receiptId: receiptValue.id,
        schoolId,
        studentId: value.studentId,
        userId: input.reversedByUserId,
      });
      return success(
        {
          affectedFeeDueIds: related.map(item => item.feeDueId),
          payment: value,
          receipt: receiptValue,
          reversal,
        },
        'Payment fully reversed and Receipt cancelled.',
      );
    },
    async getReceipts(schoolId, query) {
      await mockDelay(70);
      const search = query.search?.toLowerCase().trim();
      const items = receipts
        .filter(item => item.schoolId === schoolId)
        .filter(
          item =>
            !query.branchId ||
            query.branchId === 'ALL' ||
            item.branchId === query.branchId,
        )
        .filter(
          item =>
            !query.paymentMode ||
            query.paymentMode === 'ALL' ||
            item.paymentMode === query.paymentMode,
        )
        .filter(
          item =>
            !query.status ||
            query.status === 'ALL' ||
            item.status === query.status,
        )
        .filter(
          item =>
            !query.dateFrom || item.issuedAt.slice(0, 10) >= query.dateFrom,
        )
        .filter(
          item => !query.dateTo || item.issuedAt.slice(0, 10) <= query.dateTo,
        )
        .map(receiptListItem)
        .filter(
          item =>
            !search ||
            [
              item.studentName,
              item.admissionNumber,
              item.receipt.receiptNumber,
              item.paymentNumber,
            ].some(value => value.toLowerCase().includes(search)),
        )
        .sort((a, b) => b.receipt.issuedAt.localeCompare(a.receipt.issuedAt));
      return success(paginate(items, query.page, query.pageSize));
    },
    async getReceipt(schoolId, receiptId) {
      await mockDelay(60);
      return success(receiptDetails(schoolId, receiptId));
    },
    async getReceiptDocument(schoolId, receiptId) {
      await mockDelay(40);
      const value = receipt(schoolId, receiptId);
      const response = await receiptDocumentService.getDocument(
        schoolId,
        receiptId,
      );
      activity('RECEIPT_DOCUMENT_REQUESTED', {
        at: '2026-07-31T14:00:00.000Z',
        branchId: value.branchId,
        paymentId: value.paymentId,
        receiptId,
        schoolId,
        studentId: value.studentId,
        userId: payment(schoolId, value.paymentId).collectedByUserId,
      });
      return response;
    },
    async getStudentLedger(schoolId, studentId, query = {}) {
      await mockDelay(70);
      const profile = student(schoolId, studentId);
      const dues = getMockFeeDueRepositorySnapshot().filter(
        item => item.schoolId === schoolId && item.studentId === studentId,
      );
      let entries = withLedgerRunningBalances([
        ...baseLedger(schoolId, studentId),
        ...ledgerEntries.filter(
          item => item.schoolId === schoolId && item.studentId === studentId,
        ),
      ])
        .filter(
          item =>
            !query.branchId ||
            query.branchId === 'ALL' ||
            item.branchId === query.branchId,
        )
        .filter(
          item =>
            !query.academicSessionId ||
            query.academicSessionId === 'ALL' ||
            item.academicSessionId === query.academicSessionId,
        )
        .filter(
          item =>
            !query.entryType ||
            query.entryType === 'ALL' ||
            item.entryType === query.entryType,
        )
        .filter(
          item =>
            !query.feeHeadId ||
            query.feeHeadId === 'ALL' ||
            item.feeHeadId === query.feeHeadId,
        )
        .filter(item => !query.dateFrom || item.effectiveDate >= query.dateFrom)
        .filter(item => !query.dateTo || item.effectiveDate <= query.dateTo);
      entries = withLedgerRunningBalances(entries);
      const outstandingComponents = dues.reduce(
        (summary, item) => {
          if (item.status === 'WAIVED' || item.status === 'CANCELLED')
            return summary;
          const effectiveFine = Math.max(
            0,
            item.fineAmountPaise - item.fineWaivedAmountPaise,
          );
          const finePaid = Math.min(item.paidAmountPaise, effectiveFine);
          const feePaid = Math.max(0, item.paidAmountPaise - finePaid);
          summary.fine += Math.max(0, effectiveFine - finePaid);
          summary.fee += Math.max(0, item.netFeeAmountPaise - feePaid);
          return summary;
        },
        { fee: 0, fine: 0 },
      );
      const feeOutstandingPaise = outstandingComponents.fee;
      const fineOutstandingPaise = outstandingComponents.fine;
      const advanceBalancePaise = calculateAdvanceBalance(
        advanceFor(schoolId, studentId),
      );
      return success({
        admissionNumber: profile.admissionNumber,
        advanceBalancePaise,
        entries,
        feeOutstandingPaise,
        fineOutstandingPaise,
        netFinancialPositionPaise:
          feeOutstandingPaise + fineOutstandingPaise - advanceBalancePaise,
        studentId,
        studentName: profile.fullName,
      });
    },
    async getStudentAdvanceCredits(schoolId, studentId) {
      await mockDelay(60);
      const profile = student(schoolId, studentId);
      const entries = advanceFor(schoolId, studentId);
      return success({
        admissionNumber: profile.admissionNumber,
        availableBalancePaise: calculateAdvanceBalance(entries),
        entries,
        studentId,
        studentName: profile.fullName,
      });
    },
    async previewAdvanceApplication(schoolId, studentId, input) {
      await mockDelay(80);
      context(schoolId, input.branchId, input.academicSessionId, true);
      student(schoolId, studentId);
      const balance = calculateAdvanceBalance(advanceFor(schoolId, studentId));
      if (balance <= 0)
        fail(
          'ADVANCE_BALANCE_EMPTY',
          'Student has no available Advance Credit.',
        );
      const available = currentDues(
        schoolId,
        studentId,
        input.asOfDate,
        input.branchId,
        input.academicSessionId,
      );
      const selected = input.feeDueIds.map(
        id =>
          available.find(item => item.due.id === id) ??
          fail(
            'ADVANCE_DUE_CONTEXT_MISMATCH',
            'A selected Fee Due is not eligible for this Student.',
          ),
      );
      const calculated = previewPaymentAllocations({
        allocationMode: 'OLDEST_DUE_FIRST',
        amountPaise: balance,
        asOfDate: input.asOfDate,
        dues: selected,
      });
      const preview: AdvanceApplicationPreview = {
        allocations: calculated.allocations,
        amountToApplyPaise: calculated.allocatedAmountPaise,
        availableBalancePaise: balance,
        input: clone(input),
        previewId: `advance-preview-${++sequence}`,
        remainingBalancePaise: balance - calculated.allocatedAmountPaise,
        studentId,
      };
      advancePreviews.set(preview.previewId, clone(preview));
      return success(
        preview,
        'Advance application preview created without mutation.',
      );
    },
    async applyAdvanceCredit(schoolId, studentId, input) {
      await mockDelay(100);
      const preview =
        advancePreviews.get(input.previewId) ??
        fail(
          'ADVANCE_PREVIEW_INVALID',
          'Advance preview is missing or already used.',
        );
      if (preview.studentId !== studentId)
        fail(
          'ADVANCE_STUDENT_MISMATCH',
          'Advance preview belongs to another Student.',
        );
      context(
        schoolId,
        preview.input.branchId,
        preview.input.academicSessionId,
        true,
      );
      const now = '2026-07-31T15:00:00.000Z';
      const lots = advanceEntries
        .filter(
          item =>
            item.schoolId === schoolId &&
            item.studentId === studentId &&
            item.entryType === 'PAYMENT_CREDIT' &&
            item.paymentId,
        )
        .map(item => ({
          entry: item,
          remaining:
            item.creditAmountPaise -
            advanceEntries
              .filter(
                value =>
                  value.paymentId === item.paymentId &&
                  ['DUE_APPLICATION', 'REVERSAL'].includes(value.entryType),
              )
              .reduce((sum, value) => sum + value.debitAmountPaise, 0),
        }))
        .filter(item => item.remaining > 0)
        .sort((a, b) => a.entry.createdAt.localeCompare(b.entry.createdAt));
      if (
        lots.reduce((sum, item) => sum + item.remaining, 0) <
        preview.amountToApplyPaise
      )
        fail(
          'ADVANCE_BALANCE_CHANGED',
          'Advance Credit balance changed after preview.',
        );
      updateMockFeeDuesAtomically(working => {
        preview.allocations.forEach(line => {
          const due =
            working.find(
              item =>
                item.id === line.feeDueId &&
                item.schoolId === schoolId &&
                item.studentId === studentId,
            ) ??
            fail(
              'ADVANCE_DUE_CONTEXT_MISMATCH',
              'Fee Due changed after preview.',
            );
          if (calculateOutstandingAmount(due) < line.totalAppliedPaise)
            fail(
              'ADVANCE_ALLOCATION_EXCEEDS_DUE',
              'Advance allocation exceeds Due outstanding.',
            );
          due.paidAmountPaise += line.totalAppliedPaise;
          due.outstandingAmountPaise = calculateOutstandingAmount(due);
          due.status = recalculatePaidFeeDueStatus({
            asOfDate: preview.input.asOfDate,
            dueDate: due.dueDate,
            outstandingAmountPaise: due.outstandingAmountPaise,
            paidAmountPaise: due.paidAmountPaise,
            protectedStatus: due.status,
          });
          due.updatedAt = now;
        });
      });
      const entries: StudentAdvanceCreditEntry[] = [];
      const applied: AdvanceAllocation[] = [];
      let running = preview.availableBalancePaise;
      preview.allocations.forEach(line => {
        let remaining = line.totalAppliedPaise;
        let remainingFine = line.fineAmountAppliedPaise;
        let remainingFee = line.feeAmountAppliedPaise;
        while (remaining > 0) {
          const lot = lots.find(item => item.remaining > 0)!;
          const amount = Math.min(remaining, lot.remaining);
          const fineAmountAppliedPaise = Math.min(amount, remainingFine);
          const feeAmountAppliedPaise = Math.min(
            amount - fineAmountAppliedPaise,
            remainingFee,
          );
          const entry: StudentAdvanceCreditEntry = {
            branchId: preview.input.branchId,
            createdAt: now,
            createdByUserId: input.requestedByUserId,
            creditAmountPaise: 0,
            debitAmountPaise: amount,
            description: `Advance applied to ${line.feeHeadName} · ${line.periodLabel}`,
            entryType: 'DUE_APPLICATION',
            feeDueId: line.feeDueId,
            id: `advance-application-${++sequence}`,
            paymentId: lot.entry.paymentId,
            runningBalancePaise: (running -= amount),
            schoolId,
            studentId,
          };
          entries.push(entry);
          applied.push({
            advanceEntryId: entry.id,
            createdAt: now,
            feeAmountAppliedPaise,
            feeDueId: line.feeDueId,
            fineAmountAppliedPaise,
            id: `advance-allocation-${++sequence}`,
            schoolId,
            studentId,
            totalAppliedPaise: amount,
          });
          lot.remaining -= amount;
          remaining -= amount;
          remainingFine -= fineAmountAppliedPaise;
          remainingFee -= feeAmountAppliedPaise;
        }
        ledgerEntries.push({
          academicSessionId: preview.input.academicSessionId,
          branchId: preview.input.branchId,
          createdAt: now,
          createdByUserId: input.requestedByUserId,
          creditPaise: line.totalAppliedPaise,
          debitPaise: 0,
          description: `Advance applied to ${line.feeHeadName}`,
          effectiveDate: preview.input.asOfDate,
          entryType: 'ADVANCE_APPLIED',
          feeDueId: line.feeDueId,
          id: `ledger-advance-${++sequence}`,
          runningBalancePaise: 0,
          schoolId,
          studentId,
        });
      });
      advanceEntries.push(...entries);
      advanceAllocations.push(...applied);
      advancePreviews.delete(preview.previewId);
      activity('ADVANCE_CREDIT_APPLIED', {
        amountPaise: preview.amountToApplyPaise,
        at: now,
        branchId: preview.input.branchId,
        feeDueIds: preview.input.feeDueIds,
        schoolId,
        studentId,
        userId: input.requestedByUserId,
      });
      return success(
        {
          allocations: applied,
          appliedAmountPaise: preview.amountToApplyPaise,
          entries,
          remainingBalancePaise: preview.remainingBalancePaise,
        },
        'Advance Credit applied atomically.',
      );
    },
    async getDailyCollection(schoolId, branchId, date) {
      await mockDelay(60);
      context(schoolId, branchId);
      return success(
        aggregateDailyCollection({
          branchId,
          date,
          payments,
          reversals,
          schoolId,
        }),
      );
    },
    async getParentReceipts(schoolId, parentMembershipId, studentId) {
      await mockDelay(60);
      const linked = INITIAL_PARENT_STUDENT_LINKS.filter(
        item =>
          item.schoolId === schoolId &&
          item.parentMembershipId === parentMembershipId &&
          item.status === 'ACTIVE',
      ).map(item => item.studentId);
      if (!linked.length)
        fail(
          'PARENT_RECEIPT_ACCESS_DENIED',
          'Active Parent membership links are required.',
          403,
        );
      if (studentId && !linked.includes(studentId))
        fail(
          'PARENT_RECEIPT_OWNERSHIP_DENIED',
          'Student is not linked to this Parent.',
          403,
        );
      return success(
        receipts
          .filter(
            item =>
              item.schoolId === schoolId &&
              linked.includes(item.studentId) &&
              (!studentId || item.studentId === studentId),
          )
          .map(receiptListItem),
      );
    },
    async getParentReceipt(schoolId, parentMembershipId, receiptId) {
      await mockDelay(60);
      const value = receipt(schoolId, receiptId);
      const linked = INITIAL_PARENT_STUDENT_LINKS.some(
        item =>
          item.schoolId === schoolId &&
          item.parentMembershipId === parentMembershipId &&
          item.studentId === value.studentId &&
          item.status === 'ACTIVE',
      );
      if (!linked)
        fail(
          'PARENT_RECEIPT_OWNERSHIP_DENIED',
          'Receipt does not belong to a linked child.',
          403,
        );
      return success(selfServiceReceiptDetails(schoolId, receiptId));
    },
    async getStudentSelfReceipts(schoolId, studentMembershipId) {
      await mockDelay(60);
      const membership = Object.values(SCHOOL_AUTH_FIXTURES)
        .flatMap(item => item.memberships)
        .find(
          item =>
            item.id === studentMembershipId &&
            item.schoolId === schoolId &&
            item.role === 'STUDENT' &&
            item.status === 'ACTIVE',
        );
      if (!membership?.studentId)
        fail(
          'STUDENT_RECEIPT_ACCESS_DENIED',
          'Active Student membership is required.',
          403,
        );
      return success(
        receipts
          .filter(
            item =>
              item.schoolId === schoolId &&
              item.studentId === membership.studentId,
          )
          .map(receiptListItem),
      );
    },
    async getStudentSelfReceipt(schoolId, studentMembershipId, receiptId) {
      await mockDelay(60);
      const value = receipt(schoolId, receiptId);
      const membership = Object.values(SCHOOL_AUTH_FIXTURES)
        .flatMap(item => item.memberships)
        .find(
          item =>
            item.id === studentMembershipId &&
            item.schoolId === schoolId &&
            item.role === 'STUDENT' &&
            item.status === 'ACTIVE' &&
            item.studentId === value.studentId,
        );
      if (!membership)
        fail(
          'STUDENT_RECEIPT_OWNERSHIP_DENIED',
          'Receipt does not belong to this Student membership.',
          403,
        );
      return success(selfServiceReceiptDetails(schoolId, receiptId));
    },
  };
}

resetMockCollectionData();
export const mockCollectionService = createMockCollectionService();
