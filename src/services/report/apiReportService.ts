import type { ReportService } from './reportService';

const unavailable = async (): Promise<never> => {
  throw new Error(
    'The Reports API adapter is ready for the future Python backend.',
  );
};

export const apiReportService: ReportService = {
  getReportsDashboard: unavailable,
  getReportCatalog: unavailable,
  runReport: unavailable,
  getSavedFilters: unavailable,
  saveReportFilter: unavailable,
  updateSavedReportFilter: unavailable,
  archiveSavedReportFilter: unavailable,
  previewExport: unavailable,
  createExportJob: unavailable,
  getExportJobs: unavailable,
  getExportJob: unavailable,
  cancelExportJob: unavailable,
  retryExportJob: unavailable,
};
