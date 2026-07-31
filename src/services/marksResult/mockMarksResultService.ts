import type { Exam, ExamClassConfiguration } from '../../models/examination';
import type {
  CalculateResultsInput,
  MarkSheet,
  MarkSheetDetails,
  MarkSheetHistoryRecord,
  MarkSheetReviewSummary,
  PublishedResultSnapshot,
  ResultCalculationPreview,
  ResultCalculationResult,
  ResultCalculationRun,
  ResultListQuery,
  ResultPublicationBatch,
  ResultReviewRecord,
  SaveMarkSheetDraftInput,
  StudentOverallResult,
  StudentPaperMark,
  StudentSubjectResult,
} from '../../models/marksResult';
import type { StudentEnrollment, StudentProfile } from '../../models/student';
import { deriveExamLifecycle } from '../../utils/resultCompleteness';
import { calculateOverallResult } from '../../utils/overallResultCalculation';
import {
  calculateCompetitionRanks,
  toRankEntries,
} from '../../utils/resultRanking';
import { validateResultPublication } from '../../utils/resultPublication';
import { averagePercentages } from '../../utils/resultPercentage';
import { calculateSubjectResult } from '../../utils/subjectResultCalculation';
import {
  validateMarkSheetMarks,
  validateStudentPaperMark,
} from '../../utils/marksValidation';
import { ApiClientError } from '../api/apiError';
import {
  INITIAL_EXAM_CLASS_CONFIGURATIONS,
  INITIAL_EXAMS,
  INITIAL_EXAM_SUBJECT_PAPERS,
  INITIAL_GRADING_SCHEMES,
} from '../examinationSetup/examinationSetupFixtures';
import {
  getExamLifecycleStatus,
  setExamLifecycleStatus,
} from '../examinationSetup/examinationLifecycleRepository';
import { mockPaginated, mockSuccess } from '../mock/mockResponse';
import { INITIAL_ACADEMIC_SESSIONS } from '../organization/organizationFixtures';
import {
  INITIAL_STUDENT_ENROLLMENTS,
  INITIAL_STUDENT_PROFILES,
} from '../student/studentFixtures';
import {
  ATTENDANCE_FIXTURE_SEQUENCE,
  MARKS_RESULT_FIXTURE_CLOCK,
} from './marksResultFixtures';
import type { MarksResultService } from './marksResultService';
import { publishedResultRepository } from './publishedResultRepository';
import { createMockResultPublicationNotifications } from '../communication/mockCommunicationService';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const omitKeys = <T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Omit<T, K> =>
  Object.fromEntries(
    Object.entries(value).filter(([key]) => !keys.includes(key as K)),
  ) as Omit<T, K>;

export interface MockMarksResultOptions {
  now?: () => string;
  seedState?: 'NOT_STARTED' | 'COMPLETE_DRAFT' | 'SUBMITTED' | 'LOCKED';
  failNextDraftSave?: boolean;
  failNextCalculation?: boolean;
  failNextPublication?: boolean;
  syncPublishedResultRepository?: boolean;
}

function fail(code: string, message: string, status = 409): never {
  throw new ApiClientError({ code, message, status });
}

function eligibleEnrollment(
  enrollment: StudentEnrollment,
  exam: Exam,
  configuration: ExamClassConfiguration,
  sectionId: string,
): boolean {
  return (
    enrollment.schoolId === exam.schoolId &&
    enrollment.branchId === exam.branchId &&
    enrollment.academicSessionId === exam.academicSessionId &&
    enrollment.classId === configuration.classId &&
    enrollment.sectionId === sectionId &&
    ['ACTIVE', 'TRANSFERRED', 'COMPLETED'].includes(enrollment.status) &&
    enrollment.startDate <= exam.endDate &&
    (!enrollment.endDate || enrollment.endDate >= exam.startDate)
  );
}

export function createMockMarksResultService(
  options: MockMarksResultOptions = {},
): MarksResultService & {
  getExamStatus: (examId: string) => Exam['status'];
  getPublishedSnapshots: () => PublishedResultSnapshot[];
  getRepositorySnapshot: () => { sheets: MarkSheet[] };
} {
  const now = options.now ?? (() => MARKS_RESULT_FIXTURE_CLOCK);
  let sequence = 1000;
  const nextId = (prefix: string) => `${prefix}-${++sequence}`;
  let failDraft = options.failNextDraftSave ?? false;
  let failCalculation = options.failNextCalculation ?? false;
  let failPublication = options.failNextPublication ?? false;
  let sheets: MarkSheet[] = [];
  let marks: StudentPaperMark[] = [];
  let history: MarkSheetHistoryRecord[] = [];
  let previews: ResultCalculationPreview[] = [];
  let runs: ResultCalculationRun[] = [];
  let subjectResults: StudentSubjectResult[] = [];
  let overallResults: StudentOverallResult[] = [];
  let reviews: ResultReviewRecord[] = [];
  let publications: ResultPublicationBatch[] = [];
  let publishedSnapshots: PublishedResultSnapshot[] = [];

  const success = <T>(data: T, message: string) =>
    mockSuccess(clone(data), message, 0);
  const examFor = (schoolId: string, examId: string): Exam => {
    const exam = INITIAL_EXAMS.find(
      item => item.id === examId && item.schoolId === schoolId,
    );
    if (!exam)
      fail('EXAM_SCOPE_MISMATCH', 'Exam was not found in this School.', 403);
    return { ...exam, status: getExamLifecycleStatus(exam.id, exam.status) };
  };
  const sessionFor = (exam: Exam) =>
    INITIAL_ACADEMIC_SESSIONS.find(
      item =>
        item.id === exam.academicSessionId && item.schoolId === exam.schoolId,
    ) ?? fail('SESSION_SCOPE_MISMATCH', 'Academic Session was not found.', 403);
  const mutableExam = (schoolId: string, examId: string) => {
    const exam = examFor(schoolId, examId);
    if (sessionFor(exam).status === 'CLOSED')
      fail(
        'CLOSED_ACADEMIC_SESSION',
        'Closed Academic Sessions are read-only.',
      );
    if (exam.status === 'DRAFT' || exam.status === 'CANCELLED')
      fail(
        'EXAM_NOT_READY_FOR_MARKS',
        'Only Scheduled or active Exams support Marks Entry.',
      );
    return exam;
  };
  const sheetFor = (schoolId: string, examId: string, markSheetId: string) => {
    examFor(schoolId, examId);
    return (
      sheets.find(
        item =>
          item.id === markSheetId &&
          item.examId === examId &&
          item.schoolId === schoolId,
      ) ?? fail('MARK_SHEET_NOT_FOUND', 'Mark Sheet was not found.', 404)
    );
  };
  const configurationFor = (sheet: MarkSheet) =>
    INITIAL_EXAM_CLASS_CONFIGURATIONS.find(
      item => item.id === sheet.examClassConfigurationId,
    ) ??
    fail(
      'EXAM_CLASS_CONFIGURATION_NOT_FOUND',
      'Exam Class configuration is unavailable.',
      409,
    );
  const gradingFor = (configuration: ExamClassConfiguration) =>
    INITIAL_GRADING_SCHEMES.find(
      item => item.id === configuration.gradingSchemeId,
    ) ??
    fail(
      'GRADING_SNAPSHOT_NOT_FOUND',
      'Grading Scheme snapshot is unavailable.',
      409,
    );
  const profileFor = (studentId: string): StudentProfile =>
    INITIAL_STUDENT_PROFILES.find(item => item.id === studentId) ??
    fail('STUDENT_NOT_FOUND', 'Student was not found.', 404);

  const seed = options.seedState ?? 'NOT_STARTED';
  INITIAL_EXAMS.filter(item => item.status === 'SCHEDULED').forEach(exam => {
    const examConfigurations = INITIAL_EXAM_CLASS_CONFIGURATIONS.filter(
      item => item.examId === exam.id && item.status === 'ACTIVE',
    );
    examConfigurations.forEach(configuration => {
      const examPapers = INITIAL_EXAM_SUBJECT_PAPERS.filter(
        item =>
          item.examId === exam.id &&
          item.examClassConfigurationId === configuration.id &&
          item.status === 'SCHEDULED',
      );
      configuration.sectionIds.forEach(sectionId => {
        examPapers.forEach(paper => {
          const createdAt = now();
          const sheetId = `mark-sheet-${exam.id}-${sectionId}-${paper.id}`;
          const enrollments = INITIAL_STUDENT_ENROLLMENTS.filter(item =>
            eligibleEnrollment(item, exam, configuration, sectionId),
          );
          const scheme = gradingFor(configuration);
          const studentMarks = enrollments.map(
            (enrollment, index): StudentPaperMark => {
              const scenario = ATTENDANCE_FIXTURE_SEQUENCE.find(
                item => item.studentId === enrollment.studentId,
              );
              const attendanceStatus =
                seed === 'NOT_STARTED'
                  ? 'PRESENT'
                  : scenario?.attendanceStatus ?? 'PRESENT';
              const componentMarks = paper.components.map(
                (component, componentIndex) => ({
                  assessmentComponentId: component.id,
                  componentNameSnapshot: component.name,
                  componentTypeSnapshot: component.type,
                  marksEntryRequiredSnapshot: component.marksEntryRequired,
                  maximumMarksSnapshot: component.maximumMarks,
                  passMarksSnapshot: component.passMarks,
                  marksObtained:
                    seed === 'NOT_STARTED' || attendanceStatus !== 'PRESENT'
                      ? undefined
                      : index === 0
                      ? 0
                      : Math.max(
                          0,
                          (component.passMarks ?? 1) + componentIndex,
                        ),
                }),
              );
              return {
                academicSessionId: exam.academicSessionId,
                attendanceStatus,
                branchId: exam.branchId,
                componentMarks,
                createdAt,
                enrollmentId: enrollment.id,
                examClassConfigurationId: configuration.id,
                examId: exam.id,
                exemptionReason:
                  attendanceStatus === 'EXEMPT'
                    ? 'Approved academic exemption'
                    : undefined,
                gradeBandsSnapshot: clone(scheme.bands),
                gradingSchemeIdSnapshot: scheme.id,
                id: `${sheetId}-${enrollment.studentId}`,
                markSheetId: sheetId,
                paperMaximumMarksSnapshot: paper.totalMaximumMarks,
                paperPassMarksSnapshot: paper.totalPassMarks,
                schoolId: exam.schoolId,
                sectionId,
                studentId: enrollment.studentId,
                subjectCodeSnapshot: paper.subjectCodeSnapshot,
                subjectId: paper.subjectId,
                subjectNameSnapshot: paper.subjectNameSnapshot,
                subjectPaperId: paper.id,
                subjectTypeSnapshot: paper.subjectTypeSnapshot,
                totalMarksObtained: undefined,
                updatedAt: createdAt,
                version: 1,
              };
            },
          );
          studentMarks.forEach(mark => {
            mark.totalMarksObtained =
              validateStudentPaperMark(mark).totalMarksObtained;
          });
          marks.push(...studentMarks);
          sheets.push({
            academicSessionId: exam.academicSessionId,
            branchId: exam.branchId,
            classNameSnapshot: configuration.classNameSnapshot,
            completedStudentCount: 0,
            createdAt,
            examClassConfigurationId: configuration.id,
            examId: exam.id,
            exemptCount: 0,
            id: sheetId,
            invalidStudentCount: 0,
            paperMaximumMarksSnapshot: paper.totalMaximumMarks,
            paperPassMarksSnapshot: paper.totalPassMarks,
            presentCount: studentMarks.length,
            absentCount: 0,
            schoolId: exam.schoolId,
            scheduledAt:
              paper.examDate && paper.startTime
                ? `${paper.examDate}T${paper.startTime}:00`
                : undefined,
            sectionId,
            sectionNameSnapshot:
              configuration.sectionSnapshots.find(item => item.id === sectionId)
                ?.name ?? sectionId,
            status:
              seed === 'NOT_STARTED'
                ? 'NOT_STARTED'
                : seed === 'COMPLETE_DRAFT'
                ? 'DRAFT'
                : seed,
            studentCount: studentMarks.length,
            subjectCodeSnapshot: paper.subjectCodeSnapshot,
            subjectNameSnapshot: paper.subjectNameSnapshot,
            subjectPaperId: paper.id,
            updatedAt: createdAt,
            version: 1,
          });
        });
      });
    });
  });

  const sheetMarks = (sheetId: string) =>
    marks.filter(item => item.markSheetId === sheetId);
  const updateCounts = (sheet: MarkSheet) => {
    const values = sheetMarks(sheet.id);
    const validations = values.map(validateStudentPaperMark);
    sheet.studentCount = values.length;
    sheet.presentCount = values.filter(
      item => item.attendanceStatus === 'PRESENT',
    ).length;
    sheet.absentCount = values.filter(
      item => item.attendanceStatus === 'ABSENT',
    ).length;
    sheet.exemptCount = values.filter(
      item => item.attendanceStatus === 'EXEMPT',
    ).length;
    sheet.completedStudentCount = validations.filter(
      item => item.isComplete && item.isValid,
    ).length;
    sheet.invalidStudentCount = validations.filter(
      item => !item.isValid,
    ).length;
  };
  sheets.forEach(updateCounts);

  const reviewFor = (sheet: MarkSheet): MarkSheetReviewSummary => {
    updateCounts(sheet);
    const values = sheetMarks(sheet.id);
    const totals = values
      .map(item => validateStudentPaperMark(item).totalMarksObtained)
      .filter((item): item is number => item !== undefined);
    const blockers = values.flatMap(
      item => validateStudentPaperMark(item).issues,
    );
    return {
      absent: sheet.absentCount,
      averageMarks: totals.length ? averagePercentages(totals) : undefined,
      blockers,
      completed: sheet.completedStudentCount,
      exempt: sheet.exemptCount,
      highestMarks: totals.length ? Math.max(...totals) : undefined,
      incomplete: sheet.studentCount - sheet.completedStudentCount,
      invalid: sheet.invalidStudentCount,
      lowestMarks: totals.length ? Math.min(...totals) : undefined,
      paperMaximumMarks: sheet.paperMaximumMarksSnapshot,
      paperPassMarks: sheet.paperPassMarksSnapshot,
      present: sheet.presentCount,
      totalStudents: sheet.studentCount,
    };
  };
  const detailsFor = (sheet: MarkSheet): MarkSheetDetails => {
    updateCounts(sheet);
    const exam = examFor(sheet.schoolId, sheet.examId);
    const values = sheetMarks(sheet.id);
    return {
      ...clone(sheet),
      examNameSnapshot: exam.name,
      reviewSummary: reviewFor(sheet),
      students: values.map(mark => {
        const profile = profileFor(mark.studentId);
        const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
          item => item.id === mark.enrollmentId,
        )!;
        return {
          admissionNumber: profile.admissionNumber,
          enrollmentId: enrollment.id,
          mark: clone(mark),
          rollNumber: enrollment.rollNumber,
          studentId: profile.id,
          studentName: profile.fullName,
        };
      }),
      validation: validateMarkSheetMarks(values),
    };
  };
  const record = (
    sheet: MarkSheet,
    action: string,
    description: string,
    actor?: { actingUserId?: string; actingUserName?: string },
    reason?: string,
    studentId?: string,
    oldValueSummary?: string,
    newValueSummary?: string,
  ) =>
    history.push({
      action,
      actingUserId: actor?.actingUserId,
      actingUserName: actor?.actingUserName,
      classNameSnapshot: sheet.classNameSnapshot,
      createdAt: now(),
      description,
      examId: sheet.examId,
      id: nextId('mark-history'),
      markSheetId: sheet.id,
      newValueSummary,
      oldValueSummary,
      reason,
      schoolId: sheet.schoolId,
      sectionNameSnapshot: sheet.sectionNameSnapshot,
      studentId,
      subjectNameSnapshot: sheet.subjectNameSnapshot,
      version: sheet.version,
    });
  sheets.forEach(sheet =>
    record(
      sheet,
      'MARK_SHEET_CREATED',
      'Created Mark Sheet from the scheduled Exam snapshot.',
    ),
  );
  const safeMarkSummary = (
    value: Pick<StudentPaperMark, 'attendanceStatus' | 'componentMarks'>,
  ) =>
    `${value.attendanceStatus}:${value.componentMarks
      .map(component =>
        component.marksObtained === undefined
          ? 'blank'
          : String(component.marksObtained),
      )
      .join('|')}`;
  const activePublication = (examId: string) =>
    publications.some(
      item => item.examId === examId && item.status === 'PUBLISHED',
    );
  const scopedSheets = (
    examId: string,
    input?: {
      examClassConfigurationId?: string;
      sectionId?: string;
      studentId?: string;
    },
  ) =>
    sheets.filter(
      sheet =>
        sheet.examId === examId &&
        (!input?.examClassConfigurationId ||
          sheet.examClassConfigurationId === input.examClassConfigurationId) &&
        (!input?.sectionId || sheet.sectionId === input.sectionId) &&
        (!input?.studentId ||
          sheetMarks(sheet.id).some(
            mark => mark.studentId === input.studentId,
          )),
    );
  const scopedOverall = (
    examId: string,
    input?: {
      examClassConfigurationId?: string;
      sectionId?: string;
      studentId?: string;
    },
  ) =>
    overallResults.filter(
      item =>
        item.examId === examId &&
        (!input?.examClassConfigurationId ||
          item.examClassConfigurationId === input.examClassConfigurationId) &&
        (!input?.sectionId || item.sectionId === input.sectionId) &&
        (!input?.studentId || item.studentId === input.studentId),
    );
  const filterResults = (
    values: StudentOverallResult[],
    query?: ResultListQuery,
  ) =>
    values.filter(
      item =>
        (!query?.search ||
          `${item.studentNameSnapshot} ${item.admissionNumberSnapshot}`
            .toLowerCase()
            .includes(query.search.toLowerCase())) &&
        (!query?.outcome ||
          query.outcome === 'ALL' ||
          item.outcome === query.outcome) &&
        (!query?.grade || item.grade === query.grade) &&
        (!query?.minimumRank || (item.rank ?? Infinity) >= query.minimumRank) &&
        (!query?.maximumRank || (item.rank ?? Infinity) <= query.maximumRank),
    );

  const calculateFor = (
    exam: Exam,
    input: {
      examClassConfigurationId?: string;
      sectionId?: string;
      studentId?: string;
    },
    runId: string,
    calculationVersion: number,
  ) => {
    const selectedSheets = scopedSheets(exam.id, input);
    const selectedMarks = selectedSheets
      .flatMap(sheet => sheetMarks(sheet.id))
      .filter(mark => !input.studentId || mark.studentId === input.studentId);
    const subjectValues = selectedMarks.map(mark =>
      calculateSubjectResult({
        calculationRunId: runId,
        calculationVersion,
        createdAt: now(),
        mark,
      }),
    );
    const overallValues: StudentOverallResult[] = [];
    const studentIds = [...new Set(selectedMarks.map(mark => mark.studentId))];
    studentIds.forEach(studentId => {
      const studentMarks = selectedMarks.filter(
        item => item.studentId === studentId,
      );
      const first = studentMarks[0];
      if (!first) return;
      const configuration = configurationFor(
        selectedSheets.find(
          item =>
            item.examClassConfigurationId === first.examClassConfigurationId,
        )!,
      );
      const scheme = gradingFor(configuration);
      const enrollment = INITIAL_STUDENT_ENROLLMENTS.find(
        item => item.id === first.enrollmentId,
      )!;
      const profile = profileFor(studentId);
      const studentSubjects = subjectValues.filter(
        item =>
          item.studentId === studentId &&
          item.examClassConfigurationId === configuration.id,
      );
      const requiredSubjectCount = INITIAL_EXAM_SUBJECT_PAPERS.filter(
        item =>
          item.examId === exam.id &&
          item.examClassConfigurationId === configuration.id &&
          item.subjectTypeSnapshot !== 'OPTIONAL',
      ).length;
      overallValues.push(
        calculateOverallResult({
          calculationRunId: runId,
          calculationVersion,
          context: {
            academicSessionId: exam.academicSessionId,
            branchId: exam.branchId,
            className: configuration.classNameSnapshot,
            examClassConfigurationId: configuration.id,
            examId: exam.id,
            schoolId: exam.schoolId,
            sectionId: first.sectionId,
            sectionName:
              configuration.sectionSnapshots.find(
                item => item.id === first.sectionId,
              )?.name ?? first.sectionId,
          },
          createdAt: now(),
          gradeBands: scheme.bands,
          includeOptionalSubjectsInTotal:
            configuration.includeOptionalSubjectsInTotal,
          overallPassPercentage: configuration.overallPassPercentage,
          requiredSubjectCount,
          requirePassInEverySubject: configuration.requirePassInEverySubject,
          student: {
            admissionNumber: profile.admissionNumber,
            enrollmentId: enrollment.id,
            name: profile.fullName,
            rollNumber: enrollment.rollNumber,
            studentId,
          },
          subjectResults: studentSubjects,
        }),
      );
    });
    const ranked: StudentOverallResult[] = [];
    [
      ...new Set(
        overallValues.map(
          item => `${item.examClassConfigurationId}:${item.sectionId}`,
        ),
      ),
    ].forEach(key => {
      const [configurationId, sectionId] = key.split(':');
      const configuration = INITIAL_EXAM_CLASS_CONFIGURATIONS.find(
        item => item.id === configurationId,
      )!;
      ranked.push(
        ...calculateCompetitionRanks(
          overallValues.filter(
            item =>
              item.examClassConfigurationId === configurationId &&
              item.sectionId === sectionId,
          ),
          configuration.rankEnabled,
        ),
      );
    });
    return { overallValues: ranked, subjectValues };
  };

  const service: MarksResultService & {
    getExamStatus: (examId: string) => Exam['status'];
    getPublishedSnapshots: () => PublishedResultSnapshot[];
    getRepositorySnapshot: () => { sheets: MarkSheet[] };
  } = {
    getExamStatus: examId => {
      const exam =
        INITIAL_EXAMS.find(item => item.id === examId) ??
        fail('EXAM_NOT_FOUND', 'Exam was not found.', 404);
      return getExamLifecycleStatus(examId, exam.status);
    },
    getPublishedSnapshots: () => clone(publishedSnapshots),
    getRepositorySnapshot: () => clone({ sheets }),
    async getMarksDashboard(schoolId, branchId, academicSessionId, examId) {
      const exam = examFor(schoolId, examId);
      if (exam.branchId !== branchId)
        fail(
          'BRANCH_SCOPE_MISMATCH',
          'Exam does not belong to this Branch.',
          403,
        );
      if (exam.academicSessionId !== academicSessionId)
        fail(
          'SESSION_SCOPE_MISMATCH',
          'Exam does not belong to this Academic Session.',
          403,
        );
      const values = sheets.filter(item => item.examId === examId);
      values.forEach(updateCounts);
      const warnings = [];
      if (!['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(exam.status))
        warnings.push({
          code: 'EXAM_NOT_SCHEDULED',
          message: 'Exam is not available for Marks Entry.',
          severity: 'BLOCKER' as const,
        });
      if (sessionFor(exam).status === 'CLOSED')
        warnings.push({
          code: 'CLOSED_ACADEMIC_SESSION',
          message: 'Closed Academic Sessions are read-only.',
          severity: 'WARNING' as const,
        });
      return success(
        {
          draft: values.filter(item => item.status === 'DRAFT').length,
          incompleteStudents: values.reduce(
            (total, item) =>
              total + item.studentCount - item.completedStudentCount,
            0,
          ),
          invalidMarks: values.reduce(
            (total, item) => total + item.invalidStudentCount,
            0,
          ),
          locked: values.filter(item => item.status === 'LOCKED').length,
          notStarted: values.filter(item => item.status === 'NOT_STARTED')
            .length,
          publishedSections: new Set(
            publications
              .filter(
                item => item.examId === examId && item.status === 'PUBLISHED',
              )
              .map(item => item.sectionId)
              .filter(Boolean),
          ).size,
          resultsReady: overallResults.filter(
            item => item.examId === examId && item.resultStatus !== 'STALE',
          ).length,
          submitted: values.filter(item => item.status === 'SUBMITTED').length,
          totalMarkSheets: values.length,
          warnings,
        },
        'Marks Dashboard loaded.',
      );
    },
    async getMarkSheets(schoolId, examId, query) {
      examFor(schoolId, examId);
      let values = sheets.filter(
        item =>
          item.examId === examId &&
          (!query?.status ||
            query.status === 'ALL' ||
            item.status === query.status) &&
          (!query?.sectionId || item.sectionId === query.sectionId) &&
          (!query?.classId ||
            configurationFor(item).classId === query.classId) &&
          (!query?.completion ||
            query.completion === 'ALL' ||
            (query.completion === 'COMPLETE'
              ? item.completedStudentCount === item.studentCount
              : item.completedStudentCount < item.studentCount)) &&
          (!query?.search ||
            `${item.subjectNameSnapshot} ${item.subjectCodeSnapshot}`
              .toLowerCase()
              .includes(query.search.toLowerCase())),
      );
      values = values.sort((left, right) =>
        (left.scheduledAt ?? '9999').localeCompare(right.scheduledAt ?? '9999'),
      );
      const page = query?.page ?? 1;
      const pageSize = query?.pageSize ?? 20;
      const start = (page - 1) * pageSize;
      return mockPaginated(clone(values.slice(start, start + pageSize)), {
        delayMs: 0,
        page,
        pageSize,
        totalItems: values.length,
      });
    },
    async getMarkSheet(schoolId, examId, markSheetId) {
      return success(
        detailsFor(sheetFor(schoolId, examId, markSheetId)),
        'Mark Sheet loaded.',
      );
    },
    async saveMarkSheetDraft(
      schoolId,
      examId,
      markSheetId,
      input: SaveMarkSheetDraftInput,
    ) {
      mutableExam(schoolId, examId);
      const sheet = sheetFor(schoolId, examId, markSheetId);
      if (!['NOT_STARTED', 'DRAFT'].includes(sheet.status))
        fail(
          'MARK_SHEET_READ_ONLY',
          'Only Not Started or Draft Mark Sheets can be edited.',
        );
      if (sheet.version !== input.expectedVersion)
        fail(
          'MARKS_VERSION_CONFLICT',
          'This Mark Sheet changed elsewhere. Reload before saving.',
          409,
        );
      const snapshot = {
        sheets: clone(sheets),
        marks: clone(marks),
        history: clone(history),
      };
      try {
        for (const markInput of input.marks) {
          const mark =
            marks.find(
              item =>
                item.markSheetId === sheet.id &&
                item.studentId === markInput.studentId,
            ) ??
            fail(
              'STUDENT_MARK_NOT_FOUND',
              'Student is not eligible for this Mark Sheet.',
              409,
            );
          if (mark.version !== markInput.expectedVersion)
            fail(
              'MARKS_VERSION_CONFLICT',
              'Student Marks changed elsewhere. Reload before saving.',
              409,
            );
          const components = mark.componentMarks.map(component => {
            const entered = markInput.componentMarks.find(
              item =>
                item.assessmentComponentId === component.assessmentComponentId,
            );
            return { ...component, marksObtained: entered?.marksObtained };
          });
          const nextMark = {
            ...mark,
            attendanceStatus: markInput.attendanceStatus,
            componentMarks: components,
            enteredByName: input.actingUserName,
            enteredByUserId: input.actingUserId,
            exemptionReason: markInput.exemptionReason?.trim() || undefined,
            remarks: markInput.remarks?.trim() || undefined,
            updatedAt: now(),
            version: mark.version + 1,
          };
          const validation = validateStudentPaperMark(nextMark);
          const hardError = validation.issues.find(
            item =>
              ![
                'MISSING_COMPONENT_MARKS',
                'EXEMPTION_REASON_REQUIRED',
              ].includes(item.code),
          );
          if (hardError) fail('INVALID_STUDENT_MARKS', hardError.message, 400);
          nextMark.totalMarksObtained = validation.totalMarksObtained;
          const oldValueSummary = safeMarkSummary(mark);
          Object.assign(mark, nextMark);
          record(
            sheet,
            markInput.attendanceStatus === 'ABSENT'
              ? 'STUDENT_MARK_MARKED_ABSENT'
              : markInput.attendanceStatus === 'EXEMPT'
              ? 'STUDENT_MARK_EXEMPTED'
              : 'STUDENT_MARK_UPDATED',
            `Updated safe Marks state for ${mark.studentId}.`,
            input,
            undefined,
            mark.studentId,
            oldValueSummary,
            safeMarkSummary(nextMark),
          );
        }
        if (failDraft) {
          failDraft = false;
          fail(
            'ATOMIC_DRAFT_SAVE_FAILURE',
            'Draft save failed and was rolled back.',
            500,
          );
        }
        sheet.status = 'DRAFT';
        sheet.version += 1;
        sheet.updatedAt = now();
        updateCounts(sheet);
        setExamLifecycleStatus(examId, 'IN_PROGRESS');
        record(sheet, 'MARKS_DRAFT_SAVED', 'Saved Mark Sheet Draft.', input);
        return success(detailsFor(sheet), 'Marks Draft saved.');
      } catch (error) {
        sheets = snapshot.sheets;
        marks = snapshot.marks;
        history = snapshot.history;
        throw error;
      }
    },
    async submitMarkSheet(schoolId, examId, markSheetId, input) {
      mutableExam(schoolId, examId);
      const sheet = sheetFor(schoolId, examId, markSheetId);
      if (sheet.status !== 'DRAFT')
        fail(
          'INVALID_MARK_SHEET_TRANSITION',
          'Only a Draft Mark Sheet can be submitted.',
        );
      if (sheet.version !== input.expectedVersion)
        fail('MARKS_VERSION_CONFLICT', 'This Mark Sheet changed elsewhere.');
      const validation = validateMarkSheetMarks(sheetMarks(sheet.id));
      if (!validation.isComplete || !validation.isValid)
        fail(
          'INCOMPLETE_MARK_SHEET',
          'Resolve all incomplete or invalid Student Marks before submission.',
        );
      sheet.status = 'SUBMITTED';
      sheet.submittedAt = now();
      sheet.submittedByUserId = input.actingUserId;
      sheet.submittedByName = input.actingUserName;
      sheet.version += 1;
      sheet.updatedAt = now();
      record(
        sheet,
        'MARK_SHEET_SUBMITTED',
        'Submitted Mark Sheet for review.',
        input,
      );
      return success(detailsFor(sheet), 'Mark Sheet submitted.');
    },
    async returnMarkSheetToDraft(schoolId, examId, markSheetId, input) {
      mutableExam(schoolId, examId);
      const sheet = sheetFor(schoolId, examId, markSheetId);
      if (sheet.status !== 'SUBMITTED')
        fail(
          'INVALID_MARK_SHEET_TRANSITION',
          'Only a Submitted Mark Sheet can return to Draft.',
        );
      if (!input.reason.trim())
        fail('REASON_REQUIRED', 'A reason is required.');
      if (activePublication(examId))
        fail(
          'PUBLISHED_RESULTS_EXIST',
          'Unpublish Results before changing submitted Marks.',
        );
      sheet.status = 'DRAFT';
      sheet.version += 1;
      sheet.updatedAt = now();
      record(
        sheet,
        'MARK_SHEET_RETURNED_TO_DRAFT',
        'Returned Mark Sheet to Draft.',
        input,
        input.reason.trim(),
      );
      return success(detailsFor(sheet), 'Mark Sheet returned to Draft.');
    },
    async lockMarkSheet(schoolId, examId, markSheetId, input) {
      mutableExam(schoolId, examId);
      const sheet = sheetFor(schoolId, examId, markSheetId);
      if (sheet.status !== 'SUBMITTED')
        fail(
          'INVALID_MARK_SHEET_TRANSITION',
          'Only a Submitted Mark Sheet can be locked.',
        );
      if (sheet.version !== input.expectedVersion)
        fail('MARKS_VERSION_CONFLICT', 'This Mark Sheet changed elsewhere.');
      const validation = validateMarkSheetMarks(sheetMarks(sheet.id));
      if (!validation.isComplete || !validation.isValid)
        fail(
          'INCOMPLETE_MARK_SHEET',
          'Incomplete Mark Sheets cannot be locked.',
        );
      sheet.status = 'LOCKED';
      sheet.lockedAt = now();
      sheet.lockedByUserId = input.actingUserId;
      sheet.lockedByName = input.actingUserName;
      sheet.version += 1;
      sheet.updatedAt = now();
      record(
        sheet,
        'MARK_SHEET_LOCKED',
        'Locked immutable Marks source.',
        input,
      );
      return success(detailsFor(sheet), 'Mark Sheet locked.');
    },
    async unlockMarkSheet(schoolId, examId, markSheetId, input) {
      mutableExam(schoolId, examId);
      const sheet = sheetFor(schoolId, examId, markSheetId);
      if (sheet.status !== 'LOCKED')
        fail(
          'INVALID_MARK_SHEET_TRANSITION',
          'Only a Locked Mark Sheet can be unlocked.',
        );
      if (!input.reason.trim())
        fail('UNLOCK_REASON_REQUIRED', 'Unlock reason is required.');
      if (activePublication(examId))
        fail(
          'PUBLISHED_RESULT_UNLOCK_REJECTED',
          'Unpublish active Results before unlocking Marks.',
        );
      sheet.status = 'DRAFT';
      sheet.unlockedAt = now();
      sheet.unlockedByUserId = input.actingUserId;
      sheet.unlockReason = input.reason.trim();
      sheet.version += 1;
      sheet.updatedAt = now();
      overallResults = overallResults.map(item =>
        item.examId === examId
          ? { ...item, resultStatus: 'STALE', updatedAt: now() }
          : item,
      );
      setExamLifecycleStatus(examId, 'IN_PROGRESS');
      record(
        sheet,
        'MARK_SHEET_UNLOCKED',
        'Unlocked Mark Sheet and marked calculated Results stale.',
        input,
        input.reason.trim(),
      );
      return success(
        detailsFor(sheet),
        'Mark Sheet unlocked. Existing Results are stale.',
      );
    },
    async getMarkSheetHistory(schoolId, examId, markSheetId) {
      sheetFor(schoolId, examId, markSheetId);
      return success(
        history.filter(item => item.markSheetId === markSheetId),
        'Marks history loaded.',
      );
    },
    async getResultProcessingSummary(
      schoolId,
      branchId,
      academicSessionId,
      examId,
    ) {
      const exam = examFor(schoolId, examId);
      if (exam.branchId !== branchId)
        fail(
          'BRANCH_SCOPE_MISMATCH',
          'Exam does not belong to this Branch.',
          403,
        );
      if (exam.academicSessionId !== academicSessionId)
        fail(
          'SESSION_SCOPE_MISMATCH',
          'Exam does not belong to this Session.',
          403,
        );
      const examSheets = sheets.filter(item => item.examId === examId);
      const examResults = overallResults.filter(item => item.examId === examId);
      return success(
        {
          absentCount: examResults.filter(item => item.outcome === 'ABSENT')
            .length,
          calculatedStudents: examResults.length,
          failCount: examResults.filter(item => item.outcome === 'FAIL').length,
          incompleteStudents: examResults.filter(
            item => item.outcome === 'INCOMPLETE',
          ).length,
          lockedMarkSheets: examSheets.filter(item => item.status === 'LOCKED')
            .length,
          passCount: examResults.filter(item => item.outcome === 'PASS').length,
          publishedSections: new Set(
            publications
              .filter(
                item => item.examId === examId && item.status === 'PUBLISHED',
              )
              .map(item => item.sectionId)
              .filter(Boolean),
          ).size,
          reviewedSections: new Set(
            reviews
              .filter(
                item => item.examId === examId && item.status === 'REVIEWED',
              )
              .map(item => item.sectionId)
              .filter(Boolean),
          ).size,
          staleResults: examResults.filter(
            item => item.resultStatus === 'STALE',
          ).length,
          unlockedMarkSheets: examSheets.filter(
            item => item.status !== 'LOCKED',
          ).length,
          warnings: [],
        },
        'Result Processing summary loaded.',
      );
    },
    async previewResultCalculation(schoolId, examId, input) {
      const exam = mutableExam(schoolId, examId);
      const selectedSheets = scopedSheets(examId, input);
      const blockers = [];
      if (!selectedSheets.length)
        blockers.push({
          code: 'MARK_SHEETS_MISSING',
          message: 'No Mark Sheets match this calculation scope.',
          severity: 'BLOCKER' as const,
        });
      if (selectedSheets.some(item => item.status !== 'LOCKED'))
        blockers.push({
          code: 'MARK_SHEETS_NOT_LOCKED',
          message: 'All required Mark Sheets must be locked.',
          severity: 'BLOCKER' as const,
        });
      const sourceVersions = Object.fromEntries(
        selectedSheets.map(item => [item.id, item.version]),
      );
      const previewId = nextId('result-preview');
      const estimated = blockers.length
        ? { overallValues: [], subjectValues: [] }
        : calculateFor(exam, input, previewId, runs.length + 1);
      const preview: ResultCalculationPreview = {
        absentCount: estimated.overallValues.filter(
          item => item.outcome === 'ABSENT',
        ).length,
        blockers,
        eligibleStudents: estimated.overallValues.filter(
          item => item.outcome !== 'INCOMPLETE',
        ).length,
        expiresAt: new Date(
          new Date(now()).getTime() + 15 * 60_000,
        ).toISOString(),
        failCount: estimated.overallValues.filter(
          item => item.outcome === 'FAIL',
        ).length,
        gradeDistribution: estimated.overallValues.reduce<
          Record<string, number>
        >(
          (all, item) => ({
            ...all,
            [item.grade ?? 'NONE']: (all[item.grade ?? 'NONE'] ?? 0) + 1,
          }),
          {},
        ),
        incompleteCount: estimated.overallValues.filter(
          item => item.outcome === 'INCOMPLETE',
        ).length,
        lockedMarkSheets: selectedSheets.filter(
          item => item.status === 'LOCKED',
        ).length,
        missingMarkSheets: blockers.length ? 1 : 0,
        passCount: estimated.overallValues.filter(
          item => item.outcome === 'PASS',
        ).length,
        previewId,
        rankApplicable: selectedSheets.some(
          item => configurationFor(item).rankEnabled,
        ),
        scope: input.scope,
        sourceVersions,
        students: new Set(
          selectedSheets.flatMap(item =>
            sheetMarks(item.id).map(mark => mark.studentId),
          ),
        ).size,
        warnings: [],
      };
      previews.push(preview);
      return success(
        preview,
        preview.blockers.length
          ? 'Calculation preview has blockers.'
          : 'Calculation preview is ready.',
      );
    },
    async calculateResults(schoolId, examId, input: CalculateResultsInput) {
      const exam = mutableExam(schoolId, examId);
      const preview =
        previews.find(item => item.previewId === input.previewId) ??
        fail(
          'CALCULATION_PREVIEW_REQUIRED',
          'Create a fresh calculation preview first.',
          409,
        );
      if (preview.blockers.length)
        fail('RESULT_CALCULATION_BLOCKED', preview.blockers[0].message);
      if (preview.expiresAt < now())
        fail('CALCULATION_PREVIEW_EXPIRED', 'Calculation preview expired.');
      const selectedSheets = scopedSheets(examId, input);
      if (
        selectedSheets.some(
          item =>
            preview.sourceVersions[item.id] !== item.version ||
            item.status !== 'LOCKED',
        )
      )
        fail('MARKS_VERSION_CONFLICT', 'Locked Marks changed after preview.');
      const snapshot = {
        runs: clone(runs),
        subjectResults: clone(subjectResults),
        overallResults: clone(overallResults),
        reviews: clone(reviews),
      };
      try {
        const runId = nextId('calculation-run');
        const version = runs.filter(item => item.examId === examId).length + 1;
        const run: ResultCalculationRun = {
          completedCount: 0,
          examClassConfigurationId: input.examClassConfigurationId,
          examId,
          failedCount: 0,
          id: runId,
          schoolId,
          scope: input.scope,
          sectionId: input.sectionId,
          sourceVersions: clone(preview.sourceVersions),
          startedAt: now(),
          status: 'PROCESSING',
          studentCount: preview.students,
          studentId: input.studentId,
        };
        runs.push(run);
        const calculated = calculateFor(exam, input, runId, version);
        if (failCalculation) {
          failCalculation = false;
          fail(
            'ATOMIC_RESULT_CALCULATION_FAILURE',
            'Result calculation failed and was rolled back.',
            500,
          );
        }
        subjectResults = subjectResults.filter(
          item =>
            item.examId !== examId ||
            (input.studentId && item.studentId !== input.studentId) ||
            (input.sectionId && item.sectionId !== input.sectionId) ||
            (input.examClassConfigurationId &&
              item.examClassConfigurationId !== input.examClassConfigurationId),
        );
        overallResults = overallResults.filter(
          item =>
            item.examId !== examId ||
            (input.studentId && item.studentId !== input.studentId) ||
            (input.sectionId && item.sectionId !== input.sectionId) ||
            (input.examClassConfigurationId &&
              item.examClassConfigurationId !== input.examClassConfigurationId),
        );
        subjectResults.push(...calculated.subjectValues);
        overallResults.push(...calculated.overallValues);
        reviews = reviews.filter(
          item => item.examId !== examId || item.calculationRunId === runId,
        );
        run.completedCount = calculated.overallValues.filter(
          item => item.outcome !== 'INCOMPLETE',
        ).length;
        run.failedCount = calculated.overallValues.filter(
          item => item.outcome === 'INCOMPLETE',
        ).length;
        run.status = run.failedCount ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
        run.completedAt = now();
        const result: ResultCalculationResult = {
          overallResults: clone(calculated.overallValues),
          run: clone(run),
          subjectResults: clone(calculated.subjectValues),
          warnings: [],
        };
        return success(result, 'Results calculated.');
      } catch (error) {
        runs = snapshot.runs;
        subjectResults = snapshot.subjectResults;
        overallResults = snapshot.overallResults;
        reviews = snapshot.reviews;
        throw error;
      }
    },
    async getClassResults(schoolId, examId, configurationId, query) {
      examFor(schoolId, examId);
      const values = filterResults(
        overallResults.filter(
          item =>
            item.examId === examId &&
            item.examClassConfigurationId === configurationId,
        ),
        query,
      );
      return success(
        {
          examClassConfigurationId: configurationId,
          results: values,
          total: values.length,
        },
        'Class Results loaded.',
      );
    },
    async getSectionResults(schoolId, examId, sectionId, query) {
      examFor(schoolId, examId);
      const values = filterResults(
        overallResults.filter(
          item => item.examId === examId && item.sectionId === sectionId,
        ),
        query,
      );
      return success(
        { results: values, sectionId, total: values.length },
        'Section Results loaded.',
      );
    },
    async getStudentResult(schoolId, examId, studentId) {
      examFor(schoolId, examId);
      const overall =
        overallResults.find(
          item => item.examId === examId && item.studentId === studentId,
        ) ??
        fail('STUDENT_RESULT_NOT_FOUND', 'Student Result was not found.', 404);
      return success(
        {
          overallResult: overall,
          student: {
            admissionNumberSnapshot: overall.admissionNumberSnapshot,
            classNameSnapshot: overall.classNameSnapshot,
            rollNumberSnapshot: overall.rollNumberSnapshot,
            sectionNameSnapshot: overall.sectionNameSnapshot,
            studentId: overall.studentId,
            studentNameSnapshot: overall.studentNameSnapshot,
          },
          subjectResults: subjectResults.filter(
            item =>
              item.examId === examId &&
              item.studentId === studentId &&
              item.calculationRunId === overall.calculationRunId,
          ),
        },
        'Student Result loaded.',
      );
    },
    async reviewResults(schoolId, examId, input) {
      const exam = mutableExam(schoolId, examId);
      const selected = scopedOverall(examId, input);
      if (
        !selected.length ||
        selected.some(
          item =>
            item.calculationRunId !== input.calculationRunId ||
            item.outcome === 'INCOMPLETE' ||
            item.resultStatus === 'STALE',
        )
      )
        fail(
          'RESULT_REVIEW_BLOCKED',
          'Only complete current Results may be reviewed.',
        );
      const recordValue: ResultReviewRecord = {
        calculationRunId: input.calculationRunId,
        examClassConfigurationId: input.examClassConfigurationId,
        examId,
        id: nextId('result-review'),
        remarks: input.remarks,
        reviewedAt: now(),
        reviewedByName: input.actingUserName,
        reviewedByUserId: input.actingUserId,
        reviewScope: input.reviewScope,
        schoolId,
        sectionId: input.sectionId,
        status: 'REVIEWED',
      };
      reviews = reviews.filter(
        item =>
          !(
            item.examId === examId &&
            item.examClassConfigurationId === input.examClassConfigurationId &&
            item.sectionId === input.sectionId
          ),
      );
      reviews.push(recordValue);
      selected.forEach(item => {
        item.resultStatus = 'REVIEWED';
        item.reviewedAt = recordValue.reviewedAt;
        item.updatedAt = now();
      });
      const examSheets = sheets.filter(item => item.examId === examId);
      const nextStatus = deriveExamLifecycle({
        currentStatus: exam.status,
        expectedStudentCount: new Set(
          examSheets.flatMap(item =>
            sheetMarks(item.id).map(mark => mark.studentId),
          ),
        ).size,
        results: overallResults.filter(item => item.examId === examId),
        reviewed: reviews.some(
          item => item.examId === examId && item.status === 'REVIEWED',
        ),
        sheets: examSheets,
      });
      setExamLifecycleStatus(examId, nextStatus);
      return success(recordValue, 'Results reviewed.');
    },
    async publishResults(schoolId, examId, input) {
      const exam = mutableExam(schoolId, examId);
      if (
        publications.some(
          item =>
            item.examId === examId &&
            item.scope === input.scope &&
            item.examClassConfigurationId === input.examClassConfigurationId &&
            item.sectionId === input.sectionId &&
            item.status === 'PUBLISHED',
        )
      )
        fail(
          'DUPLICATE_RESULT_PUBLICATION',
          'Results are already published for this scope.',
        );
      const selected = scopedOverall(examId, input);
      const selectedSheets = scopedSheets(examId, input);
      const eligibleStudentCount = new Set(
        selectedSheets.flatMap(item =>
          sheetMarks(item.id).map(mark => mark.studentId),
        ),
      ).size;
      if (selected.length !== eligibleStudentCount)
        fail(
          'RESULT_PUBLICATION_BLOCKED',
          'All eligible Students in the publication scope must have current Results.',
        );
      const eligibility = validateResultPublication({
        calculationRunId: input.calculationRunId,
        results: selected,
        reviews,
        sheets: selectedSheets,
      });
      if (!eligibility.eligible)
        fail('RESULT_PUBLICATION_BLOCKED', eligibility.blockers[0]);
      const snapshot = {
        publications: clone(publications),
        publishedSnapshots: clone(publishedSnapshots),
        overallResults: clone(overallResults),
      };
      try {
        const batch: ResultPublicationBatch = {
          academicSessionId: exam.academicSessionId,
          branchId: exam.branchId,
          calculationRunId: input.calculationRunId,
          examClassConfigurationId: input.examClassConfigurationId,
          examId,
          id: nextId('publication-batch'),
          publishedAt: now(),
          publishedByName: input.actingUserName,
          publishedByUserId: input.actingUserId,
          schoolId,
          scope: input.scope,
          sectionId: input.sectionId,
          status: 'PUBLISHED',
          studentCount: selected.length,
        };
        if (failPublication) {
          failPublication = false;
          fail(
            'PUBLICATION_FAILURE_ROLLBACK',
            'Publication failed and was rolled back.',
            500,
          );
        }
        publications.push(batch);
        selected.forEach(overall => {
          const subjects = subjectResults.filter(
            item =>
              item.examId === examId &&
              item.studentId === overall.studentId &&
              item.calculationRunId === input.calculationRunId,
          );
          const overallSnapshot = omitKeys(clone(overall), [
            'calculationRunId',
            'createdAt',
            'updatedAt',
          ]);
          const subjectSnapshots = subjects.map(subject =>
            omitKeys(clone(subject), ['calculationRunId', 'createdAt']),
          );
          publishedSnapshots.push({
            academicSessionId: exam.academicSessionId,
            branchId: exam.branchId,
            classNameSnapshot: overall.classNameSnapshot,
            enrollmentId: overall.enrollmentId,
            examId,
            examNameSnapshot: exam.name,
            examTypeNameSnapshot: exam.examTypeName,
            id: nextId('published-result'),
            overallResult: overallSnapshot,
            publicationBatchId: batch.id,
            calculationRunId: input.calculationRunId,
            publishedAt: batch.publishedAt,
            publishedByName: batch.publishedByName,
            publishedByUserId: batch.publishedByUserId,
            rollNumberSnapshot: overall.rollNumberSnapshot,
            schoolId,
            sectionNameSnapshot: overall.sectionNameSnapshot,
            status: 'PUBLISHED',
            studentId: overall.studentId,
            subjectResults: subjectSnapshots,
            termNameSnapshot: exam.termName,
          });
          overall.resultStatus = 'PUBLISHED';
          overall.publishedAt = batch.publishedAt;
          overall.updatedAt = now();
        });
        if (options.syncPublishedResultRepository) {
          const newlyPublished = publishedSnapshots.filter(
            item => item.publicationBatchId === batch.id,
          );
          publishedResultRepository.upsert(newlyPublished);
          createMockResultPublicationNotifications(newlyPublished);
        }
        return success(
          batch,
          'Results published and self-service notifications created.',
        );
      } catch (error) {
        publications = snapshot.publications;
        publishedSnapshots = snapshot.publishedSnapshots;
        overallResults = snapshot.overallResults;
        throw error;
      }
    },
    async unpublishResults(schoolId, examId, batchId, input) {
      mutableExam(schoolId, examId);
      if (!input.reason.trim())
        fail(
          'UNPUBLICATION_REASON_REQUIRED',
          'Unpublication reason is required.',
        );
      const batch =
        publications.find(
          item =>
            item.id === batchId &&
            item.examId === examId &&
            item.schoolId === schoolId,
        ) ??
        fail(
          'PUBLICATION_BATCH_NOT_FOUND',
          'Publication batch was not found.',
          404,
        );
      if (batch.status !== 'PUBLISHED')
        fail(
          'PUBLICATION_ALREADY_INACTIVE',
          'Publication batch is already unpublished.',
        );
      batch.status = 'UNPUBLISHED';
      batch.unpublishedAt = now();
      batch.unpublishedByUserId = input.actingUserId;
      batch.unpublishedByName = input.actingUserName;
      batch.unpublicationReason = input.reason.trim();
      publishedSnapshots
        .filter(item => item.publicationBatchId === batchId)
        .forEach(item => {
          item.status = 'UNPUBLISHED';
        });
      if (options.syncPublishedResultRepository)
        publishedResultRepository.updatePublicationStatus(
          batchId,
          'UNPUBLISHED',
        );
      overallResults
        .filter(
          item =>
            item.examId === examId &&
            item.calculationRunId === batch.calculationRunId &&
            (!batch.examClassConfigurationId ||
              item.examClassConfigurationId ===
                batch.examClassConfigurationId) &&
            (!batch.sectionId || item.sectionId === batch.sectionId),
        )
        .forEach(item => {
          item.resultStatus = 'UNPUBLISHED';
          item.updatedAt = now();
        });
      return success(
        batch,
        'Results unpublished. Publication history was preserved.',
      );
    },
    async getPublicationHistory(schoolId, examId) {
      examFor(schoolId, examId);
      return success(
        publications.filter(item => item.examId === examId),
        'Publication history loaded.',
      );
    },
    async getRankList(schoolId, examId, input) {
      examFor(schoolId, examId);
      const configuration =
        INITIAL_EXAM_CLASS_CONFIGURATIONS.find(
          item =>
            item.id === input.examClassConfigurationId &&
            item.examId === examId,
        ) ??
        fail(
          'EXAM_CLASS_CONFIGURATION_NOT_FOUND',
          'Class configuration was not found.',
          404,
        );
      if (!configuration.rankEnabled)
        return success([], 'Ranking is disabled for this Class.');
      const values = overallResults.filter(
        item =>
          item.examId === examId &&
          item.examClassConfigurationId === input.examClassConfigurationId &&
          (input.scope === 'CLASS_RANK' || item.sectionId === input.sectionId),
      );
      return success(toRankEntries(values), 'Rank list loaded.');
    },
  };
  return service;
}

export const mockMarksResultService = createMockMarksResultService({
  syncPublishedResultRepository: true,
});
