import type { ExamStatus } from '../models/examination';
import type {
  MarkSheet,
  ResultRecordStatus,
  StudentOverallResult,
} from '../models/marksResult';

export function areRequiredMarkSheetsLocked(
  sheets: readonly MarkSheet[],
): boolean {
  return sheets.length > 0 && sheets.every(item => item.status === 'LOCKED');
}

export function areResultsComplete(
  results: readonly StudentOverallResult[],
): boolean {
  return (
    results.length > 0 &&
    results.every(
      item => item.outcome !== 'INCOMPLETE' && item.resultStatus !== 'STALE',
    )
  );
}

export function deriveExamLifecycle(input: {
  currentStatus: ExamStatus;
  sheets: readonly MarkSheet[];
  results: readonly StudentOverallResult[];
  reviewed: boolean;
  expectedStudentCount?: number;
}): ExamStatus {
  if (input.currentStatus === 'CANCELLED' || input.currentStatus === 'DRAFT')
    return input.currentStatus;
  if (
    areRequiredMarkSheetsLocked(input.sheets) &&
    areResultsComplete(input.results) &&
    (input.expectedStudentCount === undefined ||
      input.results.length >= input.expectedStudentCount) &&
    input.reviewed
  )
    return 'COMPLETED';
  if (input.sheets.some(item => item.status !== 'NOT_STARTED'))
    return 'IN_PROGRESS';
  return 'SCHEDULED';
}

export function markResultsStale<
  T extends { resultStatus: ResultRecordStatus },
>(results: readonly T[]): T[] {
  return results.map(item => ({ ...item, resultStatus: 'STALE' }));
}
