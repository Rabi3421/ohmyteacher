import { ApiClientError } from '../../src/services/api/apiError';
import {
  mapBackendStaffRole,
  mapCreateStaffRequest,
  mapLiveStaffStatus,
  mapStaffFieldErrors,
  mapStaffStatusRequest,
  mapUpdateStaffRequest,
  parseStaffList,
  parseStaffResponse,
} from '../../src/services/userManagement/staffUserMapper';

const user = {
  branch: 21,
  date_joined: '2026-08-01T10:00:00Z',
  id: 31,
  is_active: true,
  name: 'Teacher One',
  phone_number: '+919111100003',
  role: 'teacher',
  school: 11,
};

const branches = [{ code: 'SCH11-B1', id: '21', name: 'Main Branch', status: 'ACTIVE' as const }];

describe('staff/user mappers', () => {
  it('maps the unpaginated list, resolves one branch and removes non-staff roles', () => {
    expect(parseStaffList({ success: true, users: [user, { ...user, id: 32, role: 'student' }] }, branches)).toEqual({
      items: [{
        branch: branches[0],
        id: '31',
        joinedAt: user.date_joined,
        mobile: user.phone_number,
        name: user.name,
        role: 'TEACHER',
        schoolId: '11',
        status: 'ACTIVE',
      }],
      pagination: null,
      totalItems: 1,
    });
  });

  it('deduplicates stable backend IDs', () => {
    expect(parseStaffList({ success: true, users: [user, user] }, branches).items).toHaveLength(1);
  });

  it('preserves an inaccessible branch only as its backend ID', () => {
    expect(parseStaffResponse({ success: true, user })).toMatchObject({ branch: { id: '21' } });
  });

  it.each([
    { id: '31' },
    { school: null },
    { branch: null },
    { is_active: 'true' },
    { date_joined: 'not-a-date' },
    { name: '' },
  ])('rejects malformed staff detail %#', override => {
    expect(() => parseStaffResponse({ success: true, user: { ...user, ...override } })).toThrow(ApiClientError);
  });

  it('rejects unknown roles and statuses instead of elevating them', () => {
    expect(() => mapBackendStaffRole('admin')).toThrow(ApiClientError);
    expect(() => mapLiveStaffStatus('ACTIVE')).toThrow(ApiClientError);
  });

  it('maps only exact supported create fields and fixed roles', () => {
    expect(mapCreateStaffRequest({ branchId: '21', mobile: '9111100003', name: ' Teacher One ', role: 'TEACHER' })).toEqual({
      branch: 21,
      name: 'Teacher One',
      phone_number: '9111100003',
      role: 'teacher',
    });
  });

  it('maps changed update fields without read-only identity, role, school or status', () => {
    expect(mapUpdateStaffRequest({ name: ' Updated ' })).toEqual({ name: 'Updated' });
    expect(mapUpdateStaffRequest({ branchId: '22' })).toEqual({ branch: 22 });
  });

  it('requires stable positive branch IDs', () => {
    expect(() => mapUpdateStaffRequest({ branchId: 'branch-mock' })).toThrow(ApiClientError);
  });

  it('maps status as a real boolean and validation fields to form names', () => {
    expect(mapStaffStatusRequest('INACTIVE')).toEqual({ is_active: false });
    expect(mapStaffFieldErrors({ branch: 'Invalid', phone_number: 'Duplicate' })).toEqual({
      branchId: 'Invalid',
      mobile: 'Duplicate',
    });
  });
});
