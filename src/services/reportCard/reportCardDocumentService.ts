import type { ApiResponse } from '../../models/common';
import type { ReportCardDocumentResult } from '../../models/reportCard';
export interface ReportCardDocumentService {
  requestDocument(
    schoolId: string,
    reportCardId: string,
  ): Promise<ApiResponse<ReportCardDocumentResult>>;
  getDocumentStatus(
    schoolId: string,
    reportCardId: string,
  ): Promise<ApiResponse<ReportCardDocumentResult>>;
}
