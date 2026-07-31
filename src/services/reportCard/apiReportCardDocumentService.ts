import { ApiClientError } from '../api/apiError';
import type { ReportCardDocumentService } from './reportCardDocumentService';
const unavailable = (): never => {
  throw new ApiClientError({
    code: 'REPORT_CARD_DOCUMENT_API_UNAVAILABLE',
    message: 'Report Card document API mode is not configured.',
    status: 503,
  });
};
export const apiReportCardDocumentService: ReportCardDocumentService = {
  getDocumentStatus: async () => unavailable(),
  requestDocument: async () => unavailable(),
};
