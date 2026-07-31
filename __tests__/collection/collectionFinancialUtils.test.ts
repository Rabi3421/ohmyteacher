import type {
  Payment,
  PaymentReversal,
  StudentAdvanceCreditEntry,
  StudentLedgerEntry,
} from '../../src/models/collection';
import {
  calculateAdvanceBalance,
  withAdvanceRunningBalances,
} from '../../src/utils/advanceCredit';
import { recalculatePaidFeeDueStatus } from '../../src/utils/collectionFeeDueStatus';
import { aggregateDailyCollection } from '../../src/utils/dailyCollection';
import { validatePaymentDetails } from '../../src/utils/paymentModeValidation';
import { withLedgerRunningBalances } from '../../src/utils/studentLedger';

const advance = (
  id: string,
  credit: number,
  debit: number,
  at: string,
): StudentAdvanceCreditEntry => ({
  branchId: 'branch-main',
  createdAt: at,
  createdByUserId: 'user',
  creditAmountPaise: credit,
  debitAmountPaise: debit,
  description: id,
  entryType: credit ? 'PAYMENT_CREDIT' : 'DUE_APPLICATION',
  id,
  runningBalancePaise: 0,
  schoolId: 'school-omt',
  studentId: 'student',
});

describe('Collection financial utilities', () => {
  it('calculates multiple Advance credits, applications and reversals', () => {
    const entries = [
      advance('credit-1', 100_000, 0, '2026-01-01'),
      advance('credit-2', 50_000, 0, '2026-01-02'),
      advance('apply', 0, 60_000, '2026-01-03'),
      {
        ...advance('reverse', 0, 20_000, '2026-01-04'),
        entryType: 'REVERSAL' as const,
      },
    ];
    expect(calculateAdvanceBalance(entries)).toBe(70_000);
    expect(
      withAdvanceRunningBalances(entries).map(item => item.runningBalancePaise),
    ).toEqual([100_000, 150_000, 90_000, 70_000]);
  });

  it('never returns a negative Advance balance', () => {
    expect(
      calculateAdvanceBalance([advance('invalid', 0, 1_000, '2026-01-01')]),
    ).toBe(0);
  });

  it.each([
    [0, 100, '2026-07-01', '2026-07-31', undefined, 'PAID'],
    [50, 50, '2026-07-01', '2026-07-31', undefined, 'PARTIALLY_PAID'],
    [100, 0, '2026-07-31', '2026-07-31', undefined, 'PENDING'],
    [100, 0, '2026-07-01', '2026-07-31', undefined, 'OVERDUE'],
    [0, 100, '2026-07-01', '2026-07-31', 'WAIVED', 'WAIVED'],
    [0, 100, '2026-07-01', '2026-07-31', 'CANCELLED', 'CANCELLED'],
  ] as const)(
    'derives status %s/%s as %s',
    (outstanding, paid, dueDate, asOfDate, protectedStatus, expected) => {
      expect(
        recalculatePaidFeeDueStatus({
          asOfDate,
          dueDate,
          outstandingAmountPaise: outstanding,
          paidAmountPaise: paid,
          protectedStatus,
        }),
      ).toBe(expected);
    },
  );

  it('orders ledger entries deterministically and calculates running balance', () => {
    const base = (
      id: string,
      date: string,
      debit: number,
      credit: number,
    ): StudentLedgerEntry => ({
      branchId: 'branch-main',
      createdAt: `${date}T10:00:00Z`,
      creditPaise: credit,
      debitPaise: debit,
      description: id,
      effectiveDate: date,
      entryType: debit ? 'FEE_DUE_CREATED' : 'PAYMENT_ALLOCATED',
      id,
      runningBalancePaise: 0,
      schoolId: 'school-omt',
      studentId: 'student',
    });
    const result = withLedgerRunningBalances([
      base('payment', '2026-02-01', 0, 40),
      base('fee', '2026-01-01', 100, 0),
      base('reversal', '2026-03-01', 20, 0),
    ]);
    expect(result.map(item => item.id)).toEqual(['fee', 'payment', 'reversal']);
    expect(result.map(item => item.runningBalancePaise)).toEqual([100, 60, 80]);
  });

  it('aggregates modes, Advance, collectors, and prior-day Payment reversals', () => {
    const payment = (
      id: string,
      mode: Payment['paymentMode'],
      amount: number,
      date = '2026-07-31',
    ): Payment => ({
      academicSessionId: 'session',
      advanceAmountPaise: id === 'cash' ? 100 : 0,
      allocatedAmountPaise: amount - (id === 'cash' ? 100 : 0),
      amountPaise: amount,
      branchId: 'branch-main',
      collectedByName: id === 'old' ? 'Old Collector' : 'Collector',
      collectedByUserId: id === 'old' ? 'old-user' : 'user',
      createdAt: `${date}T10:00:00Z`,
      id,
      idempotencyKey: id,
      paymentDate: date,
      paymentMode: mode,
      paymentNumber: id,
      schoolId: 'school-omt',
      status: 'POSTED',
      studentId: 'student',
      updatedAt: `${date}T10:00:00Z`,
    });
    const payments = [
      payment('cash', 'CASH', 1_000),
      payment('upi', 'UPI', 2_000),
      payment('bank', 'BANK_TRANSFER', 3_000),
      payment('card', 'CARD', 4_000),
      payment('cheque', 'CHEQUE', 5_000),
      payment('old', 'CASH', 600, '2026-07-30'),
    ];
    const reversals: PaymentReversal[] = [
      {
        amountPaise: 600,
        id: 'reversal',
        paymentId: 'old',
        reason: 'Correction',
        reversalNumber: 'REV-1',
        reversedAt: '2026-07-31T12:00:00Z',
        reversedByName: 'Admin',
        reversedByUserId: 'admin',
        schoolId: 'school-omt',
      },
    ];
    const result = aggregateDailyCollection({
      branchId: 'branch-main',
      date: '2026-07-31',
      payments,
      reversals,
      schoolId: 'school-omt',
    });
    expect(result.totalPostedPaymentsPaise).toBe(15_000);
    expect(result.advanceCollectedPaise).toBe(100);
    expect(result.reversedAmountPaise).toBe(600);
    expect(result.netCollectionPaise).toBe(14_400);
    expect(result.modes.map(item => item.amountPaise)).toEqual([
      1_000, 2_000, 3_000, 4_000, 5_000,
    ]);
    expect(
      result.collectors.find(item => item.userId === 'old-user')
        ?.netCollectionPaise,
    ).toBe(-600);
  });

  it('validates reference fields per Payment mode', () => {
    expect(
      validatePaymentDetails({
        amountPaise: 100,
        paymentDate: '2026-07-31',
        paymentMode: 'UPI',
      }),
    ).toHaveProperty('referenceNumber');
    expect(
      validatePaymentDetails({
        amountPaise: 100,
        paymentDate: '2026-07-31',
        paymentMode: 'CHEQUE',
      }),
    ).toMatchObject({
      bankName: expect.any(String),
      chequeDate: expect.any(String),
      chequeNumber: expect.any(String),
    });
    expect(
      validatePaymentDetails({
        amountPaise: 100,
        paymentDate: '2026-07-31',
        paymentMode: 'CASH',
      }),
    ).toEqual({});
    expect(
      validatePaymentDetails({
        amountPaise: 100,
        paymentDate: '2026-02-31',
        paymentMode: 'CASH',
      }),
    ).toHaveProperty('paymentDate');
  });
});
