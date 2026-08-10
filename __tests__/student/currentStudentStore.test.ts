import type { UserMembership } from '../../src/models/auth';
import type { CurrentStudent } from '../../src/models/currentStudent';
import { ApiClientError } from '../../src/services/api/apiError';
import type { CurrentStudentService } from '../../src/services/student/currentStudentService';
import { createCurrentStudentStore } from '../../src/store/student/currentStudentStore';

const item: CurrentStudent = {
  address: '', admissionDate: '2026-04-01', admissionNumber: 'ADM-2026-0001', branchId: '11', classId: '21',
  createdAt: '2026-04-01T00:00:00Z', dateOfBirth: null, gender: '', id: '31', name: 'Test Student', parentEmail: '',
  parentName: 'Test Parent', parentPhoneNumber: '9000000001', rollNumber: '', sectionId: '41', status: 'active',
};
const manager: UserMembership = { id: 'manager-membership', role: 'SCHOOL_ADMIN', schoolId: '1', status: 'ACTIVE', userId: '2' };
const parent: UserMembership = { id: 'parent-membership', role: 'PARENT', schoolId: '1', status: 'ACTIVE', userId: '3' };

describe('current student store', () => {
  let membership: UserMembership | null;
  let service: jest.Mocked<CurrentStudentService>;

  beforeEach(() => {
    membership = manager;
    service = {
      createAdmission: jest.fn().mockResolvedValue(item),
      getMyChildren: jest.fn().mockResolvedValue([item]),
      getStudent: jest.fn().mockResolvedValue(item),
      getStudents: jest.fn().mockResolvedValue([item]),
      updateStatus: jest.fn().mockResolvedValue({ ...item, status: 'inactive' }),
      updateStudent: jest.fn().mockResolvedValue({ ...item, name: 'Changed' }),
    };
  });

  const build = () => createCurrentStudentStore({ getMembership: () => membership, service });

  it('loads manager-visible students with backend query state', async () => {
    const store = build();
    store.getState().setQuery({ search: 'Test', status: 'active' });
    expect(await store.getState().loadStudents()).toBe(true);
    expect(service.getStudents).toHaveBeenCalledWith({ search: 'Test', status: 'active' });
    expect(store.getState().items).toEqual([item]);
  });

  it('denies management reads to parent membership', async () => {
    membership = parent;
    const store = build();
    expect(await store.getState().loadStudents()).toBe(false);
    expect(service.getStudents).not.toHaveBeenCalled();
    expect(store.getState().error?.code).toBe('STUDENT_ACCESS_DENIED');
  });

  it('safely denies a Branch Admin without Branch scope', async () => {
    membership = { ...manager, branchId: undefined, role: 'BRANCH_ADMIN' };
    const store = build();
    expect(await store.getState().loadStudents()).toBe(false);
    expect(service.getStudents).not.toHaveBeenCalled();
  });

  it('persists the aggregate admission result once', async () => {
    const store = build();
    const created = await store.getState().createAdmission({ classId: '21', name: 'Test Student', parentPhoneNumber: '9000000001', sectionId: '41' });
    expect(created).toEqual(item);
    expect(service.createAdmission).toHaveBeenCalledTimes(1);
    expect(store.getState().successMessage).toContain('parent login linked');
  });

  it('replaces cached data after an edit', async () => {
    const store = build();
    store.setState({ current: item, items: [item] });
    expect(await store.getState().updateStudent('31', { name: 'Changed' })).toBe(true);
    expect(store.getState().items[0]?.name).toBe('Changed');
  });

  it('uses My Children only for the mapped parent role', async () => {
    membership = parent;
    const store = build();
    expect(await store.getState().loadMyChildren()).toBe(true);
    expect(store.getState().myChildren).toEqual([item]);
  });

  it('normalizes backend validation errors for form display', async () => {
    service.createAdmission.mockRejectedValue(new ApiClientError({ code: 'PHONE_SCHOOL_MISMATCH', fieldErrors: { parent_phone_number: 'Phone belongs to another school.' }, message: 'Check admission.', status: 400 }));
    const store = build();
    expect(await store.getState().createAdmission({ classId: '21', name: 'Test Student', parentPhoneNumber: '9000000001', sectionId: '41' })).toBeNull();
    expect(store.getState().error?.fieldErrors).toEqual({ parentPhoneNumber: 'Phone belongs to another school.' });
  });
});
