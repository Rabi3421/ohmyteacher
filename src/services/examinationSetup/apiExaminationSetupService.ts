import { apiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CancelExamInput,
  CopyExamInput,
  CreateExamInput,
  CreateExamTermInput,
  CreateExamTypeInput,
  CreateGradingSchemeInput,
  Exam,
  ExamClassConfiguration,
  ExamCopyPreview,
  ExamCopyResult,
  ExamDetails,
  ExaminationSetupSummary,
  ExamListQuery,
  ExamSetupValidationResult,
  ExamSubjectPaper,
  ExamTerm,
  ExamTermListQuery,
  ExamTermStatus,
  ExamType,
  ExamTypeListQuery,
  ExamTypeStatus,
  GradingScheme,
  GradingSchemeListQuery,
  GradingSchemeStatus,
  PreviewCopyExamInput,
  UpdateExamClassConfigurationsInput,
  UpdateExamInput,
  UpdateExamScheduleInput,
  UpdateExamSubjectPapersInput,
  UpdateExamTermInput,
  UpdateExamTypeInput,
  UpdateGradingSchemeInput,
} from '../../models/examination';
import type { ExaminationSetupService } from './examinationSetupService';

// ---- Backend response shapes ------------------------------------------------

interface BackendExam {
  id: number;
  branch: number;
  school_class: number;
  name: string;
  exam_type: string;
  mode: string;
  start_date: string;
  end_date: string;
  duration_minutes: number | null;
  fee_amount: string | null;
  is_published: boolean;
  is_active: boolean;
  created_at: string;
}

interface BackendExamSubject {
  id: number;
  exam: number;
  subject: number;
  subject_name: string;
  max_marks: string;
  passing_marks: string | null;
  created_at: string;
}

// ---- Helpers ----------------------------------------------------------------

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
    message: `${operation} is not available in this version. This feature is planned for a future release.`,
    status: 501,
  });
}

const EXAM_TYPE_NAMES: Record<string, string> = {
  unit_test: 'Unit Test',
  half_yearly: 'Half Yearly',
  annual: 'Annual',
  other: 'Other',
};

function mapExamStatus(exam: BackendExam): Exam['status'] {
  if (!exam.is_active) return 'CANCELLED';
  if (exam.is_published) return 'SCHEDULED';
  return 'DRAFT';
}

// ---- Mapping: BackendExam → Exam --------------------------------------------

function mapExam(e: BackendExam): Exam {
  return {
    id: String(e.id),
    schoolId: String(e.branch),
    branchId: String(e.branch),
    academicSessionId: '',
    termId: '',
    termName: '',
    examTypeId: e.exam_type,
    examTypeName: EXAM_TYPE_NAMES[e.exam_type] ?? e.exam_type,
    branchName: '',
    academicSessionName: '',
    name: e.name,
    code: `EXAM-${e.id}`,
    startDate: e.start_date,
    endDate: e.end_date,
    status: mapExamStatus(e),
    classConfigurationCount: 1,
    subjectPaperCount: 0,
    setupCompletionPercent: e.is_published ? 100 : 50,
    setupWarnings: [],
    createdAt: e.created_at,
    updatedAt: e.created_at,
  };
}

function mapExamDetails(e: BackendExam, subjects: BackendExamSubject[] = []): ExamDetails {
  const papers: ExamSubjectPaper[] = subjects.map(s => ({
    id: String(s.id),
    examId: String(e.id),
    examClassConfigurationId: String(e.school_class),
    schoolId: String(e.branch),
    branchId: String(e.branch),
    academicSessionId: '',
    classId: String(e.school_class),
    subjectId: String(s.subject),
    subjectNameSnapshot: s.subject_name,
    subjectCodeSnapshot: '',
    subjectTypeSnapshot: 'CORE' as const,
    totalMaximumMarks: parseFloat(s.max_marks) || 0,
    totalPassMarks: s.passing_marks ? parseFloat(s.passing_marks) : 0,
    components: [],
    displayOrder: s.id,
    status: 'SCHEDULED' as const,
    createdAt: s.created_at,
    updatedAt: s.created_at,
  }));

  const classConfig: ExamClassConfiguration = {
    id: String(e.school_class),
    examId: String(e.id),
    schoolId: String(e.branch),
    branchId: String(e.branch),
    academicSessionId: '',
    classId: String(e.school_class),
    classNameSnapshot: '',
    classCodeSnapshot: '',
    sectionApplicability: 'ALL_ACTIVE_SECTIONS',
    sectionIds: [],
    sectionSnapshots: [],
    gradingSchemeId: '',
    gradingSchemeNameSnapshot: 'Default',
    requirePassInEverySubject: true,
    includeOptionalSubjectsInTotal: false,
    rankEnabled: true,
    subjectPaperCount: papers.length,
    totalMaximumMarks: papers.reduce((s, p) => s + p.totalMaximumMarks, 0),
    status: 'ACTIVE',
    createdAt: e.created_at,
    updatedAt: e.created_at,
  };

  const validation: ExamSetupValidationResult = {
    isComplete: e.is_published,
    completionPercent: e.is_published ? 100 : subjects.length > 0 ? 60 : 30,
    blockers: [],
    warnings: [],
  };

  return {
    ...mapExam(e),
    subjectPaperCount: papers.length,
    classConfigurations: [classConfig],
    subjectPapers: papers,
    setupValidation: validation,
    scheduleConflicts: [],
  };
}

// ---- API helpers ------------------------------------------------------------

async function fetchExam(examId: string): Promise<BackendExam> {
  const raw = await apiClient.get<unknown>(`/exams/${examId}/`);
  return (raw as Record<string, unknown>).exam as BackendExam;
}

async function fetchExamSubjects(examId: string): Promise<BackendExamSubject[]> {
  const raw = await apiClient.get<unknown>(`/exams/${examId}/subjects/`);
  const data = raw as Record<string, unknown>;
  return Array.isArray(data.exam_subjects) ? (data.exam_subjects as BackendExamSubject[]) : [];
}

// ---- Service implementation -------------------------------------------------

export const apiExaminationSetupService: ExaminationSetupService = {
  async getExaminationSetupSummary(_schoolId, _branchId, _sessionId) {
    const raw = await apiClient.get<unknown>('/exams/');
    const data = raw as Record<string, unknown>;
    const exams = (Array.isArray(data.exams) ? data.exams : []) as BackendExam[];

    const summary: ExaminationSetupSummary = {
      activeTerms: 0,
      activeExamTypes: new Set(exams.map(e => e.exam_type)).size,
      activeGradingSchemes: 1,
      draftExams: exams.filter(e => !e.is_published && e.is_active).length,
      scheduledExams: exams.filter(e => e.is_published && e.is_active).length,
      incompleteExams: exams.filter(e => !e.is_published && e.is_active).length,
      upcomingPapers: 0,
      scheduleConflicts: 0,
      warnings: [],
    };
    return success(summary);
  },

  async getExamTerms(_schoolId, _sessionId, _query?: ExamTermListQuery) {
    return success(paginate<ExamTerm>([]));
  },

  async getExamTerm(_schoolId, _sessionId, _termId) {
    notSupported('getExamTerm');
  },

  async createExamTerm(_schoolId, _sessionId, _input: CreateExamTermInput) {
    notSupported('createExamTerm');
  },

  async updateExamTerm(_schoolId, _sessionId, _termId, _input: UpdateExamTermInput) {
    notSupported('updateExamTerm');
  },

  async updateExamTermStatus(_schoolId, _sessionId, _termId, _status: ExamTermStatus) {
    notSupported('updateExamTermStatus');
  },

  async getExamTypes(_schoolId, _query?: ExamTypeListQuery) {
    const types: ExamType[] = Object.entries(EXAM_TYPE_NAMES).map(([code, name], i) => ({
      id: code,
      schoolId: '',
      name,
      code,
      displayOrder: i + 1,
      status: 'ACTIVE' as const,
      activeExamCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    return success(paginate(types));
  },

  async getExamType(_schoolId, examTypeId) {
    const name = EXAM_TYPE_NAMES[examTypeId] ?? examTypeId;
    const type: ExamType = {
      id: examTypeId,
      schoolId: '',
      name,
      code: examTypeId,
      displayOrder: 1,
      status: 'ACTIVE',
      activeExamCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return success(type);
  },

  async createExamType(_schoolId, _input: CreateExamTypeInput) {
    notSupported('createExamType');
  },

  async updateExamType(_schoolId, _examTypeId, _input: UpdateExamTypeInput) {
    notSupported('updateExamType');
  },

  async updateExamTypeStatus(_schoolId, _examTypeId, _status: ExamTypeStatus) {
    notSupported('updateExamTypeStatus');
  },

  async getGradingSchemes(_schoolId, _query?: GradingSchemeListQuery) {
    const defaultScheme: GradingScheme = {
      id: 'default',
      schoolId: '',
      name: 'Default Grading',
      code: 'DEFAULT',
      bands: [
        { id: '1', minimumPercentage: 90, maximumPercentage: 100, grade: 'A+', gradePoint: 10, remark: 'Outstanding', isPassing: true, displayOrder: 1 },
        { id: '2', minimumPercentage: 80, maximumPercentage: 89, grade: 'A', gradePoint: 9, remark: 'Excellent', isPassing: true, displayOrder: 2 },
        { id: '3', minimumPercentage: 70, maximumPercentage: 79, grade: 'B+', gradePoint: 8, remark: 'Very Good', isPassing: true, displayOrder: 3 },
        { id: '4', minimumPercentage: 60, maximumPercentage: 69, grade: 'B', gradePoint: 7, remark: 'Good', isPassing: true, displayOrder: 4 },
        { id: '5', minimumPercentage: 50, maximumPercentage: 59, grade: 'C', gradePoint: 6, remark: 'Average', isPassing: true, displayOrder: 5 },
        { id: '6', minimumPercentage: 33, maximumPercentage: 49, grade: 'D', gradePoint: 5, remark: 'Below Average', isPassing: true, displayOrder: 6 },
        { id: '7', minimumPercentage: 0, maximumPercentage: 32, grade: 'F', gradePoint: 0, remark: 'Fail', isPassing: false, displayOrder: 7 },
      ],
      isDefault: true,
      status: 'ACTIVE',
      activeExamClassCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return success(paginate([defaultScheme]));
  },

  async getGradingScheme(_schoolId, _gradingSchemeId) {
    return (await apiExaminationSetupService.getGradingSchemes(_schoolId)).data.items[0]
      ? success((await apiExaminationSetupService.getGradingSchemes(_schoolId)).data.items[0])
      : notSupported('getGradingScheme');
  },

  async createGradingScheme(_schoolId, _input: CreateGradingSchemeInput) {
    notSupported('createGradingScheme');
  },

  async updateGradingScheme(_schoolId, _schemeId, _input: UpdateGradingSchemeInput) {
    notSupported('updateGradingScheme');
  },

  async updateGradingSchemeStatus(_schoolId, _schemeId, _status: GradingSchemeStatus) {
    notSupported('updateGradingSchemeStatus');
  },

  async getExams(_schoolId, _branchId, _sessionId, query?: ExamListQuery) {
    const params: Record<string, string | number | undefined> = {};
    if (query?.examTypeId) params.exam_type = query.examTypeId;

    const raw = await apiClient.get<unknown>('/exams/', { query: params });
    const data = raw as Record<string, unknown>;
    const exams = (Array.isArray(data.exams) ? data.exams : []) as BackendExam[];
    const mapped = exams.map(mapExam);
    return success(paginate(mapped));
  },

  async getExam(_schoolId, _branchId, _sessionId, examId) {
    const exam = await fetchExam(examId);
    const subjects = await fetchExamSubjects(examId);
    return success(mapExamDetails(exam, subjects));
  },

  async createExam(_schoolId, input: CreateExamInput) {
    const examTypeMap: Record<string, string> = {
      unit_test: 'unit_test',
      half_yearly: 'half_yearly',
      annual: 'annual',
      other: 'other',
    };

    const classConfig = input.classConfigurations?.[0];
    const classId = classConfig?.classId ?? '';

    const body: Record<string, unknown> = {
      school_class: parseInt(classId, 10) || 0,
      name: input.name,
      exam_type: examTypeMap[input.examTypeId] ?? 'other',
      mode: 'offline',
      start_date: input.startDate,
      end_date: input.endDate,
    };

    const raw = await apiClient.post<unknown>('/exams/', body);
    const data = raw as Record<string, unknown>;
    const exam = data.exam as BackendExam;
    return success(mapExamDetails(exam));
  },

  async updateExam(_schoolId, examId, input: UpdateExamInput) {
    const body: Record<string, unknown> = {};
    if (input.name) body.name = input.name;
    if (input.startDate) body.start_date = input.startDate;
    if (input.endDate) body.end_date = input.endDate;

    const raw = await apiClient.patch<unknown>(`/exams/${examId}/`, body);
    const data = raw as Record<string, unknown>;
    const exam = data.exam as BackendExam;
    const subjects = await fetchExamSubjects(examId);
    return success(mapExamDetails(exam, subjects));
  },

  async updateExamClassConfigurations(_schoolId, _examId, _input: UpdateExamClassConfigurationsInput) {
    notSupported('updateExamClassConfigurations');
  },

  async updateExamSubjectPapers(_schoolId, examId, _classConfigId, input: UpdateExamSubjectPapersInput) {
    const papers: ExamSubjectPaper[] = [];
    for (const paper of (input.papers ?? [])) {
      const body = {
        subject: parseInt(paper.subjectId, 10),
        max_marks: paper.totalMaximumMarks,
        passing_marks: paper.totalPassMarks ?? null,
      };
      await apiClient.post<unknown>(`/exams/${examId}/subjects/`, body);
    }
    return success(papers);
  },

  async updateExamSchedule(_schoolId, _examId, _input: UpdateExamScheduleInput) {
    notSupported('updateExamSchedule');
  },

  async validateExamSetup(_schoolId, examId) {
    const exam = await fetchExam(examId);
    const subjects = await fetchExamSubjects(examId);
    const result: ExamSetupValidationResult = {
      isComplete: subjects.length > 0,
      completionPercent: subjects.length > 0 ? (exam.is_published ? 100 : 70) : 30,
      blockers: subjects.length === 0 ? [{ code: 'NO_SUBJECTS', severity: 'BLOCKER', message: 'Add at least one subject to the exam.' }] : [],
      warnings: [],
    };
    return success(result);
  },

  async scheduleExam(_schoolId, examId) {
    const raw = await apiClient.patch<unknown>(`/exams/${examId}/status/`, { is_active: true });
    const data = raw as Record<string, unknown>;
    const exam = data.exam as BackendExam;
    const subjects = await fetchExamSubjects(examId);
    return success(mapExamDetails(exam, subjects));
  },

  async returnExamToDraft(_schoolId, examId) {
    const raw = await apiClient.patch<unknown>(`/exams/${examId}/status/`, { is_active: true });
    const data = raw as Record<string, unknown>;
    const exam = data.exam as BackendExam;
    return success(mapExamDetails(exam));
  },

  async previewCopyExam(_schoolId, _examId, _input: PreviewCopyExamInput) {
    notSupported('previewCopyExam');
  },

  async copyExam(_schoolId, _examId, _input: CopyExamInput) {
    notSupported('copyExam');
  },

  async cancelExam(_schoolId, examId, _input: CancelExamInput) {
    const raw = await apiClient.patch<unknown>(`/exams/${examId}/status/`, { is_active: false });
    const data = raw as Record<string, unknown>;
    const exam = data.exam as BackendExam;
    const subjects = await fetchExamSubjects(examId);
    return success(mapExamDetails(exam, subjects));
  },
};
