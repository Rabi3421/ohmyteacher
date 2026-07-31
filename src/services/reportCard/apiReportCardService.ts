import { ApiClientError } from '../api/apiError';
import type { ReportCardService } from './reportCardService';
const unavailable = (): never => {
  throw new ApiClientError({
    code: 'REPORT_CARD_API_UNAVAILABLE',
    message: 'Report Card API mode is not configured.',
    status: 503,
  });
};
export const apiReportCardService: ReportCardService = {
  createTemplate: async () => unavailable(),
  generateReportCards: async () => unavailable(),
  getGenerationHistory: async () => unavailable(),
  getGenerationRun: async () => unavailable(),
  getParentPublishedResult: async () => unavailable(),
  getParentPublishedResults: async () => unavailable(),
  getParentReportCard: async () => unavailable(),
  getParentReportCards: async () => unavailable(),
  getReportCard: async () => unavailable(),
  getReportCardDashboard: async () => unavailable(),
  getReportCardDocument: async () => unavailable(),
  getReportCards: async () => unavailable(),
  getStudentPublishedResult: async () => unavailable(),
  getStudentPublishedResults: async () => unavailable(),
  getStudentReportCard: async () => unavailable(),
  getStudentReportCards: async () => unavailable(),
  getTemplate: async () => unavailable(),
  getTemplates: async () => unavailable(),
  previewReportCardGeneration: async () => unavailable(),
  revokeReportCard: async () => unavailable(),
  updateTemplate: async () => unavailable(),
  updateTemplateStatus: async () => unavailable(),
};
