import type { FeeStructureItem } from '../models/fee';
import type { FeeDuePeriodType, FeeSchedulePeriod } from '../models/feeDue';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const iso = (date: Date) => date.toISOString().slice(0, 10);
const parse = (value: string) => new Date(`${value}T00:00:00.000Z`);
const monthStart = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex, 1));
const monthEnd = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0));

export interface FeeScheduleInput {
  item: FeeStructureItem;
  academicSessionName: string;
  sessionStartDate: string;
  sessionEndDate: string;
  academicYearStartMonth: number;
  structureEffectiveDate: string;
  assignmentEffectiveDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate?: string;
  includePreviousEligiblePeriods?: boolean;
  useInstallments?: boolean;
}

interface PeriodSeed {
  type: FeeDuePeriodType;
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  installmentNumber?: number;
}

function sessionMonths(startDate: string, endDate: string) {
  const result: Array<{ year: number; month: number; start: string; end: string }> = [];
  const cursor = monthStart(parse(startDate).getUTCFullYear(), parse(startDate).getUTCMonth());
  const final = monthStart(parse(endDate).getUTCFullYear(), parse(endDate).getUTCMonth());
  while (cursor <= final && result.length < 24) {
    result.push({
      end: iso(monthEnd(cursor.getUTCFullYear(), cursor.getUTCMonth())),
      month: cursor.getUTCMonth() + 1,
      start: iso(cursor),
      year: cursor.getUTCFullYear(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function chunk<T>(items: T[], count: number): T[][] {
  const size = Math.max(1, Math.ceil(items.length / Math.max(1, count)));
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export function deriveDueDate(
  periodStartDate: string,
  dueRule: FeeStructureItem['dueRule'],
): { dueDate: string; warnings: string[] } {
  if (dueRule.type === 'FIXED_DATE') {
    return { dueDate: dueRule.date, warnings: [] };
  }
  const start = parse(periodStartDate);
  const requestedDay = dueRule.day;
  const finalDay = monthEnd(start.getUTCFullYear(), start.getUTCMonth()).getUTCDate();
  const safeDay = Math.max(1, Math.min(requestedDay, finalDay));
  return {
    dueDate: iso(
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), safeDay)),
    ),
    warnings:
      safeDay !== requestedDay
        ? [`Due day ${requestedDay} was clamped to ${safeDay}.`]
        : [],
  };
}

export function createFeePeriodKey(
  type: FeeDuePeriodType,
  sessionName: string,
  startDate: string,
  index = 1,
  feeHeadCode = 'FEE',
): string {
  if (type === 'MONTH') return startDate.slice(0, 7);
  if (type === 'QUARTER') return `${sessionName}-Q${index}`;
  if (type === 'HALF_YEAR') return `${sessionName}-H${index}`;
  if (type === 'YEAR') return sessionName;
  if (type === 'INSTALLMENT') return `INST-${index}`;
  return `ONE_TIME-${feeHeadCode.toUpperCase()}`;
}

export function generateFeeSchedule(input: FeeScheduleInput): FeeSchedulePeriod[] {
  const months = sessionMonths(input.sessionStartDate, input.sessionEndDate);
  const eligibleFrom = [
    input.enrollmentStartDate,
    input.structureEffectiveDate,
    ...(input.includePreviousEligiblePeriods ? [] : [input.assignmentEffectiveDate]),
  ].sort().at(-1)!;
  const eligibleTo = input.enrollmentEndDate ?? input.sessionEndDate;
  const applicableMonths = input.item.applicableMonths;
  let seeds: PeriodSeed[] = [];

  if (input.item.frequency === 'MONTHLY') {
    seeds = months
      .filter(month => !applicableMonths?.length || applicableMonths.includes(month.month))
      .map(month => ({
        endDate: month.end,
        key: createFeePeriodKey('MONTH', input.academicSessionName, month.start),
        label: `${MONTH_NAMES[month.month - 1]} ${month.year}`,
        startDate: month.start,
        type: 'MONTH',
      }));
  } else if (input.item.frequency === 'ONE_TIME') {
    const date =
      input.item.dueRule.type === 'FIXED_DATE'
        ? input.item.dueRule.date
        : eligibleFrom;
    seeds = [{
      endDate: date,
      key: createFeePeriodKey('ONE_TIME', input.academicSessionName, date, 1, input.item.feeHeadId),
      label: `One Time · ${input.item.feeHeadName}`,
      startDate: date,
      type: 'ONE_TIME',
    }];
  } else {
    const defaultCount =
      input.item.frequency === 'QUARTERLY'
        ? 4
        : input.item.frequency === 'HALF_YEARLY'
          ? 2
          : 1;
    const count = input.item.installmentCount ?? defaultCount;
    const type: FeeDuePeriodType = input.useInstallments
      ? 'INSTALLMENT'
      : input.item.frequency === 'QUARTERLY'
        ? 'QUARTER'
        : input.item.frequency === 'HALF_YEARLY'
          ? 'HALF_YEAR'
          : 'YEAR';
    seeds = chunk(months, count).map((group, index) => ({
      endDate: group.at(-1)!.end,
      installmentNumber: type === 'INSTALLMENT' ? index + 1 : undefined,
      key: createFeePeriodKey(
        type,
        input.academicSessionName,
        group[0].start,
        index + 1,
      ),
      label:
        type === 'INSTALLMENT'
          ? `Installment ${index + 1}`
          : type === 'YEAR'
            ? input.academicSessionName
            : `${type === 'QUARTER' ? 'Quarter' : 'Half-Year'} ${index + 1}`,
      startDate: group[0].start,
      type,
    }));
  }

  return seeds
    .filter(period => period.endDate >= eligibleFrom && period.startDate <= eligibleTo)
    .map(period => {
      const derived = deriveDueDate(period.startDate, input.item.dueRule);
      return { ...period, dueDate: derived.dueDate, warnings: derived.warnings };
    })
    .filter(period => !input.enrollmentEndDate || period.startDate <= input.enrollmentEndDate);
}

export function orderAcademicPeriodKeys(
  keys: readonly string[],
  schedule: readonly FeeSchedulePeriod[],
): string[] {
  const index = new Map(schedule.map((period, position) => [period.key, position]));
  return [...keys].sort(
    (left, right) => (index.get(left) ?? Number.MAX_SAFE_INTEGER) - (index.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}
