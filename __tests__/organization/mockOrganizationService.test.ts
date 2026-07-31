import type {
  CreateBranchInput,
  CreateSchoolInput,
} from '../../src/models/organization';
import {
  mockOrganizationService,
  resetMockOrganizationData,
} from '../../src/services/organization/mockOrganizationService';
import { getAcademicYearForDate } from '../../src/utils/academicSession';

async function finishMockDelay<T>(promise: Promise<T>): Promise<T> {
  jest.runOnlyPendingTimers();
  return promise;
}

const SCHOOL_INPUT: CreateSchoolInput = {
  address: {
    city: 'Bhubaneswar',
    country: 'India',
    line1: '10 Test Road',
    pinCode: '751001',
    state: 'Odisha',
  },
  admin: {
    email: 'asha@example.edu',
    mobile: '9812345678',
    name: 'Asha Das',
  },
  code: 'NEW001',
  email: 'office@example.edu',
  mobile: '9823456789',
  name: 'New Public School',
};

const BRANCH_INPUT: CreateBranchInput = {
  address: SCHOOL_INPUT.address,
  code: 'CITY',
  email: 'city@example.edu',
  mobile: '9834567890',
  name: 'City Branch',
};

beforeEach(() => {
  jest.useFakeTimers();
  resetMockOrganizationData();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('mock organization service', () => {
  it('lists, searches, filters, and paginates schools', async () => {
    const all = await finishMockDelay(
      mockOrganizationService.getSchools({ page: 1, pageSize: 3 }),
    );
    expect(all.data.items).toHaveLength(3);
    expect(all.data.totalItems).toBeGreaterThanOrEqual(8);
    expect(all.data.totalPages).toBeGreaterThan(1);

    const searched = await finishMockDelay(
      mockOrganizationService.getSchools({ search: 'OMT001' }),
    );
    expect(searched.data.items.map(item => item.id)).toEqual(['school-omt']);

    const inactive = await finishMockDelay(
      mockOrganizationService.getSchools({ status: 'INACTIVE' }),
    );
    expect(inactive.data.items.length).toBeGreaterThan(0);
    expect(inactive.data.items.every(item => item.status === 'INACTIVE')).toBe(
      true,
    );
  });

  it('creates school, main branch, current session, admin, and defaults atomically', async () => {
    const response = await finishMockDelay(
      mockOrganizationService.createSchool(SCHOOL_INPUT),
    );
    const expectedYear = getAcademicYearForDate(new Date());
    expect(response.data.school).toMatchObject({
      activeBranchCount: 1,
      branchCount: 1,
      code: 'NEW001',
      status: 'ACTIVE',
    });
    expect(response.data.mainBranch).toMatchObject({
      code: 'MAIN',
      isMainBranch: true,
      name: 'Main Branch',
      status: 'ACTIVE',
    });
    expect(response.data.mainBranch.address).toEqual(SCHOOL_INPUT.address);
    expect(response.data.activeSession).toMatchObject({
      endDate: expectedYear.endDate,
      name: expectedYear.name,
      startDate: expectedYear.startDate,
      status: 'ACTIVE',
    });
    expect(response.data.schoolAdmin).toMatchObject({
      mobile: SCHOOL_INPUT.admin.mobile,
      name: SCHOOL_INPUT.admin.name,
      role: 'SCHOOL_ADMIN',
    });

    const settings = await finishMockDelay(
      mockOrganizationService.getSchoolSettings(response.data.school.id),
    );
    expect(settings.data).toMatchObject({
      academicYearStartMonth: 4,
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    });
  });

  it('returns duplicate school-code and admin-membership conflicts', async () => {
    const duplicateCode = mockOrganizationService.createSchool({
      ...SCHOOL_INPUT,
      code: 'omt001',
    });
    await expect(finishMockDelay(duplicateCode)).rejects.toMatchObject({
      code: 'DUPLICATE_SCHOOL_CODE',
      fieldErrors: { code: expect.any(String) },
    });

    const duplicateAdmin = mockOrganizationService.createSchool({
      ...SCHOOL_INPUT,
      admin: { ...SCHOOL_INPUT.admin, mobile: '9876543210' },
      code: 'UNIQUE1',
    });
    await expect(finishMockDelay(duplicateAdmin)).rejects.toMatchObject({
      code: 'DUPLICATE_ADMIN_MEMBERSHIP',
      fieldErrors: { adminMobile: expect.any(String) },
    });
  });

  it('creates a branch and prevents duplicate school-scoped codes', async () => {
    const created = await finishMockDelay(
      mockOrganizationService.createBranch('school-omt', BRANCH_INPUT),
    );
    expect(created.data).toMatchObject({
      code: 'CITY',
      schoolId: 'school-omt',
      status: 'ACTIVE',
    });

    const duplicate = mockOrganizationService.createBranch(
      'school-omt',
      BRANCH_INPUT,
    );
    await expect(finishMockDelay(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_BRANCH_CODE',
    });
  });

  it('protects the last active branch', async () => {
    const update = mockOrganizationService.updateBranchStatus(
      'school-omt',
      'branch-main',
      'INACTIVE',
    );
    await expect(finishMockDelay(update)).rejects.toMatchObject({
      code: 'LAST_ACTIVE_BRANCH',
    });
  });

  it('creates sessions and rejects duplicate names and overlapping dates', async () => {
    const current = getAcademicYearForDate(new Date());
    const input = {
      endDate: `${current.endYear + 2}-03-31`,
      name: `${current.endYear + 1}-${String(current.endYear + 2).slice(-2)}`,
      startDate: `${current.endYear + 1}-04-01`,
    };
    const created = await finishMockDelay(
      mockOrganizationService.createAcademicSession('school-omt', input),
    );
    expect(created.data).toMatchObject({ ...input, status: 'UPCOMING' });

    const duplicate = mockOrganizationService.createAcademicSession(
      'school-omt',
      { ...input, endDate: `${current.endYear + 3}-03-31` },
    );
    await expect(finishMockDelay(duplicate)).rejects.toMatchObject({
      code: 'DUPLICATE_SESSION_NAME',
    });

    const overlap = mockOrganizationService.createAcademicSession(
      'school-omt',
      {
        endDate: `${current.endYear + 2}-06-30`,
        name: 'Overlapping Session',
        startDate: `${current.endYear + 2}-03-01`,
      },
    );
    await expect(finishMockDelay(overlap)).rejects.toMatchObject({
      code: 'SESSION_DATE_OVERLAP',
    });
  });

  it('atomically closes the previous session when activating another', async () => {
    const activated = await finishMockDelay(
      mockOrganizationService.activateAcademicSession(
        'school-omt',
        'session-school-omt-next',
      ),
    );
    expect(
      activated.data.find(item => item.id === 'session-school-omt-next')
        ?.status,
    ).toBe('ACTIVE');
    expect(
      activated.data.find(item => item.id === 'session-school-omt-current')
        ?.status,
    ).toBe('CLOSED');
    expect(activated.data.filter(item => item.status === 'ACTIVE')).toHaveLength(
      1,
    );
  });

  it('closes sessions and updates school status without deleting data', async () => {
    const before = await finishMockDelay(
      mockOrganizationService.getBranches('school-omt'),
    );
    const closed = await finishMockDelay(
      mockOrganizationService.closeAcademicSession(
        'school-omt',
        'session-school-omt-current',
      ),
    );
    expect(closed.data.status).toBe('CLOSED');

    const inactive = await finishMockDelay(
      mockOrganizationService.updateSchoolStatus('school-omt', 'INACTIVE'),
    );
    expect(inactive.data.status).toBe('INACTIVE');
    const after = await finishMockDelay(
      mockOrganizationService.getBranches('school-omt'),
    );
    expect(after.data.items).toEqual(before.data.items);
  });
});
