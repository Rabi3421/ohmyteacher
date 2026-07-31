import type { StudentLedgerEntry } from '../models/collection';

export function withLedgerRunningBalances(
  entries: readonly StudentLedgerEntry[],
): StudentLedgerEntry[] {
  let balance = 0;
  return [...entries]
    .sort(
      (a, b) =>
        a.effectiveDate.localeCompare(b.effectiveDate) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .map(item => ({
      ...item,
      runningBalancePaise: (balance = Math.max(
        0,
        balance + item.debitPaise - item.creditPaise,
      )),
    }));
}
