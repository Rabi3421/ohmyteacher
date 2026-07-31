import type {
  MarkSheet,
  ResultReviewRecord,
  StudentOverallResult,
} from '../models/marksResult';
import { areRequiredMarkSheetsLocked } from './resultCompleteness';

export interface PublicationEligibility {
  eligible: boolean;
  blockers: string[];
}

export function validateResultPublication(input: {
  results: readonly StudentOverallResult[];
  sheets: readonly MarkSheet[];
  reviews: readonly ResultReviewRecord[];
  calculationRunId: string;
}): PublicationEligibility {
  const blockers: string[] = [];
  if (!input.results.length) blockers.push('No calculated Results selected.');
  if (
    input.results.some(
      item => item.outcome === 'INCOMPLETE' || item.resultStatus === 'STALE',
    )
  )
    blockers.push('Incomplete or stale Results cannot be published.');
  if (!areRequiredMarkSheetsLocked(input.sheets))
    blockers.push('All source Mark Sheets must remain locked.');
  const reviewCoversEveryResult = input.results.every(result =>
    input.reviews.some(
      item =>
        item.status === 'REVIEWED' &&
        item.calculationRunId === input.calculationRunId &&
        item.examClassConfigurationId === result.examClassConfigurationId &&
        (item.reviewScope === 'CLASS' || item.sectionId === result.sectionId),
    ),
  );
  if (!reviewCoversEveryResult)
    blockers.push('Results from this Calculation Run must be reviewed.');
  return { blockers, eligible: blockers.length === 0 };
}
