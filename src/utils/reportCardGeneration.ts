import type {
  ReportCard,
  ReportCardGenerationPreview,
} from '../models/reportCard';

export function deriveReportCardVersion(
  cards: readonly ReportCard[],
  studentId: string,
  examId?: string,
): number {
  return (
    Math.max(
      0,
      ...cards
        .filter(
          item =>
            item.studentId === studentId && (!examId || item.examId === examId),
        )
        .map(item => item.version),
    ) + 1
  );
}
export function reportCardGenerationIdentity(
  publicationBatchId: string,
  studentId: string,
  templateId: string,
  version: number,
): string {
  return [publicationBatchId, studentId, templateId, version].join('::');
}
export function isGenerationPreviewExpired(
  preview: ReportCardGenerationPreview,
  now: string,
): boolean {
  return Date.parse(preview.expiresAt) < Date.parse(now);
}
export function formatReportCardNumber(input: {
  branchCode: string;
  sessionLabel: string;
  examCode: string;
  sequence: number;
}): string {
  return `RC/${input.branchCode.toUpperCase()}/${
    input.sessionLabel
  }/${input.examCode.toUpperCase()}/${String(input.sequence).padStart(6, '0')}`;
}
export function reportCardDocumentFilename(
  reportCardNumber: string,
  studentName: string,
): string {
  const safe = `${reportCardNumber}-${studentName}`
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `${safe || 'report-card'}.pdf`;
}
