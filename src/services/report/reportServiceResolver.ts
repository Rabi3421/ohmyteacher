import { selectRepository } from '../integration/integrationMode';
import { apiReportService } from './apiReportService';
import { mockReportService } from './mockReportService';

export const reportService = selectRepository({
  live: apiReportService,
  mock: mockReportService,
  module: 'reports',
  unsupported: apiReportService,
});
