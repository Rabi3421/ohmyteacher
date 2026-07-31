import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  BulkRefreshFinesInput,
  CancelFeeDueInput,
  CommitFeeGenerationInput,
  FeeDueDetails,
  FeeDueListItem,
  FeeDueListQuery,
  FeeGenerationPreview,
  FeeGenerationResult,
  FeeGenerationRun,
  FeeGenerationRunDetails,
  FeeOutstandingSummary,
  FineCalculationResult,
  FineRefreshResult,
  GenerationHistoryQuery,
  PreviewFeeGenerationInput,
  StudentFeeDueQuery,
  StudentFeeDueSummary,
  WaiveFeeDueInput,
  WaiveFineInput,
} from '../../models/feeDue';

export interface FeeDueService {
  getOutstandingSummary(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    asOfDate: string,
  ): Promise<ApiResponse<FeeOutstandingSummary>>;
  previewFeeGeneration(
    schoolId: string,
    input: PreviewFeeGenerationInput,
  ): Promise<ApiResponse<FeeGenerationPreview>>;
  commitFeeGeneration(
    schoolId: string,
    input: CommitFeeGenerationInput,
  ): Promise<ApiResponse<FeeGenerationResult>>;
  getGenerationHistory(
    schoolId: string,
    query: GenerationHistoryQuery,
  ): Promise<ApiResponse<PaginatedResponse<FeeGenerationRun>>>;
  getGenerationRun(
    schoolId: string,
    generationRunId: string,
  ): Promise<ApiResponse<FeeGenerationRunDetails>>;
  getFeeDues(
    schoolId: string,
    query: FeeDueListQuery,
  ): Promise<ApiResponse<PaginatedResponse<FeeDueListItem>>>;
  getStudentFeeDues(
    schoolId: string,
    studentId: string,
    query?: StudentFeeDueQuery,
  ): Promise<ApiResponse<StudentFeeDueSummary>>;
  getFeeDue(schoolId: string, feeDueId: string): Promise<ApiResponse<FeeDueDetails>>;
  calculateFinePreview(
    schoolId: string,
    feeDueId: string,
    asOfDate: string,
  ): Promise<ApiResponse<FineCalculationResult>>;
  refreshFeeDueFine(
    schoolId: string,
    feeDueId: string,
    asOfDate: string,
    requestedByUserId: string,
  ): Promise<ApiResponse<FeeDueDetails>>;
  bulkRefreshFines(
    schoolId: string,
    input: BulkRefreshFinesInput,
  ): Promise<ApiResponse<FineRefreshResult>>;
  waiveFeeDueFine(
    schoolId: string,
    feeDueId: string,
    input: WaiveFineInput,
  ): Promise<ApiResponse<FeeDueDetails>>;
  waiveFeeDue(
    schoolId: string,
    feeDueId: string,
    input: WaiveFeeDueInput,
  ): Promise<ApiResponse<FeeDueDetails>>;
  cancelFeeDue(
    schoolId: string,
    feeDueId: string,
    input: CancelFeeDueInput,
  ): Promise<ApiResponse<FeeDueDetails>>;
  getParentStudentFees(
    schoolId: string,
    parentMembershipId: string,
    studentId: string,
    asOfDate: string,
  ): Promise<ApiResponse<StudentFeeDueSummary>>;
  getStudentSelfFees(
    schoolId: string,
    studentMembershipId: string,
    asOfDate: string,
  ): Promise<ApiResponse<StudentFeeDueSummary>>;
}
