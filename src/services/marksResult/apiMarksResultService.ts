import { apiClient } from '../api/apiClient';
import { ApiClientError } from '../api/apiError';
import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CalculateResultsInput,
  ClassResultSummary,
  GetRankListInput,
  MarkSheetActionInput,
  MarkSheetDetails,
  MarkSheetHistoryRecord,
  MarkSheetListQuery,
  MarkSheetSummary,
  MarksDashboardSummary,
  PreviewResultCalculationInput,
  PublishResultsInput,
  RankEntry,
  ResultCalculationPreview,
  ResultCalculationResult,
  ResultListQuery,
  ResultProcessingSummary,
  ResultPublicationBatch,
  ResultPublicationHistory,
  ResultReviewRecord,
  ReviewResultsInput,
  ReturnMarkSheetToDraftInput,
  SaveMarkSheetDraftInput,
  SectionResultSummary,
  StudentOverallResult,
  StudentResultDetails,
  StudentSubjectResult,
  UnlockMarkSheetInput,
  UnpublishResultsInput,
} from '../../models/marksResult';
import type { MarksResultService } from './marksResultService';

// ---- Backend response shapes ------------------------------------------------

interface BackendMarksEntry {
  id: number;
  exam_subject: number;
  student: number;
  student_name: string;
  marks_obtained: string | null;
  is_absent: boolean;
  entered_by: number;
  created_at: string;
  updated_at: string;
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

interface BackendResultSummary {
  id: number;
  exam: number;
  exam_name: string;
  student: number;
  student_name: string;
  total_marks_obtained: string;
  total_max_marks: string;
  percentage: string;
  grade: string;
  rank: number | null;
  is_pass: boolean;
  computed_at: string;
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
    message: `${operation} is not available in this version.`,
    status: 501,
  });
}

const EMPTY_RESULT_RUN = {
  id: '',
  schoolId: '',
  examId: '',
  scope: 'COMPLETE_EXAM' as const,
  status: 'COMPLETED' as const,
  sourceVersions: {} as Record<string, number>,
  studentCount: 0,
  completedCount: 0,
  failedCount: 0,
  startedAt: new Date().toISOString(),
};

// ---- Mapping helpers --------------------------------------------------------

function mapMarkSheetSummary(
  subject: BackendExamSubject,
  entries: BackendMarksEntry[],
): MarkSheetSummary {
  const presentCount = entries.filter(e => !e.is_absent).length;
  const absentCount = entries.filter(e => e.is_absent).length;
  const completedCount = entries.filter(e => e.is_absent || e.marks_obtained !== null).length;
  const total = entries.length;

  let status: MarkSheetSummary['status'] = 'NOT_STARTED';
  if (completedCount === total && total > 0) status = 'SUBMITTED';
  else if (completedCount > 0) status = 'DRAFT';

  return {
    id: String(subject.id),
    schoolId: '',
    branchId: '',
    academicSessionId: '',
    examId: String(subject.exam),
    examClassConfigurationId: '',
    sectionId: '',
    subjectPaperId: String(subject.id),
    classNameSnapshot: '',
    sectionNameSnapshot: '',
    subjectNameSnapshot: subject.subject_name,
    subjectCodeSnapshot: '',
    paperMaximumMarksSnapshot: parseFloat(subject.max_marks) || 0,
    paperPassMarksSnapshot: subject.passing_marks ? parseFloat(subject.passing_marks) : 0,
    status,
    studentCount: total,
    presentCount,
    absentCount,
    exemptCount: 0,
    completedStudentCount: completedCount,
    invalidStudentCount: 0,
    version: 1,
    createdAt: subject.created_at,
    updatedAt: subject.created_at,
  };
}

function mapMarkSheetDetails(
  subject: BackendExamSubject,
  entries: BackendMarksEntry[],
): MarkSheetDetails {
  const summary = mapMarkSheetSummary(subject, entries);
  const maxMarks = parseFloat(subject.max_marks) || 0;
  const passMarks = subject.passing_marks ? parseFloat(subject.passing_marks) : 0;

  const students: MarkSheetDetails['students'] = entries.map(e => ({
    studentId: String(e.student),
    enrollmentId: String(e.student),
    studentName: e.student_name,
    admissionNumber: '',
    mark: {
      id: String(e.id),
      markSheetId: String(subject.id),
      schoolId: '',
      branchId: '',
      academicSessionId: '',
      examId: String(subject.exam),
      examClassConfigurationId: '',
      sectionId: '',
      subjectPaperId: String(subject.id),
      subjectId: String(subject.subject),
      subjectNameSnapshot: subject.subject_name,
      subjectCodeSnapshot: '',
      subjectTypeSnapshot: 'CORE' as const,
      paperMaximumMarksSnapshot: maxMarks,
      paperPassMarksSnapshot: passMarks,
      gradingSchemeIdSnapshot: 'default',
      gradeBandsSnapshot: [],
      studentId: String(e.student),
      enrollmentId: String(e.student),
      attendanceStatus: e.is_absent ? 'ABSENT' as const : 'PRESENT' as const,
      componentMarks: [],
      totalMarksObtained: e.marks_obtained ? parseFloat(e.marks_obtained) : undefined,
      version: 1,
      enteredByUserId: String(e.entered_by),
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    },
  }));

  const completedCount = entries.filter(e => e.is_absent || e.marks_obtained !== null).length;
  const marks = entries
    .filter(e => e.marks_obtained !== null)
    .map(e => parseFloat(e.marks_obtained!));
  const high = marks.length ? Math.max(...marks) : undefined;
  const low = marks.length ? Math.min(...marks) : undefined;
  const avg = marks.length ? marks.reduce((s, m) => s + m, 0) / marks.length : undefined;

  return {
    ...summary,
    examNameSnapshot: '',
    students,
    validation: {
      isValid: completedCount === entries.length,
      isComplete: completedCount === entries.length && entries.length > 0,
      totalMarksObtained: marks.reduce((s, m) => s + m, 0),
      issues: [],
    },
    reviewSummary: {
      totalStudents: entries.length,
      present: entries.filter(e => !e.is_absent).length,
      absent: entries.filter(e => e.is_absent).length,
      exempt: 0,
      completed: completedCount,
      incomplete: entries.length - completedCount,
      invalid: 0,
      highestMarks: high,
      lowestMarks: low,
      averageMarks: avg,
      paperMaximumMarks: maxMarks,
      paperPassMarks: passMarks,
      blockers: [],
    },
  };
}

function mapOverallResult(r: BackendResultSummary): StudentOverallResult {
  const percentage = parseFloat(r.percentage) || 0;
  return {
    id: String(r.id),
    schoolId: '',
    branchId: '',
    academicSessionId: '',
    examId: String(r.exam),
    examClassConfigurationId: '',
    sectionId: '',
    studentId: String(r.student),
    enrollmentId: String(r.student),
    studentNameSnapshot: r.student_name,
    admissionNumberSnapshot: '',
    classNameSnapshot: '',
    sectionNameSnapshot: '',
    totalMaximumMarks: parseFloat(r.total_max_marks) || 0,
    totalMarksObtained: parseFloat(r.total_marks_obtained) || 0,
    percentage,
    percentageBasisPoints: Math.round(percentage * 100),
    grade: r.grade,
    passedSubjectCount: r.is_pass ? 1 : 0,
    failedSubjectCount: r.is_pass ? 0 : 1,
    absentSubjectCount: 0,
    exemptSubjectCount: 0,
    outcome: r.is_pass ? 'PASS' as const : 'FAIL' as const,
    rank: r.rank ?? undefined,
    calculationRunId: String(r.id),
    calculationVersion: 1,
    resultStatus: 'CALCULATED' as const,
    createdAt: r.computed_at,
    updatedAt: r.computed_at,
  };
}

// ---- API helpers ------------------------------------------------------------

async function fetchExamSubjects(examId: string): Promise<BackendExamSubject[]> {
  const raw = await apiClient.get<unknown>(`/exams/${examId}/subjects/`);
  const data = raw as Record<string, unknown>;
  return Array.isArray(data.exam_subjects) ? (data.exam_subjects as BackendExamSubject[]) : [];
}

async function fetchMarksEntries(examId: string, examSubjectId?: string): Promise<BackendMarksEntry[]> {
  const query: Record<string, string | number | undefined> = {};
  if (examSubjectId) query.exam_subject = examSubjectId;
  const raw = await apiClient.get<unknown>(`/exams/${examId}/marks/`, { query });
  const data = raw as Record<string, unknown>;
  return Array.isArray(data.marks) ? (data.marks as BackendMarksEntry[]) : [];
}

async function fetchResults(examId: string): Promise<BackendResultSummary[]> {
  const raw = await apiClient.get<unknown>(`/exams/${examId}/results/`);
  const data = raw as Record<string, unknown>;
  return Array.isArray(data.results) ? (data.results as BackendResultSummary[]) : [];
}

// ---- Service implementation -------------------------------------------------

export const apiMarksResultService: MarksResultService = {
  async getMarksDashboard(_schoolId, _branchId, _sessionId, examId) {
    const subjects = await fetchExamSubjects(examId);
    const entries = await fetchMarksEntries(examId);

    const completedBySubject = subjects.map(s => {
      const se = entries.filter(e => e.exam_subject === s.id);
      return se.filter(e => e.is_absent || e.marks_obtained !== null).length === se.length && se.length > 0;
    });

    const summary: MarksDashboardSummary = {
      totalMarkSheets: subjects.length,
      notStarted: subjects.filter((_, i) => !completedBySubject[i]).length,
      draft: 0,
      submitted: completedBySubject.filter(Boolean).length,
      locked: 0,
      incompleteStudents: 0,
      invalidMarks: 0,
      resultsReady: 0,
      publishedSections: 0,
      warnings: [],
    };
    return success(summary);
  },

  async getMarkSheets(_schoolId, examId, _query?: MarkSheetListQuery) {
    const subjects = await fetchExamSubjects(examId);
    const allEntries = await fetchMarksEntries(examId);

    const markSheets: MarkSheetSummary[] = subjects.map(s => {
      const subjectEntries = allEntries.filter(e => e.exam_subject === s.id);
      return mapMarkSheetSummary(s, subjectEntries);
    });

    return success(paginate(markSheets));
  },

  async getMarkSheet(_schoolId, examId, markSheetId) {
    const raw = await apiClient.get<unknown>(`/exams/${examId}/subjects/${markSheetId}/`);
    const data = raw as Record<string, unknown>;
    const subject = data.exam_subject as BackendExamSubject;
    const entries = await fetchMarksEntries(examId, markSheetId);
    return success(mapMarkSheetDetails(subject, entries));
  },

  async saveMarkSheetDraft(_schoolId, examId, markSheetId, input: SaveMarkSheetDraftInput) {
    const entries = (input.marks ?? []).map(mark => {
      const totalMarks = mark.componentMarks.reduce(
        (sum, c) => sum + (c.marksObtained ?? 0),
        0,
      );
      return {
        student: parseInt(mark.studentId, 10),
        marks_obtained: mark.attendanceStatus === 'ABSENT' ? null : totalMarks || null,
        is_absent: mark.attendanceStatus === 'ABSENT',
      };
    });

    await apiClient.post<unknown>(`/exams/${examId}/marks/`, {
      exam_subject: parseInt(markSheetId, 10),
      entries,
    });

    return apiMarksResultService.getMarkSheet(_schoolId, examId, markSheetId);
  },

  async submitMarkSheet(_schoolId, examId, markSheetId, _input: MarkSheetActionInput) {
    return apiMarksResultService.getMarkSheet(_schoolId, examId, markSheetId);
  },

  async returnMarkSheetToDraft(_schoolId, examId, markSheetId, _input: ReturnMarkSheetToDraftInput) {
    return apiMarksResultService.getMarkSheet(_schoolId, examId, markSheetId);
  },

  async lockMarkSheet(_schoolId, examId, markSheetId, _input: MarkSheetActionInput) {
    return apiMarksResultService.getMarkSheet(_schoolId, examId, markSheetId);
  },

  async unlockMarkSheet(_schoolId, examId, markSheetId, _input: UnlockMarkSheetInput) {
    return apiMarksResultService.getMarkSheet(_schoolId, examId, markSheetId);
  },

  async getMarkSheetHistory(_schoolId, _examId, _markSheetId): Promise<ApiResponse<MarkSheetHistoryRecord[]>> {
    return success([]);
  },

  async getResultProcessingSummary(_schoolId, _branchId, _sessionId, examId): Promise<ApiResponse<ResultProcessingSummary>> {
    const results = await fetchResults(examId);
    const summary: ResultProcessingSummary = {
      lockedMarkSheets: 0,
      unlockedMarkSheets: 0,
      calculatedStudents: results.length,
      incompleteStudents: 0,
      reviewedSections: 0,
      publishedSections: 0,
      passCount: results.filter(r => r.is_pass).length,
      failCount: results.filter(r => !r.is_pass).length,
      absentCount: 0,
      staleResults: 0,
      warnings: [],
    };
    return success(summary);
  },

  async previewResultCalculation(_schoolId, _examId, _input: PreviewResultCalculationInput): Promise<ApiResponse<ResultCalculationPreview>> {
    notSupported('previewResultCalculation');
  },

  async calculateResults(_schoolId, examId, _input: CalculateResultsInput) {
    const raw = await apiClient.post<unknown>(`/exams/${examId}/compute-rank/`, {});
    const data = raw as Record<string, unknown>;
    const message = typeof data.message === 'string' ? data.message : 'Results calculated.';

    const results = await fetchResults(examId);
    const overallResults = results.map(mapOverallResult);

    const result: ResultCalculationResult = {
      run: { ...EMPTY_RESULT_RUN, examId, studentCount: results.length, completedCount: results.length },
      subjectResults: [] as StudentSubjectResult[],
      overallResults,
      warnings: [],
    };
    return success(result, message);
  },

  async getClassResults(_schoolId, examId, _classConfigId, _query?: ResultListQuery) {
    const results = await fetchResults(examId);
    const summary: ClassResultSummary = {
      examClassConfigurationId: _classConfigId,
      results: results.map(mapOverallResult),
      total: results.length,
    };
    return success(summary);
  },

  async getSectionResults(_schoolId, examId, sectionId, _query?: ResultListQuery) {
    const results = await fetchResults(examId);
    const summary: SectionResultSummary = {
      sectionId,
      results: results.map(mapOverallResult),
      total: results.length,
    };
    return success(summary);
  },

  async getStudentResult(_schoolId, examId, studentId) {
    const raw = await apiClient.get<unknown>(`/students/${studentId}/results/`);
    const data = raw as Record<string, unknown>;
    const results = (Array.isArray(data.results) ? data.results : []) as BackendResultSummary[];
    const examResult = results.find(r => String(r.exam) === examId) ?? results[0];

    if (!examResult) {
      throw new ApiClientError({
        code: 'RESULT_NOT_FOUND',
        message: 'Result not found for this student and exam.',
        status: 404,
      });
    }

    const overallResult = mapOverallResult(examResult);
    const details: StudentResultDetails = {
      student: {
        studentId: String(examResult.student),
        studentNameSnapshot: examResult.student_name,
        admissionNumberSnapshot: '',
        rollNumberSnapshot: undefined,
        classNameSnapshot: '',
        sectionNameSnapshot: '',
      },
      subjectResults: [] as StudentSubjectResult[],
      overallResult,
    };
    return success(details);
  },

  async reviewResults(_schoolId, _examId, _input: ReviewResultsInput): Promise<ApiResponse<ResultReviewRecord>> {
    notSupported('reviewResults');
  },

  async publishResults(_schoolId, _examId, _input: PublishResultsInput): Promise<ApiResponse<ResultPublicationBatch>> {
    notSupported('publishResults');
  },

  async unpublishResults(_schoolId, _examId, _batchId, _input: UnpublishResultsInput): Promise<ApiResponse<ResultPublicationBatch>> {
    notSupported('unpublishResults');
  },

  async getPublicationHistory(_schoolId, _examId): Promise<ApiResponse<ResultPublicationHistory[]>> {
    return success([]);
  },

  async getRankList(_schoolId, examId, _input: GetRankListInput) {
    const results = await fetchResults(examId);

    const rankList: RankEntry[] = results
      .filter(r => r.rank !== null)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
      .map(r => ({
        studentId: String(r.student),
        studentName: r.student_name,
        admissionNumber: '',
        totalMarksObtained: parseFloat(r.total_marks_obtained) || 0,
        totalMaximumMarks: parseFloat(r.total_max_marks) || 0,
        percentage: parseFloat(r.percentage) || 0,
        outcome: r.is_pass ? 'PASS' as const : 'FAIL' as const,
        rank: r.rank ?? undefined,
      }));

    return success(rankList);
  },
};
