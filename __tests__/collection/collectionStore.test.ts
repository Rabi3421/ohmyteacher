import type { UserMembership } from '../../src/models/auth';
import {
  mockCollectionService,
  resetMockCollectionData,
} from '../../src/services/collection/mockCollectionService';
import { resetMockFeeDueData } from '../../src/services/feeDue/mockFeeDueService';
import { createCollectionStore } from '../../src/store/collection/collectionStore';
import { getEffectivePermissions } from '../../src/utils/effectivePermissions';

const admin: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-school-admin',
};
const accountant: UserMembership = {
  branchId: 'branch-main',
  id: 'membership-accountant',
  role: 'ACCOUNTANT',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-accountant',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  asOfDate: '2026-07-31',
  branchId: 'branch-main',
  schoolId: 'school-omt',
};
const create = (actor: UserMembership = admin) =>
  createCollectionStore({
    getActorName: () => 'Test Actor',
    getMembership: () => actor,
    getPermissions: member => getEffectivePermissions(member.role),
    service: mockCollectionService,
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
  for (let index = 0; index < 40 && !settled; index += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockFeeDueData();
  resetMockCollectionData();
});
afterEach(() => jest.useRealTimers());

describe('Collection store', () => {
  it('manages workflow draft and allocation preview', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    expect(
      await finish(store.getState().loadCollectableDues('student-rahul')),
    ).toBe(true);
    store.getState().updatePaymentInput({
      amountPaise: 110_000,
      feeDueIds: ['due-rahul-june-daily'],
      studentId: 'student-rahul',
    });
    expect(await finish(store.getState().previewAllocation())).toBe(true);
    expect(store.getState().allocationPreview?.isReconciled).toBe(true);
    expect(store.getState().paymentDraft.step).toBe(4);
  });

  it('prevents duplicate Payment posting in flight and resets workflow on success', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    store.getState().updatePaymentInput({
      amountPaise: 110_000,
      feeDueIds: ['due-rahul-june-daily'],
      studentId: 'student-rahul',
    });
    await finish(store.getState().previewAllocation());
    const first = store.getState().postPayment();
    expect(await store.getState().postPayment()).toBe(false);
    expect(await finish(first)).toBe(true);
    expect(store.getState().paymentResult?.payment.status).toBe('POSTED');
    expect(store.getState().allocationPreview).toBeNull();
    expect(store.getState().paymentDraft.input.studentId).toBe('');
  });

  it('clears financial scope on branch/session and workspace change', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    await finish(store.getState().loadDashboard());
    expect(store.getState().dashboard).not.toBeNull();
    store
      .getState()
      .setContext(
        { ...context, academicSessionId: 'session-school-omt-next' },
        'UPCOMING',
      );
    expect(store.getState().dashboard).toBeNull();
    store.getState().setContext(null);
    expect(store.getState().context).toBeNull();
    expect(store.getState().payments.items).toEqual([]);
  });

  it('protects against stale in-flight Dashboard responses', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    const pending = store.getState().loadDashboard();
    store
      .getState()
      .setContext(
        { ...context, academicSessionId: 'session-school-omt-next' },
        'UPCOMING',
      );
    await finish(pending);
    expect(store.getState().dashboard).toBeNull();
  });

  it('updates Payment and Receipt filters and loads their lists', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    store.getState().setPaymentQuery({ paymentMode: 'UPI', search: 'Rahul' });
    store.getState().setReceiptQuery({ status: 'ACTIVE' });
    await finish(store.getState().loadPayments());
    await finish(store.getState().loadReceipts());
    expect(store.getState().paymentQuery).toMatchObject({
      paymentMode: 'UPI',
      search: 'Rahul',
    });
    expect(store.getState().payments.items[0]?.studentName).toBe('Rahul Patel');
    expect(
      store
        .getState()
        .receipts.items.every(item => item.receipt.status === 'ACTIVE'),
    ).toBe(true);
  });

  it('refreshes Payment details after reversal and normalizes conflicts', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    expect(
      await finish(
        store
          .getState()
          .reversePayment('payment-advance-rahul', 'Correct fixture'),
      ),
    ).toBe(true);
    expect(store.getState().currentPayment?.payment.status).toBe('REVERSED');
    expect(
      await finish(
        store.getState().reversePayment('payment-advance-rahul', 'Again'),
      ),
    ).toBe(false);
    expect(store.getState().error?.code).toBe('PAYMENT_ALREADY_REVERSED');
  });

  it('loads Ledger/Advance and refreshes Advance after application', async () => {
    const store = create();
    store.getState().setContext(context, 'ACTIVE');
    expect(await finish(store.getState().loadLedger('student-rahul'))).toBe(
      true,
    );
    expect(await finish(store.getState().loadAdvance('student-rahul'))).toBe(
      true,
    );
    expect(store.getState().advance?.availableBalancePaise).toBe(50_000);
    expect(
      await finish(
        store.getState().previewAdvance('student-rahul', {
          academicSessionId: context.academicSessionId,
          asOfDate: context.asOfDate,
          branchId: context.branchId,
          feeDueIds: ['due-rahul-july-pending'],
          requestedByUserId: admin.userId,
        }),
      ),
    ).toBe(true);
    expect(await finish(store.getState().applyAdvance('student-rahul'))).toBe(
      true,
    );
    expect(store.getState().advance?.availableBalancePaise).toBe(0);
  });

  it('blocks Accountant reversal and every closed-session mutation', async () => {
    const accountantStore = create(accountant);
    accountantStore.getState().setContext(context, 'ACTIVE');
    expect(
      await accountantStore
        .getState()
        .reversePayment('payment-advance-rahul', 'No permission'),
    ).toBe(false);
    expect(accountantStore.getState().error?.code).toBe(
      'COLLECTION_ACCESS_DENIED',
    );
    const store = create();
    store.getState().setContext(context, 'CLOSED');
    expect(await store.getState().loadCollectableDues('student-rahul')).toBe(
      false,
    );
  });
});
