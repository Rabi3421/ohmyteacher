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
  StudentResultDetails,
  UnlockMarkSheetInput,
  UnpublishResultsInput,
} from '../../models/marksResult';

export interface MarksResultService {
  getMarksDashboard(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    examId: string,
  ): Promise<ApiResponse<MarksDashboardSummary>>;
  getMarkSheets(
    schoolId: string,
    examId: string,
    query?: MarkSheetListQuery,
  ): Promise<ApiResponse<PaginatedResponse<MarkSheetSummary>>>;
  getMarkSheet(
    schoolId: string,
    examId: string,
    markSheetId: string,
  ): Promise<ApiResponse<MarkSheetDetails>>;
  saveMarkSheetDraft(
    schoolId: string,
    examId: string,
    markSheetId: string,
    input: SaveMarkSheetDraftInput,
  ): Promise<ApiResponse<MarkSheetDetails>>;
  submitMarkSheet(
    schoolId: string,
    examId: string,
    markSheetId: string,
    input: MarkSheetActionInput,
  ): Promise<ApiResponse<MarkSheetDetails>>;
  returnMarkSheetToDraft(
    schoolId: string,
    examId: string,
    markSheetId: string,
    input: ReturnMarkSheetToDraftInput,
  ): Promise<ApiResponse<MarkSheetDetails>>;
  lockMarkSheet(
    schoolId: string,
    examId: string,
    markSheetId: string,
    input: MarkSheetActionInput,
  ): Promise<ApiResponse<MarkSheetDetails>>;
  unlockMarkSheet(
    schoolId: string,
    examId: string,
    markSheetId: string,
    input: UnlockMarkSheetInput,
  ): Promise<ApiResponse<MarkSheetDetails>>;
  getMarkSheetHistory(
    schoolId: string,
    examId: string,
    markSheetId: string,
  ): Promise<ApiResponse<MarkSheetHistoryRecord[]>>;
  getResultProcessingSummary(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    examId: string,
  ): Promise<ApiResponse<ResultProcessingSummary>>;
  previewResultCalculation(
    schoolId: string,
    examId: string,
    input: PreviewResultCalculationInput,
  ): Promise<ApiResponse<ResultCalculationPreview>>;
  calculateResults(
    schoolId: string,
    examId: string,
    input: CalculateResultsInput,
  ): Promise<ApiResponse<ResultCalculationResult>>;
  getClassResults(
    schoolId: string,
    examId: string,
    examClassConfigurationId: string,
    query?: ResultListQuery,
  ): Promise<ApiResponse<ClassResultSummary>>;
  getSectionResults(
    schoolId: string,
    examId: string,
    sectionId: string,
    query?: ResultListQuery,
  ): Promise<ApiResponse<SectionResultSummary>>;
  getStudentResult(
    schoolId: string,
    examId: string,
    studentId: string,
  ): Promise<ApiResponse<StudentResultDetails>>;
  reviewResults(
    schoolId: string,
    examId: string,
    input: ReviewResultsInput,
  ): Promise<ApiResponse<ResultReviewRecord>>;
  publishResults(
    schoolId: string,
    examId: string,
    input: PublishResultsInput,
  ): Promise<ApiResponse<ResultPublicationBatch>>;
  unpublishResults(
    schoolId: string,
    examId: string,
    publicationBatchId: string,
    input: UnpublishResultsInput,
  ): Promise<ApiResponse<ResultPublicationBatch>>;
  getPublicationHistory(
    schoolId: string,
    examId: string,
  ): Promise<ApiResponse<ResultPublicationHistory[]>>;
  getRankList(
    schoolId: string,
    examId: string,
    input: GetRankListInput,
  ): Promise<ApiResponse<RankEntry[]>>;
}
