import type { PermissionKey } from '../../constants/userPermissions';
import type { PaginatedResponse } from '../../models/common';
import type {
  CommonReportFilters,
  ReportActivity,
  ReportDisplayRow,
  ReportExportJob,
  ReportExportPreview,
  ReportFiltersByType,
  ReportMetadata,
  ReportMetric,
  ReportResult,
  ReportsDashboardQuery,
  ReportRowField,
  ReportSummary,
  ReportType,
  SavedReportFilter,
  SerializedReportFilters,
} from '../../models/report';
import { aggregateCurrency } from '../../utils/reportAggregation';
import { getOutstandingAgingBucket } from '../../utils/reportAging';
import { createReportExportFileName } from '../../utils/reportExportFileName';
import {
  hashReportFilters,
  normalizeReportFilters,
} from '../../utils/reportFilterHash';
import { validateReportFilters } from '../../utils/reportFilterValidation';
import { toBasisPoints } from '../../utils/reportPercentages';
import { ApiClientError } from '../api/apiError';
import { getMockAcademicRepositorySnapshot } from '../academic/mockAcademicService';
import { getMockCollectionRepositorySnapshot } from '../collection/mockCollectionService';
import { getMockCommunicationRepositorySnapshot } from '../communication/mockCommunicationService';
import { mockExaminationSetupService } from '../examinationSetup/mockExaminationSetupService';
import { getMockFeeDueReportingSnapshot } from '../feeDue/mockFeeDueService';
import { publishedResultRepository } from '../marksResult/publishedResultRepository';
import { mockMarksResultService } from '../marksResult/mockMarksResultService';
import { mockSuccess } from '../mock/mockResponse';
import { getMockOrganizationRepositorySnapshot } from '../organization/mockOrganizationService';
import { reportCardRepository } from '../reportCard/reportCardRepository';
import { getMockStudentRepositorySnapshot } from '../student/mockStudentService';
import {
  INITIAL_SAVED_REPORT_FILTERS,
  REPORT_CATALOG,
  REPORT_FIXTURE_CLOCK,
} from './reportFixtures';
import type { ReportService } from './reportService';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const activeJobStatuses = ['QUEUED', 'PROCESSING', 'READY'] as const;

export interface MockReportServiceOptions {
  now?: () => string;
  timezone?: string;
}

function fail(code: string, message: string, status = 409): never {
  throw new ApiClientError({ code, message, status });
}

function serialize(filters: CommonReportFilters): SerializedReportFilters {
  const value = Object.fromEntries(
    Object.entries(filters).filter(([key]) => key !== 'access'),
  ) as SerializedReportFilters;
  return normalizeReportFilters(value);
}

function field(
  key: string,
  label: string,
  value: string | number | boolean,
  format: ReportRowField['format'] = 'TEXT',
): ReportRowField {
  return { key, label, value, format };
}

function metric(
  key: string,
  label: string,
  value: number,
  format: ReportMetric['format'],
): ReportMetric {
  return { key, label, value, format };
}

function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: items.length ? Math.ceil(items.length / pageSize) : 0,
  };
}

function requiredPermission(type: ReportType): PermissionKey {
  return (
    REPORT_CATALOG.find(item => item.reportType === type)?.requiredPermission ??
    'reports.dashboard.view'
  );
}

function requirePermission(
  access: ReportsDashboardQuery['access'],
  permission: PermissionKey,
): void {
  if (!access.permissionKeys.includes(permission))
    fail(
      'REPORT_PERMISSION_DENIED',
      'You do not have permission to access this report.',
      403,
    );
}

export function createMockReportService(
  options: MockReportServiceOptions = {},
): ReportService & {
  getActivities(): ReportActivity[];
  reset(): void;
} {
  const now = options.now ?? (() => REPORT_FIXTURE_CLOCK);
  const timezone = options.timezone ?? 'Asia/Kolkata';
  let savedFilters = clone(INITIAL_SAVED_REPORT_FILTERS);
  let exportJobs: ReportExportJob[] = [];
  let activities: ReportActivity[] = [];
  let sequence = 100;
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;

  const addActivity = (
    action: ReportActivity['action'],
    access: ReportsDashboardQuery['access'],
    schoolId: string,
    reportType?: ReportType,
    exportJobId?: string,
  ) => {
    activities.unshift({
      id: nextId('report-activity'),
      schoolId,
      membershipId: access.membershipId,
      userId: access.userId,
      userName: access.userName,
      action,
      reportType,
      exportJobId,
      occurredAt: now(),
    });
  };

  const metadata = (filters: CommonReportFilters): ReportMetadata => ({
    generatedAt: now(),
    asOfDate: filters.asOfDate ?? now().slice(0, 10),
    timezone,
    currency: 'INR',
    sourceSnapshotTimestamp: now(),
    filtersApplied: Object.entries(serialize(filters))
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key)
      .sort(),
  });

  const validated = (schoolId: string, input: CommonReportFilters) => {
    const organization = getMockOrganizationRepositorySnapshot();
    const academic = getMockAcademicRepositorySnapshot();
    const students = getMockStudentRepositorySnapshot();
    const examination = mockExaminationSetupService.getRepositorySnapshot();
    const branchIds = organization.branches.filter(
      item => item.schoolId === schoolId,
    ).map(item => item.id);
    return validateReportFilters(input, {
      schoolId,
      branchIds,
      academicSessionIds: organization.sessions.filter(
        item => item.schoolId === schoolId,
      ).map(item => item.id),
      classIds: academic.classes.filter(
        item => item.schoolId === schoolId,
      ).map(item => item.id),
      sectionIds: academic.sections.filter(item =>
        academic.classes.some(
          value => value.id === item.classId && value.schoolId === schoolId,
        ),
      ).map(item => item.id),
      studentIds: students.profiles.filter(
        item => item.schoolId === schoolId,
      ).map(item => item.id),
      examIds: examination.exams.filter(item => item.schoolId === schoolId).map(
        item => item.id,
      ),
    });
  };

  const filterBranches = <T extends { branchId: string }>(
    items: T[],
    filters: CommonReportFilters,
  ) => {
    if (filters.branchIds?.length)
      return items.filter(item => filters.branchIds!.includes(item.branchId));
    return ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(filters.access.role)
      ? items
      : [];
  };
  const filterSessions = <T extends { academicSessionId: string }>(
    items: T[],
    filters: CommonReportFilters,
  ) =>
    filters.academicSessionIds?.length
      ? items.filter(item =>
          filters.academicSessionIds!.includes(item.academicSessionId),
        )
      : items;
  const filterDates = <T>(
    items: T[],
    filters: CommonReportFilters,
    dateFor: (item: T) => string,
  ) =>
    items.filter(
      item =>
        (!filters.dateFrom || dateFor(item).slice(0, 10) >= filters.dateFrom) &&
        (!filters.dateTo || dateFor(item).slice(0, 10) <= filters.dateTo),
    );

  const buildReport = (
    schoolId: string,
    type: ReportType,
    input: ReportFiltersByType,
  ): ReportResult => {
    requirePermission(input.access, requiredPermission(type));
    const checked = validated(schoolId, input);
    const filters = checked.filters;
    const academic = getMockAcademicRepositorySnapshot();
    const students = getMockStudentRepositorySnapshot();
    const examination = mockExaminationSetupService.getRepositorySnapshot();
    const marksResult = mockMarksResultService.getRepositorySnapshot();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const duesSnapshot = getMockFeeDueReportingSnapshot();
    let dues = duesSnapshot.dues.filter(item => item.schoolId === schoolId);
    dues = filterSessions(filterBranches(dues, filters), filters);
    if (filters.studentIds?.length)
      dues = dues.filter(item => filters.studentIds!.includes(item.studentId));
    if (filters.classIds?.length) {
      const names = academic.classes.filter(item =>
        filters.classIds!.includes(item.id),
      ).map(item => item.name);
      dues = dues.filter(item => names.includes(item.classNameSnapshot));
    }
    if (filters.sectionIds?.length) {
      const names = academic.sections.filter(item =>
        filters.sectionIds!.includes(item.id),
      ).map(item => item.name);
      dues = dues.filter(item => names.includes(item.sectionNameSnapshot));
    }
    if (filters.feeHeadIds?.length)
      dues = dues.filter(item => filters.feeHeadIds!.includes(item.feeHeadId));
    const collection = getMockCollectionRepositorySnapshot();
    let payments = collection.payments.filter(
      item => item.schoolId === schoolId,
    );
    payments = filterDates(
      filterSessions(filterBranches(payments, filters), filters),
      filters,
      item => item.paymentDate,
    );
    if (filters.paymentModes?.length)
      payments = payments.filter(item =>
        filters.paymentModes!.includes(item.paymentMode),
      );
    if (filters.collectorUserIds?.length)
      payments = payments.filter(item =>
        filters.collectorUserIds!.includes(item.collectedByUserId),
      );
    let published = publishedResultRepository
      .list()
      .filter(
        item => item.schoolId === schoolId && item.status === 'PUBLISHED',
      );
    published = filterSessions(filterBranches(published, filters), filters);
    if (filters.examIds?.length)
      published = published.filter(item =>
        filters.examIds!.includes(item.examId),
      );
    if (filters.studentIds?.length)
      published = published.filter(item =>
        filters.studentIds!.includes(item.studentId),
      );
    const rows: ReportDisplayRow[] = [];
    const summary: ReportSummary = { metrics: [] };
    const pushGrouped = (
      groups: Array<{ key: string; amountPaise: number; count: number }>,
      label: string,
    ) =>
      groups.forEach(group =>
        rows.push({
          id: `${type}-${group.key}`,
          title: group.key,
          fields: [
            field('count', 'Count', group.count, 'NUMBER'),
            field('amountPaise', label, group.amountPaise, 'CURRENCY'),
          ],
        }),
      );

    if (type === 'SCHOOL_OVERVIEW') {
      const activeStudents = students.profiles.filter(
        item => item.schoolId === schoolId && item.status === 'ACTIVE',
      ).length;
      const posted = payments
        .filter(item => item.status === 'POSTED')
        .reduce((sum, item) => sum + item.amountPaise, 0);
      const outstanding = dues.reduce(
        (sum, item) => sum + item.outstandingAmountPaise,
        0,
      );
      summary.metrics.push(
        metric('activeStudents', 'Active Students', activeStudents, 'COUNT'),
        metric('collection', 'Collection', posted, 'CURRENCY'),
        metric('outstanding', 'Outstanding', outstanding, 'CURRENCY'),
        metric(
          'publishedResults',
          'Published Results',
          published.length,
          'COUNT',
        ),
      );
    } else if (type === 'STUDENT_STATUS') {
      const scopedStudentIds = students.enrollments.filter(
        item =>
          item.schoolId === schoolId &&
          (filters.branchIds?.includes(item.branchId) ??
            ['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(filters.access.role)),
      ).map(item => item.studentId);
      const profiles = students.profiles.filter(
        item =>
          item.schoolId === schoolId && scopedStudentIds.includes(item.id),
      );
      aggregateCurrency(
        profiles.map(item => ({ key: item.status, amountPaise: 0 })),
      ).forEach(group =>
        rows.push({
          id: `student-${group.key}`,
          title: group.key,
          fields: [field('count', 'Students', group.count, 'NUMBER')],
        }),
      );
      summary.metrics.push(
        metric('students', 'Students', profiles.length, 'COUNT'),
        metric(
          'enrollments',
          'Enrollments',
          students.enrollments.filter(item => item.schoolId === schoolId)
            .length,
          'COUNT',
        ),
      );
    } else if (
      ['FEE_OUTSTANDING', 'DISCOUNT_EXEMPTION', 'FINE_WAIVER'].includes(type)
    ) {
      dues.forEach(due =>
        rows.push({
          id: due.id,
          title: due.studentNameSnapshot,
          subtitle: `${due.classNameSnapshot} · ${due.periodLabel}`,
          fields:
            type === 'FEE_OUTSTANDING'
              ? [
                  field('feeHead', 'Fee Head', due.feeHeadNameSnapshot),
                  field('dueDate', 'Due date', due.dueDate, 'DATE'),
                  field(
                    'aging',
                    'Aging',
                    getOutstandingAgingBucket(
                      due.dueDate,
                      filters.asOfDate ?? now().slice(0, 10),
                    ),
                    'STATUS',
                  ),
                  field(
                    'outstanding',
                    'Outstanding',
                    due.outstandingAmountPaise,
                    'CURRENCY',
                  ),
                ]
              : type === 'DISCOUNT_EXEMPTION'
              ? [
                  field(
                    'discount',
                    'Discount',
                    due.discountAmountPaise,
                    'CURRENCY',
                  ),
                  field(
                    'exemption',
                    'Exemption',
                    due.exemptionAmountPaise,
                    'CURRENCY',
                  ),
                ]
              : [
                  field('fine', 'Fine', due.fineAmountPaise, 'CURRENCY'),
                  field(
                    'waived',
                    'Waived',
                    due.fineWaivedAmountPaise,
                    'CURRENCY',
                  ),
                ],
          drillDown: { routeName: 'FeeDueDetails', recordId: due.id },
        }),
      );
      const value =
        type === 'FEE_OUTSTANDING'
          ? dues.reduce((sum, item) => sum + item.outstandingAmountPaise, 0)
          : type === 'DISCOUNT_EXEMPTION'
          ? dues.reduce(
              (sum, item) =>
                sum + item.discountAmountPaise + item.exemptionAmountPaise,
              0,
            )
          : dues.reduce((sum, item) => sum + item.fineWaivedAmountPaise, 0);
      summary.metrics.push(
        metric('records', 'Records', dues.length, 'COUNT'),
        metric('amount', 'Amount', value, 'CURRENCY'),
      );
    } else if (type === 'FEE_HEAD' || type === 'CLASS_FEE') {
      const groups = aggregateCurrency(
        dues.map(item => ({
          key:
            type === 'FEE_HEAD'
              ? item.feeHeadNameSnapshot
              : `${item.classNameSnapshot} · ${item.sectionNameSnapshot}`,
          amountPaise: item.outstandingAmountPaise,
        })),
      );
      pushGrouped(groups, 'Outstanding');
      summary.metrics.push(
        metric('groups', 'Groups', groups.length, 'COUNT'),
        metric(
          'outstanding',
          'Outstanding',
          dues.reduce((sum, item) => sum + item.outstandingAmountPaise, 0),
          'CURRENCY',
        ),
      );
    } else if (type === 'ADVANCE_CREDIT') {
      const entries = filterBranches(
        collection.advanceEntries.filter(item => item.schoolId === schoolId),
        filters,
      );
      entries.forEach(item =>
        rows.push({
          id: item.id,
          title: item.description,
          fields: [
            field('type', 'Type', item.entryType, 'STATUS'),
            field('credit', 'Credit', item.creditAmountPaise, 'CURRENCY'),
            field('debit', 'Debit', item.debitAmountPaise, 'CURRENCY'),
            field('balance', 'Balance', item.runningBalancePaise, 'CURRENCY'),
          ],
        }),
      );
      summary.metrics.push(
        metric(
          'credits',
          'Credits',
          entries.reduce((sum, item) => sum + item.creditAmountPaise, 0),
          'CURRENCY',
        ),
        metric(
          'debits',
          'Debits',
          entries.reduce((sum, item) => sum + item.debitAmountPaise, 0),
          'CURRENCY',
        ),
      );
    } else if (type === 'PAYMENT_REVERSAL') {
      const permittedPaymentIds = payments.map(item => item.id);
      const reversals = collection.reversals.filter(
        item =>
          item.schoolId === schoolId &&
          permittedPaymentIds.includes(item.paymentId),
      );
      reversals.forEach(item =>
        rows.push({
          id: item.id,
          title: item.reversalNumber,
          subtitle: item.reason,
          fields: [
            field('amount', 'Amount', item.amountPaise, 'CURRENCY'),
            field('by', 'Reversed by', item.reversedByName),
            field('at', 'Reversed', item.reversedAt, 'DATE'),
          ],
          drillDown: { routeName: 'PaymentDetails', recordId: item.paymentId },
        }),
      );
      summary.metrics.push(
        metric('reversals', 'Reversals', rows.length, 'COUNT'),
        metric(
          'amount',
          'Reversed amount',
          reversals.reduce((sum, item) => sum + item.amountPaise, 0),
          'CURRENCY',
        ),
      );
    } else if (
      ['DAILY_COLLECTION', 'PAYMENT_MODE', 'COLLECTOR_COLLECTION'].includes(
        type,
      )
    ) {
      const posted = payments.filter(item => item.status === 'POSTED');
      const groups = aggregateCurrency(
        posted.map(item => ({
          key:
            type === 'DAILY_COLLECTION'
              ? item.paymentDate
              : type === 'PAYMENT_MODE'
              ? item.paymentMode
              : item.collectedByName,
          amountPaise: item.amountPaise,
        })),
      );
      pushGrouped(groups, 'Collected');
      summary.metrics.push(
        metric('payments', 'Payments', posted.length, 'COUNT'),
        metric(
          'collected',
          'Collected',
          posted.reduce((sum, item) => sum + item.amountPaise, 0),
          'CURRENCY',
        ),
      );
    } else if (type === 'RECEIPTS') {
      const receipts = filterDates(
        filterSessions(
          filterBranches(
            collection.receipts.filter(item => item.schoolId === schoolId),
            filters,
          ),
          filters,
        ),
        filters,
        item => item.issuedAt,
      );
      receipts.forEach(item =>
        rows.push({
          id: item.id,
          title: item.receiptNumber,
          subtitle: item.studentSnapshot.name,
          fields: [
            field('status', 'Status', item.status, 'STATUS'),
            field('mode', 'Mode', item.paymentMode),
            field('amount', 'Amount', item.paymentAmountPaise, 'CURRENCY'),
          ],
          drillDown: { routeName: 'ReceiptDetails', recordId: item.id },
        }),
      );
      summary.metrics.push(
        metric('receipts', 'Receipts', receipts.length, 'COUNT'),
        metric(
          'amount',
          'Receipt amount',
          receipts.reduce((sum, item) => sum + item.paymentAmountPaise, 0),
          'CURRENCY',
        ),
      );
    } else if (type === 'MARKS_COMPLETION') {
      const exams = examination.exams.filter(
        item =>
          item.schoolId === schoolId &&
          (!filters.examIds?.length || filters.examIds.includes(item.id)),
      );
      exams.forEach(item => {
        const examSheets = marksResult.sheets.filter(
          value => value.examId === item.id,
        );
        const completed = examSheets.filter(value =>
          ['SUBMITTED', 'LOCKED'].includes(value.status),
        ).length;
        rows.push({
          id: item.id,
          title: item.name,
          fields: [
            field('status', 'Exam status', item.status, 'STATUS'),
            field('sheets', 'Mark Sheets', examSheets.length, 'NUMBER'),
            field('completed', 'Completed', completed, 'NUMBER'),
            field(
              'completion',
              'Completion',
              toBasisPoints(completed, examSheets.length),
              'PERCENTAGE',
            ),
          ],
        });
      });
      summary.metrics.push(
        metric('exams', 'Exams', exams.length, 'COUNT'),
        metric(
          'markSheets',
          'Mark Sheets',
          marksResult.sheets.filter(item => item.schoolId === schoolId).length,
          'COUNT',
        ),
      );
    } else if (
      ['PASS_FAIL', 'GRADE_DISTRIBUTION', 'CLASS_SECTION_PERFORMANCE'].includes(
        type,
      )
    ) {
      const groups = aggregateCurrency(
        published.map(item => ({
          key:
            type === 'PASS_FAIL'
              ? item.overallResult.outcome
              : type === 'GRADE_DISTRIBUTION'
              ? item.overallResult.grade ?? 'UNGRADED'
              : `${item.classNameSnapshot} · ${item.sectionNameSnapshot}`,
          amountPaise: item.overallResult.percentageBasisPoints,
        })),
      );
      groups.forEach(group =>
        rows.push({
          id: `${type}-${group.key}`,
          title: group.key,
          fields: [
            field('students', 'Students', group.count, 'NUMBER'),
            field(
              'average',
              'Average',
              group.count ? Math.round(group.amountPaise / group.count) : 0,
              'PERCENTAGE',
            ),
          ],
        }),
      );
      summary.metrics.push(
        metric('students', 'Published students', published.length, 'COUNT'),
        metric(
          'passRate',
          'Pass rate',
          toBasisPoints(
            published.filter(item => item.overallResult.outcome === 'PASS')
              .length,
            published.length,
          ),
          'BASIS_POINTS',
        ),
      );
    } else if (type === 'SUBJECT_PERFORMANCE') {
      const subjects = published.flatMap(item => item.subjectResults);
      const groups = aggregateCurrency(
        subjects.map(item => ({
          key: item.subjectNameSnapshot,
          amountPaise: item.percentageBasisPoints ?? 0,
        })),
      );
      groups.forEach(group =>
        rows.push({
          id: `subject-${group.key}`,
          title: group.key,
          fields: [
            field('students', 'Students', group.count, 'NUMBER'),
            field(
              'average',
              'Average',
              group.count ? Math.round(group.amountPaise / group.count) : 0,
              'PERCENTAGE',
            ),
          ],
        }),
      );
      summary.metrics.push(
        metric('subjects', 'Subjects', groups.length, 'COUNT'),
        metric('records', 'Result records', subjects.length, 'COUNT'),
      );
    } else if (type === 'RANK_LIST') {
      published
        .slice()
        .sort(
          (left, right) =>
            (left.overallResult.rank ?? Number.MAX_SAFE_INTEGER) -
              (right.overallResult.rank ?? Number.MAX_SAFE_INTEGER) ||
            left.overallResult.studentNameSnapshot.localeCompare(
              right.overallResult.studentNameSnapshot,
            ),
        )
        .forEach(item =>
          rows.push({
            id: item.id,
            title: item.overallResult.studentNameSnapshot,
            subtitle: `${item.classNameSnapshot} · ${item.sectionNameSnapshot}`,
            fields: [
              field('rank', 'Rank', item.overallResult.rank ?? '—', 'NUMBER'),
              field(
                'percentage',
                'Percentage',
                item.overallResult.percentageBasisPoints,
                'PERCENTAGE',
              ),
            ],
            drillDown: {
              routeName: 'StudentResultDetails',
              recordId: item.studentId,
            },
          }),
        );
      summary.metrics.push(
        metric('ranked', 'Ranked students', rows.length, 'COUNT'),
      );
    } else if (type === 'RESULT_PUBLICATION') {
      aggregateCurrency(
        published.map(item => ({
          key: `${item.examNameSnapshot} · ${item.publishedAt.slice(0, 10)}`,
          amountPaise: 0,
        })),
      ).forEach(group =>
        rows.push({
          id: `publication-${group.key}`,
          title: group.key,
          fields: [field('students', 'Students', group.count, 'NUMBER')],
        }),
      );
      summary.metrics.push(
        metric('published', 'Published snapshots', published.length, 'COUNT'),
      );
    } else if (type === 'REPORT_CARD_GENERATION') {
      const runs = reportCardRepository
        .runs()
        .filter(item => item.schoolId === schoolId);
      runs.forEach(item =>
        rows.push({
          id: item.id,
          title: item.status.replaceAll('_', ' '),
          subtitle: item.requestedByName,
          fields: [
            field('candidates', 'Candidates', item.totalCandidates, 'NUMBER'),
            field('generated', 'Generated', item.generatedCount, 'NUMBER'),
            field('failed', 'Failed', item.failedCount, 'NUMBER'),
          ],
          drillDown: {
            routeName: 'ReportCardGenerationRunDetails',
            recordId: item.id,
          },
        }),
      );
      summary.metrics.push(
        metric('runs', 'Runs', runs.length, 'COUNT'),
        metric(
          'generated',
          'Generated',
          runs.reduce((sum, item) => sum + item.generatedCount, 0),
          'COUNT',
        ),
      );
    } else if (type === 'COMMUNICATION_DELIVERY') {
      let records =
        getMockCommunicationRepositorySnapshot().communications.filter(
          item => item.schoolId === schoolId,
        );
      if (filters.branchIds?.length)
        records = records.filter(
          item => item.branchId && filters.branchIds!.includes(item.branchId),
        );
      const groups = aggregateCurrency(
        records.map(item => ({
          key: `${item.mode} · ${item.status}`,
          amountPaise: 0,
        })),
      );
      groups.forEach(group =>
        rows.push({
          id: `communication-${group.key}`,
          title: group.key,
          fields: [field('messages', 'Messages', group.count, 'NUMBER')],
        }),
      );
      summary.metrics.push(
        metric('messages', 'Messages', records.length, 'COUNT'),
        metric(
          'delivered',
          'Delivered',
          records.filter(
            item => item.status === 'DELIVERED' || item.status === 'READ',
          ).length,
          'COUNT',
        ),
      );
    }
    const ordered = rows.sort(
      (left, right) =>
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id),
    );
    const pageData = paginate(ordered, page, pageSize);
    return {
      reportType: type,
      title:
        REPORT_CATALOG.find(item => item.reportType === type)?.title ?? type,
      summary,
      rows: pageData.items,
      pagination: {
        page: pageData.page,
        pageSize: pageData.pageSize,
        totalItems: pageData.totalItems,
        totalPages: pageData.totalPages,
      },
      metadata: metadata(filters),
      warnings: checked.warnings,
    };
  };

  const service: ReportService & {
    getActivities(): ReportActivity[];
    reset(): void;
  } = {
    async getReportsDashboard(schoolId, input) {
      requirePermission(input.access, 'reports.dashboard.view');
      const filters: CommonReportFilters = {
        schoolId,
        access: input.access,
        branchIds: input.branchIds,
        academicSessionIds: input.academicSessionIds,
        asOfDate: input.asOfDate,
      };
      const overview = buildReport(schoolId, 'SCHOOL_OVERVIEW', filters);
      const catalog = REPORT_CATALOG.filter(item =>
        input.access.permissionKeys.includes(item.requiredPermission),
      );
      const categories = [
        ...new Set(catalog.map(item => item.category)),
      ].sort();
      return mockSuccess(
        {
          metrics: overview.summary.metrics,
          categoryCounts: categories.map(category => ({
            category,
            reportCount: catalog.filter(item => item.category === category)
              .length,
          })),
          recentExports: exportJobs
            .filter(
              item =>
                item.schoolId === schoolId &&
                item.requestedByUserId === input.access.userId,
            )
            .slice(0, 3),
          metadata: overview.metadata,
        },
        'Reports dashboard loaded.',
        0,
      );
    },
    async getReportCatalog(schoolId, access) {
      if (
        schoolId !== 'platform' &&
        !getMockOrganizationRepositorySnapshot().schools.some(
          item => item.id === schoolId,
        )
      )
        fail('SCHOOL_NOT_FOUND', 'School was not found.', 404);
      requirePermission(access, 'reports.dashboard.view');
      return mockSuccess(
        REPORT_CATALOG.filter(item =>
          access.permissionKeys.includes(item.requiredPermission),
        ),
        'Report catalog loaded.',
        0,
      );
    },
    async runReport(schoolId, reportType, filters) {
      const result = buildReport(schoolId, reportType, filters);
      addActivity('REPORT_RUN', filters.access, schoolId, reportType);
      return mockSuccess(
        result,
        'Report generated from the current repository snapshot.',
        0,
      );
    },
    async getSavedFilters(schoolId, access, reportType) {
      requirePermission(access, 'reports.saved_filters.manage');
      return mockSuccess(
        savedFilters.filter(
          item =>
            item.schoolId === schoolId &&
            item.membershipId === access.membershipId &&
            item.status === 'ACTIVE' &&
            (!reportType || item.reportType === reportType),
        ),
        'Saved filters loaded.',
        0,
      );
    },
    async saveReportFilter(schoolId, input) {
      requirePermission(input.access, 'reports.saved_filters.manage');
      if (!input.name.trim())
        fail('SAVED_FILTER_NAME_REQUIRED', 'Enter a Saved Filter name.', 400);
      validated(schoolId, { ...input.filters, access: input.access });
      if (input.isDefault)
        savedFilters = savedFilters.map(item =>
          item.membershipId === input.access.membershipId &&
          item.reportType === input.reportType
            ? { ...item, isDefault: false, updatedAt: now() }
            : item,
        );
      const item: SavedReportFilter = {
        id: nextId('saved-filter'),
        schoolId,
        userId: input.access.userId,
        membershipId: input.access.membershipId,
        reportType: input.reportType,
        name: input.name.trim(),
        filters: normalizeReportFilters(input.filters),
        isDefault: input.isDefault ?? false,
        status: 'ACTIVE',
        createdAt: now(),
        updatedAt: now(),
      };
      savedFilters.push(item);
      addActivity(
        'SAVED_FILTER_CREATED',
        input.access,
        schoolId,
        input.reportType,
      );
      return mockSuccess(item, 'Report filter saved.', 0);
    },
    async updateSavedReportFilter(schoolId, id, input) {
      requirePermission(input.access, 'reports.saved_filters.manage');
      const index = savedFilters.findIndex(
        item =>
          item.id === id &&
          item.schoolId === schoolId &&
          item.membershipId === input.access.membershipId &&
          item.status === 'ACTIVE',
      );
      if (index < 0)
        fail('SAVED_FILTER_NOT_FOUND', 'Saved Filter was not found.', 404);
      const current = savedFilters[index];
      if (input.filters)
        validated(schoolId, { ...input.filters, access: input.access });
      if (input.isDefault)
        savedFilters = savedFilters.map(item =>
          item.membershipId === input.access.membershipId &&
          item.reportType === current.reportType
            ? { ...item, isDefault: false, updatedAt: now() }
            : item,
        );
      const updated = {
        ...current,
        name: input.name?.trim() || current.name,
        filters: input.filters
          ? normalizeReportFilters(input.filters)
          : current.filters,
        isDefault: input.isDefault ?? current.isDefault,
        updatedAt: now(),
      };
      savedFilters[index] = updated;
      addActivity(
        'SAVED_FILTER_UPDATED',
        input.access,
        schoolId,
        current.reportType,
      );
      return mockSuccess(updated, 'Saved Filter updated.', 0);
    },
    async archiveSavedReportFilter(schoolId, id, input) {
      requirePermission(input.access, 'reports.saved_filters.manage');
      const index = savedFilters.findIndex(
        item =>
          item.id === id &&
          item.schoolId === schoolId &&
          item.membershipId === input.access.membershipId &&
          item.status === 'ACTIVE',
      );
      if (index < 0)
        fail('SAVED_FILTER_NOT_FOUND', 'Saved Filter was not found.', 404);
      savedFilters[index] = {
        ...savedFilters[index],
        status: 'ARCHIVED',
        isDefault: false,
        updatedAt: now(),
      };
      addActivity(
        'SAVED_FILTER_ARCHIVED',
        input.access,
        schoolId,
        savedFilters[index].reportType,
      );
      return mockSuccess(savedFilters[index], 'Saved Filter archived.', 0);
    },
    async previewExport(schoolId, input) {
      const catalog =
        REPORT_CATALOG.find(item => item.reportType === input.reportType) ??
        fail('REPORT_TYPE_INVALID', 'Report type is invalid.', 400);
      if (!catalog.exportPermission)
        fail(
          'REPORT_EXPORT_UNAVAILABLE',
          'This report is not exportable in Phase 14.',
          403,
        );
      requirePermission(input.filters.access, catalog.exportPermission);
      const report = buildReport(schoolId, input.reportType, {
        ...input.filters,
        page: 1,
        pageSize: 100,
      });
      const school = getMockOrganizationRepositorySnapshot().schools.find(
        item => item.id === schoolId,
      );
      const preview: ReportExportPreview = {
        reportType: input.reportType,
        reportName: catalog.title,
        format: input.format,
        filtersSnapshot: serialize(input.filters),
        metadata: report.metadata,
        estimatedRowCount: report.pagination?.totalItems ?? report.rows.length,
        estimatedFileSizeBytes:
          2048 +
          (report.pagination?.totalItems ?? report.rows.length) *
            (input.format === 'PDF'
              ? 320
              : input.format === 'XLSX'
              ? 180
              : 120),
        columns: report.rows[0]?.fields.map(item => item.label) ?? [],
        summaryFields: report.summary.metrics.map(item => item.label),
        warnings: report.warnings,
        fileName: createReportExportFileName({
          reportType: input.reportType,
          format: input.format,
          asOfDate: report.metadata.asOfDate,
          schoolName: school?.name,
        }),
        isDevelopmentMock: true,
      };
      addActivity(
        'EXPORT_PREVIEWED',
        input.filters.access,
        schoolId,
        input.reportType,
      );
      return mockSuccess(
        preview,
        'Export preview prepared without creating a job.',
        0,
      );
    },
    async createExportJob(schoolId, input) {
      const preview = (await service.previewExport(schoolId, input)).data;
      const access = input.filters.access;
      const hash = hashReportFilters(preview.filtersSnapshot);
      const existing = exportJobs.find(
        item =>
          item.schoolId === schoolId &&
          item.requestedByUserId === access.userId &&
          item.reportType === input.reportType &&
          item.format === input.format &&
          item.normalizedFilterHash === hash &&
          item.clientRequestId === input.clientRequestId &&
          activeJobStatuses.includes(
            item.status as (typeof activeJobStatuses)[number],
          ),
      );
      if (existing)
        return mockSuccess(existing, 'Existing active Export Job returned.', 0);
      const job: ReportExportJob = {
        id: nextId('export-job'),
        schoolId,
        branchIds: input.filters.branchIds ?? [],
        reportType: input.reportType,
        format: input.format,
        filtersSnapshot: preview.filtersSnapshot,
        reportMetadataSnapshot: preview.metadata,
        normalizedFilterHash: hash,
        clientRequestId: input.clientRequestId,
        status: 'QUEUED',
        rowCount: preview.estimatedRowCount,
        fileName: preview.fileName,
        requestedByUserId: access.userId,
        requestedByName: access.userName,
        requestedAt: now(),
        isDevelopmentMock: true,
        createdAt: now(),
        updatedAt: now(),
      };
      exportJobs.unshift(job);
      addActivity('EXPORT_CREATED', access, schoolId, input.reportType, job.id);
      return mockSuccess(job, 'Development Export Job queued.', 0);
    },
    async getExportJobs(schoolId, query) {
      requirePermission(query.access, 'reports.export_history.view');
      let values = exportJobs.filter(
        item =>
          item.schoolId === schoolId &&
          (query.access.role === 'SUPER_ADMIN' ||
            query.access.role === 'SCHOOL_ADMIN' ||
            item.requestedByUserId === query.access.userId),
      );
      if (query.status && query.status !== 'ALL')
        values = values.filter(item => item.status === query.status);
      if (query.reportType)
        values = values.filter(item => item.reportType === query.reportType);
      return mockSuccess(
        paginate(values, query.page ?? 1, query.pageSize ?? 20),
        'Export history loaded.',
        0,
      );
    },
    async getExportJob(schoolId, id, input) {
      requirePermission(input.access, 'reports.export_history.view');
      const index = exportJobs.findIndex(
        item => item.id === id && item.schoolId === schoolId,
      );
      if (index < 0)
        fail('EXPORT_JOB_NOT_FOUND', 'Export Job was not found.', 404);
      const job = exportJobs[index];
      if (
        !['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(input.access.role) &&
        job.requestedByUserId !== input.access.userId
      )
        fail(
          'EXPORT_JOB_SCOPE_DENIED',
          'This Export Job belongs to another user.',
          403,
        );
      if (job.status === 'QUEUED')
        exportJobs[index] = { ...job, status: 'PROCESSING', updatedAt: now() };
      else if (job.status === 'PROCESSING')
        exportJobs[index] = {
          ...job,
          status: 'READY',
          completedAt: now(),
          documentUrl: `mock-report://exports/${job.id}/${job.fileName}`,
          documentExpiresAt: '2026-08-07T12:00:00.000Z',
          updatedAt: now(),
        };
      const current = exportJobs[index];
      const preview: ReportExportPreview = {
        reportType: current.reportType,
        reportName:
          REPORT_CATALOG.find(item => item.reportType === current.reportType)
            ?.title ?? current.reportType,
        format: current.format,
        filtersSnapshot: current.filtersSnapshot,
        metadata: current.reportMetadataSnapshot,
        estimatedRowCount: current.rowCount ?? 0,
        estimatedFileSizeBytes: 2048 + (current.rowCount ?? 0) * 180,
        columns: [],
        summaryFields: [],
        warnings: [],
        fileName: current.fileName,
        isDevelopmentMock: true,
      };
      return mockSuccess(
        {
          job: current,
          preview,
          activity: activities.filter(item => item.exportJobId === id),
        },
        'Export Job loaded.',
        0,
      );
    },
    async cancelExportJob(schoolId, id, input) {
      requirePermission(input.access, 'reports.export_history.view');
      const index = exportJobs.findIndex(
        item => item.id === id && item.schoolId === schoolId,
      );
      if (index < 0)
        fail('EXPORT_JOB_NOT_FOUND', 'Export Job was not found.', 404);
      if (!['QUEUED', 'PROCESSING'].includes(exportJobs[index].status))
        fail(
          'EXPORT_JOB_NOT_CANCELLABLE',
          'Only queued or processing jobs can be cancelled.',
        );
      exportJobs[index] = {
        ...exportJobs[index],
        status: 'CANCELLED',
        updatedAt: now(),
      };
      addActivity(
        'EXPORT_CANCELLED',
        input.access,
        schoolId,
        exportJobs[index].reportType,
        id,
      );
      return mockSuccess(exportJobs[index], 'Export Job cancelled.', 0);
    },
    async retryExportJob(schoolId, id, input) {
      requirePermission(input.access, 'reports.export_history.view');
      const source =
        exportJobs.find(item => item.id === id && item.schoolId === schoolId) ??
        fail('EXPORT_JOB_NOT_FOUND', 'Export Job was not found.', 404);
      if (!['FAILED', 'EXPIRED'].includes(source.status))
        fail(
          'EXPORT_JOB_NOT_RETRYABLE',
          'Only failed or expired Export Jobs can be retried.',
        );
      const retried: ReportExportJob = {
        ...source,
        id: nextId('export-job'),
        status: 'QUEUED',
        clientRequestId: input.clientRequestId ?? nextId('retry-request'),
        documentUrl: undefined,
        documentExpiresAt: undefined,
        errorCode: undefined,
        errorMessage: undefined,
        requestedAt: now(),
        createdAt: now(),
        updatedAt: now(),
      };
      exportJobs.unshift(retried);
      addActivity(
        'EXPORT_RETRIED',
        input.access,
        schoolId,
        source.reportType,
        retried.id,
      );
      return mockSuccess(retried, 'Export Job queued for retry.', 0);
    },
    getActivities: () => clone(activities),
    reset() {
      savedFilters = clone(INITIAL_SAVED_REPORT_FILTERS);
      exportJobs = [];
      activities = [];
      sequence = 100;
    },
  };
  return service;
}

export const mockReportService = createMockReportService();
