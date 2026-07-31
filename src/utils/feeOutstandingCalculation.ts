import type { FeeDueStatus } from '../models/feeDue';

export interface OutstandingInput {
  netFeeAmountPaise: number;
  fineAmountPaise: number;
  fineWaivedAmountPaise: number;
  paidAmountPaise: number;
  status: FeeDueStatus;
}

export function calculateOutstandingAmount(input: OutstandingInput): number {
  if (input.status === 'CANCELLED' || input.status === 'WAIVED') return 0;
  return Math.max(
    0,
    Math.trunc(input.netFeeAmountPaise) +
      Math.trunc(input.fineAmountPaise) -
      Math.trunc(input.fineWaivedAmountPaise) -
      Math.trunc(input.paidAmountPaise),
  );
}

export function deriveFeeDueStatus(
  dueDate: string,
  asOfDate: string,
  outstandingAmountPaise: number,
  protectedStatus?: FeeDueStatus,
): FeeDueStatus {
  if (protectedStatus === 'CANCELLED' || protectedStatus === 'WAIVED') {
    return protectedStatus;
  }
  if (protectedStatus === 'PAID' || protectedStatus === 'PARTIALLY_PAID') {
    return protectedStatus;
  }
  if (outstandingAmountPaise <= 0) return 'WAIVED';
  if (dueDate > asOfDate) return 'UPCOMING';
  if (dueDate === asOfDate) return 'PENDING';
  return 'OVERDUE';
}

export function createFeeDueIdempotencyKey(input: {
  schoolId: string;
  studentId: string;
  enrollmentId: string;
  feeStructureItemId: string;
  periodKey: string;
}): string {
  return [
    input.schoolId,
    input.studentId,
    input.enrollmentId,
    input.feeStructureItemId,
    input.periodKey,
  ].join('::');
}
