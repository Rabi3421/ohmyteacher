import { ApiClientError } from '../../src/services/api/apiError';
import {
  mapCreatePlatformSchoolRequest,
  mapPlatformFieldErrors,
  mapPlatformSchoolStatus,
  mapPlatformSchoolStatusRequest,
  mapUpdatePlatformSchoolRequest,
  parseCreatePlatformSchool,
  parsePlatformDashboard,
  parsePlatformSchool,
  parsePlatformSchoolList,
} from '../../src/services/platform/platformMapper';

const school = {
  address: 'Bhubaneswar',
  created_at: '2026-08-01T10:00:00Z',
  email: 'school@example.com',
  id: 11,
  is_active: true,
  name: 'Sunrise School',
  phone: '9876543210',
  upi_id: 'sunrise@bank',
};

const admin = {
  branch: null,
  date_joined: '2026-08-01T10:00:00Z',
  id: 21,
  is_active: true,
  name: 'Initial Admin',
  phone_number: '+919876543210',
  role: 'admin',
  school: 11,
};

describe('platform mappers', () => {
  it('maps every confirmed dashboard field', () => {
    expect(
      parsePlatformDashboard({
        active_schools: 4,
        success: true,
        this_month_collection: '12500.50',
        total_branches: 8,
        total_schools: 5,
        total_students: 120,
        total_teachers: 20,
      }),
    ).toEqual({
      activeSchools: 4,
      thisMonthCollection: '12500.50',
      totalBranches: 8,
      totalSchools: 5,
      totalStudents: 120,
      totalTeachers: 20,
    });
  });

  it.each([
    { active_schools: -1 },
    { this_month_collection: 'not-money' },
    { total_students: '120' },
  ])('rejects malformed dashboard data', override => {
    expect(() =>
      parsePlatformDashboard({
        active_schools: 4,
        success: true,
        this_month_collection: '12500.50',
        total_branches: 8,
        total_schools: 5,
        total_students: 120,
        total_teachers: 20,
        ...override,
      }),
    ).toThrow(ApiClientError);
  });

  it('maps the current unpaginated school list', () => {
    expect(
      parsePlatformSchoolList({ schools: [school], success: true }),
    ).toEqual({
      items: [
        expect.objectContaining({
          id: '11',
          status: 'ACTIVE',
          upiId: 'sunrise@bank',
        }),
      ],
      pagination: null,
      totalItems: 1,
    });
  });

  it('prepares for a future DRF paginated envelope without inventing pages', () => {
    const result = parsePlatformSchoolList({
      count: 30,
      next: 'https://example.invalid/schools/?page=2',
      previous: null,
      results: [school],
      success: true,
    });
    expect(result.items).toHaveLength(1);
    expect(result.totalItems).toBe(30);
    expect(result.pagination).toEqual({
      count: 30,
      next: 'https://example.invalid/schools/?page=2',
      previous: null,
    });
  });

  it('maps school detail without mock-only fields', () => {
    expect(parsePlatformSchool({ school, success: true })).toEqual({
      address: 'Bhubaneswar',
      createdAt: '2026-08-01T10:00:00Z',
      email: 'school@example.com',
      id: '11',
      name: 'Sunrise School',
      phone: '9876543210',
      status: 'ACTIVE',
      upiId: 'sunrise@bank',
    });
  });

  it('fails safely for an unknown school status value', () => {
    expect(() => mapPlatformSchoolStatus('active')).toThrow(ApiClientError);
  });

  it('maps the exact creation request and initial Admin response', () => {
    expect(
      mapCreatePlatformSchoolRequest({
        adminMobile: '98765 43210',
        adminName: ' Initial Admin ',
        schoolName: ' Sunrise School ',
      }),
    ).toEqual({
      admin_name: 'Initial Admin',
      admin_phone_number: '9876543210',
      school_name: 'Sunrise School',
    });
    expect(
      parseCreatePlatformSchool({ admin, school, success: true }),
    ).toMatchObject({
      admin: { role: 'SCHOOL_ADMIN', schoolId: '11' },
      school: { id: '11' },
    });
  });

  it('rejects a creation response whose Admin belongs to another school', () => {
    expect(() =>
      parseCreatePlatformSchool({
        admin: { ...admin, school: 99 },
        school,
        success: true,
      }),
    ).toThrow(ApiClientError);
  });

  it('maps writable changed fields and status only', () => {
    expect(
      mapUpdatePlatformSchoolRequest({
        email: ' school@example.com ',
        name: ' Sunrise ',
        upiId: 'sunrise@bank',
      }),
    ).toEqual({
      email: 'school@example.com',
      name: 'Sunrise',
      upi_id: 'sunrise@bank',
    });
    expect(mapPlatformSchoolStatusRequest('INACTIVE')).toEqual({
      is_active: false,
    });
    expect(mapPlatformSchoolStatusRequest('ACTIVE')).toEqual({
      is_active: true,
    });
  });

  it('maps backend validation field names to form fields', () => {
    expect(
      mapPlatformFieldErrors({
        admin_name: 'Required',
        admin_phone_number: 'Invalid',
        school_name: 'Required',
        upi_id: 'Invalid',
      }),
    ).toEqual({
      adminMobile: 'Invalid',
      adminName: 'Required',
      schoolName: 'Required',
      upiId: 'Invalid',
    });
  });
});
