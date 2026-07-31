import type { ResolvedRecipient } from '../../src/models/communication';
import { INITIAL_REMINDER_RULES } from '../../src/services/communication/communicationFixtures';
import { INITIAL_FEE_DUES } from '../../src/services/feeDue/feeDueFixtures';
import { reminderIdempotencyKey } from '../../src/utils/communicationIdempotency';
import { evaluateReminderEligibility } from '../../src/utils/reminderEligibility';
import {
  reminderOccurrenceDates,
  isSupportedReminderTimezone,
  isValidReminderTime,
} from '../../src/utils/reminderSchedule';

const recipient: ResolvedRecipient = {
  guardianId: 'guardian-student-rahul',
  guardianName: 'Meera Patel',
  maskedMobile: '+91 ••••••3212',
  normalizedMobile: '+919876543212',
  source: 'FEE_CONTACT',
  studentId: 'student-rahul',
  whatsappEnabled: true,
};
const due = INITIAL_FEE_DUES.find(item => item.id === 'due-rahul-june-daily')!;
const rule = INITIAL_REMINDER_RULES.find(
  item => item.id === 'rule-overdue-weekly',
)!;

describe('Reminder eligibility and scheduling', () => {
  const evaluate = (patch = {}) =>
    evaluateReminderEligibility({
      asOfDate: '2026-06-17',
      due,
      existing: [],
      occurrenceNumber: 1,
      recipient,
      rule,
      scheduledDate: '2026-07-31',
      ...patch,
    });

  it('supports before, on-date, after and recurring trigger matching', () => {
    expect(evaluate().eligible).toBe(true);
    expect(
      evaluate({
        asOfDate: '2026-06-05',
        due: { ...due, status: 'UPCOMING' },
        rule: { ...rule, dayOffset: 5, triggerType: 'BEFORE_DUE_DATE' },
      }).eligible,
    ).toBe(true);
    expect(
      evaluate({
        asOfDate: due.dueDate,
        due: { ...due, status: 'PENDING' },
        rule: { ...rule, dayOffset: 0, triggerType: 'ON_DUE_DATE' },
      }).eligible,
    ).toBe(true);
    expect(
      evaluate({
        asOfDate: '2026-06-15',
        rule: { ...rule, dayOffset: 5, triggerType: 'AFTER_DUE_DATE' },
      }).eligible,
    ).toBe(true);
  });

  it('enforces threshold, Fee Head, branch, terminal and recipient rules', () => {
    expect(
      evaluate({ rule: { ...rule, minimumOutstandingPaise: 999_999 } }),
    ).toMatchObject({ eligible: false, reason: 'BELOW_THRESHOLD' });
    expect(
      evaluate({ rule: { ...rule, feeHeadIds: ['other'] } }),
    ).toMatchObject({ eligible: false, reason: 'FEE_HEAD_FILTER' });
    expect(evaluate({ rule: { ...rule, branchIds: ['other'] } })).toMatchObject(
      { eligible: false, reason: 'CROSS_BRANCH' },
    );
    expect(evaluate({ due: { ...due, status: 'CANCELLED' } })).toMatchObject({
      eligible: false,
      reason: 'TERMINAL_DUE',
    });
    expect(evaluate({ recipient: undefined })).toMatchObject({
      eligible: false,
      reason: 'MISSING_RECIPIENT',
    });
  });

  it('blocks paused rules, closed sessions and duplicate occurrences', () => {
    expect(evaluate({ rule: { ...rule, status: 'PAUSED' } })).toMatchObject({
      eligible: false,
      reason: 'RULE_NOT_ACTIVE',
    });
    expect(evaluate({ sessionClosed: true })).toMatchObject({
      eligible: false,
      reason: 'CLOSED_SESSION',
    });
    const first = evaluate();
    expect(
      evaluate({
        existing: [
          {
            branchId: due.branchId,
            createdAt: '',
            feeDueId: due.id,
            guardianId: recipient.guardianId,
            id: 'existing',
            idempotencyKey: first.idempotencyKey,
            occurrenceNumber: 1,
            recipientMobileMasked: recipient.maskedMobile,
            reminderRuleId: rule.id,
            scheduledFor: '',
            schoolId: due.schoolId,
            status: 'SCHEDULED',
            studentId: due.studentId,
            templateId: rule.templateId,
            updatedAt: '',
          },
        ],
      }),
    ).toMatchObject({ eligible: false, reason: 'DUPLICATE' });
  });

  it('calculates stable timezone-labelled occurrences and maximum recurrence', () => {
    const dates = reminderOccurrenceDates(due.dueDate, rule);
    expect(dates).toHaveLength(4);
    expect(dates[0]).toContain('2026-06-17T09:00:00[Asia/Kolkata]');
    expect(dates[1]).toContain('2026-06-24');
    expect(isValidReminderTime('23:59')).toBe(true);
    expect(isSupportedReminderTimezone('Asia/Kolkata')).toBe(true);
    expect(
      reminderIdempotencyKey({
        feeDueId: due.id,
        occurrenceNumber: 1,
        ruleId: rule.id,
        scheduledDate: '2026-07-31T09:00:00+05:30',
      }),
    ).toBe(
      reminderIdempotencyKey({
        feeDueId: due.id,
        occurrenceNumber: 1,
        ruleId: rule.id,
        scheduledDate: '2026-07-31T18:00:00+05:30',
      }),
    );
  });
});
