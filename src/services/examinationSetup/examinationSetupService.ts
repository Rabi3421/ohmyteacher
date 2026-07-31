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

export interface ExaminationSetupService {
  getExaminationSetupSummary(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
  ): Promise<ApiResponse<ExaminationSetupSummary>>;
  getExamTerms(
    schoolId: string,
    academicSessionId: string,
    query?: ExamTermListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ExamTerm>>>;
  getExamTerm(
    schoolId: string,
    academicSessionId: string,
    termId: string,
  ): Promise<ApiResponse<ExamTerm>>;
  createExamTerm(
    schoolId: string,
    academicSessionId: string,
    input: CreateExamTermInput,
  ): Promise<ApiResponse<ExamTerm>>;
  updateExamTerm(
    schoolId: string,
    academicSessionId: string,
    termId: string,
    input: UpdateExamTermInput,
  ): Promise<ApiResponse<ExamTerm>>;
  updateExamTermStatus(
    schoolId: string,
    academicSessionId: string,
    termId: string,
    status: ExamTermStatus,
  ): Promise<ApiResponse<ExamTerm>>;
  getExamTypes(
    schoolId: string,
    query?: ExamTypeListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ExamType>>>;
  getExamType(
    schoolId: string,
    examTypeId: string,
  ): Promise<ApiResponse<ExamType>>;
  createExamType(
    schoolId: string,
    input: CreateExamTypeInput,
  ): Promise<ApiResponse<ExamType>>;
  updateExamType(
    schoolId: string,
    examTypeId: string,
    input: UpdateExamTypeInput,
  ): Promise<ApiResponse<ExamType>>;
  updateExamTypeStatus(
    schoolId: string,
    examTypeId: string,
    status: ExamTypeStatus,
  ): Promise<ApiResponse<ExamType>>;
  getGradingSchemes(
    schoolId: string,
    query?: GradingSchemeListQuery,
  ): Promise<ApiResponse<PaginatedResponse<GradingScheme>>>;
  getGradingScheme(
    schoolId: string,
    gradingSchemeId: string,
  ): Promise<ApiResponse<GradingScheme>>;
  createGradingScheme(
    schoolId: string,
    input: CreateGradingSchemeInput,
  ): Promise<ApiResponse<GradingScheme>>;
  updateGradingScheme(
    schoolId: string,
    gradingSchemeId: string,
    input: UpdateGradingSchemeInput,
  ): Promise<ApiResponse<GradingScheme>>;
  updateGradingSchemeStatus(
    schoolId: string,
    gradingSchemeId: string,
    status: GradingSchemeStatus,
  ): Promise<ApiResponse<GradingScheme>>;
  getExams(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    query?: ExamListQuery,
  ): Promise<ApiResponse<PaginatedResponse<Exam>>>;
  getExam(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    examId: string,
  ): Promise<ApiResponse<ExamDetails>>;
  createExam(
    schoolId: string,
    input: CreateExamInput,
  ): Promise<ApiResponse<ExamDetails>>;
  updateExam(
    schoolId: string,
    examId: string,
    input: UpdateExamInput,
  ): Promise<ApiResponse<ExamDetails>>;
  updateExamClassConfigurations(
    schoolId: string,
    examId: string,
    input: UpdateExamClassConfigurationsInput,
  ): Promise<ApiResponse<ExamClassConfiguration[]>>;
  updateExamSubjectPapers(
    schoolId: string,
    examId: string,
    examClassConfigurationId: string,
    input: UpdateExamSubjectPapersInput,
  ): Promise<ApiResponse<ExamSubjectPaper[]>>;
  updateExamSchedule(
    schoolId: string,
    examId: string,
    input: UpdateExamScheduleInput,
  ): Promise<ApiResponse<ExamSubjectPaper[]>>;
  validateExamSetup(
    schoolId: string,
    examId: string,
  ): Promise<ApiResponse<ExamSetupValidationResult>>;
  scheduleExam(
    schoolId: string,
    examId: string,
  ): Promise<ApiResponse<ExamDetails>>;
  returnExamToDraft(
    schoolId: string,
    examId: string,
  ): Promise<ApiResponse<ExamDetails>>;
  previewCopyExam(
    schoolId: string,
    examId: string,
    input: PreviewCopyExamInput,
  ): Promise<ApiResponse<ExamCopyPreview>>;
  copyExam(
    schoolId: string,
    examId: string,
    input: CopyExamInput,
  ): Promise<ApiResponse<ExamCopyResult>>;
  cancelExam(
    schoolId: string,
    examId: string,
    input: CancelExamInput,
  ): Promise<ApiResponse<ExamDetails>>;
}
