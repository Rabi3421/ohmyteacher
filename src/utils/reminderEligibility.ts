import type {
  ReminderRule,
  ResolvedRecipient,
  ScheduledReminder,
} from '../models/communication';
import type { FeeDue } from '../models/feeDue';
import { reminderIdempotencyKey } from './communicationIdempotency';

export type ReminderIneligibilityReason =
  | 'RULE_NOT_ACTIVE'
  | 'CROSS_SCHOOL'
  | 'CROSS_BRANCH'
  | 'CLASS_FILTER'
  | 'FEE_HEAD_FILTER'
  | 'BELOW_THRESHOLD'
  | 'TERMINAL_DUE'
  | 'NO_OUTSTANDING'
  | 'MISSING_RECIPIENT'
  | 'WHATSAPP_DISABLED'
  | 'DUPLICATE'
  | 'CLOSED_SESSION'
  | 'TRIGGER_MISMATCH';

export function evaluateReminderEligibility(input: {
  due: FeeDue;
  rule: ReminderRule;
  recipient?: ResolvedRecipient;
  scheduledDate: string;
  occurrenceNumber: number;
  existing: ScheduledReminder[];
  sessionClosed?: boolean;
  asOfDate: string;
  classId?: string;
}): {
  eligible: boolean;
  reason?: ReminderIneligibilityReason;
  idempotencyKey: string;
} {
  const key = reminderIdempotencyKey({
    feeDueId: input.due.id,
    occurrenceNumber: input.occurrenceNumber,
    ruleId: input.rule.id,
    scheduledDate: input.scheduledDate,
  });
  const fail = (reason: ReminderIneligibilityReason) => ({
    eligible: false,
    idempotencyKey: key,
    reason,
  });
  if (input.rule.status !== 'ACTIVE') return fail('RULE_NOT_ACTIVE');
  if (input.sessionClosed) return fail('CLOSED_SESSION');
  if (input.due.schoolId !== input.rule.schoolId) return fail('CROSS_SCHOOL');
  if (
    input.rule.branchIds.length &&
    !input.rule.branchIds.includes(input.due.branchId)
  )
    return fail('CROSS_BRANCH');
  if (
    input.rule.classIds?.length &&
    (!input.classId || !input.rule.classIds.includes(input.classId))
  )
    return fail('CLASS_FILTER');
  if (
    input.rule.feeHeadIds?.length &&
    !input.rule.feeHeadIds.includes(input.due.feeHeadId)
  )
    return fail('FEE_HEAD_FILTER');
  if (['CANCELLED', 'WAIVED', 'PAID'].includes(input.due.status))
    return fail('TERMINAL_DUE');
  if (input.due.outstandingAmountPaise <= 0) return fail('NO_OUTSTANDING');
  if (
    input.due.outstandingAmountPaise < (input.rule.minimumOutstandingPaise ?? 0)
  )
    return fail('BELOW_THRESHOLD');
  if (!input.recipient) return fail('MISSING_RECIPIENT');
  if (!input.recipient.whatsappEnabled) return fail('WHATSAPP_DISABLED');
  const dueDate = Date.parse(`${input.due.dueDate.slice(0, 10)}T00:00:00.000Z`);
  const now = Date.parse(`${input.asOfDate.slice(0, 10)}T00:00:00.000Z`);
  const day = 86_400_000;
  const target =
    input.rule.triggerType === 'BEFORE_DUE_DATE'
      ? dueDate - input.rule.dayOffset * day
      : input.rule.triggerType === 'ON_DUE_DATE'
      ? dueDate
      : input.rule.triggerType === 'RECURRING_OVERDUE'
      ? dueDate +
        (input.rule.dayOffset +
          (input.occurrenceNumber - 1) * (input.rule.repeatEveryDays ?? 1)) *
          day
      : dueDate + input.rule.dayOffset * day;
  const occurrenceAllowed =
    input.rule.maximumOccurrences === undefined ||
    input.occurrenceNumber <= input.rule.maximumOccurrences;
  const statusMatches =
    input.rule.triggerType === 'BEFORE_DUE_DATE'
      ? input.due.status === 'UPCOMING'
      : input.rule.triggerType === 'ON_DUE_DATE'
      ? ['UPCOMING', 'PENDING', 'PARTIALLY_PAID'].includes(input.due.status)
      : input.due.status === 'OVERDUE' || input.due.status === 'PARTIALLY_PAID';
  const triggerMatches = now === target && occurrenceAllowed && statusMatches;
  if (!triggerMatches) return fail('TRIGGER_MISMATCH');
  if (
    input.existing.some(
      item => item.idempotencyKey === key && item.status !== 'CANCELLED',
    )
  )
    return fail('DUPLICATE');
  return { eligible: true, idempotencyKey: key };
}
