import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type { FeeStructureItem, FineRule } from '../../models/fee';
import type {
  FeeDue,
  FeeDueActivity,
  FeeDueDetails,
  FeeDueListItem,
  FeeGenerationPreview,
  FeeGenerationPreviewItem,
  FeeGenerationResultItem,
  FeeGenerationRun,
  FeeGenerationRunDetails,
  FeeGenerationWarning,
  FineRuleSnapshot,
  FineWaiver,
  PreviewFeeGenerationInput,
  StudentFeeDueSummary,
} from '../../models/feeDue';
import { rupeesToPaise } from '../../utils/feeCalculation';
import type { FeeDueClock } from '../../utils/feeDueClock';
import { fixedFeeDueClock, systemFeeDueClock } from '../../utils/feeDueClock';
import { calculateFine } from '../../utils/feeFineCalculation';
import {
  calculateOutstandingAmount,
  createFeeDueIdempotencyKey,
  deriveFeeDueStatus,
} from '../../utils/feeOutstandingCalculation';
import { generateFeeSchedule } from '../../utils/feeSchedule';
import { INITIAL_ACADEMIC_CLASSES, INITIAL_SECTIONS } from '../academic/academicFixtures';
import { ApiClientError } from '../api/apiError';
import { SCHOOL_AUTH_FIXTURES } from '../auth/authFixtures';
import {
  getMockFeeSetupRepositorySnapshot,
} from '../feeSetup/mockFeeSetupService';
import { mockDelay } from '../mock/mockDelay';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOL_SETTINGS,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import {
  INITIAL_GUARDIANS,
  INITIAL_PARENT_STUDENT_LINKS,
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_GUARDIAN_LINKS,
  INITIAL_STUDENT_PROFILES,
} from '../student/studentFixtures';
import {
  INITIAL_DUE_WAIVERS,
  INITIAL_FEE_DUES,
  INITIAL_FEE_DUE_ACTIVITIES,
  INITIAL_FEE_GENERATION_RUNS,
  INITIAL_FINE_WAIVERS,
} from './feeDueFixtures';
import type { FeeDueService } from './feeDueService';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
let dues: FeeDue[] = [];
let runs: FeeGenerationRun[] = [];
let runDetails = new Map<string, FeeGenerationRunDetails>();
let previews = new Map<string, FeeGenerationPreview>();
let activities: FeeDueActivity[] = [];
let fineWaivers: FineWaiver[] = [];
let dueWaivers = clone(INITIAL_DUE_WAIVERS);
let sequence = 1000;

export function getMockFeeDueRepositorySnapshot(): FeeDue[] {
  return clone(dues);
}

export function getMockFeeDueReportingSnapshot() {
  return clone({ activities, dueWaivers, fineWaivers, runs, dues });
}

export function updateMockFeeDuesAtomically(
  operation: (workingDues: FeeDue[]) => void,
): void {
  const working = clone(dues);
  operation(working);
  dues = working;
}

export function resetMockFeeDueData(): void {
  dues = clone(INITIAL_FEE_DUES);
  runs = clone(INITIAL_FEE_GENERATION_RUNS);
  runDetails = new Map(
    runs.map(run => [
      run.id,
      { items: [], run: clone(run), warnings: [] },
    ]),
  );
  previews = new Map();
  activities = clone(INITIAL_FEE_DUE_ACTIVITIES);
  fineWaivers = clone(INITIAL_FINE_WAIVERS);
  dueWaivers = clone(INITIAL_DUE_WAIVERS);
  sequence = 1000;
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { data: clone(data), message, success: true };
}

function fail(code: string, message: string, status = 409): never {
  throw new ApiClientError({ code, message, status });
}

function paginate<T>(items: T[], page = 1, pageSize = 20): PaginatedResponse<T> {
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

function context(schoolId: string, branchId: string, sessionId: string, mutable = false) {
  if (!INITIAL_SCHOOLS.some(school => school.id === schoolId)) {
    fail('SCHOOL_NOT_FOUND', 'School could not be found.', 404);
  }
  const branch = INITIAL_BRANCHES.find(
    item => item.id === branchId && item.schoolId === schoolId && item.status === 'ACTIVE',
  );
  if (!branch) fail('INVALID_FEE_DUE_BRANCH', 'Branch does not belong to this school.');
  const session = INITIAL_ACADEMIC_SESSIONS.find(
    item => item.id === sessionId && item.schoolId === schoolId,
  );
  if (!session) fail('INVALID_FEE_DUE_SESSION', 'Session does not belong to this school.');
  if (mutable && session.status === 'CLOSED') {
    fail('FEE_DUE_SESSION_CLOSED', 'Closed sessions are historical and read-only.');
  }
  return { branch, session };
}

function validateGenerationSelections(input: PreviewFeeGenerationInput) {
  if (input.generationType === 'CLASS' && !input.classIds.length) {
    fail('FEE_GENERATION_CLASS_REQUIRED', 'Select at least one Class.', 400);
  }
  if (input.generationType === 'SECTION' && !input.sectionIds.length) {
    fail('FEE_GENERATION_SECTION_REQUIRED', 'Select at least one Section.', 400);
  }
  if (
    ['INDIVIDUAL_STUDENT', 'SELECTED_STUDENTS'].includes(
      input.generationType,
    ) &&
    !input.studentIds.length
  ) {
    fail('FEE_GENERATION_STUDENT_REQUIRED', 'Select at least one Student.', 400);
  }
  if (input.feeScope === 'SELECTED' && !input.feeHeadIds.length) {
    fail('FEE_GENERATION_FEE_HEAD_REQUIRED', 'Select at least one Fee Head.', 400);
  }
  input.classIds.forEach(id => {
    const academicClass = INITIAL_ACADEMIC_CLASSES.find(
      item =>
        item.id === id &&
        item.schoolId === input.schoolId &&
        item.branchId === input.branchId &&
        item.academicSessionId === input.academicSessionId &&
        item.status === 'ACTIVE',
    );
    if (!academicClass) {
      fail(
        'INVALID_FEE_GENERATION_CLASS',
        'A selected Class is outside the generation context.',
      );
    }
  });
  input.sectionIds.forEach(id => {
    const section = INITIAL_SECTIONS.find(item => item.id === id);
    const academicClass = INITIAL_ACADEMIC_CLASSES.find(
      item =>
        item.id === section?.classId &&
        item.schoolId === input.schoolId &&
        item.branchId === input.branchId &&
        item.academicSessionId === input.academicSessionId &&
        item.status === 'ACTIVE',
    );
    if (!section || section.status !== 'ACTIVE' || !academicClass) {
      fail(
        'INVALID_FEE_GENERATION_SECTION',
        'A selected Section is outside the generation context.',
      );
    }
  });
  input.studentIds.forEach(id => {
    const student = INITIAL_STUDENT_PROFILES.find(
      item => item.id === id && item.schoolId === input.schoolId,
    );
    const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
      item =>
        item.studentId === id &&
        item.schoolId === input.schoolId &&
        item.branchId === input.branchId &&
        item.academicSessionId === input.academicSessionId,
    );
    if (!student || !enrollment) {
      fail(
        'INVALID_FEE_GENERATION_STUDENT',
        'A selected Student is outside the generation context.',
      );
    }
  });
  const setup = getMockFeeSetupRepositorySnapshot();
  input.feeHeadIds.forEach(id => {
    if (
      !setup.heads.some(
        item =>
          item.id === id &&
          item.schoolId === input.schoolId &&
          item.status === 'ACTIVE',
      )
    ) {
      fail(
        'INVALID_FEE_GENERATION_FEE_HEAD',
        'A selected Fee Head is outside the school.',
      );
    }
  });
}

function validateDueSnapshot(
  snapshot: NonNullable<FeeGenerationPreviewItem['snapshot']>,
) {
  const student = INITIAL_STUDENT_PROFILES.find(
    item =>
      item.id === snapshot.studentId &&
      item.schoolId === snapshot.schoolId,
  );
  const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
    item =>
      item.id === snapshot.enrollmentId &&
      item.studentId === snapshot.studentId &&
      item.schoolId === snapshot.schoolId &&
      item.branchId === snapshot.branchId &&
      item.academicSessionId === snapshot.academicSessionId,
  );
  const setup = getMockFeeSetupRepositorySnapshot();
  const assignment = setup.assignments.find(
    item =>
      item.id === snapshot.feeAssignmentId &&
      item.studentId === snapshot.studentId &&
      item.enrollmentId === snapshot.enrollmentId &&
      item.feeStructureId === snapshot.feeStructureId &&
      item.schoolId === snapshot.schoolId &&
      item.status === 'ACTIVE',
  );
  const structure = setup.structures.find(
    item =>
      item.id === snapshot.feeStructureId &&
      item.schoolId === snapshot.schoolId &&
      item.branchId === snapshot.branchId &&
      item.academicSessionId === snapshot.academicSessionId,
  );
  const structureItem = structure?.items.find(
    item =>
      item.id === snapshot.feeStructureItemId &&
      item.feeStructureId === snapshot.feeStructureId &&
      item.feeHeadId === snapshot.feeHeadId &&
      item.status === 'ACTIVE',
  );
  const feeHead = setup.heads.find(
    item =>
      item.id === snapshot.feeHeadId &&
      item.schoolId === snapshot.schoolId &&
      item.status === 'ACTIVE',
  );
  if (
    !student ||
    !enrollment ||
    !assignment ||
    !structure ||
    !structureItem ||
    !feeHead
  ) {
    fail(
      'FEE_GENERATION_SNAPSHOT_INVALID',
      'Generation snapshot relationships changed after preview.',
    );
  }
}

function findDue(schoolId: string, dueId: string) {
  return (
    dues.find(item => item.id === dueId && item.schoolId === schoolId) ??
    fail('FEE_DUE_NOT_FOUND', 'Fee Due was not found in this school.', 404)
  );
}

function guardianMobile(studentId: string) {
  const link = INITIAL_STUDENT_GUARDIAN_LINKS.find(
    item => item.studentId === studentId && item.status === 'ACTIVE' && item.isFeeContact,
  );
  return INITIAL_GUARDIANS.find(item => item.id === link?.guardianId)?.mobile;
}

function daysOverdue(dueDate: string, asOfDate: string) {
  return Math.max(
    0,
    Math.floor(
      (Date.parse(`${asOfDate}T00:00:00.000Z`) -
        Date.parse(`${dueDate}T00:00:00.000Z`)) /
        86_400_000,
    ),
  );
}

function dueView(due: FeeDue, asOfDate: string): FeeDueListItem {
  const outstanding = calculateOutstandingAmount(due);
  return {
    daysOverdue: daysOverdue(due.dueDate, asOfDate),
    due: {
      ...clone(due),
      outstandingAmountPaise: outstanding,
      status: deriveFeeDueStatus(due.dueDate, asOfDate, outstanding, due.status),
    },
    guardianMobile: guardianMobile(due.studentId),
  };
}

function details(due: FeeDue, asOfDate: string): FeeDueDetails {
  return {
    activities: activities
      .filter(item => item.feeDueId === due.id)
      .sort((a, b) => a.performedAt.localeCompare(b.performedAt)),
    dueWaiver: dueWaivers.find(item => item.feeDueId === due.id),
    fineWaivers: fineWaivers.filter(item => item.feeDueId === due.id),
    item: dueView(due, asOfDate),
  };
}

function record(
  due: FeeDue,
  action: FeeDueActivity['action'],
  userId: string,
  at: string,
  metadata?: FeeDueActivity['metadata'],
) {
  activities.push({
    academicSessionId: due.academicSessionId,
    action,
    branchId: due.branchId,
    feeDueId: due.id,
    generationRunId: due.generatedByRunId,
    id: `fee-due-activity-${++sequence}`,
    metadata,
    performedAt: at,
    performedByUserId: userId,
    schoolId: due.schoolId,
    studentId: due.studentId,
  });
}

function recordGeneration(
  input: {
    academicSessionId: string;
    branchId: string;
    schoolId: string;
  },
  action: FeeDueActivity['action'],
  userId: string,
  at: string,
  generationRunId?: string,
  metadata?: FeeDueActivity['metadata'],
) {
  activities.push({
    academicSessionId: input.academicSessionId,
    action,
    branchId: input.branchId,
    generationRunId,
    id: `fee-due-activity-${++sequence}`,
    metadata,
    performedAt: at,
    performedByUserId: userId,
    schoolId: input.schoolId,
  });
}

function fineSnapshot(rule?: FineRule): FineRuleSnapshot | undefined {
  if (!rule) return undefined;
  return {
    code: rule.code,
    dailyAmountPaise:
      rule.dailyAmount === undefined ? undefined : rupeesToPaise(rule.dailyAmount),
    fixedAmountPaise:
      rule.fixedAmount === undefined ? undefined : rupeesToPaise(rule.fixedAmount),
    graceDays: rule.graceDays,
    id: rule.id,
    maximumAmountPaise:
      rule.maximumAmount === undefined ? undefined : rupeesToPaise(rule.maximumAmount),
    name: rule.name,
    slabs: rule.slabs?.map(slab => ({
      amountPaise: rupeesToPaise(slab.amount),
      fromDay: slab.fromDay,
      toDay: slab.toDay,
    })),
    type: rule.type,
  };
}

function matchesScope(input: PreviewFeeGenerationInput, enrollment: (typeof INITIAL_STUDENT_ENROLLMENTS)[number]) {
  if (input.generationType === 'INDIVIDUAL_STUDENT' || input.generationType === 'SELECTED_STUDENTS') {
    return input.studentIds.includes(enrollment.studentId);
  }
  if (input.generationType === 'SECTION') return input.sectionIds.includes(enrollment.sectionId);
  if (input.generationType === 'CLASS') return input.classIds.includes(enrollment.classId);
  return (
    (!input.classIds.length || input.classIds.includes(enrollment.classId)) &&
    (!input.sectionIds.length || input.sectionIds.includes(enrollment.sectionId)) &&
    (!input.studentIds.length || input.studentIds.includes(enrollment.studentId))
  );
}

function itemSelected(
  item: FeeStructureItem,
  assignment: ReturnType<typeof getMockFeeSetupRepositorySnapshot>['assignments'][number],
) {
  return (
    item.mandatory ||
    item.applicability === 'ALL_STUDENTS' ||
    Boolean(
      assignment.optionalItemSelections.find(
        selection => selection.feeStructureItemId === item.id,
      )?.selected,
    )
  );
}

function generationItems(
  input: PreviewFeeGenerationInput,
): { items: FeeGenerationPreviewItem[]; totalStudents: number; eligibleStudents: number } {
  const setup = getMockFeeSetupRepositorySnapshot();
  const settings = INITIAL_SCHOOL_SETTINGS.find(item => item.schoolId === input.schoolId);
  const session = context(input.schoolId, input.branchId, input.academicSessionId).session;
  const enrollments = INITIAL_STUDENT_ENROLLMENTS.filter(
    item =>
      item.schoolId === input.schoolId &&
      item.branchId === input.branchId &&
      item.academicSessionId === input.academicSessionId &&
      matchesScope(input, item),
  );
  const output: FeeGenerationPreviewItem[] = [];
  let eligibleStudents = 0;

  enrollments.forEach(enrollment => {
    const student = INITIAL_STUDENT_PROFILES.find(item => item.id === enrollment.studentId)!;
    const academicClass = INITIAL_ACADEMIC_CLASSES.find(item => item.id === enrollment.classId);
    const section = INITIAL_SECTIONS.find(item => item.id === enrollment.sectionId);
    const assignment = setup.assignments.find(
      item => item.enrollmentId === enrollment.id && item.status === 'ACTIVE',
    );
    const skip = (reason: string) => {
      output.push({
        admissionNumber: student.admissionNumber,
        baseAmountPaise: 0,
        className: academicClass?.name ?? enrollment.classId,
        discountAmountPaise: 0,
        dueDate: undefined,
        enrollmentId: enrollment.id,
        feeHeadName: '—',
        idempotencyKey: `skip::${enrollment.id}::${reason}`,
        netAmountPaise: 0,
        periodKey: '—',
        periodLabel: '—',
        reason,
        sectionName: section?.name ?? enrollment.sectionId,
        status: 'SKIPPED',
        studentId: student.id,
        studentName: student.fullName,
      });
    };
    if (student.status !== 'ACTIVE') return skip('Student is inactive.');
    if (!['ACTIVE', 'TRANSFERRED'].includes(enrollment.status)) return skip('Enrollment is not eligible.');
    if (!assignment) return skip('Matching Fee Assignment is missing.');
    const structure = setup.structures.find(
      item =>
        item.id === assignment.feeStructureId &&
        item.schoolId === input.schoolId &&
        item.branchId === input.branchId &&
        item.academicSessionId === input.academicSessionId,
    );
    if (!structure) return skip('Fee Structure context is invalid.');
    eligibleStudents += 1;
    structure.items
      .filter(item => item.status === 'ACTIVE')
      .filter(item => itemSelected(item, assignment))
      .filter(item =>
        input.feeScope === 'RECURRING'
          ? item.frequency !== 'ONE_TIME'
          : input.feeScope === 'ONE_TIME'
            ? item.frequency === 'ONE_TIME'
            : input.feeScope === 'SELECTED'
              ? input.feeHeadIds.includes(item.feeHeadId)
              : true,
      )
      .forEach(item => {
        const schedule = generateFeeSchedule({
          academicSessionName: structure.academicSessionName,
          academicYearStartMonth: settings?.academicYearStartMonth ?? parseInt(session.startDate.slice(5, 7), 10),
          assignmentEffectiveDate: assignment.effectiveFrom,
          enrollmentEndDate: enrollment.endDate,
          enrollmentStartDate: enrollment.startDate,
          includePreviousEligiblePeriods: input.includePreviousEligiblePeriods,
          item,
          sessionEndDate: session.endDate,
          sessionStartDate: session.startDate,
          structureEffectiveDate: structure.effectiveFrom,
          useInstallments: Boolean(item.installmentCount),
        }).filter(period =>
          input.generationType === 'FULL_SESSION' ||
          !input.requestedPeriodKeys.length ||
          input.requestedPeriodKeys.includes(period.key),
        );
        schedule.forEach(period => {
          const head = setup.heads.find(candidate => candidate.id === item.feeHeadId);
          const override = assignment.amountOverrides.find(
            candidate => candidate.feeStructureItemId === item.id,
          );
          const baseAmountPaise = rupeesToPaise(item.amount);
          const effectiveAmountPaise =
            override?.type === 'EXEMPT'
              ? 0
              : override?.type === 'CUSTOM_AMOUNT'
                ? rupeesToPaise(override.customAmount ?? 0)
                : baseAmountPaise;
          const exemptionAmountPaise =
            override?.type === 'EXEMPT' ? baseAmountPaise : 0;
          const overrideAmountPaise = effectiveAmountPaise - baseAmountPaise + exemptionAmountPaise;
          const applicableDiscounts = assignment.discountAssignments
            .filter(discount => discount.status === 'ACTIVE' && discount.effectiveFrom <= period.endDate)
            .map(discount => ({
              assignment: discount,
              definition: setup.discounts.find(
                definition =>
                  definition.id === discount.discountDefinitionId &&
                  definition.status === 'ACTIVE' &&
                  definition.startDate <= period.endDate &&
                  (!definition.endDate || definition.endDate >= period.startDate),
              ),
            }))
            .filter(pair => Boolean(pair.definition))
            .filter(pair => {
              const ids = pair.assignment.feeHeadIds.length
                ? pair.assignment.feeHeadIds
                : pair.definition!.applicableFeeHeadIds;
              return !ids.length || ids.includes(item.feeHeadId);
            });
          let discountAmountPaise = 0;
          applicableDiscounts.forEach(pair => {
            const definition = pair.definition!;
            let amount =
              definition.type === 'FIXED'
                ? rupeesToPaise(definition.value)
                : Math.round((effectiveAmountPaise * definition.value) / 100);
            if (definition.maximumAmount !== undefined) {
              amount = Math.min(amount, rupeesToPaise(definition.maximumAmount));
            }
            discountAmountPaise = Math.min(
              effectiveAmountPaise,
              discountAmountPaise + Math.max(0, amount),
            );
          });
          const netFeeAmountPaise = Math.max(0, effectiveAmountPaise - discountAmountPaise);
          const key = createFeeDueIdempotencyKey({
            enrollmentId: enrollment.id,
            feeStructureItemId: item.id,
            periodKey: period.key,
            schoolId: input.schoolId,
            studentId: student.id,
          });
          const existing = dues.find(
            due =>
              createFeeDueIdempotencyKey({
                enrollmentId: due.enrollmentId,
                feeStructureItemId: due.feeStructureItemId,
                periodKey: due.periodKey,
                schoolId: due.schoolId,
                studentId: due.studentId,
              }) === key,
          );
          const snapshot: FeeGenerationPreviewItem['snapshot'] = {
            academicSessionId: input.academicSessionId,
            admissionNumberSnapshot: student.admissionNumber,
            baseAmountPaise,
            branchId: input.branchId,
            branchNameSnapshot: structure.branchName,
            calculationSnapshot: {
              applicability: item.applicability,
              discountNames: applicableDiscounts.map(pair => pair.definition!.name),
              dueRule: clone(item.dueRule),
              feeStructureItemId: item.id,
              feeStructureName: structure.name,
              frequency: item.frequency,
              generatedAsOfDate: input.asOfDate,
              mandatory: item.mandatory,
              overrideReason: override?.reason,
              overrideType: override?.type ?? 'DEFAULT_AMOUNT',
              selected: true,
              warnings: period.warnings,
            },
            classNameSnapshot: academicClass?.name ?? enrollment.classId,
            discountAmountPaise,
            dueDate: period.dueDate,
            enrollmentId: enrollment.id,
            exemptionAmountPaise,
            feeAssignmentId: assignment.id,
            feeHeadCodeSnapshot: head?.code ?? item.feeHeadId,
            feeHeadId: item.feeHeadId,
            feeHeadNameSnapshot: item.feeHeadName,
            feeStructureId: structure.id,
            feeStructureItemId: item.id,
            fineAmountPaise: 0,
            fineRuleSnapshot: fineSnapshot(
              setup.fineRules.find(rule => rule.id === item.fineRuleId),
            ),
            fineWaivedAmountPaise: 0,
            frequencySnapshot: item.frequency,
            installmentNumber: period.installmentNumber,
            netFeeAmountPaise,
            overrideAmountPaise,
            paidAmountPaise: 0,
            periodKey: period.key,
            periodLabel: period.label,
            periodType: period.type,
            schoolId: input.schoolId,
            sectionNameSnapshot: section?.name ?? enrollment.sectionId,
            studentId: student.id,
            studentNameSnapshot: student.fullName,
          };
          output.push({
            admissionNumber: student.admissionNumber,
            baseAmountPaise,
            className: academicClass?.name ?? enrollment.classId,
            discountAmountPaise,
            dueDate: period.dueDate,
            enrollmentId: enrollment.id,
            feeAssignmentId: assignment.id,
            feeHeadId: item.feeHeadId,
            feeHeadName: item.feeHeadName,
            feeStructureId: structure.id,
            feeStructureItemId: item.id,
            idempotencyKey: key,
            netAmountPaise: netFeeAmountPaise,
            periodKey: period.key,
            periodLabel: period.label,
            periodType: period.type,
            reason: existing ? 'Fee Due already exists.' : undefined,
            sectionName: section?.name ?? enrollment.sectionId,
            snapshot,
            status: existing ? 'EXISTING' : 'NEW',
            studentId: student.id,
            studentName: student.fullName,
          });
        });
      });
  });
  return { eligibleStudents, items: output, totalStudents: enrollments.length };
}

function summarizeWarnings(items: FeeGenerationPreviewItem[]): FeeGenerationWarning[] {
  const reasons = new Map<string, number>();
  items
    .filter(item => item.status === 'SKIPPED' || item.status === 'ERROR')
    .forEach(item => reasons.set(item.reason ?? 'Unknown warning', (reasons.get(item.reason ?? 'Unknown warning') ?? 0) + 1));
  return [...reasons].map(([message, count], index) => ({
    code: `GENERATION_WARNING_${index + 1}`,
    count,
    message,
  }));
}

function studentSummary(
  schoolId: string,
  studentId: string,
  asOfDate: string,
  academicSessionId?: string | 'ALL',
): StudentFeeDueSummary {
  const profile =
    INITIAL_STUDENT_PROFILES.find(item => item.id === studentId && item.schoolId === schoolId) ??
    fail('STUDENT_NOT_FOUND', 'Student was not found in this school.', 404);
  const items = dues
    .filter(item => item.schoolId === schoolId && item.studentId === studentId)
    .filter(
      item =>
        !academicSessionId ||
        academicSessionId === 'ALL' ||
        item.academicSessionId === academicSessionId,
    )
    .map(item => dueView(item, asOfDate))
    .sort((a, b) => a.due.dueDate.localeCompare(b.due.dueDate));
  const amount = (statuses: FeeDue['status'][]) =>
    items.filter(item => statuses.includes(item.due.status)).reduce(
      (sum, item) => sum + item.due.outstandingAmountPaise,
      0,
    );
  return {
    accruedFinePaise: items.reduce(
      (sum, item) => sum + Math.max(0, item.due.fineAmountPaise - item.due.fineWaivedAmountPaise),
      0,
    ),
    admissionNumber: profile.admissionNumber,
    cancelledAmountPaise: items.filter(item => item.due.status === 'CANCELLED').reduce((sum, item) => sum + item.due.netFeeAmountPaise, 0),
    dues: items,
    overdueAmountPaise: amount(['OVERDUE']),
    pendingAmountPaise: amount(['PENDING', 'PARTIALLY_PAID']),
    studentId,
    studentName: profile.fullName,
    totalGeneratedPaise: items.reduce((sum, item) => sum + item.due.netFeeAmountPaise, 0),
    totalOutstandingPaise: amount(['UPCOMING', 'PENDING', 'OVERDUE', 'PARTIALLY_PAID']),
    upcomingAmountPaise: amount(['UPCOMING']),
    waivedAmountPaise: items.filter(item => item.due.status === 'WAIVED').reduce((sum, item) => sum + item.due.netFeeAmountPaise + item.due.exemptionAmountPaise, 0),
  };
}

export function createMockFeeDueService(
  clock: FeeDueClock = systemFeeDueClock,
): FeeDueService {
  return {
    async getOutstandingSummary(schoolId, branchId, sessionId, asOfDate) {
      await mockDelay(70);
      context(schoolId, branchId, sessionId);
      const items = dues
        .filter(item => item.schoolId === schoolId && item.branchId === branchId && item.academicSessionId === sessionId)
        .map(item => dueView(item, asOfDate));
      const amount = (status: FeeDue['status']) =>
        items.filter(item => item.due.status === status).reduce((sum, item) => sum + item.due.outstandingAmountPaise, 0);
      const assignedEnrollmentIds = new Set(
        getMockFeeSetupRepositorySnapshot().assignments.map(item => item.enrollmentId),
      );
      const eligible = INITIAL_STUDENT_ENROLLMENTS.filter(
        item =>
          item.schoolId === schoolId &&
          item.branchId === branchId &&
          item.academicSessionId === sessionId &&
          item.status === 'ACTIVE',
      );
      return success({
        accruedFinePaise: items.reduce((sum, item) => sum + Math.max(0, item.due.fineAmountPaise - item.due.fineWaivedAmountPaise), 0),
        asOfDate,
        latestGenerationRun: runs
          .filter(item => item.schoolId === schoolId && item.branchId === branchId && item.academicSessionId === sessionId)
          .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))[0],
        overdueAmountPaise: amount('OVERDUE'),
        pendingAmountPaise: amount('PENDING'),
        studentsWithOutstanding: new Set(items.filter(item => item.due.outstandingAmountPaise > 0).map(item => item.due.studentId)).size,
        totalOutstandingPaise: items.reduce((sum, item) => sum + item.due.outstandingAmountPaise, 0),
        unassignedEligibleStudents: eligible.filter(item => !assignedEnrollmentIds.has(item.id)).length,
        upcomingAmountPaise: amount('UPCOMING'),
      });
    },

    async previewFeeGeneration(schoolId, input) {
      await mockDelay(110);
      if (input.schoolId !== schoolId) fail('FEE_GENERATION_SCHOOL_MISMATCH', 'Generation school does not match the route.');
      context(schoolId, input.branchId, input.academicSessionId, true);
      validateGenerationSelections(input);
      const generated = generationItems(input);
      const now = clock.now();
      const preview: FeeGenerationPreview = {
        candidateDueCount: generated.items.filter(item => item.status === 'NEW' || item.status === 'EXISTING').length,
        context: {
          academicSessionId: input.academicSessionId,
          asOfDate: input.asOfDate,
          branchId: input.branchId,
          schoolId,
        },
        eligibleStudents: generated.eligibleStudents,
        errorCount: generated.items.filter(item => item.status === 'ERROR').length,
        existingDueCount: generated.items.filter(item => item.status === 'EXISTING').length,
        expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        generatedAt: now.toISOString(),
        input: clone(input),
        items: generated.items,
        newDueCount: generated.items.filter(item => item.status === 'NEW').length,
        previewId: `fee-preview-${++sequence}`,
        requestedPeriods: [...new Map(generated.items.filter(item => item.periodKey !== '—').map(item => [item.periodKey, { key: item.periodKey, label: item.periodLabel }])).values()],
        skippedCount: generated.items.filter(item => item.status === 'SKIPPED').length,
        totalAmountPaise: generated.items.filter(item => item.status === 'NEW').reduce((sum, item) => sum + item.netAmountPaise, 0),
        totalStudents: generated.totalStudents,
        warnings: summarizeWarnings(generated.items),
      };
      previews.set(preview.previewId, clone(preview));
      recordGeneration(
        preview.context,
        'FEE_GENERATION_PREVIEWED',
        input.requestedByUserId,
        now.toISOString(),
        undefined,
        {
          newDueCount: preview.newDueCount,
          previewId: preview.previewId,
          totalAmountPaise: preview.totalAmountPaise,
        },
      );
      return success(preview, 'Generation preview created without changing Fee Dues.');
    },

    async commitFeeGeneration(schoolId, input) {
      await mockDelay(130);
      if (input.schoolId !== schoolId) fail('FEE_GENERATION_SCHOOL_MISMATCH', 'Generation school does not match.');
      const preview = previews.get(input.previewId) ??
        fail('INVALID_FEE_GENERATION_PREVIEW', 'Preview is missing or expired.', 409);
      if (preview.context.schoolId !== schoolId || preview.expiresAt < clock.now().toISOString()) {
        fail('INVALID_FEE_GENERATION_PREVIEW', 'Preview is invalid or expired.', 409);
      }
      const { branch, session } = context(
        schoolId,
        preview.context.branchId,
        preview.context.academicSessionId,
        true,
      );
      const now = clock.now().toISOString();
      const runId = `fee-run-${++sequence}`;
      const resultItems: FeeGenerationResultItem[] = [];
      const pendingCreates = preview.items.filter(item => item.status === 'NEW');
      recordGeneration(
        preview.context,
        'FEE_GENERATION_STARTED',
        input.requestedByUserId,
        now,
        runId,
        { previewId: preview.previewId },
      );
      if (pendingCreates.some(item => !item.snapshot)) {
        recordGeneration(
          preview.context,
          'FEE_GENERATION_FAILED',
          input.requestedByUserId,
          now,
          runId,
          { reason: 'Generation snapshot is incomplete.' },
        );
        fail('FEE_GENERATION_SNAPSHOT_INVALID', 'Generation snapshot is incomplete.');
      }
      validateGenerationSelections(preview.input);
      pendingCreates.forEach(item => validateDueSnapshot(item.snapshot!));
      pendingCreates.forEach(item => {
        const snapshot = item.snapshot!;
        const id = `fee-due-${++sequence}`;
        const outstandingAmountPaise = calculateOutstandingAmount({
          fineAmountPaise: snapshot.fineAmountPaise,
          fineWaivedAmountPaise: snapshot.fineWaivedAmountPaise,
          netFeeAmountPaise: snapshot.netFeeAmountPaise,
          paidAmountPaise: snapshot.paidAmountPaise,
          status: 'PENDING',
        });
        const due: FeeDue = {
          ...clone(snapshot),
          createdAt: now,
          generatedAt: now,
          generatedByRunId: runId,
          id,
          outstandingAmountPaise,
          status: deriveFeeDueStatus(snapshot.dueDate, preview.context.asOfDate, outstandingAmountPaise),
          updatedAt: now,
        };
        dues.push(due);
        record(due, 'FEE_DUE_CREATED', input.requestedByUserId, now);
        resultItems.push({ feeDueId: id, idempotencyKey: item.idempotencyKey, status: 'CREATED' });
      });
      preview.items
        .filter(item => item.status !== 'NEW')
        .forEach(item => resultItems.push({
          idempotencyKey: item.idempotencyKey,
          reason: item.reason,
          status: item.status,
        }));
      const failedCount = resultItems.filter(item => item.status === 'ERROR').length;
      const skippedCount = resultItems.filter(item => item.status === 'SKIPPED').length;
      const status = failedCount || skippedCount ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
      const run: FeeGenerationRun = {
        academicSessionId: preview.context.academicSessionId,
        academicSessionName: session.name,
        branchId: preview.context.branchId,
        branchName: branch.name,
        classIds: preview.input.classIds,
        completedAt: now,
        createdAt: now,
        createdCount: pendingCreates.length,
        existingCount: preview.existingDueCount,
        failedCount,
        feeHeadIds: preview.input.feeHeadIds,
        generationType: preview.input.generationType,
        id: runId,
        requestedAt: now,
        requestedByUserId: input.requestedByUserId,
        requestedPeriods: preview.input.requestedPeriodKeys,
        schoolId,
        sectionIds: preview.input.sectionIds,
        skippedCount,
        status,
        studentIds: preview.input.studentIds,
        totalCandidates: preview.candidateDueCount,
        totalGeneratedAmountPaise: pendingCreates.reduce((sum, item) => sum + item.netAmountPaise, 0),
      };
      runs.push(run);
      runDetails.set(run.id, { items: resultItems, run: clone(run), warnings: preview.warnings });
      recordGeneration(
        preview.context,
        status === 'COMPLETED'
          ? 'FEE_GENERATION_COMPLETED'
          : 'FEE_GENERATION_PARTIALLY_COMPLETED',
        input.requestedByUserId,
        now,
        runId,
        {
          createdCount: run.createdCount,
          existingCount: run.existingCount,
          failedCount: run.failedCount,
          skippedCount: run.skippedCount,
        },
      );
      previews.delete(preview.previewId);
      return success({
        createdCount: run.createdCount,
        existingCount: run.existingCount,
        failedCount,
        generationRunId: run.id,
        items: resultItems,
        skippedCount,
        status,
        totalGeneratedAmountPaise: run.totalGeneratedAmountPaise,
      }, 'Fee Due generation completed.');
    },

    async getGenerationHistory(schoolId, query) {
      await mockDelay(70);
      const items = runs
        .filter(item => item.schoolId === schoolId)
        .filter(item => !query.branchId || query.branchId === 'ALL' || item.branchId === query.branchId)
        .filter(item => !query.academicSessionId || query.academicSessionId === 'ALL' || item.academicSessionId === query.academicSessionId)
        .filter(item => !query.status || query.status === 'ALL' || item.status === query.status)
        .filter(item => !query.generationType || query.generationType === 'ALL' || item.generationType === query.generationType)
        .filter(item => !query.requestedByUserId || item.requestedByUserId === query.requestedByUserId)
        .filter(item => !query.dateFrom || item.requestedAt.slice(0, 10) >= query.dateFrom)
        .filter(item => !query.dateTo || item.requestedAt.slice(0, 10) <= query.dateTo)
        .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
      return success(paginate(items, query.page, query.pageSize));
    },

    async getGenerationRun(schoolId, id) {
      await mockDelay(60);
      const item = runDetails.get(id);
      if (!item || item.run.schoolId !== schoolId) fail('FEE_GENERATION_RUN_NOT_FOUND', 'Generation Run was not found.', 404);
      return success(item);
    },

    async getFeeDues(schoolId, query) {
      await mockDelay(80);
      const search = query.search?.trim().toLowerCase();
      let items = dues
        .filter(item => item.schoolId === schoolId)
        .map(item => dueView(item, query.asOfDate))
        .filter(item => !query.branchId || query.branchId === 'ALL' || item.due.branchId === query.branchId)
        .filter(item => !query.academicSessionId || query.academicSessionId === 'ALL' || item.due.academicSessionId === query.academicSessionId)
        .filter(item => !query.studentId || item.due.studentId === query.studentId)
        .filter(item => !query.classId || query.classId === 'ALL' || item.due.classNameSnapshot === query.classId || INITIAL_ACADEMIC_CLASSES.find(value => value.id === query.classId)?.name === item.due.classNameSnapshot)
        .filter(item => !query.sectionId || query.sectionId === 'ALL' || item.due.sectionNameSnapshot === query.sectionId || INITIAL_SECTIONS.find(value => value.id === query.sectionId)?.name === item.due.sectionNameSnapshot)
        .filter(item => !query.feeHeadId || query.feeHeadId === 'ALL' || item.due.feeHeadId === query.feeHeadId)
        .filter(item => !query.periodKey || query.periodKey === 'ALL' || item.due.periodKey === query.periodKey)
        .filter(item => {
          if (!query.status || query.status === 'ALL') return true;
          return Array.isArray(query.status)
            ? query.status.includes(item.due.status)
            : item.due.status === query.status;
        })
        .filter(item => !query.guardianMobile || item.guardianMobile?.includes(query.guardianMobile))
        .filter(item => !search || item.due.studentNameSnapshot.toLowerCase().includes(search) || item.due.admissionNumberSnapshot.toLowerCase().includes(search) || item.guardianMobile?.includes(search));
      items = items.sort((left, right) => {
        if (query.sort === 'OUTSTANDING_DESC') return right.due.outstandingAmountPaise - left.due.outstandingAmountPaise;
        if (query.sort === 'DAYS_OVERDUE_DESC') return right.daysOverdue - left.daysOverdue;
        return query.sort === 'DUE_DATE_DESC'
          ? right.due.dueDate.localeCompare(left.due.dueDate)
          : left.due.dueDate.localeCompare(right.due.dueDate);
      });
      return success(paginate(items, query.page, query.pageSize));
    },

    async getStudentFeeDues(schoolId, studentId, query = { asOfDate: clock.today() }) {
      await mockDelay(70);
      const summary = studentSummary(
        schoolId,
        studentId,
        query.asOfDate,
        query.academicSessionId,
      );
      return success(summary);
    },

    async getFeeDue(schoolId, dueId) {
      await mockDelay(60);
      return success(details(findDue(schoolId, dueId), clock.today()));
    },

    async calculateFinePreview(schoolId, dueId, asOfDate) {
      await mockDelay(60);
      const due = findDue(schoolId, dueId);
      return success(calculateFine({ asOfDate, due, fineRuleSnapshot: due.fineRuleSnapshot }));
    },

    async refreshFeeDueFine(schoolId, dueId, asOfDate, requestedByUserId) {
      await mockDelay(80);
      const due = findDue(schoolId, dueId);
      context(schoolId, due.branchId, due.academicSessionId, true);
      const result = calculateFine({ asOfDate, due, fineRuleSnapshot: due.fineRuleSnapshot });
      const before = due.fineAmountPaise;
      due.fineAmountPaise = result.fineAmountPaise;
      due.fineCalculatedThrough = asOfDate;
      due.outstandingAmountPaise = result.outstandingAmountPaise;
      due.status = deriveFeeDueStatus(due.dueDate, asOfDate, due.outstandingAmountPaise, due.status);
      due.updatedAt = clock.now().toISOString();
      record(due, 'FEE_FINE_REFRESHED', requestedByUserId, due.updatedAt, { before, after: due.fineAmountPaise });
      return success(details(due, asOfDate), 'Accrued Fine refreshed from its snapshot.');
    },

    async bulkRefreshFines(schoolId, input) {
      await mockDelay(100);
      context(schoolId, input.branchId, input.academicSessionId, true);
      const targets = dues.filter(
        due =>
          due.schoolId === schoolId &&
          due.branchId === input.branchId &&
          due.academicSessionId === input.academicSessionId &&
          (!input.feeDueIds?.length || input.feeDueIds.includes(due.id)) &&
          (!input.studentIds?.length || input.studentIds.includes(due.studentId)) &&
          (!input.classIds?.length || input.classIds.some(id => INITIAL_ACADEMIC_CLASSES.find(value => value.id === id)?.name === due.classNameSnapshot)),
      );
      let changedCount = 0;
      let unchangedCount = 0;
      targets.forEach(due => {
        const result = calculateFine({ asOfDate: input.asOfDate, due, fineRuleSnapshot: due.fineRuleSnapshot });
        if (due.fineAmountPaise === result.fineAmountPaise) unchangedCount += 1;
        else changedCount += 1;
        due.fineAmountPaise = result.fineAmountPaise;
        due.fineCalculatedThrough = input.asOfDate;
        due.outstandingAmountPaise = result.outstandingAmountPaise;
        due.status = deriveFeeDueStatus(due.dueDate, input.asOfDate, due.outstandingAmountPaise, due.status);
        due.updatedAt = clock.now().toISOString();
        record(due, 'FEE_FINE_REFRESHED', input.requestedByUserId, due.updatedAt);
      });
      return success({ changedCount, errorCount: 0, feeDueIds: targets.map(item => item.id), unchangedCount });
    },

    async waiveFeeDueFine(schoolId, dueId, input) {
      await mockDelay(80);
      const due = findDue(schoolId, dueId);
      context(schoolId, due.branchId, due.academicSessionId, true);
      if (!input.reason.trim()) fail('FINE_WAIVER_REASON_REQUIRED', 'Fine waiver reason is required.', 400);
      const available = Math.max(0, due.fineAmountPaise - due.fineWaivedAmountPaise);
      const amount = input.type === 'FULL_FINE' ? available : input.amountPaise;
      if (amount <= 0 || amount > available) fail('INVALID_FINE_WAIVER_AMOUNT', 'Fine waiver cannot exceed the current unwaived Fine.', 400);
      const at = clock.now().toISOString();
      due.fineWaivedAmountPaise += amount;
      due.outstandingAmountPaise = calculateOutstandingAmount(due);
      due.updatedAt = at;
      fineWaivers.push({
        amountPaise: amount,
        approvedAt: at,
        approvedByUserId: input.approvedByUserId,
        feeDueId: due.id,
        id: `fine-waiver-${++sequence}`,
        reason: input.reason.trim(),
        type: input.type,
      });
      record(due, 'FEE_FINE_WAIVED', input.approvedByUserId, at, { amountPaise: amount });
      return success(details(due, clock.today()), 'Fine waiver recorded.');
    },

    async waiveFeeDue(schoolId, dueId, input) {
      await mockDelay(80);
      const due = findDue(schoolId, dueId);
      context(schoolId, due.branchId, due.academicSessionId, true);
      if (!input.reason.trim()) fail('FEE_DUE_WAIVER_REASON_REQUIRED', 'Fee Due waiver reason is required.', 400);
      if (due.paidAmountPaise > 0) fail('FEE_DUE_HAS_PAYMENTS', 'A Fee Due with payment allocations cannot be waived.');
      if (due.status === 'CANCELLED') fail('FEE_DUE_CANCELLED', 'Cancelled Fee Due cannot be waived.');
      const at = clock.now().toISOString();
      due.status = 'WAIVED';
      due.outstandingAmountPaise = 0;
      due.waivedAt = at;
      due.waivedByUserId = input.approvedByUserId;
      due.waiverReason = input.reason.trim();
      due.updatedAt = at;
      dueWaivers.push({
        approvedAt: at,
        approvedByUserId: input.approvedByUserId,
        feeDueId: due.id,
        id: `due-waiver-${++sequence}`,
        reason: input.reason.trim(),
      });
      record(due, 'FEE_DUE_WAIVED', input.approvedByUserId, at);
      return success(details(due, clock.today()), 'Fee Due fully waived.');
    },

    async cancelFeeDue(schoolId, dueId, input) {
      await mockDelay(80);
      const due = findDue(schoolId, dueId);
      context(schoolId, due.branchId, due.academicSessionId, true);
      if (!input.reason.trim()) fail('FEE_DUE_CANCELLATION_REASON_REQUIRED', 'Cancellation reason is required.', 400);
      if (due.paidAmountPaise > 0) fail('FEE_DUE_HAS_PAYMENTS', 'A Fee Due with payment allocations cannot be cancelled.');
      if (due.status === 'WAIVED') fail('FEE_DUE_WAIVED', 'Waived Fee Due cannot be cancelled.');
      const at = clock.now().toISOString();
      due.cancellationReason = input.reason.trim();
      due.cancelledAt = at;
      due.cancelledByUserId = input.cancelledByUserId;
      due.outstandingAmountPaise = 0;
      due.status = 'CANCELLED';
      due.updatedAt = at;
      record(due, 'FEE_DUE_CANCELLED', input.cancelledByUserId, at);
      return success(details(due, clock.today()), 'Fee Due cancelled without deletion.');
    },

    async getParentStudentFees(schoolId, parentMembershipId, studentId, asOfDate) {
      await mockDelay(70);
      const linked = INITIAL_PARENT_STUDENT_LINKS.some(
        item =>
          item.schoolId === schoolId &&
          item.parentMembershipId === parentMembershipId &&
          item.studentId === studentId &&
          item.status === 'ACTIVE',
      );
      if (!linked) fail('PARENT_FEE_OWNERSHIP_DENIED', 'This child is not linked to the active Parent membership.', 403);
      return success(studentSummary(schoolId, studentId, asOfDate));
    },

    async getStudentSelfFees(schoolId, membershipId, asOfDate) {
      await mockDelay(70);
      const membership = Object.values(SCHOOL_AUTH_FIXTURES)
        .flatMap(item => item.memberships)
        .find(item => item.id === membershipId && item.schoolId === schoolId && item.role === 'STUDENT' && item.status === 'ACTIVE');
      if (!membership?.studentId) fail('STUDENT_FEE_OWNERSHIP_DENIED', 'Student membership is not linked to an active Student.', 403);
      return success(studentSummary(schoolId, membership.studentId, asOfDate));
    },
  };
}

resetMockFeeDueData();
export const mockFeeDueService = createMockFeeDueService(
  fixedFeeDueClock('2026-07-31T12:00:00.000Z'),
);
