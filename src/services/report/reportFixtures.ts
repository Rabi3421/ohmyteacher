import type { PermissionKey } from '../../constants/userPermissions';
import type {
  ReportCatalogItem,
  ReportCategory,
  ReportType,
  SavedReportFilter,
} from '../../models/report';

const formats = ['CSV', 'XLSX', 'PDF'] as const;
export const REPORT_FIXTURE_CLOCK = '2026-07-31T12:00:00.000Z';

const catalogRows: Array<
  readonly [ReportType, ReportCategory, string, string, PermissionKey]
> = [
  [
    'SCHOOL_OVERVIEW',
    'OVERVIEW',
    'School overview',
    'A concise operational snapshot.',
    'reports.dashboard.view',
  ],
  [
    'STUDENT_STATUS',
    'STUDENTS',
    'Student status',
    'Enrollment and profile status distribution.',
    'reports.students.view',
  ],
  [
    'FEE_OUTSTANDING',
    'FEES',
    'Fee outstanding',
    'Outstanding dues with aging.',
    'fee_reports.view',
  ],
  [
    'FEE_HEAD',
    'FEES',
    'Fee head',
    'Charges, collection and outstanding by Fee Head.',
    'fee_reports.view',
  ],
  [
    'CLASS_FEE',
    'FEES',
    'Class fee',
    'Class and Section fee performance.',
    'fee_reports.view',
  ],
  [
    'DISCOUNT_EXEMPTION',
    'FEES',
    'Discount and exemption',
    'Discounts and exemptions applied to dues.',
    'fee_reports.view',
  ],
  [
    'FINE_WAIVER',
    'FEES',
    'Fine waiver',
    'Fine charged and waived.',
    'fee_reports.view',
  ],
  [
    'ADVANCE_CREDIT',
    'FEES',
    'Advance credit',
    'Student advance credit movement.',
    'fee_reports.view',
  ],
  [
    'PAYMENT_REVERSAL',
    'FEES',
    'Payment reversal',
    'Reversed collections and reasons.',
    'fee_reports.view',
  ],
  [
    'DAILY_COLLECTION',
    'COLLECTIONS',
    'Daily collection',
    'Posted collection by date.',
    'reports.collections.view',
  ],
  [
    'PAYMENT_MODE',
    'COLLECTIONS',
    'Payment mode',
    'Posted collection by payment mode.',
    'reports.collections.view',
  ],
  [
    'COLLECTOR_COLLECTION',
    'COLLECTIONS',
    'Collector performance',
    'Collection volume by staff member.',
    'reports.collections.view',
  ],
  [
    'RECEIPTS',
    'COLLECTIONS',
    'Receipts',
    'Receipt status and amounts.',
    'reports.collections.view',
  ],
  [
    'MARKS_COMPLETION',
    'EXAMINATIONS',
    'Marks completion',
    'Exam and subject completion status.',
    'exam_reports.view',
  ],
  [
    'PASS_FAIL',
    'EXAMINATIONS',
    'Pass and fail',
    'Published result outcome distribution.',
    'exam_reports.view',
  ],
  [
    'GRADE_DISTRIBUTION',
    'EXAMINATIONS',
    'Grade distribution',
    'Published grades distribution.',
    'exam_reports.view',
  ],
  [
    'SUBJECT_PERFORMANCE',
    'EXAMINATIONS',
    'Subject performance',
    'Published average performance by subject.',
    'exam_reports.view',
  ],
  [
    'CLASS_SECTION_PERFORMANCE',
    'EXAMINATIONS',
    'Class and Section performance',
    'Published result performance by cohort.',
    'exam_reports.view',
  ],
  [
    'RANK_LIST',
    'EXAMINATIONS',
    'Rank list',
    'Published rank order.',
    'exam_reports.view',
  ],
  [
    'RESULT_PUBLICATION',
    'EXAMINATIONS',
    'Result publication',
    'Publication coverage and status.',
    'exam_reports.view',
  ],
  [
    'REPORT_CARD_GENERATION',
    'EXAMINATIONS',
    'Report Card generation',
    'Generation run status and coverage.',
    'exam_reports.view',
  ],
  [
    'COMMUNICATION_DELIVERY',
    'COMMUNICATION',
    'Communication delivery',
    'Provider and manual delivery outcomes.',
    'reports.communication.view',
  ],
];

export const REPORT_CATALOG: ReportCatalogItem[] = catalogRows.map(
  ([reportType, category, title, description, requiredPermission]) => ({
    reportType,
    category,
    title,
    description,
    requiredPermission,
    exportPermission:
      category === 'EXAMINATIONS'
        ? 'exam_reports.export'
        : category === 'FEES' || category === 'COLLECTIONS'
        ? 'fee_reports.export'
        : undefined,
    supportedFormats: [...formats],
  }),
);

export const INITIAL_SAVED_REPORT_FILTERS: SavedReportFilter[] = [];
