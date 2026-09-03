import { apiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CancelFeeDueInput,
  FeeDue,
  FeeDueDetails,
  FeeDueListItem,
  FeeDueListQuery,
  FeeGenerationPreview,
  FeeGenerationResult,
  FeeGenerationRun,
  FeeOutstandingSummary,
  FineCalculationResult,
  FineRefreshResult,
  GenerationHistoryQuery,
  StudentFeeDueQuery,
  StudentFeeDueSummary,
  WaiveFeeDueInput,
  WaiveFineInput,
  BulkRefreshFinesInput,
} from '../../models/feeDue';
import type { FeeDueService } from './feeDueService';

// ---- Backend response shapes ------------------------------------------------

interface BackendInvoiceItem {
  id: number;
  fee_head: number;
  fee_head_name: string;
  amount: string;
}

interface BackendInvoice {
  id: number;
  student: number;
  branch: number;
  title: string;
  month: number | null;
  year: number | null;
  due_date: string;
  total_amount: string;
  discount: string;
  fine: string;
  paid_amount: string;
  payable_amount: string;
  balance_due: string;
  status: string;
  items: BackendInvoiceItem[];
  created_at: string;
}

// ---- Helpers ----------------------------------------------------------------

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_MAP: Record<string, FeeDue['status']> = {
  pending: 'PENDING',
  partial: 'PARTIALLY_PAID',
  paid: 'PAID',
  overdue: 'OVERDUE',
  cancelled: 'CANCELLED',
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
    message: `${operation} is not available in this version. Please contact support.`,
    status: 501,
  });
}

// ---- Mapping: BackendInvoice → FeeDue ---------------------------------------

function mapInvoiceToFeeDue(inv: BackendInvoice): FeeDue {
  const isMonthly = inv.month !== null && inv.month !== undefined;
  const firstItem = inv.items?.[0];

  const periodLabel = isMonthly
    ? `${MONTH_ABBR[(inv.month ?? 1) - 1]} ${inv.year}`
    : inv.title;
  const periodKey = isMonthly
    ? `${inv.year}-${String(inv.month).padStart(2, '0')}`
    : `OT-${inv.id}`;

  const netPaise = toPaise(inv.total_amount);
  const discountPaise = toPaise(inv.discount);
  const finePaise = toPaise(inv.fine);
  const paidPaise = toPaise(inv.paid_amount);
  const outstandingPaise = toPaise(inv.balance_due);

  return {
    id: String(inv.id),
    schoolId: String(inv.branch),
    branchId: String(inv.branch),
    academicSessionId: '',
    studentId: String(inv.student),
    enrollmentId: String(inv.student),
    feeAssignmentId: String(firstItem?.id ?? inv.id),
    feeStructureId: String(firstItem?.fee_head ?? inv.id),
    feeStructureItemId: String(firstItem?.id ?? inv.id),
    feeHeadId: String(firstItem?.fee_head ?? inv.id),
    feeHeadNameSnapshot: firstItem?.fee_head_name ?? inv.title,
    feeHeadCodeSnapshot: '',
    studentNameSnapshot: '',
    admissionNumberSnapshot: '',
    branchNameSnapshot: '',
    classNameSnapshot: '',
    sectionNameSnapshot: '',
    periodType: isMonthly ? 'MONTH' : 'ONE_TIME',
    periodKey,
    periodLabel,
    frequencySnapshot: isMonthly ? 'MONTHLY' : 'ONE_TIME',
    dueDate: inv.due_date,
    baseAmountPaise: netPaise,
    overrideAmountPaise: 0,
    exemptionAmountPaise: 0,
    discountAmountPaise: discountPaise,
    netFeeAmountPaise: netPaise - discountPaise,
    fineAmountPaise: finePaise,
    fineWaivedAmountPaise: 0,
    paidAmountPaise: paidPaise,
    outstandingAmountPaise: outstandingPaise,
    status: STATUS_MAP[inv.status] ?? 'PENDING',
    calculationSnapshot: {
      feeStructureName: '',
      feeStructureItemId: String(firstItem?.id ?? inv.id),
      frequency: isMonthly ? 'MONTHLY' : 'ONE_TIME',
      dueRule: { type: 'FIXED_DATE', date: inv.due_date },
      applicability: 'ALL',
      mandatory: true,
      selected: true,
      overrideType: 'DEFAULT_AMOUNT',
      discountNames: [],
      generatedAsOfDate: inv.created_at.slice(0, 10),
      warnings: [],
    },
    generatedByRunId: String(inv.id),
    generatedAt: inv.created_at,
    createdAt: inv.created_at,
    updatedAt: inv.created_at,
  };
}

function buildStudentSummary(studentId: string, invoices: BackendInvoice[]): StudentFeeDueSummary {
  let pendingPaise = 0;
  let overduePaise = 0;
  let finePaise = 0;
  let totalGenPaise = 0;
  let cancelledPaise = 0;

  const dues: FeeDueListItem[] = invoices.map(inv => {
    const balancePaise = toPaise(inv.balance_due);
    const status = STATUS_MAP[inv.status] ?? 'PENDING';
    const netPaise = toPaise(inv.total_amount);
    totalGenPaise += netPaise;

    if (status === 'PENDING') pendingPaise += balancePaise;
    else if (status === 'OVERDUE') overduePaise += balancePaise;
    else if (status === 'CANCELLED') cancelledPaise += netPaise;

    finePaise += toPaise(inv.fine);

    const daysOverdue = status === 'OVERDUE' || status === 'PENDING'
      ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000))
      : 0;

    return {
      due: mapInvoiceToFeeDue(inv),
      guardianMobile: '',
      daysOverdue,
    };
  });

  return {
    studentId,
    studentName: '',
    admissionNumber: '',
    upcomingAmountPaise: 0,
    pendingAmountPaise: pendingPaise,
    overdueAmountPaise: overduePaise,
    accruedFinePaise: finePaise,
    totalGeneratedPaise: totalGenPaise,
    totalOutstandingPaise: pendingPaise + overduePaise,
    waivedAmountPaise: 0,
    cancelledAmountPaise: cancelledPaise,
    dues,
  };
}

// ---- API fetch helpers -------------------------------------------------------

type QueryParams = Record<string, string | number | undefined>;

/** True when the backend does not (yet) expose an endpoint. */
function isMissingEndpoint(error: unknown): boolean {
  return error instanceof ApiClientError && (error.status === 404 || error.status === 405);
}

interface BackendOutstandingSummary {
  upcoming: string;
  pending: string;
  overdue: string;
  accrued_fine: string;
  total_outstanding: string;
  students_with_outstanding: number;
  unassigned_eligible_students: number;
  as_of_date: string;
}

interface BackendGenerationPreviewItem {
  student: number;
  student_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  branch: number;
  period_key: string;
  period_label: string;
  due_date: string;
  amount: string;
  status: 'NEW' | 'EXISTING' | 'SKIPPED';
  reason: string | null;
  fee_heads: Array<{ fee_head: number; fee_head_name: string; amount: string }>;
}

interface BackendGenerationPreview {
  generated_at: string;
  period_key: string;
  period_label: string;
  due_date: string;
  total_students: number;
  eligible_students: number;
  new_count: number;
  existing_count: number;
  skipped_count: number;
  total_amount: string;
  items: BackendGenerationPreviewItem[];
}

async function fetchInvoices(query: QueryParams = {}): Promise<BackendInvoice[]> {
  const raw = await apiClient.get<unknown>('/fees/invoices/', { query });
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'invoices' in raw &&
    Array.isArray((raw as Record<string, unknown>).invoices)
  ) {
    return (raw as Record<string, unknown>).invoices as BackendInvoice[];
  }
  return [];
}

async function fetchInvoice(id: string): Promise<BackendInvoice> {
  const raw = await apiClient.get<unknown>(`/fees/invoices/${id}/`);
  return (raw as Record<string, unknown>).invoice as BackendInvoice;
}

// ---- Service implementation -------------------------------------------------

export const apiFeeDueService: FeeDueService = {
  async getOutstandingSummary(_schoolId, branchId, _sessionId, asOfDate) {
    // Preferred path: the server aggregates every bucket, including the
    // upcoming split and the unbilled-student count that cannot be derived
    // from the invoice list alone.
    try {
      const raw = await apiClient.get<unknown>('/reports/fee-outstanding/', {
        query: { as_of_date: asOfDate, branch: branchId },
      });
      const data = raw as unknown as BackendOutstandingSummary;
      return success({
        upcomingAmountPaise: toPaise(data.upcoming),
        pendingAmountPaise: toPaise(data.pending),
        overdueAmountPaise: toPaise(data.overdue),
        accruedFinePaise: toPaise(data.accrued_fine),
        totalOutstandingPaise: toPaise(data.total_outstanding),
        studentsWithOutstanding: data.students_with_outstanding ?? 0,
        unassignedEligibleStudents: data.unassigned_eligible_students ?? 0,
        asOfDate: data.as_of_date ?? asOfDate,
      } satisfies FeeOutstandingSummary);
    } catch (error) {
      if (!isMissingEndpoint(error)) throw error;
    }

    // Fallback for servers predating /reports/fee-outstanding/: derive what
    // the invoice list supports and leave the rest at zero.
    const invoices = await fetchInvoices();
    const bucket = (predicate: (invoice: BackendInvoice) => boolean) =>
      invoices.filter(predicate).reduce((sum, i) => sum + toPaise(i.balance_due), 0);
    const upcoming = bucket(i => i.due_date > asOfDate && toPaise(i.balance_due) > 0);
    const pending = bucket(i => i.due_date === asOfDate && toPaise(i.balance_due) > 0);
    const overdue = bucket(i => i.due_date < asOfDate && toPaise(i.balance_due) > 0);
    const fine = invoices.reduce((sum, i) => sum + toPaise(i.fine), 0);
    const studentsWithBalance = new Set(
      invoices.filter(i => toPaise(i.balance_due) > 0).map(i => i.student),
    ).size;

    const summary: FeeOutstandingSummary = {
      upcomingAmountPaise: upcoming,
      pendingAmountPaise: pending,
      overdueAmountPaise: overdue,
      accruedFinePaise: fine,
      totalOutstandingPaise: pending + overdue,
      studentsWithOutstanding: studentsWithBalance,
      unassignedEligibleStudents: 0,
      asOfDate,
    };
    return success(summary);
  },

  async previewFeeGeneration(_schoolId, input) {
    const base = {
      previewId: `preview-${Date.now()}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      context: {
        schoolId: input.schoolId,
        branchId: input.branchId,
        academicSessionId: input.academicSessionId,
        asOfDate: input.asOfDate,
      },
      input,
      generatedAt: new Date().toISOString(),
    };

    // Preferred path: the server dry-runs the exact generation logic, so the
    // figures a user approves are the figures they get on commit.
    try {
      const raw = await apiClient.post<unknown>(
        '/fees/generate-monthly/preview/',
        { branch: Number(input.branchId) || undefined },
      );
      const data = raw as unknown as BackendGenerationPreview;
      const items = (data.items ?? []).map(item => ({
        idempotencyKey: `${item.student}-${item.period_key}`,
        studentId: String(item.student),
        enrollmentId: String(item.student),
        studentName: item.student_name,
        admissionNumber: item.admission_number,
        className: item.class_name,
        sectionName: item.section_name,
        feeHeadName: item.fee_heads.map(head => head.fee_head_name).join(', '),
        periodKey: item.period_key,
        periodLabel: item.period_label,
        dueDate: item.due_date,
        baseAmountPaise: toPaise(item.amount),
        discountAmountPaise: 0,
        netAmountPaise: toPaise(item.amount),
        status: item.status,
        reason: item.reason ?? undefined,
      }));

      const preview: FeeGenerationPreview = {
        ...base,
        generatedAt: data.generated_at ?? base.generatedAt,
        requestedPeriods: [{ key: data.period_key, label: data.period_label }],
        totalStudents: data.total_students ?? 0,
        eligibleStudents: data.eligible_students ?? 0,
        candidateDueCount: (data.new_count ?? 0) + (data.existing_count ?? 0),
        totalAmountPaise: toPaise(data.total_amount),
        newDueCount: data.new_count ?? 0,
        existingDueCount: data.existing_count ?? 0,
        skippedCount: data.skipped_count ?? 0,
        errorCount: 0,
        items,
        warnings: [],
      };
      return success(preview, 'Preview ready. Confirm to generate monthly fees.');
    } catch (error) {
      if (!isMissingEndpoint(error)) throw error;
    }

    // Fallback for servers predating the preview endpoint: the commit step
    // still works, but the totals cannot be shown in advance.
    const preview: FeeGenerationPreview = {
      ...base,
      requestedPeriods: [],
      totalStudents: 0,
      eligibleStudents: 0,
      candidateDueCount: 0,
      totalAmountPaise: 0,
      newDueCount: 0,
      existingDueCount: 0,
      skippedCount: 0,
      errorCount: 0,
      items: [],
      warnings: [
        {
          code: 'PREVIEW_UNAVAILABLE',
          count: 1,
          message:
            'This server cannot preview generation. Totals will only be known after generating.',
        },
      ],
    };
    return success(preview, 'Preview unavailable on this server.');
  },

  async commitFeeGeneration(_schoolId, _input) {
    const raw = await apiClient.post<unknown>('/fees/generate-monthly/', {});
    const data = raw as Record<string, unknown>;
    const created = typeof data.created === 'number' ? data.created : 0;
    const skipped = typeof data.skipped === 'number' ? data.skipped : 0;

    const result: FeeGenerationResult = {
      generationRunId: String(Date.now()),
      status: 'COMPLETED',
      createdCount: created,
      existingCount: skipped,
      skippedCount: skipped,
      failedCount: 0,
      totalGeneratedAmountPaise: 0,
      items: [],
    };
    return success(result, `Generated ${created} fee invoice(s). Skipped ${skipped} already-existing.`);
  },

  async getGenerationHistory(_schoolId, _query: GenerationHistoryQuery) {
    return success(paginate<FeeGenerationRun>([]));
  },

  async getGenerationRun(_schoolId, _id) {
    notSupported('getGenerationRun');
  },

  async getFeeDues(_schoolId, query: FeeDueListQuery) {
    const params: QueryParams = {};
    if (query.status && query.status !== 'ALL') {
      const reverseMap: Record<string, string> = {
        PENDING: 'pending',
        PARTIALLY_PAID: 'partial',
        PAID: 'paid',
        OVERDUE: 'overdue',
        CANCELLED: 'cancelled',
      };
      if (typeof query.status === 'string') {
        params.status = reverseMap[query.status];
      }
    }

    const invoices = await fetchInvoices(params);
    const items: FeeDueListItem[] = invoices.map(inv => {
      const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000));
      return {
        due: mapInvoiceToFeeDue(inv),
        guardianMobile: '',
        daysOverdue,
      };
    });

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const sliced = items.slice(start, start + pageSize);

    return success({
      items: sliced,
      page,
      pageSize,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / pageSize) || 0,
    });
  },

  async getStudentFeeDues(_schoolId, studentId, _query?: StudentFeeDueQuery) {
    const invoices = await fetchInvoices({ student: studentId });
    return success(buildStudentSummary(studentId, invoices));
  },

  async getFeeDue(_schoolId, feeDueId) {
    const inv = await fetchInvoice(feeDueId);
    const details: FeeDueDetails = {
      item: {
        due: mapInvoiceToFeeDue(inv),
        guardianMobile: '',
        daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000)),
      },
      activities: [],
      fineWaivers: [],
    };
    return success(details);
  },

  async calculateFinePreview(_schoolId, _feeDueId, _asOfDate): Promise<ApiResponse<FineCalculationResult>> {
    notSupported('calculateFinePreview');
  },

  async refreshFeeDueFine(_schoolId, _feeDueId, _asOfDate, _userId) {
    notSupported('refreshFeeDueFine');
  },

  async bulkRefreshFines(_schoolId, _input: BulkRefreshFinesInput): Promise<ApiResponse<FineRefreshResult>> {
    notSupported('bulkRefreshFines');
  },

  async waiveFeeDueFine(_schoolId, _feeDueId, _input: WaiveFineInput) {
    notSupported('waiveFeeDueFine');
  },

  async waiveFeeDue(_schoolId, _feeDueId, _input: WaiveFeeDueInput) {
    notSupported('waiveFeeDue');
  },

  async cancelFeeDue(_schoolId, feeDueId, _input: CancelFeeDueInput) {
    const raw = await apiClient.patch<unknown>(`/fees/invoices/${feeDueId}/cancel/`, {});
    const inv = (raw as Record<string, unknown>).invoice as BackendInvoice;
    const details: FeeDueDetails = {
      item: {
        due: mapInvoiceToFeeDue(inv),
        guardianMobile: '',
        daysOverdue: 0,
      },
      activities: [],
      fineWaivers: [],
    };
    return success(details, 'Fee invoice cancelled.');
  },

  async getParentStudentFees(_schoolId, _parentMembershipId, studentId, _asOfDate) {
    const invoices = await fetchInvoices({ student: studentId });
    return success(buildStudentSummary(studentId, invoices));
  },

  async getStudentSelfFees(_schoolId, _studentMembershipId, _asOfDate) {
    const invoices = await fetchInvoices();
    return success(buildStudentSummary(_studentMembershipId, invoices));
  },
};
