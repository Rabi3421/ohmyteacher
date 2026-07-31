import type { PreviewPaymentInput } from '../../src/models/collection';
import {
  getMockFeeDueRepositorySnapshot,
  resetMockFeeDueData,
} from '../../src/services/feeDue/mockFeeDueService';
import {
  getMockCollectionRepositorySnapshot,
  mockCollectionService,
  resetMockCollectionData,
} from '../../src/services/collection/mockCollectionService';

const schoolId = 'school-omt';
let request = 0;
const input = (
  patch: Partial<PreviewPaymentInput> = {},
): PreviewPaymentInput => ({
  academicSessionId: 'session-school-omt-current',
  allocationMode: 'OLDEST_DUE_FIRST',
  amountPaise: 110_000,
  asOfDate: '2026-07-31',
  branchId: 'branch-main',
  clientGeneratedRequestId: `test-${++request}`,
  collectedByName: 'Ananya Sharma',
  collectedByUserId: 'user-school-admin',
  feeDueIds: ['due-rahul-june-daily'],
  manualAllocations: [],
  paymentDate: '2026-07-31',
  paymentMode: 'CASH',
  schoolId,
  storeExcessAsAdvance: false,
  studentId: 'student-rahul',
  ...patch,
});

async function finish<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  promise.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  for (let index = 0; index < 30 && !settled; index += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}

async function post(value: PreviewPaymentInput) {
  const preview = await finish(
    mockCollectionService.previewPaymentAllocation(schoolId, value),
  );
  return finish(
    mockCollectionService.postPayment(schoolId, {
      idempotencyKey: `${schoolId}::${value.studentId}::${value.clientGeneratedRequestId}`,
      previewId: preview.data.previewId,
      requestedByUserId: value.collectedByUserId,
    }),
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  request = 0;
  resetMockFeeDueData();
  resetMockCollectionData();
});
afterEach(() => jest.useRealTimers());

describe('mock Collection service', () => {
  it('previews without mutating the authoritative Fee Due repository', async () => {
    const before = getMockFeeDueRepositorySnapshot();
    const preview = await finish(
      mockCollectionService.previewPaymentAllocation(schoolId, input()),
    );
    expect(preview.data.allocations[0]).toMatchObject({
      feeAmountAppliedPaise: 80_000,
      fineAmountAppliedPaise: 30_000,
    });
    expect(getMockFeeDueRepositorySnapshot()).toEqual(before);
  });

  it('posts a full Payment, allocation, immutable Receipt snapshot and ledger', async () => {
    const result = await post(input());
    expect(result.data.payment.status).toBe('POSTED');
    expect(result.data.payment.amountPaise).toBe(110_000);
    expect(result.data.receipt.receiptNumber).toMatch(/^REC\/MAIN\/2026-27\//);
    expect(
      result.data.receipt.allocationSnapshots[0].fineAmountAppliedPaise,
    ).toBe(30_000);
    expect(result.data.allocations[0]).toMatchObject({
      feeHeadNameSnapshot: 'Tuition Fee',
      periodLabelSnapshot: 'June 2026',
      resultingDueStatus: 'PAID',
    });
    expect(
      getMockFeeDueRepositorySnapshot().find(
        item => item.id === 'due-rahul-june-daily',
      ),
    ).toMatchObject({ outstandingAmountPaise: 0, status: 'PAID' });
    expect(
      getMockCollectionRepositorySnapshot().activities.map(item => item.action),
    ).toEqual(
      expect.arrayContaining([
        'PAYMENT_PREVIEWED',
        'PAYMENT_POSTED',
        'PAYMENT_ALLOCATED',
        'RECEIPT_CREATED',
      ]),
    );
    const ledger = await finish(
      mockCollectionService.getStudentLedger(schoolId, 'student-rahul'),
    );
    expect(ledger.data.entries.map(item => item.entryType)).toEqual(
      expect.arrayContaining(['PAYMENT_POSTED', 'PAYMENT_ALLOCATED']),
    );
    result.data.payment.amountPaise = 1;
    expect(
      (
        await finish(
          mockCollectionService.getPayment(schoolId, result.data.payment.id),
        )
      ).data.payment.amountPaise,
    ).toBe(110_000);
  });

  it('posts partial and multi-Due Payments', async () => {
    const partial = await post(input({ amountPaise: 40_000 }));
    expect(partial.data.allocations[0]).toMatchObject({
      feeAmountAppliedPaise: 10_000,
      fineAmountAppliedPaise: 30_000,
    });
    resetMockFeeDueData();
    resetMockCollectionData();
    const multi = await post(
      input({
        amountPaise: 190_000,
        feeDueIds: ['due-rahul-july-pending', 'due-rahul-june-daily'],
      }),
    );
    expect(multi.data.allocations).toHaveLength(2);
    expect(
      multi.data.allocations.reduce(
        (sum, item) => sum + item.totalAppliedPaise,
        0,
      ),
    ).toBe(190_000);
  });

  it('supports reconciled manual allocation', async () => {
    const value = input({
      allocationMode: 'MANUAL',
      amountPaise: 50_000,
      feeDueIds: ['due-rahul-july-pending', 'due-rahul-june-daily'],
      manualAllocations: [
        { amountPaise: 20_000, feeDueId: 'due-rahul-july-pending' },
        { amountPaise: 30_000, feeDueId: 'due-rahul-june-daily' },
      ],
    });
    const result = await post(value);
    expect(result.data.allocations.map(item => item.totalAppliedPaise)).toEqual(
      [30_000, 20_000],
    );
  });

  it('creates explicit Advance Credit for excess only when enabled', async () => {
    const result = await post(
      input({ amountPaise: 150_000, storeExcessAsAdvance: true }),
    );
    expect(result.data.payment.advanceAmountPaise).toBe(40_000);
    expect(result.data.advanceEntry?.creditAmountPaise).toBe(40_000);
    expect(result.data.receipt.advanceAmountPaise).toBe(40_000);
  });

  it('records every supported confirmed Payment mode with unique Receipts', async () => {
    const scenarios: Array<Partial<PreviewPaymentInput>> = [
      { paymentMode: 'CASH' },
      { paymentMode: 'UPI', referenceNumber: 'UPI-TEST-1' },
      { paymentMode: 'BANK_TRANSFER', referenceNumber: 'BANK-TEST-1' },
      { paymentMode: 'CARD', referenceNumber: 'CARD-TEST-1' },
      {
        bankName: 'State Bank of India',
        chequeDate: '2026-07-31',
        chequeNumber: 'CHQ-TEST-1',
        paymentMode: 'CHEQUE',
      },
    ];
    const receiptNumbers: string[] = [];
    for (const scenario of scenarios) {
      const result = await post(
        input({
          ...scenario,
          amountPaise: 100,
          feeDueIds: [],
          storeExcessAsAdvance: true,
        }),
      );
      receiptNumbers.push(result.data.receipt.receiptNumber);
    }
    expect(new Set(receiptNumbers).size).toBe(scenarios.length);
    expect(
      (await finish(mockCollectionService.getPayments(schoolId, {}))).data.items
        .map(item => item.payment.paymentMode)
        .filter(mode =>
          ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE'].includes(mode),
        ),
    ).toEqual(
      expect.arrayContaining([
        'CASH',
        'UPI',
        'BANK_TRANSFER',
        'CARD',
        'CHEQUE',
      ]),
    );
  });

  it('returns the existing result for a duplicate idempotency key', async () => {
    const value = input();
    const first = await post(value);
    const duplicate = await finish(
      mockCollectionService.postPayment(schoolId, {
        idempotencyKey: `${schoolId}::${value.studentId}::${value.clientGeneratedRequestId}`,
        previewId: 'already-consumed',
        requestedByUserId: value.collectedByUserId,
      }),
    );
    expect(duplicate.data.payment.id).toBe(first.data.payment.id);
    const payments = await finish(
      mockCollectionService.getPayments(schoolId, {
        search: value.clientGeneratedRequestId,
      }),
    );
    expect(payments.data.totalItems).toBe(0);
    const all = await finish(mockCollectionService.getPayments(schoolId, {}));
    expect(
      all.data.items.filter(item => item.payment.id === first.data.payment.id),
    ).toHaveLength(1);
  });

  it('rolls back every Fee Due mutation when posting fails', async () => {
    const value = input({ simulateFailure: true });
    const before = getMockFeeDueRepositorySnapshot();
    const collectionBefore = getMockCollectionRepositorySnapshot();
    const preview = await finish(
      mockCollectionService.previewPaymentAllocation(schoolId, value),
    );
    await expect(
      finish(
        mockCollectionService.postPayment(schoolId, {
          idempotencyKey: `${schoolId}::${value.studentId}::${value.clientGeneratedRequestId}`,
          previewId: preview.data.previewId,
          requestedByUserId: value.collectedByUserId,
        }),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_ATOMIC_FAILURE' });
    expect(getMockFeeDueRepositorySnapshot()).toEqual(before);
    expect(getMockCollectionRepositorySnapshot()).toEqual({
      ...collectionBefore,
      activities: expect.any(Array),
    });
  });

  it('rejects invalid references, allocation limits and cross-context Dues', async () => {
    await expect(
      finish(
        mockCollectionService.previewPaymentAllocation(
          schoolId,
          input({ paymentMode: 'UPI' }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_VALIDATION_ERROR' });
    await expect(
      finish(
        mockCollectionService.previewPaymentAllocation(
          schoolId,
          input({
            allocationMode: 'MANUAL',
            amountPaise: 10_000,
            manualAllocations: [
              { amountPaise: 20_000, feeDueId: 'due-rahul-june-daily' },
            ],
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'MANUAL_ALLOCATION_EXCEEDS_PAYMENT' });
    await expect(
      finish(
        mockCollectionService.previewPaymentAllocation(
          schoolId,
          input({ feeDueIds: ['due-aarav-admission'] }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_DUE_CONTEXT_MISMATCH' });
    await expect(
      finish(
        mockCollectionService.previewPaymentAllocation(
          'school-greenfield',
          input(),
        ),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_SCHOOL_MISMATCH' });
    await expect(
      finish(
        mockCollectionService.previewPaymentAllocation(
          schoolId,
          input({ branchId: 'branch-secondary' }),
        ),
      ),
    ).rejects.toMatchObject({ code: expect.any(String) });
  });

  it('blocks mutations in a closed session', async () => {
    await expect(
      finish(
        mockCollectionService.previewPaymentAllocation(
          schoolId,
          input({ academicSessionId: 'session-school-omt-closed' }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'COLLECTION_SESSION_CLOSED' });
  });

  it('fully reverses once, restores Due status, and cancels the Receipt', async () => {
    const posted = await post(input());
    const reversed = await finish(
      mockCollectionService.reversePayment(schoolId, posted.data.payment.id, {
        asOfDate: '2026-07-31',
        reason: 'Duplicate cash entry',
        reversedByName: 'Admin',
        reversedByUserId: 'user-school-admin',
      }),
    );
    expect(reversed.data.payment.status).toBe('REVERSED');
    expect(reversed.data.receipt.status).toBe('CANCELLED');
    expect(reversed.data.reversal.amountPaise).toBe(
      posted.data.payment.amountPaise,
    );
    expect(
      getMockFeeDueRepositorySnapshot().find(
        item => item.id === 'due-rahul-june-daily',
      ),
    ).toMatchObject({ outstandingAmountPaise: 110_000, status: 'OVERDUE' });
    await expect(
      finish(
        mockCollectionService.reversePayment(schoolId, posted.data.payment.id, {
          asOfDate: '2026-07-31',
          reason: 'Again',
          reversedByName: 'Admin',
          reversedByUserId: 'user-school-admin',
        }),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_ALREADY_REVERSED' });
  });

  it('applies Advance without a new cash Payment and blocks consumed-credit reversal', async () => {
    const before = (
      await finish(mockCollectionService.getPayments(schoolId, {}))
    ).data.totalItems;
    const preview = await finish(
      mockCollectionService.previewAdvanceApplication(
        schoolId,
        'student-rahul',
        {
          academicSessionId: 'session-school-omt-current',
          asOfDate: '2026-07-31',
          branchId: 'branch-main',
          feeDueIds: ['due-rahul-july-pending'],
          requestedByUserId: 'user-school-admin',
        },
      ),
    );
    const applied = await finish(
      mockCollectionService.applyAdvanceCredit(schoolId, 'student-rahul', {
        previewId: preview.data.previewId,
        requestedByUserId: 'user-school-admin',
      }),
    );
    expect(applied.data.appliedAmountPaise).toBe(50_000);
    expect(
      (await finish(mockCollectionService.getPayments(schoolId, {}))).data
        .totalItems,
    ).toBe(before);
    await expect(
      finish(
        mockCollectionService.reversePayment(
          schoolId,
          'payment-advance-rahul',
          {
            asOfDate: '2026-07-31',
            reason: 'Cannot reverse consumed lot',
            reversedByName: 'Admin',
            reversedByUserId: 'user-school-admin',
          },
        ),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_ADVANCE_ALREADY_CONSUMED' });
  });

  it('aggregates daily Collection including an older Payment reversal', async () => {
    const daily = await finish(
      mockCollectionService.getDailyCollection(
        schoolId,
        'branch-main',
        '2026-07-31',
      ),
    );
    expect(daily.data.reversedAmountPaise).toBe(10_000);
    expect(daily.data.netCollectionPaise).toBe(-10_000);
  });

  it('enforces Parent and Student Receipt ownership and redacts internal notes', async () => {
    const parent = await finish(
      mockCollectionService.getParentReceipt(
        schoolId,
        'membership-parent',
        'receipt-advance-rahul',
      ),
    );
    expect(parent.data.payment.collectedByUserId).toBe('REDACTED');
    await expect(
      finish(
        mockCollectionService.getParentReceipt(
          schoolId,
          'membership-parent',
          'receipt-reversed-aarav',
        ),
      ),
    ).rejects.toMatchObject({ code: 'PARENT_RECEIPT_OWNERSHIP_DENIED' });
    const arjun = input({
      amountPaise: 80_000,
      feeDueIds: ['due-arjun-self'],
      studentId: 'student-arjun',
    });
    const posted = await post(arjun);
    const own = await finish(
      mockCollectionService.getStudentSelfReceipt(
        schoolId,
        'membership-student',
        posted.data.receipt.id,
      ),
    );
    expect(own.data.receipt.studentId).toBe('student-arjun');
    await expect(
      finish(
        mockCollectionService.getStudentSelfReceipt(
          schoolId,
          'membership-student',
          'receipt-advance-rahul',
        ),
      ),
    ).rejects.toMatchObject({ code: 'STUDENT_RECEIPT_OWNERSHIP_DENIED' });
  });

  it('returns explicit mock document metadata rather than a fake PDF', async () => {
    const document = await finish(
      mockCollectionService.getReceiptDocument(
        schoolId,
        'receipt-advance-rahul',
      ),
    );
    expect(document.data.developmentUri).toMatch(/^development:\/\//);
    expect(document.data.message).toContain(
      'authoritative PDF is backend-generated',
    );
  });
});
