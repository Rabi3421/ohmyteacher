import { LiveCurrentFeeHeadService } from '../../src/services/feeConfiguration/liveCurrentFeeHeadService';
import { LiveCurrentFeeStructureItemService } from '../../src/services/feeConfiguration/liveCurrentFeeStructureItemService';
import { LiveCurrentFeeStructureService } from '../../src/services/feeConfiguration/liveCurrentFeeStructureService';

const head = { created_at: '2026-08-03T10:00:00Z', frequency: 'monthly', id: 7, is_active: true, name: 'Tuition Fee', school: 1 };
const item = { amount: '800.00', created_at: '2026-08-03T10:00:00Z', fee_head: 7, id: 9, is_mandatory: true, school_class: 21 };

describe('live Fee Head service', () => {
  const client = { get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  const service = new LiveCurrentFeeHeadService(client as never);
  beforeEach(() => jest.clearAllMocks());

  it('uses confirmed list/detail endpoints', async () => {
    client.get.mockResolvedValueOnce({ fee_heads: [head], success: true }).mockResolvedValueOnce({ fee_head: head, success: true });
    await service.list();
    await service.get('7');
    expect(client.get).toHaveBeenNthCalledWith(1, '/fee-heads/', { signal: undefined });
    expect(client.get).toHaveBeenNthCalledWith(2, '/fee-heads/7/', { signal: undefined });
  });

  it('posts and patches only writable Head fields', async () => {
    client.post.mockResolvedValue({ fee_head: head, success: true });
    client.patch.mockResolvedValue({ fee_head: head, success: true });
    await service.create({ frequency: 'MONTHLY', name: ' Tuition Fee ' });
    await service.update('7', { frequency: 'ONE_TIME', name: 'Annual Fee' });
    await service.setStatus('7', 'INACTIVE');
    expect(client.post).toHaveBeenCalledWith('/fee-heads/', { frequency: 'monthly', name: 'Tuition Fee' });
    expect(client.patch).toHaveBeenNthCalledWith(1, '/fee-heads/7/', { frequency: 'one_time', name: 'Annual Fee' });
    expect(client.patch).toHaveBeenNthCalledWith(2, '/fee-heads/7/status/', { is_active: false });
  });
});

describe('live Structure Item service', () => {
  const client = { get: jest.fn(), patch: jest.fn(), post: jest.fn() };
  const service = new LiveCurrentFeeStructureItemService(client as never);
  beforeEach(() => jest.clearAllMocks());

  it('uses the confirmed Class filter and exact body', async () => {
    client.get.mockResolvedValue({ fee_structure_items: [item], success: true });
    client.post.mockResolvedValue({ fee_structure_item: item, success: true });
    await service.list('21');
    await service.create({ amountPaise: 80_000, classId: '21', feeHeadId: '7', mandatory: true });
    expect(client.get).toHaveBeenCalledWith('/fee-structure-items/', { query: { school_class: 21 }, signal: undefined });
    expect(client.post).toHaveBeenCalledWith('/fee-structure-items/', { amount: '800.00', fee_head: 7, is_mandatory: true, school_class: 21 });
  });

  it('uses changed fields on the confirmed detail PATCH', async () => {
    client.patch.mockResolvedValue({ fee_structure_item: { ...item, amount: '900.25', is_mandatory: false }, success: true });
    await service.update('9', { amountPaise: 90_025, mandatory: false });
    expect(client.patch).toHaveBeenCalledWith('/fee-structure-items/9/', { amount: '900.25', is_mandatory: false });
  });
});

describe('live conceptual Fee Structure service', () => {
  it('groups confirmed Items by authoritative live Class ID', async () => {
    const schoolClass = { academicSessionId: '31', activeSectionCount: 0, assignedSubjectCount: 0, branchId: '11', code: 'C1', createdAt: '', displayOrder: 1, id: '21', name: 'Class 1', schoolId: '1', sectionCount: 0, status: 'ACTIVE' as const, updatedAt: '' };
    const academics = {
      getClass: jest.fn().mockResolvedValue({ data: schoolClass, success: true }),
      getClasses: jest.fn().mockResolvedValue({ data: { items: [schoolClass] }, success: true }),
    };
    const items = { get: jest.fn(), create: jest.fn(), update: jest.fn(), list: jest.fn().mockResolvedValue([{ amountPaise: 80_000, classId: '21', createdAt: '', feeHeadId: '7', id: '9', mandatory: true }]) };
    const service = new LiveCurrentFeeStructureService(academics as never, items);
    const structures = await service.list({ academicSessionId: '31', branchId: '11', schoolId: '1' });
    expect(structures[0]).toMatchObject({ classId: '21', id: '21', totalPaise: 80_000 });
    expect(items.list).toHaveBeenCalledWith('21');
  });
});
