import type { FeeDueStatus, FineRuleSnapshot } from '../../src/models/feeDue';
import { calculateFine } from '../../src/utils/feeFineCalculation';

const fixed: FineRuleSnapshot = {
  code: 'FIX',
  fixedAmountPaise: 5_000,
  graceDays: 2,
  id: 'fixed',
  name: 'Fixed',
  type: 'FIXED_AFTER_DUE',
};
const daily: FineRuleSnapshot = {
  code: 'DAY',
  dailyAmountPaise: 1_000,
  graceDays: 2,
  id: 'daily',
  maximumAmountPaise: 5_000,
  name: 'Daily',
  type: 'DAILY_AFTER_DUE',
};
const slab: FineRuleSnapshot = {
  code: 'SLAB',
  graceDays: 0,
  id: 'slab',
  name: 'Slab',
  slabs: [
    { amountPaise: 2_000, fromDay: 1, toDay: 5 },
    { amountPaise: 5_000, fromDay: 6 },
  ],
  type: 'SLAB_BASED',
};

const result = (
  rule: FineRuleSnapshot | undefined,
  asOfDate: string,
  patch: Partial<{
    dueDate: string;
    fineWaivedAmountPaise: number;
    netFeeAmountPaise: number;
    paidAmountPaise: number;
    status: FeeDueStatus;
  }> = {},
) =>
  calculateFine({
    asOfDate,
    due: {
      dueDate: '2026-07-10',
      fineWaivedAmountPaise: 0,
      id: 'due',
      netFeeAmountPaise: 80_000,
      paidAmountPaise: 0,
      status: 'OVERDUE',
      ...patch,
    },
    fineRuleSnapshot: rule,
  });

describe('Fee Due Fine calculation', () => {
  it('does not accrue on or before the due date', () => {
    expect(result(fixed, '2026-07-10').fineAmountPaise).toBe(0);
    expect(result(fixed, '2026-07-01').fineAmountPaise).toBe(0);
  });

  it('honors grace days', () => {
    expect(result(fixed, '2026-07-12').lateDays).toBe(0);
    expect(result(fixed, '2026-07-13').fineAmountPaise).toBe(5_000);
  });

  it('calculates daily Fine with a cap', () => {
    expect(result(daily, '2026-07-15').fineAmountPaise).toBe(3_000);
    expect(result(daily, '2026-07-31').fineAmountPaise).toBe(5_000);
  });

  it('selects the matching slab deterministically', () => {
    expect(result(slab, '2026-07-13').fineAmountPaise).toBe(2_000);
    expect(result(slab, '2026-07-20').fineAmountPaise).toBe(5_000);
  });

  it('subtracts only the recorded Fine waiver', () => {
    const value = result(fixed, '2026-07-20', {
      fineWaivedAmountPaise: 2_000,
    });
    expect(value.effectiveFinePaise).toBe(3_000);
    expect(value.outstandingAmountPaise).toBe(83_000);
  });

  it('never makes effective Fine negative', () => {
    expect(
      result(fixed, '2026-07-20', {
        fineWaivedAmountPaise: 10_000,
      }).effectiveFinePaise,
    ).toBe(0);
  });

  it.each(['WAIVED', 'CANCELLED', 'PAID'] as FeeDueStatus[])(
    'does not accrue for protected %s Dues',
    status => {
      expect(result(daily, '2026-07-31', { status }).fineAmountPaise).toBe(0);
    },
  );

  it('does not accrue on a fully allocated Due', () => {
    expect(
      result(daily, '2026-07-31', { paidAmountPaise: 80_000 })
        .fineAmountPaise,
    ).toBe(0);
  });

  it('returns zero without a Fine Rule snapshot', () => {
    expect(result(undefined, '2026-07-31').fineAmountPaise).toBe(0);
  });
});
