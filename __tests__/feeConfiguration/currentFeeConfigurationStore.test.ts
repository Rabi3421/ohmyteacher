import type { UserMembership } from '../../src/models/auth';
import type { CurrentClassFeeStructure, CurrentFeeHead, CurrentFeeStructureItem } from '../../src/models/currentFeeConfiguration';
import { ApiClientError } from '../../src/services/api/apiError';
import type { CurrentFeeHeadService } from '../../src/services/feeConfiguration/currentFeeHeadService';
import type { CurrentFeeStructureItemService } from '../../src/services/feeConfiguration/currentFeeStructureItemService';
import type { CurrentFeeStructureService } from '../../src/services/feeConfiguration/currentFeeStructureService';
import { createCurrentFeeConfigurationStore } from '../../src/store/feeConfiguration/currentFeeConfigurationStore';

const context = { academicSessionId: '31', branchId: '11', schoolId: '1' };
const head: CurrentFeeHead = { createdAt: '2026-04-01T00:00:00Z', frequency: 'MONTHLY', id: '7', name: 'Tuition Fee', schoolId: '1', status: 'ACTIVE' };
const item: CurrentFeeStructureItem = { amountPaise: 80_000, classId: '21', createdAt: '2026-04-01T00:00:00Z', feeHeadId: '7', id: '9', mandatory: true };
const structure: CurrentClassFeeStructure = { ...context, classId: '21', className: 'Class 1', classStatus: 'ACTIVE', id: '21', items: [item], totalPaise: 80_000 };
const schoolAdmin: UserMembership = { id: 'm1', role: 'SCHOOL_ADMIN', schoolId: '1', status: 'ACTIVE', userId: 'u1' };

describe('current fee configuration store', () => {
  let membership: UserMembership | null;
  let headService: jest.Mocked<CurrentFeeHeadService>;
  let itemService: jest.Mocked<CurrentFeeStructureItemService>;
  let structureService: jest.Mocked<CurrentFeeStructureService>;

  beforeEach(() => {
    membership = schoolAdmin;
    headService = {
      create: jest.fn().mockResolvedValue(head),
      get: jest.fn().mockResolvedValue(head),
      list: jest.fn().mockResolvedValue([head]),
      setStatus: jest.fn().mockResolvedValue({ ...head, status: 'INACTIVE' }),
      update: jest.fn().mockResolvedValue(head),
    };
    itemService = {
      create: jest.fn().mockResolvedValue(item),
      get: jest.fn().mockResolvedValue(item),
      list: jest.fn().mockResolvedValue([item]),
      update: jest.fn().mockResolvedValue({ ...item, amountPaise: 90_000 }),
    };
    structureService = {
      get: jest.fn().mockResolvedValue(structure),
      list: jest.fn().mockResolvedValue([structure]),
    };
  });

  const build = () => createCurrentFeeConfigurationStore({ feeHeadService: headService, feeStructureService: structureService, getMembership: () => membership, isBranchActive: () => true, isSchoolActive: () => true, structureItemService: itemService });

  it('loads authoritative Heads and exact Class blueprint totals', async () => {
    const store = build();
    store.getState().setContext(context, 'ACTIVE');
    await store.getState().loadSummary();
    expect(store.getState().summary).toEqual({ activeFeeHeads: 1, configuredClasses: 1, structureItems: 1, unconfiguredClasses: 0 });
    expect(store.getState().structures[0]?.totalPaise).toBe(80_000);
    expect(structureService.list).toHaveBeenCalledWith(context);
  });

  it('denies School-wide Head mutation to Branch Admin', async () => {
    membership = { ...schoolAdmin, branchId: '11', role: 'BRANCH_ADMIN' };
    const store = build();
    store.getState().setContext(context, 'ACTIVE');
    expect(await store.getState().createFeeHead({ frequency: 'MONTHLY', name: 'New' })).toBeNull();
    expect(headService.create).not.toHaveBeenCalled();
    expect(store.getState().error?.code).toBe('FEE_HEAD_READ_ONLY');
  });

  it('denies a Branch Admin outside the assigned Branch', async () => {
    membership = { ...schoolAdmin, branchId: '12', role: 'BRANCH_ADMIN' };
    const store = build();
    store.getState().setContext(context, 'ACTIVE');
    await store.getState().loadStructures();
    expect(structureService.list).not.toHaveBeenCalled();
    expect(store.getState().error?.code).toBe('FEE_BRANCH_SCOPE_MISMATCH');
  });

  it('blocks Item mutation in a closed Session before transport', async () => {
    const store = build();
    store.getState().setContext(context, 'CLOSED');
    expect(await store.getState().updateStructureItem('9', { amountPaise: 90_000 })).toBe(false);
    expect(itemService.update).not.toHaveBeenCalled();
    expect(store.getState().error?.code).toBe('CLOSED_FEE_CONTEXT');
  });

  it('refetches the complete Class Item list after create', async () => {
    structureService.get.mockResolvedValueOnce({ ...structure, items: [], totalPaise: 0 }).mockResolvedValueOnce(structure);
    const store = build();
    store.getState().setContext(context, 'ACTIVE');
    expect(await store.getState().createStructureItem({ amountPaise: 80_000, classId: '21', feeHeadId: '7', mandatory: true })).toEqual(item);
    expect(itemService.create).toHaveBeenCalledTimes(1);
    expect(structureService.get).toHaveBeenCalledTimes(2);
    expect(store.getState().currentStructure?.items).toEqual([item]);
  });

  it('normalizes live validation errors without fallback', async () => {
    headService.create.mockRejectedValue(new ApiClientError({ code: 'DUPLICATE_FEE_HEAD', fieldErrors: { name: 'Already exists.' }, kind: 'validation', message: 'Duplicate.', status: 400 }));
    const store = build();
    store.getState().setContext(context, 'ACTIVE');
    expect(await store.getState().createFeeHead({ frequency: 'MONTHLY', name: 'Tuition Fee' })).toBeNull();
    expect(store.getState().error?.fieldErrors).toEqual({ name: 'Already exists.' });
  });
});
