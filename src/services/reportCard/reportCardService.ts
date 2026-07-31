import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CreateReportCardTemplateInput,
  GenerateReportCardsInput,
  ParentPublishedResultSummary,
  PreviewReportCardGenerationInput,
  ReportCardDashboardSummary,
  ReportCardDetails,
  ReportCardDocumentResult,
  ReportCardGenerationHistoryQuery,
  ReportCardGenerationPreview,
  ReportCardGenerationResult,
  ReportCardGenerationRunDetails,
  ReportCardListItem,
  ReportCardListQuery,
  ReportCardTemplate,
  ReportCardTemplateListQuery,
  ReportCardTemplateStatus,
  RevokeReportCardInput,
  SelfServiceResultDetails,
  StudentPublishedResultSummary,
  UpdateReportCardTemplateInput,
} from '../../models/reportCard';

export interface ReportCardService {
  getReportCardDashboard(
    schoolId: string,
    branchId: string,
    academicSessionId: string,
    examId: string,
  ): Promise<ApiResponse<ReportCardDashboardSummary>>;
  getTemplates(
    schoolId: string,
    query?: ReportCardTemplateListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ReportCardTemplate>>>;
  getTemplate(
    schoolId: string,
    templateId: string,
  ): Promise<ApiResponse<ReportCardTemplate>>;
  createTemplate(
    schoolId: string,
    input: CreateReportCardTemplateInput,
  ): Promise<ApiResponse<ReportCardTemplate>>;
  updateTemplate(
    schoolId: string,
    templateId: string,
    input: UpdateReportCardTemplateInput,
  ): Promise<ApiResponse<ReportCardTemplate>>;
  updateTemplateStatus(
    schoolId: string,
    templateId: string,
    status: ReportCardTemplateStatus,
  ): Promise<ApiResponse<ReportCardTemplate>>;
  previewReportCardGeneration(
    schoolId: string,
    examId: string,
    input: PreviewReportCardGenerationInput,
  ): Promise<ApiResponse<ReportCardGenerationPreview>>;
  generateReportCards(
    schoolId: string,
    examId: string,
    input: GenerateReportCardsInput,
  ): Promise<ApiResponse<ReportCardGenerationResult>>;
  getGenerationHistory(
    schoolId: string,
    examId: string,
    query?: ReportCardGenerationHistoryQuery,
  ): Promise<
    ApiResponse<
      PaginatedResponse<
        import('../../models/reportCard').ReportCardGenerationRun
      >
    >
  >;
  getGenerationRun(
    schoolId: string,
    generationRunId: string,
  ): Promise<ApiResponse<ReportCardGenerationRunDetails>>;
  getReportCards(
    schoolId: string,
    query?: ReportCardListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ReportCardListItem>>>;
  getReportCard(
    schoolId: string,
    reportCardId: string,
  ): Promise<ApiResponse<ReportCardDetails>>;
  getReportCardDocument(
    schoolId: string,
    reportCardId: string,
  ): Promise<ApiResponse<ReportCardDocumentResult>>;
  revokeReportCard(
    schoolId: string,
    reportCardId: string,
    input: RevokeReportCardInput,
  ): Promise<ApiResponse<ReportCardDetails>>;
  getParentPublishedResults(
    schoolId: string,
    parentMembershipId: string,
    studentId?: string,
  ): Promise<ApiResponse<ParentPublishedResultSummary[]>>;
  getParentPublishedResult(
    schoolId: string,
    parentMembershipId: string,
    publishedResultSnapshotId: string,
  ): Promise<ApiResponse<SelfServiceResultDetails>>;
  getParentReportCards(
    schoolId: string,
    parentMembershipId: string,
    studentId?: string,
  ): Promise<ApiResponse<ReportCardListItem[]>>;
  getParentReportCard(
    schoolId: string,
    parentMembershipId: string,
    reportCardId: string,
  ): Promise<ApiResponse<ReportCardDetails>>;
  getStudentPublishedResults(
    schoolId: string,
    studentMembershipId: string,
  ): Promise<ApiResponse<StudentPublishedResultSummary[]>>;
  getStudentPublishedResult(
    schoolId: string,
    studentMembershipId: string,
    publishedResultSnapshotId: string,
  ): Promise<ApiResponse<SelfServiceResultDetails>>;
  getStudentReportCards(
    schoolId: string,
    studentMembershipId: string,
  ): Promise<ApiResponse<ReportCardListItem[]>>;
  getStudentReportCard(
    schoolId: string,
    studentMembershipId: string,
    reportCardId: string,
  ): Promise<ApiResponse<ReportCardDetails>>;
}
