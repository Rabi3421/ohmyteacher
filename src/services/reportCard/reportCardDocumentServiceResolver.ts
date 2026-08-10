import { selectRepository } from '../integration/integrationMode';
import { apiReportCardDocumentService } from './apiReportCardDocumentService';
import { mockReportCardDocumentService } from './mockReportCardDocumentService';
import type { ReportCardDocumentService } from './reportCardDocumentService';
export function resolveReportCardDocumentService(): ReportCardDocumentService {
  return selectRepository({
    live: apiReportCardDocumentService,
    mock: mockReportCardDocumentService,
    module: 'report-card-documents',
    unsupported: apiReportCardDocumentService,
  });
}
export const reportCardDocumentService = resolveReportCardDocumentService();
