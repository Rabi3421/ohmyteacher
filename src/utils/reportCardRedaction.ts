import type { PublishedResultSnapshot } from '../models/marksResult';
import type {
  ReportCard,
  PublishedResultSummary,
  SelfServiceResultDetails,
} from '../models/reportCard';

function omitKeys<T extends object, K extends keyof T>(
  value: T,
  keys: readonly K[],
): Omit<T, K> {
  const copy = { ...value };
  keys.forEach(key => delete copy[key]);
  return copy;
}

export function mapPublishedResultSummary(
  value: PublishedResultSnapshot,
  card?: ReportCard,
  academicSessionName = value.academicSessionId,
): PublishedResultSummary {
  return {
    academicSessionId: value.academicSessionId,
    academicSessionName,
    className: value.classNameSnapshot,
    examId: value.examId,
    examName: value.examNameSnapshot,
    examTerm: value.termNameSnapshot,
    examType: value.examTypeNameSnapshot,
    grade: value.overallResult.grade,
    outcome: value.overallResult.outcome,
    percentage: value.overallResult.percentage,
    publishedAt: value.publishedAt,
    publishedResultSnapshotId: value.id,
    rank: value.overallResult.rank,
    reportCardAvailable: card?.status === 'AVAILABLE',
    reportCardId: card?.status === 'AVAILABLE' ? card.id : undefined,
    sectionName: value.sectionNameSnapshot,
    studentId: value.studentId,
    studentName: value.overallResult.studentNameSnapshot,
  };
}

export function redactReportCardForSelfService(value: ReportCard): ReportCard {
  const safe: Record<string, unknown> = { ...value };
  delete safe.calculationRunId;
  delete safe.generatedByUserId;
  delete safe.generationRunId;
  delete safe.revokedByUserId;
  delete safe.revokedByName;
  delete safe.revocationReason;
  delete safe.publicationInvalidatedAt;
  return safe as unknown as ReportCard;
}
export function redactPublishedResult(
  value: PublishedResultSnapshot,
  card?: ReportCard,
  academicSessionName?: string,
): SelfServiceResultDetails {
  const overallResult = omitKeys(value.overallResult, [
    'publishedAt',
    'resultStatus',
    'reviewedAt',
  ]);
  return {
    overallResult,
    subjectResults: value.subjectResults.map(item => ({ ...item })),
    summary: mapPublishedResultSummary(value, card, academicSessionName),
  };
}
