import {
  calculateOutstandingAmount,
  createFeeDueIdempotencyKey,
  deriveFeeDueStatus,
} from '../../src/utils/feeOutstandingCalculation';

describe('Fee Due outstanding utility', () => {
  it('uses integer-paise fee, Fine, waiver, and reserved payment fields', () => {
    expect(
      calculateOutstandingAmount({
        fineAmountPaise: 5_000,
        fineWaivedAmountPaise: 2_000,
        netFeeAmountPaise: 80_000,
        paidAmountPaise: 10_000,
        status: 'PARTIALLY_PAID',
      }),
    ).toBe(73_000);
  });

  it('never returns a negative amount', () => {
    expect(
      calculateOutstandingAmount({
        fineAmountPaise: 0,
        fineWaivedAmountPaise: 0,
        netFeeAmountPaise: 10_000,
        paidAmountPaise: 20_000,
        status: 'PAID',
      }),
    ).toBe(0);
  });

  it.each(['WAIVED', 'CANCELLED'] as const)(
    'returns zero for %s history',
    status => {
      expect(
        calculateOutstandingAmount({
          fineAmountPaise: 10_000,
          fineWaivedAmountPaise: 0,
          netFeeAmountPaise: 80_000,
          paidAmountPaise: 0,
          status,
        }),
      ).toBe(0);
    },
  );

  it('derives upcoming, pending, and overdue from the injected date', () => {
    expect(deriveFeeDueStatus('2026-08-01', '2026-07-31', 100)).toBe(
      'UPCOMING',
    );
    expect(deriveFeeDueStatus('2026-07-31', '2026-07-31', 100)).toBe(
      'PENDING',
    );
    expect(deriveFeeDueStatus('2026-07-30', '2026-07-31', 100)).toBe(
      'OVERDUE',
    );
  });

  it('preserves formal and payment-reserved statuses', () => {
    expect(
      deriveFeeDueStatus('2020-01-01', '2026-07-31', 100, 'CANCELLED'),
    ).toBe('CANCELLED');
    expect(
      deriveFeeDueStatus('2020-01-01', '2026-07-31', 100, 'PARTIALLY_PAID'),
    ).toBe('PARTIALLY_PAID');
  });

  it('creates a stable idempotency key without labels', () => {
    expect(
      createFeeDueIdempotencyKey({
        enrollmentId: 'enrollment',
        feeStructureItemId: 'item',
        periodKey: '2026-07',
        schoolId: 'school',
        studentId: 'student',
      }),
    ).toBe('school::student::enrollment::item::2026-07');
  });
});
