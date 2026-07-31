import type { UserMembership } from '../../src/models/auth';
import {
  mockFeeDueService,
  resetMockFeeDueData,
} from '../../src/services/feeDue/mockFeeDueService';
import { resetMockFeeSetupData } from '../../src/services/feeSetup/mockFeeSetupService';
import {
  createFeeDueStore,
} from '../../src/store/feeDue/feeDueStore';

const admin: UserMembership = {
  id: 'membership-school-admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-school-admin',
};
const parent: UserMembership = {
  id: 'membership-parent',
  role: 'PARENT',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'user-multiple',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  asOfDate: '2026-07-31',
  branchId: 'branch-main',
  schoolId: 'school-omt',
};

const createStore = (actor: UserMembership = admin) =>
  createFeeDueStore({
    getMembership: () => actor,
    getPermissions: () => [],
    service: mockFeeDueService,
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
  for (let index = 0; index < 20 && !settled; index += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}

beforeEach(() => {
  jest.useFakeTimers();
  resetMockFeeSetupData();
  resetMockFeeDueData();
});
afterEach(() => jest.useRealTimers());

describe('Fee Due store', () => {
  it('loads outstanding with focused loading state', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().loadOutstanding();
    expect(store.getState().isLoadingOutstanding).toBe(true);
    await finish(request);
    expect(store.getState().outstanding?.totalOutstandingPaise).toBeGreaterThan(
      0,
    );
  });

  it('clears branch/session data on context change', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    await finish(store.getState().loadOutstanding());
    store.getState().setContext(
      {
        ...context,
        academicSessionId: 'session-school-omt-next',
      },
      'UPCOMING',
    );
    expect(store.getState().outstanding).toBeNull();
    expect(store.getState().currentFeeDue).toBeNull();
  });

  it('protects against stale outstanding responses', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().loadOutstanding();
    store.getState().setContext(
      {
        ...context,
        academicSessionId: 'session-school-omt-next',
      },
      'UPCOMING',
    );
    await finish(request);
    expect(store.getState().outstanding).toBeNull();
  });

  it('previews then commits controlled generation', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.getState().updateGenerationDraft({
      input: {
        ...store.getState().generationDraft.input,
        ...context,
        classIds: ['class-omt-c01'],
        feeScope: 'RECURRING',
        generationType: 'CLASS',
        requestedPeriodKeys: ['2026-09'],
      },
      step: 5,
    });
    expect(await finish(store.getState().previewGeneration())).toBe(true);
    expect(store.getState().generationPreview?.newDueCount).toBeGreaterThan(0);
    expect(await finish(store.getState().commitGeneration())).toBe(true);
    expect(store.getState().generationPreview).toBeNull();
    expect(store.getState().generationResult?.createdCount).toBeGreaterThan(0);
  });

  it('prevents duplicate preview submissions in flight', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.getState().updateGenerationDraft({
      input: {
        ...store.getState().generationDraft.input,
        ...context,
        classIds: ['class-omt-c01'],
        requestedPeriodKeys: ['2026-09'],
      },
    });
    const first = store.getState().previewGeneration();
    expect(await store.getState().previewGeneration()).toBe(false);
    expect(await finish(first)).toBe(true);
  });

  it('blocks generation for closed session state', async () => {
    const store = createStore();
    store.getState().setContext(
      {
        ...context,
        academicSessionId: 'session-school-omt-closed',
      },
      'CLOSED',
    );
    expect(await store.getState().previewGeneration()).toBe(false);
    expect(store.getState().error?.code).toBe('FEE_DUE_ACCESS_DENIED');
  });

  it('loads Due details and records a cancellation', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    expect(
      await finish(store.getState().loadFeeDue('due-rahul-july-pending')),
    ).toBe(true);
    expect(
      await finish(
        store
          .getState()
          .cancelDue('due-rahul-july-pending', 'Incorrect period'),
      ),
    ).toBe(true);
    expect(store.getState().currentFeeDue?.item.due.status).toBe(
      'CANCELLED',
    );
  });

  it('enforces active Parent membership before ownership read', async () => {
    const parentStore = createStore(parent);
    expect(
      await finish(
        parentStore
          .getState()
          .loadParentFees(
            'membership-parent',
            'student-rahul',
            'school-omt',
            '2026-07-31',
          ),
      ),
    ).toBe(true);
    expect(parentStore.getState().parentFeeSummary?.studentId).toBe(
      'student-rahul',
    );
    expect(
      await parentStore
        .getState()
        .loadParentFees(
          'another-membership',
          'student-rahul',
          'school-omt',
          '2026-07-31',
        ),
    ).toBe(false);
  });
});
