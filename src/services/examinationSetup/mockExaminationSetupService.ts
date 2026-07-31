import type { AcademicClass, Section, Subject } from '../../models/academic';
import type {
  CreateExamInput,
  CreateExamTermInput,
  CreateExamTypeInput,
  CreateGradingSchemeInput,
  Exam,
  ExamActivity,
  ExamClassConfiguration,
  ExamCopyPreview,
  ExamDetails,
  ExamListQuery,
  ExamSetupIssue,
  ExamSubjectPaper,
  ExamTerm,
  ExamType,
  GradingScheme,
  UpdateExamInput,
} from '../../models/examination';
import type { AcademicSession, Branch } from '../../models/organization';
import { ApiClientError } from '../api/apiError';
import { mockPaginated, mockSuccess } from '../mock/mockResponse';
import {
  INITIAL_ACADEMIC_CLASSES,
  INITIAL_CLASS_SUBJECT_ASSIGNMENTS,
  INITIAL_SECTIONS,
  INITIAL_SUBJECTS,
} from '../academic/academicFixtures';
import {
  INITIAL_ACADEMIC_SESSIONS,
  INITIAL_BRANCHES,
  INITIAL_SCHOOLS,
} from '../organization/organizationFixtures';
import { detectScheduleConflicts } from '../../utils/examSchedule';
import { matchExamCopyEntities } from '../../utils/examCopy';
import {
  isSubjectEligible,
  validateClassSectionEligibility,
  validateExamSetup,
} from '../../utils/examSetupValidation';
import {
  validateDefaultGradingSchemeUniqueness,
  validateGradeBands,
} from '../../utils/gradeBandValidation';
import { validateMarksConfiguration } from '../../utils/marksConfiguration';
import type { ExaminationSetupService } from './examinationSetupService';
import {
  getExamLifecycleStatus,
  setExamLifecycleStatus,
} from './examinationLifecycleRepository';
import {
  INITIAL_EXAM_CLASS_CONFIGURATIONS,
  INITIAL_EXAMS,
  INITIAL_EXAM_SUBJECT_PAPERS,
  INITIAL_EXAM_TERMS,
  INITIAL_EXAM_TYPES,
  INITIAL_GRADING_SCHEMES,
} from './examinationSetupFixtures';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface MockExaminationSetupOptions {
  now?: () => string;
  failNextAtomicCreation?: boolean;
}

function fail(
  code: string,
  message: string,
  status = 409,
  fieldErrors?: Record<string, string>,
): never {
  throw new ApiClientError({ code, fieldErrors, message, status });
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

function search<T extends { name: string; code: string }>(
  values: T[],
  query?: { search?: string },
): T[] {
  const term = query?.search?.trim().toLowerCase();
  return term
    ? values.filter(item =>
        `${item.name} ${item.code}`.toLowerCase().includes(term),
      )
    : values;
}

export function createMockExaminationSetupService(
  options: MockExaminationSetupOptions = {},
): ExaminationSetupService & {
  getActivities: () => ExamActivity[];
  getRepositorySnapshot: () => {
    configurations: ExamClassConfiguration[];
    exams: Exam[];
    examTypes: ExamType[];
    gradingSchemes: GradingScheme[];
    papers: ExamSubjectPaper[];
    terms: ExamTerm[];
  };
} {
  let terms = clone(INITIAL_EXAM_TERMS);
  let examTypes = clone(INITIAL_EXAM_TYPES);
  let gradingSchemes = clone(INITIAL_GRADING_SCHEMES);
  let exams = clone(INITIAL_EXAMS);
  let configurations = clone(INITIAL_EXAM_CLASS_CONFIGURATIONS);
  let papers = clone(INITIAL_EXAM_SUBJECT_PAPERS);
  const activities: ExamActivity[] = [];
  let sequence = 100;
  let failAtomic = options.failNextAtomicCreation ?? false;
  const now = options.now ?? (() => new Date().toISOString());
  const id = (prefix: string) => `${prefix}-${++sequence}`;
  const success = <T>(data: T, message: string) =>
    mockSuccess(clone(data), message, 0);
  const page = <T>(
    items: T[],
    query?: { page?: number; pageSize?: number },
  ) => {
    const pageNumber = query?.page ?? 1;
    const pageSize = query?.pageSize ?? 20;
    const start = (pageNumber - 1) * pageSize;
    return mockPaginated(clone(items.slice(start, start + pageSize)), {
      page: pageNumber,
      pageSize,
      totalItems: items.length,
      delayMs: 0,
    });
  };
  const school = (schoolId: string) =>
    INITIAL_SCHOOLS.find(item => item.id === schoolId) ??
    fail(
      'SCHOOL_SCOPE_MISMATCH',
      'School was not found in the permitted scope.',
      403,
    );
  const branch = (schoolId: string, branchId: string): Branch =>
    INITIAL_BRANCHES.find(
      item => item.id === branchId && item.schoolId === schoolId,
    ) ??
    fail(
      'BRANCH_SCOPE_MISMATCH',
      'Branch does not belong to this School.',
      403,
    );
  const session = (schoolId: string, sessionId: string): AcademicSession =>
    INITIAL_ACADEMIC_SESSIONS.find(
      item => item.id === sessionId && item.schoolId === schoolId,
    ) ??
    fail(
      'SESSION_SCOPE_MISMATCH',
      'Academic Session does not belong to this School.',
      403,
    );
  const mutableSession = (schoolId: string, sessionId: string) => {
    const value = session(schoolId, sessionId);
    if (value.status === 'CLOSED')
      fail(
        'CLOSED_ACADEMIC_SESSION',
        'Closed Academic Sessions are read-only.',
        409,
      );
    return value;
  };
  const findTerm = (schoolId: string, sessionId: string, termId: string) =>
    terms.find(
      item =>
        item.id === termId &&
        item.schoolId === schoolId &&
        item.academicSessionId === sessionId,
    ) ?? fail('EXAM_TERM_NOT_FOUND', 'Exam Term was not found.', 404);
  const findType = (schoolId: string, examTypeId: string) =>
    examTypes.find(
      item => item.id === examTypeId && item.schoolId === schoolId,
    ) ?? fail('EXAM_TYPE_NOT_FOUND', 'Exam Type was not found.', 404);
  const findScheme = (schoolId: string, schemeId: string) =>
    gradingSchemes.find(
      item => item.id === schemeId && item.schoolId === schoolId,
    ) ?? fail('GRADING_SCHEME_NOT_FOUND', 'Grading Scheme was not found.', 404);
  const findExam = (schoolId: string, examId: string) =>
    exams.find(item => item.id === examId && item.schoolId === schoolId) ??
    fail('EXAM_NOT_FOUND', 'Exam was not found.', 404);
  const editableExam = (schoolId: string, examId: string) => {
    const value = findExam(schoolId, examId);
    mutableSession(schoolId, value.academicSessionId);
    if (value.status !== 'DRAFT')
      fail(
        'EXAM_NOT_EDITABLE',
        'Return the Exam to Draft before changing its setup.',
        409,
      );
    return value;
  };
  const activity = (
    action: string,
    description: string,
    value?: Exam,
    classId?: string,
    actor?: string,
  ) =>
    activities.push({
      id: id('exam-activity'),
      schoolId: value?.schoolId ?? 'school-omt',
      branchId: value?.branchId,
      academicSessionId: value?.academicSessionId,
      examId: value?.id,
      classId,
      action,
      actingUserId: actor,
      timestamp: now(),
      description,
    });

  const validateTermInput = (
    schoolId: string,
    sessionId: string,
    input: CreateExamTermInput,
    excludedId?: string,
  ) => {
    const activeSession = mutableSession(schoolId, sessionId);
    const code = normalizeCode(input.code);
    const name = input.name.trim().toLowerCase();
    const fields: Record<string, string> = {};
    if (!name) fields.name = 'Name is required.';
    if (!code) fields.code = 'Code is required.';
    if (!input.startDate || !input.endDate || input.endDate <= input.startDate)
      fields.endDate = 'End date must be after start date.';
    if (
      input.startDate < activeSession.startDate ||
      input.endDate > activeSession.endDate
    )
      fields.startDate = 'Term dates must stay inside the Academic Session.';
    if (!Number.isInteger(input.displayOrder) || input.displayOrder <= 0)
      fields.displayOrder = 'Display order must be positive.';
    if (
      terms.some(
        item =>
          item.id !== excludedId &&
          item.academicSessionId === sessionId &&
          (item.code === code || item.name.toLowerCase() === name),
      )
    )
      fields.code =
        'Term name and code must be unique in the Academic Session.';
    if (
      terms.some(
        item =>
          item.id !== excludedId &&
          item.academicSessionId === sessionId &&
          item.status === 'ACTIVE' &&
          input.startDate <= item.endDate &&
          input.endDate >= item.startDate,
      )
    )
      fields.startDate = 'Term date ranges cannot overlap.';
    if (Object.keys(fields).length)
      fail('INVALID_EXAM_TERM', 'Check Exam Term details.', 400, fields);
  };
  const validateTypeInput = (
    schoolId: string,
    input: CreateExamTypeInput,
    excludedId?: string,
  ) => {
    school(schoolId);
    const fields: Record<string, string> = {};
    const code = normalizeCode(input.code);
    const name = input.name.trim().toLowerCase();
    if (!name) fields.name = 'Name is required.';
    if (!code) fields.code = 'Code is required.';
    if (!Number.isInteger(input.displayOrder) || input.displayOrder <= 0)
      fields.displayOrder = 'Display order must be positive.';
    if (
      input.defaultWeightagePercent !== undefined &&
      (input.defaultWeightagePercent < 0 || input.defaultWeightagePercent > 100)
    )
      fields.defaultWeightagePercent = 'Weightage must be between 0 and 100.';
    if (
      examTypes.some(
        item =>
          item.schoolId === schoolId &&
          item.id !== excludedId &&
          (item.code === code || item.name.toLowerCase() === name),
      )
    )
      fields.code = 'Exam Type name and code must be unique.';
    if (Object.keys(fields).length)
      fail('INVALID_EXAM_TYPE', 'Check Exam Type details.', 400, fields);
  };
  const validateSchemeInput = (
    schoolId: string,
    input: CreateGradingSchemeInput,
    schemeId: string,
  ) => {
    school(schoolId);
    const code = normalizeCode(input.code);
    if (!input.name.trim() || !code)
      fail(
        'INVALID_GRADING_SCHEME',
        'Grading Scheme name and code are required.',
        400,
      );
    if (
      gradingSchemes.some(
        item =>
          item.schoolId === schoolId &&
          item.id !== schemeId &&
          (item.code === code ||
            item.name.toLowerCase() === input.name.trim().toLowerCase()),
      )
    )
      fail(
        'DUPLICATE_GRADING_SCHEME',
        'Grading Scheme name and code must be unique.',
        409,
      );
    if (input.status === 'ACTIVE') {
      const errors = validateGradeBands(
        input.bands.map((band, index) => ({
          ...band,
          id: band.id ?? `${schemeId}-band-${index + 1}`,
        })),
      );
      if (errors.length)
        fail('INVALID_GRADE_BANDS', errors[0].message, 400, {
          bands: errors.map(item => item.message).join(' '),
        });
      if (
        !validateDefaultGradingSchemeUniqueness(gradingSchemes, {
          id: schemeId,
          isDefault: input.isDefault,
          status: input.status,
        })
      )
        fail(
          'DEFAULT_GRADING_SCHEME_CONFLICT',
          'Only one active default Grading Scheme is allowed.',
          409,
        );
    }
  };
  const validateExamInput = (
    schoolId: string,
    input: CreateExamInput | UpdateExamInput,
    excludedId?: string,
    existing?: Exam,
  ) => {
    const branchId = 'branchId' in input ? input.branchId : existing!.branchId;
    const sessionId =
      'academicSessionId' in input
        ? input.academicSessionId
        : existing!.academicSessionId;
    branch(schoolId, branchId);
    const activeSession = mutableSession(schoolId, sessionId);
    const term = findTerm(schoolId, sessionId, input.termId);
    const type = findType(schoolId, input.examTypeId);
    const fields: Record<string, string> = {};
    if (!input.name.trim()) fields.name = 'Name is required.';
    if (!normalizeCode(input.code)) fields.code = 'Code is required.';
    if (term.status !== 'ACTIVE') fields.termId = 'Select an active Exam Term.';
    if (type.status !== 'ACTIVE')
      fields.examTypeId = 'Select an active Exam Type.';
    if (input.endDate < input.startDate)
      fields.endDate = 'End date cannot be before start date.';
    if (
      input.startDate < activeSession.startDate ||
      input.endDate > activeSession.endDate
    )
      fields.startDate = 'Exam dates must stay inside the Academic Session.';
    if (input.startDate < term.startDate || input.endDate > term.endDate)
      fields.termId = 'Exam dates must stay inside the selected Term.';
    if (
      input.defaultWeightagePercent !== undefined &&
      (input.defaultWeightagePercent < 0 || input.defaultWeightagePercent > 100)
    )
      fields.defaultWeightagePercent = 'Weightage must be between 0 and 100.';
    const code = normalizeCode(input.code);
    const name = input.name.trim().toLowerCase();
    if (
      exams.some(
        item =>
          item.id !== excludedId &&
          item.branchId === branchId &&
          item.academicSessionId === sessionId &&
          (item.code === code || item.name.toLowerCase() === name),
      )
    )
      fields.code =
        'Exam name and code must be unique in this Branch and Session.';
    if (Object.keys(fields).length)
      fail('INVALID_EXAM', 'Check Exam details.', 400, fields);
    return { activeSession, branchId, sessionId, term, type };
  };
  const classEntity = (
    exam: Exam,
    classId: string,
  ): AcademicClass | undefined =>
    INITIAL_ACADEMIC_CLASSES.find(
      item =>
        item.id === classId &&
        item.schoolId === exam.schoolId &&
        item.branchId === exam.branchId &&
        item.academicSessionId === exam.academicSessionId,
    );
  const classSections = (classId: string): Section[] =>
    INITIAL_SECTIONS.filter(
      item => item.classId === classId && item.status === 'ACTIVE',
    );
  const subjectEntity = (
    schoolId: string,
    subjectId: string,
  ): Subject | undefined =>
    INITIAL_SUBJECTS.find(
      item => item.id === subjectId && item.schoolId === schoolId,
    );
  const buildConfigurations = (
    exam: Exam,
    inputs: Parameters<
      ExaminationSetupService['updateExamClassConfigurations']
    >[2]['configurations'],
  ): ExamClassConfiguration[] => {
    const classIds = new Set<string>();
    return inputs.map(input => {
      if (classIds.has(input.classId))
        fail(
          'DUPLICATE_EXAM_CLASS',
          'A Class cannot be configured more than once.',
          409,
        );
      classIds.add(input.classId);
      const academicClass = classEntity(exam, input.classId);
      const activeSections = classSections(input.classId);
      const sectionIds =
        input.sectionApplicability === 'ALL_ACTIVE_SECTIONS'
          ? activeSections.map(item => item.id)
          : input.sectionIds;
      const errors = validateClassSectionEligibility({
        academicClass,
        academicSessionId: exam.academicSessionId,
        branchId: exam.branchId,
        requestedSectionIds: sectionIds,
        schoolId: exam.schoolId,
        selectedSections: activeSections,
      });
      if (errors.length)
        fail('INVALID_EXAM_CLASS_CONFIGURATION', errors[0], 409);
      const scheme = findScheme(exam.schoolId, input.gradingSchemeId);
      if (scheme.status !== 'ACTIVE')
        fail(
          'INACTIVE_GRADING_SCHEME',
          'Select an active Grading Scheme.',
          409,
        );
      if (
        input.overallPassPercentage !== undefined &&
        (input.overallPassPercentage < 0 || input.overallPassPercentage > 100)
      )
        fail(
          'INVALID_OVERALL_PASS_PERCENTAGE',
          'Overall pass percentage must be between 0 and 100.',
          400,
        );
      const existing = configurations.find(
        item => item.id === input.id && item.examId === exam.id,
      );
      return {
        id: existing?.id ?? id('exam-config'),
        examId: exam.id,
        schoolId: exam.schoolId,
        branchId: exam.branchId,
        academicSessionId: exam.academicSessionId,
        classId: input.classId,
        classNameSnapshot: academicClass!.name,
        classCodeSnapshot: academicClass!.code,
        sectionApplicability: input.sectionApplicability,
        sectionIds,
        sectionSnapshots: activeSections
          .filter(item => sectionIds.includes(item.id))
          .map(item => ({ id: item.id, name: item.name, code: item.code })),
        gradingSchemeId: scheme.id,
        gradingSchemeNameSnapshot: scheme.name,
        requirePassInEverySubject: input.requirePassInEverySubject,
        overallPassPercentage: input.overallPassPercentage,
        includeOptionalSubjectsInTotal: input.includeOptionalSubjectsInTotal,
        rankEnabled: input.rankEnabled,
        subjectPaperCount: existing?.subjectPaperCount ?? 0,
        totalMaximumMarks: existing?.totalMaximumMarks ?? 0,
        status: 'ACTIVE',
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      };
    });
  };
  const buildPapers = (
    exam: Exam,
    configuration: ExamClassConfiguration,
    inputs: Parameters<
      ExaminationSetupService['updateExamSubjectPapers']
    >[3]['papers'],
  ): ExamSubjectPaper[] => {
    const subjectIds = new Set<string>();
    return inputs.map((input, index) => {
      if (subjectIds.has(input.subjectId))
        fail(
          'DUPLICATE_SUBJECT_PAPER',
          'A Subject Paper cannot be added twice to a Class.',
          409,
        );
      subjectIds.add(input.subjectId);
      const subject = subjectEntity(exam.schoolId, input.subjectId);
      const assignment = INITIAL_CLASS_SUBJECT_ASSIGNMENTS.find(
        item =>
          item.classId === configuration.classId &&
          item.subjectId === input.subjectId &&
          item.branchId === exam.branchId &&
          item.academicSessionId === exam.academicSessionId,
      );
      if (
        !isSubjectEligible({
          academicSessionId: exam.academicSessionId,
          assignment,
          branchId: exam.branchId,
          classId: configuration.classId,
          schoolId: exam.schoolId,
          subject,
        })
      )
        fail(
          'SUBJECT_NOT_ELIGIBLE',
          'Subject must be active and assigned to this Class.',
          409,
        );
      const existing = papers.find(
        item => item.id === input.id && item.examId === exam.id,
      );
      const paper: ExamSubjectPaper = {
        id: existing?.id ?? id('exam-paper'),
        examId: exam.id,
        examClassConfigurationId: configuration.id,
        schoolId: exam.schoolId,
        branchId: exam.branchId,
        academicSessionId: exam.academicSessionId,
        classId: configuration.classId,
        subjectId: input.subjectId,
        subjectNameSnapshot: subject!.name,
        subjectCodeSnapshot: subject!.code,
        subjectTypeSnapshot: subject!.type,
        totalMaximumMarks: input.totalMaximumMarks,
        totalPassMarks: input.totalPassMarks,
        weightagePercent: input.weightagePercent,
        components: input.components.map((component, componentIndex) => ({
          ...component,
          id:
            component.id ?? id(`component-${index + 1}-${componentIndex + 1}`),
        })),
        examDate: input.examDate,
        startTime: input.startTime,
        durationMinutes: input.durationMinutes,
        room: input.room?.trim() || undefined,
        displayOrder: input.displayOrder,
        status: 'DRAFT',
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      };
      const errors = validateMarksConfiguration(paper);
      if (errors.length)
        fail('INVALID_MARKS_CONFIGURATION', errors[0].message, 400);
      return paper;
    });
  };
  const validationFor = (exam: Exam) => {
    const value = session(exam.schoolId, exam.academicSessionId);
    return validateExamSetup({
      configurations: configurations.filter(
        item => item.examId === exam.id && item.status === 'ACTIVE',
      ),
      exam,
      examTypeActive:
        findType(exam.schoolId, exam.examTypeId).status === 'ACTIVE',
      gradingSchemes,
      papers: papers.filter(item => item.examId === exam.id),
      sessionClosed: value.status === 'CLOSED',
      sessionEndDate: value.endDate,
      sessionStartDate: value.startDate,
      termActive:
        findTerm(exam.schoolId, exam.academicSessionId, exam.termId).status ===
        'ACTIVE',
    });
  };
  const details = (exam: Exam): ExamDetails => {
    exam.status = getExamLifecycleStatus(exam.id, exam.status);
    const examConfigurations = configurations.filter(
      item => item.examId === exam.id,
    );
    const examPapers = papers.filter(item => item.examId === exam.id);
    const validation = validationFor(exam);
    exam.classConfigurationCount = examConfigurations.filter(
      item => item.status === 'ACTIVE',
    ).length;
    exam.subjectPaperCount = examPapers.filter(
      item => item.status !== 'CANCELLED',
    ).length;
    exam.setupCompletionPercent = validation.completionPercent;
    exam.setupWarnings = [...validation.blockers, ...validation.warnings];
    const currentSession = session(exam.schoolId, exam.academicSessionId);
    return {
      ...clone(exam),
      classConfigurations: clone(examConfigurations),
      scheduleConflicts: detectScheduleConflicts({
        configurations: examConfigurations,
        examEndDate: exam.endDate,
        examStartDate: exam.startDate,
        papers: examPapers,
        sessionEndDate: currentSession.endDate,
        sessionStartDate: currentSession.startDate,
      }),
      setupValidation: clone(validation),
      subjectPapers: clone(examPapers),
    };
  };

  const service: ExaminationSetupService & {
    getActivities: () => ExamActivity[];
    getRepositorySnapshot: () => {
      configurations: ExamClassConfiguration[];
      exams: Exam[];
      examTypes: ExamType[];
      gradingSchemes: GradingScheme[];
      papers: ExamSubjectPaper[];
      terms: ExamTerm[];
    };
  } = {
    getActivities: () => clone(activities),
    getRepositorySnapshot: () =>
      clone({ configurations, exams, examTypes, gradingSchemes, papers, terms }),
    async getExaminationSetupSummary(schoolId, branchId, academicSessionId) {
      school(schoolId);
      branch(schoolId, branchId);
      session(schoolId, academicSessionId);
      const scoped = exams.filter(
        item =>
          item.schoolId === schoolId &&
          item.branchId === branchId &&
          item.academicSessionId === academicSessionId,
      );
      const validations = scoped.map(item => validationFor(item));
      const conflicts = scoped.flatMap(item => details(item).scheduleConflicts);
      const warnings: ExamSetupIssue[] = [];
      if (
        !terms.some(
          item =>
            item.schoolId === schoolId &&
            item.academicSessionId === academicSessionId &&
            item.status === 'ACTIVE',
        )
      )
        warnings.push({
          code: 'NO_ACTIVE_EXAM_TERM',
          message: 'No active Exam Term is available.',
          severity: 'WARNING',
        });
      if (
        !gradingSchemes.some(
          item => item.schoolId === schoolId && item.status === 'ACTIVE',
        )
      )
        warnings.push({
          code: 'NO_ACTIVE_GRADING_SCHEME',
          message: 'No active Grading Scheme is available.',
          severity: 'WARNING',
        });
      if (session(schoolId, academicSessionId).status === 'CLOSED')
        warnings.push({
          code: 'CLOSED_ACADEMIC_SESSION',
          message: 'This Academic Session is read-only.',
          severity: 'WARNING',
        });
      return success(
        {
          activeTerms: terms.filter(
            item =>
              item.schoolId === schoolId &&
              item.academicSessionId === academicSessionId &&
              item.status === 'ACTIVE',
          ).length,
          activeExamTypes: examTypes.filter(
            item => item.schoolId === schoolId && item.status === 'ACTIVE',
          ).length,
          activeGradingSchemes: gradingSchemes.filter(
            item => item.schoolId === schoolId && item.status === 'ACTIVE',
          ).length,
          draftExams: scoped.filter(item => item.status === 'DRAFT').length,
          scheduledExams: scoped.filter(item => item.status === 'SCHEDULED')
            .length,
          incompleteExams: validations.filter(item => !item.isComplete).length,
          upcomingPapers: papers.filter(
            item =>
              scoped.some(exam => exam.id === item.examId) &&
              item.examDate &&
              item.examDate >= now().slice(0, 10),
          ).length,
          scheduleConflicts: conflicts.length,
          warnings,
        },
        'Examination Setup summary loaded.',
      );
    },
    getExamTerms(schoolId, academicSessionId, query) {
      session(schoolId, academicSessionId);
      const values = search(
        terms.filter(
          item =>
            item.schoolId === schoolId &&
            item.academicSessionId === academicSessionId &&
            (!query?.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        ),
        query,
      ).sort((a, b) => a.displayOrder - b.displayOrder);
      return page(values, query);
    },
    getExamTerm: async (schoolId, academicSessionId, termId) =>
      success(
        findTerm(schoolId, academicSessionId, termId),
        'Exam Term loaded.',
      ),
    async createExamTerm(schoolId, academicSessionId, input) {
      validateTermInput(schoolId, academicSessionId, input);
      const value: ExamTerm = {
        ...clone(input),
        id: id('exam-term'),
        schoolId,
        academicSessionId,
        code: normalizeCode(input.code),
        name: input.name.trim(),
        activeExamCount: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      terms.push(value);
      activity('EXAM_TERM_CREATED', `Created Exam Term ${value.name}.`);
      return success(value, 'Exam Term created.');
    },
    async updateExamTerm(schoolId, academicSessionId, termId, input) {
      validateTermInput(schoolId, academicSessionId, input, termId);
      const value = findTerm(schoolId, academicSessionId, termId);
      Object.assign(value, clone(input), {
        code: normalizeCode(input.code),
        name: input.name.trim(),
        updatedAt: now(),
      });
      activity('EXAM_TERM_UPDATED', `Updated Exam Term ${value.name}.`);
      return success(value, 'Exam Term updated.');
    },
    async updateExamTermStatus(schoolId, academicSessionId, termId, status) {
      mutableSession(schoolId, academicSessionId);
      const value = findTerm(schoolId, academicSessionId, termId);
      if (
        status === 'INACTIVE' &&
        exams.some(
          item =>
            item.termId === termId &&
            ['DRAFT', 'SCHEDULED'].includes(item.status),
        )
      )
        fail(
          'EXAM_TERM_IN_USE',
          'Term cannot be deactivated while it has active or scheduled Exams.',
          409,
        );
      value.status = status;
      value.updatedAt = now();
      activity(
        'EXAM_TERM_STATUS_CHANGED',
        `Changed ${value.name} to ${status}.`,
      );
      return success(value, 'Exam Term status updated.');
    },
    getExamTypes(schoolId, query) {
      school(schoolId);
      const values = search(
        examTypes.filter(
          item =>
            item.schoolId === schoolId &&
            (!query?.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        ),
        query,
      ).sort((a, b) => a.displayOrder - b.displayOrder);
      return page(values, query);
    },
    getExamType: async (schoolId, examTypeId) =>
      success(findType(schoolId, examTypeId), 'Exam Type loaded.'),
    async createExamType(schoolId, input) {
      validateTypeInput(schoolId, input);
      const value: ExamType = {
        ...clone(input),
        id: id('exam-type'),
        schoolId,
        code: normalizeCode(input.code),
        name: input.name.trim(),
        activeExamCount: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      examTypes.push(value);
      activity('EXAM_TYPE_CREATED', `Created Exam Type ${value.name}.`);
      return success(value, 'Exam Type created.');
    },
    async updateExamType(schoolId, examTypeId, input) {
      validateTypeInput(schoolId, input, examTypeId);
      const value = findType(schoolId, examTypeId);
      Object.assign(value, clone(input), {
        code: normalizeCode(input.code),
        name: input.name.trim(),
        updatedAt: now(),
      });
      activity('EXAM_TYPE_UPDATED', `Updated Exam Type ${value.name}.`);
      return success(value, 'Exam Type updated.');
    },
    async updateExamTypeStatus(schoolId, examTypeId, status) {
      const value = findType(schoolId, examTypeId);
      if (
        status === 'INACTIVE' &&
        exams.some(
          item =>
            item.examTypeId === examTypeId &&
            ['DRAFT', 'SCHEDULED'].includes(item.status),
        )
      )
        fail(
          'EXAM_TYPE_IN_USE',
          'Exam Type cannot be deactivated while referenced by an active Exam.',
          409,
        );
      value.status = status;
      value.updatedAt = now();
      activity(
        'EXAM_TYPE_STATUS_CHANGED',
        `Changed ${value.name} to ${status}.`,
      );
      return success(value, 'Exam Type status updated.');
    },
    getGradingSchemes(schoolId, query) {
      school(schoolId);
      const values = search(
        gradingSchemes.filter(
          item =>
            item.schoolId === schoolId &&
            (!query?.status ||
              query.status === 'ALL' ||
              item.status === query.status),
        ),
        query,
      ).sort((a, b) => a.name.localeCompare(b.name));
      return page(values, query);
    },
    getGradingScheme: async (schoolId, gradingSchemeId) =>
      success(findScheme(schoolId, gradingSchemeId), 'Grading Scheme loaded.'),
    async createGradingScheme(schoolId, input) {
      const schemeId = id('grading-scheme');
      validateSchemeInput(schoolId, input, schemeId);
      const value: GradingScheme = {
        ...clone(input),
        id: schemeId,
        schoolId,
        code: normalizeCode(input.code),
        name: input.name.trim(),
        bands: input.bands.map((band, index) => ({
          ...band,
          id: band.id ?? `${schemeId}-band-${index + 1}`,
        })),
        activeExamClassCount: 0,
        createdAt: now(),
        updatedAt: now(),
      };
      gradingSchemes.push(value);
      activity(
        'GRADING_SCHEME_CREATED',
        `Created Grading Scheme ${value.name}.`,
      );
      return success(value, 'Grading Scheme created.');
    },
    async updateGradingScheme(schoolId, gradingSchemeId, input) {
      const value = findScheme(schoolId, gradingSchemeId);
      validateSchemeInput(schoolId, input, gradingSchemeId);
      Object.assign(value, clone(input), {
        code: normalizeCode(input.code),
        name: input.name.trim(),
        bands: input.bands.map((band, index) => ({
          ...band,
          id: band.id ?? `${gradingSchemeId}-band-${index + 1}`,
        })),
        updatedAt: now(),
      });
      activity(
        'GRADING_SCHEME_UPDATED',
        `Updated Grading Scheme ${value.name}.`,
      );
      return success(value, 'Grading Scheme updated.');
    },
    async updateGradingSchemeStatus(schoolId, gradingSchemeId, status) {
      const value = findScheme(schoolId, gradingSchemeId);
      if (
        status === 'INACTIVE' &&
        configurations.some(
          item =>
            item.gradingSchemeId === gradingSchemeId &&
            item.status === 'ACTIVE' &&
            ['DRAFT', 'SCHEDULED'].includes(
              findExam(schoolId, item.examId).status,
            ),
        )
      )
        fail(
          'GRADING_SCHEME_IN_USE',
          'Grading Scheme is referenced by an active Exam Class configuration.',
          409,
        );
      if (status === 'ACTIVE')
        validateSchemeInput(schoolId, { ...value, status }, gradingSchemeId);
      value.status = status;
      value.updatedAt = now();
      activity(
        status === 'ACTIVE'
          ? 'GRADING_SCHEME_ACTIVATED'
          : 'GRADING_SCHEME_DEACTIVATED',
        `Changed ${value.name} to ${status}.`,
      );
      return success(value, 'Grading Scheme status updated.');
    },
    getExams(schoolId, branchId, academicSessionId, query?: ExamListQuery) {
      branch(schoolId, branchId);
      session(schoolId, academicSessionId);
      let values = exams.filter(
        item =>
          item.schoolId === schoolId &&
          item.branchId === branchId &&
          item.academicSessionId === academicSessionId &&
          (!query?.status ||
            query.status === 'ALL' ||
            item.status === query.status) &&
          (!query?.termId || item.termId === query.termId) &&
          (!query?.examTypeId || item.examTypeId === query.examTypeId) &&
          (!query?.startDate || item.endDate >= query.startDate) &&
          (!query?.endDate || item.startDate <= query.endDate),
      );
      values = search(values, query).sort((a, b) =>
        b.startDate.localeCompare(a.startDate),
      );
      return page(
        values.map(item => details(item)),
        query,
      );
    },
    async getExam(schoolId, branchId, academicSessionId, examId) {
      const value = findExam(schoolId, examId);
      if (value.branchId !== branchId)
        fail(
          'BRANCH_SCOPE_MISMATCH',
          'Exam does not belong to this Branch.',
          403,
        );
      if (value.academicSessionId !== academicSessionId)
        fail(
          'SESSION_SCOPE_MISMATCH',
          'Exam does not belong to this Academic Session.',
          403,
        );
      return success(details(value), 'Exam loaded.');
    },
    async createExam(schoolId, input: CreateExamInput) {
      const snapshot = {
        exams: clone(exams),
        configurations: clone(configurations),
        papers: clone(papers),
      };
      try {
        const context = validateExamInput(schoolId, input);
        const value: Exam = {
          id: id('exam'),
          schoolId,
          branchId: input.branchId,
          academicSessionId: input.academicSessionId,
          termId: input.termId,
          termName: context.term.name,
          examTypeId: input.examTypeId,
          examTypeName: context.type.name,
          branchName: branch(schoolId, input.branchId).name,
          academicSessionName: context.activeSession.name,
          name: input.name.trim(),
          code: normalizeCode(input.code),
          description: input.description?.trim(),
          startDate: input.startDate,
          endDate: input.endDate,
          defaultWeightagePercent:
            input.defaultWeightagePercent ??
            context.type.defaultWeightagePercent,
          status: 'DRAFT',
          classConfigurationCount: 0,
          subjectPaperCount: 0,
          setupCompletionPercent: 0,
          setupWarnings: [],
          createdAt: now(),
          updatedAt: now(),
        };
        exams.push(value);
        if (input.classConfigurations?.length) {
          const built = buildConfigurations(value, input.classConfigurations);
          configurations.push(...built);
          if (input.subjectPapers?.length) {
            for (const configuration of built) {
              const source = input.subjectPapers.filter(
                item =>
                  item.classId === configuration.classId ||
                  item.examClassConfigurationId === configuration.id,
              );
              papers.push(...buildPapers(value, configuration, source));
            }
          }
        }
        if (failAtomic) {
          failAtomic = false;
          fail(
            'ATOMIC_EXAM_CREATION_FAILURE',
            'Atomic Exam creation failed safely.',
            500,
          );
        }
        activity('EXAM_CREATED', `Created Exam ${value.name}.`, value);
        return success(details(value), 'Exam created as Draft.');
      } catch (error) {
        exams = snapshot.exams;
        configurations = snapshot.configurations;
        papers = snapshot.papers;
        throw error;
      }
    },
    async updateExam(schoolId, examId, input: UpdateExamInput) {
      const value = editableExam(schoolId, examId);
      const context = validateExamInput(schoolId, input, examId, value);
      Object.assign(value, clone(input), {
        code: normalizeCode(input.code),
        name: input.name.trim(),
        termName: context.term.name,
        examTypeName: context.type.name,
        updatedAt: now(),
      });
      activity('EXAM_UPDATED', `Updated Exam ${value.name}.`, value);
      return success(details(value), 'Exam updated.');
    },
    async updateExamClassConfigurations(schoolId, examId, input) {
      const exam = editableExam(schoolId, examId);
      const built = buildConfigurations(exam, input.configurations);
      const retainedIds = new Set(built.map(item => item.id));
      configurations = configurations.filter(
        item => item.examId !== examId || retainedIds.has(item.id),
      );
      papers = papers.filter(
        item =>
          item.examId !== examId ||
          retainedIds.has(item.examClassConfigurationId),
      );
      built.forEach(item => {
        const index = configurations.findIndex(
          current => current.id === item.id,
        );
        if (index >= 0) configurations[index] = item;
        else configurations.push(item);
      });
      activity(
        'EXAM_CLASS_CONFIGURATION_UPDATED',
        `Updated Class configurations for ${exam.name}.`,
        exam,
      );
      return success(built, 'Exam Class configurations updated.');
    },
    async updateExamSubjectPapers(schoolId, examId, configurationId, input) {
      const exam = editableExam(schoolId, examId);
      const configuration =
        configurations.find(
          item => item.id === configurationId && item.examId === examId,
        ) ??
        fail(
          'EXAM_CLASS_CONFIGURATION_NOT_FOUND',
          'Exam Class configuration was not found.',
          404,
        );
      const built = buildPapers(exam, configuration, input.papers);
      papers = papers.filter(
        item => item.examClassConfigurationId !== configurationId,
      );
      papers.push(...built);
      configuration.subjectPaperCount = built.length;
      configuration.totalMaximumMarks = built.reduce(
        (total, item) => total + item.totalMaximumMarks,
        0,
      );
      configuration.updatedAt = now();
      activity(
        'EXAM_SUBJECT_PAPERS_UPDATED',
        `Updated Subject Papers for ${configuration.classNameSnapshot}.`,
        exam,
        configuration.classId,
      );
      return success(built, 'Subject Papers updated.');
    },
    async updateExamSchedule(schoolId, examId, input) {
      const exam = editableExam(schoolId, examId);
      const snapshot = clone(papers);
      try {
        const ids = new Set<string>();
        input.schedules.forEach(scheduleInput => {
          if (ids.has(scheduleInput.paperId))
            fail(
              'DUPLICATE_SUBJECT_SCHEDULE',
              'A Subject Paper schedule was submitted more than once.',
              409,
            );
          ids.add(scheduleInput.paperId);
          const paper =
            papers.find(
              item =>
                item.id === scheduleInput.paperId && item.examId === examId,
            ) ??
            fail('EXAM_PAPER_NOT_FOUND', 'Subject Paper was not found.', 404);
          Object.assign(paper, clone(scheduleInput), {
            room: scheduleInput.room?.trim() || undefined,
            updatedAt: now(),
          });
        });
        const value = session(schoolId, exam.academicSessionId);
        const conflicts = detectScheduleConflicts({
          configurations: configurations.filter(item => item.examId === examId),
          examEndDate: exam.endDate,
          examStartDate: exam.startDate,
          papers: papers.filter(item => item.examId === examId),
          sessionEndDate: value.endDate,
          sessionStartDate: value.startDate,
        });
        const blocking = conflicts.find(
          item =>
            item.severity === 'BLOCKER' && item.code !== 'MISSING_SCHEDULE',
        );
        if (blocking) fail('BLOCKING_SCHEDULE_CONFLICT', blocking.message, 409);
        activity(
          'EXAM_SCHEDULE_UPDATED',
          `Updated schedule for ${exam.name}.`,
          exam,
        );
        return success(
          papers.filter(item => item.examId === examId),
          'Exam schedule updated.',
        );
      } catch (error) {
        papers = snapshot;
        throw error;
      }
    },
    async validateExamSetup(schoolId, examId) {
      const exam = findExam(schoolId, examId);
      const value = validationFor(exam);
      activity(
        'EXAM_SETUP_VALIDATED',
        `Validated setup for ${exam.name}.`,
        exam,
      );
      return success(
        value,
        value.isComplete
          ? 'Exam setup is complete.'
          : 'Exam setup needs attention.',
      );
    },
    async scheduleExam(schoolId, examId) {
      const exam = editableExam(schoolId, examId);
      const validation = validationFor(exam);
      if (!validation.isComplete)
        fail(
          'INCOMPLETE_EXAM_SETUP',
          'Resolve all setup blockers before scheduling the Exam.',
          409,
        );
      exam.status = 'SCHEDULED';
      setExamLifecycleStatus(exam.id, 'SCHEDULED');
      exam.scheduledAt = now();
      exam.updatedAt = now();
      configurations
        .filter(item => item.examId === examId)
        .forEach(item => {
          item.sectionSnapshots = clone(item.sectionSnapshots);
        });
      papers
        .filter(item => item.examId === examId)
        .forEach(item => {
          item.status = 'SCHEDULED';
        });
      activity('EXAM_SCHEDULED', `Scheduled Exam ${exam.name}.`, exam);
      return success(details(exam), 'Exam scheduled.');
    },
    async returnExamToDraft(schoolId, examId) {
      const exam = findExam(schoolId, examId);
      mutableSession(schoolId, exam.academicSessionId);
      const lifecycleStatus = getExamLifecycleStatus(exam.id, exam.status);
      if (lifecycleStatus !== 'SCHEDULED')
        fail(
          'INVALID_EXAM_TRANSITION',
          'Only a Scheduled Exam can return to Draft.',
          409,
        );
      exam.status = 'DRAFT';
      setExamLifecycleStatus(exam.id, 'DRAFT');
      exam.scheduledAt = undefined;
      exam.updatedAt = now();
      papers
        .filter(item => item.examId === examId)
        .forEach(item => {
          item.status = 'DRAFT';
        });
      activity(
        'EXAM_RETURNED_TO_DRAFT',
        `Returned ${exam.name} to Draft.`,
        exam,
      );
      return success(details(exam), 'Exam returned to Draft.');
    },
    async previewCopyExam(schoolId, examId, input) {
      const source = findExam(schoolId, examId);
      branch(schoolId, input.destinationBranchId);
      const destinationSession = session(
        schoolId,
        input.destinationAcademicSessionId,
      );
      if (destinationSession.status === 'CLOSED')
        fail(
          'CLOSED_ACADEMIC_SESSION',
          'Cannot copy an Exam into a closed Academic Session.',
          409,
        );
      findTerm(schoolId, destinationSession.id, input.destinationTermId);
      const sourceConfigurations = configurations.filter(
        item => item.examId === examId,
      );
      const sourceClasses = sourceConfigurations
        .map(item =>
          INITIAL_ACADEMIC_CLASSES.find(value => value.id === item.classId),
        )
        .filter((item): item is AcademicClass => Boolean(item));
      const destinationClasses = INITIAL_ACADEMIC_CLASSES.filter(
        item =>
          item.schoolId === schoolId &&
          item.branchId === input.destinationBranchId &&
          item.academicSessionId === input.destinationAcademicSessionId &&
          item.status === 'ACTIVE' &&
          classSections(item.id).length > 0,
      );
      const sourcePapers = papers.filter(item => item.examId === examId);
      const sourceSubjects = sourcePapers
        .map(item => subjectEntity(schoolId, item.subjectId))
        .filter((item): item is Subject => Boolean(item));
      const match = matchExamCopyEntities({
        destinationAssignments: INITIAL_CLASS_SUBJECT_ASSIGNMENTS.filter(
          item =>
            item.branchId === input.destinationBranchId &&
            item.academicSessionId === input.destinationAcademicSessionId,
        ),
        destinationClasses,
        destinationSubjects: INITIAL_SUBJECTS.filter(
          item => item.schoolId === schoolId,
        ),
        sourceClasses,
        sourceSubjects,
      });
      const warnings: ExamSetupIssue[] = [
        ...match.omittedClassCodes.map(code => ({
          code: 'COPY_CLASS_OMITTED',
          message: `Class ${code} is unavailable, has no active Sections, or is inactive at the destination.`,
          severity: 'WARNING' as const,
        })),
        ...match.omittedSubjectCodes.map(code => ({
          code: 'COPY_SUBJECT_OMITTED',
          message: `Subject ${code} is unavailable, inactive, or unassigned at the destination.`,
          severity: 'WARNING' as const,
        })),
      ];
      const preview: ExamCopyPreview = {
        sourceExamId: source.id,
        destinationBranchId: input.destinationBranchId,
        destinationAcademicSessionId: input.destinationAcademicSessionId,
        destinationTermId: input.destinationTermId,
        matchedClassCount: Object.keys(match.classIdBySourceClassId).length,
        matchedSubjectCount: Object.keys(match.subjectIdBySourceSubjectId)
          .length,
        omittedClassCodes: match.omittedClassCodes,
        omittedSubjectCodes: match.omittedSubjectCodes,
        warnings,
      };
      return success(preview, 'Exam copy preview prepared.');
    },
    async copyExam(schoolId, examId, input) {
      const preview = (await service.previewCopyExam(schoolId, examId, input))
        .data;
      const source = findExam(schoolId, examId);
      const destinationTerm = findTerm(
        schoolId,
        input.destinationAcademicSessionId,
        input.destinationTermId,
      );
      const result = await service.createExam(schoolId, {
        academicSessionId: input.destinationAcademicSessionId,
        branchId: input.destinationBranchId,
        code: input.code,
        defaultWeightagePercent: source.defaultWeightagePercent,
        description: source.description,
        endDate: destinationTerm.endDate,
        examTypeId: source.examTypeId,
        name: input.name,
        startDate: destinationTerm.startDate,
        termId: input.destinationTermId,
      });
      const copied = findExam(schoolId, result.data.id);
      const sourceConfigurations = configurations.filter(
        item => item.examId === source.id && item.status === 'ACTIVE',
      );
      const destinationClasses = INITIAL_ACADEMIC_CLASSES.filter(
        item =>
          item.schoolId === schoolId &&
          item.branchId === input.destinationBranchId &&
          item.academicSessionId === input.destinationAcademicSessionId &&
          item.status === 'ACTIVE' &&
          classSections(item.id).length > 0,
      );
      const configurationInputs = sourceConfigurations.flatMap(
        sourceConfiguration => {
          const destinationClass = destinationClasses.find(
            item =>
              item.code.toUpperCase() ===
              sourceConfiguration.classCodeSnapshot.toUpperCase(),
          );
          const scheme = gradingSchemes.find(
            item =>
              item.id === sourceConfiguration.gradingSchemeId &&
              item.schoolId === schoolId &&
              item.status === 'ACTIVE',
          );
          if (!destinationClass || !scheme) return [];
          return [
            {
              classId: destinationClass.id,
              gradingSchemeId: scheme.id,
              includeOptionalSubjectsInTotal:
                sourceConfiguration.includeOptionalSubjectsInTotal,
              overallPassPercentage: sourceConfiguration.overallPassPercentage,
              rankEnabled: sourceConfiguration.rankEnabled,
              requirePassInEverySubject:
                sourceConfiguration.requirePassInEverySubject,
              sectionApplicability: 'ALL_ACTIVE_SECTIONS' as const,
              sectionIds: classSections(destinationClass.id).map(
                item => item.id,
              ),
            },
          ];
        },
      );
      if (configurationInputs.length > 0) {
        const copiedConfigurations = (
          await service.updateExamClassConfigurations(schoolId, copied.id, {
            configurations: configurationInputs,
          })
        ).data;
        for (const copiedConfiguration of copiedConfigurations) {
          const sourceConfiguration = sourceConfigurations.find(
            item =>
              item.classCodeSnapshot.toUpperCase() ===
              copiedConfiguration.classCodeSnapshot.toUpperCase(),
          );
          if (!sourceConfiguration) continue;
          const copiedPaperInputs = papers
            .filter(
              item =>
                item.examId === source.id &&
                item.examClassConfigurationId === sourceConfiguration.id &&
                item.status !== 'CANCELLED',
            )
            .filter(sourcePaper => {
              const subject = subjectEntity(schoolId, sourcePaper.subjectId);
              const assignment = INITIAL_CLASS_SUBJECT_ASSIGNMENTS.find(
                item =>
                  item.classId === copiedConfiguration.classId &&
                  item.subjectId === sourcePaper.subjectId &&
                  item.branchId === input.destinationBranchId &&
                  item.academicSessionId === input.destinationAcademicSessionId,
              );
              return isSubjectEligible({
                academicSessionId: input.destinationAcademicSessionId,
                assignment,
                branchId: input.destinationBranchId,
                classId: copiedConfiguration.classId,
                schoolId,
                subject,
              });
            })
            .map(sourcePaper => ({
              components: sourcePaper.components.map(component => ({
                displayOrder: component.displayOrder,
                marksEntryRequired: component.marksEntryRequired,
                maximumMarks: component.maximumMarks,
                name: component.name,
                passMarks: component.passMarks,
                type: component.type,
              })),
              displayOrder: sourcePaper.displayOrder,
              subjectId: sourcePaper.subjectId,
              totalMaximumMarks: sourcePaper.totalMaximumMarks,
              totalPassMarks: sourcePaper.totalPassMarks,
              weightagePercent: sourcePaper.weightagePercent,
            }));
          if (copiedPaperInputs.length > 0)
            await service.updateExamSubjectPapers(
              schoolId,
              copied.id,
              copiedConfiguration.id,
              { papers: copiedPaperInputs },
            );
        }
      }
      activity(
        'EXAM_COPIED',
        `Copied ${source.name} to ${copied.name}.`,
        copied,
      );
      return success(
        { exam: details(copied), warnings: preview.warnings },
        'Exam copied as Draft.',
      );
    },
    async cancelExam(schoolId, examId, input) {
      const exam = findExam(schoolId, examId);
      mutableSession(schoolId, exam.academicSessionId);
      const lifecycleStatus = getExamLifecycleStatus(exam.id, exam.status);
      if (!['DRAFT', 'SCHEDULED'].includes(lifecycleStatus))
        fail(
          'INVALID_EXAM_TRANSITION',
          'Only Draft or Scheduled Exams can be cancelled.',
          409,
        );
      if (!input.reason.trim())
        fail(
          'CANCELLATION_REASON_REQUIRED',
          'Cancellation reason is required.',
          400,
          { reason: 'Enter a cancellation reason.' },
        );
      exam.status = 'CANCELLED';
      setExamLifecycleStatus(exam.id, 'CANCELLED');
      exam.cancellationReason = input.reason.trim();
      exam.cancelledAt = now();
      exam.cancelledByUserId = input.actingUserId;
      exam.updatedAt = now();
      papers
        .filter(item => item.examId === examId)
        .forEach(item => {
          item.status = 'CANCELLED';
        });
      activity(
        'EXAM_CANCELLED',
        `Cancelled ${exam.name}: ${input.reason.trim()}`,
        exam,
        undefined,
        input.actingUserId,
      );
      return success(details(exam), 'Exam cancelled.');
    },
  };
  return service;
}

export const mockExaminationSetupService = createMockExaminationSetupService();
