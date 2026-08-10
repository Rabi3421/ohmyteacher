import { selectRepository } from '../integration/integrationMode';
import { apiReportCardService } from './apiReportCardService';
import { mockReportCardService } from './mockReportCardService';
import type { ReportCardService } from './reportCardService';
export function resolveReportCardService(): ReportCardService {
  return selectRepository({
    live: apiReportCardService,
    mock: mockReportCardService,
    module: 'report-cards',
    unsupported: apiReportCardService,
  });
}
export const reportCardService = resolveReportCardService();
