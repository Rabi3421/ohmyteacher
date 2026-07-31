import type { PermissionKey } from '../constants/userPermissions';
import type { AppRole } from '../constants/permissions';
import type { PaginatedResponse } from './common';

export const REPORT_TYPES = [
  'SCHOOL_OVERVIEW',
  'STUDENT_STATUS',
  'FEE_OUTSTANDING',
  'FEE_HEAD',
  'CLASS_FEE',
  'DISCOUNT_EXEMPTION',
  'FINE_WAIVER',
  'ADVANCE_CREDIT',
  'PAYMENT_REVERSAL',
  'DAILY_COLLECTION',
  'PAYMENT_MODE',
  'COLLECTOR_COLLECTION',
  'RECEIPTS',
  'MARKS_COMPLETION',
  'PASS_FAIL',
  'GRADE_DISTRIBUTION',
  'SUBJECT_PERFORMANCE',
  'CLASS_SECTION_PERFORMANCE',
  'RANK_LIST',
  'RESULT_PUBLICATION',
  'REPORT_CARD_GENERATION',
  'COMMUNICATION_DELIVERY',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];
export type ReportCategory =
  | 'OVERVIEW'
  | 'STUDENTS'
  | 'FEES'
  | 'COLLECTIONS'
  | 'EXAMINATIONS'
  | 'COMMUNICATION';
export type ReportExportFormat = 'CSV' | 'XLSX' | 'PDF';
export type ReportExportStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'READY'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';
export type ReportSortDirection = 'ASC' | 'DESC';
export type ReportValueFormat =
  | 'TEXT'
  | 'NUMBER'
  | 'CURRENCY'
  | 'PERCENTAGE'
  | 'DATE'
  | 'STATUS';
export type AgingBucket =
  | 'NOT_DUE'
  | 'DUE_TODAY'
  | '1_TO_30_DAYS'
  | '31_TO_60_DAYS'
  | '61_TO_90_DAYS'
  | 'OVER_90_DAYS';

export interface ReportAccessContext {
  userId: string;
  userName: string;
  membershipId: string;
  role: AppRole;
  permissionKeys: PermissionKey[];
  permittedBranchIds: string[];
}

export interface CommonReportFilters {
  schoolId: string;
  branchIds?: string[];
  academicSessionIds?: string[];
  classIds?: string[];
  sectionIds?: string[];
  studentIds?: string[];
  examIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  asOfDate?: string;
  statuses?: string[];
  paymentModes?: string[];
  feeHeadIds?: string[];
  collectorUserIds?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'date' | 'amount' | 'status' | 'percentage' | 'rank';
  sortDirection?: ReportSortDirection;
  access: ReportAccessContext;
}

export type ReportFiltersByType = CommonReportFilters;
export type SerializedReportFilters = Omit<CommonReportFilters, 'access'>;

export interface ReportMetadata {
  generatedAt: string;
  asOfDate: string;
  timezone: string;
  currency: 'INR';
  sourceSnapshotTimestamp: string;
  filtersApplied: string[];
}

export interface ReportWarning {
  code: string;
  message: string;
  ignoredFilterKey?: string;
}

export interface ReportMetric {
  key: string;
  label: string;
  value: number;
  format: 'COUNT' | 'CURRENCY' | 'BASIS_POINTS';
  comparisonBasisPoints?: number;
}

export interface ReportSummary {
  metrics: ReportMetric[];
}

export interface ReportRowField {
  key: string;
  label: string;
  value: string | number | boolean;
  format: ReportValueFormat;
}

export interface ReportDrillDown {
  routeName: string;
  recordId: string;
}

export interface ReportDisplayRow {
  id: string;
  title: string;
  subtitle?: string;
  fields: ReportRowField[];
  drillDown?: ReportDrillDown;
}

export interface ReportGroupingResult {
  key: string;
  label: string;
  rowCount: number;
  amountPaise?: number;
}

export interface ReportResult<
  TSummary = ReportSummary,
  TRow = ReportDisplayRow,
> {
  reportType: ReportType;
  title: string;
  summary: TSummary;
  rows: TRow[];
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  groupings?: ReportGroupingResult[];
  metadata: ReportMetadata;
  warnings: ReportWarning[];
}

export interface ReportsDashboardQuery {
  access: ReportAccessContext;
  branchIds?: string[];
  academicSessionIds?: string[];
  asOfDate?: string;
}

export interface ReportsDashboardSummary {
  metrics: ReportMetric[];
  categoryCounts: Array<{ category: ReportCategory; reportCount: number }>;
  recentExports: ReportExportJob[];
  metadata: ReportMetadata;
}

export interface ReportCatalogItem {
  reportType: ReportType;
  category: ReportCategory;
  title: string;
  description: string;
  requiredPermission: PermissionKey;
  exportPermission?: PermissionKey;
  supportedFormats: ReportExportFormat[];
}

export interface SavedReportFilter {
  id: string;
  schoolId: string;
  userId: string;
  membershipId: string;
  reportType: ReportType;
  name: string;
  filters: SerializedReportFilters;
  isDefault: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedReportFilterInput {
  access: ReportAccessContext;
  reportType: ReportType;
  name: string;
  filters: SerializedReportFilters;
  isDefault?: boolean;
}

export interface UpdateSavedReportFilterInput {
  access: ReportAccessContext;
  name?: string;
  filters?: SerializedReportFilters;
  isDefault?: boolean;
}

export interface PreviewReportExportInput {
  reportType: ReportType;
  format: ReportExportFormat;
  filters: ReportFiltersByType;
}

export interface ReportExportPreview {
  reportType: ReportType;
  reportName: string;
  format: ReportExportFormat;
  filtersSnapshot: SerializedReportFilters;
  metadata: ReportMetadata;
  estimatedRowCount: number;
  estimatedFileSizeBytes: number;
  columns: string[];
  summaryFields: string[];
  warnings: ReportWarning[];
  fileName: string;
  isDevelopmentMock: boolean;
}

export interface CreateReportExportInput extends PreviewReportExportInput {
  clientRequestId: string;
}

export interface ReportExportJob {
  id: string;
  schoolId: string;
  branchIds: string[];
  reportType: ReportType;
  format: ReportExportFormat;
  filtersSnapshot: SerializedReportFilters;
  reportMetadataSnapshot: ReportMetadata;
  normalizedFilterHash: string;
  clientRequestId: string;
  status: ReportExportStatus;
  rowCount?: number;
  fileName: string;
  documentUrl?: string;
  documentExpiresAt?: string;
  errorCode?: string;
  errorMessage?: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedAt: string;
  completedAt?: string;
  isDevelopmentMock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExportJobDetails {
  job: ReportExportJob;
  preview: ReportExportPreview;
  activity: ReportActivity[];
}

export interface ExportJobListQuery {
  access: ReportAccessContext;
  status?: ReportExportStatus | 'ALL';
  reportType?: ReportType;
  page?: number;
  pageSize?: number;
}

export interface ExportJobActionInput {
  access: ReportAccessContext;
  clientRequestId?: string;
}

export interface ReportActivity {
  id: string;
  schoolId: string;
  membershipId: string;
  userId: string;
  userName: string;
  action:
    | 'REPORT_RUN'
    | 'SAVED_FILTER_CREATED'
    | 'SAVED_FILTER_UPDATED'
    | 'SAVED_FILTER_ARCHIVED'
    | 'EXPORT_PREVIEWED'
    | 'EXPORT_CREATED'
    | 'EXPORT_CANCELLED'
    | 'EXPORT_RETRIED';
  reportType?: ReportType;
  exportJobId?: string;
  occurredAt: string;
}

export type ReportExportPage = PaginatedResponse<ReportExportJob>;
