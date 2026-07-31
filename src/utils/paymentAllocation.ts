import type {
  CollectableDueItem,
  ProposedAllocation,
} from '../models/collection';
import type { FeeDueStatus } from '../models/feeDue';
import { recalculatePaidFeeDueStatus } from './collectionFeeDueStatus';

const rank: Record<FeeDueStatus, number> = {
  OVERDUE: 0,
  PENDING: 1,
  PARTIALLY_PAID: 1,
  UPCOMING: 2,
  PAID: 3,
  WAIVED: 4,
  CANCELLED: 5,
};

export function reconcilePaymentAmounts(
  paymentAmountPaise: number,
  allocatedAmountPaise: number,
  advanceAmountPaise: number,
): boolean {
  return (
    [paymentAmountPaise, allocatedAmountPaise, advanceAmountPaise].every(
      value => Number.isInteger(value) && value >= 0,
    ) && allocatedAmountPaise + advanceAmountPaise === paymentAmountPaise
  );
}

export function orderCollectableDues(
  items: readonly CollectableDueItem[],
): CollectableDueItem[] {
  return [...items].sort(
    (a, b) =>
      rank[a.due.status] - rank[b.due.status] ||
      a.due.dueDate.localeCompare(b.due.dueDate) ||
      a.due.id.localeCompare(b.due.id),
  );
}

export function allocateWithinDue(
  item: CollectableDueItem,
  amountPaise: number,
) {
  const safe = Math.max(
    0,
    Math.min(Math.trunc(amountPaise), item.due.outstandingAmountPaise),
  );
  const fineAmountAppliedPaise = Math.min(safe, item.remainingFinePaise);
  const feeAmountAppliedPaise = Math.min(
    safe - fineAmountAppliedPaise,
    item.remainingFeePaise,
  );
  return {
    feeAmountAppliedPaise,
    fineAmountAppliedPaise,
    totalAppliedPaise: feeAmountAppliedPaise + fineAmountAppliedPaise,
  };
}

export function previewPaymentAllocations(input: {
  dues: readonly CollectableDueItem[];
  amountPaise: number;
  manualAllocations?: readonly { feeDueId: string; amountPaise: number }[];
  allocationMode: 'OLDEST_DUE_FIRST' | 'MANUAL';
  asOfDate: string;
}) {
  let remaining = Math.max(0, Math.trunc(input.amountPaise));
  const selected = orderCollectableDues(input.dues).filter(
    item => !['CANCELLED', 'WAIVED', 'PAID'].includes(item.due.status),
  );
  const allocations: ProposedAllocation[] = [];
  selected.forEach((item, index) => {
    const requested =
      input.allocationMode === 'MANUAL'
        ? Math.max(
            0,
            Math.trunc(
              input.manualAllocations?.find(
                value => value.feeDueId === item.due.id,
              )?.amountPaise ?? 0,
            ),
          )
        : remaining;
    const applied = allocateWithinDue(item, Math.min(requested, remaining));
    if (applied.totalAppliedPaise <= 0) return;
    remaining -= applied.totalAppliedPaise;
    const outstandingAfterPaise = Math.max(
      0,
      item.due.outstandingAmountPaise - applied.totalAppliedPaise,
    );
    allocations.push({
      allocationOrder: index + 1,
      dueDate: item.due.dueDate,
      dueStatus: item.due.status,
      feeAmountAppliedPaise: applied.feeAmountAppliedPaise,
      feeDueId: item.due.id,
      feeHeadName: item.due.feeHeadNameSnapshot,
      fineAmountAppliedPaise: applied.fineAmountAppliedPaise,
      outstandingAfterPaise,
      outstandingBeforePaise: item.due.outstandingAmountPaise,
      periodLabel: item.due.periodLabel,
      resultingStatus: recalculatePaidFeeDueStatus({
        asOfDate: input.asOfDate,
        dueDate: item.due.dueDate,
        outstandingAmountPaise: outstandingAfterPaise,
        paidAmountPaise: item.due.paidAmountPaise + applied.totalAppliedPaise,
        protectedStatus: item.due.status,
      }),
      totalAppliedPaise: applied.totalAppliedPaise,
    });
  });
  return {
    allocatedAmountPaise: input.amountPaise - remaining,
    allocations,
    remainingAmountPaise: remaining,
  };
}
