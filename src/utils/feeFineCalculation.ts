import type { FeeDue, FineCalculationResult, FineRuleSnapshot } from '../models/feeDue';
import { calculateOutstandingAmount } from './feeOutstandingCalculation';

const utcDay = (value: string) =>
  Date.parse(`${value}T00:00:00.000Z`) / 86_400_000;

export function calculateFine(input: {
  due: Pick<
    FeeDue,
    | 'id'
    | 'dueDate'
    | 'status'
    | 'netFeeAmountPaise'
    | 'paidAmountPaise'
    | 'fineWaivedAmountPaise'
  >;
  fineRuleSnapshot?: FineRuleSnapshot;
  asOfDate: string;
}): FineCalculationResult {
  const { due, fineRuleSnapshot: rule, asOfDate } = input;
  const lateDays = Math.max(
    0,
    Math.floor(utcDay(asOfDate) - utcDay(due.dueDate)) - (rule?.graceDays ?? 0),
  );
  let fineAmountPaise = 0;
  if (
    rule &&
    lateDays > 0 &&
    !['CANCELLED', 'WAIVED', 'PAID'].includes(due.status) &&
    due.netFeeAmountPaise > due.paidAmountPaise
  ) {
    if (rule.type === 'FIXED_AFTER_DUE') {
      fineAmountPaise = rule.fixedAmountPaise ?? 0;
    } else if (rule.type === 'DAILY_AFTER_DUE') {
      fineAmountPaise = lateDays * (rule.dailyAmountPaise ?? 0);
    } else {
      fineAmountPaise =
        rule.slabs?.find(
          slab =>
            lateDays >= slab.fromDay &&
            (slab.toDay === undefined || lateDays <= slab.toDay),
        )?.amountPaise ?? 0;
    }
    if (rule.maximumAmountPaise !== undefined) {
      fineAmountPaise = Math.min(fineAmountPaise, rule.maximumAmountPaise);
    }
  }
  fineAmountPaise = Math.max(0, Math.trunc(fineAmountPaise));
  const effectiveFinePaise = Math.max(
    0,
    fineAmountPaise - due.fineWaivedAmountPaise,
  );
  return {
    asOfDate,
    effectiveFinePaise,
    feeDueId: due.id,
    fineAmountPaise,
    fineWaivedAmountPaise: due.fineWaivedAmountPaise,
    lateDays,
    outstandingAmountPaise: calculateOutstandingAmount({
      fineAmountPaise,
      fineWaivedAmountPaise: due.fineWaivedAmountPaise,
      netFeeAmountPaise: due.netFeeAmountPaise,
      paidAmountPaise: due.paidAmountPaise,
      status: due.status,
    }),
  };
}
