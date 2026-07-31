import type { ReportExportFormat, ReportType } from '../models/report';

export function createReportExportFileName(input: {
  reportType: ReportType;
  format: ReportExportFormat;
  asOfDate: string;
  schoolName?: string;
}): string {
  const safe =
    (input.schoolName ?? 'school')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'school';
  return `${safe}_${input.reportType.toLowerCase()}_${input.asOfDate.slice(
    0,
    10,
  )}.${input.format.toLowerCase()}`;
}
