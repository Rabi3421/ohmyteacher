import type { ID, PaginatedResponse } from './common';
import type {
  FeeDueRule,
  FeeFrequency,
  FineRuleSlab,
  FineRuleType,
} from './fee';

export type FeeDueStatus =
  | 'UPCOMING'
  | 'PENDING'
  | 'OVERDUE'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'WAIVED'
  | 'CANCELLED';
export type FeeDuePeriodType =
  | 'MONTH'
  | 'QUARTER'
  | 'HALF_YEAR'
  | 'YEAR'
  | 'ONE_TIME'
  | 'INSTALLMENT';
export type FeeGenerationRunStatus =
  | 'PREVIEWED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type FeeGenerationType =
  | 'BRANCH'
  | 'CLASS'
  | 'SECTION'
  | 'SELECTED_STUDENTS'
  | 'INDIVIDUAL_STUDENT'
  | 'ONE_TIME_FEE'
  | 'FULL_SESSION';
export type FeeGenerationItemStatus =
  | 'NEW'
  | 'EXISTING'
  | 'SKIPPED'
  | 'ERROR'
  | 'CREATED';
export type FeeDueActivityType =
  | 'FEE_GENERATION_PREVIEWED'
  | 'FEE_GENERATION_STARTED'
  | 'FEE_GENERATION_COMPLETED'
  | 'FEE_GENERATION_PARTIALLY_COMPLETED'
  | 'FEE_GENERATION_FAILED'
  | 'FEE_DUE_CREATED'
  | 'FEE_FINE_REFRESHED'
  | 'FEE_FINE_WAIVED'
  | 'FEE_DUE_WAIVED'
  | 'FEE_DUE_CANCELLED';

export interface FineRuleSnapshot {
  id: ID;
  name: string;
  code: string;
  type: FineRuleType;
  graceDays: number;
  fixedAmountPaise?: number;
  dailyAmountPaise?: number;
  maximumAmountPaise?: number;
  slabs?: Array<Omit<FineRuleSlab, 'amount'> & { amountPaise: number }>;
}

export interface FeeDueCalculationSnapshot {
  feeStructureName: string;
  feeStructureItemId: ID;
  frequency: FeeFrequency;
  dueRule: FeeDueRule;
  applicability: string;
  mandatory: boolean;
  selected: boolean;
  overrideType: 'DEFAULT_AMOUNT' | 'CUSTOM_AMOUNT' | 'EXEMPT';
  overrideReason?: string;
  discountNames: string[];
  generatedAsOfDate: string;
  warnings: string[];
}

export interface FeeDue {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  studentId: ID;
  enrollmentId: ID;
  feeAssignmentId: ID;
  feeStructureId: ID;
  feeStructureItemId: ID;
  feeHeadId: ID;
  feeHeadNameSnapshot: string;
  feeHeadCodeSnapshot: string;
  studentNameSnapshot: string;
  admissionNumberSnapshot: string;
  branchNameSnapshot: string;
  classNameSnapshot: string;
  sectionNameSnapshot: string;
  periodType: FeeDuePeriodType;
  periodKey: string;
  periodLabel: string;
  installmentNumber?: number;
  frequencySnapshot: FeeFrequency;
  dueDate: string;
  baseAmountPaise: number;
  overrideAmountPaise: number;
  exemptionAmountPaise: number;
  discountAmountPaise: number;
  netFeeAmountPaise: number;
  fineAmountPaise: number;
  fineWaivedAmountPaise: number;
  paidAmountPaise: number;
  outstandingAmountPaise: number;
  status: FeeDueStatus;
  fineRuleSnapshot?: FineRuleSnapshot;
  calculationSnapshot: FeeDueCalculationSnapshot;
  generatedByRunId: ID;
  generatedAt: string;
  fineCalculatedThrough?: string;
  cancelledAt?: string;
  cancelledByUserId?: ID;
  cancellationReason?: string;
  waivedAt?: string;
  waivedByUserId?: ID;
  waiverReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeSchedulePeriod {
  type: FeeDuePeriodType;
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  installmentNumber?: number;
  warnings: string[];
}

export interface FeeGenerationContext {
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  asOfDate: string;
}

export interface PreviewFeeGenerationInput extends FeeGenerationContext {
  generationType: FeeGenerationType;
  requestedPeriodKeys: string[];
  classIds: ID[];
  sectionIds: ID[];
  studentIds: ID[];
  feeHeadIds: ID[];
  feeScope: 'ALL' | 'RECURRING' | 'ONE_TIME' | 'SELECTED';
  includePreviousEligiblePeriods: boolean;
  requestedByUserId: ID;
}

export interface FeeGenerationPreviewItem {
  idempotencyKey: string;
  studentId: ID;
  enrollmentId: ID;
  studentName: string;
  admissionNumber: string;
  className: string;
  sectionName: string;
  feeAssignmentId?: ID;
  feeStructureId?: ID;
  feeStructureItemId?: ID;
  feeHeadId?: ID;
  feeHeadName: string;
  periodType?: FeeDuePeriodType;
  periodKey: string;
  periodLabel: string;
  dueDate?: string;
  baseAmountPaise: number;
  discountAmountPaise: number;
  netAmountPaise: number;
  status: FeeGenerationItemStatus;
  reason?: string;
  snapshot?: Omit<
    FeeDue,
    | 'id'
    | 'generatedByRunId'
    | 'generatedAt'
    | 'createdAt'
    | 'updatedAt'
    | 'outstandingAmountPaise'
    | 'status'
  >;
}

export interface FeeGenerationWarning {
  code: string;
  message: string;
  count: number;
}

export interface FeeGenerationPreview {
  previewId: ID;
  expiresAt: string;
  context: FeeGenerationContext;
  input: PreviewFeeGenerationInput;
  requestedPeriods: Array<{ key: string; label: string }>;
  totalStudents: number;
  eligibleStudents: number;
  candidateDueCount: number;
  totalAmountPaise: number;
  newDueCount: number;
  existingDueCount: number;
  skippedCount: number;
  errorCount: number;
  items: FeeGenerationPreviewItem[];
  warnings: FeeGenerationWarning[];
  generatedAt: string;
}

export interface CommitFeeGenerationInput {
  previewId: ID;
  schoolId: ID;
  requestedByUserId: ID;
}

export interface FeeGenerationResultItem {
  idempotencyKey: string;
  feeDueId?: ID;
  status: FeeGenerationItemStatus;
  reason?: string;
}

export interface FeeGenerationResult {
  generationRunId: ID;
  status: FeeGenerationRunStatus;
  createdCount: number;
  existingCount: number;
  skippedCount: number;
  failedCount: number;
  totalGeneratedAmountPaise: number;
  items: FeeGenerationResultItem[];
}

export interface FeeGenerationRun {
  id: ID;
  schoolId: ID;
  branchId: ID;
  branchName: string;
  academicSessionId: ID;
  academicSessionName: string;
  generationType: FeeGenerationType;
  requestedPeriods: string[];
  classIds: ID[];
  sectionIds: ID[];
  studentIds: ID[];
  feeHeadIds: ID[];
  status: FeeGenerationRunStatus;
  totalCandidates: number;
  createdCount: number;
  existingCount: number;
  skippedCount: number;
  failedCount: number;
  totalGeneratedAmountPaise: number;
  requestedByUserId: ID;
  requestedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface FeeGenerationRunDetails {
  run: FeeGenerationRun;
  warnings: FeeGenerationWarning[];
  items: FeeGenerationResultItem[];
}

export interface FeeOutstandingSummary {
  upcomingAmountPaise: number;
  pendingAmountPaise: number;
  overdueAmountPaise: number;
  accruedFinePaise: number;
  totalOutstandingPaise: number;
  studentsWithOutstanding: number;
  unassignedEligibleStudents: number;
  latestGenerationRun?: FeeGenerationRun;
  asOfDate: string;
}

export interface FeeDueListItem {
  due: FeeDue;
  guardianMobile?: string;
  daysOverdue: number;
}

export interface StudentFeeDueSummary {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  upcomingAmountPaise: number;
  pendingAmountPaise: number;
  overdueAmountPaise: number;
  accruedFinePaise: number;
  totalGeneratedPaise: number;
  totalOutstandingPaise: number;
  waivedAmountPaise: number;
  cancelledAmountPaise: number;
  dues: FeeDueListItem[];
}

export interface FineCalculationResult {
  feeDueId: ID;
  asOfDate: string;
  lateDays: number;
  fineAmountPaise: number;
  fineWaivedAmountPaise: number;
  effectiveFinePaise: number;
  outstandingAmountPaise: number;
  warning?: string;
}

export interface FineRefreshResult {
  changedCount: number;
  unchangedCount: number;
  errorCount: number;
  feeDueIds: ID[];
}

export interface FineWaiver {
  id: ID;
  feeDueId: ID;
  type: 'PARTIAL_FINE' | 'FULL_FINE';
  amountPaise: number;
  reason: string;
  approvedByUserId: ID;
  approvedAt: string;
}

export interface FeeDueWaiver {
  id: ID;
  feeDueId: ID;
  reason: string;
  approvedByUserId: ID;
  approvedAt: string;
}

export interface FeeDueActivity {
  id: ID;
  schoolId: ID;
  branchId: ID;
  academicSessionId: ID;
  studentId?: ID;
  feeDueId?: ID;
  generationRunId?: ID;
  action: FeeDueActivityType;
  performedByUserId: ID;
  performedAt: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface FeeDueDetails {
  item: FeeDueListItem;
  activities: FeeDueActivity[];
  fineWaivers: FineWaiver[];
  dueWaiver?: FeeDueWaiver;
}

export interface FeeDueListQuery {
  branchId?: ID | 'ALL';
  academicSessionId?: ID | 'ALL';
  studentId?: ID;
  classId?: ID | 'ALL';
  sectionId?: ID | 'ALL';
  feeHeadId?: ID | 'ALL';
  periodKey?: string | 'ALL';
  status?: FeeDueStatus | FeeDueStatus[] | 'ALL';
  search?: string;
  guardianMobile?: string;
  sort?: 'DUE_DATE_ASC' | 'DUE_DATE_DESC' | 'OUTSTANDING_DESC' | 'DAYS_OVERDUE_DESC';
  asOfDate: string;
  page?: number;
  pageSize?: number;
}

export interface StudentFeeDueQuery {
  academicSessionId?: ID | 'ALL';
  asOfDate: string;
}

export interface GenerationHistoryQuery {
  branchId?: ID | 'ALL';
  academicSessionId?: ID | 'ALL';
  status?: FeeGenerationRunStatus | 'ALL';
  generationType?: FeeGenerationType | 'ALL';
  requestedByUserId?: ID;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface BulkRefreshFinesInput {
  branchId: ID;
  academicSessionId: ID;
  asOfDate: string;
  feeDueIds?: ID[];
  studentIds?: ID[];
  classIds?: ID[];
  requestedByUserId: ID;
}

export interface WaiveFineInput {
  type: FineWaiver['type'];
  amountPaise: number;
  reason: string;
  approvedByUserId: ID;
}

export interface WaiveFeeDueInput {
  reason: string;
  approvedByUserId: ID;
}

export interface CancelFeeDueInput {
  reason: string;
  cancelledByUserId: ID;
}

export interface FeeDueGenerationDraft {
  step: 1 | 2 | 3 | 4 | 5;
  input: PreviewFeeGenerationInput;
}

export type FeeDuePage = PaginatedResponse<FeeDueListItem>;
