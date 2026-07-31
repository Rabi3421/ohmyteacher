import type { StudentAdvanceCreditEntry } from '../models/collection';

export function calculateAdvanceBalance(
  entries: readonly Pick<
    StudentAdvanceCreditEntry,
    'creditAmountPaise' | 'debitAmountPaise'
  >[],
): number {
  return Math.max(
    0,
    entries.reduce(
      (sum, item) =>
        sum +
        Math.trunc(item.creditAmountPaise) -
        Math.trunc(item.debitAmountPaise),
      0,
    ),
  );
}

export function withAdvanceRunningBalances(
  entries: readonly StudentAdvanceCreditEntry[],
): StudentAdvanceCreditEntry[] {
  let balance = 0;
  return [...entries]
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    )
    .map(item => ({
      ...item,
      runningBalancePaise: (balance = Math.max(
        0,
        balance + item.creditAmountPaise - item.debitAmountPaise,
      )),
    }));
}
