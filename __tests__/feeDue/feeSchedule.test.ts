import type { FeeStructureItem } from '../../src/models/fee';
import {
  createFeePeriodKey,
  deriveDueDate,
  generateFeeSchedule,
  orderAcademicPeriodKeys,
} from '../../src/utils/feeSchedule';

const item = (
  frequency: FeeStructureItem['frequency'],
  patch: Partial<FeeStructureItem> = {},
): FeeStructureItem => ({
  amount: 800,
  applicability: 'ALL_STUDENTS',
  displayOrder: 1,
  dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
  feeHeadId: 'tuition',
  feeHeadName: 'Tuition Fee',
  feeStructureId: 'structure',
  frequency,
  id: `item-${frequency}`,
  mandatory: true,
  status: 'ACTIVE',
  ...patch,
});

const schedule = (
  feeItem: FeeStructureItem,
  patch: Partial<Parameters<typeof generateFeeSchedule>[0]> = {},
) =>
  generateFeeSchedule({
    academicSessionName: '2026-27',
    academicYearStartMonth: 4,
    assignmentEffectiveDate: '2026-04-01',
    enrollmentStartDate: '2026-04-01',
    item: feeItem,
    sessionEndDate: '2027-03-31',
    sessionStartDate: '2026-04-01',
    structureEffectiveDate: '2026-04-01',
    ...patch,
  });

describe('Fee Due schedule utility', () => {
  it('generates session-relative monthly periods', () => {
    const result = schedule(item('MONTHLY'));
    expect(result).toHaveLength(12);
    expect(result[0]).toMatchObject({
      dueDate: '2026-04-10',
      key: '2026-04',
      label: 'April 2026',
      type: 'MONTH',
    });
    expect(result.at(-1)?.key).toBe('2027-03');
  });

  it('honors selected applicable months', () => {
    expect(
      schedule(item('MONTHLY', { applicableMonths: [4, 7, 1] })).map(
        value => value.key,
      ),
    ).toEqual(['2026-04', '2026-07', '2027-01']);
  });

  it('does not assume an April academic-session start', () => {
    const result = schedule(item('MONTHLY'), {
      academicYearStartMonth: 7,
      sessionEndDate: '2027-06-30',
      sessionStartDate: '2026-07-01',
    });
    expect(result[0].key).toBe('2026-07');
    expect(result.at(-1)?.key).toBe('2027-06');
  });

  it('generates four academic quarters', () => {
    expect(schedule(item('QUARTERLY')).map(value => value.key)).toEqual([
      '2026-27-Q1',
      '2026-27-Q2',
      '2026-27-Q3',
      '2026-27-Q4',
    ]);
  });

  it('generates half-yearly and yearly periods', () => {
    expect(schedule(item('HALF_YEARLY'))).toHaveLength(2);
    expect(schedule(item('YEARLY'))).toMatchObject([
      { key: '2026-27', type: 'YEAR' },
    ]);
  });

  it('supports configured installments', () => {
    const result = schedule(
      item('YEARLY', { installmentCount: 3 }),
      { useInstallments: true },
    );
    expect(result.map(value => value.installmentNumber)).toEqual([1, 2, 3]);
    expect(result.map(value => value.key)).toEqual([
      'INST-1',
      'INST-2',
      'INST-3',
    ]);
  });

  it('creates a one-time period using the fixed date', () => {
    expect(
      schedule(
        item('ONE_TIME', {
          dueRule: { date: '2026-04-15', type: 'FIXED_DATE' },
        }),
      )[0],
    ).toMatchObject({
      dueDate: '2026-04-15',
      type: 'ONE_TIME',
    });
  });

  it('clamps impossible month days and exposes a warning', () => {
    expect(
      deriveDueDate('2027-02-01', {
        day: 31,
        type: 'FIXED_DAY_OF_PERIOD',
      }),
    ).toEqual({
      dueDate: '2027-02-28',
      warnings: ['Due day 31 was clamped to 28.'],
    });
  });

  it('uses leap-year February and keeps a session-boundary due date', () => {
    expect(
      deriveDueDate('2028-02-01', {
        day: 31,
        type: 'FIXED_DAY_OF_PERIOD',
      }).dueDate,
    ).toBe('2028-02-29');
    expect(
      schedule(item('MONTHLY'), {
        sessionEndDate: '2026-04-30',
      }),
    ).toMatchObject([{ dueDate: '2026-04-10', key: '2026-04' }]);
  });

  it('uses a fixed date exactly', () => {
    expect(
      deriveDueDate('2026-04-01', {
        date: '2026-04-25',
        type: 'FIXED_DATE',
      }),
    ).toEqual({ dueDate: '2026-04-25', warnings: [] });
  });

  it('excludes periods before enrollment start', () => {
    const result = schedule(item('MONTHLY'), {
      enrollmentStartDate: '2026-08-01',
    });
    expect(result[0].key).toBe('2026-08');
  });

  it('includes the admission month for a mid-month enrollment', () => {
    const result = schedule(item('MONTHLY'), {
      assignmentEffectiveDate: '2026-07-15',
      enrollmentStartDate: '2026-07-15',
    });
    expect(result[0]).toMatchObject({
      dueDate: '2026-07-10',
      key: '2026-07',
    });
  });

  it('excludes periods after enrollment end', () => {
    const result = schedule(item('MONTHLY'), {
      enrollmentEndDate: '2026-09-15',
    });
    expect(result.at(-1)?.key).toBe('2026-09');
  });

  it('uses assignment effective date unless prior eligible periods are requested', () => {
    expect(
      schedule(item('MONTHLY'), {
        assignmentEffectiveDate: '2026-07-01',
      })[0].key,
    ).toBe('2026-07');
    expect(
      schedule(item('MONTHLY'), {
        assignmentEffectiveDate: '2026-07-01',
        includePreviousEligiblePeriods: true,
      })[0].key,
    ).toBe('2026-04');
  });

  it('creates stable backend-safe period keys', () => {
    expect(
      createFeePeriodKey(
        'ONE_TIME',
        '2026-27',
        '2026-04-01',
        1,
        'admission',
      ),
    ).toBe('ONE_TIME-ADMISSION');
  });

  it('orders requested periods by academic schedule order', () => {
    const generated = schedule(item('MONTHLY'));
    expect(
      orderAcademicPeriodKeys(
        ['2027-01', 'unknown', '2026-04'],
        generated,
      ),
    ).toEqual(['2026-04', '2027-01', 'unknown']);
  });
});
