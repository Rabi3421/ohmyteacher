import { env } from '../../config/env';
import { apiReportCardDocumentService } from './apiReportCardDocumentService';
import { mockReportCardDocumentService } from './mockReportCardDocumentService';
import type { ReportCardDocumentService } from './reportCardDocumentService';
export function resolveReportCardDocumentService(): ReportCardDocumentService {
  return env.dataSource === 'api'
    ? apiReportCardDocumentService
    : mockReportCardDocumentService;
}
export const reportCardDocumentService = resolveReportCardDocumentService();
