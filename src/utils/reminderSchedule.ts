import type { ReminderRule } from '../models/communication';

const DAY_MS = 86_400_000;
function dateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}
function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function reminderOccurrenceDates(
  dueDate: string,
  rule: Pick<
    ReminderRule,
    | 'triggerType'
    | 'dayOffset'
    | 'repeatEveryDays'
    | 'maximumOccurrences'
    | 'sendTime'
    | 'timezone'
  >,
): string[] {
  const base = dateOnly(dueDate).getTime();
  const direction = rule.triggerType === 'BEFORE_DUE_DATE' ? -1 : 1;
  const first = base + direction * rule.dayOffset * DAY_MS;
  const count =
    rule.triggerType === 'RECURRING_OVERDUE' ? rule.maximumOccurrences ?? 1 : 1;
  const repeat = rule.repeatEveryDays ?? 1;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first + index * repeat * DAY_MS);
    return `${isoDate(date)}T${rule.sendTime}:00[${rule.timezone}]`;
  });
}

export function isValidReminderTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isSupportedReminderTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-IN', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
