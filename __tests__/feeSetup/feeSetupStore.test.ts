import type { UserMembership } from '../../src/models/auth';
import {
  mockFeeSetupService,
  resetMockFeeSetupData,
} from '../../src/services/feeSetup/mockFeeSetupService';
import {
  createFeeSetupStore,
  createFeeStructureDraft,
} from '../../src/store/feeSetup/feeSetupStore';

const admin: UserMembership = {
  id: 'admin',
  role: 'SCHOOL_ADMIN',
  schoolId: 'school-omt',
  status: 'ACTIVE',
  userId: 'admin',
};
const context = {
  academicSessionId: 'session-school-omt-current',
  branchId: 'branch-main',
  schoolId: 'school-omt',
};
const createStore = () =>
  createFeeSetupStore({
    getMembership: () => admin,
    getPermissions: () => [],
    service: mockFeeSetupService,
  });
async function finish<T>(promise: Promise<T>): Promise<T> {
  let settled = false;
  promise.finally(() => {
    settled = true;
  });
  for (let index = 0; index < 12 && !settled; index += 1) {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  }
  return promise;
}
beforeEach(() => {
  jest.useFakeTimers();
  resetMockFeeSetupData();
});
afterEach(() => jest.useRealTimers());

describe('Fee Setup store', () => {
  it('exposes operation loading state and loads summary', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().loadSummary();
    expect(store.getState().isLoadingSummary).toBe(true);
    await finish(request);
    expect(store.getState().summary?.activeFeeHeads).toBe(9);
  });
  it('clears branch/session scoped data on context change', () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.setState({
      feeStructures: {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 5,
        totalPages: 1,
      },
    });
    store.getState().setContext(
      { ...context, academicSessionId: 'session-school-omt-next' },
      'UPCOMING',
    );
    expect(store.getState().feeStructures.totalItems).toBe(0);
    expect(store.getState().summary).toBeNull();
  });
  it('clears school scoped data on workspace change', () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.setState({
      feeHeads: {
        items: [],
        page: 1,
        pageSize: 20,
        totalItems: 10,
        totalPages: 1,
      },
    });
    store.getState().setContext(
      {
        academicSessionId: 'session-school-greenfield-current',
        branchId: 'branch-school-greenfield-main',
        schoolId: 'school-greenfield',
      },
      'ACTIVE',
    );
    expect(store.getState().feeHeads.totalItems).toBe(0);
  });
  it('protects against stale in-flight context responses', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const request = store.getState().loadStructures();
    store.getState().setContext(
      { ...context, academicSessionId: 'session-school-omt-next' },
      'UPCOMING',
    );
    await finish(request);
    expect(store.getState().feeStructures.totalItems).toBe(0);
  });
  it('resets the controlled form draft after successful save', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    store.getState().updateStructureDraft({
      input: {
        classId: 'class-omt-c04',
        effectiveFrom: '2026-04-01',
        items: [
          {
            amount: 800,
            applicability: 'ALL_STUDENTS',
            applicableMonths: [4, 5, 6],
            displayOrder: 1,
            dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
            feeHeadId: 'fee-head-tuition',
            frequency: 'MONTHLY',
            mandatory: true,
            status: 'ACTIVE',
          },
        ],
        name: 'Store Fees',
        status: 'DRAFT',
      },
      step: 4,
    });
    const result = await finish(store.getState().saveStructure());
    expect(result?.name).toBe('Store Fees');
    expect(store.getState().structureDraft).toEqual(createFeeStructureDraft());
  });
  it('normalizes service errors for screens', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    await finish(
      store.getState().saveFeeHead({
        code: 'TUI',
        defaultFrequency: 'MONTHLY',
        displayOrder: 20,
        mandatoryByDefault: true,
        name: 'Duplicate',
        refundable: false,
        status: 'ACTIVE',
        type: 'RECURRING',
      }),
    );
    expect(store.getState().error).toMatchObject({
      code: 'DUPLICATE_FEE_HEAD_CODE',
      status: 409,
    });
  });
  it('prevents duplicate submissions while a save is in flight', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const input = {
      code: 'LAB',
      defaultFrequency: 'MONTHLY' as const,
      displayOrder: 20,
      mandatoryByDefault: false,
      name: 'Laboratory Fee',
      refundable: false,
      status: 'ACTIVE' as const,
      type: 'RECURRING' as const,
    };
    const first = store.getState().saveFeeHead(input);
    const duplicate = await store.getState().saveFeeHead(input);
    expect(duplicate).toBe(false);
    expect(await finish(first)).toBe(true);
  });
  it('loads a successful effective payable preview', async () => {
    const store = createStore();
    store.getState().setContext(context, 'ACTIVE');
    const ok = await finish(
      store.getState().previewPayable({
        amountOverrides: [],
        discountAssignments: [],
        enrollmentId: 'enrollment-student-rahul-current',
        feeStructureId: 'fee-structure-c01-active',
        optionalItemSelections: [],
        studentId: 'student-rahul',
      }),
    );
    expect(ok).toBe(true);
    expect(store.getState().payablePreview?.title).toBe(
      'Estimated Fee Configuration',
    );
  });
});
