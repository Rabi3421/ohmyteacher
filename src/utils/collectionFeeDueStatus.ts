import type { FeeDueStatus } from '../models/feeDue';

export function recalculatePaidFeeDueStatus(input: {
  dueDate: string;
  asOfDate: string;
  outstandingAmountPaise: number;
  paidAmountPaise: number;
  protectedStatus?: FeeDueStatus;
}): FeeDueStatus {
  if (
    input.protectedStatus === 'WAIVED' ||
    input.protectedStatus === 'CANCELLED'
  )
    return input.protectedStatus;
  if (input.outstandingAmountPaise <= 0) return 'PAID';
  if (input.paidAmountPaise > 0) return 'PARTIALLY_PAID';
  if (input.dueDate > input.asOfDate) return 'UPCOMING';
  if (input.dueDate === input.asOfDate) return 'PENDING';
  return 'OVERDUE';
}
