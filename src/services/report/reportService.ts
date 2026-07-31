import type { ApiResponse, PaginatedResponse } from '../../models/common';
import type {
  CreateReportExportInput,
  CreateSavedReportFilterInput,
  ExportJobActionInput,
  ExportJobListQuery,
  PreviewReportExportInput,
  ReportCatalogItem,
  ReportExportJob,
  ReportExportJobDetails,
  ReportExportPreview,
  ReportFiltersByType,
  ReportResult,
  ReportsDashboardQuery,
  ReportsDashboardSummary,
  ReportType,
  SavedReportFilter,
  UpdateSavedReportFilterInput,
} from '../../models/report';

export interface ReportService {
  getReportsDashboard(
    schoolId: string,
    input: ReportsDashboardQuery,
  ): Promise<ApiResponse<ReportsDashboardSummary>>;
  getReportCatalog(
    schoolId: string,
    access: ReportsDashboardQuery['access'],
  ): Promise<ApiResponse<ReportCatalogItem[]>>;
  runReport(
    schoolId: string,
    reportType: ReportType,
    filters: ReportFiltersByType,
  ): Promise<ApiResponse<ReportResult>>;
  getSavedFilters(
    schoolId: string,
    access: ReportsDashboardQuery['access'],
    reportType?: ReportType,
  ): Promise<ApiResponse<SavedReportFilter[]>>;
  saveReportFilter(
    schoolId: string,
    input: CreateSavedReportFilterInput,
  ): Promise<ApiResponse<SavedReportFilter>>;
  updateSavedReportFilter(
    schoolId: string,
    savedFilterId: string,
    input: UpdateSavedReportFilterInput,
  ): Promise<ApiResponse<SavedReportFilter>>;
  archiveSavedReportFilter(
    schoolId: string,
    savedFilterId: string,
    input: ExportJobActionInput,
  ): Promise<ApiResponse<SavedReportFilter>>;
  previewExport(
    schoolId: string,
    input: PreviewReportExportInput,
  ): Promise<ApiResponse<ReportExportPreview>>;
  createExportJob(
    schoolId: string,
    input: CreateReportExportInput,
  ): Promise<ApiResponse<ReportExportJob>>;
  getExportJobs(
    schoolId: string,
    query: ExportJobListQuery,
  ): Promise<ApiResponse<PaginatedResponse<ReportExportJob>>>;
  getExportJob(
    schoolId: string,
    exportJobId: string,
    input: ExportJobActionInput,
  ): Promise<ApiResponse<ReportExportJobDetails>>;
  cancelExportJob(
    schoolId: string,
    exportJobId: string,
    input: ExportJobActionInput,
  ): Promise<ApiResponse<ReportExportJob>>;
  retryExportJob(
    schoolId: string,
    exportJobId: string,
    input: ExportJobActionInput,
  ): Promise<ApiResponse<ReportExportJob>>;
}
