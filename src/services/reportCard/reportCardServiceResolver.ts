import { env } from '../../config/env';
import { apiReportCardService } from './apiReportCardService';
import { mockReportCardService } from './mockReportCardService';
import type { ReportCardService } from './reportCardService';
export function resolveReportCardService(): ReportCardService {
  return env.dataSource === 'api'
    ? apiReportCardService
    : mockReportCardService;
}
export const reportCardService = resolveReportCardService();
