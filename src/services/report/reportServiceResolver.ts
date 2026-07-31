import { env } from '../../config/env';
import { apiReportService } from './apiReportService';
import { mockReportService } from './mockReportService';

export const reportService =
  env.dataSource === 'api' ? apiReportService : mockReportService;
