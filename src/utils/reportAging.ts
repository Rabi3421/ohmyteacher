import type { AgingBucket } from '../models/report';

const DAY_MS = 86_400_000;

function utcDay(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) throw new Error('Expected an ISO date.');
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function getOutstandingAgingBucket(
  dueDate: string,
  asOfDate: string,
): AgingBucket {
  const days = Math.floor((utcDay(asOfDate) - utcDay(dueDate)) / DAY_MS);
  if (days < 0) return 'NOT_DUE';
  if (days === 0) return 'DUE_TODAY';
  if (days <= 30) return '1_TO_30_DAYS';
  if (days <= 60) return '31_TO_60_DAYS';
  if (days <= 90) return '61_TO_90_DAYS';
  return 'OVER_90_DAYS';
}

export const AGING_BUCKET_ORDER: AgingBucket[] = [
  'NOT_DUE',
  'DUE_TODAY',
  '1_TO_30_DAYS',
  '31_TO_60_DAYS',
  '61_TO_90_DAYS',
  'OVER_90_DAYS',
];
