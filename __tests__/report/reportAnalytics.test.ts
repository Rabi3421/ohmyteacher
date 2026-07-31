import {
  aggregateCurrency,
  aggregateCounts,
  aggregateByDate,
} from '../../src/utils/reportAggregation';
import {
  AGING_BUCKET_ORDER,
  getOutstandingAgingBucket,
} from '../../src/utils/reportAging';
import { createReportExportFileName } from '../../src/utils/reportExportFileName';
import {
  hashReportFilters,
  normalizeReportFilters,
} from '../../src/utils/reportFilterHash';
import {
  average,
  collectionRate,
  maximum,
  median,
  metricComparisonBasisPoints,
  minimum,
  toBasisPoints,
} from '../../src/utils/reportPercentages';
import {
  groupIsoDatesByMonth,
  trendDirection,
} from '../../src/utils/reportTrends';

describe('Report analytics utilities', () => {
  it('uses the six deterministic outstanding aging buckets', () => {
    expect(AGING_BUCKET_ORDER).toEqual([
      'NOT_DUE',
      'DUE_TODAY',
      '1_TO_30_DAYS',
      '31_TO_60_DAYS',
      '61_TO_90_DAYS',
      'OVER_90_DAYS',
    ]);
    expect(getOutstandingAgingBucket('2026-08-01', '2026-07-31')).toBe(
      'NOT_DUE',
    );
    expect(getOutstandingAgingBucket('2026-07-31', '2026-07-31')).toBe(
      'DUE_TODAY',
    );
    expect(getOutstandingAgingBucket('2026-07-01', '2026-07-31')).toBe(
      '1_TO_30_DAYS',
    );
    expect(getOutstandingAgingBucket('2026-06-01', '2026-07-31')).toBe(
      '31_TO_60_DAYS',
    );
    expect(getOutstandingAgingBucket('2026-05-02', '2026-07-31')).toBe(
      '61_TO_90_DAYS',
    );
    expect(getOutstandingAgingBucket('2026-05-01', '2026-07-31')).toBe(
      'OVER_90_DAYS',
    );
  });

  it('aggregates integer paise and counts in stable key order', () => {
    expect(
      aggregateCurrency([
        { key: 'UPI', amountPaise: 125 },
        { key: 'CASH', amountPaise: 200 },
        { key: 'UPI', amountPaise: 75 },
      ]),
    ).toEqual([
      { key: 'CASH', amountPaise: 200, count: 1 },
      { key: 'UPI', amountPaise: 200, count: 2 },
    ]);
    expect(
      aggregateCounts([{ key: 'PASS' }, { key: 'PASS' }, { key: 'FAIL' }]),
    ).toEqual([
      { key: 'FAIL', count: 1 },
      { key: 'PASS', count: 2 },
    ]);
    expect(
      aggregateByDate(
        [{ at: '2026-07-31T10:00:00Z', amount: 4 }],
        item => item.at,
        item => item.amount,
      ),
    ).toEqual([{ date: '2026-07-31', amountPaise: 4, count: 1 }]);
  });

  it('controls percentage and comparison rounding', () => {
    expect(toBasisPoints(2, 3)).toBe(6667);
    expect(collectionRate(75, 100)).toBe(7500);
    expect(average([1, 2, 4])).toBe(2);
    expect([minimum([3, 1]), maximum([3, 1]), median([1, 4, 8, 9])]).toEqual([
      1, 3, 6,
    ]);
    expect(metricComparisonBasisPoints(120, 100)).toBe(2000);
    expect(metricComparisonBasisPoints(10, 0)).toBe(10000);
  });

  it('normalizes filters, hashes them, and names files deterministically', () => {
    const left = { schoolId: 'school', branchIds: ['b', 'a'], page: 1 };
    const right = { page: 1, branchIds: ['a', 'b'], schoolId: 'school' };
    expect(normalizeReportFilters(left)).toEqual(right);
    expect(hashReportFilters(left)).toBe(hashReportFilters(right));
    expect(
      createReportExportFileName({
        reportType: 'FEE_OUTSTANDING',
        format: 'XLSX',
        asOfDate: '2026-07-31',
        schoolName: 'Oh My Teacher!',
      }),
    ).toBe('oh-my-teacher_fee_outstanding_2026-07-31.xlsx');
  });

  it('groups trends without using device time', () => {
    expect(
      groupIsoDatesByMonth(
        ['2026-07-01', '2026-07-31', '2026-08-01'],
        item => item,
      ),
    ).toEqual([
      { month: '2026-07', count: 2 },
      { month: '2026-08', count: 1 },
    ]);
    expect([
      trendDirection(2, 1),
      trendDirection(1, 2),
      trendDirection(1, 1),
    ]).toEqual(['UP', 'DOWN', 'FLAT']);
  });
});
