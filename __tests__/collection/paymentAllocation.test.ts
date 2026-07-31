import type { CollectableDueItem } from '../../src/models/collection';
import { INITIAL_FEE_DUES } from '../../src/services/feeDue/feeDueFixtures';
import {
  previewPaymentAllocations,
  reconcilePaymentAmounts,
} from '../../src/utils/paymentAllocation';

const item = (id: string): CollectableDueItem => {
  const due = INITIAL_FEE_DUES.find(value => value.id === id)!;
  const effectiveFine = due.fineAmountPaise - due.fineWaivedAmountPaise;
  const finePaid = Math.min(effectiveFine, due.paidAmountPaise);
  return {
    due: { ...due },
    remainingFeePaise: Math.max(
      0,
      due.netFeeAmountPaise - Math.max(0, due.paidAmountPaise - finePaid),
    ),
    remainingFinePaise: Math.max(0, effectiveFine - finePaid),
  };
};

describe('Payment allocation', () => {
  it('reconciles integer Payment totals exactly', () => {
    expect(reconcilePaymentAmounts(100_000, 80_000, 20_000)).toBe(true);
    expect(reconcilePaymentAmounts(100_000, 80_000, 19_999)).toBe(false);
    expect(reconcilePaymentAmounts(100_000.5, 80_000, 20_000.5)).toBe(false);
  });
  it('fully pays a single Due and allocates Fine first', () => {
    const result = previewPaymentAllocations({
      allocationMode: 'OLDEST_DUE_FIRST',
      amountPaise: 110_000,
      asOfDate: '2026-07-31',
      dues: [item('due-rahul-june-daily')],
    });
    expect(result.allocations[0]).toMatchObject({
      feeAmountAppliedPaise: 80_000,
      fineAmountAppliedPaise: 30_000,
      resultingStatus: 'PAID',
    });
    expect(result.remainingAmountPaise).toBe(0);
  });

  it('supports partial Payment without negative balances', () => {
    const result = previewPaymentAllocations({
      allocationMode: 'OLDEST_DUE_FIRST',
      amountPaise: 40_000,
      asOfDate: '2026-07-31',
      dues: [item('due-rahul-june-daily')],
    });
    expect(result.allocations[0].fineAmountAppliedPaise).toBe(30_000);
    expect(result.allocations[0].feeAmountAppliedPaise).toBe(10_000);
    expect(result.allocations[0].outstandingAfterPaise).toBe(70_000);
    expect(result.allocations[0].resultingStatus).toBe('PARTIALLY_PAID');
  });

  it('orders overdue before pending before selected upcoming', () => {
    const result = previewPaymentAllocations({
      allocationMode: 'OLDEST_DUE_FIRST',
      amountPaise: 300_000,
      asOfDate: '2026-07-31',
      dues: [
        item('due-rahul-august'),
        item('due-rahul-july-pending'),
        item('due-rahul-june-daily'),
      ],
    });
    expect(result.allocations.map(value => value.feeDueId)).toEqual([
      'due-rahul-june-daily',
      'due-rahul-july-pending',
      'due-rahul-august',
    ]);
  });

  it('uses stable Due ID as the final tie breaker', () => {
    const first = item('due-rahul-july-pending');
    const second = {
      ...first,
      due: { ...first.due, id: 'due-a-stable' },
    };
    const result = previewPaymentAllocations({
      allocationMode: 'OLDEST_DUE_FIRST',
      amountPaise: 100,
      asOfDate: '2026-07-31',
      dues: [first, second],
    });
    expect(result.allocations[0].feeDueId).toBe('due-a-stable');
  });

  it('honours manual allocations and reports excess for Advance', () => {
    const result = previewPaymentAllocations({
      allocationMode: 'MANUAL',
      amountPaise: 100_000,
      asOfDate: '2026-07-31',
      dues: [item('due-rahul-july-pending'), item('due-rahul-june-daily')],
      manualAllocations: [
        { amountPaise: 20_000, feeDueId: 'due-rahul-july-pending' },
        { amountPaise: 30_000, feeDueId: 'due-rahul-june-daily' },
      ],
    });
    expect(result.allocatedAmountPaise).toBe(50_000);
    expect(result.remainingAmountPaise).toBe(50_000);
  });

  it('caps every allocation at current Due outstanding', () => {
    const result = previewPaymentAllocations({
      allocationMode: 'OLDEST_DUE_FIRST',
      amountPaise: 1_000_000,
      asOfDate: '2026-07-31',
      dues: [item('due-rahul-july-pending')],
    });
    expect(result.allocations[0].totalAppliedPaise).toBe(80_000);
    expect(result.allocations[0].outstandingAfterPaise).toBe(0);
    expect(result.remainingAmountPaise).toBe(920_000);
  });
});
